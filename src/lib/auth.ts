import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "vigia_session";
const MAX_AGE_SECONDS = 60 * 60 * 12;
const SECRET =
  process.env.SESSION_SECRET ?? "vigia-mvp-clave-local-cambiar-en-produccion";

function sign(payload: string) {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export async function createSession(userId: number) {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: expiresAt }),
  ).toString("base64url");
  const token = `${payload}.${sign(payload)}`;
  const store = await cookies();

  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSessionUser() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const givenBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    givenBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(givenBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { uid?: number; exp?: number };
    if (!data.uid || !data.exp || data.exp < Date.now()) return null;

    const user = await prisma.user.findUnique({
      where: { id: data.uid },
      include: { role: true },
    });

    if (!user || !user.active) return null;
    return user;
  } catch {
    return null;
  }
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRoles(...roles: string[]) {
  const user = await requireUser();
  if (!roles.includes(user.role.name)) redirect("/panel");
  return user;
}

/** Técnicos y administradores pueden crear y modificar registros. */
export async function requireStaff() {
  return requireRoles("tecnico", "administrador");
}

export function isStaff(user: Pick<SessionUser, "role">) {
  return user.role.name === "tecnico" || user.role.name === "administrador";
}

export function isAdmin(user: Pick<SessionUser, "role">) {
  return user.role.name === "administrador";
}

/** Personal clínico, técnicos y administradores pueden reportar una falla. */
export function canReport(user: Pick<SessionUser, "role">) {
  return ["tecnico", "administrador", "clinico"].includes(user.role.name);
}

export async function requireReporter() {
  return requireRoles("tecnico", "administrador", "clinico");
}
