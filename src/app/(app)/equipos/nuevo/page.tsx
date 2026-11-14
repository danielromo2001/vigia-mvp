import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EquipmentForm } from "@/components/forms/equipment-form";
import { PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: "Registrar equipo" };

export default async function NewEquipmentPage() {
  await requireStaff();

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/equipos"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-teal-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver al inventario
      </Link>
      <PageHeader
        eyebrow="Nuevo activo"
        title="Registrar equipo biomédico"
        description="Completa los datos técnicos del equipo. Al guardarlo se abre automáticamente su hoja de vida."
      />
      <EquipmentForm />
    </div>
  );
}
