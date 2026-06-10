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
  addPayment: z.number().positive().optional(), // add this amount to amountPaid
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { status, notes, addPayment } = parsed.data;

  // Fetch current sale to compute new amountPaid
  const current = await prisma.sale.findUnique({ where: { id }, select: { totalAmount: true, amountPaid: true } });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (notes !== undefined) updateData.notes = notes;

  if (status === "PAID") {
    updateData.status = "PAID";
    updateData.amountPaid = current.totalAmount;
    updateData.paidAt = new Date();
  } else if (addPayment !== undefined) {
    const newAmountPaid = Math.min(
      Number(current.amountPaid) + addPayment,
      Number(current.totalAmount)
    );
    updateData.amountPaid = newAmountPaid;
    if (newAmountPaid >= Number(current.totalAmount)) {
      updateData.status = "PAID";
      updateData.paidAt = new Date();
    }
  } else if (status) {
    updateData.status = status;
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
