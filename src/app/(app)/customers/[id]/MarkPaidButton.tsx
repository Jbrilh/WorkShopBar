"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";

export function MarkPaidButton({ saleId }: { saleId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();

  async function handlePay() {
    setLoading(true);
    const res = await fetch(`/api/sales/${saleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID" }),
    });

    if (res.ok) {
      toast({ title: t("customers.markPaid") });
      router.refresh();
    } else {
      toast({ title: t("common.error"), variant: "destructive" });
    }
    setLoading(false);
  }

  return (
    <Button size="sm" variant="outline" onClick={handlePay} disabled={loading}>
      <CheckCircle className="h-4 w-4 mr-1" />
      {loading ? t("customers.marking") : t("customers.markPaid")}
    </Button>
  );
}
