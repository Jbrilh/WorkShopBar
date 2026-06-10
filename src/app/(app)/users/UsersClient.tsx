"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { UserPlus, Trash2, Users } from "lucide-react";

interface StaffUser {
  id: string;
  name: string;
  role: "OWNER" | "BARTENDER";
  createdAt: string;
}

export function UsersClient({ initialUsers }: { initialUsers: StaffUser[] }) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [users, setUsers] = useState(initialUsers);
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [form, setForm] = useState({ name: "", password: "", role: "BARTENDER" as "OWNER" | "BARTENDER" });

  async function handleAdd() {
    if (!form.name || !form.password) return;
    setAddLoading(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const created = await res.json();
      setUsers((prev) => [...prev, created]);
      setForm({ name: "", password: "", role: "BARTENDER" });
      setAddOpen(false);
      toast({ title: t("users.addStaff") });
    } else {
      toast({ title: t("common.error"), variant: "destructive" });
    }
    setAddLoading(false);
  }

  async function handleDelete(user: StaffUser) {
    if (!confirm(`${t("users.confirmDelete")} "${user.name}"?`)) return;
    const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      toast({ title: t("users.removed") });
    } else {
      const err = await res.json();
      toast({ title: err.error ?? t("common.error"), variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("users.title")}</h1>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          {t("users.addStaff")}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">{t("users.addNote")}</p>

      {users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>{t("users.noStaff")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="py-3 px-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium">{user.name}</p>
                  </div>
                  <Badge variant={user.role === "OWNER" ? "default" : "secondary"}>
                    {user.role === "OWNER" ? t("role.owner") : t("role.bartender")}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(user)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("users.addStaff")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("common.name")}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Dawit"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("users.password")}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min. 4 characters"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("users.role")}</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as "OWNER" | "BARTENDER" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BARTENDER">{t("role.bartender")}</SelectItem>
                  <SelectItem value="OWNER">{t("role.owner")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAdd} disabled={addLoading || !form.name || !form.password}>
              {addLoading ? t("common.saving") : t("common.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
