"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ClipboardList, Save, Wrench } from "lucide-react";
import { createWorkOrder } from "@/app/actions/work-orders";
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
  status: string;
};

type UserOption = { id: number; name: string; role: string };

export function WorkOrderForm({
  equipmentOptions,
  userOptions,
  defaultEquipmentId,
  defaultType,
  defaultResponsibleId,
}: {
  equipmentOptions: EquipmentOption[];
  userOptions: UserOption[];
  defaultEquipmentId?: number;
  defaultType?: string;
  defaultResponsibleId?: number;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createWorkOrder,
    {},
  );
  const [type, setType] = useState(
    defaultType === "correctivo" ? "correctivo" : "preventivo",
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
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <ClipboardList className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Datos de la orden
            </h2>
            <p className="text-xs text-slate-500">
              Asocia el equipo, el tipo de mantenimiento y el responsable.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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

          <div className="sm:col-span-2">
            <p className="mb-1.5 text-xs font-semibold text-slate-700">
              Tipo de mantenimiento <span className="text-rose-500">*</span>
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  value: "preventivo",
                  title: "Preventivo",
                  description:
                    "Programado para anticipar fallas y extender la vida útil.",
                  icon: ClipboardList,
                },
                {
                  value: "correctivo",
                  title: "Correctivo",
                  description:
                    "Atiende una falla o solicitud del área asistencial.",
                  icon: Wrench,
                },
              ].map((option) => {
                const selected = type === option.value;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition",
                      selected
                        ? "border-teal-400 bg-teal-50/60 ring-2 ring-teal-500/10"
                        : "border-slate-200 bg-white hover:border-slate-300",
                    )}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={option.value}
                      checked={selected}
                      onChange={() => setType(option.value)}
                      className="mt-1 h-4 w-4 accent-teal-600"
                    />
                    <span>
                      <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <option.icon className="h-4 w-4 text-slate-400" />
                        {option.title}
                      </span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">
                        {option.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <Field label="Prioridad" htmlFor="priority">
            <select
              id="priority"
              name="priority"
              defaultValue="media"
              className={selectClass}
            >
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </Field>

          <Field label="Fecha estimada de ejecución" htmlFor="dueDate">
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              className={inputClass}
            />
          </Field>

          <Field
            label="Responsable"
            htmlFor="responsibleId"
            className="sm:col-span-2"
            hint="Si no asignas a alguien, la orden quedará a tu nombre."
          >
            <select
              id="responsibleId"
              name="responsibleId"
              defaultValue={defaultResponsibleId ?? ""}
              className={selectClass}
            >
              <option value="">Asignarme la orden</option>
              {userOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} — {user.role}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Descripción de la intervención o falla"
            htmlFor="description"
            required
            className="sm:col-span-2"
          >
            <textarea
              id="description"
              name="description"
              rows={3}
              required
              placeholder="Describe el trabajo a realizar o la falla reportada por el área…"
              className={textareaClass}
            />
          </Field>

          <Field
            label="Observaciones iniciales"
            htmlFor="observations"
            className="sm:col-span-2"
            hint="Opcional. Puedes ampliar el diagnóstico al cerrar la orden."
          >
            <textarea
              id="observations"
              name="observations"
              rows={2}
              placeholder="Diagnóstico preliminar, condiciones del equipo, repuestos solicitados…"
              className={textareaClass}
            />
          </Field>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href="/ordenes"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Cancelar
        </Link>
        <SubmitButton
          icon={<Save className="h-4 w-4" />}
          pendingLabel="Creando orden…"
        >
          Crear orden de trabajo
        </SubmitButton>
      </div>
    </form>
  );
}
