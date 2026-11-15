"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownUp, X } from "lucide-react";
import { registerPartMovement } from "@/app/actions/spare-parts";
import { Field, inputClass, selectClass, textareaClass } from "@/components/ui";

type PartOption = {
  id: number;
  code: string;
  name: string;
  unit: string;
  stock: number;
};

type OrderOption = {
  id: number;
  code: string;
  equipment: string;
};

export function PartMovementDialog({
  parts,
  orders,
  fixedPartId,
  label = "Registrar movimiento",
}: {
  parts: PartOption[];
  orders: OrderOption[];
  fixedPartId?: number;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [type, setType] = useState("salida");

  const initialPart = fixedPartId ?? parts[0]?.id;

  async function submit(formData: FormData) {
    setPending(true);
    try {
      await registerPartMovement(formData);
      setOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          fixedPartId
            ? "inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 transition hover:border-teal-200 hover:text-teal-700"
            : "inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
        }
      >
        <ArrowDownUp className={fixedPartId ? "h-3 w-3" : "h-4 w-4"} />
        {label}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto px-4 py-10">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Registrar movimiento de inventario
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  La entrada suma stock, la salida lo descuenta y el ajuste fija
                  el valor real contado.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form action={submit} className="space-y-4">
              <Field label="Repuesto" htmlFor="movement-part" required>
                <select
                  id="movement-part"
                  name="partId"
                  defaultValue={initialPart}
                  className={selectClass}
                  required
                >
                  {parts.map((part) => (
                    <option key={part.id} value={part.id}>
                      {part.code} · {part.name} ({part.stock} {part.unit})
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tipo" htmlFor="movement-type" required>
                  <select
                    id="movement-type"
                    name="type"
                    value={type}
                    onChange={(event) => setType(event.target.value)}
                    className={selectClass}
                  >
                    <option value="salida">Salida</option>
                    <option value="entrada">Entrada</option>
                    <option value="ajuste">Ajuste de inventario</option>
                    <option value="solicitud">Solicitud de compra</option>
                  </select>
                </Field>
                <Field
                  label={type === "ajuste" ? "Stock real contado" : "Cantidad"}
                  htmlFor="movement-quantity"
                  required
                >
                  <input
                    id="movement-quantity"
                    name="quantity"
                    type="number"
                    min={1}
                    step={1}
                    defaultValue={1}
                    required
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Orden de trabajo asociada" htmlFor="movement-order">
                <select
                  id="movement-order"
                  name="workOrderId"
                  defaultValue=""
                  className={selectClass}
                >
                  <option value="">Sin orden asociada</option>
                  {orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.code} · {order.equipment}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Motivo" htmlFor="movement-reason">
                <textarea
                  id="movement-reason"
                  name="reason"
                  rows={2}
                  placeholder="Consumo en mantenimiento, compra, conteo físico…"
                  className={textareaClass}
                />
              </Field>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy-900 px-4 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-60"
                >
                  {pending ? "Guardando…" : "Guardar movimiento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
