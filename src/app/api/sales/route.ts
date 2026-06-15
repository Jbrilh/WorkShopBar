import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  const sales = await prisma.sale.findMany({
    where: status ? { status: status as "OPEN" | "PAID" } : undefined,
    include: {
      customer: true,
      user: { select: { name: true } },
      items: { include: { menuItem: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(sales);
}

const createSchema = z.object({
  customerId: z.string().optional(),
  status: z.enum(["OPEN", "PAID"]).default("PAID"),
  amountPaid: z.number().min(0).default(0),
  paymentMethod: z.enum(["CASH", "TELEBIRR", "CBE"]).default("CASH"),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      menuItemId: z.string(),
      quantity: z.number().int().positive(),
    })
  ).min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { customerId, status, notes, items, amountPaid, paymentMethod } = parsed.data;

  // Fetch prices server-side
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: items.map((i) => i.menuItemId) }, isActive: true },
  });

  if (menuItems.length !== items.length) {
    return NextResponse.json({ error: "One or more items not found or inactive" }, { status: 400 });
  }

  // Check stock levels — block if any tracked item would go negative
  const inventoryItems = await prisma.inventoryItem.findMany({
    where: { menuItemId: { in: items.map((i) => i.menuItemId) } },
    include: { menuItem: { select: { name: true } } },
  });
  const stockMap = Object.fromEntries(inventoryItems.map((i) => [i.menuItemId, { qty: i.quantity, name: i.menuItem.name }]));

  const outOfStock = items.filter((item) => {
    const stock = stockMap[item.menuItemId];
    return stock !== undefined && stock.qty < item.quantity;
  });

  if (outOfStock.length > 0) {
    const names = outOfStock.map((item) => stockMap[item.menuItemId]?.name ?? item.menuItemId).join(", ");
    return NextResponse.json({ error: `Not enough stock: ${names}` }, { status: 400 });
  }

  const priceMap = Object.fromEntries(menuItems.map((m) => [m.id, Number(m.price)]));

  const saleItems = items.map((item) => ({
    menuItemId: item.menuItemId,
    quantity: item.quantity,
    unitPrice: priceMap[item.menuItemId],
    subtotal: priceMap[item.menuItemId] * item.quantity,
  }));

  const totalAmount = saleItems.reduce((sum, i) => sum + i.subtotal, 0);
  const finalAmountPaid = status === "PAID" ? totalAmount : amountPaid;

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        customerId: customerId || null,
        userId: session.user!.id,
        status,
        totalAmount,
        amountPaid: finalAmountPaid,
        notes: notes || null,
        paidAt: status === "PAID" ? new Date() : null,
        items: { create: saleItems },
      },
      include: {
        customer: true,
        items: { include: { menuItem: true } },
      },
    });

    // Record initial payment if money was collected upfront
    if (finalAmountPaid > 0) {
      await tx.payment.create({
        data: { saleId: created.id, amount: finalAmountPaid, method: paymentMethod },
      });
    }

    // Decrement inventory
    for (const item of items) {
      await tx.inventoryItem.updateMany({
        where: { menuItemId: item.menuItemId },
        data: { quantity: { decrement: item.quantity } },
      });
    }

    return created;
  });

  return NextResponse.json(sale, { status: 201 });
}
