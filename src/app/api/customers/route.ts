import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  const customers = await prisma.customer.findMany({
    where: search
      ? { name: { contains: search, mode: "insensitive" } }
      : undefined,
    orderBy: { name: "asc" },
    take: 20,
    include: {
      _count: { select: { sales: true } },
      sales: {
        where: { status: "OPEN" },
        select: { totalAmount: true },
      },
    },
  });

  const result = customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    notes: c.notes,
    salesCount: c._count.sales,
    openTabTotal: c.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0),
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = z
    .object({ name: z.string().min(1), phone: z.string().optional(), notes: z.string().optional() })
    .safeParse(body);

  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.customer.findUnique({ where: { name: parsed.data.name } });
  if (existing) return NextResponse.json(existing);

  const customer = await prisma.customer.create({ data: parsed.data });
  return NextResponse.json(customer, { status: 201 });
}
