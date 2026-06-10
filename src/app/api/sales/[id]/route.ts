import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      customer: true,
      user: { select: { name: true } },
      items: { include: { menuItem: true } },
    },
  });

  if (!sale) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(sale);
}

const patchSchema = z.object({
  status: z.enum(["OPEN", "PAID"]).optional(),
  notes: z.string().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updateData: Record<string, unknown> = { ...parsed.data };

  if (parsed.data.status === "PAID") {
    updateData.paidAt = new Date();
  }

  const sale = await prisma.sale.update({
    where: { id },
    data: updateData,
    include: {
      customer: true,
      items: { include: { menuItem: true } },
    },
  });

  return NextResponse.json(sale);
}
