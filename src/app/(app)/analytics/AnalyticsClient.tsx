"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";

type Period = "daily" | "monthly" | "yearly";

interface DataPoint {
  label: string;
  revenue: number;
  sales: number;
}

interface AnalyticsData {
  daily: DataPoint[];
  monthly: DataPoint[];
  yearly: DataPoint[];
}

function SummaryCard({ label, revenue, sales, paidSalesLabel }: { label: string; revenue: number; sales: number; paidSalesLabel: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{formatCurrency(revenue)}</p>
        <p className="text-xs text-muted-foreground mt-1">{sales} {paidSalesLabel}</p>
      </CardContent>
    </Card>
  );
}

export function AnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<Period>("monthly");
  const { t } = useLanguage();

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setData);
  }, []);

  const periodData = data?.[period] ?? [];
  const totalRevenue = periodData.reduce((s, d) => s + d.revenue, 0);
  const totalSales = periodData.reduce((s, d) => s + d.sales, 0);

  const periodLabel: Record<Period, string> = {
    daily: t("analytics.last30"),
    monthly: t("analytics.last12"),
    yearly: t("analytics.allTime"),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("analytics.title")}</h1>
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {(["daily", "monthly", "yearly"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                period === p
                  ? "bg-white shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "daily" ? t("analytics.daily") : p === "monthly" ? t("analytics.monthly") : t("analytics.yearly")}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      {!data ? (
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <SummaryCard
            label={`${t("analytics.totalRevenue")} — ${periodLabel[period]}`}
            revenue={totalRevenue}
            sales={totalSales}
            paidSalesLabel={t("analytics.paidSales")}
          />
          <SummaryCard
            label={t("analytics.allTimeRevenue")}
            revenue={data.yearly.reduce((s, d) => s + d.revenue, 0)}
            sales={data.yearly.reduce((s, d) => s + d.sales, 0)}
            paidSalesLabel={t("analytics.paidSales")}
          />
        </div>
      )}

      {/* Revenue chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("analytics.revenue")} — {periodLabel[period]}</CardTitle>
        </CardHeader>
        <CardContent>
          {!data ? (
            <Skeleton className="h-64 w-full" />
          ) : periodData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">{t("analytics.noData")}</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={periodData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => formatCurrency(Number(v ?? 0))}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Bar dataKey="revenue" fill="hsl(221.2 83.2% 53.3%)" radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Sales count chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("analytics.salesCount")} — {periodLabel[period]}</CardTitle>
        </CardHeader>
        <CardContent>
          {!data ? (
            <Skeleton className="h-48 w-full" />
          ) : periodData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">{t("analytics.noData")}</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={periodData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip labelStyle={{ fontWeight: 600 }} />
                <Bar dataKey="sales" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} name="Sales" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
