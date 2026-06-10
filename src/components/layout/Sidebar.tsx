"use client";

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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLanguage, type TranslationKey } from "@/lib/i18n";

interface NavItem {
  href: string;
  labelKey: TranslationKey;
  icon: React.ElementType;
  ownerOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, ownerOnly: true },
  { href: "/sales/new", labelKey: "nav.newSale", icon: ShoppingCart },
  { href: "/sales", labelKey: "nav.salesHistory", icon: CreditCard },
  { href: "/customers", labelKey: "nav.customers", icon: Users },
  { href: "/tabs", labelKey: "nav.openTabs", icon: CreditCard },
  { href: "/menu", labelKey: "nav.menu", icon: UtensilsCrossed, ownerOnly: true },
  { href: "/inventory", labelKey: "nav.inventory", icon: Package, ownerOnly: true },
  { href: "/reports", labelKey: "nav.reports", icon: BarChart2, ownerOnly: true },
  { href: "/analytics", labelKey: "nav.analytics", icon: TrendingUp, ownerOnly: true },
];

interface SidebarProps {
  userRole: string;
  userName: string;
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();
  const isOwner = userRole === "OWNER";
  const { language, setLanguage, t } = useLanguage();

  const visibleItems = navItems.filter((item) => !item.ownerOnly || isOwner);

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r min-h-screen">
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <Beer className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">WorkShopBar</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t space-y-3">
        {/* Language toggle */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setLanguage("en")}
            className={cn(
              "flex-1 py-1 text-xs font-semibold rounded-md transition-colors",
              language === "en"
                ? "bg-white shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage("am")}
            className={cn(
              "flex-1 py-1 text-xs font-semibold rounded-md transition-colors",
              language === "am"
                ? "bg-white shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            አማ
          </button>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-900">{userName}</p>
          <p className="text-xs text-gray-500">{isOwner ? t("role.owner") : t("role.bartender")}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-gray-600"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {t("common.signOut")}
        </Button>
      </div>
    </aside>
  );
}
