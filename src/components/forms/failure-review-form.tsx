"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, PencilLine, ShieldCheck, XCircle } from "lucide-react";
import { reviewFailureReport } from "@/app/actions/failure-reports";
import { SubmitButton } from "@/components/submit-button";
import { Field, cn, selectClass, textareaClass } from "@/components/ui";
import type { FormState } from "@/lib/form-types";
import { failureCategories, priorities } from "@/lib/labels";

const decisions = [
  {
    value: "aceptar",
    label: "Aceptar la sugerencia",
    description: "La categoría y la prioridad propuestas por la IA son correctas.",
    icon: CheckCircle2,
  },
  {
    value: "ajustar",
    label: "Ajustar el triaje",
    description: "El técnico corrige la categoría o la prioridad antes de continuar.",
    icon: PencilLine,
  },
  {
    value: "descartar",
    label: "Descartar el reporte",
    description: "No corresponde a una falla real o ya fue atendido por otra vía.",
    icon: XCircle,
  },
];

export function FailureReviewForm({
  reportId,
  aiCategory,
  aiPriority,
}: {
  reportId: number;
  aiCategory: string;
  aiPriority: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    reviewFailureReport,
    {},
  );
  const [decision, setDecision] = useState("aceptar");
  const [category, setCategory] = useState(aiCategory);
  const [priority, setPriority] = useState(aiPriority);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={reportId} />

      {state.error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
        >
          {state.error}
        </div>
      ) : null}

      <div className="space-y-2">
        {decisions.map((option) => {
          const selected = decision === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition",
                selected
                  ? "border-teal-400 bg-teal-50/60 ring-2 ring-teal-500/10"
                  : "border-slate-200 bg-white hover:border-slate-300",
              )}
            >
              <input
                type="radio"
                name="decision"
                value={option.value}
                checked={selected}
                onChange={() => setDecision(option.value)}
                className="mt-1 h-4 w-4 accent-teal-600"
              />
              <span>
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <option.icon className="h-3.5 w-3.5 text-slate-400" />
                  {option.label}
                </span>
                <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">
                  {option.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      {decision === "ajustar" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Categoría definitiva" htmlFor="finalCategory">
            <select
              id="finalCategory"
              name="finalCategory"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={selectClass}
            >
              {failureCategories.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Prioridad definitiva" htmlFor="finalPriority">
            <select
              id="finalPriority"
              name="finalPriority"
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className={selectClass}
            >
              {priorities.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      ) : null}

      <Field
        label="Nota de revisión"
        htmlFor="reviewNotes"
        hint="Opcional. Explica por qué ajustaste o descartaste la sugerencia."
      >
        <textarea
          id="reviewNotes"
          name="reviewNotes"
          rows={2}
          placeholder="Ejemplo: el relato corresponde a una fuga de gas medicinal, no a un consumible."
          className={textareaClass}
        />
      </Field>

      <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] leading-relaxed text-slate-500">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-500" />
        <p>
          La decisión queda asociada a tu usuario y a la fecha de revisión. El
          reporte original y la sugerencia de la IA nunca se sobrescriben.
        </p>
      </div>

      <SubmitButton
        icon={<CheckCircle2 className="h-4 w-4" />}
        pendingLabel="Guardando revisión…"
        className="w-full"
      >
        {decision === "descartar"
          ? "Descartar reporte"
          : decision === "ajustar"
            ? "Guardar triaje ajustado"
            : "Aceptar sugerencia y guardar"}
      </SubmitButton>
    </form>
  );
}
