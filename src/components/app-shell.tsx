"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CalendarClock,
  ClipboardList,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareWarning,
  ShieldCheck,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { GlobalSearch } from "@/components/global-search";
import { cn } from "@/components/ui";
import type { OperationStatus } from "@/lib/operation-status";

type ShellUser = {
  name: string;
  email: string;
  role: { name: string; label: string };
};

const operationNav = [
  { href: "/panel", label: "Resumen", icon: LayoutDashboard },
  { href: "/equipos", label: "Activos", icon: Stethoscope },
  { href: "/ordenes", label: "Órdenes", icon: ClipboardList },
  { href: "/preventivos", label: "Mantenimientos", icon: CalendarClock },
  { href: "/repuestos", label: "Repuestos", icon: Boxes },
  { href: "/proveedores", label: "Proveedores", icon: Building2 },
];

const analysisNav = [
  { href: "/reportes-falla", label: "Reportes de falla", icon: MessageSquareWarning },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
];

const adminNav = [
  { href: "/usuarios", label: "Usuarios y roles", icon: Users },
];

const statusDot: Record<OperationStatus["tone"], string> = {
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
};

const statusPill: Record<OperationStatus["tone"], string> = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function shiftLabel() {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Bogota",
    }).format(new Date()),
  );
  return hour < 12 ? "Turno mañana" : hour < 18 ? "Turno tarde" : "Turno noche";
}

export function AppShell({
  user,
  alertCount,
  reportCount,
  lowStockCount,
  operation,
  todayLabel,
  children,
}: {
  user: ShellUser;
  alertCount: number;
  reportCount: number;
  lowStockCount: number;
  operation: OperationStatus;
  todayLabel: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = user.role.name === "administrador";

  const navGroups = [
    { title: "Operación", items: operationNav },
    { title: "Análisis", items: analysisNav },
    {
      title: "Administración",
      items: adminNav.filter(() => isAdmin),
    },
  ].filter((group) => group.items.length > 0);

  const activeItem = [...operationNav, ...analysisNav, ...adminNav].find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  const sidebar = (
    <div className="flex h-full flex-col bg-navy-950 text-slate-300">
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/15 ring-1 ring-teal-400/25">
          <HeartPulse className="h-5 w-5 text-teal-300" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold tracking-[0.18em] text-white">
            VIGÍA
          </p>
          <p className="truncate text-[10px] uppercase tracking-[0.14em] text-slate-500">
            Mantenimiento biomédico
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-white/5 lg:hidden"
          aria-label="Cerrar menú"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mx-3 mb-4 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
        <div className="flex items-start gap-2.5">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold leading-snug text-slate-200">
              Unidad Pediátrica Simón Bolívar
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              IPS S.A.S. · Valledupar
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 scrollbar-thin">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                const badge =
                  item.href === "/preventivos"
                    ? alertCount
                    : item.href === "/reportes-falla"
                      ? reportCount
                      : item.href === "/repuestos"
                        ? lowStockCount
                        : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition",
                      active
                        ? "bg-teal-500/15 text-teal-200 ring-1 ring-inset ring-teal-400/20"
                        : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-100",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-[18px] w-[18px]",
                        active
                          ? "text-teal-300"
                          : "text-slate-500 group-hover:text-slate-300",
                      )}
                    />
                    {item.label}
                    {badge > 0 ? (
                      <span
                        className={cn(
                          "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white",
                          item.href === "/repuestos"
                            ? "bg-amber-500/90"
                            : item.href === "/reportes-falla"
                              ? "bg-violet-500/90"
                              : "bg-rose-500/90",
                        )}
                      >
                        {badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                statusDot[operation.tone],
              )}
            />
            <p className="text-[11px] font-semibold text-slate-100">
              {operation.label}
            </p>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
            {operation.detail}
          </p>
          <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-center">
            <div className="rounded-lg bg-white/[0.04] px-1.5 py-1.5">
              <p className="text-sm font-semibold text-white">{alertCount}</p>
              <p className="text-[9px] uppercase tracking-wide text-slate-500">
                Alertas
              </p>
            </div>
            <div className="rounded-lg bg-white/[0.04] px-1.5 py-1.5">
              <p className="text-sm font-semibold text-white">{lowStockCount}</p>
              <p className="text-[9px] uppercase tracking-wide text-slate-500">
                Reponer
              </p>
            </div>
          </div>
        </div>
      </nav>

      <div className="border-t border-white/[0.07] p-3">
        <div className="rounded-xl bg-white/[0.03] p-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-xs font-bold text-navy-950">
              {initials(user.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">
                {user.name}
              </p>
              <p className="truncate text-[10px] text-slate-400">
                {user.role.label}
              </p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
          <p className="mt-2 flex items-center gap-1.5 border-t border-white/[0.06] pt-2 text-[10px] text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {shiftLabel()} · En línea
          </p>
        </div>
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-600">
          <ShieldCheck className="h-3 w-3" />
          Sesión protegida · VIGÍA MVP
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] lg:block">
        {sidebar}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 w-[286px] shadow-2xl">
            {sidebar}
          </div>
        </div>
      ) : null}

      <div className="lg:pl-[272px]">
        <header className="no-print sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="hidden items-center gap-2 text-xs text-slate-400 md:flex">
              <span className="font-semibold tracking-[0.16em] text-slate-700">
                VIGÍA
              </span>
              <span className="text-slate-300">/</span>
              <span className="font-medium text-slate-600">
                {activeItem?.label ?? "Resumen"}
              </span>
              <span className="hidden text-slate-300 xl:inline">·</span>
              <span className="hidden whitespace-nowrap text-slate-400 xl:inline">
                {todayLabel}
              </span>
            </div>

            <div className="flex min-w-0 flex-1 justify-end md:justify-center">
              <GlobalSearch />
            </div>

            <span
              className={cn(
                "hidden shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold xl:inline-flex",
                statusPill[operation.tone],
              )}
              title={operation.detail}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  statusDot[operation.tone],
                )}
              />
              {operation.label}
            </span>

            <Link
              href="/preventivos?filtro=vencidos"
              className="relative shrink-0 rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              aria-label="Ver alertas de mantenimiento"
            >
              <Bell className="h-[18px] w-[18px]" />
              {alertCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                  {alertCount}
                </span>
              ) : null}
            </Link>

            <div className="hidden h-8 w-px bg-slate-200 sm:block" />

            <div className="flex shrink-0 items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-[10px] font-bold text-white">
                {initials(user.name)}
              </span>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-xs font-semibold text-slate-800">
                  {user.name}
                </p>
                <p className="truncate text-[10px] text-slate-400">
                  {user.role.label}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>

        <footer className="no-print mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-2 px-4 pb-6 text-[11px] text-slate-400 sm:px-6 lg:px-8">
          <span>VIGÍA · Sistema de gestión del mantenimiento biomédico</span>
          <span>
            Unidad Pediátrica Simón Bolívar IPS S.A.S. · Valledupar
          </span>
        </footer>
      </div>
    </div>
  );
}
