import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MarkPaidButton } from "./MarkPaidButton";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      sales: {
        include: {
          items: { include: { menuItem: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!customer) notFound();

  const openTotal = customer.sales
    .filter((s) => s.status === "OPEN")
    .reduce((sum, s) => sum + Number(s.totalAmount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/customers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          {customer.phone && <p className="text-sm text-muted-foreground">{customer.phone}</p>}
        </div>
        {openTotal > 0 && (
          <Badge variant="warning" className="ml-auto">
            Open tab: {formatCurrency(openTotal)}
          </Badge>
        )}
      </div>

      {customer.notes && (
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-sm text-muted-foreground">{customer.notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <h2 className="font-semibold text-lg">Sales History</h2>
        {customer.sales.length === 0 ? (
          <p className="text-muted-foreground text-sm">No sales recorded.</p>
        ) : (
          customer.sales.map((sale) => (
            <Card key={sale.id}>
              <CardContent className="py-4 px-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={sale.status === "PAID" ? "success" : "warning"}>
                        {sale.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(sale.createdAt)} · by {sale.user.name}
                      </span>
                    </div>
                    <ul className="text-sm space-y-0.5">
                      {sale.items.map((item) => (
                        <li key={item.id} className="text-muted-foreground">
                          {item.quantity}x {item.menuItem.name} — {formatCurrency(Number(item.subtotal))}
                        </li>
                      ))}
                    </ul>
                    {sale.notes && <p className="text-xs text-muted-foreground mt-1">{sale.notes}</p>}
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <p className="font-bold">{formatCurrency(Number(sale.totalAmount))}</p>
                    {sale.status === "OPEN" && <MarkPaidButton saleId={sale.id} />}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
