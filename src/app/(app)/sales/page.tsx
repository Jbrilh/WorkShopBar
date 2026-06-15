import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SalesClient } from "./SalesClient";

export default async function SalesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sales = await prisma.sale.findMany({
    include: {
      customer: true,
      user: { select: { name: true } },
      items: { include: { menuItem: true } },
      payments: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <SalesClient
      initialSales={JSON.parse(JSON.stringify(sales))}
      isOwner={session.user.role === "OWNER"}
    />
  );
}
