import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, CreditCard, AlertTriangle, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { startOfDay } from "date-fns";

export default async function DashboardPage() {
  const session = await auth();
  const isOwner = session?.user?.role === "OWNER";
  const today = startOfDay(new Date());

  const [todayRevenue, openTabsCount, lowStockItems, recentSales, todaySalesCount] =
    await Promise.all([
      prisma.sale.aggregate({
        where: { status: "PAID", paidAt: { gte: today } },
        _sum: { totalAmount: true },
      }),
      prisma.sale.count({ where: { status: "OPEN" } }),
      prisma.$queryRaw<{ name: string; quantity: number; lowThreshold: number }[]>`
        SELECT mi.name, ii.quantity, ii."lowThreshold"
        FROM "InventoryItem" ii
        JOIN "MenuItem" mi ON ii."menuItemId" = mi.id
        WHERE ii.quantity <= ii."lowThreshold"
        LIMIT 5
      `,
      prisma.sale.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          customer: true,
          items: { include: { menuItem: true } },
        },
      }),
      prisma.sale.count({ where: { createdAt: { gte: today } } }),
    ]);

  const revenue = Number(todayRevenue._sum.totalAmount ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link href="/sales/new">
          <Button>
            <ShoppingCart className="h-4 w-4 mr-2" />
            New Sale
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isOwner && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Today&apos;s Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(revenue)}</div>
              <p className="text-xs text-muted-foreground">From paid sales today</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sales Today</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaySalesCount}</div>
            <p className="text-xs text-muted-foreground">Total orders recorded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Tabs</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openTabsCount}</div>
            <Link href="/tabs" className="text-xs text-primary hover:underline">
              View all open tabs →
            </Link>
          </CardContent>
        </Card>

        {isOwner && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lowStockItems.length}</div>
              <Link href="/inventory" className="text-xs text-primary hover:underline">
                View inventory →
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Sales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales yet today.</p>
            ) : (
              recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {sale.customer?.name ?? "Anonymous"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sale.items.map((i) => i.menuItem.name).join(", ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(Number(sale.totalAmount))}</p>
                    <Badge variant={sale.status === "PAID" ? "success" : "warning"} className="text-xs">
                      {sale.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
            <Link href="/sales" className="text-xs text-primary hover:underline block pt-2">
              View all sales →
            </Link>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        {isOwner && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Low Stock Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lowStockItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">All items are well stocked.</p>
              ) : (
                lowStockItems.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <p className="text-sm font-medium">{item.name}</p>
                    <Badge variant={item.quantity === 0 ? "destructive" : "warning"}>
                      {item.quantity === 0 ? "OUT" : `${item.quantity} left`}
                    </Badge>
                  </div>
                ))
              )}
              <Link href="/inventory" className="text-xs text-primary hover:underline block pt-2">
                Manage inventory →
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
