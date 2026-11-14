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

async function nextEquipmentCode() {
  const count = await prisma.equipment.count();
  let sequence = count + 1;
  let code = `EQ-${String(sequence).padStart(3, "0")}`;
  while (await prisma.equipment.findUnique({ where: { code } })) {
    sequence += 1;
    code = `EQ-${String(sequence).padStart(3, "0")}`;
  }
  return code;
}

function validate(formData: FormData) {
  const name = text(formData, "name");
  const serial = text(formData, "serial");
  const location = text(formData, "location");

  if (!name) return { error: "El nombre del equipo es obligatorio." as const };
  if (!serial) {
    return { error: "El número de serie es obligatorio." as const };
  }
  if (!location) {
    return { error: "La ubicación es obligatoria." as const };
  }

  return {
    data: {
      name,
      serial,
      location,
      brand: text(formData, "brand") || null,
      model: text(formData, "model") || null,
      status: text(formData, "status") || "operativo",
      criticality: text(formData, "criticality") || "media",
      notes: text(formData, "notes") || null,
      acquisitionDate: parseDateInput(formData.get("acquisitionDate")),
    },
  };
}

function prismaMessage(error: unknown): string {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const target = String(error.meta?.target ?? "");
    if (target.includes("serial")) {
      return "Ya existe un equipo registrado con ese número de serie.";
    }
    if (target.includes("code")) {
      return "Ya existe un equipo con ese código interno.";
    }
    return "Ya existe un registro con esos datos únicos.";
  }
  return "No fue posible guardar el equipo. Intenta de nuevo.";
}

export async function createEquipment(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();
  const validation = validate(formData);
  if ("error" in validation) return validation;

  let newId: number;
  try {
    const code = text(formData, "code") || (await nextEquipmentCode());
    const equipment = await prisma.equipment.create({
      data: {
        code,
        ...validation.data,
        history: {
          create: {
            date: validation.data.acquisitionDate ?? new Date(),
            eventType: "registro",
            description:
              "Registro inicial del equipo y apertura de la hoja de vida.",
          },
        },
      },
    });
    newId = equipment.id;
  } catch (error) {
    return { error: prismaMessage(error) };
  }

  revalidatePath("/equipos");
  revalidatePath("/panel");
  redirect(`/equipos/${newId}`);
}

export async function updateEquipment(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return { error: "Equipo no válido." };
  }

  const validation = validate(formData);
  if ("error" in validation) return validation;

  const existing = await prisma.equipment.findUnique({ where: { id } });
  if (!existing) return { error: "El equipo ya no existe." };

  try {
    await prisma.equipment.update({
      where: { id },
      data: {
        ...validation.data,
        code: text(formData, "code") || existing.code,
      },
    });
  } catch (error) {
    return { error: prismaMessage(error) };
  }

  revalidatePath("/equipos");
  revalidatePath(`/equipos/${id}`);
  revalidatePath("/panel");
  redirect(`/equipos/${id}`);
}
