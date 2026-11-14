import {
  failureCategories,
  failureCategoryMeta,
  impactMeta,
  priorityMeta,
} from "@/lib/labels";

/**
 * Motor de triaje de VIGÍA.
 *
 * Clasifica un reporte de falla en una categoría (hardware, software, red…) y
 * estima su prioridad combinando tres señales:
 *
 *  1. El léxico del relato (coincidencias de términos ponderadas).
 *  2. El contexto del activo (criticidad y estado del equipo).
 *  3. El impacto declarado por quien reporta.
 *
 * Es intencionalmente determinista y explicable: cada sugerencia devuelve los
 * términos que la motivaron, de modo que el técnico pueda aceptarla o ajustarla.
 * No usa datos de pacientes ni requiere servicios externos.
 */

export type FailureCategory =
  | "hardware"
  | "software"
  | "red"
  | "electrico"
  | "consumible"
  | "infraestructura"
  | "otro";

export type Priority = "alta" | "media" | "baja";
export type Impact = "critico" | "alto" | "medio" | "bajo";
export type MaintenanceType = "preventivo" | "correctivo";

export type EquipmentContext = {
  name: string;
  criticality?: string | null;
  status?: string | null;
  location?: string | null;
  brand?: string | null;
  model?: string | null;
};

export type TriageInput = {
  description: string;
  equipment: EquipmentContext;
  impact?: Impact | string | null;
  /** Fecha de referencia para calcular el vencimiento sugerido. */
  now?: Date;
};

export type TriageResult = {
  category: FailureCategory;
  categoryLabel: string;
  categoryDescription: string;
  priority: Priority;
  priorityLabel: string;
  impact: Impact;
  confidence: number;
  categoryConfidence: number;
  priorityConfidence: number;
  score: number;
  categoryScores: Record<FailureCategory, number>;
  keywords: string[];
  reasons: string[];
  suggestedType: MaintenanceType;
  suggestedDueDays: number;
  suggestedDueDate: string;
  needsReview: boolean;
  model: string;
  source: "heuristic" | "llm";
};

export const TRIAGE_MODEL = "vigia-triage-v1";

const CATEGORY_KEYS = failureCategories.map(
  (category) => category.value,
) as FailureCategory[];

type WeightedTerm = readonly [term: string, weight: number];

/** Léxico en español rioplatense/colombiano, sin acentos y en minúsculas. */
const LEXICON: Record<FailureCategory, readonly WeightedTerm[]> = {
  hardware: [
    ["pantalla", 3],
    ["monitor", 3],
    ["boton", 3],
    ["teclado", 3],
    ["mouse", 2],
    ["sensor", 3],
    ["modulo", 2],
    ["tarjeta", 3],
    ["fuente de poder", 4],
    ["bateria", 2],
    ["motor", 3],
    ["compresor", 3],
    ["valvula", 3],
    ["bomba", 2],
    ["cable", 2],
    ["conector", 3],
    ["pantalla tactil", 4],
    ["display", 3],
    ["carcasa", 2],
    ["chasis", 2],
    ["lampara", 2],
    ["antena", 2],
    ["transductor", 3],
    ["no enciende", 4],
    ["no prende", 4],
    ["no carga", 3],
    ["no funciona", 2],
    ["se apaga", 3],
    ["ruido", 2],
    ["vibracion", 2],
    ["sobrecalienta", 3],
    ["falla mecanica", 4],
    ["hardware", 4],
    ["tecnico", 1],
    ["calibracion", 2],
  ],
  software: [
    ["software", 4],
    ["aplicacion", 3],
    ["aplicativo", 3],
    ["sistema", 2],
    ["actualizacion", 3],
    ["version", 2],
    ["licencia", 4],
    ["error", 2],
    ["pantalla azul", 4],
    ["base de datos", 4],
    ["interfaz", 3],
    ["configuracion", 3],
    ["firmware", 4],
    ["driver", 4],
    ["reinicia", 3],
    ["se cuelga", 3],
    ["bloqueo", 3],
    ["contrasena", 3],
    ["no guarda", 3],
    ["no responde", 2],
    ["datos erroneos", 3],
    ["registro duplicado", 3],
    ["modulo del sistema", 3],
    ["software desactualizado", 4],
  ],
  red: [
    ["red", 3],
    ["wifi", 3],
    ["inalambrica", 3],
    ["internet", 3],
    ["ethernet", 4],
    ["conexion", 3],
    ["conectividad", 4],
    ["servidor", 3],
    ["his", 3],
    ["hl7", 4],
    ["switch", 4],
    ["router", 4],
    ["vpn", 4],
    ["latencia", 3],
    ["se desconecta", 3],
    ["sincronizacion", 3],
    ["no sincroniza", 4],
    ["sin conexion", 4],
    ["offline", 3],
    ["datos no llegan", 4],
    ["timeout", 3],
    ["api", 2],
    ["nube", 3],
  ],
  electrico: [
    ["electrico", 4],
    ["electrica", 3],
    ["corriente", 3],
    ["voltaje", 4],
    ["enchufe", 4],
    ["toma corriente", 4],
    ["corto circuito", 5],
    ["corto", 3],
    ["breaker", 4],
    ["fusible", 4],
    ["ups", 4],
    ["planta electrica", 4],
    ["sobrecarga", 4],
    ["chispa", 4],
    ["descarga electrica", 5],
    ["se quemo", 3],
    ["quemado", 3],
    ["olor a quemado", 5],
    ["sin energia", 4],
    ["no hay luz", 3],
  ],
  consumible: [
    ["consumible", 4],
    ["repuesto", 4],
    ["filtro", 4],
    ["manguera", 4],
    ["set de infusion", 4],
    ["cateter", 4],
    ["electrodo", 4],
    ["gel", 3],
    ["papel", 2],
    ["tinta", 3],
    ["sensor desechable", 4],
    ["empaque", 4],
    ["sello", 3],
    ["aceite", 3],
    ["reactivo", 4],
    ["insumo", 4],
    ["jeringa", 3],
    ["aguja", 3],
    ["se agoto", 4],
    ["sin stock", 4],
    ["desgaste", 3],
  ],
  infraestructura: [
    ["infraestructura", 4],
    ["puerta", 3],
    ["ventana", 3],
    ["techo", 3],
    ["pared", 3],
    ["piso", 3],
    ["fuga", 3],
    ["agua", 2],
    ["aire acondicionado", 4],
    ["iluminacion", 3],
    ["ascensor", 4],
    ["sanitario", 3],
    ["red hidraulica", 4],
    ["gas medicinal", 5],
    ["oxigeno", 2],
    ["acometida", 4],
    ["mobiliario", 3],
    ["cama", 2],
    ["silla", 2],
    ["mesa", 2],
    ["obra civil", 4],
  ],
  otro: [
    ["otro", 1],
    ["no clasificable", 2],
    ["sin informacion", 2],
  ],
};

/** Pistas que aporta el nombre o la marca del equipo. */
const EQUIPMENT_PRIORS: readonly {
  term: string;
  category: FailureCategory;
  weight: number;
}[] = [
  { term: "monitor", category: "hardware", weight: 3 },
  { term: "ventilador", category: "hardware", weight: 3 },
  { term: "incubadora", category: "hardware", weight: 3 },
  { term: "bomba", category: "hardware", weight: 3 },
  { term: "desfibrilador", category: "hardware", weight: 3 },
  { term: "ecografo", category: "hardware", weight: 3 },
  { term: "autoclave", category: "hardware", weight: 3 },
  { term: "aspirador", category: "hardware", weight: 3 },
  { term: "camilla", category: "hardware", weight: 2 },
  { term: "computador", category: "hardware", weight: 3 },
  { term: "portatil", category: "hardware", weight: 3 },
  { term: "impresora", category: "hardware", weight: 3 },
  { term: "servidor", category: "red", weight: 2 },
  { term: "aire acondicionado", category: "infraestructura", weight: 3 },
];

/** Señales que elevan la urgencia con independencia de la categoría. */
const URGENCY: readonly WeightedTerm[] = [
  ["paciente", 8],
  ["uci", 10],
  ["urgencias", 9],
  ["neonatologia", 8],
  ["cirugia", 10],
  ["paro", 12],
  ["reanimacion", 10],
  ["riesgo", 7],
  ["quemadura", 10],
  ["descarga electrica", 10],
  ["olor a quemado", 10],
  ["corto circuito", 8],
  ["chispa", 6],
  ["humo", 10],
  ["incendio", 12],
  ["fuga de gas", 12],
  ["oxigeno", 6],
  ["fuera de servicio", 8],
  ["inoperativo", 8],
  ["no enciende", 6],
  ["no funciona", 4],
  ["critico", 5],
  ["urgente", 6],
  ["inmediato", 4],
  ["se apaga", 4],
  ["intermitente", 3],
  ["alarma", 3],
  ["bloqueado", 3],
  ["sin respaldo", 3],
  ["fuga", 8],
  ["vapor", 5],
  ["sin energia", 6],
];

const PREVENTIVE_TERMS: readonly string[] = [
  "mantenimiento preventivo",
  "calibracion",
  "revision programada",
  "limpieza",
  "verificacion",
  "protocolo",
  "rutina",
  "programado",
  "programada",
];

const FAILURE_TERMS: readonly string[] = [
  "falla",
  "no funciona",
  "no enciende",
  "no prende",
  "error",
  "roto",
  "rota",
  "averia",
  "danado",
  "danada",
  "intermitente",
  "urgente",
];

const IMPACT_BASE: Record<Impact, number> = {
  critico: 50,
  alto: 34,
  medio: 18,
  bajo: 5,
};

const CRITICALITY_BONUS: Record<string, number> = {
  alta: 18,
  media: 8,
  baja: 0,
};

const STATUS_BONUS: Record<string, number> = {
  fuera_servicio: 10,
  en_mantenimiento: 4,
};

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matches(text: string, term: string) {
  const needle = normalizeText(term);
  if (!needle) return false;
  return ` ${text} `.includes(` ${needle} `);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function emptyScores(): Record<FailureCategory, number> {
  return CATEGORY_KEYS.reduce(
    (accumulator, key) => {
      accumulator[key] = 0;
      return accumulator;
    },
    {} as Record<FailureCategory, number>,
  );
}

function resolveImpact(value?: string | null): Impact {
  return value === "critico" || value === "alto" || value === "bajo"
    ? value
    : "medio";
}

export function classifyFailure(input: TriageInput): TriageResult {
  const description = normalizeText(input.description ?? "");
  const equipmentText = normalizeText(
    [input.equipment.name, input.equipment.brand, input.equipment.model]
      .filter(Boolean)
      .join(" "),
  );
  const impact = resolveImpact(input.impact);
  const scores = emptyScores();
  const matched: Record<FailureCategory, string[]> = CATEGORY_KEYS.reduce(
    (accumulator, key) => {
      accumulator[key] = [];
      return accumulator;
    },
    {} as Record<FailureCategory, string[]>,
  );

  for (const category of CATEGORY_KEYS) {
    for (const [term, weight] of LEXICON[category]) {
      if (matches(description, term)) {
        scores[category] += weight;
        matched[category].push(term);
      }
    }
  }

  for (const prior of EQUIPMENT_PRIORS) {
    if (matches(equipmentText, prior.term)) {
      scores[prior.category] += prior.weight;
      matched[prior.category].push(prior.term);
    }
  }

  const ranked = CATEGORY_KEYS.map((category) => ({
    category,
    score: scores[category],
  })).sort((a, b) => b.score - a.score);

  const top = ranked[0];
  const second = ranked[1];
  const totalCategoryScore = ranked.reduce(
    (sum, item) => sum + item.score,
    0,
  );

  const category: FailureCategory =
    top.score > 0 ? top.category : "otro";
  const categoryScores = scores;
  const rawCategoryConfidence =
    top.score > 0
      ? 0.55 * (top.score / totalCategoryScore) +
        0.45 * ((top.score - second.score) / Math.max(top.score, 1))
      : 0;
  const categoryConfidence =
    category === "otro"
      ? 0.15
      : clamp(rawCategoryConfidence, 0.05, 0.95);

  const urgencyTerms = URGENCY.filter(([term]) => matches(description, term));
  const urgencyScore = Math.min(
    30,
    urgencyTerms.reduce((sum, [, weight]) => sum + weight, 0),
  );

  const score =
    IMPACT_BASE[impact] +
    (CRITICALITY_BONUS[input.equipment.criticality ?? ""] ?? 0) +
    (STATUS_BONUS[input.equipment.status ?? ""] ?? 0) +
    urgencyScore;

  const priority: Priority = score >= 65 ? "alta" : score >= 32 ? "media" : "baja";
  const margin =
    priority === "alta"
      ? score - 65
      : priority === "media"
        ? Math.min(score - 32, 65 - score)
        : 32 - score;
  const priorityConfidence = clamp(0.55 + (margin / 45) * 0.4, 0.55, 0.97);

  const confidence = Number(
    clamp(0.55 * categoryConfidence + 0.45 * priorityConfidence, 0.05, 0.97).toFixed(
      2,
    ),
  );

  const preventiveSignal = PREVENTIVE_TERMS.some((term) =>
    matches(description, term),
  );
  const failureSignal = FAILURE_TERMS.some((term) =>
    matches(description, term),
  );
  const suggestedType: MaintenanceType =
    preventiveSignal && !failureSignal ? "preventivo" : "correctivo";

  const suggestedDueDays = priority === "alta" ? 1 : priority === "media" ? 3 : 7;
  const baseDate = input.now ?? new Date();
  const dueDate = new Date(
    Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate() + suggestedDueDays,
    ),
  );

  const categoryMeta = failureCategoryMeta(category);
  const uniqueKeywords = Array.from(
    new Set([...matched[category], ...urgencyTerms.map(([term]) => term)]),
  ).slice(0, 6);

  const reasons: string[] = [];

  if (matched[category].length > 0) {
    reasons.push(
      `Coincidencias de ${categoryMeta.label.toLowerCase()}: ${matched[category]
        .slice(0, 3)
        .map((term) => `«${term}»`)
        .join(", ")}.`,
    );
  }

  if (urgencyTerms.length > 0) {
    reasons.push(
      `El relato contiene señales de urgencia: ${urgencyTerms
        .slice(0, 3)
        .map(([term]) => `«${term}»`)
        .join(", ")}.`,
    );
  }

  reasons.push(
    `Impacto declarado: ${impactMeta(impact).label.toLowerCase()}.`,
  );

  if (input.equipment.criticality) {
    reasons.push(
      `Criticidad del equipo en el inventario: ${input.equipment.criticality}.`,
    );
  }

  if (input.equipment.status === "fuera_servicio") {
    reasons.push("El equipo figura fuera de servicio en el inventario.");
  }

  if (suggestedType === "preventivo") {
    reasons.push(
      "El relato describe una actividad programada, por eso se propone una orden preventiva.",
    );
  }

  if (category === "otro" || confidence < 0.55) {
    reasons.push(
      "La confianza es baja: el técnico debe validar la categoría y la prioridad antes de crear la orden.",
    );
  }

  return {
    category,
    categoryLabel: categoryMeta.label,
    categoryDescription: categoryMeta.description ?? "",
    priority,
    priorityLabel: priorityMeta(priority).label,
    impact,
    confidence,
    categoryConfidence: Number(categoryConfidence.toFixed(2)),
    priorityConfidence: Number(priorityConfidence.toFixed(2)),
    score,
    categoryScores,
    keywords: uniqueKeywords,
    reasons,
    suggestedType,
    suggestedDueDays,
    suggestedDueDate: dueDate.toISOString().slice(0, 10),
    needsReview: category === "otro" || confidence < 0.55,
    model: TRIAGE_MODEL,
    source: "heuristic",
  };
}

/**
 * Convierte una respuesta cruda de un modelo externo en una sugerencia válida.
 * Descarta valores fuera del catálogo para no romper el flujo de revisión.
 */
export function normalizeExternalSuggestion(
  value: unknown,
  fallback: TriageResult,
): TriageResult | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const category = record.category;
  const priority = record.priority;

  if (
    typeof category !== "string" ||
    !CATEGORY_KEYS.includes(category as FailureCategory) ||
    typeof priority !== "string" ||
    !["alta", "media", "baja"].includes(priority)
  ) {
    return null;
  }

  const confidenceValue = Number(record.confidence);
  const confidence = Number.isFinite(confidenceValue)
    ? clamp(confidenceValue, 0, 1)
    : fallback.confidence;

  const reasons = Array.isArray(record.reasons)
    ? record.reasons
        .filter((item): item is string => typeof item === "string")
        .slice(0, 4)
    : [];

  const meta = failureCategoryMeta(category);
  return {
    ...fallback,
    category: category as FailureCategory,
    categoryLabel: meta.label,
    categoryDescription: meta.description ?? "",
    priority: priority as Priority,
    priorityLabel: priorityMeta(priority).label,
    confidence: Number(confidence.toFixed(2)),
    reasons: [
      ...reasons,
      `Sugerencia enriquecida por un modelo de lenguaje (${fallback.model}).`,
    ],
    needsReview: confidence < 0.55 || category === "otro",
    model: fallback.model,
    source: "llm",
  };
}
