import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarClock, Plus } from "lucide-react";
import { PreventiveForm } from "@/components/forms/preventive-form";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Programar preventivo" };

type SearchParams = Promise<{ equipo?: string }>;

export default async function NewPreventivePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireStaff();
  const params = await searchParams;
  const requestedEquipmentId = Number(params.equipo ?? 0);

  const equipment = await prisma.equipment.findMany({
    include: { plan: true },
    orderBy: { name: "asc" },
  });

  if (Number.isInteger(requestedEquipmentId) && requestedEquipmentId > 0) {
    const selected = equipment.find((item) => item.id === requestedEquipmentId);
    if (selected?.plan) redirect(`/preventivos/${selected.plan.id}/editar`);
  }

  const available = equipment.filter((item) => !item.plan);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/preventivos"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-teal-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a preventivos
      </Link>
      <PageHeader
        eyebrow="Mantenimiento programado"
        title="Programar preventivo"
        description="Define la periodicidad del equipo y la próxima fecha de intervención. VIGÍA generará las alertas correspondientes."
      />

      {available.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="h-6 w-6" />}
          title="Todos los equipos tienen plan"
          description="Ya existe un plan preventivo para cada equipo registrado. Puedes editarlo o crear un nuevo equipo biomédico."
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
        <PreventiveForm
          equipmentOptions={available.map((item) => ({
            id: item.id,
            code: item.code,
            name: item.name,
            location: item.location,
          }))}
          defaultEquipmentId={
            Number.isInteger(requestedEquipmentId) && requestedEquipmentId > 0
              ? requestedEquipmentId
              : undefined
          }
        />
      )}
    </div>
  );
}
