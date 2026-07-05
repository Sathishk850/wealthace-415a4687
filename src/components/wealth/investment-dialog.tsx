import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClearButton, isDirty } from "@/components/clear-button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  INVESTMENT_CATEGORIES,
  type Investment,
  type InvestmentInput,
  useUpsertInvestment,
} from "@/lib/wealth-api";

const SUB_CATEGORY_GROUPS: { group: string; items: string[] }[] = [
  {
    group: "Equity",
    items: [
      "Large Cap", "Mid Cap", "Small Cap", "Flexi Cap", "Multi Cap",
      "ELSS (Tax Saver)", "Value Fund", "Contra Fund", "Focused Fund", "Sectoral / Thematic",
    ],
  },
  {
    group: "Debt",
    items: [
      "Liquid Fund", "Overnight Fund", "Ultra Short Duration", "Low Duration",
      "Short Duration", "Corporate Bond", "Banking & PSU Debt", "Gilt Fund",
      "Dynamic Bond", "Credit Risk",
    ],
  },
  {
    group: "Hybrid",
    items: [
      "Aggressive Hybrid", "Balanced Hybrid", "Conservative Hybrid", "Multi Asset",
      "Dynamic Asset Allocation (Balanced Advantage)", "Arbitrage Fund",
    ],
  },
  {
    group: "Index & ETF",
    items: [
      "Nifty 50 Index", "Nifty Next 50", "Nifty 100", "Nifty 500", "Sensex Index",
      "LargeMidcap 250", "Nasdaq 100", "S&P 500", "Gold ETF", "Silver ETF",
    ],
  },
  {
    group: "International",
    items: ["US Equity", "Global Equity", "Emerging Markets", "Developed Markets"],
  },
  {
    group: "Other",
    items: [
      "Gold Fund", "Silver Fund", "REIT", "InvIT", "Fixed Deposit (FD)",
      "Recurring Deposit (RD)", "PPF", "EPF", "NPS", "Sovereign Gold Bond (SGB)",
      "Crypto", "Cash",
    ],
  },
].map((g) => ({ group: g.group, items: [...g.items].sort((a, b) => a.localeCompare(b)) }));

const ALL_SUB_CATEGORIES = SUB_CATEGORY_GROUPS.flatMap((g) => g.items);

function SubCategoryCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const trimmed = search.trim();
  const canAddCustom =
    trimmed.length > 0 &&
    !ALL_SUB_CATEGORIES.some((s) => s.toLowerCase() === trimmed.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || "Select a sub-category…"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search sub-category…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-72">
            <CommandEmpty>
              {canAddCustom ? "Press add to create a custom sub-category." : "No results."}
            </CommandEmpty>
            {SUB_CATEGORY_GROUPS.map((g) => (
              <CommandGroup key={g.group} heading={g.group}>
                {g.items.map((item) => (
                  <CommandItem
                    key={item}
                    value={`${g.group} ${item}`}
                    onSelect={() => {
                      onChange(item);
                      setSearch("");
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === item ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {item}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            {canAddCustom && (
              <CommandGroup heading="Custom">
                <CommandItem
                  value={`__add__ ${trimmed}`}
                  onSelect={() => {
                    onChange(trimmed);
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add &ldquo;{trimmed}&rdquo;
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existing?: Investment | null;
};

const empty: InvestmentInput = {
  name: "",
  symbol: "",
  category: "Mutual Funds",
  sub_category: "",
  quantity: 0,
  avg_price: 0,
  current_price: 0,
  purchase_date: null,
  is_sip: false,
  sip_amount: null,
  sip_frequency: "monthly",
  sip_start_date: null,
  sip_next_date: null,
  sip_active: true,
  notes: "",
  status: "active",
};

export function InvestmentDialog({ open, onOpenChange, existing }: Props) {
  const [form, setForm] = useState<InvestmentInput>(empty);
  const upsert = useUpsertInvestment();

  useEffect(() => {
    if (!open) return;
    setForm(
      existing
        ? {
            id: existing.id,
            name: existing.name,
            symbol: existing.symbol ?? "",
            category: existing.category,
            sub_category: existing.sub_category ?? "",
            quantity: existing.quantity,
            avg_price: existing.avg_price,
            current_price: existing.current_price,
            purchase_date: existing.purchase_date,
            is_sip: existing.is_sip,
            sip_amount: existing.sip_amount,
            sip_frequency: existing.sip_frequency ?? "monthly",
            sip_start_date: existing.sip_start_date,
            sip_next_date: existing.sip_next_date,
            sip_active: existing.sip_active ?? true,
            notes: existing.notes ?? "",
            status: existing.status,
          }
        : empty,
    );
  }, [open, existing]);

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (Number(form.quantity) < 0) return toast.error("Quantity cannot be negative");
    if (Number(form.avg_price) < 0 || Number(form.current_price) < 0)
      return toast.error("Prices cannot be negative");
    try {
      await upsert.mutateAsync(form);
      onOpenChange(false);
    } catch {
      /* hook toast */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Investment" : "Add Investment"}</DialogTitle>
          <DialogDescription>
            Stocks, mutual funds, ETFs and more. P&amp;L and XIRR update automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name *" className="sm:col-span-2">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Parag Parikh Flexi Cap"
              maxLength={160}
            />
          </Field>
          <Field label="Category *">
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INVESTMENT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Sub-category / Plan">
            <SubCategoryCombobox
              value={form.sub_category ?? ""}
              onChange={(v) => setForm({ ...form, sub_category: v })}
            />
          </Field>
          <Field label="Symbol / Ticker">
            <Input
              value={form.symbol ?? ""}
              onChange={(e) => setForm({ ...form, symbol: e.target.value })}
              placeholder="e.g. HDFCBANK"
            />
          </Field>
          <Field label="Purchase date">
            <Input
              type="date"
              value={form.purchase_date ?? ""}
              onChange={(e) => setForm({ ...form, purchase_date: e.target.value || null })}
            />
          </Field>
          <Field label="Quantity *">
            <Input
              type="number" min={0} step="0.0001"
              value={form.quantity ?? ""}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
            />
          </Field>
          <Field label="Avg buy price (₹) *">
            <Input
              type="number" min={0} step="0.01"
              value={form.avg_price ?? ""}
              onChange={(e) => setForm({ ...form, avg_price: Number(e.target.value) })}
            />
          </Field>
          <Field label="Current price (₹) *">
            <Input
              type="number" min={0} step="0.01"
              value={form.current_price ?? ""}
              onChange={(e) => setForm({ ...form, current_price: Number(e.target.value) })}
            />
          </Field>
          <Field label="Status">
            <Select value={form.status ?? "active"} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="matured">Matured</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <div className="rounded-xl border border-border bg-surface-2/40 p-3 sm:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">SIP tracking</div>
                <div className="text-[11px] text-muted-foreground">
                  Track recurring contributions to this investment.
                </div>
              </div>
              <Switch
                checked={!!form.is_sip}
                onCheckedChange={(v) => setForm({ ...form, is_sip: v, sip_active: v ? true : false })}
              />
            </div>
            {form.is_sip && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="SIP amount (₹)">
                  <Input
                    type="number" min={0} step="0.01"
                    value={form.sip_amount ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, sip_amount: e.target.value === "" ? null : Number(e.target.value) })
                    }
                  />
                </Field>
                <Field label="Frequency">
                  <Select
                    value={form.sip_frequency ?? "monthly"}
                    onValueChange={(v) => setForm({ ...form, sip_frequency: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Start date">
                  <Input
                    type="date"
                    value={form.sip_start_date ?? ""}
                    onChange={(e) => setForm({ ...form, sip_start_date: e.target.value || null })}
                  />
                </Field>
                <Field label="Next debit date">
                  <Input
                    type="date"
                    value={form.sip_next_date ?? ""}
                    onChange={(e) => setForm({ ...form, sip_next_date: e.target.value || null })}
                  />
                </Field>
                <Field label="SIP active" className="sm:col-span-2">
                  <Select
                    value={form.sip_active ? "active" : "paused"}
                    onValueChange={(v) => setForm({ ...form, sip_active: v === "active" })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            )}
          </div>

          <Field label="Notes" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={upsert.isPending}>
            Cancel
          </Button>
          <ClearButton
            dirty={isDirty(form as unknown as Record<string, unknown>, empty as unknown as Record<string, unknown>)}
            disabled={upsert.isPending}
            onClear={() => setForm(empty)}
          />
          <Button
            className="bg-mint text-[#04121C] hover:brightness-110"
            onClick={submit}
            disabled={upsert.isPending}
          >
            {upsert.isPending ? "Saving…" : existing ? "Save changes" : "Add investment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      {children}
    </div>
  );
}