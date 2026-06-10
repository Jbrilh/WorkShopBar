"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  CreditCard,
  UtensilsCrossed,
  Package,
  BarChart2,
  TrendingUp,
  Beer,
  LogOut,
  Menu,
  X,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLanguage, type TranslationKey } from "@/lib/i18n";

const navItems: { href: string; labelKey: TranslationKey; icon: React.ElementType; ownerOnly?: boolean }[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, ownerOnly: true },
  { href: "/sales/new", labelKey: "nav.newSale", icon: ShoppingCart },
  { href: "/sales", labelKey: "nav.salesHistory", icon: CreditCard },
  { href: "/customers", labelKey: "nav.customers", icon: Users },
  { href: "/tabs", labelKey: "nav.openTabs", icon: CreditCard },
  { href: "/menu", labelKey: "nav.menu", icon: UtensilsCrossed, ownerOnly: true },
  { href: "/inventory", labelKey: "nav.inventory", icon: Package, ownerOnly: true },
  { href: "/reports", labelKey: "nav.reports", icon: BarChart2, ownerOnly: true },
  { href: "/analytics", labelKey: "nav.analytics", icon: TrendingUp, ownerOnly: true },
  { href: "/users", labelKey: "nav.staff", icon: UserCog, ownerOnly: true },
];

interface MobileNavProps {
  userRole: string;
  userName: string;
}

export function MobileNav({ userRole, userName }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isOwner = userRole === "OWNER";
  const { language, setLanguage, t } = useLanguage();
  const visibleItems = navItems.filter((item) => !item.ownerOnly || isOwner);

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <div className="flex items-center gap-2">
          <Beer className="h-5 w-5 text-primary" />
          <span className="font-bold">WorkShopBar</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <div className="flex gap-0.5 p-0.5 bg-muted rounded-md">
            <button
              onClick={() => setLanguage("en")}
              className={cn(
                "px-2 py-0.5 text-xs font-semibold rounded transition-colors",
                language === "en" ? "bg-white shadow text-foreground" : "text-muted-foreground"
              )}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage("am")}
              className={cn(
                "px-2 py-0.5 text-xs font-semibold rounded transition-colors",
                language === "am" ? "bg-white shadow text-foreground" : "text-muted-foreground"
              )}
            >
              አማ
            </button>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="bg-white border-b shadow-lg">
          <nav className="p-4 space-y-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>
          <div className="px-4 pb-4 border-t pt-3">
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs text-gray-500 mb-2">
              {isOwner ? t("role.owner") : t("role.bartender")}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t("common.signOut")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
