import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Filter,
  Plus,
  Search,
  Stethoscope,
  X,
} from "lucide-react";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Td,
  Th,
  inputClass,
  selectClass,
} from "@/components/ui";
import { isStaff, requireUser } from "@/lib/auth";
import {
  criticalityMeta,
  equipmentStatusMeta,
  formatDate,
  relativeDays,
} from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Equipos biomédicos" };

type SearchParams = Promise<{
  q?: string;
  estado?: string;
  criticidad?: string;
}>;

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const status = params.estado ?? "";
  const criticality = params.criticidad ?? "";

  const where = {
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { code: { contains: q } },
            { serial: { contains: q } },
            { brand: { contains: q } },
            { model: { contains: q } },
            { location: { contains: q } },
          ],
        }
      : {}),
    ...(status ? { status } : {}),
    ...(criticality ? { criticality } : {}),
  };

  const [equipment, total, operativos, enMantenimiento, fueraServicio] =
    await Promise.all([
      prisma.equipment.findMany({
        where,
        include: {
          plan: true,
          _count: { select: { workOrders: true } },
        },
        orderBy: { code: "asc" },
      }),
      prisma.equipment.count(),
      prisma.equipment.count({ where: { status: "operativo" } }),
      prisma.equipment.count({ where: { status: "en_mantenimiento" } }),
      prisma.equipment.count({ where: { status: "fuera_servicio" } }),
    ]);

  const staff = isStaff(user);
  const hasFilters = Boolean(q || status || criticality);

  const tabs = [
    { label: "Todos", value: "", count: total },
    { label: "Operativos", value: "operativo", count: operativos },
    {
      label: "En mantenimiento",
      value: "en_mantenimiento",
      count: enMantenimiento,
    },
    { label: "Fuera de servicio", value: "fuera_servicio", count: fueraServicio },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Activos biomédicos"
        title="Equipos biomédicos"
        description="Inventario centralizado del parque tecnológico del hospital, con su estado operativo, criticidad y programación preventiva."
        actions={
          staff ? (
            <Link
              href="/equipos/nuevo"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800"
            >
              <Plus className="h-4 w-4" />
              Registrar equipo
            </Link>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {tabs.map((tab) => {
          const active = status === tab.value;
          const href = tab.value
            ? `/equipos?estado=${tab.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`
            : `/equipos${q ? `?q=${encodeURIComponent(q)}` : ""}`;
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
                  active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
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
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Buscar por código, nombre, serie, marca o ubicación…"
              className={`${inputClass} pl-10`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <select
              name="estado"
              defaultValue={status}
              className={`${selectClass} sm:w-48`}
              aria-label="Filtrar por estado"
            >
              <option value="">Todos los estados</option>
              <option value="operativo">Operativo</option>
              <option value="en_mantenimiento">En mantenimiento</option>
              <option value="fuera_servicio">Fuera de servicio</option>
            </select>
            <select
              name="criticidad"
              defaultValue={criticality}
              className={`${selectClass} sm:w-40`}
              aria-label="Filtrar por criticidad"
            >
              <option value="">Criticidad</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
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
                href="/equipos"
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
            {equipment.length}{" "}
            {equipment.length === 1 ? "equipo encontrado" : "equipos encontrados"}
          </p>
          <p className="text-[11px] text-slate-400">
            {hasFilters ? "Filtros aplicados" : "Ordenados por código interno"}
          </p>
        </div>

        {equipment.length === 0 ? (
          <EmptyState
            icon={<Stethoscope className="h-6 w-6" />}
            title="No hay equipos que coincidan"
            description="Ajusta los filtros o registra un nuevo equipo biomédico en el inventario."
            action={
              staff ? (
                <Link
                  href="/equipos/nuevo"
                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-navy-900 px-4 text-xs font-semibold text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Registrar equipo
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
                  <Th>Ubicación</Th>
                  <Th>Criticidad</Th>
                  <Th>Estado</Th>
                  <Th>Próximo preventivo</Th>
                  <Th className="text-center">Órdenes</Th>
                  <Th className="text-right">Detalle</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {equipment.map((item) => {
                  const itemStatus = equipmentStatusMeta(item.status);
                  const criticality = criticalityMeta(item.criticality);
                  const days = item.plan ? relativeDays(item.plan.nextDate) : null;
                  const overdue = item.plan
                    ? item.plan.nextDate < new Date()
                    : false;
                  return (
                    <tr key={item.id} className="transition hover:bg-slate-50/70">
                      <Td>
                        <Link
                          href={`/equipos/${item.id}`}
                          className="group flex items-center gap-3"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-teal-50 group-hover:text-teal-600">
                            <Stethoscope className="h-4 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-800 group-hover:text-teal-700">
                              {item.name}
                            </span>
                            <span className="block text-[11px] text-slate-400">
                              {item.code} · {item.brand ?? "Sin marca"}{" "}
                              {item.model ?? ""}
                            </span>
                          </span>
                        </Link>
                      </Td>
                      <Td>
                        <span className="text-xs text-slate-600">
                          {item.location}
                        </span>
                      </Td>
                      <Td>
                        <Badge tone={criticality.tone} dot>
                          {criticality.label}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge tone={itemStatus.tone} dot>
                          {itemStatus.label}
                        </Badge>
                      </Td>
                      <Td>
                        {item.plan ? (
                          <div>
                            <p className="text-xs font-medium text-slate-700">
                              {formatDate(item.plan.nextDate)}
                            </p>
                            <p
                              className={`text-[11px] ${
                                overdue
                                  ? "font-semibold text-rose-600"
                                  : "text-slate-400"
                              }`}
                            >
                              {days}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            Sin programar
                          </span>
                        )}
                      </Td>
                      <Td className="text-center">
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-600">
                          {item._count.workOrders}
                        </span>
                      </Td>
                      <Td className="text-right">
                        <Link
                          href={`/equipos/${item.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-teal-50 hover:text-teal-600"
                          aria-label={`Ver ${item.name}`}
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
