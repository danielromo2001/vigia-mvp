"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Loader2,
  QrCode,
  ScanLine,
  Search,
  Stethoscope,
  X,
  Zap,
} from "lucide-react";
import { createEquipment } from "@/app/actions/equipment";
import { Field, inputClass, selectClass } from "@/components/ui";
import type { FormState } from "@/lib/form-types";

type EquipmentOption = {
  id: number;
  code: string;
  name: string;
  location: string;
  serial: string;
};

export function EquipmentQuickActions({
  equipment,
  openRegister = false,
}: {
  equipment: EquipmentOption[];
  openRegister?: boolean;
}) {
  const [registerOpen, setRegisterOpen] = useState(openRegister);
  const [scanOpen, setScanOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setScanOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
      >
        <QrCode className="h-4 w-4" />
        Escanear activo
      </button>
      <button
        type="button"
        onClick={() => setRegisterOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 text-sm font-semibold text-teal-700 shadow-sm transition hover:bg-teal-100"
      >
        <Zap className="h-4 w-4" />
        Registro rápido
      </button>

      {registerOpen ? (
        <QuickRegisterDialog onClose={() => setRegisterOpen(false)} />
      ) : null}
      {scanOpen ? (
        <ScanDialog equipment={equipment} onClose={() => setScanOpen(false)} />
      ) : null}
    </>
  );
}

function QuickRegisterDialog({ onClose }: { onClose: () => void }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createEquipment,
    {},
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto px-4 py-10">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Zap className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Registro rápido de activo
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Solo lo esencial. Podrás completar la ficha desde la hoja de vida.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {state.error ? (
          <p
            role="alert"
            className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
          >
            {state.error}
          </p>
        ) : null}

        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del equipo" htmlFor="quick-name" required>
              <input
                id="quick-name"
                name="name"
                required
                placeholder="Monitor de signos vitales"
                className={inputClass}
              />
            </Field>
            <Field label="Número de serie" htmlFor="quick-serial" required>
              <input
                id="quick-serial"
                name="serial"
                required
                placeholder="MN-2026-014"
                className={inputClass}
              />
            </Field>
            <Field label="Ubicación / servicio" htmlFor="quick-location" required>
              <input
                id="quick-location"
                name="location"
                required
                placeholder="UCI Pediátrica"
                className={inputClass}
              />
            </Field>
            <Field label="Criticidad" htmlFor="quick-criticality">
              <select
                id="quick-criticality"
                name="criticality"
                defaultValue="media"
                className={selectClass}
              >
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </Field>
            <Field label="Marca" htmlFor="quick-brand">
              <input
                id="quick-brand"
                name="brand"
                placeholder="Mindray"
                className={inputClass}
              />
            </Field>
            <Field label="Modelo" htmlFor="quick-model">
              <input
                id="quick-model"
                name="model"
                placeholder="uMEC12"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy-900 px-4 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando…
                </>
              ) : (
                <>
                  <Stethoscope className="h-4 w-4" />
                  Registrar y abrir hoja de vida
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ScanDialog({
  equipment,
  onClose,
}: {
  equipment: EquipmentOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return equipment.slice(0, 5);
    return equipment
      .filter((item) =>
        `${item.code} ${item.name} ${item.serial} ${item.location}`
          .toLowerCase()
          .includes(term),
      )
      .slice(0, 6);
  }, [equipment, query]);

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto px-4 py-10">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="relative overflow-hidden bg-navy-950 px-5 py-6 text-white">
          <div className="absolute inset-0 bg-dots opacity-30" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="relative flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/15 ring-1 ring-teal-400/30">
              <ScanLine className="h-5 w-5 text-teal-300" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Escanear activo</h2>
              <p className="text-[11px] text-slate-400">
                Ingresa o pega el código del QR institucional.
              </p>
            </div>
          </div>
          <div className="relative mt-5 rounded-xl border-2 border-dashed border-white/15 px-4 py-5 text-center">
            <QrCode className="mx-auto h-10 w-10 text-teal-300/80" />
            <p className="mt-2 text-[10px] text-slate-400">
              Escaneo simulado · selecciona una coincidencia
            </p>
          </div>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="EQ-004, monitor, MN-2021-001…"
              className={`${inputClass} pl-10`}
              aria-label="Código o nombre del activo"
            />
          </div>

          <div className="mt-3 max-h-60 space-y-1 overflow-y-auto">
            {matches.length === 0 ? (
              <p className="px-1 py-4 text-center text-xs text-slate-500">
                No se encontraron activos con ese código.
              </p>
            ) : (
              matches.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push(`/equipos/${item.id}`);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <Stethoscope className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-slate-800">
                      {item.name}
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      {item.code} · {item.location}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                </button>
              ))
            )}
          </div>

          <div className="mt-3 border-t border-slate-100 pt-3">
            <Link
              href="/equipos/nuevo"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-teal-600 hover:text-teal-700"
            >
              <QrCode className="h-3.5 w-3.5" />
              Registrar un activo nuevo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
