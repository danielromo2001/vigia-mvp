import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  MapPin,
  MessageSquareWarning,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Wrench,
  XCircle,
} from "lucide-react";
import { convertReportToWorkOrder } from "@/app/actions/failure-reports";
import {
  AiPanelHeader,
  AiTag,
  CategoryRanking,
  ConfidenceMeter,
  HumanReviewNote,
} from "@/components/ai";
import { FailureReviewForm } from "@/components/forms/failure-review-form";
import { SubmitButton } from "@/components/submit-button";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
} from "@/components/ui";
import type { FailureCategory } from "@/lib/ai/triage";
import { parseStoredJson } from "@/lib/ai/service";
import { isStaff, requireUser } from "@/lib/auth";
import {
  criticalityMeta,
  equipmentStatusMeta,
  failureCategoryMeta,
  formatDate,
  formatDateTime,
  impactMeta,
  orderTypeMeta,
  priorityMeta,
  relativeDays,
  reportStatusMeta,
} from "@/lib/labels";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ error?: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const report = await prisma.failureReport.findUnique({
    where: { id: Number(id) },
    select: { code: true },
  });
  return { title: report?.code ?? "Reporte de falla" };
}

const errorMessages: Record<string, string> = {
  descartada:
    "Este reporte fue descartado por el técnico, por lo que no se puede convertir en una orden de trabajo.",
  conversion:
    "No fue posible crear la orden de trabajo. Verifica los datos e intenta de nuevo.",
};

export default async function FailureReportDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const reportId = Number(id);
  if (!Number.isInteger(reportId)) notFound();

  const report = await prisma.failureReport.findUnique({
    where: { id: reportId },
    include: {
      equipment: { include: { plan: true } },
      reporter: true,
      reviewedBy: true,
      workOrder: true,
    },
  });

  if (!report) notFound();

  const staff = isStaff(user);
  const status = reportStatusMeta(report.status);
  const aiCategory = failureCategoryMeta(report.aiCategory);
  const aiPriority = priorityMeta(report.aiPriority);
  const impact = impactMeta(report.impact);
  const equipmentStatus = equipmentStatusMeta(report.equipment.status);
  const criticality = criticalityMeta(report.equipment.criticality);
  const suggestedType = orderTypeMeta(report.aiSuggestedType);
  const finalCategory = report.finalCategory
    ? failureCategoryMeta(report.finalCategory)
    : null;
  const finalPriority = report.finalPriority
    ? priorityMeta(report.finalPriority)
    : null;
  const scores = parseStoredJson<Record<FailureCategory, number>>(
    report.aiScores,
    {} as Record<FailureCategory, number>,
  );
  const keywords = parseStoredJson<string[]>(report.aiKeywords, []);
  const reasons = parseStoredJson<string[]>(report.aiReasons, []);
  const sourceLabel =
    report.aiSource === "llm"
      ? "Clasificador local + modelo de lenguaje"
      : "Clasificador local determinista";
  const errorMessage = query.error ? errorMessages[query.error] : null;
  const canConvert =
    staff &&
    !report.workOrderId &&
    ["aceptada", "ajustada"].includes(report.status);

  const decisionTone =
    report.decision === "aceptada"
      ? "emerald"
      : report.decision === "ajustada"
        ? "sky"
        : "slate";

  return (
    <div>
      <Link
        href="/reportes-falla"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-teal-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a los reportes
      </Link>

      {errorMessage ? (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
        >
          {errorMessage}
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Badge tone="slate">{report.code}</Badge>
            <Badge tone={status.tone} dot>
              {status.label}
            </Badge>
            <AiTag />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {report.equipment.name}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Stethoscope className="h-3.5 w-3.5 text-slate-400" />
              {report.equipment.code}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {report.equipment.location}
            </span>
            <span className="inline-flex items-center gap-1">
              <UserRound className="h-3.5 w-3.5 text-slate-400" />
              {report.reporter?.name ?? "Sin reportante"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              {formatDateTime(report.createdAt)}
            </span>
          </p>
        </div>

        <Link
          href={`/equipos/${report.equipmentId}`}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
        >
          <Stethoscope className="h-4 w-4" />
          Ver hoja de vida
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card>
            <CardHeader
              title="Descripción del reporte"
              description="Relato registrado por el reportante, sin modificaciones."
            />
            <div className="px-5 py-5">
              <p className="text-sm leading-relaxed text-slate-700">
                {report.description}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge tone={impact.tone}>Impacto {impact.label.toLowerCase()}</Badge>
                <span className="text-[11px] text-slate-400">
                  {impact.description}
                </span>
              </div>
            </div>
          </Card>

          <Card className="border-violet-200">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-violet-100 bg-violet-50/40 px-5 py-4">
              <AiPanelHeader
                title="Análisis de la IA"
                description="Sugerencia original guardada al momento del registro."
              />
              <span className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-violet-700">
                {report.aiModel}
              </span>
            </div>
            <div className="space-y-5 px-5 py-5">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Categoría
                  </p>
                  <div className="mt-1.5">
                    <Badge tone={aiCategory.tone}>{aiCategory.label}</Badge>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Prioridad
                  </p>
                  <div className="mt-1.5">
                    <Badge tone={aiPriority.tone}>{aiPriority.label}</Badge>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Orden sugerida
                  </p>
                  <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Wrench className="h-3.5 w-3.5 text-slate-400" />
                    {suggestedType.label}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Atender antes del
                  </p>
                  <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                    {formatDate(report.aiSuggestedDueDate)}
                  </p>
                </div>
              </div>

              <ConfidenceMeter value={report.aiConfidence} />

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Comparación de categorías
                  </p>
                  <CategoryRanking scores={scores} highlight={report.aiCategory} />
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Por qué lo sugiere
                  </p>
                  {reasons.length === 0 ? (
                    <p className="text-[11px] text-slate-400">
                      Sin explicación registrada.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {reasons.map((reason) => (
                        <li
                          key={reason}
                          className="flex gap-1.5 text-[11px] leading-relaxed text-slate-600"
                        >
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet-400" />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {keywords.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Términos detectados:
                  </span>
                  {keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-md bg-violet-50 px-1.5 py-0.5 font-mono text-[10px] text-violet-700"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[10px] text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <BrainCircuit className="h-3.5 w-3.5" />
                  Fuente: {sourceLabel}
                </span>
                <span>Modelo: {report.aiModel}</span>
              </div>
            </div>
          </Card>

          {report.status === "pendiente" ? (
            staff ? (
              <Card>
                <CardHeader
                  title="Revisión de ingeniería biomédica"
                  description="Confirma, ajusta o descarta la sugerencia. La decisión queda registrada con tu usuario."
                />
                <div className="px-5 py-5">
                  <FailureReviewForm
                    reportId={report.id}
                    aiCategory={report.aiCategory}
                    aiPriority={report.aiPriority}
                  />
                </div>
              </Card>
            ) : (
              <Card>
                <EmptyState
                  icon={<ShieldCheck className="h-6 w-6" />}
                  title="Pendiente de revisión"
                  description="Un ingeniero biomédico validará la sugerencia de la IA y definirá la categoría y la prioridad definitivas antes de crear la orden."
                />
              </Card>
            )
          ) : (
            <Card>
              <CardHeader
                title="Decisión del triaje humano"
                description="Resultado de la revisión sobre la sugerencia de la IA."
                action={
                  <Badge tone={decisionTone} dot>
                    {status.label}
                  </Badge>
                }
              />
              <div className="space-y-4 px-5 py-5">
                {finalCategory && finalPriority ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Categoría definitiva
                      </p>
                      <div className="mt-1.5">
                        <Badge tone={finalCategory.tone}>
                          {finalCategory.label}
                        </Badge>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Prioridad definitiva
                      </p>
                      <div className="mt-1.5">
                        <Badge tone={finalPriority.tone}>
                          {finalPriority.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    El reporte fue descartado y no generará una orden de trabajo.
                  </div>
                )}

                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Revisado por
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-slate-800">
                      {report.reviewedBy?.name ?? "Sin registrar"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Fecha de revisión
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-slate-800">
                      {formatDateTime(report.reviewedAt)}
                    </dd>
                  </div>
                </dl>

                {report.reviewNotes ? (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Nota de revisión
                    </p>
                    <p className="mt-1 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
                      {report.reviewNotes}
                    </p>
                  </div>
                ) : null}

                {report.workOrder ? (
                  <Link
                    href={`/ordenes/${report.workOrder.id}`}
                    className="group flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50/60 px-3 py-3 transition hover:bg-teal-50"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-teal-600">
                      <ClipboardList className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-teal-900">
                        Orden generada · {report.workOrder.code}
                      </span>
                      <span className="block text-[11px] text-teal-700">
                        Ver detalle de la orden de trabajo
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-teal-500 transition group-hover:translate-x-0.5" />
                  </Link>
                ) : canConvert ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <p className="text-xs font-semibold text-slate-800">
                      Convertir en orden de trabajo
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                      Se usará la categoría y la prioridad definitivas del
                      triaje. La orden queda abierta, asignada a tu usuario y con
                      vencimiento según la prioridad.
                    </p>
                    <form action={convertReportToWorkOrder} className="mt-3">
                      <input type="hidden" name="id" value={report.id} />
                      <SubmitButton
                        icon={<ClipboardList className="h-4 w-4" />}
                        pendingLabel="Creando orden…"
                        className="bg-teal-600 hover:bg-teal-700"
                      >
                        Crear orden de trabajo
                      </SubmitButton>
                    </form>
                  </div>
                ) : null}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Equipo afectado" />
            <div className="space-y-3 px-5 py-4">
              <Link
                href={`/equipos/${report.equipmentId}`}
                className="block rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition hover:border-teal-200 hover:bg-teal-50/40"
              >
                <p className="text-sm font-semibold text-slate-800">
                  {report.equipment.name}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {report.equipment.code} · {report.equipment.brand ?? "Sin marca"}{" "}
                  {report.equipment.model ? `· ${report.equipment.model}` : ""}
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500">
                  <MapPin className="h-3 w-3 text-slate-400" />
                  {report.equipment.location}
                </p>
              </Link>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone={equipmentStatus.tone} dot>
                  {equipmentStatus.label}
                </Badge>
                <Badge tone={criticality.tone} dot>
                  Criticidad {criticality.label.toLowerCase()}
                </Badge>
              </div>
              {report.equipment.plan ? (
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-[11px]">
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                    Próximo preventivo
                  </span>
                  <span className="font-semibold text-slate-700">
                    {relativeDays(report.equipment.plan.nextDate)}
                  </span>
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Trazabilidad" />
            <dl className="divide-y divide-slate-100 px-5 py-2 text-xs">
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-slate-400">Reportante</dt>
                <dd className="text-right font-medium text-slate-700">
                  {report.reporter?.name ?? "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-slate-400">Registrado</dt>
                <dd className="text-right font-medium text-slate-700">
                  {formatDateTime(report.createdAt)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-slate-400">Estado</dt>
                <dd>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-slate-400">Confianza IA</dt>
                <dd className="font-mono font-semibold text-slate-700">
                  {Math.round(report.aiConfidence * 100)}%
                </dd>
              </div>
            </dl>
          </Card>

          <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4">
            <div className="flex items-start gap-2.5">
              <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
              <div>
                <p className="text-xs font-semibold text-violet-900">
                  Supervisión humana obligatoria
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-violet-700">
                  La IA prioriza y clasifica, pero no reemplaza el criterio del
                  ingeniero biomédico. Toda orden derivada de un reporte conserva
                  la categoría y la prioridad confirmadas por una persona.
                </p>
              </div>
            </div>
          </div>

          <Card className="p-4">
            <div className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-500" />
              <p>
                Si el equipo empeora o el paciente está en riesgo, abre una orden
                de trabajo inmediata y notifica al área asistencial. No esperes
                la revisión del reporte.
              </p>
            </div>
          </Card>

          {!staff && report.status === "pendiente" ? (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] leading-relaxed text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Tu reporte ya fue recibido. Ingeniería biomédica lo revisará y
              definirá la atención.
            </div>
          ) : null}

          {staff && report.status !== "pendiente" && !report.workOrderId && !canConvert ? (
            <HumanReviewNote>
              Este reporte ya tiene una decisión registrada. Si necesitas una
              nueva orden, créala desde el módulo de órdenes de trabajo.
            </HumanReviewNote>
          ) : null}
        </div>
      </div>
    </div>
  );
}
