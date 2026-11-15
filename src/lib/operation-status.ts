export type OperationLevel = "estable" | "atencion" | "critico";

export type OperationStatus = {
  level: OperationLevel;
  label: string;
  detail: string;
  tone: "emerald" | "amber" | "rose";
};

/**
 * Resume el estado de la operación para la píldora del encabezado y la tarjeta
 * lateral. La jerarquía es: crítico > atención > estable.
 */
export function operationStatus(input: {
  criticalDown: number;
  overduePlans: number;
  overdueOrders: number;
  pendingReports: number;
  lowStock: number;
}): OperationStatus {
  const { criticalDown, overduePlans, overdueOrders, pendingReports, lowStock } =
    input;

  if (criticalDown > 0) {
    return {
      level: "critico",
      label: "Operación crítica",
      detail: `${criticalDown} ${
        criticalDown === 1 ? "equipo crítico fuera de servicio" : "equipos críticos fuera de servicio"
      }`,
      tone: "rose",
    };
  }

  const alerts = overduePlans + overdueOrders + pendingReports + lowStock;
  if (alerts > 0) {
    const parts: string[] = [];
    if (overdueOrders > 0) {
      parts.push(
        `${overdueOrders} ${overdueOrders === 1 ? "orden vencida" : "órdenes vencidas"}`,
      );
    }
    if (overduePlans > 0) {
      parts.push(
        `${overduePlans} ${overduePlans === 1 ? "preventivo vencido" : "preventivos vencidos"}`,
      );
    }
    if (pendingReports > 0) {
      parts.push(
        `${pendingReports} ${pendingReports === 1 ? "reporte por triar" : "reportes por triar"}`,
      );
    }
    if (lowStock > 0) {
      parts.push(
        `${lowStock} ${lowStock === 1 ? "repuesto bajo" : "repuestos bajos"}`,
      );
    }
    return {
      level: "atencion",
      label: "Atención prioritaria",
      detail: parts.slice(0, 2).join(" · "),
      tone: "amber",
    };
  }

  return {
    level: "estable",
    label: "Operación estable",
    detail: "Sin alertas abiertas",
    tone: "emerald",
  };
}
