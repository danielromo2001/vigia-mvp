"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BrainCircuit,
  CalendarClock,
  Save,
  Sparkles,
  Wrench,
} from "lucide-react";
import {
  createFailureReport,
  suggestTriage,
} from "@/app/actions/failure-reports";
import {
  AiPanelHeader,
  CategoryRanking,
  ConfidenceMeter,
  HumanReviewNote,
} from "@/components/ai";
import { SubmitButton } from "@/components/submit-button";
import {
  Badge,
  Field,
  cn,
  selectClass,
  textareaClass,
} from "@/components/ui";
import type { TriageResult } from "@/lib/ai/triage";
import type { FormState } from "@/lib/form-types";
import {
  failureCategoryMeta,
  formatDate,
  impacts,
  orderTypeMeta,
  priorityMeta,
} from "@/lib/labels";

type EquipmentOption = {
  id: number;
  code: string;
  name: string;
  location: string;
  status: string;
  criticality: string;
};

export function FailureReportForm({
  equipmentOptions,
  defaultEquipmentId,
}: {
  equipmentOptions: EquipmentOption[];
  defaultEquipmentId?: number;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    createFailureReport,
    {},
  );
  const [equipmentId, setEquipmentId] = useState(
    defaultEquipmentId ? String(defaultEquipmentId) : "",
  );
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState("medio");
  const [suggestion, setSuggestion] = useState<TriageResult | null>(null);
  const [analyzedSignature, setAnalyzedSignature] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const signature = `${equipmentId}|${description.trim()}|${impact}`;
  const stale = suggestion !== null && analyzedSignature !== signature;
  const canAnalyze = equipmentId !== "" && description.trim().length >= 15;

  async function analyze() {
    setPending(true);
    setAiError(null);
    try {
      const response = await suggestTriage({
        equipmentId: Number(equipmentId),
        description,
        impact,
      });
      if (response.ok) {
        setSuggestion(response.suggestion);
        setAnalyzedSignature(signature);
      } else {
        setAiError(response.error);
        setSuggestion(null);
      }
    } catch {
      setAiError("No fue posible analizar el reporte. Intenta de nuevo.");
    } finally {
      setPending(false);
    }
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

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Reporte de la falla
            </h2>
            <p className="text-xs text-slate-500">
              Cuéntanos qué pasó y en qué equipo. La IA propondrá la categoría y
              la prioridad.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Equipo afectado"
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
              Impacto en la atención <span className="text-rose-500">*</span>
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {impacts.map((option) => {
                const selected = impact === option.value;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition",
                      selected
                        ? "border-teal-400 bg-teal-50/60 ring-2 ring-teal-500/10"
                        : "border-slate-200 bg-white hover:border-slate-300",
                    )}
                  >
                    <input
                      type="radio"
                      name="impact"
                      value={option.value}
                      checked={selected}
                      onChange={() => setImpact(option.value)}
                      className="mt-1 h-4 w-4 accent-teal-600"
                    />
                    <span>
                      <span className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                        {option.label}
                        <Badge tone={option.tone}>
                          {option.value === "critico"
                            ? "Prioridad máxima"
                            : option.value === "alto"
                              ? "Prioridad alta"
                              : option.value === "medio"
                                ? "Prioridad media"
                                : "Prioridad baja"}
                        </Badge>
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
            label="Descripción del problema"
            htmlFor="description"
            required
            className="sm:col-span-2"
            hint="Incluye qué hace el equipo, desde cuándo y si afecta a un paciente. Mínimo 15 caracteres."
          >
            <textarea
              id="description"
              name="description"
              rows={4}
              required
              minLength={15}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ejemplo: el monitor de signos vitales no enciende desde esta mañana; está en la UCI pediátrica y el paciente requiere monitoreo continuo."
              className={textareaClass}
            />
            <p className="mt-1 text-right text-[10px] text-slate-400">
              {description.trim().length} caracteres
            </p>
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm sm:p-6">
        <AiPanelHeader
          description="Analiza el relato, la criticidad del equipo y el impacto declarado. La sugerencia se puede revisar después del registro."
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={analyze}
            disabled={!canAnalyze || pending}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Sparkles className="h-4 w-4" />
            {pending ? "Analizando…" : suggestion ? "Analizar de nuevo" : "Sugerir categoría y prioridad"}
          </button>
          {!canAnalyze ? (
            <p className="text-[11px] text-slate-400">
              Selecciona el equipo y escribe al menos 15 caracteres.
            </p>
          ) : null}
        </div>

        {aiError ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800">
            {aiError}
          </p>
        ) : null}

        {suggestion ? (
          <div className="mt-4 space-y-4">
            {stale ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800">
                Cambiaste el relato o el impacto. Vuelve a analizar para
                actualizar la sugerencia.
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Categoría sugerida
                </p>
                <div className="mt-1.5">
                  <Badge tone={failureCategoryMeta(suggestion.category).tone}>
                    {suggestion.categoryLabel}
                  </Badge>
                </div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Prioridad estimada
                </p>
                <div className="mt-1.5">
                  <Badge tone={priorityMeta(suggestion.priority).tone}>
                    {suggestion.priorityLabel}
                  </Badge>
                </div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Orden sugerida
                </p>
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Wrench className="h-3.5 w-3.5 text-slate-400" />
                  {orderTypeMeta(suggestion.suggestedType).label}
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-slate-400">
                  <CalendarClock className="h-3 w-3" />
                  Atender antes del {formatDate(suggestion.suggestedDueDate)}
                </p>
              </div>
            </div>

            <ConfidenceMeter value={suggestion.confidence} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Comparación de categorías
                </p>
                <CategoryRanking
                  scores={suggestion.categoryScores}
                  highlight={suggestion.category}
                />
              </div>
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Por qué lo sugiere
                </p>
                <ul className="space-y-1.5">
                  {suggestion.reasons.slice(0, 4).map((reason) => (
                    <li
                      key={reason}
                      className="flex gap-1.5 text-[11px] leading-relaxed text-slate-600"
                    >
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet-400" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {suggestion.keywords.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Términos detectados:
                </span>
                {suggestion.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-md bg-violet-50 px-1.5 py-0.5 font-mono text-[10px] text-violet-700"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            ) : null}

            <HumanReviewNote>
              Al registrar el reporte, el técnico verá esta sugerencia y podrá
              aceptarla, ajustarla o descartarla. La decisión queda guardada para
              trazabilidad.
            </HumanReviewNote>
          </div>
        ) : (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-dashed border-violet-200 bg-violet-50/40 px-3 py-3 text-[11px] leading-relaxed text-violet-800">
            <BrainCircuit className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
            <p>
              El clasificador usa el relato, el nombre del equipo, su criticidad
              y el impacto declarado. Todo se ejecuta dentro de la aplicación; no
              se envían datos a terceros salvo que un administrador configure un
              proveedor de IA externo.
            </p>
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href="/reportes-falla"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Cancelar
        </Link>
        <SubmitButton
          icon={<Save className="h-4 w-4" />}
          pendingLabel="Registrando y analizando…"
        >
          Registrar reporte
        </SubmitButton>
      </div>
    </form>
  );
}
