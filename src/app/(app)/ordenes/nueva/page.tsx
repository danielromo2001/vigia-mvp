import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Plus, Stethoscope } from "lucide-react";
import { WorkOrderForm } from "@/components/forms/work-order-form";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { roleLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Nueva orden" };

type SearchParams = Promise<{ equipo?: string; tipo?: string }>;

export default async function NewWorkOrderPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireStaff();
  const params = await searchParams;

  const [equipmentOptions, userOptions] = await Promise.all([
    prisma.equipment.findMany({
      select: { id: true, code: true, name: true, location: true, status: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { active: true },
      include: { role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const defaultEquipmentId = Number(params.equipo ?? 0);

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/ordenes"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-teal-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a las órdenes
      </Link>
      <PageHeader
        eyebrow="Nueva intervención"
        title="Crear orden de trabajo"
        description="Registra una solicitud preventiva o correctiva. Al cerrarla, la intervención quedará en la hoja de vida del equipo."
      />

      {equipmentOptions.length === 0 ? (
        <EmptyState
          icon={<Stethoscope className="h-6 w-6" />}
          title="Primero registra un equipo"
          description="Necesitas al menos un equipo biomédico en el inventario para crear una orden de trabajo."
          action={
            <Link
              href="/equipos/nuevo"
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-navy-900 px-4 text-xs font-semibold text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Registrar equipo
            </Link>
          }
        />
      ) : (
        <WorkOrderForm
          equipmentOptions={equipmentOptions}
          userOptions={userOptions.map((option) => ({
            id: option.id,
            name: option.name,
            role: roleLabel(option.role.name),
          }))}
          defaultEquipmentId={
            Number.isInteger(defaultEquipmentId) && defaultEquipmentId > 0
              ? defaultEquipmentId
              : undefined
          }
          defaultType={params.tipo}
          defaultResponsibleId={user.id}
        />
      )}
    </div>
  );
}
