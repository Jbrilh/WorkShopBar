import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard } from "lucide-react";
import { MarkPaidButton } from "../customers/[id]/MarkPaidButton";
import { AddPaymentButton } from "../customers/[id]/AddPaymentButton";
import { T } from "@/components/ui/T";

export default async function TabsPage() {
  await requireAuth();

  const openSales = await prisma.sale.findMany({
    where: { status: "OPEN" },
    include: {
      customer: true,
      user: { select: { name: true } },
      items: { include: { menuItem: true } },
    },
    orderBy: { createdAt: "asc" }, // oldest first — highest priority
  });

  // Total owed = remaining (totalAmount - amountPaid) across all open tabs
  const totalOwed = openSales.reduce(
    (sum, s) => sum + Number(s.totalAmount) - Number(s.amountPaid),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold"><T k="tabs.title" /></h1>
        {openSales.length > 0 && (
          <Badge variant="warning" className="text-base px-3 py-1">
            <T k="tabs.totalOwed" /> {formatCurrency(totalOwed)}
          </Badge>
        )}
      </div>

      {openSales.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p><T k="tabs.noTabs" /></p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {openSales.map((sale) => {
            const total = Number(sale.totalAmount);
            const paid = Number(sale.amountPaid);
            const remaining = total - paid;
            const hasPartialPayment = paid > 0;

            return (
              <Card key={sale.id} className="border-yellow-200">
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">
                          {sale.customer?.name ?? "Anonymous"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          · {formatDate(sale.createdAt)} · by {sale.user.name}
                        </span>
                        {hasPartialPayment && (
                          <Badge variant="default" className="text-xs"><T k="tabs.partial" /></Badge>
                        )}
                      </div>
                      <ul className="text-sm text-muted-foreground space-y-0.5">
                        {sale.items.map((item) => (
                          <li key={item.id}>
                            {item.quantity}x {item.menuItem.name} — {formatCurrency(Number(item.subtotal))}
                          </li>
                        ))}
                      </ul>
                      {sale.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{sale.notes}</p>
                      )}
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      {hasPartialPayment ? (
                        <>
                          <p className="text-sm text-muted-foreground line-through">{formatCurrency(total)}</p>
                          <div className="text-sm text-green-700"><T k="customers.paid" /> {formatCurrency(paid)}</div>
                          <p className="font-bold text-lg text-yellow-700">{formatCurrency(remaining)} <T k="sales.owed" /></p>
                        </>
                      ) : (
                        <p className="font-bold text-lg">{formatCurrency(total)}</p>
                      )}
                      <div className="flex gap-2">
                        <AddPaymentButton saleId={sale.id} remaining={remaining} />
                        <MarkPaidButton saleId={sale.id} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
