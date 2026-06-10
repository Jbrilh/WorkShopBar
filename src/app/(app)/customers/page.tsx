import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";
import Link from "next/link";
import { AddCustomerButton } from "./AddCustomerButton";
import { T } from "@/components/ui/T";

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
        <h1 className="text-2xl font-bold"><T k="customers.title" /></h1>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{customers.length} customers</Badge>
          <AddCustomerButton />
        </div>
      </div>

      {customers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p><T k="customers.noCustomers" /></p>
            <p className="text-xs mt-1"><T k="customers.addNote" /></p>
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
                        {c._count.sales} <T k="customers.totalSales" />
                        {c.phone && ` · ${c.phone}`}
                      </p>
                    </div>
                    <div className="text-right">
                      {openTotal > 0 ? (
                        <Badge variant="warning">
                          <T k="customers.open" /> {formatCurrency(openTotal)}
                        </Badge>
                      ) : (
                        <Badge variant="success"><T k="customers.noOpenTabs" /></Badge>
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
