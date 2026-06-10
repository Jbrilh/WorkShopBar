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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Edit2 } from "lucide-react";

interface InventoryItem {
  id: string;
  quantity: number;
  unit: string;
  lowThreshold: number;
  menuItem: {
    name: string;
    category: { name: string } | null;
  };
}

function stockStatus(item: InventoryItem): "ok" | "low" | "out" {
  if (item.quantity === 0) return "out";
  if (item.quantity <= item.lowThreshold) return "low";
  return "ok";
}

export function InventoryClient({ initialItems }: { initialItems: InventoryItem[] }) {
  const { toast } = useToast();
  const [items, setItems] = useState(initialItems);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState({ quantity: "", unit: "", lowThreshold: "" });
  const [loading, setLoading] = useState(false);

  function openEdit(item: InventoryItem) {
    setEditing(item);
    setForm({
      quantity: String(item.quantity),
      unit: item.unit,
      lowThreshold: String(item.lowThreshold),
    });
  }

  async function handleSave() {
    if (!editing) return;
    setLoading(true);
    const res = await fetch(`/api/inventory/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity: parseInt(form.quantity),
        unit: form.unit,
        lowThreshold: parseInt(form.lowThreshold),
      }),
    });

    if (res.ok) {
      const updated = await res.json();
      setItems((prev) => prev.map((i) => (i.id === editing.id ? updated : i)));
      toast({ title: "Stock updated" });
      setEditing(null);
    } else {
      toast({ title: "Error", variant: "destructive" });
    }
    setLoading(false);
  }

  const lowCount = items.filter((i) => stockStatus(i) !== "ok").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventory</h1>
        {lowCount > 0 && (
          <Badge variant="warning">{lowCount} items need attention</Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stock Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Low at</TableHead>
                <TableHead>Status</TableHead>
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
                      {status === "out" && <Badge variant="destructive">OUT</Badge>}
                      {status === "low" && <Badge variant="warning">LOW</Badge>}
                      {status === "ok" && <Badge variant="success">OK</Badge>}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock — {editing?.menuItem.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Quantity</Label>
              <Input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Unit (e.g. bottles, pints)</Label>
              <Input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Low Stock Threshold</Label>
              <Input
                type="number"
                min="0"
                value={form.lowThreshold}
                onChange={(e) => setForm({ ...form, lowThreshold: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
