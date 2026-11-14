"use server";

import { Prisma } from "@prisma/client";
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

export async function savePreventivePlan(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();

  const id = Number(formData.get("id") || 0);
  const equipmentId = Number(formData.get("equipmentId"));
  const frequencyDays = Number(formData.get("frequencyDays"));
  const lastDate = parseDateInput(formData.get("lastDate"));
  let nextDate = parseDateInput(formData.get("nextDate"));
  const notes = text(formData, "notes") || null;

  if (!Number.isInteger(equipmentId) || equipmentId <= 0) {
    return { error: "Selecciona un equipo válido." };
  }
  if (!Number.isInteger(frequencyDays) || frequencyDays < 1) {
    return { error: "La frecuencia debe ser de al menos 1 día." };
  }
  if (frequencyDays > 3650) {
    return { error: "La frecuencia no puede superar los 3650 días." };
  }

  if (!nextDate && lastDate) {
    nextDate = new Date(lastDate);
    nextDate.setUTCDate(nextDate.getUTCDate() + frequencyDays);
  }
  if (!nextDate && !lastDate) {
    nextDate = new Date();
    nextDate.setUTCDate(nextDate.getUTCDate() + frequencyDays);
  }
  if (!nextDate) {
    return { error: "Indica la fecha de la última o de la próxima ejecución." };
  }

  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    select: { id: true },
  });
  if (!equipment) return { error: "El equipo seleccionado no existe." };

  const duplicate = await prisma.preventivePlan.findFirst({
    where: { equipmentId, NOT: id ? { id } : undefined },
  });
  if (duplicate) {
    return { error: "Ese equipo ya tiene un plan preventivo activo." };
  }

  try {
    if (id) {
      await prisma.preventivePlan.update({
        where: { id },
        data: { frequencyDays, lastDate, nextDate, notes, active: true },
      });
    } else {
      await prisma.preventivePlan.create({
        data: { equipmentId, frequencyDays, lastDate, nextDate, notes },
      });
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "Ese equipo ya tiene un plan preventivo registrado." };
    }
    return { error: "No fue posible guardar el plan. Intenta de nuevo." };
  }

  revalidatePath("/preventivos");
  revalidatePath("/panel");
  revalidatePath(`/equipos/${equipmentId}`);
  redirect("/preventivos");
}

export async function togglePreventivePlan(formData: FormData) {
  await requireStaff();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) redirect("/preventivos");

  const plan = await prisma.preventivePlan.findUnique({
    where: { id },
    select: { active: true, equipmentId: true },
  });
  if (!plan) redirect("/preventivos");

  await prisma.preventivePlan.update({
    where: { id },
    data: { active: !plan.active },
  });

  revalidatePath("/preventivos");
  revalidatePath("/panel");
  revalidatePath(`/equipos/${plan.equipmentId}`);
  redirect("/preventivos");
}
