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
  Beer,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales/new", label: "New Sale", icon: ShoppingCart },
  { href: "/sales", label: "Sales History", icon: CreditCard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/tabs", label: "Open Tabs", icon: CreditCard },
  { href: "/menu", label: "Menu", icon: UtensilsCrossed, ownerOnly: true },
  { href: "/inventory", label: "Inventory", icon: Package, ownerOnly: true },
  { href: "/reports", label: "Reports", icon: BarChart2, ownerOnly: true },
];

interface MobileNavProps {
  userRole: string;
  userName: string;
}

export function MobileNav({ userRole, userName }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isOwner = userRole === "OWNER";
  const visibleItems = navItems.filter((item) => !item.ownerOnly || isOwner);

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <div className="flex items-center gap-2">
          <Beer className="h-5 w-5 text-primary" />
          <span className="font-bold">WorkShopBar</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
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
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="px-4 pb-4 border-t pt-3">
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs text-gray-500 mb-2">{isOwner ? "Owner" : "Bartender"}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
