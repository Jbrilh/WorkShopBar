import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
interface ReportRow {
  invId: string;
  name: string;
  itemCreatedAt: Date;
  categoryName: string | null;
  currentQty: number;
  unit: string;
  lowThreshold: number;
  soldOnDay: number;
  soldAfterDay: number;
  restockedOnDay: number;
  restockedAfterDay: number;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  if (!dateParam) return NextResponse.json({ error: "date param required" }, { status: 400 });

  const parsed = new Date(dateParam);
  if (isNaN(parsed.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  // Business day runs 6am → 6am (bar closes at 6am, not midnight)
  const start = new Date(parsed);
  start.setHours(6, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const rows = await prisma.$queryRaw<ReportRow[]>`
    SELECT
      ii.id            AS "invId",
      mi.name,
      mi."createdAt"   AS "itemCreatedAt",
      cat.name         AS "categoryName",
      ii.quantity      AS "currentQty",
      ii.unit,
      ii."lowThreshold",
      COALESCE(sold_on.qty,    0)::int AS "soldOnDay",
      COALESCE(sold_after.qty, 0)::int AS "soldAfterDay",
      COALESCE(rst_on.qty,     0)::int AS "restockedOnDay",
      COALESCE(rst_after.qty,  0)::int AS "restockedAfterDay"
    FROM "InventoryItem" ii
    JOIN "MenuItem" mi ON ii."menuItemId" = mi.id
    LEFT JOIN "Category" cat ON mi."categoryId" = cat.id
    LEFT JOIN (
      SELECT si."menuItemId", SUM(si.quantity)::int AS qty
      FROM "SaleItem" si
      JOIN "Sale" s ON si."saleId" = s.id
      WHERE s."createdAt" >= ${start} AND s."createdAt" < ${end}
      GROUP BY si."menuItemId"
    ) sold_on ON sold_on."menuItemId" = mi.id
    LEFT JOIN (
      SELECT si."menuItemId", SUM(si.quantity)::int AS qty
      FROM "SaleItem" si
      JOIN "Sale" s ON si."saleId" = s.id
      WHERE s."createdAt" >= ${end}
      GROUP BY si."menuItemId"
    ) sold_after ON sold_after."menuItemId" = mi.id
    LEFT JOIN (
      SELECT sr."inventoryItemId", SUM(sr.quantity)::int AS qty
      FROM "StockRestock" sr
      WHERE sr."createdAt" >= ${start} AND sr."createdAt" < ${end}
      GROUP BY sr."inventoryItemId"
    ) rst_on ON rst_on."inventoryItemId" = ii.id
    LEFT JOIN (
      SELECT sr."inventoryItemId", SUM(sr.quantity)::int AS qty
      FROM "StockRestock" sr
      WHERE sr."createdAt" >= ${end}
      GROUP BY sr."inventoryItemId"
    ) rst_after ON rst_after."inventoryItemId" = ii.id
    WHERE mi."createdAt" < ${end}
    ORDER BY cat.name NULLS LAST, mi.name
  `;

  const items = rows.map((row) => {
    const closingQty = row.currentQty - row.restockedAfterDay + row.soldAfterDay;
    const openingQty = closingQty - row.restockedOnDay + row.soldOnDay;
    const isNewItem = new Date(row.itemCreatedAt) >= start && new Date(row.itemCreatedAt) < end;
    return {
      invId: row.invId,
      name: row.name,
      categoryName: row.categoryName,
      unit: row.unit,
      lowThreshold: Number(row.lowThreshold),
      openingQty: Math.max(0, openingQty),
      restockedOnDay: row.restockedOnDay,
      soldOnDay: row.soldOnDay,
      closingQty: Math.max(0, closingQty),
      isNewItem,
    };
  });

  const summary = {
    opening: items.reduce((s, i) => s + i.openingQty, 0),
    restocked: items.reduce((s, i) => s + i.restockedOnDay, 0),
    sold: items.reduce((s, i) => s + i.soldOnDay, 0),
    closing: items.reduce((s, i) => s + i.closingQty, 0),
  };

  return NextResponse.json({ date: dateParam, items, summary });
}
