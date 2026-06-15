"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatCurrency, formatDate, formatDateShort } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { MarkPaidButton } from "../customers/[id]/MarkPaidButton";
import { VoidSaleButton } from "./VoidSaleButton";
import { useLanguage } from "@/lib/i18n";

type Status = "ALL" | "PAID" | "OPEN";
type SortBy = "date" | "customer" | "amount";

interface Payment {
  id: string;
  amount: number;
  method: string;
  createdAt: string;
}

interface Sale {
  id: string;
  status: "PAID" | "OPEN";
  totalAmount: number;
  amountPaid: number;
  createdAt: string;
  notes: string | null;
  customer: { name: string } | null;
  user: { name: string };
  items: { id: string; quantity: number; subtotal: number; menuItem: { name: string } }[];
  payments: Payment[];
}

export function SalesClient({ initialSales, isOwner }: { initialSales: Sale[]; isOwner: boolean }) {
  const [filter, setFilter] = useState<Status>("ALL");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sales, setSales] = useState(initialSales);
  const [selected, setSelected] = useState<Sale | null>(null);
  const { t } = useLanguage();

  function handleVoided(saleId: string) {
    setSales((prev) => prev.filter((s) => s.id !== saleId));
    setSelected(null);
  }

  const displayed = useMemo(() => {
    let result = filter === "ALL" ? sales : sales.filter((s) => s.status === filter);

    if (sortBy === "customer") {
      result = [...result].sort((a, b) =>
        (a.customer?.name ?? "Anonymous").localeCompare(b.customer?.name ?? "Anonymous")
      );
    } else if (sortBy === "amount") {
      result = [...result].sort((a, b) => Number(b.totalAmount) - Number(a.totalAmount));
    }

    return result;
  }, [sales, filter, sortBy]);

  const counts = useMemo(() => ({
    all: sales.length,
    paid: sales.filter((s) => s.status === "PAID").length,
    open: sales.filter((s) => s.status === "OPEN").length,
  }), [sales]);

  const lastMethod = selected?.payments[selected.payments.length - 1]?.method;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("sales.title")}</h1>
        <Link href="/sales/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t("sales.newSale")}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {(["ALL", "PAID", "OPEN"] as Status[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filter === s
                  ? "bg-white shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "ALL"
                ? `${t("sales.all")} (${counts.all})`
                : s === "PAID"
                ? `${t("sales.paid")} (${counts.paid})`
                : `${t("sales.unpaid")} (${counts.open})`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground">{t("sales.sort")}</span>
          {(["date", "customer", "amount"] as SortBy[]).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-3 py-1 rounded-md text-sm border transition-colors ${
                sortBy === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "date" ? t("sales.byDate") : s === "customer" ? t("sales.byCustomer") : t("sales.byAmount")}
            </button>
          ))}
        </div>
      </div>

      {displayed.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("sales.noMatch")}</p>
      ) : (
        <div className="space-y-2">
          {displayed.map((sale) => (
            <Card
              key={sale.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelected(sale)}
            >
              <CardContent className="py-3 px-5 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {sale.customer?.name ?? t("common.anonymous")}
                    </span>
                    <Badge variant={sale.status === "PAID" ? "success" : "warning"}>
                      {sale.status === "PAID" ? t("sales.paid") : t("sales.unpaid")}
                    </Badge>
                    {sale.status === "OPEN" && Number(sale.amountPaid) > 0 && (
                      <Badge variant="default" className="text-xs">{t("sales.partial")}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {sale.items.map((i) => `${i.quantity}x ${i.menuItem.name}`).join(", ")}
                  </p>
                  {sale.notes && (
                    <p className="text-xs text-muted-foreground italic">{sale.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDate(sale.createdAt)} · by {sale.user.name}
                    {sale.payments[sale.payments.length - 1] && (
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-muted font-medium">
                        {sale.payments[sale.payments.length - 1].method}
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  {sale.status === "OPEN" && Number(sale.amountPaid) > 0 ? (
                    <>
                      <p className="text-xs text-muted-foreground line-through">{formatCurrency(Number(sale.totalAmount))}</p>
                      <p className="font-bold text-yellow-700">
                        {formatCurrency(Number(sale.totalAmount) - Number(sale.amountPaid))} owed
                      </p>
                    </>
                  ) : (
                    <p className="font-bold">{formatCurrency(Number(sale.totalAmount))}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sale detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selected.customer?.name ?? t("common.anonymous")}
                  <Badge variant={selected.status === "PAID" ? "success" : "warning"} className="text-xs">
                    {selected.status === "PAID" ? t("sales.paid") : t("sales.unpaid")}
                  </Badge>
                  {selected.status === "OPEN" && Number(selected.amountPaid) > 0 && (
                    <Badge variant="default" className="text-xs">{t("sales.partial")}</Badge>
                  )}
                </DialogTitle>
                <p className="text-xs text-muted-foreground pt-1">
                  {formatDate(selected.createdAt)} · by {selected.user.name}
                </p>
              </DialogHeader>

              <div className="space-y-4">
                {/* Items */}
                <div className="space-y-1">
                  {selected.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.quantity}x {item.menuItem.name}</span>
                      <span>{formatCurrency(Number(item.subtotal))}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold pt-2 border-t text-sm">
                    <span>{t("sales.total")}</span>
                    <span>{formatCurrency(Number(selected.totalAmount))}</span>
                  </div>
                </div>

                {/* Payment history */}
                {selected.payments.length > 0 && (
                  <div className="space-y-1 pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground">{t("tabs.paymentHistory")}</p>
                    {selected.payments.map((p) => (
                      <div key={p.id} className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatDateShort(p.createdAt)}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-muted font-medium">{p.method}</span>
                          <span className="text-green-700 font-medium">+{formatCurrency(Number(p.amount))}</span>
                        </div>
                      </div>
                    ))}
                    {selected.status === "OPEN" && (
                      <div className="flex justify-between text-xs font-semibold text-yellow-700 pt-1 border-t">
                        <span>{t("sales.owed")}</span>
                        <span>{formatCurrency(Number(selected.totalAmount) - Number(selected.amountPaid))}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {selected.notes && (
                  <p className="text-xs text-muted-foreground italic border-t pt-2">{selected.notes}</p>
                )}

                {/* Payment method summary */}
                {lastMethod && (
                  <p className="text-xs text-muted-foreground">
                    {t("payment.method")}: <span className="font-medium">{t(`payment.${lastMethod.toLowerCase() as "cash" | "telebirr" | "cbe"}`)}</span>
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                  {selected.status === "OPEN" && (
                    <MarkPaidButton saleId={selected.id} />
                  )}
                  {isOwner && (
                    <VoidSaleButton saleId={selected.id} onVoided={handleVoided} />
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
