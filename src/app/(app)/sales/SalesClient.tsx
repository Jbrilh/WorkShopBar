"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { MarkPaidButton } from "../customers/[id]/MarkPaidButton";
import { VoidSaleButton } from "./VoidSaleButton";
import { useLanguage } from "@/lib/i18n";

type Status = "ALL" | "PAID" | "OPEN";
type SortBy = "date" | "customer" | "amount";

interface Sale {
  id: string;
  status: "PAID" | "OPEN";
  totalAmount: number;
  amountPaid: number;
  createdAt: string;
  notes: string | null;
  customer: { name: string } | null;
  user: { name: string };
  items: { quantity: number; menuItem: { name: string } }[];
  payments: { method: string }[];
}

export function SalesClient({ initialSales, isOwner }: { initialSales: Sale[]; isOwner: boolean }) {
  const [filter, setFilter] = useState<Status>("ALL");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sales, setSales] = useState(initialSales);
  const { t } = useLanguage();

  function handlePaid(saleId: string) {
    setSales((prev) =>
      prev.map((s) => (s.id === saleId ? { ...s, status: "PAID" as const } : s))
    );
  }

  function handleVoided(saleId: string) {
    setSales((prev) => prev.filter((s) => s.id !== saleId));
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
    // "date" keeps the default server order (newest first)

    return result;
  }, [sales, filter, sortBy]);

  const counts = useMemo(() => ({
    all: sales.length,
    paid: sales.filter((s) => s.status === "PAID").length,
    open: sales.filter((s) => s.status === "OPEN").length,
  }), [sales]);

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
            <Card key={sale.id}>
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
                    {sale.payments[0] && (
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-muted font-medium">{sale.payments[0].method}</span>
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
                  <div className="flex gap-1 flex-wrap justify-end">
                    {sale.status === "OPEN" && (
                      <MarkPaidButton saleId={sale.id} />
                    )}
                    {isOwner && (
                      <VoidSaleButton saleId={sale.id} onVoided={handleVoided} />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
