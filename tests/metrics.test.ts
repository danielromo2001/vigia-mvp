import { describe, expect, it } from "vitest";
import {
  computeAcceptanceRate,
  computeMtbfDays,
  computeMttrHours,
} from "@/lib/metrics";

const day = 86_400_000;

describe("computeMttrHours", () => {
  it("promedia solo órdenes correctivas cerradas", () => {
    const result = computeMttrHours([
      {
        type: "correctivo",
        status: "cerrada",
        openedAt: new Date("2026-11-01T08:00:00.000Z"),
        closedAt: new Date("2026-11-01T12:00:00.000Z"),
      },
      {
        type: "correctivo",
        status: "cerrada",
        openedAt: new Date("2026-11-02T08:00:00.000Z"),
        closedAt: new Date("2026-11-02T14:00:00.000Z"),
      },
      {
        type: "preventivo",
        status: "cerrada",
        openedAt: new Date("2026-11-03T08:00:00.000Z"),
        closedAt: new Date("2026-11-03T20:00:00.000Z"),
      },
      {
        type: "correctivo",
        status: "abierta",
        openedAt: new Date("2026-11-04T08:00:00.000Z"),
        closedAt: null,
      },
    ]);

    expect(result).toBe(5);
  });

  it("devuelve null cuando no hay correctivos cerrados", () => {
    expect(
      computeMttrHours([
        {
          type: "correctivo",
          status: "abierta",
          openedAt: new Date(),
          closedAt: null,
        },
      ]),
    ).toBeNull();
  });
});

describe("computeMtbfDays", () => {
  it("promedia los intervalos entre fallas del mismo equipo", () => {
    const result = computeMtbfDays([
      { equipmentId: 1, date: new Date("2026-01-01T12:00:00.000Z") },
      { equipmentId: 1, date: new Date("2026-01-11T12:00:00.000Z") },
      { equipmentId: 1, date: new Date("2026-01-31T12:00:00.000Z") },
      { equipmentId: 2, date: new Date("2026-02-01T12:00:00.000Z") },
    ]);

    expect(result.days).toBe(15);
    expect(result.failures).toBe(4);
    expect(result.equipmentWithFailures).toBe(2);
    expect(result.equipmentAnalyzed).toBe(1);
  });

  it("ignora equipos con una sola falla y fechas inválidas", () => {
    const result = computeMtbfDays([
      { equipmentId: 3, date: new Date("2026-01-01T12:00:00.000Z") },
      { equipmentId: 4, date: new Date("fecha inválida") },
    ]);

    expect(result.days).toBeNull();
    expect(result.equipmentAnalyzed).toBe(0);
  });

  it("calcula correctamente un intervalo de un día", () => {
    const result = computeMtbfDays([
      { equipmentId: 5, date: new Date(Date.UTC(2026, 0, 1)) },
      { equipmentId: 5, date: new Date(Date.UTC(2026, 0, 1) + day) },
    ]);

    expect(result.days).toBe(1);
  });
});

describe("computeAcceptanceRate", () => {
  it("considera aceptadas y ajustadas, sin contar pendientes ni descartadas", () => {
    expect(
      computeAcceptanceRate([
        { decision: "aceptada" },
        { decision: "ajustada" },
        { decision: "aceptada" },
        { decision: "descartada" },
        { decision: null },
      ]),
    ).toBe(67);
  });

  it("devuelve null si aún no hay decisiones", () => {
    expect(computeAcceptanceRate([{ decision: null }])).toBeNull();
  });
});
