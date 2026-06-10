import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, CreditCard, AlertTriangle, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { startOfDay } from "date-fns";
import { T } from "@/components/ui/T";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OWNER") redirect("/sales");
  const isOwner = true;
  const today = startOfDay(new Date());

  const [todayRevenue, openTabsCount, lowStockItems, recentSales, todaySalesCount] =
    await Promise.all([
      prisma.payment.aggregate({
        where: { createdAt: { gte: today } },
        _sum: { amount: true },
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

  const revenue = Number(todayRevenue._sum.amount ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold"><T k="dashboard.title" /></h1>
        <Link href="/sales/new">
          <Button>
            <ShoppingCart className="h-4 w-4 mr-2" />
            <T k="dashboard.newSale" />
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isOwner && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium"><T k="dashboard.todayRevenue" /></CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(revenue)}</div>
              <p className="text-xs text-muted-foreground">Cash collected today</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium"><T k="dashboard.salesToday" /></CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaySalesCount}</div>
            <p className="text-xs text-muted-foreground"><T k="dashboard.salesTodaySub" /></p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium"><T k="dashboard.openTabs" /></CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openTabsCount}</div>
            <Link href="/tabs" className="text-xs text-primary hover:underline">
              <T k="dashboard.viewAllTabs" />
            </Link>
          </CardContent>
        </Card>

        {isOwner && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium"><T k="dashboard.lowStock" /></CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lowStockItems.length}</div>
              <Link href="/inventory" className="text-xs text-primary hover:underline">
                <T k="dashboard.viewInventory" />
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base"><T k="dashboard.recentSales" /></CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground"><T k="dashboard.noSalesToday" /></p>
            ) : (
              recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {sale.customer?.name ?? <T k="common.anonymous" />}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sale.items.map((i) => i.menuItem.name).join(", ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(Number(sale.totalAmount))}</p>
                    <Badge variant={sale.status === "PAID" ? "success" : "warning"} className="text-xs">
                      {sale.status === "PAID" ? <T k="sales.paid" /> : <T k="sales.unpaid" />}
                    </Badge>
                  </div>
                </div>
              ))
            )}
            <Link href="/sales" className="text-xs text-primary hover:underline block pt-2">
              <T k="dashboard.viewAllSales" />
            </Link>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        {isOwner && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base"><T k="dashboard.lowStockAlerts" /></CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lowStockItems.length === 0 ? (
                <p className="text-sm text-muted-foreground"><T k="dashboard.wellStocked" /></p>
              ) : (
                lowStockItems.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <p className="text-sm font-medium">{item.name}</p>
                    <Badge variant={item.quantity === 0 ? "destructive" : "warning"}>
                      {item.quantity === 0 ? <T k="dashboard.out" /> : <>{item.quantity} <T k="dashboard.left" /></>}
                    </Badge>
                  </div>
                ))
              )}
              <Link href="/inventory" className="text-xs text-primary hover:underline block pt-2">
                <T k="dashboard.manageInventory" />
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
