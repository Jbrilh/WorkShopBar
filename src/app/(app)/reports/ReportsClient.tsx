"use client";

import { useEffect, useState } from "react";
import { format, subDays } from "date-fns";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface ReportData {
  revenue: { label: string; amount: number }[];
  topItems: { name: string; count: number }[];
  totalRevenue: number;
  totalSales: number;
}

function businessDay(d: Date) {
  const n = new Date(d);
  if (n.getHours() < 6) n.setDate(n.getDate() - 1);
  return n;
}

function toDateStr(d: Date) {
  return format(d, "yyyy-MM-dd");
}


export function ReportsClient() {
  const today = toDateStr(businessDay(new Date()));
  const sevenDaysAgo = toDateStr(subDays(businessDay(new Date()), 6));

  const [mode, setMode] = useState<"daily" | "weekly" | "custom">("weekly");
  const [fromDate, setFromDate] = useState(sevenDaysAgo);
  const [toDate, setToDate] = useState(today);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dlLoading, setDlLoading] = useState(false);
  const { toast } = useToast();

  function fetchData(m: typeof mode, from?: string, to?: string) {
    setLoading(true);
    const url = m === "custom" && from && to
      ? `/api/reports?from=${from}&to=${to}`
      : `/api/reports?range=${m}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }

  useEffect(() => { fetchData("weekly"); }, []);

  function applyPreset(preset: "daily" | "weekly") {
    const t = toDateStr(businessDay(new Date()));
    const f = preset === "daily" ? t : toDateStr(subDays(businessDay(new Date()), 6));
    setFromDate(f);
    setToDate(t);
    setMode(preset);
    fetchData(preset);
  }

  function applyCustom() {
    if (!fromDate || !toDate || fromDate > toDate) {
      toast({ title: "Pick a valid date range", variant: "destructive" });
      return;
    }
    setMode("custom");
    fetchData("custom", fromDate, toDate);
  }

  async function downloadExcel() {
    setDlLoading(true);
    try {
      const from = mode === "daily" ? today : fromDate;
      const to = toDate;

      const [salesRes, invRes] = await Promise.all([
        fetch(`/api/reports/export?from=${from}&to=${to}`),
        fetch(`/api/inventory/report?date=${to}`),
      ]);
      if (!salesRes.ok || !invRes.ok) throw new Error();

      const sales: {
        createdAt: string; status: string; totalAmount: number; amountPaid: number;
        notes: string | null; customer: { name: string } | null; user: { name: string };
        items: { quantity: number; subtotal: number; menuItem: { name: string; price: number } }[];
        payments: { method: string; amount: number }[];
      }[] = await salesRes.json();

      const { items: invItems }: {
        items: {
          name: string; categoryName: string | null; unit: string;
          openingQty: number; restockedOnDay: number; soldOnDay: number;
          closingQty: number; lowThreshold: number;
        }[];
      } = await invRes.json();

      const wb = XLSX.utils.book_new();

      // Sales sheet
      const salesRows = [
        ["Date", "Time", "Customer", "Items", "Unit Prices (ETB)", "Total (ETB)", "Paid (ETB)", "Owed (ETB)", "Payment Method", "Status", "Notes"],
        ...sales.map((s) => [
          new Date(s.createdAt).toLocaleDateString(),
          new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          s.customer?.name ?? "Anonymous",
          s.items.map((i) => `${i.quantity}× ${i.menuItem.name}`).join("; "),
          s.items.map((i) => `${i.menuItem.name}: ETB ${i.menuItem.price}`).join("; "),
          Number(s.totalAmount),
          Number(s.amountPaid),
          Math.max(0, Number(s.totalAmount) - Number(s.amountPaid)),
          s.payments.map((p) => p.method).join("; ") || "-",
          s.status,
          s.notes ?? "",
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(salesRows), "Sales");

      // Inventory sheet
      const invRows = [
        ["Item", "Category", "Unit", "Opening", "Restocked", "Sold", "Closing", "Status"],
        ...invItems.map((i) => [
          i.name,
          i.categoryName ?? "-",
          i.unit,
          i.openingQty,
          i.restockedOnDay,
          i.soldOnDay,
          i.closingQty,
          i.closingQty === 0 ? "OUT" : i.closingQty <= i.lowThreshold ? "LOW" : "OK",
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(invRows), "Inventory");

      XLSX.writeFile(wb, `workshopbar_${from}_to_${to}.xlsx`);
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setDlLoading(false);
    }
  }

  const rangeLabel = mode === "daily" ? "Today" : mode === "weekly" ? "Last 7 Days" : `${fromDate} → ${toDate}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Reports</h1>
      </div>

      {/* Date range picker */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">From</p>
              <Input
                type="date"
                value={fromDate}
                max={today}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-36"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">To</p>
              <Input
                type="date"
                value={toDate}
                max={today}
                onChange={(e) => setToDate(e.target.value)}
                className="w-36"
              />
            </div>
            <Button size="sm" onClick={applyCustom}>Apply</Button>
            <div className="flex gap-1 ml-auto">
              <button
                onClick={() => applyPreset("daily")}
                className={`px-3 py-1.5 rounded-md text-sm border font-medium transition-colors ${mode === "daily" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-gray-400"}`}
              >
                Today
              </button>
              <button
                onClick={() => applyPreset("weekly")}
                className={`px-3 py-1.5 rounded-md text-sm border font-medium transition-colors ${mode === "weekly" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-gray-400"}`}
              >
                Last 7 Days
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue — {rangeLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-32" /> : (
              <p className="text-3xl font-bold">{formatCurrency(data?.totalRevenue ?? 0)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sales — {rangeLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-16" /> : (
              <p className="text-3xl font-bold">{data?.totalSales ?? 0}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-64 w-full" /> : data?.revenue.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No paid sales in this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data?.revenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${v}`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                <Area type="monotone" dataKey="amount" stroke="hsl(221.2 83.2% 53.3%)" fill="hsl(221.2 83.2% 53.3% / 0.15)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Selling Items</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-64 w-full" /> : data?.topItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No sales data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data?.topItems} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={120} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(221.2 83.2% 53.3%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Downloads */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Download Reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" onClick={downloadExcel} disabled={dlLoading}>
            <Download className="h-4 w-4 mr-2" />
            {dlLoading ? "Preparing..." : `Download Excel — ${rangeLabel}`}
          </Button>
          <p className="text-xs text-muted-foreground">
            Downloads a single .xlsx file with two sheets: Sales (date range) and Inventory (end date snapshot).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
