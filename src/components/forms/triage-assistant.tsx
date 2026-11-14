"use client";

import { useState } from "react";
import { Check, Sparkles, Wand2 } from "lucide-react";
import { suggestTriage } from "@/app/actions/failure-reports";
import {
  AiPanelHeader,
  ConfidenceMeter,
  HumanReviewNote,
} from "@/components/ai";
import { Badge, cn } from "@/components/ui";
import type { TriageResult } from "@/lib/ai/triage";
import {
  failureCategoryMeta,
  formatDate,
  orderTypeMeta,
  priorityMeta,
} from "@/lib/labels";

export function TriageAssistant({
  equipmentId,
  description,
  impact,
  onApply,
  applied,
}: {
  equipmentId: string;
  description: string;
  impact: string;
  onApply: (suggestion: TriageResult) => void;
  applied: boolean;
}) {
  const [suggestion, setSuggestion] = useState<TriageResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAnalyze = equipmentId !== "" && description.trim().length >= 15;

  async function analyze() {
    setPending(true);
    setError(null);
    try {
      const response = await suggestTriage({
        equipmentId: Number(equipmentId),
        description,
        impact,
      });
      if (response.ok) {
        setSuggestion(response.suggestion);
      } else {
        setError(response.error);
      }
    } catch {
      setError("No fue posible analizar la orden. Intenta de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-violet-200 bg-violet-50/20 p-4 sm:p-5">
      <AiPanelHeader
        title="Asistente de triaje"
        description="Completa el equipo y la descripción; la IA estima la categoría, la prioridad y el tipo de mantenimiento. Siempre puedes cambiarlo."
      />

      <button
        type="button"
        onClick={analyze}
        disabled={!canAnalyze || pending}
        className="inline-flex h-9 items-center gap-2 rounded-xl bg-violet-600 px-3.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {pending ? "Analizando…" : suggestion ? "Volver a sugerir" : "Sugerir con IA"}
      </button>

      {error ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800">
          {error}
        </p>
      ) : null}

      {suggestion ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={failureCategoryMeta(suggestion.category).tone}>
              {suggestion.categoryLabel}
            </Badge>
            <Badge tone={priorityMeta(suggestion.priority).tone}>
              Prioridad {suggestion.priorityLabel.toLowerCase()}
            </Badge>
            <Badge tone={orderTypeMeta(suggestion.suggestedType).tone}>
              {orderTypeMeta(suggestion.suggestedType).label}
            </Badge>
            <span className="text-[10px] text-slate-400">
              Vence {formatDate(suggestion.suggestedDueDate)}
            </span>
          </div>

          <ConfidenceMeter value={suggestion.confidence} />

          <ul className="space-y-1">
            {suggestion.reasons.slice(0, 3).map((reason) => (
              <li
                key={reason}
                className="flex gap-1.5 text-[11px] leading-relaxed text-slate-600"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet-400" />
                {reason}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onApply(suggestion)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-semibold transition",
                applied
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-violet-300 bg-white text-violet-700 hover:bg-violet-50",
              )}
            >
              {applied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Wand2 className="h-3.5 w-3.5" />
              )}
              {applied ? "Sugerencia aplicada" : "Aplicar sugerencia"}
            </button>
            {applied ? (
              <span className="text-[10px] text-slate-400">
                Puedes editar los campos manualmente.
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-3">
        <HumanReviewNote />
      </div>
    </section>
  );
}
