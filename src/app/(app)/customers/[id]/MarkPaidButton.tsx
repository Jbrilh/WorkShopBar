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
import { Label } from "@/components/ui/label";
import { CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";

type PaymentMethod = "CASH" | "TELEBIRR" | "CBE";

export function MarkPaidButton({ saleId }: { saleId: string }) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();

  async function handlePay() {
    setLoading(true);
    const res = await fetch(`/api/sales/${saleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID", paymentMethod: method }),
    });

    if (res.ok) {
      toast({ title: t("customers.markPaid") });
      setOpen(false);
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
        <CheckCircle className="h-4 w-4 mr-1" />
        {t("customers.markPaid")}
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setMethod("CASH"); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("customers.markPaid")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handlePay} disabled={loading}>
              <CheckCircle className="h-4 w-4 mr-1" />
              {loading ? t("customers.marking") : t("customers.markPaid")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
