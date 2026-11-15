import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownUp,
  Boxes,
  ClipboardCheck,
  PackagePlus,
  Plus,
  Search,
  Wallet,
  X,
} from "lucide-react";
import { requestRestock } from "@/app/actions/spare-parts";
import { PartMovementDialog } from "@/components/part-movement-dialog";
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
  selectClass,
} from "@/components/ui";
import { isStaff, requireUser } from "@/lib/auth";
import {
  formatCompactCop,
  formatCop,
  formatDate,
  formatShortDate,
  partMovementMeta,
  sparePartCategories,
  stockLevel,
} from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Repuestos" };

type SearchParams = Promise<{
  q?: string;
  categoria?: string;
  estado?: string;
}>;

export default async function SparePartsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const category = params.categoria ?? "";
  const state = params.estado ?? "";

  const [allParts, movements, openOrders] = await Promise.all([
    prisma.sparePart.findMany({
      where: { active: true },
      include: { supplier: true },
      orderBy: { code: "asc" },
    }),
    prisma.partMovement.findMany({
      include: {
        part: true,
        workOrder: { select: { id: true, code: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.workOrder.findMany({
      where: { status: { in: ["abierta", "en_proceso"] } },
      include: { equipment: { select: { name: true } } },
      orderBy: { openedAt: "desc" },
      take: 20,
    }),
  ]);

  const staff = isStaff(user);

  const totalValue = allParts.reduce(
    (sum, part) => sum + part.unitCost * part.stock,
    0,
  );
  const lowParts = allParts.filter((part) => part.stock < part.minStock);
  const outOfStock = allParts.filter((part) => part.stock <= 0);
  const pendingRequests = movements.filter(
    (movement) => movement.type === "solicitud",
  ).length;

  const filtered = allParts.filter((part) => {
    if (category && part.category !== category) return false;
    if (state === "bajo" && part.stock >= part.minStock) return false;
    if (state === "agotado" && part.stock > 0) return false;
    if (state === "adecuado" && part.stock < part.minStock) return false;
    if (q) {
      const haystack = `${part.code} ${part.name} ${part.location} ${
        part.supplier?.name ?? ""
      }`.toLowerCase();
      if (!haystack.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const orderOptions = openOrders.map((order) => ({
    id: order.id,
    code: order.code,
    equipment: order.equipment.name,
  }));

  const tabs = [
    { label: "Todas", value: "", count: allParts.length },
    { label: "Bajo mínimo", value: "bajo", count: lowParts.length },
    { label: "Agotadas", value: "agotado", count: outOfStock.length },
    {
      label: "Adecuadas",
      value: "adecuado",
      count: allParts.length - lowParts.length,
    },
  ];

  function tabHref(value: string) {
    const search = new URLSearchParams();
    if (value) search.set("estado", value);
    if (category) search.set("categoria", category);
    if (q) search.set("q", q);
    const query = search.toString();
    return `/repuestos${query ? `?${query}` : ""}`;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Almacén biomédico"
        title="Inventario de repuestos"
        description="Referencias, existencias y movimientos del almacén. Controla los mínimos para evitar paradas por falta de consumibles."
        actions={
          staff ? (
            <>
              <PartMovementDialog
                parts={allParts.map((part) => ({
                  id: part.id,
                  code: part.code,
                  name: part.name,
                  unit: part.unit,
                  stock: part.stock,
                }))}
                orders={orderOptions}
              />
              <Link
                href="/repuestos/nuevo"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800"
              >
                <Plus className="h-4 w-4" />
                Nuevo repuesto
              </Link>
            </>
          ) : undefined
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Referencias activas"
          value={allParts.length}
          icon={<Boxes className="h-5 w-5" />}
          tone="sky"
          hint={`${sparePartCategories.length} categorías configuradas`}
        />
        <StatCard
          label="Valor del inventario"
          value={formatCompactCop(totalValue)}
          icon={<Wallet className="h-5 w-5" />}
          tone="teal"
          hint="Costo de las existencias actuales"
        />
        <StatCard
          label="Bajo mínimo"
          value={lowParts.length}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone={lowParts.length > 0 ? "amber" : "emerald"}
          hint={
            outOfStock.length > 0
              ? `${outOfStock.length} referencias agotadas`
              : "Sin referencias agotadas"
          }
        />
        <StatCard
          label="Solicitudes recientes"
          value={pendingRequests}
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone="violet"
          hint="Movimientos de compra registrados"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {tabs.map((tab) => {
          const active = state === tab.value;
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
          {state ? <input type="hidden" name="estado" value={state} /> : null}
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Buscar por código, nombre, ubicación o proveedor…"
              className={`${inputClass} pl-10`}
            />
          </div>
          <select
            name="categoria"
            defaultValue={category}
            className={`${selectClass} lg:w-52`}
            aria-label="Filtrar por categoría"
          >
            <option value="">Todas las categorías</option>
            {sparePartCategories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white transition hover:bg-teal-700 lg:flex-none"
            >
              <Search className="h-4 w-4" />
              Filtrar
            </button>
            {q || category || state ? (
              <Link
                href="/repuestos"
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
            {filtered.length}{" "}
            {filtered.length === 1 ? "referencia encontrada" : "referencias encontradas"}
          </p>
          <p className="text-[11px] text-slate-400">
            Stock actual vs. mínimo definido
          </p>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Boxes className="h-6 w-6" />}
            title="No hay repuestos que coincidan"
            description="Ajusta los filtros o registra una nueva referencia en el almacén."
            action={
              staff ? (
                <Link
                  href="/repuestos/nuevo"
                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-navy-900 px-4 text-xs font-semibold text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nuevo repuesto
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse">
              <thead className="bg-slate-50/80">
                <tr>
                  <Th>Repuesto</Th>
                  <Th>Ubicación</Th>
                  <Th>Stock</Th>
                  <Th>Nivel</Th>
                  <Th>Estado</Th>
                  <Th>Proveedor</Th>
                  <Th className="text-right">Costo unitario</Th>
                  {staff ? <Th className="text-right">Acción</Th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((part) => {
                  const level = stockLevel(part.stock, part.minStock);
                  const categoryLabel =
                    sparePartCategories.find(
                      (item) => item.value === part.category,
                    )?.label ?? part.category;
                  return (
                    <tr key={part.id} className="transition hover:bg-slate-50/70">
                      <Td>
                        <p className="text-sm font-semibold text-slate-800">
                          {part.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {part.code} · {categoryLabel}
                        </p>
                      </Td>
                      <Td>
                        <span className="text-xs text-slate-600">
                          {part.location}
                        </span>
                      </Td>
                      <Td>
                        <p className="text-sm font-semibold text-slate-800">
                          {part.stock}{" "}
                          <span className="text-[11px] font-normal text-slate-400">
                            {part.unit}
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Mínimo {part.minStock}
                        </p>
                      </Td>
                      <Td>
                        <div className="w-24">
                          <ProgressBar value={level.ratio} tone={level.tone} />
                          <p className="mt-1 text-[10px] text-slate-400">
                            {level.ratio}% del mínimo
                          </p>
                        </div>
                      </Td>
                      <Td>
                        <Badge tone={level.tone} dot>
                          {level.label}
                        </Badge>
                      </Td>
                      <Td>
                        <span className="text-xs text-slate-600">
                          {part.supplier?.name ?? "Sin proveedor"}
                        </span>
                      </Td>
                      <Td className="text-right">
                        <span className="text-xs font-semibold text-slate-700">
                          {formatCop(part.unitCost)}
                        </span>
                      </Td>
                      {staff ? (
                        <Td className="text-right">
                          <PartMovementDialog
                            parts={[
                              {
                                id: part.id,
                                code: part.code,
                                name: part.name,
                                unit: part.unit,
                                stock: part.stock,
                              },
                            ]}
                            orders={orderOptions}
                            fixedPartId={part.id}
                            label="Mover"
                          />
                        </Td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader
            title="Reposición prioritaria"
            description="Referencias por debajo del mínimo definido."
          />
          {lowParts.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <ClipboardCheck className="mx-auto h-8 w-8 text-emerald-500" />
              <p className="mt-2 text-sm font-semibold text-slate-800">
                Inventario saludable
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Todas las referencias están sobre el mínimo.
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100">
                {lowParts.slice(0, 6).map((part) => {
                  const level = stockLevel(part.stock, part.minStock);
                  return (
                    <div key={part.id} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold text-slate-800">
                          {part.name}
                        </p>
                        <Badge tone={level.tone}>{level.deficit} faltan</Badge>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {part.code} · {part.supplier?.name ?? "Sin proveedor"}
                      </p>
                      <div className="mt-1.5">
                        <ProgressBar value={level.ratio} tone={level.tone} />
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {part.stock} de {part.minStock} {part.unit} ·{" "}
                        {formatCop(part.unitCost * Math.max(1, level.deficit))} para
                        reponer
                      </p>
                    </div>
                  );
                })}
              </div>
              {staff ? (
                <div className="border-t border-slate-100 p-4">
                  <form action={requestRestock}>
                    <button
                      type="submit"
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-navy-900 text-sm font-semibold text-white transition hover:bg-navy-800"
                    >
                      <PackagePlus className="h-4 w-4" />
                      Generar solicitud de reposición
                    </button>
                  </form>
                  <p className="mt-2 text-center text-[10px] text-slate-400">
                    Crea un movimiento de solicitud por cada referencia bajo mínimo.
                  </p>
                </div>
              ) : null}
            </>
          )}
        </Card>

        <Card className="overflow-hidden xl:col-span-2">
          <CardHeader
            title="Movimientos recientes"
            description="Trazabilidad de entradas, salidas, ajustes y solicitudes."
            action={
              <ArrowDownUp className="h-4 w-4 text-slate-300" />
            }
          />
          {movements.length === 0 ? (
            <EmptyState
              icon={<ArrowDownUp className="h-6 w-6" />}
              title="Sin movimientos registrados"
              description="Los movimientos de inventario aparecerán aquí."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {movements.map((movement) => {
                const meta = partMovementMeta(movement.type);
                return (
                  <div
                    key={movement.id}
                    className="flex flex-wrap items-center gap-3 px-5 py-3"
                  >
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-800">
                        {movement.part.code} · {movement.part.name}
                      </p>
                      <p className="truncate text-[11px] text-slate-400">
                        {movement.reason ?? "Sin observaciones"}
                        {movement.workOrder
                          ? ` · ${movement.workOrder.code}`
                          : ""}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        movement.quantity < 0
                          ? "text-rose-600"
                          : movement.type === "solicitud"
                            ? "text-violet-600"
                            : "text-emerald-600"
                      }`}
                    >
                      {movement.quantity > 0 ? "+" : ""}
                      {movement.quantity}
                    </span>
                    <span className="w-24 text-right text-[10px] text-slate-400">
                      {formatShortDate(movement.createdAt)}
                    </span>
                    <span className="hidden w-32 truncate text-right text-[10px] text-slate-400 sm:block">
                      {movement.user?.name ?? "Sistema"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <p className="mt-4 text-right text-[10px] text-slate-400">
        Última actualización: {formatDate(new Date())}
      </p>
    </div>
  );
}
