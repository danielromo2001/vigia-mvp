import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Filter,
  MessageSquareWarning,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  StatCard,
  Td,
  Th,
  inputClass,
  selectClass,
} from "@/components/ui";
import { canReport, isStaff, requireUser } from "@/lib/auth";
import { computeAcceptanceRate } from "@/lib/metrics";
import {
  failureCategories,
  failureCategoryMeta,
  formatShortDate,
  impactMeta,
  priorities,
  priorityMeta,
  relativeDays,
  reportStatusMeta,
} from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Reportes de falla" };

type SearchParams = Promise<{
  estado?: string;
  categoria?: string;
  prioridad?: string;
  q?: string;
}>;

const statusOrder: Record<string, number> = {
  pendiente: 0,
  aceptada: 1,
  ajustada: 1,
  convertida: 2,
  descartada: 3,
};

export default async function FailureReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const status = params.estado ?? "";
  const category = params.categoria ?? "";
  const priority = params.prioridad ?? "";
  const q = (params.q ?? "").trim();

  const conditions: Prisma.FailureReportWhereInput[] = [];
  if (status) conditions.push({ status });
  if (category) {
    conditions.push({
      OR: [
        { finalCategory: category },
        { finalCategory: null, aiCategory: category },
      ],
    });
  }
  if (priority) {
    conditions.push({
      OR: [
        { finalPriority: priority },
        { finalPriority: null, aiPriority: priority },
      ],
    });
  }
  if (q) {
    conditions.push({
      OR: [
        { code: { contains: q } },
        { description: { contains: q } },
        { equipment: { name: { contains: q } } },
        { equipment: { code: { contains: q } } },
        { reporter: { name: { contains: q } } },
      ],
    });
  }
  const where: Prisma.FailureReportWhereInput = conditions.length
    ? { AND: conditions }
    : {};

  const [reports, statusCounts, pendingCount, highPriorityCount, convertedCount, decisions] =
    await Promise.all([
      prisma.failureReport.findMany({
        where,
        include: {
          equipment: true,
          reporter: true,
          reviewedBy: true,
          workOrder: { select: { id: true, code: true } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
      prisma.failureReport.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.failureReport.count({ where: { status: "pendiente" } }),
      prisma.failureReport.count({
        where: {
          status: "pendiente",
          OR: [
            { finalPriority: "alta" },
            { finalPriority: null, aiPriority: "alta" },
          ],
        },
      }),
      prisma.failureReport.count({ where: { status: "convertida" } }),
      prisma.failureReport.findMany({ select: { decision: true } }),
    ]);

  const countByStatus = Object.fromEntries(
    statusCounts.map((item) => [item.status, item._count._all]),
  );
  const total = statusCounts.reduce((sum, item) => sum + item._count._all, 0);
  const acceptanceRate = computeAcceptanceRate(decisions);
  const staff = isStaff(user);
  const canCreate = canReport(user);
  const hasFilters = Boolean(status || category || priority || q);

  const tabs = [
    { label: "Todos", value: "", count: total },
    { label: "Pendientes", value: "pendiente", count: countByStatus.pendiente ?? 0 },
    { label: "Aceptadas", value: "aceptada", count: countByStatus.aceptada ?? 0 },
    { label: "Ajustadas", value: "ajustada", count: countByStatus.ajustada ?? 0 },
    { label: "Convertidas", value: "convertida", count: countByStatus.convertida ?? 0 },
    { label: "Descartadas", value: "descartada", count: countByStatus.descartada ?? 0 },
  ];

  function tabHref(value: string) {
    const search = new URLSearchParams();
    if (value) search.set("estado", value);
    if (category) search.set("categoria", category);
    if (priority) search.set("prioridad", priority);
    if (q) search.set("q", q);
    const query = search.toString();
    return `/reportes-falla${query ? `?${query}` : ""}`;
  }

  const sortedReports = reports.slice().sort((a, b) => {
    const rankA = statusOrder[a.status] ?? 9;
    const rankB = statusOrder[b.status] ?? 9;
    if (rankA !== rankB) return rankA - rankB;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return (
    <div>
      <PageHeader
        eyebrow="Triaje asistido por IA"
        title="Reportes de falla"
        description="El personal clínico reporta; la IA propone la categoría y la prioridad; ingeniería biomédica confirma o ajusta antes de abrir la orden de trabajo."
        actions={
          <>
            <a
              href="/api/reportes-falla/export"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </a>
            {canCreate ? (
              <Link
                href="/reportes-falla/nueva"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800"
              >
                <Plus className="h-4 w-4" />
                Reportar falla
              </Link>
            ) : null}
          </>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pendientes de triaje"
          value={pendingCount}
          icon={<MessageSquareWarning className="h-5 w-5" />}
          tone={pendingCount > 0 ? "amber" : "emerald"}
          hint={
            pendingCount > 0
              ? "Esperan revisión de ingeniería biomédica"
              : "Todos los reportes fueron revisados"
          }
        />
        <StatCard
          label="Prioridad alta abierta"
          value={highPriorityCount}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone={highPriorityCount > 0 ? "rose" : "emerald"}
          hint="Reportes pendientes con prioridad alta sugerida"
        />
        <StatCard
          label="Convertidos en orden"
          value={convertedCount}
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone="teal"
          hint="Reportes que ya generaron una orden de trabajo"
        />
        <StatCard
          label="Aceptación de la IA"
          value={acceptanceRate === null ? "—" : `${acceptanceRate}%`}
          icon={<Sparkles className="h-5 w-5" />}
          tone={
            acceptanceRate === null || acceptanceRate >= 70 ? "emerald" : "amber"
          }
          hint={
            acceptanceRate === null
              ? "Aún no hay reportes revisados"
              : "Sugerencias aceptadas sin ajuste por el técnico"
          }
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {tabs.map((tab) => {
          const active = status === tab.value;
          return (
            <Link
              key={tab.label}
              href={tabHref(tab.value)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                active
                  ? "border-navy-900 bg-navy-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                  active
                    ? "bg-white/15 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {tab.count}
              </span>
            </Link>
          );
        })}
      </div>

      <Card className="mb-5 p-4">
        <form method="GET" className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {status ? <input type="hidden" name="estado" value={status} /> : null}
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Buscar por código, equipo, reportante o descripción…"
              className={`${inputClass} pl-10`}
            />
          </div>
          <select
            name="categoria"
            defaultValue={category}
            className={`${selectClass} lg:w-48`}
            aria-label="Filtrar por categoría"
          >
            <option value="">Todas las categorías</option>
            {failureCategories.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="prioridad"
            defaultValue={priority}
            className={`${selectClass} lg:w-40`}
            aria-label="Filtrar por prioridad"
          >
            <option value="">Toda prioridad</option>
            {priorities.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white transition hover:bg-teal-700 lg:flex-none"
            >
              <Filter className="h-4 w-4" />
              Filtrar
            </button>
            {hasFilters ? (
              <Link
                href="/reportes-falla"
                className="inline-flex h-11 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
              >
                <X className="h-3.5 w-3.5" />
                Limpiar
              </Link>
            ) : null}
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
          <p className="text-xs font-medium text-slate-500">
            {reports.length}{" "}
            {reports.length === 1 ? "reporte encontrado" : "reportes encontrados"}
          </p>
          <p className="text-[11px] text-slate-400">
            Pendientes primero · ordenados por fecha
          </p>
        </div>

        {reports.length === 0 ? (
          <EmptyState
            icon={<MessageSquareWarning className="h-6 w-6" />}
            title="No hay reportes que coincidan"
            description="Registra el primer reporte de falla o ajusta los filtros de búsqueda."
            action={
              canCreate ? (
                <Link
                  href="/reportes-falla/nueva"
                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-navy-900 px-4 text-xs font-semibold text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Reportar falla
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse">
              <thead className="bg-slate-50/80">
                <tr>
                  <Th>Reporte</Th>
                  <Th>Equipo</Th>
                  <Th>Reportante</Th>
                  <Th>Sugerencia de la IA</Th>
                  <Th>Decisión</Th>
                  <Th>Estado</Th>
                  <Th className="text-right">Detalle</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedReports.map((report) => {
                  const reportStatus = reportStatusMeta(report.status);
                  const aiCategory = failureCategoryMeta(report.aiCategory);
                  const aiPriority = priorityMeta(report.aiPriority);
                  const impact = impactMeta(report.impact);
                  const finalCategory = report.finalCategory
                    ? failureCategoryMeta(report.finalCategory)
                    : null;
                  const finalPriority = report.finalPriority
                    ? priorityMeta(report.finalPriority)
                    : null;
                  return (
                    <tr
                      key={report.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <Td>
                        <Link
                          href={`/reportes-falla/${report.id}`}
                          className="whitespace-nowrap font-semibold text-navy-900 hover:text-teal-700"
                        >
                          {report.code}
                        </Link>
                        <p className="text-[11px] text-slate-400">
                          {formatShortDate(report.createdAt)} ·{" "}
                          {relativeDays(report.createdAt)}
                        </p>
                      </Td>
                      <Td>
                        <Link
                          href={`/equipos/${report.equipmentId}`}
                          className="group block"
                        >
                          <p className="max-w-[210px] truncate text-xs font-medium text-slate-700 group-hover:text-teal-700">
                            {report.equipment.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {report.equipment.code} · {report.equipment.location}
                          </p>
                        </Link>
                      </Td>
                      <Td>
                        <p className="text-xs text-slate-600">
                          {report.reporter?.name ?? "Sin reportante"}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Impacto {impact.label.toLowerCase()}
                        </p>
                      </Td>
                      <Td>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={aiCategory.tone}>{aiCategory.label}</Badge>
                          <Badge tone={aiPriority.tone}>{aiPriority.label}</Badge>
                        </div>
                        <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-slate-400">
                          <BrainCircuit className="h-3 w-3" />
                          {Math.round(report.aiConfidence * 100)}% de confianza
                        </p>
                      </Td>
                      <Td>
                        {finalCategory && finalPriority ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge tone={finalCategory.tone}>
                              {finalCategory.label}
                            </Badge>
                            <Badge tone={finalPriority.tone}>
                              {finalPriority.label}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            Sin decisión
                          </span>
                        )}
                        {report.workOrder ? (
                          <Link
                            href={`/ordenes/${report.workOrder.id}`}
                            className="mt-1 block text-[10px] font-semibold text-teal-600 hover:underline"
                          >
                            {report.workOrder.code}
                          </Link>
                        ) : null}
                      </Td>
                      <Td>
                        <Badge tone={reportStatus.tone} dot>
                          {reportStatus.label}
                        </Badge>
                      </Td>
                      <Td className="text-right">
                        <Link
                          href={`/reportes-falla/${report.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-teal-50 hover:text-teal-600"
                          aria-label={`Ver ${report.code}`}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50/50 px-4 py-3.5">
          <BrainCircuit className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
          <div>
            <p className="text-xs font-semibold text-violet-900">
              Categoría y prioridad sugeridas automáticamente
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-violet-700">
              El clasificador combina el relato, la criticidad del equipo y el
              impacto declarado. La IA nunca crea órdenes por sí sola: la
              decisión siempre pasa por una persona.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />
          <div>
            <p className="text-xs font-semibold text-slate-800">
              Trazabilidad completa
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Se conserva la sugerencia original y la decisión del técnico
              (aceptada, ajustada o descartada) para auditar el desempeño del
              modelo.{" "}
              {staff
                ? "Los reportes pendientes se revisan desde el detalle."
                : "Un ingeniero biomédico revisa cada reporte pendiente."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
