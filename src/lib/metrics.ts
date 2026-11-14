/**
 * Indicadores de mantenimiento (RF-08).
 *
 * MTTR: tiempo medio de reparación de las órdenes correctivas cerradas,
 * expresado en horas. Se calcula como el promedio de `closedAt - openedAt`.
 *
 * MTBF: tiempo medio entre fallas, expresado en días. Para cada equipo se
 * toman las fechas de las intervenciones correctivas registradas en la hoja de
 * vida y se promedian los intervalos entre fallas consecutivas. El resultado
 * global promedia los equipos con al menos dos fallas.
 */

export type OrderTiming = {
  type: string;
  status: string;
  openedAt: Date;
  closedAt: Date | null;
};

export type FailureEvent = {
  equipmentId: number;
  date: Date;
};

const DAY_MS = 86_400_000;

export function computeMttrHours(orders: OrderTiming[]): number | null {
  const durations = orders
    .filter(
      (order) =>
        order.type === "correctivo" &&
        order.status === "cerrada" &&
        order.closedAt instanceof Date,
    )
    .map((order) => {
      const end = (order.closedAt as Date).getTime();
      const start = order.openedAt.getTime();
      return end >= start ? (end - start) / 3_600_000 : null;
    })
    .filter((value): value is number => value !== null && Number.isFinite(value));

  if (durations.length === 0) return null;
  return Number(
    (durations.reduce((sum, value) => sum + value, 0) / durations.length).toFixed(1),
  );
}

export type MtbfResult = {
  days: number | null;
  failures: number;
  equipmentWithFailures: number;
  equipmentAnalyzed: number;
};

export function computeMtbfDays(events: FailureEvent[]): MtbfResult {
  const byEquipment = new Map<number, number[]>();

  for (const event of events) {
    if (!(event.date instanceof Date) || Number.isNaN(event.date.getTime())) {
      continue;
    }
    const list = byEquipment.get(event.equipmentId) ?? [];
    list.push(event.date.getTime());
    byEquipment.set(event.equipmentId, list);
  }

  const gaps: number[] = [];
  let equipmentAnalyzed = 0;

  for (const timestamps of byEquipment.values()) {
    if (timestamps.length < 2) continue;
    const sorted = [...timestamps].sort((a, b) => a - b);
    equipmentAnalyzed += 1;
    for (let index = 1; index < sorted.length; index += 1) {
      const gap = (sorted[index] - sorted[index - 1]) / DAY_MS;
      if (gap >= 0) gaps.push(gap);
    }
  }

  return {
    days:
      gaps.length > 0
        ? Number(
            (gaps.reduce((sum, value) => sum + value, 0) / gaps.length).toFixed(1),
          )
        : null,
    failures: events.length,
    equipmentWithFailures: byEquipment.size,
    equipmentAnalyzed,
  };
}

/** Tasa de aceptación de las sugerencias de IA sobre reportes ya revisados. */
export function computeAcceptanceRate(
  reports: Array<{ decision: string | null }>,
): number | null {
  const decided = reports.filter(
    (report) => report.decision === "aceptada" || report.decision === "ajustada",
  );
  if (decided.length === 0) return null;
  const accepted = decided.filter((report) => report.decision === "aceptada").length;
  return Math.round((accepted / decided.length) * 100);
}
