import { requireOwner } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { InventoryClient } from "./InventoryClient";

export default async function InventoryPage() {
  await requireOwner();

  const items = await prisma.inventoryItem.findMany({
    include: { menuItem: { include: { category: true } } },
    orderBy: { menuItem: { name: "asc" } },
  });

  return <InventoryClient initialItems={JSON.parse(JSON.stringify(items))} />;
}
