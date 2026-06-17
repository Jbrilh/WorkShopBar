import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { subDays } from "date-fns";

function businessDayStart(date: Date): Date {
  const d = new Date(date);
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
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const isCustom = !!(fromParam && toParam);
  let since: Date, until: Date, groupByHour = false;

  if (isCustom) {
    since = new Date(fromParam!);
    since.setHours(6, 0, 0, 0);
    until = new Date(toParam!);
    until.setDate(until.getDate() + 1);
    until.setHours(6, 0, 0, 0);
  } else {
    const now = new Date();
    until = new Date(now);
    until.setDate(until.getDate() + 1);
    until.setHours(6, 0, 0, 0);
    if (range === "daily") {
      since = businessDayStart(now);
      groupByHour = true;
    } else {
      since = businessDayStart(subDays(now, 6));
    }
  }

  type RevenueRow = { label: string; amount: string };
  let revenue: RevenueRow[];

  if (groupByHour) {
    revenue = await prisma.$queryRaw<RevenueRow[]>`
      SELECT
        to_char(date_trunc('hour', "createdAt"), 'HH12:MI AM') as label,
        COALESCE(SUM("amount"), 0)::text as amount
      FROM "Payment"
      WHERE "createdAt" >= ${since} AND "createdAt" < ${until}
      GROUP BY date_trunc('hour', "createdAt")
      ORDER BY date_trunc('hour', "createdAt")
    `;
  } else {
    revenue = await prisma.$queryRaw<RevenueRow[]>`
      SELECT
        to_char(date_trunc('day', "createdAt"), 'Mon DD') as label,
        COALESCE(SUM("amount"), 0)::text as amount
      FROM "Payment"
      WHERE "createdAt" >= ${since} AND "createdAt" < ${until}
      GROUP BY date_trunc('day', "createdAt")
      ORDER BY date_trunc('day', "createdAt")
    `;
  }

  type TopItem = { name: string; count: string };
  const topItems = await prisma.$queryRaw<TopItem[]>`
    SELECT mi.name, SUM(si.quantity)::text as count
    FROM "SaleItem" si
    JOIN "MenuItem" mi ON si."menuItemId" = mi.id
    JOIN "Sale" s ON si."saleId" = s.id
    WHERE s."createdAt" >= ${since} AND s."createdAt" < ${until}
    GROUP BY mi.name
    ORDER BY SUM(si.quantity) DESC
    LIMIT 8
  `;

  const totals = await prisma.payment.aggregate({
    where: { createdAt: { gte: since, lt: until } },
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
