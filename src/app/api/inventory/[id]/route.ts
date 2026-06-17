import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const patchSchema = z.object({
  quantity: z.number().int().min(0).optional(),
  delta: z.number().int().optional(),
  restock: z.number().int().positive().optional(),
  unit: z.string().optional(),
  lowThreshold: z.number().int().min(0).optional(),
  name: z.string().min(1).optional(),
  price: z.number().positive().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { quantity, delta, restock, unit, lowThreshold, name, price } = parsed.data;

  const invData: Record<string, unknown> = {};
  if (unit !== undefined) invData.unit = unit;
  if (lowThreshold !== undefined) invData.lowThreshold = lowThreshold;
  if (restock !== undefined) invData.quantity = { increment: restock };
  else if (quantity !== undefined) invData.quantity = quantity;
  else if (delta !== undefined) invData.quantity = { increment: delta };

  const menuItemData: Record<string, unknown> = {};
  if (name !== undefined) menuItemData.name = name;
  if (price !== undefined) menuItemData.price = price;

  const item = await prisma.$transaction(async (tx) => {
    const inv = await tx.inventoryItem.update({
      where: { id },
      data: invData,
      select: { menuItemId: true },
    });
    if (Object.keys(menuItemData).length > 0) {
      await tx.menuItem.update({ where: { id: inv.menuItemId }, data: menuItemData });
    }
    if (restock !== undefined) {
      await tx.stockRestock.create({ data: { inventoryItemId: id, quantity: restock } });
    }
    return tx.inventoryItem.findUnique({
      where: { id },
      include: { menuItem: { include: { category: true } } },
    });
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
