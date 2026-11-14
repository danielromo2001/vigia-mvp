import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Activity,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  HeartPulse,
  ShieldCheck,
} from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

const highlights = [
  {
    icon: Activity,
    title: "Hoja de vida completa",
    description: "Cada equipo con su historial de intervenciones.",
  },
  {
    icon: CalendarClock,
    title: "Preventivos a tiempo",
    description: "Programación por periodicidad y alertas tempranas.",
  },
  {
    icon: BarChart3,
    title: "Indicadores para gerencia",
    description: "Cumplimiento, órdenes abiertas y equipos críticos.",
  },
];

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/panel");

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative flex flex-col justify-between overflow-hidden bg-navy-950 px-6 py-8 text-white sm:px-10 lg:px-14 lg:py-12">
        <div className="absolute inset-0 bg-dots opacity-40" />
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/15 ring-1 ring-teal-400/30">
              <HeartPulse className="h-6 w-6 text-teal-300" />
            </div>
            <div>
              <p className="text-xl font-semibold tracking-[0.18em]">VIGÍA</p>
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Mantenimiento biomédico
              </p>
            </div>
          </div>

          <div className="mt-14 max-w-xl lg:mt-20">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-teal-200 backdrop-blur">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Unidad Pediátrica Simón Bolívar IPS S.A.S.
            </div>
            <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Cuidamos los equipos que{" "}
              <span className="text-teal-300">cuidan vidas.</span>
            </h2>
            <p className="mt-5 hidden max-w-lg text-base leading-relaxed text-slate-300 sm:block">
              Centraliza el inventario biomédico, la programación preventiva y
              las órdenes de trabajo en una sola plataforma para el equipo de
              ingeniería del hospital.
            </p>
          </div>

          <div className="mt-10 hidden gap-3 sm:grid sm:grid-cols-3">
            {highlights.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm"
              >
                <item.icon className="h-5 w-5 text-teal-300" />
                <p className="mt-3 text-sm font-semibold text-white">
                  {item.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-10 hidden items-center gap-x-5 gap-y-2 border-t border-white/10 pt-5 text-xs text-slate-400 sm:flex">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-400" />
            Acceso por roles
          </span>
          <span>Valledupar, Cesar · Colombia</span>
          <span>MVP · Metodología XP</span>
        </div>
      </section>

      <section className="flex items-center justify-center bg-white px-6 py-10 sm:px-10">
        <LoginForm />
      </section>
    </main>
  );
}
