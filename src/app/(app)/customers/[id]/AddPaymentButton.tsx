"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import { PlusCircle } from "lucide-react";

type PaymentMethod = "CASH" | "TELEBIRR" | "CBE";

interface Props {
  saleId: string;
  remaining: number;
}

export function AddPaymentButton({ saleId, remaining }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    setLoading(true);
    const res = await fetch(`/api/sales/${saleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addPayment: val, paymentMethod: method }),
    });
    if (res.ok) {
      toast({ title: t("customers.recordPayment") });
      setOpen(false);
      setAmount("");
      setMethod("CASH");
      router.refresh();
    } else {
      toast({ title: t("common.error"), variant: "destructive" });
    }
    setLoading(false);
  }

  const methods: { value: PaymentMethod; label: string }[] = [
    { value: "CASH", label: t("payment.cash") },
    { value: "TELEBIRR", label: t("payment.telebirr") },
    { value: "CBE", label: t("payment.cbe") },
  ];

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
        {t("customers.addPayment")}
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setAmount(""); setMethod("CASH"); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("customers.recordPartialPayment")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("customers.remainingBalance")}{" "}
              <span className="font-semibold text-foreground">{formatCurrency(remaining)}</span>
            </p>
            <div className="space-y-2">
              <Label>{t("customers.amountPaid")}</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
              {amount && parseFloat(amount) > 0 && (
                <p className="text-xs text-muted-foreground">
                  {parseFloat(amount) >= remaining
                    ? t("customers.closeTab")
                    : `${t("customers.remainingAfterPayment")} ${formatCurrency(Math.max(0, remaining - parseFloat(amount)))}`}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("payment.method")}</Label>
              <div className="grid grid-cols-3 gap-2">
                {methods.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMethod(m.value)}
                    className={`py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                      method === m.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-gray-300"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !amount || parseFloat(amount) <= 0}
            >
              {loading ? t("customers.recording") : t("customers.recordPayment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
