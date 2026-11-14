import { describe, expect, it } from "vitest";
import { classifyFailure } from "@/lib/ai/triage";

const monitor = {
  name: "Monitor de signos vitales",
  criticality: "alta",
  status: "operativo",
  location: "UCI Pediátrica",
  brand: "Mindray",
  model: "uMEC12",
};

describe("classifyFailure", () => {
  it("clasifica una falla de encendido como hardware y prioridad alta", () => {
    const result = classifyFailure({
      description:
        "El monitor no enciende desde esta mañana y el paciente requiere monitoreo continuo.",
      impact: "critico",
      equipment: monitor,
    });

    expect(result.category).toBe("hardware");
    expect(result.priority).toBe("alta");
    expect(result.suggestedType).toBe("correctivo");
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.keywords).toContain("no enciende");
  });

  it("detecta problemas de red y sincronización", () => {
    const result = classifyFailure({
      description:
        "El equipo no sincroniza con el servidor y la conexión wifi se desconecta de forma intermitente.",
      impact: "medio",
      equipment: {
        name: "Ecógrafo",
        criticality: "media",
        status: "operativo",
      },
    });

    expect(result.category).toBe("red");
    expect(result.categoryScores.red).toBeGreaterThan(
      result.categoryScores.software,
    );
  });

  it("reconoce riesgos eléctricos", () => {
    const result = classifyFailure({
      description:
        "Hay olor a quemado y una chispa en el toma corriente del servicio.",
      impact: "alto",
      equipment: {
        name: "Incubadora neonatal",
        criticality: "alta",
        status: "operativo",
      },
    });

    expect(result.category).toBe("electrico");
    expect(result.priority).toBe("alta");
  });

  it("clasifica consumibles agotados", () => {
    const result = classifyFailure({
      description:
        "Se agotó el set de infusión y no hay stock del insumo en el servicio.",
      impact: "medio",
      equipment: {
        name: "Bomba de infusión",
        criticality: "media",
        status: "operativo",
      },
    });

    expect(result.category).toBe("consumible");
  });

  it("clasifica licencias y errores de software", () => {
    const result = classifyFailure({
      description:
        "La aplicación muestra un error de licencia y el módulo del sistema no guarda los datos.",
      impact: "medio",
      equipment: {
        name: "Computador de estación clínica",
        criticality: "baja",
        status: "operativo",
      },
    });

    expect(result.category).toBe("software");
  });

  it("propone una orden preventiva para actividades programadas", () => {
    const result = classifyFailure({
      description:
        "Se solicita limpieza y calibración programada del equipo, sin fallas reportadas.",
      impact: "bajo",
      equipment: {
        name: "Lámpara de fototerapia",
        criticality: "baja",
        status: "operativo",
      },
    });

    expect(result.suggestedType).toBe("preventivo");
    expect(result.priority).toBe("baja");
  });

  it("marca como revisable un relato sin señales suficientes", () => {
    const result = classifyFailure({
      description: "Novedad general del servicio, sin más información.",
      impact: "bajo",
      equipment: { name: "Equipo sin nombre técnico", criticality: "baja" },
    });

    expect(result.category).toBe("otro");
    expect(result.needsReview).toBe(true);
    expect(result.confidence).toBeLessThan(0.55);
  });

  it("es determinista y calcula el vencimiento según la prioridad", () => {
    const input = {
      description:
        "El ventilador mecánico se apaga de forma intermitente en UCI.",
      impact: "alto" as const,
      equipment: monitor,
      now: new Date("2026-11-14T12:00:00.000Z"),
    };

    const first = classifyFailure(input);
    const second = classifyFailure(input);

    expect(first).toEqual(second);
    expect(first.suggestedDueDate).toBe(
      first.priority === "alta"
        ? "2026-11-15"
        : first.priority === "media"
          ? "2026-11-17"
          : "2026-11-21",
    );
  });
});
