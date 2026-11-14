"use client";

import { useActionState } from "react";
import { CheckCheck, ClipboardCheck } from "lucide-react";
import { closeWorkOrder } from "@/app/actions/work-orders";
import { SubmitButton } from "@/components/submit-button";
import { textareaClass } from "@/components/ui";
import type { FormState } from "@/lib/form-types";

const suggestions = [
  "Se realizó calibración y prueba de funcionamiento satisfactoria. Equipo operativo.",
  "Se reemplazaron los repuestos requeridos y se verificó el desempeño del equipo.",
  "Se ejecutó el protocolo de mantenimiento preventivo sin novedades.",
];

export function CloseOrderForm({ orderId }: { orderId: number }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    closeWorkOrder,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={orderId} />
      <div>
        <label
          htmlFor="observations"
          className="mb-1.5 block text-xs font-semibold text-slate-700"
        >
          Observaciones de la intervención{" "}
          <span className="text-rose-500">*</span>
        </label>
        <textarea
          id="observations"
          name="observations"
          rows={4}
          required
          placeholder="Describe las actividades realizadas, repuestos utilizados y resultado de las pruebas…"
          className={textareaClass}
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={(event) => {
                const form = event.currentTarget.closest("form");
                const field = form?.elements.namedItem(
                  "observations",
                ) as HTMLTextAreaElement | null;
                if (field) field.value = suggestion;
              }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-500 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
            >
              Usar plantilla
            </button>
          ))}
        </div>
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
        >
          {state.error}
        </p>
      ) : null}

      <SubmitButton
        icon={<CheckCheck className="h-4 w-4" />}
        pendingLabel="Cerrando orden…"
        className="w-full bg-emerald-600 hover:bg-emerald-700"
      >
        <ClipboardCheck className="h-4 w-4" />
        Cerrar orden y registrar en hoja de vida
      </SubmitButton>
    </form>
  );
}
