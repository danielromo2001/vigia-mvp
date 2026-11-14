import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  MapPin,
  Play,
  Stethoscope,
  UserRound,
  Wrench,
} from "lucide-react";
import {
  cancelWorkOrder,
  reassignWorkOrder,
  startWorkOrder,
} from "@/app/actions/work-orders";
import { CloseOrderForm } from "@/components/forms/close-order-form";
import { ConfirmButton } from "@/components/confirm-button";
import { SubmitButton } from "@/components/submit-button";
import {
  Badge,
  Card,
  CardHeader,
  selectClass,
} from "@/components/ui";
import { isStaff, requireUser } from "@/lib/auth";
import {
  criticalityMeta,
  equipmentStatusMeta,
  formatDateTime,
  orderStatusMeta,
  orderTypeMeta,
  priorityMeta,
  relativeDays,
} from "@/lib/labels";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const order = await prisma.workOrder.findUnique({
    where: { id: Number(id) },
    select: { code: true },
  });
  return { title: order?.code ?? "Orden de trabajo" };
}

const steps = [
  { key: "abierta", label: "Abierta", description: "Registrada" },
  { key: "en_proceso", label: "En proceso", description: "En ejecución" },
  { key: "cerrada", label: "Cerrada", description: "En hoja de vida" },
];

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Params;
}) {
  const user = await requireUser();
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();

  const [order, users] = await Promise.all([
    prisma.workOrder.findUnique({
      where: { id: orderId },
      include: {
        equipment: { include: { plan: true } },
        responsible: true,
        log: true,
      },
    }),
    prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!order) notFound();

  const staff = isStaff(user);
  const status = orderStatusMeta(order.status);
  const type = orderTypeMeta(order.type);
  const priority = priorityMeta(order.priority);
  const equipmentStatus = equipmentStatusMeta(order.equipment.status);
  const criticality = criticalityMeta(order.equipment.criticality);
  const overdue =
    ["abierta", "en_proceso"].includes(order.status) &&
    order.dueDate &&
    order.dueDate < new Date();
  const stepIndex = steps.findIndex((step) => step.key === order.status);
  const isActive = ["abierta", "en_proceso"].includes(order.status);

  return (
    <div>
      <Link
        href="/ordenes"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-teal-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a las órdenes
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Badge tone="slate">{order.code}</Badge>
            <Badge tone={status.tone} dot>
              {status.label}
            </Badge>
            <Badge tone={type.tone} dot>
              {type.label}
            </Badge>
            <Badge tone={priority.tone}>{priority.label}</Badge>
            {overdue ? (
              <Badge tone="rose" dot>
                Vencida
              </Badge>
            ) : null}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {order.equipment.name}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Stethoscope className="h-3.5 w-3.5 text-slate-400" />
              {order.equipment.code}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {order.equipment.location}
            </span>
            <span className="inline-flex items-center gap-1">
              <UserRound className="h-3.5 w-3.5 text-slate-400" />
              {order.responsible?.name ?? "Sin asignar"}
            </span>
          </p>
        </div>

        <Link
          href={`/equipos/${order.equipmentId}`}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
        >
          <Stethoscope className="h-4 w-4" />
          Ver hoja de vida
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card className="p-5">
            <div className="relative flex items-start justify-between gap-2">
              {steps.map((step, index) => {
                const completed = stepIndex >= index && stepIndex !== -1;
                const current = stepIndex === index;
                return (
                  <div key={step.key} className="relative flex flex-1 flex-col items-center text-center">
                    {index < steps.length - 1 ? (
                      <span
                        className={`absolute left-1/2 top-4 h-0.5 w-full ${
                          stepIndex > index ? "bg-teal-500" : "bg-slate-200"
                        }`}
                      />
                    ) : null}
                    <span
                      className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                        completed
                          ? "border-teal-500 bg-teal-500 text-white"
                          : "border-slate-200 bg-white text-slate-300"
                      }`}
                    >
                      {index === 0 ? (
                        <ClipboardList className="h-4 w-4" />
                      ) : index === 1 ? (
                        <Wrench className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </span>
                    <span
                      className={`mt-2 text-[11px] font-semibold ${
                        current ? "text-teal-700" : "text-slate-600"
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {step.description}
                    </span>
                  </div>
                );
              })}
            </div>
            {order.status === "cancelada" ? (
              <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-medium text-slate-500">
                Esta orden fue cancelada y no genera registro en la hoja de vida.
              </p>
            ) : null}
          </Card>

          <Card>
            <CardHeader
              title="Detalle de la orden"
              description={`Apertura: ${formatDateTime(order.openedAt)}`}
            />
            <div className="px-5 py-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Descripción de la intervención
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                  {order.description}
                </p>
              </div>
              <div className="mt-5 border-t border-slate-100 pt-5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Observaciones
                </p>
                {order.observations ? (
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                    {order.observations}
                  </p>
                ) : (
                  <p className="mt-1.5 text-sm italic text-slate-400">
                    Aún no se registran observaciones de cierre.
                  </p>
                )}
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-4">
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-slate-400">
                    Tipo
                  </dt>
                  <dd className="mt-1 text-xs font-semibold text-slate-700">
                    {type.label}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-slate-400">
                    Prioridad
                  </dt>
                  <dd className="mt-1 text-xs font-semibold text-slate-700">
                    {priority.label}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-slate-400">
                    Apertura
                  </dt>
                  <dd className="mt-1 text-xs font-semibold text-slate-700">
                    {formatDateTime(order.openedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-slate-400">
                    Cierre
                  </dt>
                  <dd className="mt-1 text-xs font-semibold text-slate-700">
                    {formatDateTime(order.closedAt)}
                  </dd>
                </div>
              </dl>
            </div>
          </Card>

          {staff && isActive ? (
            <Card>
              <CardHeader
                title={
                  order.status === "abierta"
                    ? "Iniciar intervención"
                    : "Cerrar la orden"
                }
                description={
                  order.status === "abierta"
                    ? "Marca la orden en proceso cuando el técnico comience el trabajo en el equipo."
                    : "Registra el resultado. Al cerrar, la intervención pasa automáticamente a la hoja de vida y se reprograma el preventivo si aplica."
                }
              />
              <div className="px-5 py-5">
                {order.status === "abierta" ? (
                  <form action={startWorkOrder} className="space-y-3">
                    <input type="hidden" name="id" value={order.id} />
                    <div className="flex items-start gap-3 rounded-xl bg-sky-50 px-4 py-3 text-xs text-sky-800">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>
                        El equipo cambiará a estado{" "}
                        <span className="font-semibold">en mantenimiento</span>{" "}
                        y la orden quedará asignada a{" "}
                        {order.responsible?.name ?? user.name}.
                      </p>
                    </div>
                    <SubmitButton
                      icon={<Play className="h-4 w-4" />}
                      pendingLabel="Iniciando…"
                      className="w-full bg-sky-600 hover:bg-sky-700"
                    >
                      Iniciar intervención
                    </SubmitButton>
                  </form>
                ) : (
                  <CloseOrderForm orderId={order.id} />
                )}
              </div>
            </Card>
          ) : null}

          {order.status === "cerrada" ? (
            <Card className="border-emerald-200 bg-emerald-50/40 p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    Intervención cerrada y registrada
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                    La orden se cerró el {formatDateTime(order.closedAt)} y el
                    evento quedó en la hoja de vida del equipo.{" "}
                    {order.type === "preventivo" && order.equipment.plan
                      ? "El plan preventivo fue reprogramado automáticamente."
                      : null}
                  </p>
                  {order.log ? (
                    <Link
                      href={`/equipos/${order.equipmentId}`}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      Ver registro en la hoja de vida
                    </Link>
                  ) : null}
                </div>
              </div>
            </Card>
          ) : null}

          {order.status === "cancelada" ? (
            <Card className="border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-500">
                  <Ban className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Orden cancelada
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {order.observations ?? "Sin observaciones registradas."}
                  </p>
                </div>
              </div>
            </Card>
          ) : null}
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Equipo asociado" />
            <div className="px-5 py-4">
              <Link
                href={`/equipos/${order.equipmentId}`}
                className="group flex items-center gap-3"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-teal-50 group-hover:text-teal-600">
                  <Stethoscope className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-800 group-hover:text-teal-700">
                    {order.equipment.name}
                  </span>
                  <span className="block text-[11px] text-slate-400">
                    {order.equipment.code} · {order.equipment.serial}
                  </span>
                </span>
              </Link>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone={equipmentStatus.tone} dot>
                  {equipmentStatus.label}
                </Badge>
                <Badge tone={criticality.tone}>
                  Criticidad {criticality.label.toLowerCase()}
                </Badge>
              </div>
              <dl className="mt-4 space-y-2.5 border-t border-slate-100 pt-4 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-slate-400">Ubicación</dt>
                  <dd className="font-medium text-slate-700">
                    {order.equipment.location}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-slate-400">Marca / modelo</dt>
                  <dd className="text-right font-medium text-slate-700">
                    {order.equipment.brand ?? "—"}{" "}
                    {order.equipment.model ?? ""}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-slate-400">Plan preventivo</dt>
                  <dd className="font-medium text-slate-700">
                    {order.equipment.plan
                      ? `Cada ${order.equipment.plan.frequencyDays} días`
                      : "Sin plan"}
                  </dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card>
            <CardHeader title="Programación" />
            <div className="space-y-3 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  Fecha estimada
                </span>
                <span
                  className={`text-xs font-semibold ${
                    overdue ? "text-rose-600" : "text-slate-700"
                  }`}
                >
                  {order.dueDate ? formatDateTime(order.dueDate) : "Sin fecha"}
                </span>
              </div>
              {order.dueDate && isActive ? (
                <div
                  className={`flex items-start gap-2 rounded-lg px-3 py-2 text-[11px] ${
                    overdue
                      ? "bg-rose-50 text-rose-700"
                      : "bg-slate-50 text-slate-500"
                  }`}
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    {overdue
                      ? `Vencida ${relativeDays(order.dueDate).toLowerCase()}. Requiere atención.`
                      : `Plazo: ${relativeDays(order.dueDate).toLowerCase()}.`}
                  </span>
                </div>
              ) : null}
            </div>
          </Card>

          {staff ? (
            <Card>
              <CardHeader
                title="Asignación"
                description="Responsable actual de la orden."
              />
              <div className="px-5 py-4">
                <form action={reassignWorkOrder} className="space-y-3">
                  <input type="hidden" name="id" value={order.id} />
                  <select
                    name="responsibleId"
                    defaultValue={order.responsibleId ?? ""}
                    className={selectClass}
                    aria-label="Responsable de la orden"
                  >
                    <option value="">Sin asignar</option>
                    {users.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="inline-flex h-9 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Actualizar responsable
                  </button>
                </form>

                {isActive ? (
                  <details className="mt-4 border-t border-slate-100 pt-4">
                    <summary className="cursor-pointer text-[11px] font-semibold text-slate-400 hover:text-rose-600">
                      Cancelar esta orden
                    </summary>
                    <form action={cancelWorkOrder} className="mt-3 space-y-2">
                      <input type="hidden" name="id" value={order.id} />
                      <textarea
                        name="reason"
                        rows={2}
                        placeholder="Motivo de cancelación (opcional)"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/10"
                      />
                      <ConfirmButton
                        message="¿Confirmas que deseas cancelar esta orden? Esta acción no se puede deshacer."
                        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                      >
                        <Ban className="h-3.5 w-3.5" />
                        Confirmar cancelación
                      </ConfirmButton>
                    </form>
                  </details>
                ) : null}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
