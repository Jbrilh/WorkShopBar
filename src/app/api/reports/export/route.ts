import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  if (!fromParam || !toParam) return NextResponse.json({ error: "from and to required" }, { status: 400 });

  const since = new Date(fromParam);
  since.setHours(6, 0, 0, 0);
  const until = new Date(toParam);
  until.setDate(until.getDate() + 1);
  until.setHours(6, 0, 0, 0);

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: since, lt: until } },
    include: {
      customer: { select: { name: true } },
      user: { select: { name: true } },
      items: { include: { menuItem: { select: { name: true, price: true } } } },
      payments: { orderBy: { createdAt: "asc" }, select: { method: true, amount: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(sales);
}
