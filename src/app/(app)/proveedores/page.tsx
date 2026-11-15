import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  CalendarCheck,
  FileText,
  Mail,
  Phone,
  Plus,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  ProgressBar,
  StatCard,
} from "@/components/ui";
import { isStaff, requireUser } from "@/lib/auth";
import {
  formatCompactCop,
  formatCop,
  formatDate,
  relativeDays,
  supplierStatusMeta,
} from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Proveedores" };

export default async function SuppliersPage() {
  const user = await requireUser();
  const now = new Date();
  const in60Days = new Date(now.getTime() + 60 * 86_400_000);

  const suppliers = await prisma.supplier.findMany({
    include: {
      contracts: { orderBy: { endDate: "asc" } },
      _count: { select: { parts: true } },
    },
    orderBy: [{ performance: "desc" }, { name: "asc" }],
  });

  const staff = isStaff(user);
  const contracts = suppliers
    .flatMap((supplier) =>
      supplier.contracts.map((contract) => ({
        ...contract,
        supplierName: supplier.name,
      })),
    )
    .sort((a, b) => a.endDate.getTime() - b.endDate.getTime());
  const activeContracts = contracts.filter(
    (contract) => contract.endDate >= now,
  );
  const expiring = activeContracts.filter(
    (contract) => contract.endDate <= in60Days,
  );
  const totalValue = activeContracts.reduce(
    (sum, contract) => sum + contract.value,
    0,
  );
  const avgPerformance = suppliers.length
    ? Math.round(
        suppliers.reduce((sum, supplier) => sum + supplier.performance, 0) /
          suppliers.length,
      )
    : 0;

  return (
    <div>
      <PageHeader
        eyebrow="Cadena de abastecimiento"
        title="Proveedores"
        description="Directorio de proveedores biomédicos, contratos vigentes, SLA y desempeño del último periodo."
        actions={
          staff ? (
            <Link
              href="/proveedores/nuevo"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800"
            >
              <Plus className="h-4 w-4" />
              Nuevo proveedor
            </Link>
          ) : undefined
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Proveedores"
          value={suppliers.length}
          icon={<Building2 className="h-5 w-5" />}
          tone="sky"
          hint={`${suppliers.filter((supplier) => supplier.status === "aprobado").length} aprobados`}
        />
        <StatCard
          label="Desempeño promedio"
          value={`${avgPerformance}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone={avgPerformance >= 85 ? "emerald" : "amber"}
          hint="Evaluación del comité biomédico"
        />
        <StatCard
          label="Contratos vigentes"
          value={activeContracts.length}
          icon={<FileText className="h-5 w-5" />}
          tone="teal"
          hint={
            expiring.length > 0
              ? `${expiring.length} por vencer en 60 días`
              : "Sin contratos por vencer"
          }
        />
        <StatCard
          label="Valor contratado"
          value={formatCompactCop(totalValue)}
          icon={<Wallet className="h-5 w-5" />}
          tone="violet"
          hint="Contratos activos"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <CardHeader
            title="Desempeño de proveedores"
            description="Calificación explicable por cumplimiento, calidad y respuesta."
            action={
              <span className="text-[11px] text-slate-400">
                {suppliers.length} registrados
              </span>
            }
          />
          {suppliers.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-6 w-6" />}
              title="Sin proveedores registrados"
              description="Agrega el primer proveedor para hacer seguimiento a contratos y desempeño."
              action={
                staff ? (
                  <Link
                    href="/proveedores/nuevo"
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-navy-900 px-4 text-xs font-semibold text-white"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Nuevo proveedor
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {suppliers.map((supplier) => {
                const status = supplierStatusMeta(supplier.status);
                return (
                  <div key={supplier.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-white">
                        <Building2 className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800">
                            {supplier.name}
                          </p>
                          <Badge tone={status.tone} dot>
                            {status.label}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {supplier.specialty} · {supplier._count.parts}{" "}
                          {supplier._count.parts === 1 ? "referencia" : "referencias"}{" "}
                          · {supplier.contracts.length}{" "}
                          {supplier.contracts.length === 1
                            ? "contrato"
                            : "contratos"}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                          {supplier.contactName ? (
                            <span>{supplier.contactName}</span>
                          ) : null}
                          {supplier.phone ? (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {supplier.phone}
                            </span>
                          ) : null}
                          {supplier.email ? (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {supplier.email}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="w-full sm:w-44">
                        <div className="mb-1 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Desempeño</span>
                          <span className="font-semibold text-slate-700">
                            {supplier.performance}%
                          </span>
                        </div>
                        <ProgressBar
                          value={supplier.performance}
                          tone={
                            supplier.performance >= 85
                              ? "emerald"
                              : supplier.performance >= 70
                                ? "amber"
                                : "rose"
                          }
                        />
                      </div>
                    </div>
                    {supplier.notes ? (
                      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
                        {supplier.notes}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Contratos"
              description="Vigencia, valor y SLA comprometido."
            />
            {contracts.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <ShieldCheck className="mx-auto h-8 w-8 text-emerald-500" />
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  Sin contratos registrados
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Asocia un contrato al crear el proveedor.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {contracts.slice(0, 5).map((contract) => {
                  const days = relativeDays(contract.endDate);
                  const expired = contract.endDate < now;
                  return (
                    <div key={contract.id} className="px-5 py-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800">
                            {contract.code}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">
                            {contract.supplierName}
                          </p>
                        </div>
                        <Badge tone={expired ? "rose" : "emerald"} dot>
                          {expired ? "Vencido" : "Vigente"}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                        {contract.description}
                      </p>
                      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                        <div>
                          <dt className="uppercase tracking-wide text-slate-400">
                            Vigencia
                          </dt>
                          <dd className="font-medium text-slate-600">
                            {formatDate(contract.startDate)} —{" "}
                            {formatDate(contract.endDate)}
                          </dd>
                        </div>
                        <div>
                          <dt className="uppercase tracking-wide text-slate-400">
                            Valor
                          </dt>
                          <dd className="font-medium text-slate-600">
                            {formatCop(contract.value)}
                          </dd>
                        </div>
                        <div>
                          <dt className="uppercase tracking-wide text-slate-400">
                            SLA
                          </dt>
                          <dd className="font-medium text-slate-600">
                            {contract.slaHours} h
                          </dd>
                        </div>
                        <div>
                          <dt className="uppercase tracking-wide text-slate-400">
                            Vence
                          </dt>
                          <dd
                            className={`font-medium ${
                              expired
                                ? "text-rose-600"
                                : days === "Hoy"
                                  ? "text-amber-600"
                                  : "text-slate-600"
                            }`}
                          >
                            {days}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-teal-600" />
              <h2 className="text-sm font-semibold text-slate-900">
                Próximas revisiones
              </h2>
            </div>
            {contracts.filter((contract) => contract.nextReview).length === 0 ? (
              <p className="text-xs text-slate-500">
                Sin revisiones programadas.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {contracts
                  .filter((contract) => contract.nextReview)
                  .slice(0, 4)
                  .map((contract) => (
                    <li
                      key={contract.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold text-slate-700">
                          {contract.code} · {contract.supplierName}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {formatDate(contract.nextReview)}
                        </p>
                      </div>
                      <Badge
                        tone={
                          contract.nextReview &&
                          contract.nextReview < now
                            ? "rose"
                            : "slate"
                        }
                      >
                        {relativeDays(contract.nextReview)}
                      </Badge>
                    </li>
                  ))}
              </ul>
            )}
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[11px] font-medium text-emerald-700">
              <BadgeCheck className="h-4 w-4 shrink-0" />
              {expiring.length === 0
                ? "Sin contratos por vencer en 60 días"
                : `${expiring.length} ${expiring.length === 1 ? "contrato vence" : "contratos vencen"} en 60 días`}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
