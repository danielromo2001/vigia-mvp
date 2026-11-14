import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
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

type SearchParams = Promise<{ filtro?: string; q?: string }>;

export default async function PreventivePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const filter = params.filtro ?? "";
  const q = (params.q ?? "").trim();

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
          staff ? (
            <Link
              href="/preventivos/nuevo"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800"
            >
              <Plus className="h-4 w-4" />
              Programar preventivo
            </Link>
          ) : undefined
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
