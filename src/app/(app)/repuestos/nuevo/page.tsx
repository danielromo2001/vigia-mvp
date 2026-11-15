import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SparePartForm } from "@/components/forms/spare-part-form";
import { PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Nuevo repuesto" };

export default async function NewSparePartPage() {
  await requireStaff();
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/repuestos"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-teal-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver al inventario
      </Link>
      <PageHeader
        eyebrow="Nuevo repuesto"
        title="Registrar referencia en almacén"
        description="Define el mínimo de existencias para que VIGÍA te avise antes de quedarte sin el repuesto."
      />
      <SparePartForm suppliers={suppliers} />
    </div>
  );
}
