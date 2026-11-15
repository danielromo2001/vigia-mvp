import { describe, expect, it } from "vitest";
import {
  formatCompactCop,
  formatDuration,
  orderSla,
  stockLevel,
} from "@/lib/labels";
import { operationStatus } from "@/lib/operation-status";

describe("stockLevel", () => {
  it("marca como agotado cuando no hay existencias", () => {
    const level = stockLevel(0, 4);
    expect(level.status).toBe("agotado");
    expect(level.tone).toBe("rose");
    expect(level.ratio).toBe(0);
    expect(level.deficit).toBe(4);
  });

  it("clasifica stock crítico por debajo de la mitad del mínimo", () => {
    const level = stockLevel(3, 10);
    expect(level.status).toBe("critico");
    expect(level.ratio).toBe(30);
    expect(level.deficit).toBe(7);
  });

  it("clasifica stock bajo entre la mitad y el mínimo", () => {
    const level = stockLevel(8, 10);
    expect(level.status).toBe("bajo");
    expect(level.tone).toBe("amber");
    expect(level.deficit).toBe(2);
  });

  it("marca adecuado y limita el ratio al 100%", () => {
    const level = stockLevel(15, 10);
    expect(level.status).toBe("adecuado");
    expect(level.ratio).toBe(100);
    expect(level.deficit).toBe(0);
  });

  it("tolera un mínimo en cero sin dividir por cero", () => {
    const level = stockLevel(2, 0);
    expect(level.status).toBe("adecuado");
    expect(level.ratio).toBe(100);
  });
});

describe("orderSla", () => {
  const now = new Date("2026-11-14T12:00:00.000Z");

  it("no calcula SLA si la orden no tiene fecha compromiso", () => {
    expect(orderSla({ dueDate: null, status: "abierta" }, now)).toBeNull();
  });

  it("no cuenta regresiva en órdenes cerradas o canceladas", () => {
    expect(
      orderSla({ dueDate: "2026-11-10T12:00:00.000Z", status: "cerrada" }, now),
    ).toMatchObject({ tone: "slate", breached: false, label: "Fuera de SLA" });
  });

  it("marca vencida cuando la fecha compromiso ya pasó", () => {
    const sla = orderSla(
      { dueDate: "2026-11-14T06:00:00.000Z", status: "en_proceso" },
      now,
    );
    expect(sla).not.toBeNull();
    expect(sla?.breached).toBe(true);
    expect(sla?.tone).toBe("rose");
    expect(sla?.label).toContain("Vencida");
  });

  it("usa tono ámbar cuando restan 24 horas o menos", () => {
    const sla = orderSla(
      { dueDate: "2026-11-15T06:00:00.000Z", status: "abierta" },
      now,
    );
    expect(sla?.tone).toBe("amber");
    expect(sla?.breached).toBe(false);
    expect(sla?.label).toBe("Restan 18 h");
  });

  it("usa tono verde cuando aún hay holgura", () => {
    const sla = orderSla(
      { dueDate: "2026-11-16T12:00:00.000Z", status: "abierta" },
      now,
    );
    expect(sla?.tone).toBe("emerald");
    expect(sla?.hours).toBe(48);
  });
});

describe("formatDuration", () => {
  it("expresa minutos cuando es menor a una hora", () => {
    expect(formatDuration(0.5)).toBe("30 min");
  });

  it("combina horas y minutos", () => {
    expect(formatDuration(2.5)).toBe("2 h 30 min");
  });

  it("pasa a días cuando supera 24 horas", () => {
    expect(formatDuration(30)).toBe("1 d 6 h");
  });
});

describe("formatCompactCop", () => {
  it("compacta millones de pesos", () => {
    expect(formatCompactCop(1_500_000)).toBe("$1.5 M COP");
  });

  it("compacta miles de pesos", () => {
    expect(formatCompactCop(45_000)).toBe("$45 K COP");
  });
});

describe("operationStatus", () => {
  const base = {
    criticalDown: 0,
    overduePlans: 0,
    overdueOrders: 0,
    pendingReports: 0,
    lowStock: 0,
  };

  it("declara operación estable sin alertas", () => {
    expect(operationStatus(base)).toMatchObject({
      level: "estable",
      tone: "emerald",
      label: "Operación estable",
    });
  });

  it("prioriza el estado crítico por equipos de alta criticidad caídos", () => {
    const status = operationStatus({
      ...base,
      criticalDown: 2,
      overdueOrders: 5,
    });
    expect(status.level).toBe("critico");
    expect(status.tone).toBe("rose");
    expect(status.detail).toContain("2 equipos críticos");
  });

  it("resume las alertas cuando no hay equipos críticos caídos", () => {
    const status = operationStatus({
      ...base,
      overdueOrders: 1,
      overduePlans: 2,
      pendingReports: 3,
      lowStock: 4,
    });
    expect(status.level).toBe("atencion");
    expect(status.tone).toBe("amber");
    expect(status.detail).toContain("1 orden vencida");
    expect(status.detail).toContain("2 preventivos vencidos");
  });
});
