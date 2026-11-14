import { classifyFailure } from "@/lib/ai/triage";
import type { TriageInput, TriageResult } from "@/lib/ai/triage";
import { enrichWithLLM } from "@/lib/ai/llm";

/**
 * Punto de entrada del triaje. Ejecuta el clasificador local y, si existe una
 * clave configurada, contrasta el resultado con un modelo de lenguaje.
 */
export async function analyzeFailure(
  input: TriageInput,
): Promise<TriageResult> {
  const heuristic = classifyFailure(input);
  if (!process.env.AI_LLM_API_KEY?.trim()) return heuristic;
  return enrichWithLLM(input, heuristic);
}

/** Interpreta los campos JSON persistidos en el reporte sin romper la vista. */
export function parseStoredJson<T>(value: string | null | undefined, fallback: T) {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
