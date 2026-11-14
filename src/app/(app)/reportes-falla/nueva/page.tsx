import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Plus, Stethoscope } from "lucide-react";
import { FailureReportForm } from "@/components/forms/failure-report-form";
import { EmptyState, PageHeader } from "@/components/ui";
import { requireReporter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Reportar falla" };

type SearchParams = Promise<{ equipo?: string }>;

export default async function NewFailureReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireReporter();
  const params = await searchParams;

  const equipmentOptions = await prisma.equipment.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      location: true,
      status: true,
      criticality: true,
    },
    orderBy: { name: "asc" },
  });

  const defaultEquipmentId = Number(params.equipo ?? 0);

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/reportes-falla"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-teal-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a los reportes
      </Link>
      <PageHeader
        eyebrow="Nuevo reporte"
        title="Reportar una falla"
        description="Describe el problema en lenguaje natural. La IA propondrá una categoría, una prioridad y una fecha de atención; ingeniería biomédica validará la sugerencia."
      />

      {equipmentOptions.length === 0 ? (
        <EmptyState
          icon={<Stethoscope className="h-6 w-6" />}
          title="Primero registra un equipo"
          description="Necesitas al menos un equipo biomédico en el inventario para reportar una falla."
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
        <FailureReportForm
          equipmentOptions={equipmentOptions}
          defaultEquipmentId={
            Number.isInteger(defaultEquipmentId) && defaultEquipmentId > 0
              ? defaultEquipmentId
              : undefined
          }
        />
      )}
    </div>
  );
}
