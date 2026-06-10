"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, Plus, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!search.trim()) {
        setCustomers([]);
        return;
      }
      const res = await fetch(`/api/customers?search=${encodeURIComponent(search)}`);
      if (res.ok) setCustomers(await res.json());
    }, 300);
  }, [search]);

  async function handleCreateNew() {
    if (!search.trim()) return;
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: search.trim() }),
    });
    if (res.ok) {
      const customer = await res.json();
      setSelectedName(customer.name);
      onChange(customer.id, customer.name);
      setOpen(false);
      setSearch("");
    }
  }

  function handleSelect(customer: Customer) {
    setSelectedName(customer.name);
    onChange(customer.id, customer.name);
    setOpen(false);
    setSearch("");
  }

  function handleClear() {
    setSelectedName(null);
    onChange(null, null);
    setSearch("");
  }

  const exactMatch = customers.some((c) => c.name.toLowerCase() === search.toLowerCase());

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="flex-1 justify-between"
          >
            {selectedName ?? "Search or add customer..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Type customer name..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {customers.length === 0 && search.trim() && (
                <CommandEmpty>
                  No customer found.
                </CommandEmpty>
              )}
              {customers.length > 0 && (
                <CommandGroup heading="Existing customers">
                  {customers.map((c) => (
                    <CommandItem key={c.id} onSelect={() => handleSelect(c)}>
                      <Check className={cn("mr-2 h-4 w-4", value === c.id ? "opacity-100" : "opacity-0")} />
                      {c.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {search.trim() && !exactMatch && (
                <CommandGroup heading="Create new">
                  <CommandItem onSelect={handleCreateNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create &quot;{search.trim()}&quot;
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedName && (
        <Button variant="ghost" size="icon" onClick={handleClear} title="Remove customer (anonymous sale)">
          <UserX className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
