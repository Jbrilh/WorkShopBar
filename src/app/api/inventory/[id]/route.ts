import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const patchSchema = z.object({
  quantity: z.number().int().min(0).optional(),
  delta: z.number().int().optional(),
  unit: z.string().optional(),
  lowThreshold: z.number().int().min(0).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { quantity, delta, unit, lowThreshold } = parsed.data;

  const updateData: Record<string, unknown> = {};
  if (unit !== undefined) updateData.unit = unit;
  if (lowThreshold !== undefined) updateData.lowThreshold = lowThreshold;

  if (quantity !== undefined) {
    updateData.quantity = quantity;
  } else if (delta !== undefined) {
    updateData.quantity = { increment: delta };
  }

  const item = await prisma.inventoryItem.update({
    where: { id },
    data: updateData,
    include: { menuItem: { include: { category: true } } },
  });

  return NextResponse.json(item);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.inventoryItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
