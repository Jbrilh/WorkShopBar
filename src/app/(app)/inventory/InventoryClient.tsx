"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { Edit2, Trash2, Plus } from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  category: { name: string } | null;
}

interface InventoryItem {
  id: string;
  menuItemId: string;
  quantity: number;
  unit: string;
  lowThreshold: number;
  menuItem: {
    id: string;
    name: string;
    category: { name: string } | null;
  };
}

function stockStatus(item: InventoryItem): "ok" | "low" | "out" {
  if (item.quantity === 0) return "out";
  if (item.quantity <= item.lowThreshold) return "low";
  return "ok";
}

interface Props {
  initialItems: InventoryItem[];
  untrackedItems: MenuItem[];
}

export function InventoryClient({ initialItems, untrackedItems }: Props) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [items, setItems] = useState(initialItems);
  const [untracked, setUntracked] = useState(untrackedItems);

  // Edit dialog
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState({ quantity: "", unit: "", lowThreshold: "" });
  const [editLoading, setEditLoading] = useState(false);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ menuItemId: "", quantity: "0", unit: "units", lowThreshold: "5" });
  const [addLoading, setAddLoading] = useState(false);

  function openEdit(item: InventoryItem) {
    setEditing(item);
    setEditForm({ quantity: String(item.quantity), unit: item.unit, lowThreshold: String(item.lowThreshold) });
  }

  async function handleSave() {
    if (!editing) return;
    setEditLoading(true);
    const res = await fetch(`/api/inventory/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity: parseInt(editForm.quantity),
        unit: editForm.unit,
        lowThreshold: parseInt(editForm.lowThreshold),
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setItems((prev) => prev.map((i) => (i.id === editing.id ? updated : i)));
      toast({ title: t("inventory.stockUpdated") });
      setEditing(null);
    } else {
      toast({ title: t("common.error"), variant: "destructive" });
    }
    setEditLoading(false);
  }

  async function handleDelete(item: InventoryItem) {
    if (!confirm(`${t("inventory.trackingRemoved")} "${item.menuItem.name}"?`)) return;
    const res = await fetch(`/api/inventory/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setUntracked((prev) => [...prev, { id: item.menuItem.id, name: item.menuItem.name, category: item.menuItem.category }]);
      toast({ title: t("inventory.trackingRemoved") });
    } else {
      toast({ title: t("common.error"), variant: "destructive" });
    }
  }

  async function handleAdd() {
    if (!addForm.menuItemId) return;
    setAddLoading(true);
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menuItemId: addForm.menuItemId,
        quantity: parseInt(addForm.quantity),
        unit: addForm.unit,
        lowThreshold: parseInt(addForm.lowThreshold),
      }),
    });
    if (res.ok) {
      const created = await res.json();
      setItems((prev) => [...prev, created]);
      setUntracked((prev) => prev.filter((m) => m.id !== addForm.menuItemId));
      setAddForm({ menuItemId: "", quantity: "0", unit: "units", lowThreshold: "5" });
      setAddOpen(false);
      toast({ title: t("inventory.itemAdded") });
    } else {
      toast({ title: t("common.error"), variant: "destructive" });
    }
    setAddLoading(false);
  }

  const lowCount = items.filter((i) => stockStatus(i) !== "ok").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("inventory.title")}</h1>
        <div className="flex items-center gap-3">
          {lowCount > 0 && <Badge variant="warning">{lowCount} {t("inventory.needsAttention")}</Badge>}
          {untracked.length > 0 && (
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("inventory.trackItem")}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("inventory.stockLevels")}</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("inventory.empty")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("inventory.item")}</TableHead>
                  <TableHead>{t("inventory.category")}</TableHead>
                  <TableHead>{t("inventory.stock")}</TableHead>
                  <TableHead>{t("inventory.unit")}</TableHead>
                  <TableHead>{t("inventory.lowAt")}</TableHead>
                  <TableHead>{t("inventory.status")}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const status = stockStatus(item);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.menuItem.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {item.menuItem.category?.name ?? "—"}
                      </TableCell>
                      <TableCell className="font-bold">{item.quantity}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.unit}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.lowThreshold}</TableCell>
                      <TableCell>
                        {status === "out" && <Badge variant="destructive">{t("inventory.out")}</Badge>}
                        {status === "low" && <Badge variant="warning">{t("inventory.low")}</Badge>}
                        {status === "ok" && <Badge variant="success">{t("inventory.ok")}</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("inventory.adjustStock")} — {editing?.menuItem.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("inventory.currentQty")}</Label>
              <Input type="number" min="0" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("inventory.unitLabel")}</Label>
              <Input value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("inventory.lowThreshold")}</Label>
              <Input type="number" min="0" value={editForm.lowThreshold} onChange={(e) => setEditForm({ ...editForm, lowThreshold: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={editLoading}>{editLoading ? t("common.saving") : t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("inventory.trackNew")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("inventory.menuItem")}</Label>
              <Select value={addForm.menuItemId} onValueChange={(v) => setAddForm({ ...addForm, menuItemId: v })}>
                <SelectTrigger><SelectValue placeholder={t("inventory.selectItem")} /></SelectTrigger>
                <SelectContent>
                  {untracked.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("inventory.startingQty")}</Label>
              <Input type="number" min="0" value={addForm.quantity} onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("inventory.unit")}</Label>
              <Input placeholder="bottles, pints, units..." value={addForm.unit} onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("inventory.lowAlert")}</Label>
              <Input type="number" min="0" value={addForm.lowThreshold} onChange={(e) => setAddForm({ ...addForm, lowThreshold: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAdd} disabled={addLoading || !addForm.menuItemId}>{addLoading ? t("common.saving") : t("common.add")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
