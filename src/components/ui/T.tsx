"use client";

import { useLanguage, type TranslationKey } from "@/lib/i18n";

export function T({ k }: { k: TranslationKey }) {
  const { t } = useLanguage();
  return <>{t(k)}</>;
}
