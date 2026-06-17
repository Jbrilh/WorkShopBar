"use client";

import { useState } from "react";
import { format, subDays } from "date-fns";

// Bar closes at 6am — before 6am the current business day is still "yesterday"
function currentBusinessDay() {
  const now = new Date();
  return now.getHours() < 6 ? subDays(now, 1) : now;
}
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { Package, TrendingDown, TrendingUp, BarChart2 } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface ReportItem {
  invId: string;
  name: string;
  categoryName: string | null;
  unit: string;
  lowThreshold: number;
  openingQty: number;
  restockedOnDay: number;
  soldOnDay: number;
  closingQty: number;
  isNewItem: boolean;
}

interface Summary {
  opening: number;
  restocked: number;
  sold: number;
  closing: number;
}

export default function InventoryReportPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [date, setDate] = useState(format(currentBusinessDay(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ReportItem[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [reportDate, setReportDate] = useState("");

  async function loadReport(dateOverride?: string) {
    const targetDate = dateOverride ?? date;
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/report?date=${targetDate}`);
      if (!res.ok) throw new Error("Failed to load report");
      const data = await res.json();
      setItems(data.items);
      setSummary(data.summary);
      setReportDate(data.date);
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("inventory.report")}</h1>
      </div>

      {/* Date picker */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("inventory.selectDate")}</p>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={date}
                  max={format(currentBusinessDay(), "yyyy-MM-dd")}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-44"
                />
                <button
                  type="button"
                  onClick={() => { const d = format(currentBusinessDay(), "yyyy-MM-dd"); setDate(d); loadReport(d); }}
                  className={`px-3 py-1.5 rounded-md text-sm border font-medium transition-colors ${date === format(currentBusinessDay(), "yyyy-MM-dd") ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-gray-400"}`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => { const d = format(subDays(currentBusinessDay(), 1), "yyyy-MM-dd"); setDate(d); loadReport(d); }}
                  className={`px-3 py-1.5 rounded-md text-sm border font-medium transition-colors ${date === format(subDays(currentBusinessDay(), 1), "yyyy-MM-dd") ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-gray-400"}`}
                >
                  Yesterday
                </button>
              </div>
            </div>
            <Button onClick={() => loadReport()} disabled={loading}>
              <BarChart2 className="h-4 w-4 mr-2" />
              {loading ? t("common.loading") : t("inventory.viewReport")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {items !== null && summary !== null && (
        <>
          <p className="text-sm text-muted-foreground font-medium">
            {t("inventory.report")} — {reportDate}
          </p>

          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{t("inventory.opening")}</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.opening}</div>
                <p className="text-xs text-muted-foreground">{t("inventory.stock")} at start of day</p>
              </CardContent>
            </Card>

            <Card className="border-green-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-green-700">{t("inventory.restocked")}</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">+{summary.restocked}</div>
                <p className="text-xs text-muted-foreground">Added that day</p>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-red-700">{t("inventory.soldLabel")}</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">−{summary.sold}</div>
                <p className="text-xs text-muted-foreground">Sold that day</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{t("inventory.closing")}</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.closing}</div>
                <p className="text-xs text-muted-foreground">{t("inventory.stock")} at end of day</p>
              </CardContent>
            </Card>
          </div>

          {/* Items table */}
          {items.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                {t("inventory.noData")}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop */}
              <Card className="hidden sm:block">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("inventory.item")}</TableHead>
                        <TableHead>{t("inventory.category")}</TableHead>
                        <TableHead className="text-right">{t("inventory.opening")}</TableHead>
                        <TableHead className="text-right text-green-700">+{t("inventory.restocked")}</TableHead>
                        <TableHead className="text-right text-red-700">−{t("inventory.soldLabel")}</TableHead>
                        <TableHead className="text-right">{t("inventory.closing")}</TableHead>
                        <TableHead>{t("inventory.status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.invId}>
                          <TableCell className="font-medium">
                            {item.name}
                            {item.isNewItem && (
                              <Badge variant="default" className="ml-2 text-xs">{t("inventory.newItem")}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{item.categoryName ?? "—"}</TableCell>
                          <TableCell className="text-right">{item.openingQty}</TableCell>
                          <TableCell className="text-right text-green-700 font-medium">
                            {item.restockedOnDay > 0 ? `+${item.restockedOnDay}` : "—"}
                          </TableCell>
                          <TableCell className="text-right text-red-700 font-medium">
                            {item.soldOnDay > 0 ? `−${item.soldOnDay}` : "—"}
                          </TableCell>
                          <TableCell className="text-right font-bold">{item.closingQty}</TableCell>
                          <TableCell>
                            {item.closingQty === 0 ? (
                              <Badge variant="destructive">{t("inventory.out")}</Badge>
                            ) : item.closingQty <= item.lowThreshold ? (
                              <Badge variant="warning">{t("inventory.low")}</Badge>
                            ) : (
                              <Badge variant="success">{t("inventory.ok")}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Mobile */}
              <div className="sm:hidden space-y-2">
                {items.map((item) => (
                  <Card key={item.invId}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium text-sm">{item.name}</span>
                          {item.isNewItem && (
                            <Badge variant="default" className="ml-2 text-xs">{t("inventory.newItem")}</Badge>
                          )}
                          <p className="text-xs text-muted-foreground">{item.categoryName ?? "—"}</p>
                        </div>
                        {item.closingQty === 0 ? (
                          <Badge variant="destructive">{t("inventory.out")}</Badge>
                        ) : item.closingQty <= item.lowThreshold ? (
                          <Badge variant="warning">{t("inventory.low")}</Badge>
                        ) : (
                          <Badge variant="success">{t("inventory.ok")}</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-center text-xs">
                        <div>
                          <p className="text-muted-foreground">{t("inventory.opening")}</p>
                          <p className="font-bold">{item.openingQty}</p>
                        </div>
                        <div>
                          <p className="text-green-600">{t("inventory.restocked")}</p>
                          <p className="font-bold text-green-700">{item.restockedOnDay > 0 ? `+${item.restockedOnDay}` : "—"}</p>
                        </div>
                        <div>
                          <p className="text-red-600">Sold</p>
                          <p className="font-bold text-red-700">{item.soldOnDay > 0 ? `−${item.soldOnDay}` : "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t("inventory.closing")}</p>
                          <p className="font-bold">{item.closingQty}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
