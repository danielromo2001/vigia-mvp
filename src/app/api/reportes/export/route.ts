import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { orderStatusMeta, orderTypeMeta } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

function escapeCsv(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function iso(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const orders = await prisma.workOrder.findMany({
    include: { equipment: true, responsible: true },
    orderBy: [{ openedAt: "desc" }, { id: "desc" }],
  });

  const header = [
    "Codigo",
    "Equipo",
    "Codigo equipo",
    "Ubicacion",
    "Tipo",
    "Prioridad",
    "Estado",
    "Responsable",
    "Fecha apertura",
    "Fecha estimada",
    "Fecha cierre",
    "Descripcion",
    "Observaciones",
  ];

  const rows = orders.map((order) => [
    order.code,
    order.equipment.name,
    order.equipment.code,
    order.equipment.location,
    orderTypeMeta(order.type).label,
    order.priority,
    orderStatusMeta(order.status).label,
    order.responsible?.name ?? "Sin asignar",
    iso(order.openedAt),
    iso(order.dueDate),
    iso(order.closedAt),
    order.description,
    order.observations ?? "",
  ]);

  const csv = `\uFEFF${[header, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n")}`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reporte-ordenes-vigia.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
