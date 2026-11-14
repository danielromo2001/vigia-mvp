"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ClipboardList, Save, Wrench } from "lucide-react";
import { createWorkOrder } from "@/app/actions/work-orders";
import { SubmitButton } from "@/components/submit-button";
import { TriageAssistant } from "@/components/forms/triage-assistant";
import {
  Field,
  cn,
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/ui";
import type { TriageResult } from "@/lib/ai/triage";
import type { FormState } from "@/lib/form-types";
import { failureCategories, impacts } from "@/lib/labels";

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
  const [equipmentId, setEquipmentId] = useState(
    defaultEquipmentId ? String(defaultEquipmentId) : "",
  );
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState("medio");
  const [priority, setPriority] = useState("media");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("");
  const [aiApplied, setAiApplied] = useState(false);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);

  function applySuggestion(suggestion: TriageResult) {
    setType(suggestion.suggestedType);
    setPriority(suggestion.priority);
    setDueDate(suggestion.suggestedDueDate);
    setCategory(suggestion.category);
    setAiApplied(true);
    setAiConfidence(suggestion.confidence);
  }

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

      <input type="hidden" name="aiAssisted" value={aiApplied ? "1" : "0"} />
      {aiApplied && aiConfidence !== null ? (
        <input type="hidden" name="aiConfidence" value={aiConfidence} />
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
              value={equipmentId}
              onChange={(event) => setEquipmentId(event.target.value)}
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

          <Field
            label="Impacto en la atención"
            htmlFor="impact"
            hint="Ayuda a estimar la prioridad con la IA."
          >
            <select
              id="impact"
              value={impact}
              onChange={(event) => setImpact(event.target.value)}
              className={selectClass}
            >
              {impacts.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Prioridad" htmlFor="priority">
            <select
              id="priority"
              name="priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className={selectClass}
            >
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </Field>

          <Field
            label="Fecha estimada de ejecución"
            htmlFor="dueDate"
            hint="La IA la calcula según la prioridad sugerida."
          >
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className={inputClass}
            />
          </Field>

          <Field
            label="Categoría de la falla"
            htmlFor="category"
            hint="Opcional. La IA puede completarla."
          >
            <select
              id="category"
              name="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={selectClass}
            >
              <option value="">Sin categoría</option>
              {failureCategories.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
            hint="Con al menos 15 caracteres puedes pedir una sugerencia de triaje."
          >
            <textarea
              id="description"
              name="description"
              rows={4}
              required
              value={description}
              onChange={(event) => setDescription(event.target.value)}
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

      <TriageAssistant
        equipmentId={equipmentId}
        description={description}
        impact={impact}
        onApply={applySuggestion}
        applied={aiApplied}
      />

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
