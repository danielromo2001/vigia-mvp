"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Save, UserRound } from "lucide-react";
import { createUser, updateUser } from "@/app/actions/users";
import { SubmitButton } from "@/components/submit-button";
import { Field, inputClass, selectClass } from "@/components/ui";
import type { FormState } from "@/lib/form-types";

type RoleOption = { id: number; name: string; label: string };

export function UserForm({
  roleOptions,
  initial,
}: {
  roleOptions: RoleOption[];
  initial?: {
    id: number;
    name: string;
    email: string;
    roleId: number;
    active: boolean;
  };
}) {
  const isEdit = Boolean(initial?.id);
  const [state, formAction] = useActionState<FormState, FormData>(
    isEdit ? updateUser : createUser,
    {},
  );
  const [active, setActive] = useState(initial?.active ?? true);

  return (
    <form action={formAction} className="space-y-5">
      {isEdit ? <input type="hidden" name="id" value={initial?.id} /> : null}

      {state.error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
        >
          {state.error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <UserRound className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Datos de la cuenta
            </h2>
            <p className="text-xs text-slate-500">
              El correo se utiliza para iniciar sesión en VIGÍA.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre completo" htmlFor="name" required>
            <input
              id="name"
              name="name"
              required
              defaultValue={initial?.name}
              placeholder="Nombre y apellidos"
              className={inputClass}
            />
          </Field>
          <Field label="Correo institucional" htmlFor="email" required>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={initial?.email}
              placeholder="usuario@vigia.co"
              className={inputClass}
            />
          </Field>
          <Field label="Rol" htmlFor="roleId" required>
            <select
              id="roleId"
              name="roleId"
              required
              defaultValue={initial?.roleId ?? ""}
              className={selectClass}
            >
              <option value="" disabled>
                Selecciona un rol…
              </option>
              {roleOptions.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={isEdit ? "Nueva contraseña" : "Contraseña"}
            htmlFor="password"
            required={!isEdit}
            hint={
              isEdit
                ? "Déjala vacía para conservar la contraseña actual."
                : "Mínimo 8 caracteres."
            }
          >
            <input
              id="password"
              name="password"
              type="password"
              required={!isEdit}
              minLength={isEdit ? undefined : 8}
              autoComplete="new-password"
              placeholder={isEdit ? "•••••••• (opcional)" : "Mínimo 8 caracteres"}
              className={inputClass}
            />
          </Field>
        </div>

        {isEdit ? (
          <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <span>
              <span className="block text-xs font-semibold text-slate-800">
                Cuenta activa
              </span>
              <span className="block text-[11px] text-slate-500">
                Si se desactiva, el usuario no podrá iniciar sesión.
              </span>
            </span>
            <input
              type="checkbox"
              name="active"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              className="h-4 w-4 accent-teal-600"
            />
          </label>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href="/usuarios"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Cancelar
        </Link>
        <SubmitButton icon={<Save className="h-4 w-4" />}>
          {isEdit ? "Guardar cambios" : "Crear usuario"}
        </SubmitButton>
      </div>
    </form>
  );
}
