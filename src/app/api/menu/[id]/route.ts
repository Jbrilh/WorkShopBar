import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  description: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const item = await prisma.menuItem.update({
    where: { id },
    data: parsed.data,
    include: { category: true },
  });

  return NextResponse.json(item);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const saleItemCount = await prisma.saleItem.count({ where: { menuItemId: id } });

  if (saleItemCount === 0) {
    // No sale history — hard delete (remove inventory tracking first)
    await prisma.inventoryItem.deleteMany({ where: { menuItemId: id } });
    await prisma.menuItem.delete({ where: { id } });
  } else {
    // Has sale history — soft delete to preserve records
    await prisma.menuItem.update({ where: { id }, data: { isActive: false } });
  }

  return NextResponse.json({ success: true });
}
