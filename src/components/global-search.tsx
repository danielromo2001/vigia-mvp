"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Building2,
  CalendarClock,
  ClipboardList,
  Search,
  Stethoscope,
  X,
} from "lucide-react";

const quickLinks = [
  { href: "/equipos", label: "Activos biomédicos", icon: Stethoscope },
  { href: "/ordenes", label: "Órdenes de trabajo", icon: ClipboardList },
  { href: "/preventivos", label: "Mantenimientos", icon: CalendarClock },
  { href: "/repuestos", label: "Repuestos", icon: Boxes },
  { href: "/proveedores", label: "Proveedores", icon: Building2 },
];

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    setOpen(false);
    router.push(term ? `/buscar?q=${encodeURIComponent(term)}` : "/buscar");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-left text-xs text-slate-400 transition hover:border-slate-300 hover:bg-white md:max-w-md"
        aria-label="Buscar en VIGÍA (Ctrl+K)"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">Buscar equipos, órdenes, repuestos…</span>
        <span className="ml-auto hidden shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 sm:inline-flex">
          Ctrl K
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]">
          <button
            type="button"
            aria-label="Cerrar búsqueda"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <form onSubmit={submit}>
              <div className="flex items-center gap-3 border-b border-slate-100 px-4">
                <Search className="h-5 w-5 shrink-0 text-slate-400" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por código, equipo, repuesto o proveedor…"
                  className="h-14 min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  aria-label="Término de búsqueda"
                />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </form>

            <div className="px-2 py-3">
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Ir a un módulo
              </p>
              <div className="grid gap-0.5 sm:grid-cols-2">
                {quickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    <link.icon className="h-4 w-4 text-slate-400" />
                    {link.label}
                  </Link>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  const term = query.trim();
                  setOpen(false);
                  router.push(
                    term ? `/buscar?q=${encodeURIComponent(term)}` : "/buscar",
                  );
                }}
                className="mt-2 flex w-full items-center justify-between rounded-xl bg-navy-950 px-4 py-3 text-left text-xs font-semibold text-white transition hover:bg-navy-900"
              >
                <span className="inline-flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-teal-300" />
                  Buscar coincidencias en todo VIGÍA
                </span>
                <ArrowRight className="h-4 w-4 text-teal-300" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
