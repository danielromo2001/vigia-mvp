import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { UserForm } from "@/components/forms/user-form";
import { PageHeader } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Nuevo usuario" };

export default async function NewUserPage() {
  await requireRoles("administrador");
  const roles = await prisma.role.findMany({ orderBy: { id: "asc" } });

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
        eyebrow="Administración del sistema"
        title="Crear usuario"
        description="Registra una cuenta y asigna el rol que determinará sus permisos dentro de VIGÍA."
      />
      <UserForm
        roleOptions={roles.map((role) => ({
          id: role.id,
          name: role.name,
          label: role.label,
        }))}
      />
    </div>
  );
}
