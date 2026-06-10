import { requireOwner } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { MenuClient } from "./MenuClient";

export default async function MenuPage() {
  await requireOwner();

  const [menuItems, categories] = await Promise.all([
    prisma.menuItem.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <MenuClient
      initialItems={JSON.parse(JSON.stringify(menuItems))}
      initialCategories={JSON.parse(JSON.stringify(categories))}
    />
  );
}
