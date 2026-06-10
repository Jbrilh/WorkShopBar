"use client";

import { useState } from "react";
import { Plus, Pencil, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string | null;
  isActive: boolean;
  categoryId: string | null;
  category: Category | null;
}

interface MenuClientProps {
  initialItems: MenuItem[];
  initialCategories: Category[];
}

export function MenuClient({ initialItems, initialCategories }: MenuClientProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [items, setItems] = useState(initialItems);
  const [categories, setCategories] = useState(initialCategories);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    price: "",
    description: "",
    categoryId: "",
    newCategory: "",
  });

  function openCreate() {
    setEditingItem(null);
    setForm({ name: "", price: "", description: "", categoryId: "", newCategory: "" });
    setDialogOpen(true);
  }

  function openEdit(item: MenuItem) {
    setEditingItem(item);
    setForm({
      name: item.name,
      price: String(item.price),
      description: item.description ?? "",
      categoryId: item.categoryId ?? "",
      newCategory: "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      let categoryId = form.categoryId;

      // Create new category if provided
      if (form.newCategory.trim()) {
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.newCategory.trim() }),
        });
        if (!res.ok) throw new Error("Failed to create category");
        const newCat = await res.json();
        setCategories((prev) => [...prev, newCat]);
        categoryId = newCat.id;
      }

      const payload = {
        name: form.name,
        price: parseFloat(form.price),
        description: form.description || null,
        categoryId: categoryId || null,
      };

      if (editingItem) {
        const res = await fetch(`/api/menu/${editingItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update item");
        const updated = await res.json();
        setItems((prev) => prev.map((i) => (i.id === editingItem.id ? updated : i)));
        toast({ title: "Item updated" });
      } else {
        const res = await fetch("/api/menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create item");
        const created = await res.json();
        setItems((prev) => [...prev, created]);
        toast({ title: "Item created" });
      }

      setDialogOpen(false);
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(item: MenuItem) {
    const res = await fetch(`/api/menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    if (res.ok) {
      const updated = await res.json();
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    }
  }

  async function deleteItem(item: MenuItem) {
    if (!confirm(t("menu.confirmDelete"))) return;
    const res = await fetch(`/api/menu/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast({ title: `"${item.name}" deleted` });
    } else {
      toast({ title: "Error deleting item", variant: "destructive" });
    }
  }

  const grouped = categories.reduce<Record<string, MenuItem[]>>((acc, cat) => {
    acc[cat.id] = items.filter((i) => i.categoryId === cat.id);
    return acc;
  }, {});
  const uncategorized = items.filter((i) => !i.categoryId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("menu.title")}</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t("menu.addItem")}
        </Button>
      </div>

      {categories.map((cat) => {
        const catItems = grouped[cat.id] ?? [];
        if (catItems.length === 0) return null;
        return (
          <Card key={cat.id}>
            <CardHeader>
              <CardTitle className="text-base">{cat.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {catItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                      {!item.isActive && <Badge variant="secondary">{t("menu.inactive")}</Badge>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{formatCurrency(item.price)}</span>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleActive(item)} title={item.isActive ? t("menu.deactivate") : t("menu.activate")}>
                        {item.isActive ? (
                          <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteItem(item)} title="Delete item">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {uncategorized.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t("menu.uncategorized")}</CardTitle></CardHeader>
          <CardContent>
            {uncategorized.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <p className="font-medium text-sm">{item.name}</p>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatCurrency(item.price)}</span>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteItem(item)} title="Delete item">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? t("menu.editItem") : t("menu.addMenuItem")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("menu.name")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>{t("menu.price")}</Label>
              <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>{t("menu.category")}</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder={t("menu.selectCategory")} /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder={t("menu.newCategory")}
                value={form.newCategory}
                onChange={(e) => setForm({ ...form, newCategory: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("menu.description")}</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
              <Button type="submit" disabled={loading}>{loading ? t("common.saving") : t("common.save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
