"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import type { FormState } from "@/lib/form-types";
import { prisma } from "@/lib/prisma";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function number(formData: FormData, key: string, fallback = 0) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function prismaMessage(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return "Ya existe un repuesto con ese código de referencia.";
  }
  return "No fue posible guardar el repuesto. Intenta de nuevo.";
}

export async function createSparePart(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();

  const code = text(formData, "code").toUpperCase();
  const name = text(formData, "name");
  const location = text(formData, "location");
  const stock = Math.max(0, Math.trunc(number(formData, "stock")));
  const minStock = Math.max(0, Math.trunc(number(formData, "minStock")));
  const unitCost = Math.max(0, number(formData, "unitCost"));

  if (!code) return { error: "El código de referencia es obligatorio." };
  if (!name) return { error: "El nombre del repuesto es obligatorio." };
  if (!location) return { error: "La ubicación en almacén es obligatoria." };
  if (minStock < 1) return { error: "El stock mínimo debe ser mayor que cero." };

  try {
    await prisma.sparePart.create({
      data: {
        code,
        name,
        category: text(formData, "category") || "otro",
        location,
        stock,
        minStock,
        unit: text(formData, "unit") || "unidad",
        unitCost,
        supplierId: Number(formData.get("supplierId")) || null,
        notes: text(formData, "notes") || null,
      },
    });
  } catch (error) {
    return { error: prismaMessage(error) };
  }

  revalidatePath("/repuestos");
  revalidatePath("/panel");
  redirect("/repuestos");
}

export async function registerPartMovement(formData: FormData) {
  await requireStaff();

  const partId = Number(formData.get("partId"));
  const type = text(formData, "type") || "salida";
  const rawQuantity = Math.abs(Math.trunc(number(formData, "quantity")));
  const reason = text(formData, "reason") || null;
  const workOrderId = Number(formData.get("workOrderId")) || null;

  if (!Number.isInteger(partId) || partId <= 0 || rawQuantity < 1) return;

  const part = await prisma.sparePart.findUnique({ where: { id: partId } });
  if (!part) return;

  let nextStock = part.stock;
  let storedQuantity = rawQuantity;

  if (type === "entrada") {
    nextStock = part.stock + rawQuantity;
  } else if (type === "salida") {
    nextStock = Math.max(0, part.stock - rawQuantity);
    storedQuantity = -rawQuantity;
  } else if (type === "ajuste") {
    nextStock = rawQuantity;
    storedQuantity = rawQuantity;
  }

  await prisma.$transaction([
    prisma.partMovement.create({
      data: {
        partId,
        type,
        quantity: storedQuantity,
        reason,
        workOrderId,
      },
    }),
    ...(type === "solicitud"
      ? []
      : [prisma.sparePart.update({ where: { id: partId }, data: { stock: nextStock } })]),
  ]);

  revalidatePath("/repuestos");
  revalidatePath("/panel");
}

/**
 * Genera una solicitud de compra por cada referencia por debajo del mínimo.
 * Deja un movimiento tipo "solicitud" con la cantidad faltante para conservar
 * la trazabilidad de la decisión, sin modificar el stock físico.
 */
export async function requestRestock() {
  await requireStaff();

  const parts = await prisma.sparePart.findMany({
    where: { active: true },
    orderBy: { stock: "asc" },
  });
  const low = parts.filter((part) => part.stock < part.minStock);
  if (low.length === 0) return;

  await prisma.partMovement.createMany({
    data: low.map((part) => ({
      partId: part.id,
      type: "solicitud",
      quantity: Math.max(1, part.minStock - part.stock),
      reason: "Solicitud de reposición generada desde el inventario.",
    })),
  });

  revalidatePath("/repuestos");
  revalidatePath("/panel");
}
