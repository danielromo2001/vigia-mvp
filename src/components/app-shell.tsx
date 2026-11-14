"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarClock,
  ClipboardList,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/components/ui";

type ShellUser = {
  name: string;
  email: string;
  role: { name: string; label: string };
};

const operationNav = [
  { href: "/panel", label: "Panel", icon: LayoutDashboard },
  { href: "/equipos", label: "Equipos biomédicos", icon: Stethoscope },
  { href: "/ordenes", label: "Órdenes de trabajo", icon: ClipboardList },
  { href: "/preventivos", label: "Preventivos", icon: CalendarClock },
];

const adminNav = [
  { href: "/usuarios", label: "Usuarios y roles", icon: Users, adminOnly: true },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AppShell({
  user,
  alertCount,
  todayLabel,
  children,
}: {
  user: ShellUser;
  alertCount: number;
  todayLabel: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = user.role.name === "administrador";

  const navGroups = [
    { title: "Operación", items: operationNav },
    {
      title: "Análisis",
      items: adminNav.filter((item) => !item.adminOnly || isAdmin),
    },
  ].filter((group) => group.items.length > 0);

  const activeItem = [...operationNav, ...adminNav].find(
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

      <div className="mx-3 mb-5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
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

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4 scrollbar-thin">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
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
                    {item.href === "/preventivos" && alertCount > 0 ? (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500/90 px-1.5 text-[10px] font-bold text-white">
                        {alertCount}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
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

            <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
              <span className="font-semibold tracking-[0.16em] text-slate-700">
                VIGÍA
              </span>
              <span className="text-slate-300">/</span>
              <span className="font-medium text-slate-600">
                {activeItem?.label ?? "Panel"}
              </span>
            </div>

            <p className="ml-auto hidden text-xs text-slate-500 md:block">
              {todayLabel}
            </p>

            <Link
              href="/preventivos?filtro=vencidos"
              className="relative ml-auto rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 md:ml-4"
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

            <div className="flex items-center gap-2.5">
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
