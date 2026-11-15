"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Boxes, Save } from "lucide-react";
import { createSparePart } from "@/app/actions/spare-parts";
import { SubmitButton } from "@/components/submit-button";
import {
  Field,
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/ui";
import type { FormState } from "@/lib/form-types";
import { sparePartCategories, formatCop } from "@/lib/labels";

export function SparePartForm({
  suppliers,
}: {
  suppliers: Array<{ id: number; name: string }>;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createSparePart,
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
            <Boxes className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Identificación del repuesto
            </h2>
            <p className="text-xs text-slate-500">
              Código, categoría y ubicación dentro del almacén.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Código de referencia" htmlFor="code" required>
            <input
              id="code"
              name="code"
              required
              placeholder="SNS-NEO-05"
              className={`${inputClass} uppercase`}
            />
          </Field>
          <Field label="Nombre" htmlFor="name" required>
            <input
              id="name"
              name="name"
              required
              placeholder="Sensor de oxígeno neonatal"
              className={inputClass}
            />
          </Field>
          <Field label="Categoría" htmlFor="category">
            <select
              id="category"
              name="category"
              defaultValue="consumible"
              className={selectClass}
            >
              {sparePartCategories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ubicación en almacén" htmlFor="location" required>
            <input
              id="location"
              name="location"
              required
              placeholder="Almacén biomédico · A-03"
              className={inputClass}
            />
          </Field>
          <Field label="Proveedor" htmlFor="supplierId">
            <select
              id="supplierId"
              name="supplierId"
              defaultValue=""
              className={selectClass}
            >
              <option value="">Sin proveedor asignado</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Unidad de medida" htmlFor="unit">
            <input
              id="unit"
              name="unit"
              defaultValue="unidad"
              placeholder="unidad, caja, metro…"
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-5 text-sm font-semibold text-slate-900">
          Existencias y costo
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Stock inicial" htmlFor="stock">
            <input
              id="stock"
              name="stock"
              type="number"
              min={0}
              step={1}
              defaultValue={0}
              className={inputClass}
            />
          </Field>
          <Field
            label="Stock mínimo"
            htmlFor="minStock"
            required
            hint="Genera alerta cuando el stock cae por debajo."
          >
            <input
              id="minStock"
              name="minStock"
              type="number"
              min={1}
              step={1}
              defaultValue={1}
              required
              className={inputClass}
            />
          </Field>
          <Field
            label="Costo unitario (COP)"
            htmlFor="unitCost"
            hint={`Se muestra como ${formatCop(0)} en el inventario.`}
          >
            <input
              id="unitCost"
              name="unitCost"
              type="number"
              min={0}
              step={1000}
              defaultValue={0}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Notas" htmlFor="notes" className="mt-4">
          <textarea
            id="notes"
            name="notes"
            rows={2}
            placeholder="Compatibilidad, número de parte del fabricante…"
            className={textareaClass}
          />
        </Field>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href="/repuestos"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Cancelar
        </Link>
        <SubmitButton icon={<Save className="h-4 w-4" />}>
          Guardar repuesto
        </SubmitButton>
      </div>
    </form>
  );
}
