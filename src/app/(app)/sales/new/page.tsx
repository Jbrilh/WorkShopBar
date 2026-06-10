"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CustomerSearch } from "@/components/sales/CustomerSearch";
import { MenuItemPicker } from "@/components/sales/MenuItemPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
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

type PaymentMode = "PAID" | "PARTIAL" | "OPEN";

export default function NewSalePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("PAID");
  const [partialAmount, setPartialAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

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
      toast({ title: t("sales.addItemFirst"), variant: "destructive" });
      return;
    }

    const amountPaid = paymentMode === "PARTIAL" ? parseFloat(partialAmount) : 0;
    if (paymentMode === "PARTIAL" && (!amountPaid || amountPaid <= 0 || amountPaid >= total)) {
      toast({ title: t("sales.remainingOnTab"), variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customerId || undefined,
          status: paymentMode === "PAID" ? "PAID" : "OPEN",
          amountPaid: paymentMode === "PARTIAL" ? amountPaid : 0,
          notes: notes || undefined,
          items: cart,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create sale");
      }

      const labels: Record<PaymentMode, string> = {
        PAID: t("sales.paid"),
        PARTIAL: t("sales.partialPayment"),
        OPEN: t("sales.openTab"),
      };
      toast({ title: `${t("sales.recordSale")} — ${labels[paymentMode]}` });
      router.push("/sales");
    } catch (err: unknown) {
      toast({
        title: t("common.error"),
        description: err instanceof Error ? err.message : t("common.somethingWentWrong"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const remaining = paymentMode === "PARTIAL" && partialAmount
    ? Math.max(0, total - parseFloat(partialAmount || "0"))
    : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{t("sales.newSale")}</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("sales.customerOptional")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerSearch
              value={customerId}
              onChange={(id) => setCustomerId(id)}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {t("sales.anonymousHint")}
            </p>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("sales.items")}</CardTitle>
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
            <CardTitle className="text-base">{t("sales.payment")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMode("PAID")}
                className={`py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                  paymentMode === "PAID"
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-border text-muted-foreground hover:border-gray-300"
                }`}
              >
                {t("sales.paidNow")}
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode("PARTIAL")}
                className={`py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                  paymentMode === "PARTIAL"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-border text-muted-foreground hover:border-gray-300"
                }`}
              >
                {t("sales.partialPayment")}
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode("OPEN")}
                className={`py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                  paymentMode === "OPEN"
                    ? "border-yellow-500 bg-yellow-50 text-yellow-700"
                    : "border-border text-muted-foreground hover:border-gray-300"
                }`}
              >
                {t("sales.openTab")}
              </button>
            </div>

            {paymentMode === "PARTIAL" && (
              <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Label className="text-blue-800">{t("sales.amountPaidNow")}</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  className="bg-white"
                />
                {partialAmount && parseFloat(partialAmount) > 0 && (
                  <p className="text-sm text-blue-700">
                    {t("sales.remainingOnTab")} <span className="font-semibold">{formatCurrency(remaining)}</span>
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>{t("sales.notesOptional")}</Label>
              <Textarea
                placeholder={t("sales.notesPlaceholder")}
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
                  <span>{t("sales.total")}</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                {paymentMode === "PARTIAL" && partialAmount && parseFloat(partialAmount) > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-green-700 pt-1">
                      <span>{t("sales.paidNow")}</span>
                      <span>{formatCurrency(parseFloat(partialAmount))}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold text-yellow-700">
                      <span>{t("sales.remainingOwed")}</span>
                      <span>{formatCurrency(remaining)}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" size="lg" disabled={loading || cart.length === 0}>
          <ShoppingCart className="h-4 w-4 mr-2" />
          {loading ? t("sales.recording") : `${t("sales.recordSale")}${cart.length > 0 ? ` — ${formatCurrency(total)}` : ""}`}
        </Button>
      </form>
    </div>
  );
}
