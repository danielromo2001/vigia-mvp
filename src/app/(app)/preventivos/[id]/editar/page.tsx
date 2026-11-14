import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PreventiveForm } from "@/components/forms/preventive-form";
import { PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { toDateInput } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export const metadata: Metadata = { title: "Editar plan preventivo" };

export default async function EditPreventivePage({
  params,
}: {
  params: Params;
}) {
  await requireStaff();
  const { id } = await params;
  const planId = Number(id);
  if (!Number.isInteger(planId)) notFound();

  const plan = await prisma.preventivePlan.findUnique({
    where: { id: planId },
    include: { equipment: true },
  });
  if (!plan) notFound();

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
        eyebrow={`${plan.equipment.code} · Plan preventivo`}
        title={plan.equipment.name}
        description={`Ajusta la frecuencia y las fechas del plan. Equipo ubicado en ${plan.equipment.location}.`}
      />
      {!plan.active ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
          Este plan está inactivo. Si guardas los cambios, se reactivará
          automáticamente.
        </div>
      ) : null}
      <PreventiveForm
        equipmentOptions={[]}
        initial={{
          id: plan.id,
          equipmentId: plan.equipmentId,
          frequencyDays: plan.frequencyDays,
          lastDate: toDateInput(plan.lastDate),
          nextDate: toDateInput(plan.nextDate),
          notes: plan.notes ?? "",
        }}
      />
    </div>
  );
}
