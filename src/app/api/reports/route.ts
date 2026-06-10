import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startOfDay, subDays, format } from "date-fns";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") ?? "weekly";

  const now = new Date();
  const since = range === "daily"
    ? startOfDay(now)
    : startOfDay(subDays(now, 6));

  // Revenue per day/hour
  type RevenueRow = { label: string; amount: string };
  let revenue: RevenueRow[];

  if (range === "daily") {
    revenue = await prisma.$queryRaw<RevenueRow[]>`
      SELECT
        to_char(date_trunc('hour', "paidAt"), 'HH12:MI AM') as label,
        COALESCE(SUM("totalAmount"), 0)::text as amount
      FROM "Sale"
      WHERE status = 'PAID' AND "paidAt" >= ${since}
      GROUP BY date_trunc('hour', "paidAt")
      ORDER BY date_trunc('hour', "paidAt")
    `;
  } else {
    revenue = await prisma.$queryRaw<RevenueRow[]>`
      SELECT
        to_char(date_trunc('day', "paidAt"), 'Mon DD') as label,
        COALESCE(SUM("totalAmount"), 0)::text as amount
      FROM "Sale"
      WHERE status = 'PAID' AND "paidAt" >= ${since}
      GROUP BY date_trunc('day', "paidAt")
      ORDER BY date_trunc('day', "paidAt")
    `;
  }

  // Top items
  type TopItem = { name: string; count: string };
  const topItems = await prisma.$queryRaw<TopItem[]>`
    SELECT mi.name, SUM(si.quantity)::text as count
    FROM "SaleItem" si
    JOIN "MenuItem" mi ON si."menuItemId" = mi.id
    JOIN "Sale" s ON si."saleId" = s.id
    WHERE s."createdAt" >= ${since}
    GROUP BY mi.name
    ORDER BY SUM(si.quantity) DESC
    LIMIT 8
  `;

  // Totals
  const totals = await prisma.sale.aggregate({
    where: { status: "PAID", paidAt: { gte: since } },
    _sum: { totalAmount: true },
    _count: { id: true },
  });

  return NextResponse.json({
    revenue: revenue.map((r) => ({ label: r.label, amount: parseFloat(r.amount) })),
    topItems: topItems.map((t) => ({ name: t.name, count: parseInt(t.count) })),
    totalRevenue: Number(totals._sum.totalAmount ?? 0),
    totalSales: totals._count.id,
  });
}
