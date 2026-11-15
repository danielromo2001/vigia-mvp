import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  MessageSquareWarning,
  Plus,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Timer,
  TrendingDown,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ProgressBar,
} from "@/components/ui";
import { isStaff, requireUser } from "@/lib/auth";
import {
  computeMtbfDays,
  computeMttrHours,
} from "@/lib/metrics";
import {
  failureCategoryMeta,
  formatCompactCop,
  formatDate,
  formatDuration,
  formatShortDate,
  orderSla,
  priorityMeta,
  relativeDays,
  stockLevel,
} from "@/lib/labels";
import { operationStatus } from "@/lib/operation-status";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Resumen" };

function bogotaHour(date: Date) {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Bogota",
    }).format(date),
  );
}

const weekLabel = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const in72Hours = new Date(now.getTime() + 72 * 3_600_000);
  const in30Days = new Date(now);
  in30Days.setUTCDate(in30Days.getUTCDate() + 30);
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  const [
    equipment,
    orders,
    plans,
    closedThisMonth,
    activity,
    pendingReports,
    correctiveLogs,
    spareParts,
  ] = await Promise.all([
    prisma.equipment.findMany({
      include: { plan: true },
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
    prisma.workOrder.count({
      where: { status: "cerrada", closedAt: { gte: monthStart } },
    }),
    prisma.maintenanceLog.findMany({
      include: { equipment: true },
      orderBy: { date: "desc" },
      take: 5,
    }),
    prisma.failureReport.findMany({
      where: { status: "pendiente" },
      include: { equipment: true, reporter: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.maintenanceLog.findMany({
      where: { eventType: "correctivo" },
      select: { equipmentId: true, date: true },
    }),
    prisma.sparePart.findMany({
      where: { active: true },
      include: { supplier: true },
      orderBy: { stock: "asc" },
    }),
  ]);

  const openOrders = orders.filter((order) =>
    ["abierta", "en_proceso"].includes(order.status),
  );
  const overdueOrders = openOrders.filter(
    (order) => order.dueDate && order.dueDate < now,
  );
  const overduePlans = plans.filter((plan) => plan.nextDate < now);
  const upcoming72h = plans.filter(
    (plan) => plan.nextDate >= now && plan.nextDate <= in72Hours,
  );
  const upcomingPlans = plans.filter(
    (plan) => plan.nextDate >= now && plan.nextDate <= in30Days,
  );
  const lowStock = spareParts.filter((part) => part.stock < part.minStock);
  const criticalDown = equipment.filter(
    (item) => item.status === "fuera_servicio" && item.criticality === "alta",
  );
  const fueraServicio = equipment.filter(
    (item) => item.status === "fuera_servicio",
  ).length;
  const operativos = equipment.filter(
    (item) => item.status === "operativo",
  ).length;
  const enMantenimiento = equipment.filter(
    (item) => item.status === "en_mantenimiento",
  ).length;

  const compliance = plans.length
    ? Math.round(((plans.length - overduePlans.length) / plans.length) * 100)
    : 100;
  const mttr = computeMttrHours(orders);
  const mtbf = computeMtbfDays(correctiveLogs);

  const operation = operationStatus({
    criticalDown: criticalDown.length,
    overduePlans: overduePlans.length,
    overdueOrders: overdueOrders.length,
    pendingReports: pendingReports.length,
    lowStock: lowStock.length,
  });

  const hour = bogotaHour(now);
  const greeting =
    hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";
  const firstName = user.name.split(" ")[0];
  const staff = isStaff(user);

  // Semanas móviles para el gráfico preventivo vs correctivo.
  const weekMs = 7 * 86_400_000;
  const todayStart = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const weeks = Array.from({ length: 6 }, (_, index) => {
    const start = todayStart - (5 - index) * weekMs;
    return {
      start,
      end: start + weekMs,
      label: weekLabel.format(new Date(start)),
      preventive: 0,
      corrective: 0,
    };
  });
  for (const order of orders) {
    const time = order.openedAt.getTime();
    const bucket = weeks.find((week) => time >= week.start && time < week.end);
    if (!bucket) continue;
    if (order.type === "preventivo") bucket.preventive += 1;
    if (order.type === "correctivo") bucket.corrective += 1;
  }
  const chartMax = Math.max(
    1,
    ...weeks.map((week) => week.preventive + week.corrective),
  );

  const criticalAssets = equipment
    .filter((item) => item.criticality === "alta")
    .map((item) => ({
      ...item,
      openCount: openOrders.filter((order) => order.equipmentId === item.id)
        .length,
      planOverdue: Boolean(item.plan && item.plan.nextDate < now),
    }))
    .filter(
      (item) =>
        item.status !== "operativo" || item.openCount > 0 || item.planOverdue,
    )
    .slice(0, 4);

  const loadMap = new Map<string, number>();
  for (const order of openOrders) {
    const key = order.responsible?.name ?? "Sin asignar";
    loadMap.set(key, (loadMap.get(key) ?? 0) + 1);
  }
  const teamLoad = [...loadMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const maxLoad = Math.max(1, ...teamLoad.map(([, count]) => count));

  const alerts = [
    ...overdueOrders.slice(0, 2).map((order) => ({
      id: `order-${order.id}`,
      tone: "rose" as const,
      title: `Orden vencida · ${order.code}`,
      detail: `${order.equipment.name} — ${relativeDays(order.dueDate).toLowerCase()}`,
      href: `/ordenes/${order.id}`,
    })),
    ...overduePlans.slice(0, 2).map((plan) => ({
      id: `plan-${plan.id}`,
      tone: "amber" as const,
      title: `Preventivo vencido · ${plan.equipment.code}`,
      detail: `${plan.equipment.name} — ${relativeDays(plan.nextDate).toLowerCase()}`,
      href: `/preventivos/${plan.id}/editar`,
    })),
    ...lowStock.slice(0, 2).map((part) => ({
      id: `part-${part.id}`,
      tone: "amber" as const,
      title: `Repuesto bajo · ${part.code}`,
      detail: `${part.name} — ${part.stock} de ${part.minStock} ${part.unit}`,
      href: "/repuestos",
    })),
  ].slice(0, 5);

  return (
    <div>
      <section className="relative mb-6 overflow-hidden rounded-2xl bg-navy-950 px-6 py-7 text-white shadow-xl shadow-navy-950/10 sm:px-8">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-teal-500/15 blur-3xl" />
        <div className="absolute -bottom-28 right-40 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-teal-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                Resumen operativo
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-300">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    operation.tone === "emerald"
                      ? "bg-emerald-400"
                      : operation.tone === "amber"
                        ? "bg-amber-400"
                        : "bg-rose-400"
                  }`}
                />
                {operation.label}
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {greeting}, {firstName}.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
              {operation.detail}. El parque biomédico tiene{" "}
              <span className="font-semibold text-white">{operativos}</span>{" "}
              equipos operativos y{" "}
              <span className="font-semibold text-white">{openOrders.length}</span>{" "}
              órdenes activas en este momento.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {staff ? (
              <>
                <Link
                  href="/ordenes/nueva"
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal-500 px-4 text-sm font-semibold text-navy-950 shadow-lg shadow-teal-500/20 transition hover:bg-teal-400"
                >
                  <Plus className="h-4 w-4" />
                  Nueva orden
                </Link>
                <Link
                  href="/equipos?registrar=1"
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
                >
                  <Stethoscope className="h-4 w-4" />
                  Registrar activo
                </Link>
              </>
            ) : (
              <Link
                href="/reportes"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal-500 px-4 text-sm font-semibold text-navy-950 transition hover:bg-teal-400"
              >
                <ArrowUpRight className="h-4 w-4" />
                Ver reportes
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatusStrip
          tone="emerald"
          label="Operación estable"
          value={operativos}
          caption={`de ${equipment.length} activos operativos`}
        />
        <StatusStrip
          tone="amber"
          label="Atención prioritaria"
          value={overdueOrders.length + overduePlans.length + pendingReports.length}
          caption={`${enMantenimiento} en mantenimiento · ${lowStock.length} repuestos bajos`}
        />
        <StatusStrip
          tone="rose"
          label="Crítico"
          value={criticalDown.length}
          caption={`${fueraServicio} fuera de servicio en total`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="MTTR"
          value={mttr !== null ? formatDuration(mttr) : "—"}
          hint="Tiempo medio de reparación"
          icon={<Timer className="h-5 w-5" />}
          tone="teal"
          trend={mttr !== null && mttr <= 4 ? "up" : "down"}
          trendLabel={mttr !== null && mttr <= 4 ? "Dentro de meta" : "Sobre meta"}
        />
        <KpiCard
          label="MTBF"
          value={mtbf.days !== null ? `${Math.round(mtbf.days)} días` : "—"}
          hint={`${mtbf.failures} fallas registradas`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="sky"
          trend={mtbf.days !== null && mtbf.days >= 30 ? "up" : "down"}
          trendLabel={mtbf.days !== null && mtbf.days >= 30 ? "Confiabilidad alta" : "Vigilar"}
        />
        <KpiCard
          label="Cumplimiento preventivo"
          value={`${compliance}%`}
          hint={`${plans.length - overduePlans.length} de ${plans.length} planes al día`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone={compliance >= 80 ? "emerald" : "rose"}
          trend={compliance >= 80 ? "up" : "down"}
          trendLabel={compliance >= 80 ? "Meta cumplida" : "Requiere plan"}
        />
        <KpiCard
          label="Órdenes pendientes"
          value={String(openOrders.length)}
          hint={`${overdueOrders.length} vencidas · ${closedThisMonth} cierres este mes`}
          icon={<ClipboardList className="h-5 w-5" />}
          tone="amber"
          trend={overdueOrders.length === 0 ? "up" : "down"}
          trendLabel={overdueOrders.length === 0 ? "Sin vencidas" : "Revisar SLA"}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card className="p-5">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Mantenimientos por semana
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Órdenes preventivas y correctivas de las últimas 6 semanas.
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-teal-500" />
                  Preventivo
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-orange-400" />
                  Correctivo
                </span>
              </div>
            </div>
            <div className="flex h-40 items-end gap-3 sm:gap-5">
              {weeks.map((week) => {
                const total = week.preventive + week.corrective;
                return (
                  <div
                    key={week.start}
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                  >
                    <div className="flex h-full w-full items-end justify-center gap-1">
                      <div
                        className="w-1/3 min-w-[6px] rounded-t-md bg-teal-500/90 transition-all"
                        style={{
                          height: `${Math.max(4, (week.preventive / chartMax) * 100)}%`,
                        }}
                        title={`${week.preventive} preventivas`}
                      />
                      <div
                        className="w-1/3 min-w-[6px] rounded-t-md bg-orange-400/90 transition-all"
                        style={{
                          height: `${Math.max(4, (week.corrective / chartMax) * 100)}%`,
                        }}
                        title={`${week.corrective} correctivas`}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-medium text-slate-500">
                        {week.label}
                      </p>
                      <p className="text-[10px] text-slate-400">{total} órdenes</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader
              title="Activos críticos"
              description="Equipos de criticidad alta con novedades o mantenimiento próximo."
              action={
                <Link
                  href="/equipos?criticidad=alta"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
                >
                  Ver activos
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            {criticalAssets.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="h-6 w-6" />}
                title="Activos críticos bajo control"
                description="No hay equipos de criticidad alta fuera de servicio ni con preventivos vencidos."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {criticalAssets.map((item) => {
                  const sla = orderSla({ status: "abierta", dueDate: item.plan?.nextDate });
                  return (
                    <Link
                      key={item.id}
                      href={`/equipos/${item.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50/70"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          item.status === "fuera_servicio"
                            ? "bg-rose-50 text-rose-500"
                            : item.status === "en_mantenimiento"
                              ? "bg-amber-50 text-amber-600"
                              : "bg-teal-50 text-teal-600"
                        }`}
                      >
                        <Wrench className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {item.code} · {item.location}
                        </p>
                      </div>
                      <div className="hidden text-right sm:block">
                        <p className="text-[11px] text-slate-500">
                          {item.plan ? formatShortDate(item.plan.nextDate) : "Sin plan"}
                        </p>
                        <p
                          className={`text-[10px] ${
                            item.planOverdue
                              ? "font-semibold text-rose-600"
                              : "text-slate-400"
                          }`}
                        >
                          {item.plan ? relativeDays(item.plan.nextDate) : "Programar"}
                        </p>
                      </div>
                      <Badge
                        tone={item.openCount > 0 ? "amber" : "slate"}
                        dot
                      >
                        {item.openCount > 0
                          ? `${item.openCount} orden${item.openCount === 1 ? "" : "es"}`
                          : sla?.label ?? "Sin órdenes"}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Carga del equipo"
              description="Órdenes activas por responsable técnico."
              action={
                <Link
                  href="/ordenes"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
                >
                  Ver órdenes
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            <div className="space-y-4 px-5 py-5">
              {teamLoad.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Sin órdenes activas asignadas.
                </p>
              ) : (
                teamLoad.map(([name, count]) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-900 text-[10px] font-bold text-white">
                      {name
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0]?.toUpperCase())
                        .join("")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold text-slate-700">
                          {name}
                        </p>
                        <span className="text-[11px] text-slate-500">
                          {count} {count === 1 ? "orden" : "órdenes"}
                        </span>
                      </div>
                      <ProgressBar
                        value={(count / maxLoad) * 100}
                        tone={count >= 3 ? "amber" : "teal"}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Próximos mantenimientos"
              description="Preventivos programados en las próximas 72 horas."
              action={
                <Link
                  href="/preventivos"
                  className="text-xs font-semibold text-teal-600 hover:text-teal-700"
                >
                  Calendario
                </Link>
              }
            />
            {upcoming72h.length === 0 ? (
              <div className="px-5 py-6">
                <p className="text-xs font-medium text-slate-600">
                  Sin mantenimientos en 72 horas.
                </p>
                {upcomingPlans.length > 0 ? (
                  <p className="mt-1 text-[11px] text-slate-400">
                    El siguiente es {relativeDays(upcomingPlans[0].nextDate).toLowerCase()}:{" "}
                    {upcomingPlans[0].equipment.name}.
                  </p>
                ) : null}
                <Link
                  href="/preventivos/nuevo"
                  className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-200"
                >
                  <Plus className="h-3 w-3" />
                  Programar preventivo
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {upcoming72h.slice(0, 4).map((plan) => (
                  <Link
                    key={plan.id}
                    href={`/equipos/${plan.equipmentId}`}
                    className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50/70"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                      <CalendarClock className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-800">
                        {plan.equipment.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {plan.equipment.code} · {formatShortDate(plan.nextDate)}
                      </p>
                    </div>
                    <Badge tone="amber" dot>
                      {relativeDays(plan.nextDate)}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Atención prioritaria"
              description="Vencimientos y faltantes que requieren decisión."
              action={
                <Link
                  href="/preventivos?filtro=vencidos"
                  className="text-xs font-semibold text-teal-600 hover:text-teal-700"
                >
                  Ver todo
                </Link>
              }
            />
            {alerts.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" />
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  Todo al día
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  No hay preventivos vencidos, órdenes atrasadas ni repuestos bajos.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {alerts.map((alert) => (
                  <Link
                    key={alert.id}
                    href={alert.href}
                    className="group flex gap-3 px-5 py-3 transition hover:bg-slate-50/70"
                  >
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        alert.tone === "rose"
                          ? "bg-rose-50 text-rose-500"
                          : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {alert.tone === "rose" ? (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      ) : (
                        <Clock className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-800">
                        {alert.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {alert.detail}
                      </p>
                    </div>
                    <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-300 transition group-hover:text-teal-500" />
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Reportes de falla por triar"
              description="La IA ya sugirió categoría y prioridad."
              action={
                <Link
                  href="/reportes-falla?estado=pendiente"
                  className="text-xs font-semibold text-teal-600 hover:text-teal-700"
                >
                  Ver todos
                </Link>
              }
            />
            {pendingReports.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" />
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  Sin reportes pendientes
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Todo el triaje asistido por IA está al día.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingReports.slice(0, 3).map((report) => {
                  const category = failureCategoryMeta(report.aiCategory);
                  const priority = priorityMeta(report.aiPriority);
                  return (
                    <Link
                      key={report.id}
                      href={`/reportes-falla/${report.id}`}
                      className="group flex gap-3 px-5 py-3 transition hover:bg-slate-50/70"
                    >
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                        <MessageSquareWarning className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-800">
                          {report.equipment.name}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">
                          {report.code} · {report.reporter?.name ?? "Sin reportante"}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge tone={category.tone}>{category.label}</Badge>
                          <Badge tone={priority.tone}>{priority.label}</Badge>
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                            <Sparkles className="h-3 w-3" />
                            {Math.round(report.aiConfidence * 100)}%
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Inventario crítico
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {lowStock.length} referencias bajo mínimo ·{" "}
                  {formatCompactCop(
                    spareParts.reduce(
                      (sum, part) => sum + part.unitCost * part.stock,
                      0,
                    ),
                  )}
                </p>
              </div>
              <Link
                href="/repuestos"
                className="text-xs font-semibold text-teal-600 hover:text-teal-700"
              >
                Repuestos
              </Link>
            </div>
            {lowStock.length === 0 ? (
              <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-[11px] font-medium text-emerald-700">
                Todas las referencias están sobre el mínimo.
              </p>
            ) : (
              <div className="space-y-2.5">
                {lowStock.slice(0, 3).map((part) => {
                  const level = stockLevel(part.stock, part.minStock);
                  return (
                    <Link
                      key={part.id}
                      href="/repuestos"
                      className="block rounded-xl border border-slate-100 px-3 py-2.5 transition hover:border-slate-200 hover:bg-slate-50/70"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[11px] font-semibold text-slate-800">
                          {part.name}
                        </p>
                        <span className="shrink-0 text-[10px] font-semibold text-slate-500">
                          {part.stock}/{part.minStock}
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <ProgressBar value={level.ratio} tone={level.tone} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Actividad reciente"
              description="Hoja de vida del parque biomédico."
            />
            <div className="px-5 py-4">
              <ol className="relative space-y-4 border-l border-slate-200 pl-4">
                {activity.map((log) => (
                  <li key={log.id} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-teal-500" />
                    <p className="text-[11px] font-semibold text-slate-800">
                      {log.equipment.code} · {log.equipment.name}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                      {log.description}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {formatDate(log.date)}
                    </p>
                  </li>
                ))}
                {activity.length === 0 ? (
                  <p className="text-xs text-slate-400">Sin actividad aún.</p>
                ) : null}
              </ol>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            href: "/reportes-falla",
            label: "Reportes de falla",
            detail: `${pendingReports.length} ${
              pendingReports.length === 1
                ? "pendiente de triaje"
                : "pendientes de triaje"
            }`,
            icon: MessageSquareWarning,
          },
          {
            href: "/repuestos",
            label: "Inventario de repuestos",
            detail: `${spareParts.length} referencias · ${lowStock.length} por reponer`,
            icon: Boxes,
          },
          {
            href: "/proveedores",
            label: "Proveedores",
            detail: "Contratos, SLA y desempeño",
            icon: Users,
          },
          {
            href: "/reportes",
            label: "Reportes de gestión",
            detail: `${compliance}% de cumplimiento preventivo`,
            icon: CheckCircle2,
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition hover:border-teal-200 hover:shadow-md"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-teal-50 group-hover:text-teal-600">
              <item.icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-slate-800">
                {item.label}
              </span>
              <span className="block truncate text-[11px] text-slate-400">
                {item.detail}
              </span>
            </span>
            <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-teal-500" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatusStrip({
  tone,
  label,
  value,
  caption,
}: {
  tone: "emerald" | "amber" | "rose";
  label: string;
  value: number;
  caption: string;
}) {
  const styles = {
    emerald: "border-emerald-200 bg-emerald-50/70 text-emerald-700",
    amber: "border-amber-200 bg-amber-50/70 text-amber-700",
    rose: "border-rose-200 bg-rose-50/70 text-rose-700",
  };
  const dots = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${styles[tone]}`}>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dots[tone]}`} />
        <p className="text-[11px] font-semibold uppercase tracking-wide">
          {label}
        </p>
        <span className="ml-auto text-lg font-semibold leading-none">{value}</span>
      </div>
      <p className="mt-1 text-[10px] opacity-80">{caption}</p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  tone,
  trend,
  trendLabel,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  tone: "teal" | "emerald" | "amber" | "rose" | "sky";
  trend: "up" | "down";
  trendLabel: string;
}) {
  const tones = {
    teal: "border-teal-200 bg-teal-50 text-teal-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${tones[tone]}`}
        >
          {icon}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
            trend === "up"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          {trend === "up" ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {trendLabel}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">{hint}</p>
    </Card>
  );
}
