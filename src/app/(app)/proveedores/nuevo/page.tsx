import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SupplierForm } from "@/components/forms/supplier-form";
import { PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: "Nuevo proveedor" };

export default async function NewSupplierPage() {
  await requireStaff();

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/proveedores"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-teal-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a proveedores
      </Link>
      <PageHeader
        eyebrow="Nuevo proveedor"
        title="Registrar proveedor biomédico"
        description="Centraliza contacto, especialidad, contratos y SLA para evaluar el desempeño con datos."
      />
      <SupplierForm />
    </div>
  );
}
