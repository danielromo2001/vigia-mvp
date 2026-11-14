import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { formatLongDate } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const today = new Date();

  const [overduePlans, overdueOrders, pendingReports] = await Promise.all([
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
  ]);

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        role: { name: user.role.name, label: user.role.label },
      }}
      alertCount={overduePlans + overdueOrders}
      reportCount={pendingReports}
      todayLabel={formatLongDate(today)}
    >
      {children}
    </AppShell>
  );
}
