// Searchable provider selector (banks, card issuers, wallets, brokers).
// Results are grouped; typing anything not in the directory is always allowed.

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
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
import { groupedProviders, type ProviderKind } from "@/lib/account-providers";

export function ProviderCombobox({
  value,
  onChange,
  kind = "any",
  placeholder = "Search…",
}: {
  value: string;
  onChange: (v: string) => void;
  kind?: ProviderKind;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const groups = useMemo(() => groupedProviders(query, kind), [query, kind]);
  const custom = query.trim();
  const hasExact = groups.some((g) =>
    g.items.some((i) => i.name.toLowerCase() === custom.toLowerCase()),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between border-border bg-surface-2 font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-72">
            {groups.length === 0 && !custom && <CommandEmpty>No matches.</CommandEmpty>}
            {custom && !hasExact && (
              <CommandGroup heading="Other / Custom">
                <CommandItem
                  value={`__custom__${custom}`}
                  onSelect={() => {
                    onChange(custom);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <Plus className="mr-2 h-4 w-4 text-mint" />
                  Custom — use “{custom}”
                </CommandItem>
              </CommandGroup>
            )}
            {groups.map((g) => (
              <CommandGroup key={g.group} heading={g.group}>
                {g.items.map((item) => (
                  <CommandItem
                    key={item.name}
                    value={item.name}
                    onSelect={() => {
                      onChange(item.name);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === item.name ? "opacity-100 text-mint" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{item.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
