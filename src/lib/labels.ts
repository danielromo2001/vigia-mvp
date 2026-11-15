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
  { value: "clinico", label: "Personal clínico" },
];

/**
 * Categorías de falla que usa el clasificador de IA y el triaje humano.
 * El orden es el que se muestra en los formularios y en los reportes.
 */
export const failureCategories = [
  {
    value: "hardware",
    label: "Hardware",
    tone: "sky" as const,
    description: "Componentes físicos, sensores, pantallas, tarjetas o partes mecánicas.",
  },
  {
    value: "software",
    label: "Software",
    tone: "violet" as const,
    description: "Firmware, configuración, licencias, bloqueos o errores de la aplicación.",
  },
  {
    value: "red",
    label: "Red y conectividad",
    tone: "teal" as const,
    description: "Wi-Fi, cableado de datos, servidores, sincronización o integraciones.",
  },
  {
    value: "electrico",
    label: "Eléctrico",
    tone: "amber" as const,
    description: "Alimentación, UPS, tomacorrientes, breakers, cortos o sobrecargas.",
  },
  {
    value: "consumible",
    label: "Consumibles y repuestos",
    tone: "orange" as const,
    description: "Filtros, empaques, sets, electrodos, baterías o insumos agotados.",
  },
  {
    value: "infraestructura",
    label: "Infraestructura",
    tone: "slate" as const,
    description: "Camas, puertas, redes de gases, aire acondicionado o planta física.",
  },
  {
    value: "otro",
    label: "Otro / por clasificar",
    tone: "slate" as const,
    description: "El relato no permite asignar una categoría con confianza suficiente.",
  },
];

export const impacts = [
  {
    value: "critico",
    label: "Crítico",
    tone: "rose" as const,
    description: "El equipo está fuera de servicio y afecta la atención de un paciente ahora.",
  },
  {
    value: "alto",
    label: "Alto",
    tone: "orange" as const,
    description: "El servicio está comprometido o hay un riesgo latente para el paciente.",
  },
  {
    value: "medio",
    label: "Medio",
    tone: "amber" as const,
    description: "Hay una falla que limita el uso, pero existe una alternativa disponible.",
  },
  {
    value: "bajo",
    label: "Bajo",
    tone: "slate" as const,
    description: "Molestia menor, solicitud de rutina o mejora sin afectar la atención.",
  },
];

export const reportStatuses = [
  { value: "pendiente", label: "Pendiente de triaje", tone: "amber" as const },
  { value: "aceptada", label: "Sugerencia aceptada", tone: "emerald" as const },
  { value: "ajustada", label: "Ajustada por el técnico", tone: "sky" as const },
  { value: "convertida", label: "Convertida en orden", tone: "teal" as const },
  { value: "descartada", label: "Descartada", tone: "slate" as const },
];

export const sparePartCategories = [
  { value: "sensor", label: "Sensores" },
  { value: "bateria", label: "Baterías" },
  { value: "consumible", label: "Consumibles" },
  { value: "repuesto", label: "Repuestos" },
  { value: "accesorio", label: "Accesorios" },
  { value: "otro", label: "Otro" },
];

export const partMovementTypes = [
  { value: "entrada", label: "Entrada", tone: "emerald" as const },
  { value: "salida", label: "Salida", tone: "orange" as const },
  { value: "ajuste", label: "Ajuste", tone: "sky" as const },
  { value: "solicitud", label: "Solicitud", tone: "violet" as const },
];

export const supplierStatuses = [
  { value: "aprobado", label: "Aprobado", tone: "emerald" as const },
  { value: "seguimiento", label: "Seguimiento", tone: "amber" as const },
  { value: "revisar", label: "Revisar", tone: "rose" as const },
  { value: "inactivo", label: "Inactivo", tone: "slate" as const },
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

type Option = {
  value: string;
  label: string;
  tone?: MetaTone;
  description?: string;
};

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

export function failureCategoryMeta(value?: string | null) {
  return find(failureCategories, value) ?? {
    value: value ?? "",
    label: value ?? "Sin categoría",
    tone: "slate" as const,
    description: "",
  };
}

export function impactMeta(value?: string | null) {
  return find(impacts, value) ?? {
    value: value ?? "",
    label: value ?? "Sin impacto",
    tone: "slate" as const,
    description: "",
  };
}

export function reportStatusMeta(value?: string | null) {
  return find(reportStatuses, value) ?? {
    value: value ?? "",
    label: value ?? "Sin estado",
    tone: "slate" as const,
  };
}

export function partMovementMeta(value?: string | null) {
  return find(partMovementTypes, value) ?? {
    value: value ?? "",
    label: value ?? "Movimiento",
    tone: "slate" as const,
  };
}

export function supplierStatusMeta(value?: string | null) {
  return find(supplierStatuses, value) ?? {
    value: value ?? "",
    label: value ?? "Sin estado",
    tone: "slate" as const,
  };
}

export type StockLevel = {
  status: "agotado" | "critico" | "bajo" | "adecuado";
  label: string;
  tone: "rose" | "amber" | "emerald";
  ratio: number;
  deficit: number;
};

/**
 * Clasifica el nivel de un repuesto comparando el stock con el mínimo definido.
 * Se usa en la tabla, en las alertas del panel y en la solicitud de reposición.
 */
export function stockLevel(stock: number, minStock: number): StockLevel {
  const safeMin = Math.max(minStock, 1);
  const ratio = Math.round((stock / safeMin) * 100);
  const deficit = Math.max(0, safeMin - stock);

  if (stock <= 0) {
    return { status: "agotado", label: "Agotado", tone: "rose", ratio: 0, deficit: safeMin };
  }
  if (stock < safeMin * 0.5) {
    return { status: "critico", label: "Stock crítico", tone: "rose", ratio, deficit };
  }
  if (stock < safeMin) {
    return { status: "bajo", label: "Stock bajo", tone: "amber", ratio, deficit };
  }
  return {
    status: "adecuado",
    label: "Adecuado",
    tone: "emerald",
    ratio: Math.min(100, ratio),
    deficit: 0,
  };
}

export function formatDuration(hours: number) {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  if (whole < 24) {
    return minutes > 0 ? `${whole} h ${minutes} min` : `${whole} h`;
  }
  const days = Math.floor(whole / 24);
  const rest = whole % 24;
  return rest > 0 ? `${days} d ${rest} h` : `${days} d`;
}

export type SlaState = {
  label: string;
  tone: "emerald" | "amber" | "rose" | "slate";
  hours: number;
  breached: boolean;
};

/**
 * Calcula el SLA restante de una orden a partir de su fecha compromiso.
 * Las órdenes cerradas o canceladas no muestran cuenta regresiva.
 */
export function orderSla(
  order: { dueDate?: Date | string | null; status?: string | null },
  now: Date = new Date(),
): SlaState | null {
  if (!order.dueDate) return null;
  if (order.status === "cerrada" || order.status === "cancelada") {
    return { label: "Fuera de SLA", tone: "slate", hours: 0, breached: false };
  }
  const diffHours =
    (new Date(order.dueDate).getTime() - now.getTime()) / 3_600_000;
  if (diffHours < 0) {
    return {
      label: `Vencida ${formatDuration(Math.abs(diffHours))}`,
      tone: "rose",
      hours: diffHours,
      breached: true,
    };
  }
  return {
    label: `Restan ${formatDuration(diffHours)}`,
    tone: diffHours <= 24 ? "amber" : "emerald",
    hours: diffHours,
    breached: false,
  };
}

export function formatCop(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactCop(value: number) {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)} B COP`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)} M COP`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)} K COP`;
  return formatCop(value);
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
