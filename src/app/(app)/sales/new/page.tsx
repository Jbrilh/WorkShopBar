"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CustomerSearch } from "@/components/sales/CustomerSearch";
import { MenuItemPicker } from "@/components/sales/MenuItemPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart } from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: { name: string } | null;
}

interface CartItem {
  menuItemId: string;
  quantity: number;
}

export default function NewSalePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [status, setStatus] = useState<"PAID" | "OPEN">("PAID");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/menu?active=true")
      .then((r) => r.json())
      .then(setMenuItems);
  }, []);

  const priceMap = Object.fromEntries(menuItems.map((m) => [m.id, m.price]));
  const total = cart.reduce((sum, item) => sum + (priceMap[item.menuItemId] ?? 0) * item.quantity, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) {
      toast({ title: "Add at least one item", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customerId || undefined,
          status,
          notes: notes || undefined,
          items: cart,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create sale");
      }

      toast({
        title: status === "PAID" ? "Sale recorded — paid" : "Sale recorded — open tab",
      });
      router.push("/sales");
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">New Sale</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer (optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerSearch
              value={customerId}
              onChange={(id) => setCustomerId(id)}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Leave empty for an anonymous sale.
            </p>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Items</CardTitle>
          </CardHeader>
          <CardContent>
            <MenuItemPicker
              items={menuItems}
              cart={cart}
              onCartChange={setCart}
            />
          </CardContent>
        </Card>

        {/* Payment status + total */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStatus("PAID")}
                className={`flex-1 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                  status === "PAID"
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-border text-muted-foreground hover:border-gray-300"
                }`}
              >
                Paid now
              </button>
              <button
                type="button"
                onClick={() => setStatus("OPEN")}
                className={`flex-1 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                  status === "OPEN"
                    ? "border-yellow-500 bg-yellow-50 text-yellow-700"
                    : "border-border text-muted-foreground hover:border-gray-300"
                }`}
              >
                Open tab (unpaid)
              </button>
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any notes about this sale..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Cart summary */}
            {cart.length > 0 && (
              <div className="border rounded-lg p-3 space-y-1">
                {cart.map((item) => {
                  const mi = menuItems.find((m) => m.id === item.menuItemId);
                  if (!mi) return null;
                  return (
                    <div key={item.menuItemId} className="flex justify-between text-sm">
                      <span>{item.quantity}x {mi.name}</span>
                      <span>{formatCurrency(mi.price * item.quantity)}</span>
                    </div>
                  );
                })}
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" size="lg" disabled={loading || cart.length === 0}>
          <ShoppingCart className="h-4 w-4 mr-2" />
          {loading ? "Recording..." : `Record Sale${cart.length > 0 ? ` — ${formatCurrency(total)}` : ""}`}
        </Button>
      </form>
    </div>
  );
}
