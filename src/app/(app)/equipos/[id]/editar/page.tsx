import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EquipmentForm } from "@/components/forms/equipment-form";
import { PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { toDateInput } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export const metadata: Metadata = { title: "Editar equipo" };

export default async function EditEquipmentPage({
  params,
}: {
  params: Params;
}) {
  await requireStaff();
  const { id } = await params;
  const equipmentId = Number(id);
  if (!Number.isInteger(equipmentId)) notFound();

  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
  });
  if (!equipment) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={`/equipos/${equipment.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-teal-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a la hoja de vida
      </Link>
      <PageHeader
        eyebrow={`${equipment.code} · Actualizar activo`}
        title={equipment.name}
        description="Modifica los datos técnicos o el estado operativo del equipo."
      />
      <EquipmentForm
        initial={{
          id: equipment.id,
          code: equipment.code,
          name: equipment.name,
          brand: equipment.brand,
          model: equipment.model,
          serial: equipment.serial,
          location: equipment.location,
          acquisitionDate: toDateInput(equipment.acquisitionDate),
          status: equipment.status,
          criticality: equipment.criticality,
          notes: equipment.notes,
        }}
      />
    </div>
  );
}
