import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import Link from "next/link";

export default async function CustomersPage() {
  await requireAuth();

  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { sales: true } },
      sales: {
        where: { status: "OPEN" },
        select: { totalAmount: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <Badge variant="secondary">{customers.length} customers</Badge>
      </div>

      {customers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No customers yet. They are created automatically when recording a sale.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {customers.map((c) => {
            const openTotal = c.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
            return (
              <Link key={c.id} href={`/customers/${c.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-4 px-6 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c._count.sales} total sales
                        {c.phone && ` · ${c.phone}`}
                      </p>
                    </div>
                    <div className="text-right">
                      {openTotal > 0 ? (
                        <Badge variant="warning">
                          Open: {formatCurrency(openTotal)}
                        </Badge>
                      ) : (
                        <Badge variant="success">No open tabs</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
