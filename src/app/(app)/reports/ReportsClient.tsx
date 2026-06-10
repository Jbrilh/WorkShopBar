"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ReportData {
  revenue: { label: string; amount: number }[];
  topItems: { name: string; count: number }[];
  totalRevenue: number;
  totalSales: number;
}

export function ReportsClient() {
  const [range, setRange] = useState<"daily" | "weekly">("weekly");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports?range=${range}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [range]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex gap-2">
          <Button
            variant={range === "daily" ? "default" : "outline"}
            size="sm"
            onClick={() => setRange("daily")}
          >
            Today
          </Button>
          <Button
            variant={range === "weekly" ? "default" : "outline"}
            size="sm"
            onClick={() => setRange("weekly")}
          >
            Last 7 Days
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {range === "daily" ? "Today's Revenue" : "7-Day Revenue"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-3xl font-bold">{formatCurrency(data?.totalRevenue ?? 0)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {range === "daily" ? "Sales Today" : "Sales (7 Days)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
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
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : data?.revenue.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No paid sales in this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data?.revenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(221.2 83.2% 53.3%)"
                  fill="hsl(221.2 83.2% 53.3% / 0.15)"
                />
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
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : data?.topItems.length === 0 ? (
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
    </div>
  );
}
