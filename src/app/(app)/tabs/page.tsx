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
      payments: { orderBy: { createdAt: "asc" } },
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
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
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
                      {sale.payments.length > 0 && (
                        <div className="mt-2 pt-2 border-t space-y-0.5">
                          <p className="text-xs font-medium text-muted-foreground"><T k="tabs.paymentHistory" /></p>
                          {sale.payments.map((p) => (
                            <div key={p.id} className="flex justify-between text-xs text-muted-foreground">
                              <span>{formatDate(p.createdAt)}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded bg-muted font-medium">{p.method}</span>
                                <span className="text-green-700 font-medium">+{formatCurrency(Number(p.amount))}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 border-t sm:border-0 pt-3 sm:pt-0">
                      <div className="sm:text-right">
                        {hasPartialPayment ? (
                          <div className="space-y-0.5">
                            <p className="text-sm text-muted-foreground line-through">{formatCurrency(total)}</p>
                            <div className="text-sm text-green-700"><T k="customers.paid" /> {formatCurrency(paid)}</div>
                            <p className="font-bold text-lg text-yellow-700">{formatCurrency(remaining)} <T k="sales.owed" /></p>
                          </div>
                        ) : (
                          <p className="font-bold text-lg">{formatCurrency(total)}</p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
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
