import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function SalesPage() {
  await requireAuth();

  const sales = await prisma.sale.findMany({
    include: {
      customer: true,
      user: { select: { name: true } },
      items: { include: { menuItem: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sales History</h1>
        <Link href="/sales/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Sale
          </Button>
        </Link>
      </div>

      {sales.length === 0 ? (
        <p className="text-muted-foreground text-sm">No sales recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {sales.map((sale) => (
            <Card key={sale.id}>
              <CardContent className="py-3 px-5 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {sale.customer?.name ?? "Anonymous"}
                    </span>
                    <Badge variant={sale.status === "PAID" ? "success" : "warning"}>
                      {sale.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {sale.items.map((i) => `${i.quantity}x ${i.menuItem.name}`).join(", ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(sale.createdAt)} · by {sale.user.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(Number(sale.totalAmount))}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
