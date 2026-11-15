import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  Stethoscope,
  X,
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
  inputClass,
} from "@/components/ui";
import { isStaff, requireUser } from "@/lib/auth";
import {
  daysUntil,
  formatDate,
  relativeDays,
} from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { togglePreventivePlan } from "@/app/actions/preventive";
import { ConfirmButton } from "@/components/confirm-button";

export const metadata: Metadata = { title: "Preventivos" };

type SearchParams = Promise<{
  filtro?: string;
  q?: string;
  vista?: string;
  mes?: string;
}>;

const monthNameFormatter = new Intl.DateTimeFormat("es-CO", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export default async function PreventivePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const filter = params.filtro ?? "";
  const q = (params.q ?? "").trim();
  const view = params.vista === "calendario" ? "calendario" : "lista";

  const now = new Date();
  const in30 = new Date(now);
  in30.setUTCDate(in30.getUTCDate() + 30);

  const plans = await prisma.preventivePlan.findMany({
    where: q
      ? {
          OR: [
            { equipment: { name: { contains: q } } },
            { equipment: { code: { contains: q } } },
            { equipment: { location: { contains: q } } },
          ],
        }
      : {},
    include: { equipment: true },
    orderBy: [{ active: "desc" }, { nextDate: "asc" }],
  });

  const allPlans = await prisma.preventivePlan.findMany({
    include: { equipment: true },
    orderBy: { nextDate: "asc" },
  });

  const equipmentWithoutPlan = await prisma.equipment.findMany({
    where: { plan: { is: null } },
    orderBy: { name: "asc" },
  });

  const overduePlans = allPlans.filter(
    (plan) => plan.active && plan.nextDate < now,
  );
  const upcomingPlans = allPlans.filter(
    (plan) => plan.active && plan.nextDate >= now && plan.nextDate <= in30,
  );
  const compliance = allPlans.length
    ? Math.round(
        ((allPlans.length - overduePlans.length) / allPlans.length) * 100,
      )
    : 100;

  const filteredPlans = plans.filter((plan) => {
    if (filter === "vencidos") return plan.active && plan.nextDate < now;
    if (filter === "proximos") {
      return plan.active && plan.nextDate >= now && plan.nextDate <= in30;
    }
    if (filter === "inactivos") return !plan.active;
    return true;
  });

  const staff = isStaff(user);
  const hasFilters = Boolean(filter || q);

  const monthMatch = /^(\d{4})-(\d{2})$/.exec(params.mes ?? "");
  const baseDate = new Date();
  const year = monthMatch ? Number(monthMatch[1]) : baseDate.getUTCFullYear();
  const monthIndex = monthMatch
    ? Number(monthMatch[2]) - 1
    : baseDate.getUTCMonth();
  const monthStart = new Date(Date.UTC(year, monthIndex, 1));
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const leading = (monthStart.getUTCDay() + 6) % 7;
  const monthLabel = monthNameFormatter.format(monthStart);
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  const planDays = new Map<number, typeof filteredPlans>();
  for (const plan of filteredPlans) {
    const date = new Date(plan.nextDate);
    if (date.getUTCFullYear() === year && date.getUTCMonth() === monthIndex) {
      const day = date.getUTCDate();
      planDays.set(day, [...(planDays.get(day) ?? []), plan]);
    }
  }

  function monthHref(offset: number) {
    const target = new Date(Date.UTC(year, monthIndex + offset, 1));
    const search = new URLSearchParams({ vista: "calendario" });
    search.set(
      "mes",
      `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}`,
    );
    if (filter) search.set("filtro", filter);
    if (q) search.set("q", q);
    return `/preventivos?${search.toString()}`;
  }

  function viewHref(target: "lista" | "calendario") {
    const search = new URLSearchParams();
    if (filter) search.set("filtro", filter);
    if (q) search.set("q", q);
    if (target === "calendario") search.set("vista", "calendario");
    const query = search.toString();
    return `/preventivos${query ? `?${query}` : ""}`;
  }

  const tabs = [
    { label: "Todos los planes", value: "", count: allPlans.length },
    { label: "Próximos 30 días", value: "proximos", count: upcomingPlans.length },
    { label: "Vencidos", value: "vencidos", count: overduePlans.length },
    {
      label: "Inactivos",
      value: "inactivos",
      count: allPlans.filter((plan) => !plan.active).length,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Mantenimiento programado"
        title="Preventivos"
        description="Planes de mantenimiento por equipo, con periodicidad y alertas tempranas para evitar la indisponibilidad del parque biomédico."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
              <Link
                href={viewHref("lista")}
                className={`inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-xs font-semibold transition ${
                  view === "lista"
                    ? "bg-navy-900 text-white"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <LayoutList className="h-3.5 w-3.5" />
                Lista
              </Link>
              <Link
                href={viewHref("calendario")}
                className={`inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-xs font-semibold transition ${
                  view === "calendario"
                    ? "bg-navy-900 text-white"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Calendario
              </Link>
            </div>
            {staff ? (
              <Link
                href="/preventivos/nuevo"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800"
              >
                <Plus className="h-4 w-4" />
                Programar preventivo
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Planes activos"
          value={allPlans.filter((plan) => plan.active).length}
          icon={<CalendarCheck className="h-5 w-5" />}
          tone="teal"
          hint={`${equipmentWithoutPlan.length} ${equipmentWithoutPlan.length === 1 ? "equipo sin plan" : "equipos sin plan"}`}
        />
        <StatCard
          label="Vencidos"
          value={overduePlans.length}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone={overduePlans.length > 0 ? "rose" : "emerald"}
          hint={
            overduePlans.length > 0
              ? "Programar intervención inmediata"
              : "Sin planes vencidos"
          }
        />
        <StatCard
          label="Próximos 30 días"
          value={upcomingPlans.length}
          icon={<CalendarClock className="h-5 w-5" />}
          tone="amber"
          hint="Requieren agenda de mantenimiento"
        />
        <StatCard
          label="Cumplimiento"
          value={`${compliance}%`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone={compliance >= 80 ? "emerald" : "rose"}
          hint={
            <div className="space-y-2">
              <ProgressBar
                value={compliance}
                tone={compliance >= 80 ? "emerald" : "rose"}
              />
              <span>Según fecha de próxima ejecución</span>
            </div>
          }
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {tabs.map((tab) => {
          const active = filter === tab.value;
          const href = tab.value
            ? `/preventivos?filtro=${tab.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`
            : `/preventivos${q ? `?q=${encodeURIComponent(q)}` : ""}`;
          return (
            <Link
              key={tab.label}
              href={href}
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
        <form
          method="GET"
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          {filter ? <input type="hidden" name="filtro" value={filter} /> : null}
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Buscar por equipo, código o ubicación…"
              className={`${inputClass} pl-10`}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white transition hover:bg-teal-700 sm:flex-none"
            >
              <Search className="h-4 w-4" />
              Buscar
            </button>
            {hasFilters ? (
              <Link
                href="/preventivos"
                className="inline-flex h-11 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
              >
                <X className="h-3.5 w-3.5" />
                Limpiar
              </Link>
            ) : null}
          </div>
        </form>
      </Card>

      {view === "calendario" ? (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Link
                href={monthHref(-1)}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <p className="min-w-[150px] text-center text-sm font-semibold capitalize text-slate-900">
                {monthLabel}
              </p>
              <Link
                href={monthHref(1)}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="text-[11px] text-slate-400">
              {filteredPlans.length} planes · {planDays.size} días con actividad
            </p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(
                (day) => (
                  <div key={day} className="py-1">
                    {day}
                  </div>
                ),
              )}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: leading }).map((_, index) => (
                <div
                  key={`blank-${index}`}
                  className="min-h-[86px] rounded-lg bg-slate-50/40"
                />
              ))}
              {Array.from({ length: daysInMonth }, (_, index) => index + 1).map(
                (day) => {
                  const isToday =
                    Date.UTC(year, monthIndex, day) === todayUtc;
                  const dayPlans = planDays.get(day) ?? [];
                  return (
                    <div
                      key={day}
                      className={`min-h-[86px] rounded-lg border p-1.5 ${
                        isToday
                          ? "border-teal-300 bg-teal-50/40"
                          : "border-slate-100 bg-white"
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span
                          className={`text-[10px] font-semibold ${
                            isToday ? "text-teal-700" : "text-slate-400"
                          }`}
                        >
                          {day}
                        </span>
                        {dayPlans.length > 0 ? (
                          <span className="rounded-full bg-slate-100 px-1 text-[9px] text-slate-500">
                            {dayPlans.length}
                          </span>
                        ) : null}
                      </div>
                      <div className="space-y-1">
                        {dayPlans.slice(0, 3).map((plan) => {
                          const days = daysUntil(plan.nextDate);
                          const overdue =
                            plan.active && days !== null && days < 0;
                          const soon =
                            plan.active &&
                            days !== null &&
                            days >= 0 &&
                            days <= 7;
                          const tone = !plan.active
                            ? "slate"
                            : overdue
                              ? "rose"
                              : soon
                                ? "amber"
                                : "teal";
                          const colors: Record<string, string> = {
                            slate: "bg-slate-100 text-slate-500",
                            rose: "bg-rose-100 text-rose-700",
                            amber: "bg-amber-100 text-amber-700",
                            teal: "bg-teal-100 text-teal-700",
                          };
                          return (
                            <Link
                              key={plan.id}
                              href={`/equipos/${plan.equipmentId}`}
                              className={`block truncate rounded px-1.5 py-0.5 text-[9px] font-semibold transition hover:opacity-80 ${colors[tone]}`}
                              title={`${plan.equipment.code} · ${plan.equipment.name}`}
                            >
                              {plan.equipment.code}
                            </Link>
                          );
                        })}
                        {dayPlans.length > 3 ? (
                          <p className="px-1 text-[9px] text-slate-400">
                            +{dayPlans.length - 3} más
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-teal-400" />
                Al día
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Próximo (7 días)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                Vencido
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                Inactivo
              </span>
            </div>
          </div>
        </Card>
      ) : (
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
          <p className="text-xs font-medium text-slate-500">
            {filteredPlans.length}{" "}
            {filteredPlans.length === 1 ? "plan encontrado" : "planes encontrados"}
          </p>
          <p className="text-[11px] text-slate-400">
            Ordenados por próxima ejecución
          </p>
        </div>

        {filteredPlans.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="h-6 w-6" />}
            title="No hay planes en esta vista"
            description="Programa la periodicidad de un equipo o ajusta los filtros."
            action={
              staff ? (
                <Link
                  href="/preventivos/nuevo"
                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-navy-900 px-4 text-xs font-semibold text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Programar preventivo
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead className="bg-slate-50/80">
                <tr>
                  <Th>Equipo</Th>
                  <Th>Frecuencia</Th>
                  <Th>Última ejecución</Th>
                  <Th>Próxima ejecución</Th>
                  <Th>Estado</Th>
                  <Th className="text-right">Acciones</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPlans.map((plan) => {
                  const days = daysUntil(plan.nextDate);
                  const overdue = plan.active && days !== null && days < 0;
                  const soon =
                    plan.active && days !== null && days >= 0 && days <= 7;
                  const tone = !plan.active
                    ? "slate"
                    : overdue
                      ? "rose"
                      : soon
                        ? "amber"
                        : "emerald";
                  const label = !plan.active
                    ? "Inactivo"
                    : overdue
                      ? "Vencido"
                      : soon
                        ? "Próximo"
                        : "Al día";
                  const progress =
                    days !== null && plan.active
                      ? Math.max(
                          0,
                          Math.min(
                            100,
                            Math.round(
                              ((plan.frequencyDays - Math.max(days, 0)) /
                                plan.frequencyDays) *
                                100,
                            ),
                          ),
                        )
                      : 0;
                  return (
                    <tr
                      key={plan.id}
                      className={`transition hover:bg-slate-50/70 ${
                        !plan.active ? "opacity-60" : ""
                      }`}
                    >
                      <Td>
                        <Link
                          href={`/equipos/${plan.equipmentId}`}
                          className="group flex items-center gap-3"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-teal-50 group-hover:text-teal-600">
                            <Stethoscope className="h-4 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-800 group-hover:text-teal-700">
                              {plan.equipment.name}
                            </span>
                            <span className="block text-[11px] text-slate-400">
                              {plan.equipment.code} · {plan.equipment.location}
                            </span>
                          </span>
                        </Link>
                      </Td>
                      <Td>
                        <span className="text-xs font-medium text-slate-700">
                          {plan.frequencyDays} días
                        </span>
                      </Td>
                      <Td>
                        <span className="text-xs text-slate-600">
                          {formatDate(plan.lastDate)}
                        </span>
                      </Td>
                      <Td>
                        <p className="text-xs font-semibold text-slate-700">
                          {formatDate(plan.nextDate)}
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
                          {relativeDays(plan.nextDate)}
                        </p>
                        {plan.active ? (
                          <div className="mt-1.5 w-28">
                            <ProgressBar value={progress} tone={tone} />
                          </div>
                        ) : null}
                      </Td>
                      <Td>
                        <Badge tone={tone} dot>
                          {label}
                        </Badge>
                      </Td>
                      <Td>
                        <div className="flex items-center justify-end gap-1">
                          {staff ? (
                            <>
                              <Link
                                href={`/preventivos/${plan.id}/editar`}
                                className="inline-flex h-8 items-center rounded-lg px-2.5 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                              >
                                Editar
                              </Link>
                              <Link
                                href={`/ordenes/nueva?equipo=${plan.equipmentId}&tipo=preventivo`}
                                className="inline-flex h-8 items-center rounded-lg bg-teal-50 px-2.5 text-[11px] font-semibold text-teal-700 transition hover:bg-teal-100"
                              >
                                Crear orden
                              </Link>
                              <form action={togglePreventivePlan}>
                                <input type="hidden" name="id" value={plan.id} />
                                <ConfirmButton
                                  message={
                                    plan.active
                                      ? "¿Desactivar este plan preventivo?"
                                      : "¿Reactivar este plan preventivo?"
                                  }
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                >
                                  {plan.active ? (
                                    <PauseCircle className="h-4 w-4" />
                                  ) : (
                                    <PlayCircle className="h-4 w-4" />
                                  )}
                                </ConfirmButton>
                              </form>
                            </>
                          ) : (
                            <Link
                              href={`/equipos/${plan.equipmentId}`}
                              className="text-[11px] font-semibold text-teal-600 hover:underline"
                            >
                              Ver equipo
                            </Link>
                          )}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      )}

      {equipmentWithoutPlan.length > 0 ? (
        <Card className="mt-6">
          <CardHeader
            title="Equipos sin plan preventivo"
            description="Programa la periodicidad para completar la cobertura del parque biomédico."
            action={
              staff ? (
                <Link
                  href="/preventivos/nuevo"
                  className="text-xs font-semibold text-teal-600 hover:text-teal-700"
                >
                  Programar plan
                </Link>
              ) : undefined
            }
          />
          <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {equipmentWithoutPlan.map((equipment) => (
              <div
                key={equipment.id}
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5"
              >
                <Stethoscope className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-700">
                    {equipment.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {equipment.code} · {equipment.location}
                  </p>
                </div>
                {staff ? (
                  <Link
                    href={`/preventivos/nuevo?equipo=${equipment.id}`}
                    className="shrink-0 text-[11px] font-semibold text-teal-600 hover:underline"
                  >
                    Programar
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
