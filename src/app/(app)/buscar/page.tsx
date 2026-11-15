import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Building2,
  ClipboardList,
  MessageSquareWarning,
  Search,
  Stethoscope,
} from "lucide-react";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import {
  equipmentStatusMeta,
  formatCompactCop,
  orderStatusMeta,
  orderTypeMeta,
  reportStatusMeta,
  supplierStatusMeta,
} from "@/lib/labels";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Buscar" };

type SearchParams = Promise<{ q?: string }>;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireUser();
  const params = await searchParams;
  const q = (params.q ?? "").trim();

  const term = q;
  const [equipment, orders, reports, parts, suppliers] = term
    ? await Promise.all([
        prisma.equipment.findMany({
          where: {
            OR: [
              { name: { contains: term } },
              { code: { contains: term } },
              { serial: { contains: term } },
              { brand: { contains: term } },
              { model: { contains: term } },
              { location: { contains: term } },
            ],
          },
          orderBy: { code: "asc" },
          take: 8,
        }),
        prisma.workOrder.findMany({
          where: {
            OR: [
              { code: { contains: term } },
              { description: { contains: term } },
              { equipment: { name: { contains: term } } },
              { equipment: { code: { contains: term } } },
            ],
          },
          include: { equipment: true },
          orderBy: { openedAt: "desc" },
          take: 8,
        }),
        prisma.failureReport.findMany({
          where: {
            OR: [
              { code: { contains: term } },
              { description: { contains: term } },
              { equipment: { name: { contains: term } } },
            ],
          },
          include: { equipment: true },
          orderBy: { createdAt: "desc" },
          take: 6,
        }),
        prisma.sparePart.findMany({
          where: {
            OR: [
              { name: { contains: term } },
              { code: { contains: term } },
              { location: { contains: term } },
            ],
          },
          include: { supplier: true },
          orderBy: { code: "asc" },
          take: 8,
        }),
        prisma.supplier.findMany({
          where: {
            OR: [
              { name: { contains: term } },
              { specialty: { contains: term } },
              { contactName: { contains: term } },
            ],
          },
          orderBy: { name: "asc" },
          take: 6,
        }),
      ])
    : [[], [], [], [], []];

  const total =
    equipment.length + orders.length + reports.length + parts.length + suppliers.length;

  return (
    <div>
      <PageHeader
        eyebrow="Búsqueda global"
        title={q ? `Resultados para “${q}”` : "Buscar en VIGÍA"}
        description={
          q
            ? `${total} ${total === 1 ? "coincidencia encontrada" : "coincidencias encontradas"} en activos, órdenes, reportes, repuestos y proveedores.`
            : "Encuentra activos, órdenes, reportes, repuestos y proveedores desde un solo lugar. Usa Ctrl+K desde cualquier pantalla."
        }
      />

      <Card className="mb-6 p-4">
        <form method="GET" className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              autoFocus
              placeholder="Código, nombre, serie, ubicación, proveedor…"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-navy-900 px-5 text-sm font-semibold text-white transition hover:bg-navy-800"
          >
            <Search className="h-4 w-4" />
            Buscar
          </button>
        </form>
      </Card>

      {!q ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { href: "/equipos", label: "Activos", icon: Stethoscope },
            { href: "/ordenes", label: "Órdenes", icon: ClipboardList },
            { href: "/preventivos", label: "Mantenimientos", icon: ClipboardList },
            { href: "/repuestos", label: "Repuestos", icon: Boxes },
            { href: "/proveedores", label: "Proveedores", icon: Building2 },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:border-teal-200 hover:shadow-md"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-teal-50 group-hover:text-teal-600">
                <item.icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold text-slate-800">
                {item.label}
              </span>
              <ArrowRight className="ml-auto h-4 w-4 text-slate-300" />
            </Link>
          ))}
        </div>
      ) : total === 0 ? (
        <Card>
          <EmptyState
            icon={<Search className="h-6 w-6" />}
            title="Sin coincidencias"
            description="Prueba con otro código, nombre de equipo, número de serie o proveedor."
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {equipment.length > 0 ? (
            <Card className="overflow-hidden">
              <GroupHeader icon={<Stethoscope className="h-4 w-4" />} title="Activos" count={equipment.length} href="/equipos" />
              <div className="divide-y divide-slate-100">
                {equipment.map((item) => {
                  const status = equipmentStatusMeta(item.status);
                  return (
                    <Link
                      key={item.id}
                      href={`/equipos/${item.id}`}
                      className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50/70"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {item.code} · {item.location} ·{" "}
                          {item.brand ?? "Sin marca"}
                        </p>
                      </div>
                      <Badge tone={status.tone} dot>
                        {status.label}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            </Card>
          ) : null}

          {orders.length > 0 ? (
            <Card className="overflow-hidden">
              <GroupHeader icon={<ClipboardList className="h-4 w-4" />} title="Órdenes de trabajo" count={orders.length} href="/ordenes" />
              <div className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const status = orderStatusMeta(order.status);
                  const type = orderTypeMeta(order.type);
                  return (
                    <Link
                      key={order.id}
                      href={`/ordenes/${order.id}`}
                      className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50/70"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {order.code} · {order.equipment.name}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">
                          {order.description}
                        </p>
                      </div>
                      <Badge tone={type.tone}>{type.label}</Badge>
                      <Badge tone={status.tone} dot>
                        {status.label}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            </Card>
          ) : null}

          {reports.length > 0 ? (
            <Card className="overflow-hidden">
              <GroupHeader icon={<MessageSquareWarning className="h-4 w-4" />} title="Reportes de falla" count={reports.length} href="/reportes-falla" />
              <div className="divide-y divide-slate-100">
                {reports.map((report) => {
                  const status = reportStatusMeta(report.status);
                  return (
                    <Link
                      key={report.id}
                      href={`/reportes-falla/${report.id}`}
                      className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50/70"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {report.code} · {report.equipment.name}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">
                          {report.description}
                        </p>
                      </div>
                      <Badge tone={status.tone} dot>
                        {status.label}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            </Card>
          ) : null}

          {parts.length > 0 ? (
            <Card className="overflow-hidden">
              <GroupHeader icon={<Boxes className="h-4 w-4" />} title="Repuestos" count={parts.length} href="/repuestos" />
              <div className="divide-y divide-slate-100">
                {parts.map((part) => (
                  <Link
                    key={part.id}
                    href="/repuestos"
                    className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50/70"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {part.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {part.code} · {part.location} ·{" "}
                        {part.supplier?.name ?? "Sin proveedor"}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">
                      {part.stock} / {part.minStock} {part.unit}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      {formatCompactCop(part.unitCost * part.stock)}
                    </span>
                  </Link>
                ))}
              </div>
            </Card>
          ) : null}

          {suppliers.length > 0 ? (
            <Card className="overflow-hidden">
              <GroupHeader icon={<Building2 className="h-4 w-4" />} title="Proveedores" count={suppliers.length} href="/proveedores" />
              <div className="divide-y divide-slate-100">
                {suppliers.map((supplier) => {
                  const status = supplierStatusMeta(supplier.status);
                  return (
                    <Link
                      key={supplier.id}
                      href="/proveedores"
                      className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50/70"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {supplier.name}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">
                          {supplier.specialty}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-slate-700">
                        {supplier.performance}%
                      </span>
                      <Badge tone={status.tone} dot>
                        {status.label}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}

function GroupHeader({
  icon,
  title,
  count,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  href: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
      <p className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
        <span className="text-slate-400">{icon}</span>
        {title}
        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
          {count}
        </span>
      </p>
      <Link
        href={href}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-700"
      >
        Ver módulo
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
