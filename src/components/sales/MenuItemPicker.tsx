"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

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

interface MenuItemPickerProps {
  items: MenuItem[];
  cart: CartItem[];
  onCartChange: (cart: CartItem[]) => void;
}

export function MenuItemPicker({ items, cart, onCartChange }: MenuItemPickerProps) {
  function getQty(id: string) {
    return cart.find((c) => c.menuItemId === id)?.quantity ?? 0;
  }

  function setQty(id: string, qty: number) {
    if (qty <= 0) {
      onCartChange(cart.filter((c) => c.menuItemId !== id));
    } else {
      const existing = cart.find((c) => c.menuItemId === id);
      if (existing) {
        onCartChange(cart.map((c) => (c.menuItemId === id ? { ...c, quantity: qty } : c)));
      } else {
        onCartChange([...cart, { menuItemId: id, quantity: qty }]);
      }
    }
  }

  // Group by category
  const grouped = new Map<string, MenuItem[]>();
  for (const item of items) {
    const key = item.category?.name ?? "Other";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }

  return (
    <div className="space-y-4">
      {Array.from(grouped.entries()).map(([category, catItems]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">{category}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {catItems.map((item) => {
              const qty = getQty(item.id);
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    qty > 0 ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {qty > 0 && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setQty(item.id, qty - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Badge className="min-w-[2rem] justify-center">{qty}</Badge>
                      </>
                    )}
                    <Button
                      type="button"
                      variant={qty > 0 ? "outline" : "default"}
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setQty(item.id, qty + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
