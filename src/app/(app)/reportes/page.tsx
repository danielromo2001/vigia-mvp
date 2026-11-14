import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  Download,
  Gauge,
  MessageSquareWarning,
  Sparkles,
  Stethoscope,
  Timer,
  Wrench,
} from "lucide-react";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  ProgressBar,
  StatCard,
  Td,
  Th,
} from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { requireUser } from "@/lib/auth";
import {
  computeAcceptanceRate,
  computeMtbfDays,
  computeMttrHours,
} from "@/lib/metrics";
import {
  daysUntil,
  equipmentStatusMeta,
  failureCategories,
  formatDate,
  formatLongDate,
  orderStatusMeta,
  orderTypeMeta,
  relativeDays,
} from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Reportes" };

const monthFormatter = new Intl.DateTimeFormat("es-CO", {
  month: "short",
  timeZone: "UTC",
});

export default async function ReportsPage() {
  await requireUser();
  const now = new Date();
  const in30 = new Date(now);
  in30.setUTCDate(in30.getUTCDate() + 30);

  const [equipment, orders, plans, correctiveLogs, failureReports] =
    await Promise.all([
      prisma.equipment.findMany({
        include: { plan: true, _count: { select: { workOrders: true } } },
        orderBy: { code: "asc" },
      }),
      prisma.workOrder.findMany({
        include: { equipment: true, responsible: true },
        orderBy: { openedAt: "desc" },
      }),
      prisma.preventivePlan.findMany({
        where: { active: true },
        include: { equipment: true },
        orderBy: { nextDate: "asc" },
      }),
      prisma.maintenanceLog.findMany({
        where: { eventType: "correctivo" },
        select: { equipmentId: true, date: true },
      }),
      prisma.failureReport.findMany({
        select: {
          decision: true,
          status: true,
          aiCategory: true,
          finalCategory: true,
          aiConfidence: true,
        },
      }),
    ]);

  const totalEquipment = equipment.length;
  const operativos = equipment.filter((item) => item.status === "operativo").length;
  const fueraServicio = equipment.filter(
    (item) => item.status === "fuera_servicio",
  ).length;
  const availability = totalEquipment
    ? Math.round(((totalEquipment - fueraServicio) / totalEquipment) * 100)
    : 100;

  const closedOrders = orders.filter((order) => order.status === "cerrada");
  const openOrders = orders.filter((order) =>
    ["abierta", "en_proceso"].includes(order.status),
  );
  const overdueOrders = openOrders.filter(
    (order) => order.dueDate && order.dueDate < now,
  );
  const closedWithDeadline = closedOrders.filter(
    (order) => order.dueDate && order.closedAt,
  );
  const onTime = closedWithDeadline.filter(
    (order) =>
      order.closedAt &&
      order.dueDate &&
      order.closedAt.getTime() <= order.dueDate.getTime() + 86_400_000,
  ).length;
  const deadlineCompliance = closedWithDeadline.length
    ? Math.round((onTime / closedWithDeadline.length) * 100)
    : 100;

  const closureTimes = closedOrders
    .filter((order) => order.closedAt)
    .map(
      (order) =>
        ((order.closedAt as Date).getTime() - order.openedAt.getTime()) /
        86_400_000,
    );
  const averageClosure = closureTimes.length
    ? (closureTimes.reduce((sum, value) => sum + value, 0) / closureTimes.length)
    : 0;

  const overduePlans = plans.filter((plan) => plan.nextDate < now);
  const upcomingPlans = plans.filter(
    (plan) => plan.nextDate >= now && plan.nextDate <= in30,
  );
  const preventiveCompliance = plans.length
    ? Math.round(((plans.length - overduePlans.length) / plans.length) * 100)
    : 100;

  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1),
    );
    const start = date;
    const end = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
    );
    const opened = orders.filter(
      (order) => order.openedAt >= start && order.openedAt < end,
    ).length;
    const closed = orders.filter(
      (order) =>
        order.closedAt && order.closedAt >= start && order.closedAt < end,
    ).length;
    return {
      label: monthFormatter.format(date).replace(".", ""),
      opened,
      closed,
    };
  });
  const maxMonth = Math.max(1, ...months.flatMap((month) => [month.opened, month.closed]));

  const byStatus = ["abierta", "en_proceso", "cerrada", "cancelada"].map(
    (value) => ({
      value,
      label: orderStatusMeta(value).label,
      count: orders.filter((order) => order.status === value).length,
    }),
  );
  const byType = ["preventivo", "correctivo"].map((value) => ({
    value,
    label: orderTypeMeta(value).label,
    count: orders.filter((order) => order.type === value).length,
  }));

  const locations = Array.from(
    equipment.reduce((map, item) => {
      const current = map.get(item.location) ?? {
        location: item.location,
        total: 0,
        operative: 0,
        critical: 0,
      };
      current.total += 1;
      if (item.status === "operativo") current.operative += 1;
      if (item.criticality === "alta") current.critical += 1;
      map.set(item.location, current);
      return map;
    }, new Map<string, { location: string; total: number; operative: number; critical: number }>()),
  )
    .map(([, value]) => value)
    .sort((a, b) => b.total - a.total);

  const topEquipment = equipment
    .slice()
    .sort((a, b) => b._count.workOrders - a._count.workOrders)
    .slice(0, 6);

  // Indicadores RF-08: MTTR (horas) y MTBF (días) sobre datos reales.
  const mttrHours = computeMttrHours(orders);
  const mtbf = computeMtbfDays(correctiveLogs);

  // Desempeño del triaje asistido por IA.
  const acceptanceRate = computeAcceptanceRate(failureReports);
  const reviewedReports = failureReports.filter((report) =>
    ["aceptada", "ajustada"].includes(report.decision ?? ""),
  ).length;
  const adjustedReports = failureReports.filter(
    (report) => report.decision === "ajustada",
  ).length;
  const pendingReports = failureReports.filter(
    (report) => report.status === "pendiente",
  ).length;
  const averageAiConfidence = failureReports.length
    ? Math.round(
        (failureReports.reduce(
          (sum, report) => sum + report.aiConfidence,
          0,
        ) /
          failureReports.length) *
          100,
      )
    : null;
  const categoryDistribution = failureCategories
    .map((category) => ({
      value: category.value,
      label: category.label,
      tone: category.tone,
      count: failureReports.filter(
        (report) =>
          (report.finalCategory ?? report.aiCategory) === category.value,
      ).length,
    }))
    .filter((category) => category.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxCategoryCount = Math.max(
    1,
    ...categoryDistribution.map((category) => category.count),
  );

  return (
    <div>
      <div className="mb-4 hidden print:block">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Unidad Pediátrica Simón Bolívar IPS S.A.S. · Valledupar
        </p>
        <h1 className="mt-1 text-2xl font-semibold">
          Reporte de gestión del mantenimiento biomédico
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Generado el {formatLongDate(now)} · Sistema VIGÍA
        </p>
      </div>

      <div className="no-print">
        <PageHeader
          eyebrow="Indicadores de gestión"
          title="Reportes"
          description="Consolidado del desempeño del mantenimiento biomédico: disponibilidad, cumplimiento de plazos, preventivos y carga de trabajo."
          actions={
            <>
              <PrintButton />
              <a
                href="/api/reportes/export"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800"
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </a>
            </>
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Disponibilidad del parque"
          value={`${availability}%`}
          icon={<Activity className="h-5 w-5" />}
          tone={availability >= 90 ? "emerald" : "amber"}
          hint={
            <div className="space-y-2">
              <ProgressBar
                value={availability}
                tone={availability >= 90 ? "emerald" : "amber"}
              />
              <span>
                {operativos} de {totalEquipment} equipos operativos
              </span>
            </div>
          }
        />
        <StatCard
          label="Cumplimiento de plazos"
          value={`${deadlineCompliance}%`}
          icon={<Timer className="h-5 w-5" />}
          tone={deadlineCompliance >= 80 ? "emerald" : "rose"}
          hint={`${onTime} de ${closedWithDeadline.length} órdenes cerradas a tiempo`}
        />
        <StatCard
          label="Cumplimiento preventivo"
          value={`${preventiveCompliance}%`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone={preventiveCompliance >= 80 ? "emerald" : "rose"}
          hint={`${overduePlans.length} ${overduePlans.length === 1 ? "plan vencido" : "planes vencidos"} de ${plans.length}`}
        />
        <StatCard
          label="Tiempo medio de cierre"
          value={`${averageClosure.toFixed(1)} días`}
          icon={<Gauge className="h-5 w-5" />}
          tone="sky"
          hint={`${closedOrders.length} órdenes cerradas en total`}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="MTTR · tiempo medio de reparación"
          value={mttrHours === null ? "—" : `${mttrHours} h`}
          icon={<Timer className="h-5 w-5" />}
          tone="sky"
          hint="Promedio de horas de las órdenes correctivas cerradas"
        />
        <StatCard
          label="MTBF · tiempo entre fallas"
          value={mtbf.days === null ? "—" : `${mtbf.days} días`}
          icon={<Activity className="h-5 w-5" />}
          tone="teal"
          hint={`${mtbf.failures} fallas registradas en ${mtbf.equipmentWithFailures} equipos`}
        />
        <StatCard
          label="Aceptación de la IA"
          value={acceptanceRate === null ? "—" : `${acceptanceRate}%`}
          icon={<Sparkles className="h-5 w-5" />}
          tone="violet"
          hint={`${reviewedReports} reportes revisados · ${adjustedReports} ajustados`}
        />
        <StatCard
          label="Reportes por triar"
          value={pendingReports}
          icon={<BrainCircuit className="h-5 w-5" />}
          tone={pendingReports > 0 ? "amber" : "emerald"}
          hint={
            averageAiConfidence === null
              ? "Aún no hay reportes de falla"
              : `Confianza promedio de la IA: ${averageAiConfidence}%`
          }
        />
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Triaje asistido por IA"
          description="Categorías sugeridas y validadas por ingeniería biomédica."
          action={
            <Link
              href="/reportes-falla"
              className="no-print inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
            >
              Ver reportes
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        {failureReports.length === 0 ? (
          <EmptyState
            icon={<MessageSquareWarning className="h-6 w-6" />}
            title="Sin reportes de falla"
            description="Cuando el personal reporte una falla, aquí verás el desempeño del clasificador."
          />
        ) : (
          <div className="grid gap-5 px-5 py-5 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Distribución por categoría
              </p>
              {categoryDistribution.map((category) => (
                <div key={category.value}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-2 text-slate-600">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          category.tone === "sky"
                            ? "bg-sky-500"
                            : category.tone === "violet"
                              ? "bg-violet-500"
                              : category.tone === "teal"
                                ? "bg-teal-500"
                                : category.tone === "amber"
                                  ? "bg-amber-500"
                                  : category.tone === "orange"
                                    ? "bg-orange-500"
                                    : "bg-slate-400"
                        }`}
                      />
                      {category.label}
                    </span>
                    <span className="font-semibold text-slate-700">
                      {category.count}
                    </span>
                  </div>
                  <ProgressBar
                    value={(category.count / maxCategoryCount) * 100}
                    tone="teal"
                  />
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">
                  Reportes totales
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {failureReports.length}
                </p>
                <p className="text-[10px] text-slate-400">
                  Con sugerencia de categoría y prioridad
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">
                  Confianza promedio
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {averageAiConfidence === null
                    ? "—"
                    : `${averageAiConfidence}%`}
                </p>
                <p className="text-[10px] text-slate-400">
                  Del clasificador vigia-triage-v1
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">
                  Aceptadas sin ajuste
                </p>
                <p className="mt-1 text-2xl font-semibold text-teal-600">
                  {failureReports.filter(
                    (report) => report.decision === "aceptada",
                  ).length}
                </p>
                <p className="text-[10px] text-slate-400">
                  {acceptanceRate === null ? "Sin revisados" : `${acceptanceRate}%`}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">
                  Ajustadas por el técnico
                </p>
                <p className="mt-1 text-2xl font-semibold text-sky-600">
                  {adjustedReports}
                </p>
                <p className="text-[10px] text-slate-400">
                  Corregidas antes de crear la orden
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Órdenes por mes"
            description="Comparativo de órdenes abiertas y cerradas en los últimos 6 meses."
            action={
              <div className="flex items-center gap-3 text-[10px] font-medium text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-sky-400" />
                  Abiertas
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-teal-500" />
                  Cerradas
                </span>
              </div>
            }
          />
          <div className="px-5 py-6">
            <div className="flex h-52 items-end justify-between gap-3 sm:gap-6">
              {months.map((month) => (
                <div
                  key={month.label}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <div className="flex h-40 w-full items-end justify-center gap-1.5">
                    <div
                      className="w-full max-w-7 rounded-t-md bg-sky-400/90 transition hover:bg-sky-500"
                      style={{
                        height: `${Math.max(4, (month.opened / maxMonth) * 100)}%`,
                      }}
                      title={`${month.opened} abiertas`}
                    />
                    <div
                      className="w-full max-w-7 rounded-t-md bg-teal-500 transition hover:bg-teal-600"
                      style={{
                        height: `${Math.max(4, (month.closed / maxMonth) * 100)}%`,
                      }}
                      title={`${month.closed} cerradas`}
                    />
                  </div>
                  <span className="text-[11px] font-medium capitalize text-slate-500">
                    {month.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">
                  Total órdenes
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {orders.length}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">
                  Activas
                </p>
                <p className="mt-1 text-lg font-semibold text-sky-600">
                  {openOrders.length}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">
                  Vencidas
                </p>
                <p className="mt-1 text-lg font-semibold text-rose-600">
                  {overdueOrders.length}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Órdenes por estado"
              description="Distribución del total registrado."
            />
            <div className="space-y-3 px-5 py-4">
              {byStatus.map((item) => {
                const meta = orderStatusMeta(item.value);
                const percent = orders.length
                  ? Math.round((item.count / orders.length) * 100)
                  : 0;
                return (
                  <div key={item.value}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-2 text-slate-600">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            meta.tone === "emerald"
                              ? "bg-emerald-500"
                              : meta.tone === "amber"
                                ? "bg-amber-500"
                                : meta.tone === "sky"
                                  ? "bg-sky-500"
                                  : "bg-slate-400"
                          }`}
                        />
                        {meta.label}
                      </span>
                      <span className="font-semibold text-slate-700">
                        {item.count}{" "}
                        <span className="font-normal text-slate-400">
                          ({percent}%)
                        </span>
                      </span>
                    </div>
                    <ProgressBar
                      value={percent}
                      tone={
                        meta.tone === "emerald"
                          ? "emerald"
                          : meta.tone === "amber"
                            ? "amber"
                            : meta.tone === "sky"
                              ? "sky"
                              : "rose"
                      }
                    />
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title="Tipo de mantenimiento" />
            <div className="grid grid-cols-2 gap-3 px-5 py-4">
              {byType.map((item) => (
                <div
                  key={item.value}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5"
                >
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {item.count}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {orders.length
                      ? `${Math.round((item.count / orders.length) * 100)}% del total`
                      : "Sin órdenes"}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Cobertura por ubicación"
            description="Equipos y disponibilidad por servicio asistencial."
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-slate-50/80">
                <tr>
                  <Th>Ubicación</Th>
                  <Th className="text-center">Equipos</Th>
                  <Th className="text-center">Operativos</Th>
                  <Th className="text-center">Criticidad alta</Th>
                  <Th className="text-right">Disponibilidad</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {locations.map((location) => {
                  const percent = location.total
                    ? Math.round((location.operative / location.total) * 100)
                    : 0;
                  return (
                    <tr key={location.location} className="hover:bg-slate-50/60">
                      <Td>
                        <span className="text-xs font-medium text-slate-700">
                          {location.location}
                        </span>
                      </Td>
                      <Td className="text-center text-xs">{location.total}</Td>
                      <Td className="text-center text-xs">
                        {location.operative}
                      </Td>
                      <Td className="text-center">
                        {location.critical > 0 ? (
                          <Badge tone="rose">{location.critical}</Badge>
                        ) : (
                          <span className="text-xs text-slate-300">0</span>
                        )}
                      </Td>
                      <Td className="text-right">
                        <span
                          className={`text-xs font-semibold ${
                            percent >= 80 ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          {percent}%
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Equipos con más intervenciones"
            description="Carga histórica de trabajo por activo."
          />
          {topEquipment.length === 0 ? (
            <EmptyState
              icon={<Stethoscope className="h-6 w-6" />}
              title="Sin datos suficientes"
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {topEquipment.map((item) => {
                const status = equipmentStatusMeta(item.status);
                return (
                  <Link
                    key={item.id}
                    href={`/equipos/${item.id}`}
                    className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50/70"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <Wrench className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-800">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {item.code} · {item.location}
                      </p>
                    </div>
                    <Badge tone={status.tone} dot>
                      {status.label}
                    </Badge>
                    <span className="w-8 text-right text-xs font-semibold text-slate-700">
                      {item._count.workOrders}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Estado de los planes preventivos"
          description={`${plans.length} planes activos · ${upcomingPlans.length} próximos en 30 días · ${overduePlans.length} vencidos`}
          action={
            <Link
              href="/preventivos"
              className="no-print text-xs font-semibold text-teal-600 hover:text-teal-700"
            >
              Gestionar planes
            </Link>
          }
        />
        {plans.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle className="h-6 w-6" />}
            title="Sin planes preventivos"
            description="Programa la periodicidad de los equipos para activar los indicadores."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead className="bg-slate-50/80">
                <tr>
                  <Th>Equipo</Th>
                  <Th>Frecuencia</Th>
                  <Th>Última ejecución</Th>
                  <Th>Próxima ejecución</Th>
                  <Th>Estado</Th>
                  <Th className="text-right">Días</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plans.map((plan) => {
                  const days = daysUntil(plan.nextDate);
                  const overdue = days !== null && days < 0;
                  const soon = days !== null && days >= 0 && days <= 7;
                  return (
                    <tr key={plan.id} className="hover:bg-slate-50/60">
                      <Td>
                        <Link
                          href={`/equipos/${plan.equipmentId}`}
                          className="text-xs font-semibold text-slate-700 hover:text-teal-700"
                        >
                          {plan.equipment.name}
                        </Link>
                        <p className="text-[11px] text-slate-400">
                          {plan.equipment.code}
                        </p>
                      </Td>
                      <Td>
                        <span className="text-xs text-slate-600">
                          {plan.frequencyDays} días
                        </span>
                      </Td>
                      <Td>
                        <span className="text-xs text-slate-600">
                          {formatDate(plan.lastDate)}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-xs font-medium text-slate-700">
                          {formatDate(plan.nextDate)}
                        </span>
                      </Td>
                      <Td>
                        <Badge
                          tone={overdue ? "rose" : soon ? "amber" : "emerald"}
                          dot
                        >
                          {overdue ? "Vencido" : soon ? "Próximo" : "Al día"}
                        </Badge>
                      </Td>
                      <Td className="text-right">
                        <span
                          className={`text-xs font-semibold ${
                            overdue
                              ? "text-rose-600"
                              : soon
                                ? "text-amber-600"
                                : "text-slate-600"
                          }`}
                        >
                          {relativeDays(plan.nextDate)}
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="no-print mt-6 grid gap-3 sm:grid-cols-3">
        <Link
          href="/ordenes"
          className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition hover:border-teal-200 hover:shadow-md"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <ClipboardList className="h-4 w-4" />
          </span>
          <span className="flex-1">
            <span className="block text-xs font-semibold text-slate-800">
              Detalle de órdenes de trabajo
            </span>
            <span className="block text-[11px] text-slate-400">
              {orders.length} registros · exportables en CSV
            </span>
          </span>
          <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500" />
        </Link>
        <Link
          href="/reportes-falla"
          className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition hover:border-teal-200 hover:shadow-md"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <MessageSquareWarning className="h-4 w-4" />
          </span>
          <span className="flex-1">
            <span className="block text-xs font-semibold text-slate-800">
              Reportes de falla y triaje IA
            </span>
            <span className="block text-[11px] text-slate-400">
              {failureReports.length} reportes · {pendingReports} por revisar
            </span>
          </span>
          <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500" />
        </Link>
        <Link
          href="/panel"
          className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition hover:border-teal-200 hover:shadow-md"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <BarChart3 className="h-4 w-4" />
          </span>
          <span className="flex-1">
            <span className="block text-xs font-semibold text-slate-800">
              Volver al panel operativo
            </span>
            <span className="block text-[11px] text-slate-400">
              Alertas, preventivos y actividad reciente
            </span>
          </span>
          <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-teal-500" />
        </Link>
      </div>

      <p className="mt-6 text-center text-[10px] text-slate-400">
        Reporte generado por VIGÍA · {formatLongDate(now)} · Unidad Pediátrica
        Simón Bolívar IPS S.A.S.
      </p>
    </div>
  );
}
