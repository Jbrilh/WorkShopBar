import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { subDays } from "date-fns";

function businessDayStart(date: Date): Date {
  const d = new Date(date);
  // Bar closes at 6am — if before 6am, the business day started yesterday at 6am
  if (d.getHours() < 6) d.setDate(d.getDate() - 1);
  d.setHours(6, 0, 0, 0);
  return d;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") ?? "weekly";

  const now = new Date();
  const todayStart = businessDayStart(now);
  const since = range === "daily"
    ? todayStart
    : businessDayStart(subDays(now, 6));

  // Revenue = cash collected (amountPaid), grouped by service date (createdAt)
  type RevenueRow = { label: string; amount: string };
  let revenue: RevenueRow[];

  if (range === "daily") {
    revenue = await prisma.$queryRaw<RevenueRow[]>`
      SELECT
        to_char(date_trunc('hour', "createdAt"), 'HH12:MI AM') as label,
        COALESCE(SUM("amount"), 0)::text as amount
      FROM "Payment"
      WHERE "createdAt" >= ${since}
      GROUP BY date_trunc('hour', "createdAt")
      ORDER BY date_trunc('hour', "createdAt")
    `;
  } else {
    revenue = await prisma.$queryRaw<RevenueRow[]>`
      SELECT
        to_char(date_trunc('day', "createdAt"), 'Mon DD') as label,
        COALESCE(SUM("amount"), 0)::text as amount
      FROM "Payment"
      WHERE "createdAt" >= ${since}
      GROUP BY date_trunc('day', "createdAt")
      ORDER BY date_trunc('day', "createdAt")
    `;
  }

  // Top items (all sales in period regardless of payment)
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

  // Totals: sum of all payments received in period
  const totals = await prisma.payment.aggregate({
    where: { createdAt: { gte: since } },
    _sum: { amount: true },
    _count: { id: true },
  });

  return NextResponse.json({
    revenue: revenue.map((r) => ({ label: r.label, amount: parseFloat(r.amount) })),
    topItems: topItems.map((t) => ({ name: t.name, count: parseInt(t.count) })),
    totalRevenue: Number(totals._sum.amount ?? 0),
    totalSales: totals._count.id,
  });
}
