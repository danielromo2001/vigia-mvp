"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { analyzeFailure } from "@/lib/ai/service";
import type { TriageResult } from "@/lib/ai/triage";
import { requireReporter, requireStaff, requireUser } from "@/lib/auth";
import { nextOrderCode, nextReportCode } from "@/lib/codes";
import type { FormState } from "@/lib/form-types";
import { failureCategories, priorities } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

const CATEGORY_VALUES = failureCategories.map((category) => category.value);
const PRIORITY_VALUES = priorities.map((priority) => priority.value);
const IMPACT_VALUES = ["critico", "alto", "medio", "bajo"];

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function dueDateFor(priority: string) {
  const days = priority === "alta" ? 1 : priority === "media" ? 3 : 7;
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

export async function createFailureReport(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireReporter();

  const equipmentId = Number(formData.get("equipmentId"));
  const description = text(formData, "description");
  const impact = text(formData, "impact") || "medio";

  if (!Number.isInteger(equipmentId) || equipmentId <= 0) {
    return { error: "Selecciona el equipo afectado." };
  }
  if (description.length < 15) {
    return {
      error:
        "Describe la falla con al menos 15 caracteres para que el triaje tenga contexto.",
    };
  }
  if (!IMPACT_VALUES.includes(impact)) {
    return { error: "Selecciona un nivel de impacto válido." };
  }

  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
  });
  if (!equipment) return { error: "El equipo seleccionado no existe." };

  const suggestion = await analyzeFailure({
    description,
    impact,
    equipment: {
      name: equipment.name,
      criticality: equipment.criticality,
      status: equipment.status,
      location: equipment.location,
      brand: equipment.brand,
      model: equipment.model,
    },
  });

  let reportId: number;
  try {
    const code = await nextReportCode();
    const report = await prisma.failureReport.create({
      data: {
        code,
        equipmentId,
        reporterId: user.id,
        description,
        impact,
        aiCategory: suggestion.category,
        aiPriority: suggestion.priority,
        aiConfidence: suggestion.confidence,
        aiScores: JSON.stringify(suggestion.categoryScores),
        aiKeywords: JSON.stringify(suggestion.keywords),
        aiReasons: JSON.stringify(suggestion.reasons),
        aiSuggestedType: suggestion.suggestedType,
        aiSuggestedDueDate: new Date(`${suggestion.suggestedDueDate}T12:00:00.000Z`),
        aiModel: suggestion.model,
        aiSource: suggestion.source,
      },
    });
    reportId = report.id;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "No fue posible generar el consecutivo. Intenta de nuevo." };
    }
    return { error: "No fue posible registrar el reporte. Intenta de nuevo." };
  }

  revalidatePath("/reportes-falla");
  revalidatePath("/panel");
  revalidatePath(`/equipos/${equipmentId}`);
  redirect(`/reportes-falla/${reportId}`);
}

export type TriageSuggestionResponse =
  | { ok: true; suggestion: TriageResult }
  | { ok: false; error: string };

/**
 * Sugerencia en vivo para el formulario de órdenes y de reportes.
 * No persiste nada: el técnico decide si la aplica.
 */
export async function suggestTriage(input: {
  equipmentId: number;
  description: string;
  impact?: string;
}): Promise<TriageSuggestionResponse> {
  await requireUser();

  const description = (input.description ?? "").trim();
  const equipmentId = Number(input.equipmentId);

  if (!Number.isInteger(equipmentId) || equipmentId <= 0) {
    return { ok: false, error: "Selecciona primero el equipo afectado." };
  }
  if (description.length < 15) {
    return {
      ok: false,
      error: "Agrega al menos 15 caracteres de descripción para analizar la falla.",
    };
  }

  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
  });
  if (!equipment) return { ok: false, error: "El equipo ya no existe." };

  const suggestion = await analyzeFailure({
    description,
    impact: IMPACT_VALUES.includes(input.impact ?? "")
      ? (input.impact as string)
      : "medio",
    equipment: {
      name: equipment.name,
      criticality: equipment.criticality,
      status: equipment.status,
      location: equipment.location,
      brand: equipment.brand,
      model: equipment.model,
    },
  });

  return { ok: true, suggestion };
}

export async function reviewFailureReport(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireStaff();

  const id = Number(formData.get("id"));
  const decision = text(formData, "decision");
  const reviewNotes = text(formData, "reviewNotes") || null;
  const requestedCategory = text(formData, "finalCategory");
  const requestedPriority = text(formData, "finalPriority");

  if (!Number.isInteger(id) || id <= 0) {
    return { error: "Reporte no válido." };
  }
  if (!["aceptar", "ajustar", "descartar"].includes(decision)) {
    return { error: "Selecciona una decisión de triaje." };
  }
  if (
    decision === "ajustar" &&
    (!CATEGORY_VALUES.includes(requestedCategory) ||
      !PRIORITY_VALUES.includes(requestedPriority))
  ) {
    return { error: "Selecciona la categoría y la prioridad definitivas." };
  }

  const report = await prisma.failureReport.findUnique({ where: { id } });
  if (!report) return { error: "El reporte ya no existe." };
  if (report.status === "convertida") {
    return { error: "Este reporte ya fue convertido en una orden de trabajo." };
  }

  const finalCategory =
    decision === "descartar"
      ? null
      : decision === "aceptar"
        ? report.aiCategory
        : requestedCategory;
  const finalPriority =
    decision === "descartar"
      ? null
      : decision === "aceptar"
        ? report.aiPriority
        : requestedPriority;

  await prisma.failureReport.update({
    where: { id },
    data: {
      status:
        decision === "descartar"
          ? "descartada"
          : decision === "aceptar"
            ? "aceptada"
            : "ajustada",
      decision:
        decision === "descartar"
          ? "descartada"
          : decision === "aceptar"
            ? "aceptada"
            : "ajustada",
      finalCategory,
      finalPriority,
      reviewNotes,
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/reportes-falla");
  revalidatePath(`/reportes-falla/${id}`);
  revalidatePath("/panel");
  redirect(`/reportes-falla/${id}`);
}

export async function convertReportToWorkOrder(formData: FormData) {
  const user = await requireStaff();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) redirect("/reportes-falla");

  const report = await prisma.failureReport.findUnique({ where: { id } });
  if (!report) redirect("/reportes-falla");

  if (report.workOrderId) {
    redirect(`/ordenes/${report.workOrderId}`);
  }
  if (report.status === "descartada") {
    redirect(`/reportes-falla/${id}?error=descartada`);
  }

  const category = CATEGORY_VALUES.includes(report.finalCategory ?? "")
    ? (report.finalCategory as string)
    : report.aiCategory;
  const priority = PRIORITY_VALUES.includes(report.finalPriority ?? "")
    ? (report.finalPriority as string)
    : report.aiPriority;
  const type = ["preventivo", "correctivo"].includes(report.aiSuggestedType)
    ? report.aiSuggestedType
    : "correctivo";

  let orderId: number;
  try {
    const code = await nextOrderCode();
    orderId = await prisma.$transaction(async (tx) => {
      const order = await tx.workOrder.create({
        data: {
          code,
          equipmentId: report.equipmentId,
          type,
          category,
          priority,
          status: "abierta",
          responsibleId: user.id,
          description: report.description,
          observations: `Generado desde el reporte ${report.code}.`,
          dueDate: dueDateFor(priority),
          aiAssisted: true,
          aiConfidence: report.aiConfidence,
        },
      });

      await tx.failureReport.update({
        where: { id },
        data: {
          workOrderId: order.id,
          status: "convertida",
          decision: report.decision ?? "aceptada",
          finalCategory: category,
          finalPriority: priority,
          reviewedById: report.reviewedById ?? user.id,
          reviewedAt: report.reviewedAt ?? new Date(),
        },
      });

      return order.id;
    });
  } catch {
    redirect(`/reportes-falla/${id}?error=conversion`);
  }

  revalidatePath("/reportes-falla");
  revalidatePath(`/reportes-falla/${id}`);
  revalidatePath("/ordenes");
  revalidatePath("/panel");
  revalidatePath(`/equipos/${report.equipmentId}`);
  redirect(`/ordenes/${orderId}`);
}
