"use server";

import { compare } from "bcryptjs";
import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type LoginState = { error?: string };

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresa tu correo y contraseña." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });

  if (!user || !user.active) {
    return { error: "No encontramos una cuenta activa con ese correo." };
  }

  const valid = await compare(password, user.passwordHash);
  if (!valid) {
    return { error: "La contraseña no es correcta. Intenta de nuevo." };
  }

  await createSession(user.id);
  redirect("/panel");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
