import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { formatLongDate } from "@/lib/labels";
import { operationStatus } from "@/lib/operation-status";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const today = new Date();

  const [overduePlans, overdueOrders, pendingReports, criticalDown, spareParts] =
    await Promise.all([
      prisma.preventivePlan.count({
        where: { active: true, nextDate: { lt: today } },
      }),
      prisma.workOrder.count({
        where: {
          status: { in: ["abierta", "en_proceso"] },
          dueDate: { lt: today },
        },
      }),
      prisma.failureReport.count({ where: { status: "pendiente" } }),
      prisma.equipment.count({
        where: { status: "fuera_servicio", criticality: "alta" },
      }),
      prisma.sparePart.findMany({
        where: { active: true },
        select: { stock: true, minStock: true },
      }),
    ]);

  const lowStockCount = spareParts.filter(
    (part) => part.stock < part.minStock,
  ).length;

  const operation = operationStatus({
    criticalDown,
    overduePlans,
    overdueOrders,
    pendingReports,
    lowStock: lowStockCount,
  });

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        role: { name: user.role.name, label: user.role.label },
      }}
      alertCount={overduePlans + overdueOrders}
      reportCount={pendingReports}
      lowStockCount={lowStockCount}
      operation={operation}
      todayLabel={formatLongDate(today)}
    >
      {children}
    </AppShell>
  );
}
