import { prisma } from "@/lib/prisma";

/** Códigos consecutivos por año: OT-2026-0001 / RP-2026-0001. */
async function nextCode(prefix: string, lastCode: string | undefined) {
  const sequence = lastCode ? Number(lastCode.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(Number.isFinite(sequence) ? sequence : 1).padStart(4, "0")}`;
}

export async function nextOrderCode() {
  const prefix = `OT-${new Date().getUTCFullYear()}-`;
  const last = await prisma.workOrder.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  return nextCode(prefix, last?.code);
}

export async function nextReportCode() {
  const prefix = `RP-${new Date().getUTCFullYear()}-`;
  const last = await prisma.failureReport.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  return nextCode(prefix, last?.code);
}
