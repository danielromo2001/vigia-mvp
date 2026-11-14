import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  ClipboardList,
  Filter,
  Plus,
  Search,
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
import { isStaff, requireUser } from "@/lib/auth";
import {
  formatDate,
  formatShortDate,
  orderStatusMeta,
  orderTypeMeta,
  priorityMeta,
  relativeDays,
} from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Órdenes de trabajo" };

type SearchParams = Promise<{
  estado?: string;
  tipo?: string;
  q?: string;
  equipo?: string;
}>;

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const status = params.estado ?? "";
  const type = params.tipo ?? "";
  const q = (params.q ?? "").trim();
  const equipmentId = Number(params.equipo ?? 0);

  const where = {
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...(Number.isInteger(equipmentId) && equipmentId > 0
      ? { equipmentId }
      : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q } },
            { description: { contains: q } },
            { equipment: { name: { contains: q } } },
            { equipment: { code: { contains: q } } },
            { responsible: { name: { contains: q } } },
          ],
        }
      : {}),
  };

  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  const [orders, statusCounts, activeCount, overdueCount, closedThisMonth] =
    await Promise.all([
      prisma.workOrder.findMany({
        where,
        include: { equipment: true, responsible: true },
        orderBy: [{ openedAt: "desc" }, { id: "desc" }],
      }),
      prisma.workOrder.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.workOrder.count({
        where: { status: { in: ["abierta", "en_proceso"] } },
      }),
      prisma.workOrder.count({
        where: {
          status: { in: ["abierta", "en_proceso"] },
          dueDate: { lt: now },
        },
      }),
      prisma.workOrder.count({
        where: { status: "cerrada", closedAt: { gte: monthStart } },
      }),
    ]);

  const countByStatus = Object.fromEntries(
    statusCounts.map((item) => [item.status, item._count._all]),
  );
  const total = statusCounts.reduce((sum, item) => sum + item._count._all, 0);

  const staff = isStaff(user);
  const hasFilters = Boolean(status || type || q || equipmentId);
  const filteredEquipment =
    equipmentId > 0 ? orders[0]?.equipment ?? null : null;

  const tabs = [
    { label: "Todas", value: "", count: total },
    { label: "Abiertas", value: "abierta", count: countByStatus.abierta ?? 0 },
    {
      label: "En proceso",
      value: "en_proceso",
      count: countByStatus.en_proceso ?? 0,
    },
    { label: "Cerradas", value: "cerrada", count: countByStatus.cerrada ?? 0 },
    {
      label: "Canceladas",
      value: "cancelada",
      count: countByStatus.cancelada ?? 0,
    },
  ];

  function tabHref(value: string) {
    const search = new URLSearchParams();
    if (value) search.set("estado", value);
    if (type) search.set("tipo", type);
    if (q) search.set("q", q);
    if (equipmentId > 0) search.set("equipo", String(equipmentId));
    const query = search.toString();
    return `/ordenes${query ? `?${query}` : ""}`;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Gestión del mantenimiento"
        title="Órdenes de trabajo"
        description="Solicitudes preventivas y correctivas, con responsable, prioridad y trazabilidad de cierre."
        actions={
          staff ? (
            <Link
              href="/ordenes/nueva"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800"
            >
              <Plus className="h-4 w-4" />
              Nueva orden
            </Link>
          ) : undefined
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Órdenes activas"
          value={activeCount}
          icon={<ClipboardList className="h-5 w-5" />}
          tone="sky"
          hint="Abiertas y en proceso"
        />
        <StatCard
          label="Vencidas"
          value={overdueCount}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone={overdueCount > 0 ? "rose" : "emerald"}
          hint={
            overdueCount > 0
              ? "Requieren atención inmediata"
              : "Todas dentro del plazo"
          }
        />
        <StatCard
          label="Cerradas este mes"
          value={closedThisMonth}
          icon={<CalendarClock className="h-5 w-5" />}
          tone="emerald"
          hint="Intervenciones registradas en hoja de vida"
        />
      </div>

      {filteredEquipment ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-xs text-teal-800">
          <Filter className="h-3.5 w-3.5" />
          Mostrando órdenes de{" "}
          <span className="font-semibold">
            {filteredEquipment.code} · {filteredEquipment.name}
          </span>
          <Link
            href="/ordenes"
            className="ml-auto inline-flex items-center gap-1 font-semibold text-teal-700 hover:text-teal-900"
          >
            <X className="h-3.5 w-3.5" />
            Quitar filtro
          </Link>
        </div>
      ) : null}

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
        <form
          method="GET"
          className="flex flex-col gap-3 lg:flex-row lg:items-center"
        >
          {status ? <input type="hidden" name="estado" value={status} /> : null}
          {equipmentId > 0 ? (
            <input type="hidden" name="equipo" value={equipmentId} />
          ) : null}
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Buscar por código, equipo, responsable o descripción…"
              className={`${inputClass} pl-10`}
            />
          </div>
          <select
            name="tipo"
            defaultValue={type}
            className={`${selectClass} lg:w-48`}
            aria-label="Filtrar por tipo"
          >
            <option value="">Todos los tipos</option>
            <option value="preventivo">Preventivo</option>
            <option value="correctivo">Correctivo</option>
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
                href="/ordenes"
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
            {orders.length}{" "}
            {orders.length === 1 ? "orden encontrada" : "órdenes encontradas"}
          </p>
          <p className="text-[11px] text-slate-400">
            Ordenadas por fecha de apertura
          </p>
        </div>

        {orders.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-6 w-6" />}
            title="No hay órdenes que coincidan"
            description="Crea una nueva orden de trabajo o ajusta los filtros de búsqueda."
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
            <table className="w-full min-w-[940px] border-collapse">
              <thead className="bg-slate-50/80">
                <tr>
                  <Th>Orden</Th>
                  <Th>Equipo</Th>
                  <Th>Tipo</Th>
                  <Th>Prioridad</Th>
                  <Th>Responsable</Th>
                  <Th>Vence</Th>
                  <Th>Estado</Th>
                  <Th className="text-right">Detalle</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const orderStatus = orderStatusMeta(order.status);
                  const orderType = orderTypeMeta(order.type);
                  const priority = priorityMeta(order.priority);
                  const overdue =
                    ["abierta", "en_proceso"].includes(order.status) &&
                    order.dueDate &&
                    order.dueDate < now;
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
                        <p className="text-[11px] text-slate-400">
                          {formatShortDate(order.openedAt)}
                        </p>
                      </Td>
                      <Td>
                        <Link
                          href={`/equipos/${order.equipmentId}`}
                          className="group block"
                        >
                          <p className="max-w-[220px] truncate text-xs font-medium text-slate-700 group-hover:text-teal-700">
                            {order.equipment.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {order.equipment.code} · {order.equipment.location}
                          </p>
                        </Link>
                      </Td>
                      <Td>
                        <Badge tone={orderType.tone} dot>
                          {orderType.label}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge tone={priority.tone}>{priority.label}</Badge>
                      </Td>
                      <Td>
                        <span className="text-xs text-slate-600">
                          {order.responsible?.name ?? "Sin asignar"}
                        </span>
                      </Td>
                      <Td>
                        <p
                          className={`text-xs ${
                            overdue
                              ? "font-semibold text-rose-600"
                              : "text-slate-600"
                          }`}
                        >
                          {formatDate(order.dueDate)}
                        </p>
                        {order.dueDate &&
                        ["abierta", "en_proceso"].includes(order.status) ? (
                          <p
                            className={`text-[11px] ${
                              overdue ? "text-rose-500" : "text-slate-400"
                            }`}
                          >
                            {relativeDays(order.dueDate)}
                          </p>
                        ) : null}
                      </Td>
                      <Td>
                        <Badge tone={orderStatus.tone} dot>
                          {orderStatus.label}
                        </Badge>
                      </Td>
                      <Td className="text-right">
                        <Link
                          href={`/ordenes/${order.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-teal-50 hover:text-teal-600"
                          aria-label={`Ver ${order.code}`}
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
    </div>
  );
}
