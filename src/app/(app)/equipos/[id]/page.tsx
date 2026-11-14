import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  History,
  MapPin,
  Pencil,
  Plus,
  Stethoscope,
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
  criticalityMeta,
  equipmentStatusMeta,
  eventTypes,
  formatDate,
  orderStatusMeta,
  orderTypeMeta,
  relativeDays,
  daysUntil,
} from "@/lib/labels";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const equipment = await prisma.equipment.findUnique({
    where: { id: Number(id) },
    select: { name: true },
  });
  return { title: equipment?.name ?? "Equipo" };
}

export default async function EquipmentDetailPage({
  params,
}: {
  params: Params;
}) {
  const user = await requireUser();
  const { id } = await params;
  const equipmentId = Number(id);
  if (!Number.isInteger(equipmentId)) notFound();

  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    include: {
      plan: true,
      history: {
        include: { workOrder: { select: { id: true, code: true } } },
        orderBy: { date: "desc" },
      },
      workOrders: {
        include: { responsible: true },
        orderBy: { openedAt: "desc" },
      },
    },
  });

  if (!equipment) notFound();

  const staff = isStaff(user);
  const status = equipmentStatusMeta(equipment.status);
  const criticality = criticalityMeta(equipment.criticality);
  const openOrders = equipment.workOrders.filter((order) =>
    ["abierta", "en_proceso"].includes(order.status),
  );
  const closedOrders = equipment.workOrders.filter(
    (order) => order.status === "cerrada",
  );
  const planDays = equipment.plan ? daysUntil(equipment.plan.nextDate) : null;
  const overdue = planDays !== null && planDays < 0;
  const soon = planDays !== null && planDays >= 0 && planDays <= 7;
  const planProgress =
    equipment.plan && planDays !== null
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              ((equipment.plan.frequencyDays - Math.max(planDays, 0)) /
                equipment.plan.frequencyDays) *
                100,
            ),
          ),
        )
      : 0;

  return (
    <div>
      <Link
        href="/equipos"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-teal-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver al inventario
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy-900 text-teal-300 shadow-lg shadow-navy-900/15">
            <Stethoscope className="h-6 w-6" />
          </span>
          <div>
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <Badge tone="slate">{equipment.code}</Badge>
              <Badge tone={status.tone} dot>
                {status.label}
              </Badge>
              <Badge tone={criticality.tone} dot>
                Criticidad {criticality.label.toLowerCase()}
              </Badge>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {equipment.name}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {equipment.location}
              </span>
              <span>
                {equipment.brand ?? "Sin marca"}{" "}
                {equipment.model ? `· ${equipment.model}` : ""}
              </span>
              <span>Serie {equipment.serial}</span>
            </p>
          </div>
        </div>

        {staff ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/equipos/${equipment.id}/editar`}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
            <Link
              href={`/ordenes/nueva?equipo=${equipment.id}`}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800"
            >
              <Plus className="h-4 w-4" />
              Nueva orden
            </Link>
          </div>
        ) : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card>
            <CardHeader
              title="Información técnica"
              description="Datos de identificación y ubicación del activo."
            />
            <div className="grid gap-x-6 gap-y-5 px-5 py-5 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Código interno
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {equipment.code}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Marca
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {equipment.brand ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Modelo
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {equipment.model ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Número de serie
                </p>
                <p className="mt-1 font-mono text-sm font-medium text-slate-800">
                  {equipment.serial}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Fecha de adquisición
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {formatDate(equipment.acquisitionDate)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Registrado en VIGÍA
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {formatDate(equipment.createdAt)}
                </p>
              </div>
              {equipment.notes ? (
                <div className="sm:col-span-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Notas
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {equipment.notes}
                  </p>
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Hoja de vida"
              description={`${equipment.history.length} ${equipment.history.length === 1 ? "evento registrado" : "eventos registrados"} en la trazabilidad del equipo.`}
              action={
                staff ? (
                  <Link
                    href={`/ordenes/nueva?equipo=${equipment.id}`}
                    className="text-xs font-semibold text-teal-600 hover:text-teal-700"
                  >
                    Registrar intervención
                  </Link>
                ) : undefined
              }
            />
            {equipment.history.length === 0 ? (
              <EmptyState
                icon={<History className="h-6 w-6" />}
                title="Hoja de vida vacía"
                description="Las intervenciones cerradas y los registros del equipo aparecerán aquí."
              />
            ) : (
              <div className="px-5 py-5">
                <ol className="relative space-y-5 border-l border-slate-200 pl-5">
                  {equipment.history.map((event) => {
                    const isPreventive = event.eventType === "preventivo";
                    return (
                      <li key={event.id} className="relative">
                        <span
                          className={`absolute -left-[29px] flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white ${
                            isPreventive
                              ? "bg-teal-100 text-teal-600"
                              : event.eventType === "correctivo"
                                ? "bg-orange-100 text-orange-600"
                                : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {isPreventive ? (
                            <CalendarClock className="h-3 w-3" />
                          ) : event.eventType === "correctivo" ? (
                            <Wrench className="h-3 w-3" />
                          ) : (
                            <History className="h-3 w-3" />
                          )}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-semibold text-slate-800">
                            {eventTypes[event.eventType] ?? event.eventType}
                          </p>
                          {event.workOrder ? (
                            <Link
                              href={`/ordenes/${event.workOrder.id}`}
                              className="text-[10px] font-semibold text-teal-600 hover:underline"
                            >
                              {event.workOrder.code}
                            </Link>
                          ) : null}
                          <span className="text-[10px] text-slate-400">
                            {formatDate(event.date)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">
                          {event.description}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Plan preventivo
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Control de periodicidad
                </p>
              </div>
              <CalendarClock className="h-5 w-5 text-teal-500" />
            </div>

            {equipment.plan ? (
              <div>
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Próxima ejecución
                    </p>
                    <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                      {formatDate(equipment.plan.nextDate)}
                    </p>
                  </div>
                  <Badge
                    tone={overdue ? "rose" : soon ? "amber" : "emerald"}
                    dot
                  >
                    {relativeDays(equipment.plan.nextDate)}
                  </Badge>
                </div>
                <div className="mt-3">
                  <ProgressBar
                    value={planProgress}
                    tone={overdue ? "rose" : soon ? "amber" : "teal"}
                  />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-slate-400">
                      Frecuencia
                    </dt>
                    <dd className="mt-0.5 text-sm font-semibold text-slate-800">
                      Cada {equipment.plan.frequencyDays} días
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-slate-400">
                      Última ejecución
                    </dt>
                    <dd className="mt-0.5 text-sm font-semibold text-slate-800">
                      {formatDate(equipment.plan.lastDate)}
                    </dd>
                  </div>
                </dl>
                {equipment.plan.notes ? (
                  <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
                    {equipment.plan.notes}
                  </p>
                ) : null}
                {staff ? (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link
                      href={`/preventivos/${equipment.plan.id}/editar`}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar plan
                    </Link>
                    <Link
                      href={`/ordenes/nueva?equipo=${equipment.id}&tipo=preventivo`}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-teal-600 text-xs font-semibold text-white transition hover:bg-teal-700"
                    >
                      <ClipboardList className="h-3.5 w-3.5" />
                      Crear orden
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-5 text-center">
                <p className="text-xs font-medium text-slate-600">
                  Este equipo aún no tiene un plan preventivo.
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Programa la periodicidad para anticipar fallas.
                </p>
                {staff ? (
                  <Link
                    href={`/preventivos/nuevo?equipo=${equipment.id}`}
                    className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl bg-navy-900 px-3.5 text-xs font-semibold text-white transition hover:bg-navy-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Programar preventivo
                  </Link>
                ) : null}
              </div>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Intervenciones
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {closedOrders.length}
              </p>
              <p className="text-[11px] text-slate-400">órdenes cerradas</p>
            </Card>
            <Card className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Órdenes activas
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {openOrders.length}
              </p>
              <p className="text-[11px] text-slate-400">en seguimiento</p>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Órdenes de trabajo"
              description="Historial de intervenciones asociadas."
              action={
                <Link
                  href={`/ordenes?equipo=${equipment.id}`}
                  className="text-xs font-semibold text-teal-600 hover:text-teal-700"
                >
                  Ver todas
                </Link>
              }
            />
            {equipment.workOrders.length === 0 ? (
              <EmptyState
                title="Sin órdenes asociadas"
                description="Crea una orden para registrar una intervención."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {equipment.workOrders.slice(0, 5).map((order) => {
                  const orderStatus = orderStatusMeta(order.status);
                  const orderType = orderTypeMeta(order.type);
                  return (
                    <Link
                      key={order.id}
                      href={`/ordenes/${order.id}`}
                      className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50/70"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-slate-800">
                            {order.code}
                          </p>
                          <Badge tone={orderType.tone}>{orderType.label}</Badge>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-slate-400">
                          {order.responsible?.name ?? "Sin asignar"} ·{" "}
                          {formatDate(order.openedAt)}
                        </p>
                      </div>
                      <Badge tone={orderStatus.tone} dot>
                        {orderStatus.label}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
