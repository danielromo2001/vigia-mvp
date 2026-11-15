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

function number(formData: FormData, key: string, fallback = 0) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function prismaMessage(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const target = String(error.meta?.target ?? "");
    if (target.includes("code")) {
      return "Ya existe un contrato con ese código.";
    }
    return "Ya existe un proveedor registrado con ese nombre.";
  }
  return "No fue posible guardar el proveedor. Intenta de nuevo.";
}

/**
 * Registra un proveedor y, opcionalmente, su contrato inicial. El desempeño
 * arranca en 80 puntos y se ajusta luego con las evaluaciones del comité.
 */
export async function createSupplier(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();

  const name = text(formData, "name");
  const specialty = text(formData, "specialty");
  const performance = Math.min(
    100,
    Math.max(0, Math.round(number(formData, "performance", 80))),
  );
  const contractCode = text(formData, "contractCode").toUpperCase();
  const contractValue = Math.max(0, number(formData, "contractValue"));
  const startDate = parseDateInput(formData.get("startDate"));
  const endDate = parseDateInput(formData.get("endDate"));

  if (!name) return { error: "El nombre del proveedor es obligatorio." };
  if (!specialty) return { error: "La especialidad es obligatoria." };

  if (contractCode) {
    if (!startDate || !endDate) {
      return {
        error: "Si registras un contrato, indica la fecha de inicio y de fin.",
      };
    }
    if (endDate < startDate) {
      return { error: "La fecha de fin no puede ser anterior al inicio." };
    }
  }

  try {
    await prisma.supplier.create({
      data: {
        name,
        specialty,
        contactName: text(formData, "contactName") || null,
        phone: text(formData, "phone") || null,
        email: text(formData, "email") || null,
        performance,
        status: text(formData, "status") || "aprobado",
        notes: text(formData, "notes") || null,
        contracts: contractCode
          ? {
              create: {
                code: contractCode,
                description:
                  text(formData, "contractDescription") ||
                  "Contrato de prestación de servicios biomédicos.",
                startDate: startDate!,
                endDate: endDate!,
                value: contractValue,
                slaHours: Math.max(0, Math.round(number(formData, "slaHours"))),
                nextReview: parseDateInput(formData.get("nextReview")),
              },
            }
          : undefined,
      },
    });
  } catch (error) {
    return { error: prismaMessage(error) };
  }

  revalidatePath("/proveedores");
  revalidatePath("/panel");
  redirect("/proveedores");
}
