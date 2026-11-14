import type { ReactNode } from "react";
import { BrainCircuit, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/components/ui";
import type { FailureCategory } from "@/lib/ai/triage";
import { failureCategories } from "@/lib/labels";

export function AiTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-700",
        className,
      )}
    >
      <Sparkles className="h-3 w-3" />
      IA
    </span>
  );
}

export function AiPanelHeader({
  title = "Triaje asistido por IA",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="mb-3 flex items-start gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
        <BrainCircuit className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xs font-semibold text-slate-900">{title}</p>
        {description ? (
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function ConfidenceMeter({
  value,
  label = "Confianza del modelo",
}: {
  value: number;
  label?: string;
}) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  const tone =
    percent >= 75 ? "bg-emerald-500" : percent >= 55 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        <span>{label}</span>
        <span className="text-slate-600">{percent}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full transition-all", tone)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function CategoryRanking({
  scores,
  highlight,
}: {
  scores: Record<FailureCategory, number>;
  highlight?: string;
}) {
  const ranked = failureCategories
    .map((category) => ({
      ...category,
      score: scores[category.value as FailureCategory] ?? 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
  const max = Math.max(1, ...ranked.map((item) => item.score));

  return (
    <div className="space-y-2">
      {ranked.map((item) => {
        const active = item.value === highlight;
        return (
          <div key={item.value}>
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5",
                  active ? "font-semibold text-slate-800" : "text-slate-500",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    active ? "bg-violet-500" : "bg-slate-300",
                  )}
                />
                {item.label}
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                {item.score}
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn(
                  "h-full rounded-full",
                  active ? "bg-violet-500" : "bg-slate-300",
                )}
                style={{ width: `${Math.round((item.score / max) * 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HumanReviewNote({ children }: { children?: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] leading-relaxed text-slate-500">
      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-500" />
      <p>
        {children ??
          "La IA solo sugiere. Un profesional de ingeniería biomédica confirma o ajusta la categoría y la prioridad antes de crear la orden."}
      </p>
    </div>
  );
}
