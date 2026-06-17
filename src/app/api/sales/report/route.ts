import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  if (!dateParam) return NextResponse.json({ error: "date required" }, { status: 400 });

  const parsed = new Date(dateParam);
  if (isNaN(parsed.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  // Business day: 6am → 6am
  const start = new Date(parsed);
  start.setHours(6, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: start, lt: end } },
    include: {
      customer: { select: { name: true } },
      user: { select: { name: true } },
      items: { include: { menuItem: { select: { name: true, price: true } } } },
      payments: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(sales);
}
