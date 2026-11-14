import type { TriageInput, TriageResult } from "@/lib/ai/triage";
import { normalizeExternalSuggestion } from "@/lib/ai/triage";
import { failureCategories } from "@/lib/labels";

/**
 * Enriquecimiento opcional con un modelo de lenguaje.
 *
 * Solo se ejecuta si el administrador configura `AI_LLM_API_KEY`. El
 * clasificador local sigue siendo la línea base: si el proveedor falla, tarda
 * demasiado o devuelve valores fuera del catálogo, se devuelve la sugerencia
 * heurística sin interrumpir el registro del reporte.
 *
 * Nota de privacidad: al activarlo, la descripción del reporte se envía al
 * proveedor configurado. No debe contener datos identificables del paciente.
 */

const VALID_CATEGORIES = failureCategories.map((category) => category.value);

function timeout(ms: number) {
  return AbortSignal.timeout(ms);
}

export async function enrichWithLLM(
  input: TriageInput,
  heuristic: TriageResult,
): Promise<TriageResult> {
  const apiKey = process.env.AI_LLM_API_KEY?.trim();
  if (!apiKey) return heuristic;

  const baseUrl = (
    process.env.AI_LLM_BASE_URL?.trim() || "https://api.openai.com/v1"
  ).replace(/\/+$/, "");
  const model = process.env.AI_LLM_MODEL?.trim() || "gpt-4o-mini";

  const prompt = [
    "Clasifica el siguiente reporte de falla de un equipo biomédico hospitalario.",
    "Devuelve exclusivamente un objeto JSON con las claves: category, priority, confidence y reasons.",
    `category debe ser una de: ${VALID_CATEGORIES.join(", ")}.`,
    "priority debe ser una de: alta, media, baja.",
    "confidence es un número entre 0 y 1.",
    "reasons es un arreglo de máximo 3 frases cortas en español que expliquen la decisión.",
    "",
    `Equipo: ${input.equipment.name}`,
    `Criticidad: ${input.equipment.criticality ?? "sin dato"}`,
    `Estado: ${input.equipment.status ?? "sin dato"}`,
    `Impacto declarado: ${input.impact ?? "medio"}`,
    `Descripción: ${input.description}`,
  ].join("\n");

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Eres un ingeniero biomédico experto en triaje de mantenimiento hospitalario. Respondes solo con JSON válido.",
          },
          { role: "user", content: prompt },
        ],
      }),
      signal: timeout(4_500),
      cache: "no-store",
    });

    if (!response.ok) return heuristic;

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return heuristic;

    const parsed = normalizeExternalSuggestion(JSON.parse(content), heuristic);
    if (!parsed) return heuristic;

    return {
      ...parsed,
      model: `${heuristic.model}+${model}`,
    };
  } catch {
    return heuristic;
  }
}
