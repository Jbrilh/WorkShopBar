import { requireOwner } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { InventoryClient } from "./InventoryClient";

export default async function InventoryPage() {
  await requireOwner();

  const [tracked, categories] = await Promise.all([
    prisma.inventoryItem.findMany({
      include: { menuItem: { include: { category: true } } },
      orderBy: { menuItem: { name: "asc" } },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <InventoryClient
      initialItems={JSON.parse(JSON.stringify(tracked))}
      categories={JSON.parse(JSON.stringify(categories))}
    />
  );
}
