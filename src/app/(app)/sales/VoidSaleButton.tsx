"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";

export function VoidSaleButton({ saleId, onVoided }: { saleId: string; onVoided: (id: string) => void }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  async function handleVoid() {
    if (!confirm(t("sales.voidConfirm"))) return;
    setLoading(true);
    const res = await fetch(`/api/sales/${saleId}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: t("sales.voided") });
      onVoided(saleId);
    } else {
      toast({ title: t("common.error"), variant: "destructive" });
    }
    setLoading(false);
  }

  return (
    <Button size="sm" variant="ghost" onClick={handleVoid} disabled={loading} className="text-destructive hover:text-destructive">
      <Trash2 className="h-3.5 w-3.5 mr-1" />
      {loading ? t("sales.voiding") : t("sales.void")}
    </Button>
  );
}
