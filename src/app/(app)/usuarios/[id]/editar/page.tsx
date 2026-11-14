import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { UserForm } from "@/components/forms/user-form";
import { PageHeader } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export const metadata: Metadata = { title: "Editar usuario" };

export default async function EditUserPage({ params }: { params: Params }) {
  await requireRoles("administrador");
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) notFound();

  const [user, roles] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.role.findMany({ orderBy: { id: "asc" } }),
  ]);
  if (!user) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/usuarios"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-teal-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a usuarios
      </Link>
      <PageHeader
        eyebrow={`Cuenta #${String(user.id).padStart(3, "0")}`}
        title={user.name}
        description="Actualiza los datos de la cuenta, su rol o restablece la contraseña."
      />
      <UserForm
        roleOptions={roles.map((role) => ({
          id: role.id,
          name: role.name,
          label: role.label,
        }))}
        initial={{
          id: user.id,
          name: user.name,
          email: user.email,
          roleId: user.roleId,
          active: user.active,
        }}
      />
    </div>
  );
}
