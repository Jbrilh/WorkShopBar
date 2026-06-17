"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format, subDays } from "date-fns";
import { formatCurrency, formatDate, formatDateShort } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, ShoppingBag, Package, TrendingUp } from "lucide-react";
import { MarkPaidButton } from "../customers/[id]/MarkPaidButton";
import { VoidSaleButton } from "./VoidSaleButton";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

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
  items: { id: string; quantity: number; subtotal: number; menuItem: { name: string; price: number } }[];
  payments: Payment[];
}

function currentBusinessDay() {
  const now = new Date();
  return now.getHours() < 6 ? subDays(now, 1) : now;
}

export function SalesClient({ initialSales, isOwner }: { initialSales: Sale[]; isOwner: boolean }) {
  const [filter, setFilter] = useState<Status>("ALL");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sales, setSales] = useState(initialSales);
  const [selected, setSelected] = useState<Sale | null>(null);
  const [filterDate, setFilterDate] = useState("");
  const [dateSales, setDateSales] = useState<Sale[] | null>(null);
  const [dateLoading, setDateLoading] = useState(false);
  const { t } = useLanguage();
  const { toast } = useToast();

  function handleVoided(saleId: string) {
    setSales((prev) => prev.filter((s) => s.id !== saleId));
    if (dateSales) setDateSales((prev) => prev?.filter((s) => s.id !== saleId) ?? null);
    setSelected(null);
  }

  async function fetchByDate(date: string) {
    if (!date) return;
    setDateLoading(true);
    try {
      const res = await fetch(`/api/sales/report?date=${date}`);
      if (!res.ok) throw new Error();
      setDateSales(await res.json());
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setDateLoading(false);
    }
  }

  function clearDateFilter() {
    setFilterDate("");
    setDateSales(null);
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

  const displayStats = useMemo(() => {
    const source = dateSales ?? (() => {
      const start = new Date(currentBusinessDay());
      start.setHours(6, 0, 0, 0);
      return sales.filter((s) => new Date(s.createdAt) >= start);
    })();
    return {
      count: source.length,
      items: source.reduce((sum, s) => sum + s.items.reduce((q, i) => q + i.quantity, 0), 0),
      revenue: source.reduce((sum, s) => sum + Number(s.amountPaid), 0),
    };
  }, [dateSales, sales]);

  const lastMethod = selected?.payments[selected.payments.length - 1]?.method;
  const today = format(currentBusinessDay(), "yyyy-MM-dd");
  const yesterday = format(subDays(currentBusinessDay(), 1), "yyyy-MM-dd");

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

      {/* Summary card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">{dateSales ? filterDate : t("sales.todaySales")}</CardTitle>
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground">{displayStats.count} {t("sales.all").toLowerCase()}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5"><Package className="h-3.5 w-3.5" />{t("sales.todayItems")}</span>
            <span className="text-sm font-semibold">{displayStats.items}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" />{t("sales.todayRevenue")}</span>
            <span className="text-sm font-semibold">{formatCurrency(displayStats.revenue)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Date filter */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              type="date"
              value={filterDate}
              max={today}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-40"
            />
            <button
              type="button"
              onClick={() => { setFilterDate(today); fetchByDate(today); }}
              className={`px-3 py-1.5 rounded-md text-sm border font-medium transition-colors ${filterDate === today ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-gray-400"}`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => { setFilterDate(yesterday); fetchByDate(yesterday); }}
              className={`px-3 py-1.5 rounded-md text-sm border font-medium transition-colors ${filterDate === yesterday ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-gray-400"}`}
            >
              Yesterday
            </button>
            <Button size="sm" onClick={() => fetchByDate(filterDate)} disabled={!filterDate || dateLoading}>
              {dateLoading ? t("common.loading") : t("inventory.viewReport")}
            </Button>
            {dateSales !== null && (
              <Button size="sm" variant="ghost" onClick={clearDateFilter}>
                {t("sales.showAll")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Date report view */}
      {dateSales !== null ? (
        dateSales.length === 0 ? (
          <p className="text-muted-foreground text-sm py-6 text-center">{t("sales.noSalesDate")}</p>
        ) : (
          <div className="space-y-2">
            {dateSales.map((sale) => (
              <Card key={sale.id}>
                <CardContent className="py-3 px-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
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
                    <span className="text-xs text-muted-foreground">
                      {new Date(sale.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  {/* Items with prices */}
                  <div className="space-y-0.5 mb-2">
                    {sale.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.quantity}× {item.menuItem.name}
                          <span className="ml-1 text-xs">@ {formatCurrency(item.menuItem.price)}</span>
                        </span>
                        <span className="font-medium">{formatCurrency(Number(item.subtotal))}</span>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between border-t pt-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">by {sale.user.name}</span>
                      {sale.payments[sale.payments.length - 1] && (
                        <span className="px-1.5 py-0.5 rounded bg-muted text-xs font-medium">
                          {sale.payments[sale.payments.length - 1].method}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      {sale.status === "OPEN" && Number(sale.amountPaid) > 0 ? (
                        <span className="text-yellow-700 font-bold text-xs">
                          {formatCurrency(Number(sale.totalAmount) - Number(sale.amountPaid))} {t("sales.owed")}
                        </span>
                      ) : (
                        <span className="font-bold">{formatCurrency(Number(sale.totalAmount))}</span>
                      )}
                    </div>
                  </div>

                  {sale.notes && (
                    <p className="text-xs text-muted-foreground italic mt-1">{sale.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        <>
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
        </>
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

                {selected.notes && (
                  <p className="text-xs text-muted-foreground italic border-t pt-2">{selected.notes}</p>
                )}

                {lastMethod && (
                  <p className="text-xs text-muted-foreground">
                    {t("payment.method")}: <span className="font-medium">{t(`payment.${lastMethod.toLowerCase() as "cash" | "telebirr" | "cbe"}`)}</span>
                  </p>
                )}

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
