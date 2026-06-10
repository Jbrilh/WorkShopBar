import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { SalesClient } from "./SalesClient";

export default async function SalesPage() {
  await requireAuth();

  const sales = await prisma.sale.findMany({
    include: {
      customer: true,
      user: { select: { name: true } },
      items: { include: { menuItem: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return <SalesClient initialSales={JSON.parse(JSON.stringify(sales))} />;
}
