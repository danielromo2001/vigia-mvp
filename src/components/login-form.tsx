"use client";

import { useActionState, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { loginAction, type LoginState } from "@/app/actions/auth";

const demoAccounts = [
  {
    role: "Técnico biomédico",
    name: "Emanuel Campo",
    email: "tecnico@vigia.co",
    dot: "bg-teal-400",
  },
  {
    role: "Administrador",
    name: "Daniel Rodríguez",
    email: "admin@vigia.co",
    dot: "bg-sky-400",
  },
  {
    role: "Gerencia",
    name: "Roberto Fernández",
    email: "gerencia@vigia.co",
    dot: "bg-violet-400",
  },
];

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );
  const [email, setEmail] = useState("tecnico@vigia.co");
  const [password, setPassword] = useState("Vigia2026*");
  const [visible, setVisible] = useState(false);

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          Acceso seguro
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Bienvenido de nuevo
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Ingresa con tu cuenta institucional para gestionar los equipos
          biomédicos y su mantenimiento.
        </p>
      </div>

      <form action={formAction} className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Correo electrónico
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              placeholder="nombre@vigia.co"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Contraseña
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              name="password"
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setVisible((value) => !value)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {visible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
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

        <button
          type="submit"
          disabled={pending}
          className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy-900 text-sm font-semibold text-white shadow-lg shadow-navy-900/20 transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando…
            </>
          ) : (
            <>
              Ingresar al sistema
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-teal-600" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Cuentas de demostración
          </p>
        </div>
        <div className="space-y-1.5">
          {demoAccounts.map((account) => {
            const selected = email === account.email;
            return (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  setPassword("Vigia2026*");
                }}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                  selected
                    ? "border-teal-300 bg-white shadow-sm ring-1 ring-teal-500/10"
                    : "border-transparent hover:border-slate-200 hover:bg-white"
                }`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${account.dot}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-slate-700">
                    {account.role}
                  </span>
                  <span className="block truncate text-[11px] text-slate-400">
                    {account.email}
                  </span>
                </span>
                <span
                  className={`text-[11px] font-semibold ${
                    selected ? "text-teal-600" : "text-slate-400"
                  }`}
                >
                  {selected ? "Seleccionada" : "Usar"}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 border-t border-slate-200 pt-3 text-[11px] text-slate-400">
          Contraseña para todas las cuentas:{" "}
          <span className="font-mono font-semibold text-slate-600">
            Vigia2026*
          </span>
        </p>
      </div>
    </div>
  );
}
