import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  failureCategoryMeta,
  impactMeta,
  priorityMeta,
  reportStatusMeta,
} from "@/lib/labels";
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

  const reports = await prisma.failureReport.findMany({
    include: {
      equipment: true,
      reporter: true,
      reviewedBy: true,
      workOrder: { select: { code: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  const header = [
    "Codigo",
    "Equipo",
    "Codigo equipo",
    "Ubicacion",
    "Reportante",
    "Impacto",
    "Descripcion",
    "Categoria IA",
    "Prioridad IA",
    "Confianza IA",
    "Fuente IA",
    "Modelo IA",
    "Estado",
    "Decision",
    "Categoria final",
    "Prioridad final",
    "Revisor",
    "Fecha revision",
    "Nota revision",
    "Orden generada",
    "Fecha creacion",
  ];

  const rows = reports.map((report) => [
    report.code,
    report.equipment.name,
    report.equipment.code,
    report.equipment.location,
    report.reporter?.name ?? "Sin reportante",
    impactMeta(report.impact).label,
    report.description,
    failureCategoryMeta(report.aiCategory).label,
    priorityMeta(report.aiPriority).label,
    `${Math.round(report.aiConfidence * 100)}%`,
    report.aiSource === "llm" ? "Híbrido (local + LLM)" : "Heurístico local",
    report.aiModel,
    reportStatusMeta(report.status).label,
    report.decision ? reportStatusMeta(report.decision).label : "Sin decisión",
    report.finalCategory
      ? failureCategoryMeta(report.finalCategory).label
      : "",
    report.finalPriority ? priorityMeta(report.finalPriority).label : "",
    report.reviewedBy?.name ?? "",
    iso(report.reviewedAt),
    report.reviewNotes ?? "",
    report.workOrder?.code ?? "",
    iso(report.createdAt),
  ]);

  const csv = `\uFEFF${[header, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n")}`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reportes-falla-vigia.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
