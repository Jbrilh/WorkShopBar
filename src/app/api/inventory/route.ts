import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.inventoryItem.findMany({
    include: { menuItem: { include: { category: true } } },
    orderBy: { menuItem: { name: "asc" } },
  });

  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = z.object({
    menuItemId: z.string(),
    quantity: z.number().int().min(0).default(0),
    unit: z.string().default("units"),
    lowThreshold: z.number().int().min(0).default(5),
  }).safeParse(body);

  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const item = await prisma.inventoryItem.create({
    data: parsed.data,
    include: { menuItem: true },
  });

  return NextResponse.json(item, { status: 201 });
}
