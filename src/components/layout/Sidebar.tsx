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
  Beer,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  ownerOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales/new", label: "New Sale", icon: ShoppingCart },
  { href: "/sales", label: "Sales History", icon: CreditCard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/tabs", label: "Open Tabs", icon: CreditCard },
  { href: "/menu", label: "Menu", icon: UtensilsCrossed, ownerOnly: true },
  { href: "/inventory", label: "Inventory", icon: Package, ownerOnly: true },
  { href: "/reports", label: "Reports", icon: BarChart2, ownerOnly: true },
];

interface SidebarProps {
  userRole: string;
  userName: string;
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();
  const isOwner = userRole === "OWNER";

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
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="mb-3">
          <p className="text-sm font-medium text-gray-900">{userName}</p>
          <p className="text-xs text-gray-500">{isOwner ? "Owner" : "Bartender"}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-gray-600"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
