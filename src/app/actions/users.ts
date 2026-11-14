"use server";

import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/auth";
import type { FormState } from "@/lib/form-types";
import { prisma } from "@/lib/prisma";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function message(error: unknown): string {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return "Ya existe una cuenta registrada con ese correo.";
  }
  return "No fue posible guardar el usuario. Intenta de nuevo.";
}

export async function createUser(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRoles("administrador");

  const name = text(formData, "name");
  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const roleId = Number(formData.get("roleId"));

  if (!name) return { error: "El nombre completo es obligatorio." };
  if (!email || !email.includes("@")) {
    return { error: "Ingresa un correo electrónico válido." };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (!Number.isInteger(roleId) || roleId <= 0) {
    return { error: "Selecciona un rol para el usuario." };
  }

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) return { error: "El rol seleccionado no existe." };

  try {
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hash(password, 10),
        roleId,
      },
    });
  } catch (error) {
    return { error: message(error) };
  }

  revalidatePath("/usuarios");
  redirect("/usuarios");
}

export async function updateUser(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const current = await requireRoles("administrador");

  const id = Number(formData.get("id"));
  const name = text(formData, "name");
  const email = text(formData, "email").toLowerCase();
  const roleId = Number(formData.get("roleId"));
  const password = String(formData.get("password") ?? "");
  const active = formData.get("active") === "on";

  if (!Number.isInteger(id) || id <= 0) {
    return { error: "Usuario no válido." };
  }
  if (!name) return { error: "El nombre completo es obligatorio." };
  if (!email || !email.includes("@")) {
    return { error: "Ingresa un correo electrónico válido." };
  }
  if (!Number.isInteger(roleId) || roleId <= 0) {
    return { error: "Selecciona un rol para el usuario." };
  }
  if (password && password.length < 8) {
    return { error: "La nueva contraseña debe tener al menos 8 caracteres." };
  }

  const target = await prisma.user.findUnique({
    where: { id },
    include: { role: true },
  });
  if (!target) return { error: "El usuario ya no existe." };

  if (id === current.id) {
    if (!active) {
      return { error: "No puedes desactivar tu propia cuenta." };
    }
    if (roleId !== target.roleId) {
      return { error: "No puedes cambiar el rol de tu propia cuenta." };
    }
  }

  try {
    await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        roleId,
        active,
        ...(password ? { passwordHash: await hash(password, 10) } : {}),
      },
    });
  } catch (error) {
    return { error: message(error) };
  }

  revalidatePath("/usuarios");
  revalidatePath("/panel");
  redirect("/usuarios");
}

export async function toggleUser(formData: FormData) {
  const current = await requireRoles("administrador");
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) redirect("/usuarios");
  if (id === current.id) redirect("/usuarios?error=propia");

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) redirect("/usuarios");

  await prisma.user.update({
    where: { id },
    data: { active: !target.active },
  });

  revalidatePath("/usuarios");
  redirect("/usuarios");
}
