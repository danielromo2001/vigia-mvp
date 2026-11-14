"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Save, Stethoscope } from "lucide-react";
import {
  createEquipment,
  updateEquipment,
} from "@/app/actions/equipment";
import { SubmitButton } from "@/components/submit-button";
import { Field, inputClass, selectClass, textareaClass } from "@/components/ui";
import type { FormState } from "@/lib/form-types";

export type EquipmentFormValues = {
  id?: number;
  code?: string;
  name?: string;
  brand?: string | null;
  model?: string | null;
  serial?: string;
  location?: string;
  acquisitionDate?: string;
  status?: string;
  criticality?: string;
  notes?: string | null;
};

export function EquipmentForm({
  initial,
}: {
  initial?: EquipmentFormValues;
}) {
  const isEdit = Boolean(initial?.id);
  const [state, formAction] = useActionState<FormState, FormData>(
    isEdit ? updateEquipment : createEquipment,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      {isEdit ? <input type="hidden" name="id" value={initial?.id} /> : null}

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
            <Stethoscope className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Identificación del equipo
            </h2>
            <p className="text-xs text-slate-500">
              Datos técnicos que aparecerán en la hoja de vida.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Código interno" htmlFor="code" hint="Si lo dejas vacío se genera automáticamente (EQ-011, EQ-012…).">
            <input
              id="code"
              name="code"
              defaultValue={initial?.code}
              placeholder="EQ-011"
              className={inputClass}
            />
          </Field>
          <Field label="Nombre del equipo" htmlFor="name" required>
            <input
              id="name"
              name="name"
              required
              defaultValue={initial?.name}
              placeholder="Monitor de signos vitales"
              className={inputClass}
            />
          </Field>
          <Field label="Marca" htmlFor="brand">
            <input
              id="brand"
              name="brand"
              defaultValue={initial?.brand ?? ""}
              placeholder="Mindray"
              className={inputClass}
            />
          </Field>
          <Field label="Modelo" htmlFor="model">
            <input
              id="model"
              name="model"
              defaultValue={initial?.model ?? ""}
              placeholder="uMEC12"
              className={inputClass}
            />
          </Field>
          <Field
            label="Número de serie"
            htmlFor="serial"
            required
            hint="Identificador único del fabricante."
          >
            <input
              id="serial"
              name="serial"
              required
              defaultValue={initial?.serial}
              placeholder="MN-2021-001"
              className={inputClass}
            />
          </Field>
          <Field label="Fecha de adquisición" htmlFor="acquisitionDate">
            <input
              id="acquisitionDate"
              name="acquisitionDate"
              type="date"
              defaultValue={initial?.acquisitionDate}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-5 text-sm font-semibold text-slate-900">
          Ubicación y estado
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Ubicación / servicio" htmlFor="location" required>
            <input
              id="location"
              name="location"
              required
              defaultValue={initial?.location}
              placeholder="UCI Pediátrica"
              className={inputClass}
            />
          </Field>
          <Field label="Estado operativo" htmlFor="status">
            <select
              id="status"
              name="status"
              defaultValue={initial?.status ?? "operativo"}
              className={selectClass}
            >
              <option value="operativo">Operativo</option>
              <option value="en_mantenimiento">En mantenimiento</option>
              <option value="fuera_servicio">Fuera de servicio</option>
            </select>
          </Field>
          <Field label="Criticidad clínica" htmlFor="criticality">
            <select
              id="criticality"
              name="criticality"
              defaultValue={initial?.criticality ?? "media"}
              className={selectClass}
            >
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </Field>
        </div>
        <Field label="Notas / observaciones" htmlFor="notes" className="mt-4">
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={initial?.notes ?? ""}
            placeholder="Accesorios, condiciones especiales, ubicación exacta…"
            className={textareaClass}
          />
        </Field>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href={isEdit && initial?.id ? `/equipos/${initial.id}` : "/equipos"}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Cancelar
        </Link>
        <SubmitButton icon={<Save className="h-4 w-4" />}>
          {isEdit ? "Guardar cambios" : "Registrar equipo"}
        </SubmitButton>
      </div>
    </form>
  );
}
