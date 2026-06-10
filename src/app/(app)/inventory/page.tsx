import { requireOwner } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { InventoryClient } from "./InventoryClient";

export default async function InventoryPage() {
  await requireOwner();

  const [tracked, allMenuItems] = await Promise.all([
    prisma.inventoryItem.findMany({
      include: { menuItem: { include: { category: true } } },
      orderBy: { menuItem: { name: "asc" } },
    }),
    prisma.menuItem.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const trackedIds = new Set(tracked.map((t) => t.menuItemId));
  const untrackedItems = allMenuItems.filter((m) => !trackedIds.has(m.id));

  return (
    <InventoryClient
      initialItems={JSON.parse(JSON.stringify(tracked))}
      untrackedItems={JSON.parse(JSON.stringify(untrackedItems))}
    />
  );
}
