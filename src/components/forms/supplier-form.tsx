"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Building2, FileText, Save } from "lucide-react";
import { createSupplier } from "@/app/actions/suppliers";
import { SubmitButton } from "@/components/submit-button";
import {
  Field,
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/ui";
import type { FormState } from "@/lib/form-types";
import { supplierStatuses } from "@/lib/labels";

export function SupplierForm() {
  const [state, formAction] = useActionState<FormState, FormData>(
    createSupplier,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
        >
          {state.error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <Building2 className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Datos del proveedor
            </h2>
            <p className="text-xs text-slate-500">
              Información de contacto y especialidad técnica.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre o razón social" htmlFor="name" required>
            <input
              id="name"
              name="name"
              required
              placeholder="Tecnosalud Colombia"
              className={inputClass}
            />
          </Field>
          <Field label="Especialidad" htmlFor="specialty" required>
            <input
              id="specialty"
              name="specialty"
              required
              placeholder="Ventilación y anestesia"
              className={inputClass}
            />
          </Field>
          <Field label="Contacto" htmlFor="contactName">
            <input
              id="contactName"
              name="contactName"
              placeholder="Mesa técnica 24/7"
              className={inputClass}
            />
          </Field>
          <Field label="Teléfono" htmlFor="phone">
            <input
              id="phone"
              name="phone"
              placeholder="601 555 0142"
              className={inputClass}
            />
          </Field>
          <Field label="Correo" htmlFor="email">
            <input
              id="email"
              name="email"
              type="email"
              placeholder="servicio@proveedor.co"
              className={inputClass}
            />
          </Field>
          <Field
            label="Desempeño (%)"
            htmlFor="performance"
            hint="Calificación inicial del comité."
          >
            <input
              id="performance"
              name="performance"
              type="number"
              min={0}
              max={100}
              step={1}
              defaultValue={80}
              className={inputClass}
            />
          </Field>
          <Field label="Estado" htmlFor="status">
            <select
              id="status"
              name="status"
              defaultValue="aprobado"
              className={selectClass}
            >
              {supplierStatuses.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Notas" htmlFor="notes" className="mt-4">
          <textarea
            id="notes"
            name="notes"
            rows={2}
            placeholder="Condiciones comerciales, garantías, observaciones…"
            className={textareaClass}
          />
        </Field>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <FileText className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Contrato inicial (opcional)
            </h2>
            <p className="text-xs text-slate-500">
              Puedes asociar el contrato ahora o hacerlo después.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Código del contrato" htmlFor="contractCode">
            <input
              id="contractCode"
              name="contractCode"
              placeholder="CT-2026-014"
              className={`${inputClass} uppercase`}
            />
          </Field>
          <Field label="Valor (COP)" htmlFor="contractValue">
            <input
              id="contractValue"
              name="contractValue"
              type="number"
              min={0}
              step={100000}
              defaultValue={0}
              className={inputClass}
            />
          </Field>
          <Field label="Descripción" htmlFor="contractDescription" className="sm:col-span-2">
            <input
              id="contractDescription"
              name="contractDescription"
              placeholder="Mantenimiento especializado para ventilación pediátrica"
              className={inputClass}
            />
          </Field>
          <Field label="Inicio" htmlFor="startDate">
            <input
              id="startDate"
              name="startDate"
              type="date"
              className={inputClass}
            />
          </Field>
          <Field label="Fin" htmlFor="endDate">
            <input
              id="endDate"
              name="endDate"
              type="date"
              className={inputClass}
            />
          </Field>
          <Field label="SLA comprometido (horas)" htmlFor="slaHours">
            <input
              id="slaHours"
              name="slaHours"
              type="number"
              min={0}
              step={1}
              defaultValue={8}
              className={inputClass}
            />
          </Field>
          <Field label="Próxima revisión" htmlFor="nextReview">
            <input
              id="nextReview"
              name="nextReview"
              type="date"
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href="/proveedores"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Cancelar
        </Link>
        <SubmitButton icon={<Save className="h-4 w-4" />}>
          Guardar proveedor
        </SubmitButton>
      </div>
    </form>
  );
}
