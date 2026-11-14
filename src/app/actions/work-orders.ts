"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import type { FormState } from "@/lib/form-types";
import { parseDateInput } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function nextOrderCode() {
  const year = new Date().getUTCFullYear();
  const prefix = `OT-${year}-`;
  const last = await prisma.workOrder.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  const sequence = last ? Number(last.code.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(Number.isFinite(sequence) ? sequence : 1).padStart(4, "0")}`;
}

export async function createWorkOrder(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireStaff();

  const equipmentId = Number(formData.get("equipmentId"));
  const type = text(formData, "type");
  const priority = text(formData, "priority") || "media";
  const description = text(formData, "description");
  const observations = text(formData, "observations") || null;
  const dueDate = parseDateInput(formData.get("dueDate"));
  const responsibleValue = Number(formData.get("responsibleId") || 0);

  if (!Number.isInteger(equipmentId) || equipmentId <= 0) {
    return { error: "Selecciona el equipo al que se asocia la orden." };
  }
  if (!["preventivo", "correctivo"].includes(type)) {
    return { error: "Selecciona el tipo de mantenimiento." };
  }
  if (!["alta", "media", "baja"].includes(priority)) {
    return { error: "Selecciona una prioridad válida." };
  }
  if (!description) {
    return { error: "Describe la intervención o la falla detectada." };
  }

  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    select: { id: true },
  });
  if (!equipment) return { error: "El equipo seleccionado no existe." };

  let responsibleId: number | null = null;
  if (Number.isInteger(responsibleValue) && responsibleValue > 0) {
    const responsible = await prisma.user.findUnique({
      where: { id: responsibleValue },
      select: { id: true, active: true },
    });
    if (!responsible || !responsible.active) {
      return { error: "El responsable seleccionado no está disponible." };
    }
    responsibleId = responsible.id;
  } else {
    responsibleId = user.id;
  }

  let orderId: number;
  try {
    const code = await nextOrderCode();
    const order = await prisma.workOrder.create({
      data: {
        code,
        equipmentId,
        type,
        priority,
        description,
        observations,
        dueDate,
        responsibleId,
      },
    });
    orderId = order.id;
  } catch {
    return { error: "No fue posible crear la orden. Intenta de nuevo." };
  }

  revalidatePath("/ordenes");
  revalidatePath("/panel");
  revalidatePath(`/equipos/${equipmentId}`);
  redirect(`/ordenes/${orderId}`);
}

export async function startWorkOrder(formData: FormData) {
  const user = await requireStaff();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) redirect("/ordenes");

  const order = await prisma.workOrder.findUnique({
    where: { id },
    include: { equipment: true },
  });
  if (!order) redirect("/ordenes");

  await prisma.$transaction([
    prisma.workOrder.update({
      where: { id },
      data: {
        status: "en_proceso",
        responsibleId: order.responsibleId ?? user.id,
      },
    }),
    prisma.equipment.update({
      where: { id: order.equipmentId },
      data: { status: "en_mantenimiento" },
    }),
  ]);

  revalidatePath("/ordenes");
  revalidatePath(`/ordenes/${id}`);
  revalidatePath(`/equipos/${order.equipmentId}`);
  revalidatePath("/panel");
  redirect(`/ordenes/${id}`);
}

export async function closeWorkOrder(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();
  const id = Number(formData.get("id"));
  const observations = text(formData, "observations");

  if (!Number.isInteger(id) || id <= 0) {
    return { error: "Orden no válida." };
  }
  if (observations.length < 5) {
    return {
      error: "Registra las observaciones de la intervención (mínimo 5 caracteres).",
    };
  }

  const order = await prisma.workOrder.findUnique({
    where: { id },
    include: { equipment: { include: { plan: true } } },
  });
  if (!order) return { error: "La orden ya no existe." };
  if (!["abierta", "en_proceso"].includes(order.status)) {
    return { error: "Solo se pueden cerrar órdenes abiertas o en proceso." };
  }

  const closedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.workOrder.update({
      where: { id },
      data: {
        status: "cerrada",
        observations,
        closedAt,
      },
    });

    await tx.maintenanceLog.create({
      data: {
        equipmentId: order.equipmentId,
        date: closedAt,
        eventType: order.type,
        description: `${order.description} — ${observations}`,
        workOrderId: order.id,
      },
    });

    await tx.equipment.update({
      where: { id: order.equipmentId },
      data: { status: "operativo" },
    });

    if (order.type === "preventivo" && order.equipment.plan) {
      const nextDate = new Date(closedAt);
      nextDate.setUTCDate(
        nextDate.getUTCDate() + order.equipment.plan.frequencyDays,
      );
      await tx.preventivePlan.update({
        where: { id: order.equipment.plan.id },
        data: { lastDate: closedAt, nextDate },
      });
    }
  });

  revalidatePath("/ordenes");
  revalidatePath(`/ordenes/${id}`);
  revalidatePath("/preventivos");
  revalidatePath(`/equipos/${order.equipmentId}`);
  revalidatePath("/panel");
  revalidatePath("/reportes");
  redirect(`/ordenes/${id}`);
}

export async function cancelWorkOrder(formData: FormData) {
  await requireStaff();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) redirect("/ordenes");

  const order = await prisma.workOrder.findUnique({ where: { id } });
  if (!order) redirect("/ordenes");
  if (!["abierta", "en_proceso"].includes(order.status)) {
    redirect(`/ordenes/${id}`);
  }

  await prisma.workOrder.update({
    where: { id },
    data: {
      status: "cancelada",
      observations: text(formData, "reason") || "Orden cancelada.",
      closedAt: new Date(),
    },
  });

  revalidatePath("/ordenes");
  revalidatePath(`/ordenes/${id}`);
  revalidatePath("/panel");
  redirect(`/ordenes/${id}`);
}

export async function reassignWorkOrder(formData: FormData) {
  await requireStaff();
  const id = Number(formData.get("id"));
  const responsibleId = Number(formData.get("responsibleId"));
  if (!Number.isInteger(id) || id <= 0) redirect("/ordenes");

  await prisma.workOrder.update({
    where: { id },
    data: {
      responsibleId:
        Number.isInteger(responsibleId) && responsibleId > 0
          ? responsibleId
          : null,
    },
  });

  revalidatePath("/ordenes");
  revalidatePath(`/ordenes/${id}`);
  revalidatePath("/panel");
  redirect(`/ordenes/${id}`);
}
