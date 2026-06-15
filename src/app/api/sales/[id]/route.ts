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
      payments: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!sale) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(sale);
}

const patchSchema = z.object({
  status: z.enum(["OPEN", "PAID"]).optional(),
  notes: z.string().optional(),
  addPayment: z.number().positive().optional(),
  paymentMethod: z.enum(["CASH", "TELEBIRR", "CBE"]).default("CASH"),
  addItems: z.array(z.object({
    menuItemId: z.string(),
    quantity: z.number().int().positive(),
  })).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { status, notes, addPayment, paymentMethod, addItems } = parsed.data;

  // Add items to existing open tab
  if (addItems && addItems.length > 0) {
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: addItems.map((i) => i.menuItemId) }, isActive: true },
    });
    const priceMap = Object.fromEntries(menuItems.map((m) => [m.id, Number(m.price)]));

    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { menuItemId: { in: addItems.map((i) => i.menuItemId) } },
      include: { menuItem: { select: { name: true } } },
    });
    const stockMap = Object.fromEntries(
      inventoryItems.map((i) => [i.menuItemId, { qty: Number(i.quantity), name: i.menuItem.name }])
    );
    const outOfStock = addItems.filter((item) => {
      const stock = stockMap[item.menuItemId];
      return stock !== undefined && stock.qty < item.quantity;
    });
    if (outOfStock.length > 0) {
      const names = outOfStock.map((item) => stockMap[item.menuItemId]?.name ?? item.menuItemId).join(", ");
      return NextResponse.json({ error: `Not enough stock: ${names}` }, { status: 400 });
    }

    const additionalTotal = addItems.reduce(
      (sum, item) => sum + (priceMap[item.menuItemId] ?? 0) * item.quantity,
      0
    );

    const sale = await prisma.$transaction(async (tx) => {
      await tx.saleItem.createMany({
        data: addItems.map((item) => ({
          saleId: id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: priceMap[item.menuItemId],
          subtotal: priceMap[item.menuItemId] * item.quantity,
        })),
      });
      const updated = await tx.sale.update({
        where: { id },
        data: { totalAmount: { increment: additionalTotal } },
        include: {
          customer: true,
          items: { include: { menuItem: true } },
          payments: { orderBy: { createdAt: "asc" } },
        },
      });
      for (const item of addItems) {
        await tx.inventoryItem.updateMany({
          where: { menuItemId: item.menuItemId },
          data: { quantity: { decrement: item.quantity } },
        });
      }
      return updated;
    });

    return NextResponse.json(sale);
  }

  const current = await prisma.sale.findUnique({
    where: { id },
    select: { totalAmount: true, amountPaid: true, status: true },
  });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (notes !== undefined) updateData.notes = notes;

  let paymentAmount: number | null = null;

  if (status === "PAID") {
    updateData.status = "PAID";
    updateData.amountPaid = current.totalAmount;
    updateData.paidAt = new Date();
    // Record the remaining balance as a payment
    paymentAmount = Number(current.totalAmount) - Number(current.amountPaid);
  } else if (addPayment !== undefined) {
    const newAmountPaid = Math.min(
      Number(current.amountPaid) + addPayment,
      Number(current.totalAmount)
    );
    updateData.amountPaid = newAmountPaid;
    paymentAmount = addPayment;
    if (newAmountPaid >= Number(current.totalAmount)) {
      updateData.status = "PAID";
      updateData.paidAt = new Date();
    }
  } else if (status) {
    updateData.status = status;
  }

  const sale = await prisma.$transaction(async (tx) => {
    const updated = await tx.sale.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        items: { include: { menuItem: true } },
        payments: { orderBy: { createdAt: "asc" } },
      },
    });

    if (paymentAmount !== null && paymentAmount > 0) {
      await tx.payment.create({
        data: { saleId: id, amount: paymentAmount, method: paymentMethod },
      });
    }

    return updated;
  });

  return NextResponse.json(sale);
}

// Owner-only: void a sale and restore inventory
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  await prisma.$transaction(async (tx) => {
    const saleItems = await tx.saleItem.findMany({ where: { saleId: id } });

    // Restore inventory for each item
    for (const item of saleItems) {
      await tx.inventoryItem.updateMany({
        where: { menuItemId: item.menuItemId },
        data: { quantity: { increment: item.quantity } },
      });
    }

    // Delete sale (SaleItems and Payments cascade)
    await tx.sale.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
