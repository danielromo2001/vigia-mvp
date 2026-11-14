import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  MessageSquareWarning,
  Plus,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Wrench,
} from "lucide-react";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ProgressBar,
  StatCard,
  Td,
  Th,
} from "@/components/ui";
import { isStaff, requireUser } from "@/lib/auth";
import {
  failureCategoryMeta,
  formatDate,
  formatShortDate,
  orderStatusMeta,
  orderTypeMeta,
  priorityMeta,
  relativeDays,
} from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Panel" };

function bogotaHour(date: Date) {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Bogota",
    }).format(date),
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const in30Days = new Date(now);
  in30Days.setUTCDate(in30Days.getUTCDate() + 30);
  const in7Days = new Date(now);
  in7Days.setUTCDate(in7Days.getUTCDate() + 7);
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  const [
    equipment,
    openOrders,
    recentOrders,
    plans,
    closedThisMonth,
    activity,
    pendingReports,
  ] = await Promise.all([
      prisma.equipment.findMany({
        include: { plan: true },
        orderBy: { code: "asc" },
      }),
      prisma.workOrder.findMany({
        where: { status: { in: ["abierta", "en_proceso"] } },
        include: { equipment: true, responsible: true },
        orderBy: [{ dueDate: "asc" }, { openedAt: "asc" }],
      }),
      prisma.workOrder.findMany({
        include: { equipment: true, responsible: true },
        orderBy: { openedAt: "desc" },
        take: 6,
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
        take: 4,
      }),
      prisma.failureReport.findMany({
        where: { status: "pendiente" },
        include: { equipment: true, reporter: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
    ]);

  const total = equipment.length;
  const operativos = equipment.filter((item) => item.status === "operativo").length;
  const enMantenimiento = equipment.filter(
    (item) => item.status === "en_mantenimiento",
  ).length;
  const fueraServicio = equipment.filter(
    (item) => item.status === "fuera_servicio",
  ).length;

  const overdueOrders = openOrders.filter(
    (order) => order.dueDate && order.dueDate < now,
  );
  const overduePlans = plans.filter((plan) => plan.nextDate < now);
  const upcomingPlans = plans.filter(
    (plan) => plan.nextDate >= now && plan.nextDate <= in30Days,
  );
  const criticalUpcoming = plans.filter(
    (plan) => plan.nextDate >= now && plan.nextDate <= in7Days,
  );
  const compliance = plans.length
    ? Math.round(((plans.length - overduePlans.length) / plans.length) * 100)
    : 100;

  const hour = bogotaHour(now);
  const greeting = hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";
  const firstName = user.name.split(" ")[0];

  const statusSegments = [
    { label: "Operativos", value: operativos, color: "#10b981" },
    { label: "En mantenimiento", value: enMantenimiento, color: "#f59e0b" },
    { label: "Fuera de servicio", value: fueraServicio, color: "#f43f5e" },
  ];
  let cursor = 0;
  const donutGradient =
    total > 0
      ? `conic-gradient(${statusSegments
          .map((segment) => {
            const start = cursor;
            cursor += (segment.value / total) * 100;
            return `${segment.color} ${start}% ${cursor}%`;
          })
          .join(", ")})`
      : "conic-gradient(#e2e8f0 0% 100%)";

  type AlertItem = {
    id: string;
    tone: "rose" | "amber" | "sky";
    title: string;
    detail: string;
    meta: string;
    href: string;
  };

  const alerts: AlertItem[] = [
    ...overduePlans.slice(0, 2).map((plan) => ({
      id: `plan-${plan.id}`,
      tone: "rose" as const,
      title: `Preventivo vencido · ${plan.equipment.code}`,
      detail: `${plan.equipment.name} — ${relativeDays(plan.nextDate).toLowerCase()}`,
      meta: "Programar",
      href: `/preventivos/${plan.id}/editar`,
    })),
    ...overdueOrders.slice(0, 2).map((order) => ({
      id: `order-${order.id}`,
      tone: "rose" as const,
      title: `Orden vencida · ${order.code}`,
      detail: `${order.equipment.name} — ${relativeDays(order.dueDate).toLowerCase()}`,
      meta: "Revisar",
      href: `/ordenes/${order.id}`,
    })),
    ...criticalUpcoming.slice(0, 2).map((plan) => ({
      id: `upcoming-${plan.id}`,
      tone: "amber" as const,
      title: `Preventivo próximo · ${plan.equipment.code}`,
      detail: `${plan.equipment.name} — ${relativeDays(plan.nextDate).toLowerCase()}`,
      meta: "Ver plan",
      href: `/preventivos/${plan.id}/editar`,
    })),
  ].slice(0, 5);

  const staff = isStaff(user);

  return (
    <div>
      <section className="relative mb-6 overflow-hidden rounded-2xl bg-navy-950 px-6 py-7 text-white shadow-xl shadow-navy-950/10 sm:px-8">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-teal-500/15 blur-3xl" />
        <div className="absolute -bottom-28 right-40 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-teal-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              {user.role.label} · Unidad Pediátrica Simón Bolívar
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {greeting}, {firstName}.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
              {openOrders.length > 0 ||
              overduePlans.length > 0 ||
              pendingReports.length > 0 ? (
                <>
                  Tienes{" "}
                  <span className="font-semibold text-white">
                    {openOrders.length}{" "}
                    {openOrders.length === 1 ? "orden activa" : "órdenes activas"}
                  </span>
                  ,{" "}
                  <span className="font-semibold text-white">
                    {overduePlans.length}{" "}
                    {overduePlans.length === 1
                      ? "preventivo vencido"
                      : "preventivos vencidos"}
                  </span>{" "}
                  y{" "}
                  <span className="font-semibold text-white">
                    {pendingReports.length}{" "}
                    {pendingReports.length === 1
                      ? "reporte de falla por triar"
                      : "reportes de falla por triar"}
                  </span>
                  . Prioriza los equipos de criticidad alta para proteger la
                  continuidad del servicio.
                </>
              ) : (
                <>
                  No hay alertas críticas. Todos los preventivos están al día y
                  el parque biomédico se encuentra bajo control.
                </>
              )}
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
                  href="/equipos/nuevo"
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
                >
                  <Stethoscope className="h-4 w-4" />
                  Registrar equipo
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Equipos biomédicos"
          value={total}
          icon={<Stethoscope className="h-5 w-5" />}
          tone="sky"
          hint={
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {operativos} operativos
              </span>
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-1 text-rose-600">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                {fueraServicio} fuera de servicio
              </span>
            </span>
          }
        />
        <StatCard
          label="Órdenes activas"
          value={openOrders.length}
          icon={<ClipboardList className="h-5 w-5" />}
          tone="amber"
          hint={
            overdueOrders.length > 0 ? (
              <span className="font-medium text-rose-600">
                {overdueOrders.length}{" "}
                {overdueOrders.length === 1 ? "vencida" : "vencidas"} por atender
              </span>
            ) : (
              <span className="text-emerald-600">Sin órdenes vencidas</span>
            )
          }
        />
        <StatCard
          label="Preventivos próximos"
          value={upcomingPlans.length}
          icon={<CalendarClock className="h-5 w-5" />}
          tone="teal"
          hint={`${criticalUpcoming.length} en los próximos 7 días · ${closedThisMonth} ${closedThisMonth === 1 ? "cierre" : "cierres"} este mes`}
        />
        <StatCard
          label="Cumplimiento preventivo"
          value={`${compliance}%`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone={compliance >= 80 ? "emerald" : "rose"}
          hint={
            <div className="space-y-2">
              <ProgressBar
                value={compliance}
                tone={compliance >= 80 ? "emerald" : "rose"}
              />
              <span>
                {plans.length - overduePlans.length} de {plans.length} planes al
                día
              </span>
            </div>
          }
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader
              title="Órdenes de trabajo recientes"
              description="Últimos movimientos registrados por el equipo de ingeniería."
              action={
                <Link
                  href="/ordenes"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
                >
                  Ver todas
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            {recentOrders.length === 0 ? (
              <EmptyState
                title="Aún no hay órdenes registradas"
                description="Crea la primera orden de trabajo para comenzar a llevar el control."
                action={
                  staff ? (
                    <Link
                      href="/ordenes/nueva"
                      className="inline-flex h-9 items-center gap-2 rounded-xl bg-navy-900 px-4 text-xs font-semibold text-white"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Nueva orden
                    </Link>
                  ) : undefined
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <Th>Orden</Th>
                      <Th>Equipo</Th>
                      <Th>Tipo</Th>
                      <Th>Responsable</Th>
                      <Th>Estado</Th>
                      <Th className="text-right">Apertura</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentOrders.map((order) => {
                      const status = orderStatusMeta(order.status);
                      const type = orderTypeMeta(order.type);
                      return (
                        <tr
                          key={order.id}
                          className="transition hover:bg-slate-50/70"
                        >
                          <Td>
                            <Link
                              href={`/ordenes/${order.id}`}
                              className="whitespace-nowrap font-semibold text-navy-900 hover:text-teal-700"
                            >
                              {order.code}
                            </Link>
                          </Td>
                          <Td>
                            <p className="font-medium text-slate-800">
                              {order.equipment.name}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {order.equipment.code}
                            </p>
                          </Td>
                          <Td>
                            <Badge tone={type.tone} dot>
                              {type.label}
                            </Badge>
                          </Td>
                          <Td>
                            <span className="text-xs text-slate-600">
                              {order.responsible?.name ?? "Sin asignar"}
                            </span>
                          </Td>
                          <Td>
                            <Badge tone={status.tone} dot>
                              {status.label}
                            </Badge>
                          </Td>
                          <Td className="text-right text-xs text-slate-500">
                            {formatShortDate(order.openedAt)}
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Preventivos por atender"
              description="Programación ordenada por fecha límite."
              action={
                <Link
                  href="/preventivos"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
                >
                  Ver calendario
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            {plans.length === 0 ? (
              <EmptyState
                title="Sin planes preventivos"
                description="Programa la periodicidad de tus equipos para anticipar fallas."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {plans
                  .slice()
                  .sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime())
                  .slice(0, 4)
                  .map((plan) => {
                    const days = relativeDays(plan.nextDate);
                    const overdue = plan.nextDate < now;
                    const soon =
                      !overdue &&
                      plan.nextDate.getTime() - now.getTime() <
                        7 * 86_400_000;
                    return (
                      <Link
                        key={plan.id}
                        href={`/equipos/${plan.equipmentId}`}
                        className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-slate-50/70"
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            overdue
                              ? "bg-rose-50 text-rose-500"
                              : soon
                                ? "bg-amber-50 text-amber-600"
                                : "bg-teal-50 text-teal-600"
                          }`}
                        >
                          <CalendarClock className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {plan.equipment.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {plan.equipment.code} · cada {plan.frequencyDays}{" "}
                            días
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-slate-700">
                            {formatShortDate(plan.nextDate)}
                          </p>
                          <p
                            className={`text-[11px] ${
                              overdue
                                ? "font-semibold text-rose-600"
                                : soon
                                  ? "font-semibold text-amber-600"
                                  : "text-slate-400"
                            }`}
                          >
                            {days}
                          </p>
                        </div>
                        <ArrowRight className="hidden h-4 w-4 text-slate-300 sm:block" />
                      </Link>
                    );
                  })}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Alertas de mantenimiento"
              description="Prioriza estas intervenciones."
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
                  No hay preventivos vencidos ni órdenes atrasadas.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {alerts.map((alert) => (
                  <Link
                    key={alert.id}
                    href={alert.href}
                    className="group flex gap-3 px-5 py-3.5 transition hover:bg-slate-50/70"
                  >
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        alert.tone === "rose"
                          ? "bg-rose-50 text-rose-500"
                          : alert.tone === "amber"
                            ? "bg-amber-50 text-amber-600"
                            : "bg-sky-50 text-sky-600"
                      }`}
                    >
                      {alert.tone === "rose" ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
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
                    <span className="self-center text-[10px] font-bold uppercase tracking-wide text-teal-600 opacity-0 transition group-hover:opacity-100">
                      {alert.meta}
                    </span>
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
                {pendingReports.slice(0, 4).map((report) => {
                  const category = failureCategoryMeta(report.aiCategory);
                  const priority = priorityMeta(report.aiPriority);
                  return (
                    <Link
                      key={report.id}
                      href={`/reportes-falla/${report.id}`}
                      className="group flex gap-3 px-5 py-3.5 transition hover:bg-slate-50/70"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                        <MessageSquareWarning className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-800">
                          {report.equipment.name}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">
                          {report.code} · {report.reporter?.name ?? "Sin reportante"}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <Badge tone={category.tone}>{category.label}</Badge>
                          <Badge tone={priority.tone}>{priority.label}</Badge>
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                            <Sparkles className="h-3 w-3" />
                            {Math.round(report.aiConfidence * 100)}%
                          </span>
                        </div>
                      </div>
                      <div className="self-center text-right">
                        <p className="text-[10px] font-medium text-slate-400">
                          {relativeDays(report.createdAt)}
                        </p>
                        <ArrowRight className="ml-auto mt-1 h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-teal-500" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Estado del parque
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Distribución por estado operativo
                </p>
              </div>
              <Link
                href="/equipos"
                className="text-xs font-semibold text-teal-600 hover:text-teal-700"
              >
                Equipos
              </Link>
            </div>
            <div className="flex items-center gap-5">
              <div
                className="relative flex h-[132px] w-[132px] shrink-0 items-center justify-center rounded-full"
                style={{ background: donutGradient }}
              >
                <div className="flex h-[94px] w-[94px] flex-col items-center justify-center rounded-full bg-white">
                  <span className="text-2xl font-semibold text-slate-900">
                    {total}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">
                    Equipos
                  </span>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-2.5">
                {statusSegments.map((segment) => (
                  <div key={segment.label} className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: segment.color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[11px] text-slate-600">
                      {segment.label}
                    </span>
                    <span className="text-xs font-semibold text-slate-800">
                      {segment.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <Link
              href="/equipos"
              className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              <span className="inline-flex items-center gap-2">
                <Wrench className="h-3.5 w-3.5 text-slate-400" />
                {enMantenimiento}{" "}
                {enMantenimiento === 1 ? "equipo" : "equipos"} en mantenimiento
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
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
            href: "/equipos",
            label: "Inventario biomédico",
            detail: `${total} equipos registrados`,
            icon: Stethoscope,
          },
          {
            href: "/ordenes",
            label: "Órdenes de trabajo",
            detail: `${openOrders.length} activas en este momento`,
            icon: ClipboardList,
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
