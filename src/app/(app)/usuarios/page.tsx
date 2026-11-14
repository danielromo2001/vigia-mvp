import type { Metadata } from "next";
import Link from "next/link";
import {
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  Avatar,
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
import { requireRoles } from "@/lib/auth";
import { formatDate } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { toggleUser } from "@/app/actions/users";
import { ConfirmButton } from "@/components/confirm-button";

export const metadata: Metadata = { title: "Usuarios y roles" };

type SearchParams = Promise<{ q?: string; rol?: string; error?: string }>;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const current = await requireRoles("administrador");
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const roleName = params.rol ?? "";

  const where = {
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : {}),
    ...(roleName ? { role: { name: roleName } } : {}),
  };

  const [users, roles, total, active, workOrders] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { role: true, _count: { select: { workOrders: true } } },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    prisma.role.findMany({ orderBy: { id: "asc" } }),
    prisma.user.count(),
    prisma.user.count({ where: { active: true } }),
    prisma.workOrder.count(),
  ]);

  const hasFilters = Boolean(q || roleName);

  return (
    <div>
      <PageHeader
        eyebrow="Administración del sistema"
        title="Usuarios y roles"
        description="Gestiona las cuentas del personal y los permisos de acceso según su rol en el hospital."
        actions={
          <Link
            href="/usuarios/nuevo"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800"
          >
            <Plus className="h-4 w-4" />
            Nuevo usuario
          </Link>
        }
      />

      {params.error === "propia" ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
          <ShieldCheck className="h-4 w-4" />
          No puedes desactivar tu propia cuenta mientras tienes la sesión
          activa.
        </div>
      ) : null}

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Cuentas registradas"
          value={total}
          icon={<Users className="h-5 w-5" />}
          tone="sky"
          hint="Personal con acceso al sistema"
        />
        <StatCard
          label="Cuentas activas"
          value={active}
          icon={<UserCheck className="h-5 w-5" />}
          tone="emerald"
          hint={`${total - active} ${total - active === 1 ? "desactivada" : "desactivadas"}`}
        />
        <StatCard
          label="Roles configurados"
          value={roles.length}
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="violet"
          hint="Técnico, administrador y gerencia"
        />
        <StatCard
          label="Órdenes asignadas"
          value={workOrders}
          icon={<UserRound className="h-5 w-5" />}
          tone="teal"
          hint="Trazabilidad por responsable"
        />
      </div>

      <Card className="mb-5 p-4">
        <form
          method="GET"
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Buscar por nombre o correo…"
              className={`${inputClass} pl-10`}
            />
          </div>
          <select
            name="rol"
            defaultValue={roleName}
            className={`${selectClass} sm:w-52`}
            aria-label="Filtrar por rol"
          >
            <option value="">Todos los roles</option>
            {roles.map((role) => (
              <option key={role.id} value={role.name}>
                {role.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white transition hover:bg-teal-700 sm:flex-none"
            >
              <Search className="h-4 w-4" />
              Filtrar
            </button>
            {hasFilters ? (
              <Link
                href="/usuarios"
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
            {users.length}{" "}
            {users.length === 1 ? "usuario encontrado" : "usuarios encontrados"}
          </p>
          <p className="text-[11px] text-slate-400">
            Los permisos se aplican en todo el sistema
          </p>
        </div>

        {users.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="No hay usuarios que coincidan"
            description="Ajusta la búsqueda o crea una nueva cuenta para el personal del hospital."
            action={
              <Link
                href="/usuarios/nuevo"
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-navy-900 px-4 text-xs font-semibold text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                Nuevo usuario
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse">
              <thead className="bg-slate-50/80">
                <tr>
                  <Th>Usuario</Th>
                  <Th>Correo</Th>
                  <Th>Rol</Th>
                  <Th>Estado</Th>
                  <Th className="text-center">Órdenes</Th>
                  <Th>Alta</Th>
                  <Th className="text-right">Acciones</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className={`transition hover:bg-slate-50/70 ${
                      !user.active ? "opacity-60" : ""
                    }`}
                  >
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} size="md" tone="teal" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {user.name}
                            {user.id === current.id ? (
                              <span className="ml-2 rounded-full bg-teal-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-teal-600">
                                Tú
                              </span>
                            ) : null}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Cuenta #{String(user.id).padStart(3, "0")}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <span className="text-xs text-slate-600">
                        {user.email}
                      </span>
                    </Td>
                    <Td>
                      <Badge
                        tone={
                          user.role.name === "administrador"
                            ? "violet"
                            : user.role.name === "tecnico"
                              ? "teal"
                              : "sky"
                        }
                        dot
                      >
                        {user.role.label}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge tone={user.active ? "emerald" : "slate"} dot>
                        {user.active ? "Activa" : "Inactiva"}
                      </Badge>
                    </Td>
                    <Td className="text-center">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-600">
                        {user._count.workOrders}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-[11px] text-slate-500">
                        {formatDate(user.createdAt)}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/usuarios/${user.id}/editar`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Link>
                        {user.id !== current.id ? (
                          <form action={toggleUser}>
                            <input type="hidden" name="id" value={user.id} />
                            <ConfirmButton
                              message={
                                user.active
                                  ? `¿Desactivar la cuenta de ${user.name}? No podrá iniciar sesión.`
                                  : `¿Reactivar la cuenta de ${user.name}?`
                              }
                              className={`inline-flex h-8 items-center rounded-lg px-2.5 text-[11px] font-semibold transition ${
                                user.active
                                  ? "text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                  : "text-emerald-600 hover:bg-emerald-50"
                              }`}
                            >
                              {user.active ? "Desactivar" : "Activar"}
                            </ConfirmButton>
                          </form>
                        ) : null}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          Alcance de los roles
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            {
              name: "Técnico biomédico",
              detail:
                "Registra equipos, programa preventivos, crea órdenes y registra el cierre de las intervenciones.",
              tone: "teal" as const,
            },
            {
              name: "Administrador",
              detail:
                "Acceso completo al sistema, incluida la gestión de usuarios, roles y catálogos.",
              tone: "violet" as const,
            },
            {
              name: "Gerencia",
              detail:
                "Consulta el panel, el inventario, las órdenes y los reportes en modo lectura.",
              tone: "sky" as const,
            },
          ].map((role) => (
            <div
              key={role.name}
              className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5"
            >
              <Badge tone={role.tone} dot>
                {role.name}
              </Badge>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                {role.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
