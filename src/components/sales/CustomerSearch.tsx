"use client";

import { useState, useEffect, useRef } from "react";
import { UserX, Search, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
}

interface CustomerSearchProps {
  value: string | null;
  onChange: (id: string | null, name: string | null) => void;
}

export function CustomerSearch({ value, onChange }: CustomerSearchProps) {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!search.trim()) { setCustomers([]); return; }
      const res = await fetch(`/api/customers?search=${encodeURIComponent(search)}`);
      if (res.ok) setCustomers(await res.json());
    }, 300);
  }, [search]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(customer: Customer) {
    setSelectedName(customer.name);
    onChange(customer.id, customer.name);
    setSearch("");
    setOpen(false);
  }

  async function handleCreate() {
    if (!search.trim()) return;
    setCreating(true);
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: search.trim() }),
    });
    if (res.ok) {
      const customer = await res.json();
      setSelectedName(customer.name);
      onChange(customer.id, customer.name);
      setSearch("");
      setOpen(false);
    }
    setCreating(false);
  }

  function handleClear() {
    setSelectedName(null);
    onChange(null, null);
    setSearch("");
  }

  const exactMatch = customers.some(
    (c) => c.name.toLowerCase() === search.toLowerCase()
  );
  const showCreate = search.trim() && !exactMatch;

  if (selectedName) {
    return (
      <div className="flex gap-2 items-center">
        <div className="flex-1 flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-background text-sm">
          <Check className="h-4 w-4 text-primary shrink-0" />
          <span>{selectedName}</span>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={handleClear} title="Remove customer">
          <UserX className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search customer name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="pl-9"
        />
      </div>

      {open && (search.trim() || customers.length > 0) && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-md">
          {customers.length > 0 && (
            <ul className="py-1 max-h-48 overflow-y-auto">
              {customers.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(c); }}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {showCreate && (
            <div className={cn("border-t", customers.length === 0 && "border-t-0")}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-accent hover:text-accent-foreground text-primary font-medium"
                onMouseDown={(e) => { e.preventDefault(); handleCreate(); }}
                disabled={creating}
              >
                <Plus className="h-4 w-4" />
                {creating ? "Adding..." : `Add "${search.trim()}"`}
              </button>
            </div>
          )}

          {!search.trim() && customers.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">Type to search...</p>
          )}
          {search.trim() && customers.length === 0 && !showCreate && (
            <p className="px-3 py-2 text-sm text-muted-foreground">No customers found.</p>
          )}
        </div>
      )}
    </div>
  );
}
