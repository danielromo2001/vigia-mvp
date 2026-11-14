export const equipmentStatuses = [
  { value: "operativo", label: "Operativo", tone: "emerald" as const },
  { value: "en_mantenimiento", label: "En mantenimiento", tone: "amber" as const },
  { value: "fuera_servicio", label: "Fuera de servicio", tone: "rose" as const },
];

export const criticalities = [
  { value: "alta", label: "Alta", tone: "rose" as const },
  { value: "media", label: "Media", tone: "amber" as const },
  { value: "baja", label: "Baja", tone: "slate" as const },
];

export const orderStatuses = [
  { value: "abierta", label: "Abierta", tone: "sky" as const },
  { value: "en_proceso", label: "En proceso", tone: "amber" as const },
  { value: "cerrada", label: "Cerrada", tone: "emerald" as const },
  { value: "cancelada", label: "Cancelada", tone: "slate" as const },
];

export const orderTypes = [
  { value: "preventivo", label: "Preventivo", tone: "teal" as const },
  { value: "correctivo", label: "Correctivo", tone: "orange" as const },
];

export const priorities = [
  { value: "alta", label: "Alta", tone: "rose" as const },
  { value: "media", label: "Media", tone: "amber" as const },
  { value: "baja", label: "Baja", tone: "slate" as const },
];

export const roles = [
  { value: "tecnico", label: "Técnico biomédico" },
  { value: "administrador", label: "Administrador" },
  { value: "gerencia", label: "Gerencia" },
];

export const eventTypes: Record<string, string> = {
  registro: "Registro del equipo",
  preventivo: "Mantenimiento preventivo",
  correctivo: "Mantenimiento correctivo",
  apertura: "Apertura de orden",
  otro: "Otro evento",
};

export type MetaTone =
  | "emerald"
  | "amber"
  | "rose"
  | "sky"
  | "slate"
  | "teal"
  | "orange"
  | "violet";

type Option = { value: string; label: string; tone?: MetaTone };

function find(options: Option[], value?: string | null) {
  return options.find((option) => option.value === value);
}

export function equipmentStatusMeta(value?: string | null) {
  return find(equipmentStatuses, value) ?? {
    value: value ?? "",
    label: value ?? "Sin estado",
    tone: "slate",
  };
}

export function criticalityMeta(value?: string | null) {
  return find(criticalities, value) ?? {
    value: value ?? "",
    label: value ?? "—",
    tone: "slate",
  };
}

export function orderStatusMeta(value?: string | null) {
  return find(orderStatuses, value) ?? {
    value: value ?? "",
    label: value ?? "Sin estado",
    tone: "slate",
  };
}

export function orderTypeMeta(value?: string | null) {
  return find(orderTypes, value) ?? {
    value: value ?? "",
    label: value ?? "—",
    tone: "slate",
  };
}

export function priorityMeta(value?: string | null) {
  return find(priorities, value) ?? {
    value: value ?? "",
    label: value ?? "—",
    tone: "slate",
  };
}

export function roleLabel(value?: string | null) {
  return roles.find((role) => role.value === value)?.label ?? value ?? "—";
}

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Bogota",
});

const shortDateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  timeZone: "America/Bogota",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Bogota",
});

const longDateFormatter = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Bogota",
});

export function formatDate(value?: Date | string | null) {
  if (!value) return "—";
  return dateFormatter.format(new Date(value));
}

export function formatShortDate(value?: Date | string | null) {
  if (!value) return "—";
  return shortDateFormatter.format(new Date(value));
}

export function formatDateTime(value?: Date | string | null) {
  if (!value) return "—";
  return dateTimeFormatter.format(new Date(value));
}

export function formatLongDate(value: Date = new Date()) {
  const formatted = longDateFormatter.format(value);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function toDateInput(value?: Date | string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function parseDateInput(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function startOfUtcDay(value: Date) {
  return Date.UTC(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate(),
  );
}

export function daysUntil(value?: Date | string | null) {
  if (!value) return null;
  const target = startOfUtcDay(new Date(value));
  const today = startOfUtcDay(new Date());
  return Math.round((target - today) / 86_400_000);
}

export function relativeDays(value?: Date | string | null) {
  const days = daysUntil(value);
  if (days === null) return "Sin fecha";
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  if (days === -1) return "Ayer";
  if (days > 1) return `En ${days} días`;
  return `Hace ${Math.abs(days)} días`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function equipmentLabel(equipment: {
  code: string;
  name: string;
}) {
  return `${equipment.code} · ${equipment.name}`;
}
