import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  type Row = { label: string; revenue: string; sales: string };

  const [daily, monthly, yearly] = await Promise.all([
    // Last 30 days
    prisma.$queryRaw<Row[]>`
      SELECT
        to_char(date_trunc('day', "paidAt"), 'Mon DD') AS label,
        COALESCE(SUM("totalAmount"), 0)::text AS revenue,
        COUNT(*)::text AS sales
      FROM "Sale"
      WHERE status = 'PAID' AND "paidAt" >= NOW() - INTERVAL '30 days'
      GROUP BY date_trunc('day', "paidAt")
      ORDER BY date_trunc('day', "paidAt")
    `,
    // Last 12 months
    prisma.$queryRaw<Row[]>`
      SELECT
        to_char(date_trunc('month', "paidAt"), 'Mon YYYY') AS label,
        COALESCE(SUM("totalAmount"), 0)::text AS revenue,
        COUNT(*)::text AS sales
      FROM "Sale"
      WHERE status = 'PAID' AND "paidAt" >= NOW() - INTERVAL '12 months'
      GROUP BY date_trunc('month', "paidAt")
      ORDER BY date_trunc('month', "paidAt")
    `,
    // All years
    prisma.$queryRaw<Row[]>`
      SELECT
        to_char(date_trunc('year', "paidAt"), 'YYYY') AS label,
        COALESCE(SUM("totalAmount"), 0)::text AS revenue,
        COUNT(*)::text AS sales
      FROM "Sale"
      WHERE status = 'PAID'
      GROUP BY date_trunc('year', "paidAt")
      ORDER BY date_trunc('year', "paidAt")
    `,
  ]);

  function parse(rows: Row[]) {
    return rows.map((r) => ({
      label: r.label,
      revenue: parseFloat(r.revenue),
      sales: parseInt(r.sales),
    }));
  }

  return NextResponse.json({
    daily: parse(daily),
    monthly: parse(monthly),
    yearly: parse(yearly),
  });
}
