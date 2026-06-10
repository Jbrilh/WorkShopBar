import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("active") === "true";

  const items = await prisma.menuItem.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    include: { category: true },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });

  return NextResponse.json(items);
}

const createSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const item = await prisma.menuItem.create({
    data: parsed.data,
    include: { category: true },
  });

  return NextResponse.json(item, { status: 201 });
}
