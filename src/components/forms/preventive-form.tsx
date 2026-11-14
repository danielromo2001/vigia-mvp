"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CalendarClock, Save } from "lucide-react";
import { savePreventivePlan } from "@/app/actions/preventive";
import { SubmitButton } from "@/components/submit-button";
import {
  Field,
  cn,
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/ui";
import type { FormState } from "@/lib/form-types";

type EquipmentOption = {
  id: number;
  code: string;
  name: string;
  location: string;
};

const presets = [30, 60, 90, 120, 180, 365];

export function PreventiveForm({
  equipmentOptions,
  initial,
  defaultEquipmentId,
}: {
  equipmentOptions: EquipmentOption[];
  initial?: {
    id: number;
    equipmentId: number;
    frequencyDays: number;
    lastDate: string;
    nextDate: string;
    notes: string;
  };
  defaultEquipmentId?: number;
}) {
  const isEdit = Boolean(initial?.id);
  const [state, formAction] = useActionState<FormState, FormData>(
    savePreventivePlan,
    {},
  );
  const [frequency, setFrequency] = useState(
    String(initial?.frequencyDays ?? 90),
  );
  const [lastDate, setLastDate] = useState(initial?.lastDate ?? "");
  const [nextDate, setNextDate] = useState(initial?.nextDate ?? "");

  const preview = (() => {
    if (nextDate) return null;
    if (!lastDate || !Number(frequency)) return null;
    const base = new Date(`${lastDate}T12:00:00.000Z`);
    if (Number.isNaN(base.getTime())) return null;
    base.setUTCDate(base.getUTCDate() + Number(frequency));
    return base.toISOString().slice(0, 10);
  })();

  return (
    <form action={formAction} className="space-y-5">
      {isEdit ? (
        <>
          <input type="hidden" name="id" value={initial?.id} />
          <input
            type="hidden"
            name="equipmentId"
            value={initial?.equipmentId}
          />
        </>
      ) : null}

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
            <CalendarClock className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Programación preventiva
            </h2>
            <p className="text-xs text-slate-500">
              Define cada cuánto debe intervenirse el equipo y cuándo es la
              próxima cita.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {!isEdit ? (
            <Field
              label="Equipo biomédico"
              htmlFor="equipmentId"
              required
              className="sm:col-span-2"
            >
              <select
                id="equipmentId"
                name="equipmentId"
                required
                defaultValue={defaultEquipmentId ?? ""}
                className={selectClass}
              >
                <option value="" disabled>
                  Selecciona un equipo…
                </option>
                {equipmentOptions.map((equipment) => (
                  <option key={equipment.id} value={equipment.id}>
                    {equipment.code} · {equipment.name} — {equipment.location}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <div className="sm:col-span-2">
            <Field
              label="Frecuencia (días)"
              htmlFor="frequencyDays"
              required
              hint="Periodicidad definida por el fabricante o por el comité de mantenimiento."
            >
              <input
                id="frequencyDays"
                name="frequencyDays"
                type="number"
                min={1}
                max={3650}
                required
                value={frequency}
                onChange={(event) => setFrequency(event.target.value)}
                className={inputClass}
              />
            </Field>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setFrequency(String(preset))}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition",
                    frequency === String(preset)
                      ? "border-teal-300 bg-teal-50 text-teal-700"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                  )}
                >
                  {preset} días
                </button>
              ))}
            </div>
          </div>

          <Field
            label="Última ejecución"
            htmlFor="lastDate"
            hint="Fecha en que se realizó el último mantenimiento."
          >
            <input
              id="lastDate"
              name="lastDate"
              type="date"
              value={lastDate}
              onChange={(event) => setLastDate(event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field
            label="Próxima ejecución"
            htmlFor="nextDate"
            hint="Si la dejas vacía se calcula automáticamente."
          >
            <input
              id="nextDate"
              name="nextDate"
              type="date"
              value={nextDate}
              onChange={(event) => setNextDate(event.target.value)}
              className={inputClass}
            />
          </Field>

          {preview ? (
            <p className="sm:col-span-2 rounded-xl border border-teal-100 bg-teal-50/60 px-3.5 py-2.5 text-xs text-teal-700">
              Próxima ejecución calculada automáticamente:{" "}
              <span className="font-semibold">{preview}</span>
            </p>
          ) : null}

          <Field
            label="Notas del plan"
            htmlFor="notes"
            className="sm:col-span-2"
          >
            <textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={initial?.notes ?? ""}
              placeholder="Protocolo, repuestos habituales, proveedor de servicio…"
              className={textareaClass}
            />
          </Field>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href="/preventivos"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Cancelar
        </Link>
        <SubmitButton icon={<Save className="h-4 w-4" />}>
          {isEdit ? "Guardar plan" : "Programar preventivo"}
        </SubmitButton>
      </div>
    </form>
  );
}
