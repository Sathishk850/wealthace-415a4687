// Add Investment — comprehensive intelligent onboarding modal.
// Additive: does not replace the existing InvestmentDialog. Uses only
// existing Market Data server fns, existing wealth-api mutations, and
// existing shared UI primitives.

import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
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
import { DatePicker } from "@/components/ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Search,
  Loader2,
  Link2,
  Link2Off,
  Check,
  ChevronsUpDown,
  Plus,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { searchInstruments, getMarketQuotes } from "@/lib/market.functions";
import type {
  IdentifierType,
  MarketQuote,
  SearchResult,
} from "@/lib/market/types";
import {
  CURRENCY_SYMBOL,
  type Currency,
  type InvestmentInput,
  useUpsertInvestment,
} from "@/lib/wealth-api";

// ---------- Platform list ----------

const DEFAULT_PLATFORMS = [
  "Groww",
  "Zerodha",
  "Coin by Zerodha",
  "Upstox",
  "Angel One",
  "Dhan",
  "FYERS",
  "ICICI Direct",
  "HDFC Sky",
  "Kotak Neo",
  "Motilal Oswal",
  "5paisa",
  "Paytm Money",
  "INDmoney",
  "ET Money",
  "Kuvera",
  "Interactive Brokers",
  "Charles Schwab",
  "Fidelity",
  "Robinhood",
  "Vanguard",
  "Other",
];

const CUSTOM_PLATFORMS_KEY = "finvista:custom-platforms";

function loadCustomPlatforms(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_PLATFORMS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveCustomPlatform(name: string) {
  if (typeof window === "undefined") return;
  const trimmed = name.trim();
  if (!trimmed) return;
  const existing = loadCustomPlatforms();
  if (
    existing.some((p) => p.toLowerCase() === trimmed.toLowerCase()) ||
    DEFAULT_PLATFORMS.some((p) => p.toLowerCase() === trimmed.toLowerCase())
  ) {
    return;
  }
  const next = [...existing, trimmed].slice(0, 100);
  try {
    window.localStorage.setItem(CUSTOM_PLATFORMS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

// ---------- Auto-classification ----------

type Classification = {
  category: string;
  segment: string;
  classification: string;
  sector: string;
};

const EMPTY_CLASSIFICATION: Classification = {
  category: "",
  segment: "",
  classification: "",
  sector: "",
};

function classifySearchResult(r: SearchResult): Classification {
  const name = r.name.toLowerCase();

  const isETF =
    /\betf\b|exchange traded fund/i.test(r.name) ||
    (r.meta?.quoteType ?? "").toUpperCase() === "ETF";

  // Mutual Funds (Indian) — MFAPI results
  if (r.identifier_type === "mf_in") {
    let segment = "Equity";
    let classification = "";
    if (/debt|bond|gilt|liquid|overnight|duration|corporate|banking & psu/.test(name)) {
      segment = "Debt";
    } else if (/hybrid|balanced|arbitrage|multi asset|dynamic asset/.test(name)) {
      segment = "Hybrid";
    } else if (/gold|silver|commodit/.test(name)) {
      segment = "Commodity";
    } else if (/nasdaq|s&p|global|international|us equity|emerging|developed/.test(name)) {
      segment = "International";
    }

    if (/large\s*cap/.test(name)) classification = "Large Cap";
    else if (/mid\s*cap/.test(name)) classification = "Mid Cap";
    else if (/small\s*cap/.test(name)) classification = "Small Cap";
    else if (/flexi\s*cap/.test(name)) classification = "Flexi Cap";
    else if (/multi\s*cap/.test(name)) classification = "Multi Cap";
    else if (/elss|tax\s*saver/.test(name)) classification = "ELSS (Tax Saver)";
    else if (/liquid/.test(name)) classification = "Liquid Fund";
    else if (/gilt/.test(name)) classification = "Gilt Fund";
    else if (/corporate\s*bond/.test(name)) classification = "Corporate Bond";
    else if (/index/.test(name)) classification = "Index Fund";
    else if (/arbitrage/.test(name)) classification = "Arbitrage Fund";
    else if (/aggressive\s*hybrid/.test(name)) classification = "Aggressive Hybrid";
    else if (/balanced\s*hybrid/.test(name)) classification = "Balanced Hybrid";
    else if (/conservative\s*hybrid/.test(name)) classification = "Conservative Hybrid";
    else if (/gold/.test(name)) classification = "Gold Fund";
    else if (/silver/.test(name)) classification = "Silver Fund";

    return { category: "Mutual Funds", segment, classification, sector: "" };
  }

  // ETFs
  if (isETF) {
    let segment = "Equity";
    let classification = "Index ETF";
    if (/bond|treasury|gilt|debt/.test(name)) {
      segment = "Debt";
      classification = "Bond ETF";
    } else if (/gold/.test(name)) {
      segment = "Commodity";
      classification = "Gold ETF";
    } else if (/silver/.test(name)) {
      segment = "Commodity";
      classification = "Silver ETF";
    }
    return { category: "ETFs", segment, classification, sector: "" };
  }

  // Stocks — Indian or US
  if (r.identifier_type === "stock_in" || r.identifier_type === "stock_us") {
    const sector = detectSector(r.name);
    return {
      category: "Stocks",
      segment: "Equity",
      classification: "", // cap-tier requires market-cap data; leave editable
      sector,
    };
  }

  if (r.identifier_type === "crypto") {
    return { category: "Crypto", segment: "Crypto", classification: "", sector: "" };
  }

  return EMPTY_CLASSIFICATION;
}

function detectSector(name: string): string {
  const n = name.toLowerCase();
  if (/bank|finance|financial|insur|nbfc|capital/.test(n)) return "Banking & Financial Services";
  if (/pharma|drug|health|hospital|life\s*sci|bio/.test(n)) return "Healthcare & Pharma";
  if (/tech|software|infosys|tcs|wipro|hcl|mindtree|infotech|systems|digital/.test(n))
    return "Technology";
  if (/energy|oil|gas|petro|coal|reliance|ongc|ntpc|power|solar|renew/.test(n)) return "Energy";
  if (/motor|auto|tata\s*motor|maruti|mahindra|hero|bajaj\s*auto/.test(n)) return "Automobile";
  if (/steel|metal|zinc|copper|aluminium|mining|jindal|hindalco/.test(n)) return "Metals & Mining";
  if (/cement/.test(n)) return "Cement & Construction";
  if (/fmcg|consumer|hindustan\s*unilever|nestle|dabur|itc|godrej/.test(n))
    return "FMCG & Consumer";
  if (/telecom|airtel|jio|vodafone|idea/.test(n)) return "Telecom";
  if (/real\s*estate|realty|dlf|prestige|oberoi/.test(n)) return "Real Estate";
  if (/retail|trent|dmart|avenue\s*supermarts/.test(n)) return "Retail";
  return "";
}

// ---------- Platform combobox ----------

function PlatformCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [custom, setCustom] = useState<string[]>([]);

  useEffect(() => {
    if (open) setCustom(loadCustomPlatforms());
  }, [open]);

  const merged = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of [...DEFAULT_PLATFORMS, ...custom]) {
      const k = p.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(p);
    }
    return out;
  }, [custom]);

  const trimmed = search.trim();
  const filtered = trimmed
    ? merged.filter((p) => p.toLowerCase().includes(trimmed.toLowerCase()))
    : merged;
  const canAdd =
    trimmed.length > 0 && !merged.some((p) => p.toLowerCase() === trimmed.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || "Select platform…"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] max-h-[min(60vh,var(--radix-popover-content-available-height))] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or add platform…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[calc(min(60vh,var(--radix-popover-content-available-height))-3rem)] overflow-y-auto">
            {filtered.length === 0 && !canAdd && (
              <div className="py-6 text-center text-sm text-muted-foreground">No matches.</div>
            )}
            {filtered.map((p) => (
              <CommandItem
                key={p}
                value={p}
                onSelect={() => {
                  onChange(p);
                  setSearch("");
                  setOpen(false);
                }}
              >
                <Check
                  className={cn("mr-2 h-4 w-4", value === p ? "opacity-100" : "opacity-0")}
                />
                {p}
              </CommandItem>
            ))}
            {canAdd && (
              <CommandItem
                value={`__add__ ${trimmed}`}
                onSelect={() => {
                  saveCustomPlatform(trimmed);
                  onChange(trimmed);
                  setSearch("");
                  setOpen(false);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add &ldquo;{trimmed}&rdquo;
              </CommandItem>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ---------- Multi-kind instrument search ----------

const SEARCH_KINDS: IdentifierType[] = ["mf_in", "stock_in", "stock_us"];

function useMultiSearch(query: string) {
  const runSearch = useServerFn(searchInstruments);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }
    const mine = ++seqRef.current;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const settled = await Promise.allSettled(
          SEARCH_KINDS.map((kind) => runSearch({ data: { query: q, kind } })),
        );
        if (seqRef.current !== mine) return;

        const merged: SearchResult[] = [];
        const seen = new Set<string>();
        for (const s of settled) {
          if (s.status !== "fulfilled") continue;
          for (const r of s.value as SearchResult[]) {
            const key = `${r.identifier_type}:${r.identifier}:${r.exchange ?? ""}`;
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(r);
          }
        }

        // Prioritize exact ticker/identifier matches.
        const qUpper = q.toUpperCase();
        merged.sort((a, b) => {
          const aExact = a.identifier.toUpperCase() === qUpper ? 0 : 1;
          const bExact = b.identifier.toUpperCase() === qUpper ? 0 : 1;
          if (aExact !== bExact) return aExact - bExact;
          const aStarts = a.identifier.toUpperCase().startsWith(qUpper) ? 0 : 1;
          const bStarts = b.identifier.toUpperCase().startsWith(qUpper) ? 0 : 1;
          return aStarts - bStarts;
        });

        setResults(merged.slice(0, 30));
      } catch (err) {
        if (seqRef.current !== mine) return;
        setError(err instanceof Error ? err.message : "Search failed");
        setResults([]);
      } finally {
        if (seqRef.current === mine) setLoading(false);
      }
    })();
  }, [query, runSearch]);

  return { results, loading, error };
}

function kindLabel(k: IdentifierType) {
  if (k === "mf_in") return "MF";
  if (k === "stock_in") return "IN";
  if (k === "stock_us") return "US";
  return "CR";
}

// ---------- Main modal ----------

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

type FormState = {
  // Search-derived (read-only)
  name: string;
  symbol: string;
  identifier: string | null;
  identifier_type: IdentifierType | null;
  exchange: string | null;
  country: string;
  currency: Currency;

  // Classification (auto + editable)
  category: string;
  segment: string;
  classification: string;
  sector: string;

  // User inputs
  platform: string;
  purchase_date: string;
  quantity: string;
  avg_price: string;
  notes: string;

  // Live-derived
  current_price: number | null;
  price_source: string | null;
  as_of: string | null;
};

const EMPTY: FormState = {
  name: "",
  symbol: "",
  identifier: null,
  identifier_type: null,
  exchange: null,
  country: "",
  currency: "INR",
  category: "",
  segment: "",
  classification: "",
  sector: "",
  platform: "",
  purchase_date: "",
  quantity: "",
  avg_price: "",
  notes: "",
  current_price: null,
  price_source: null,
  as_of: null,
};

function inferCountry(r: SearchResult): string {
  if (r.identifier_type === "stock_in" || r.identifier_type === "mf_in") return "India";
  if (r.identifier_type === "stock_us") return "United States";
  if (r.identifier_type === "crypto") return "Global";
  return "";
}

export function AddInvestmentModal({ open, onOpenChange }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [priceLoading, setPriceLoading] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const upsert = useUpsertInvestment();
  const fetchQuotes = useServerFn(getMarketQuotes);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY);
      setQuery("");
      setDebounced("");
      setPanelOpen(false);
    }
  }, [open]);

  // Debounce input by 300ms
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  const { results, loading, error } = useMultiSearch(debounced);
  const showPanel = panelOpen && debounced.length >= 2;

  useEffect(() => setActive(0), [results]);

  // Click outside search closes panel
  useEffect(() => {
    if (!showPanel) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setPanelOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [showPanel]);

  const isLinked = !!(form.identifier && form.identifier_type);

  const commitSelection = async (r: SearchResult) => {
    const cls = classifySearchResult(r);
    const country = inferCountry(r);
    const currency = ((r.currency as Currency) ?? (r.identifier_type === "stock_us"
      ? "USD"
      : "INR")) as Currency;

    setForm((prev) => ({
      ...prev,
      name: r.name,
      symbol: r.identifier,
      identifier: r.identifier,
      identifier_type: r.identifier_type,
      exchange: r.exchange ?? null,
      country,
      currency,
      category: prev.category || cls.category,
      segment: prev.segment || cls.segment,
      classification: prev.classification || cls.classification,
      sector: prev.sector || cls.sector,
      current_price: null,
      price_source: null,
      as_of: null,
    }));

    setQuery("");
    setDebounced("");
    setPanelOpen(false);

    // Fetch live quote
    setPriceLoading(true);
    try {
      const quotes = (await fetchQuotes({
        data: {
          items: [
            {
              identifier_type: r.identifier_type,
              identifier: r.identifier,
              exchange: r.exchange ?? null,
            },
          ],
        },
      })) as MarketQuote[];
      const q = quotes[0];
      if (q && q.latest_price != null && q.latest_price > 0) {
        setForm((prev) => ({
          ...prev,
          current_price: Number(q.latest_price),
          price_source: q.source,
          as_of: q.server_fetched_at ?? q.fetched_at,
        }));
      } else {
        console.warn("[add-investment] no live quote for", r.identifier);
      }
    } catch (err) {
      console.error("[add-investment] quote fetch failed", err);
    } finally {
      setPriceLoading(false);
    }
  };

  const handleUnlink = () => {
    setForm((f) => ({
      ...f,
      identifier: null,
      identifier_type: null,
      exchange: null,
      current_price: null,
      price_source: null,
      as_of: null,
    }));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showPanel || results.length === 0) {
      if (e.key === "Escape") setPanelOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[active];
      if (r) void commitSelection(r);
    } else if (e.key === "Escape") {
      setPanelOpen(false);
    }
  };

  const qty = Number(form.quantity) || 0;
  const avg = Number(form.avg_price) || 0;
  const invested = qty * avg;
  const livePrice =
    form.current_price != null && form.current_price > 0 ? form.current_price : null;
  const marketValue = livePrice != null ? qty * livePrice : qty * avg;
  const priceFallback = livePrice == null;
  const sym = CURRENCY_SYMBOL[form.currency] ?? "₹";

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Select an instrument or enter a name");
    if (!form.category.trim()) return toast.error("Category is required");
    if (!form.platform.trim()) return toast.error("Investment platform is required");
    if (qty <= 0) return toast.error("Quantity must be greater than zero");
    if (avg <= 0) return toast.error("Average buy price must be greater than zero");

    const noteLines: string[] = [];
    noteLines.push(`Platform: ${form.platform}`);
    if (form.sector) noteLines.push(`Sector: ${form.sector}`);
    if (form.classification) noteLines.push(`Classification: ${form.classification}`);
    if (form.segment) noteLines.push(`Segment: ${form.segment}`);
    if (form.country) noteLines.push(`Country: ${form.country}`);
    if (form.notes.trim()) noteLines.push("", form.notes.trim());

    const payload: InvestmentInput = {
      name: form.name.trim(),
      symbol: form.symbol.trim() || null,
      category: form.category,
      sub_category: form.classification || form.segment || null,
      quantity: qty,
      avg_price: avg,
      current_price: livePrice ?? avg,
      purchase_date: form.purchase_date || null,
      notes: noteLines.join("\n"),
      status: "active",
      identifier_type: form.identifier_type,
      identifier: form.identifier,
      exchange: form.exchange,
      currency: form.currency,
    };

    try {
      await upsert.mutateAsync(payload);
      onOpenChange(false);
    } catch {
      /* mutation surfaces its own toast */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-mint" />
            Add Investment
          </DialogTitle>
          <DialogDescription>
            Search a stock, mutual fund, or ETF to auto-populate classification and live price.
          </DialogDescription>
        </DialogHeader>

        {/* ---------- SECTION 1: Search ---------- */}
        <section className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            1 · Find investment
          </div>

          {isLinked ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-mint/40 bg-mint/10 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <Link2 className="h-4 w-4 shrink-0 text-mint" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{form.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {form.exchange ? `${form.exchange} · ` : ""}
                    {form.identifier}
                    {form.currency ? ` · ${form.currency}` : ""}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleUnlink}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground hover:bg-surface-2"
              >
                <Link2Off className="h-3 w-3" /> Change
              </button>
            </div>
          ) : (
            <div ref={rootRef} className="relative">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPanelOpen(true);
                  }}
                  onFocus={() => setPanelOpen(true)}
                  onKeyDown={onKeyDown}
                  placeholder="Company name, fund name, or ticker (e.g. HDFC, AAPL, Parag Parikh)"
                  role="combobox"
                  aria-expanded={showPanel}
                  aria-autocomplete="list"
                  className="w-full rounded-lg border border-border bg-surface-2 pl-9 pr-9 py-2 text-sm text-foreground focus:border-mint/50 focus:outline-none"
                />
                {loading ? (
                  <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : null}
              </div>

              {showPanel ? (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-border bg-card shadow-lg">
                  {error ? (
                    <div className="px-3 py-2 text-xs text-amber-400">
                      Search provider unavailable.
                    </div>
                  ) : loading && results.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
                  ) : results.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No results found.
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto py-1">
                      {results.map((r, idx) => (
                        <button
                          key={`${r.identifier_type}:${r.identifier}:${r.exchange ?? ""}`}
                          type="button"
                          onMouseEnter={() => setActive(idx)}
                          onClick={() => void commitSelection(r)}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 px-3 py-2 text-left",
                            idx === active ? "bg-surface-2" : "hover:bg-surface-2",
                          )}
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-foreground">
                              {r.name}
                            </div>
                            <div className="truncate text-[11px] text-muted-foreground">
                              {r.identifier}
                              {r.exchange ? ` · ${r.exchange}` : ""}
                              {r.currency ? ` · ${r.currency}` : ""}
                            </div>
                          </div>
                          <span className="shrink-0 rounded-md bg-mint/15 px-2 py-0.5 text-[10px] font-semibold text-mint">
                            {kindLabel(r.identifier_type)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {isLinked && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ReadOnly label="Symbol" value={form.symbol} />
              <ReadOnly label="Exchange" value={form.exchange ?? "—"} />
              <ReadOnly label="Country" value={form.country || "—"} />
              <ReadOnly label="Currency" value={form.currency} />
            </div>
          )}
        </section>

        {/* ---------- SECTION 2: Classification ---------- */}
        <section className="mt-5 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            2 · Classification
            <span className="ml-2 font-normal text-muted-foreground/70">auto-filled, editable</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Category *">
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Stocks",
                    "Mutual Funds",
                    "ETFs",
                    "Gold",
                    "Bonds",
                    "Crypto",
                    "Others",
                  ].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Segment">
              <Input
                value={form.segment}
                onChange={(e) => setForm((f) => ({ ...f, segment: e.target.value }))}
                placeholder="e.g. Equity, Debt, Hybrid"
              />
            </Field>
            <Field label="Classification">
              <Input
                value={form.classification}
                onChange={(e) => setForm((f) => ({ ...f, classification: e.target.value }))}
                placeholder="e.g. Large Cap, Flexi Cap, Gold ETF"
              />
            </Field>
            <Field label="Sector">
              <Input
                value={form.sector}
                onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
                placeholder="e.g. Technology, Banking"
              />
            </Field>
          </div>
        </section>

        {/* ---------- SECTION 3: Investment Details ---------- */}
        <section className="mt-5 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            3 · Investment details
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Name *" className="sm:col-span-2">
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Instrument name"
              />
            </Field>

            <Field label="Investment Platform *">
              <PlatformCombobox
                value={form.platform}
                onChange={(v) => setForm((f) => ({ ...f, platform: v }))}
              />
            </Field>

            <Field label="Purchase date">
              <DatePicker
                value={form.purchase_date}
                onChange={(v) => setForm((f) => ({ ...f, purchase_date: v || "" }))}
              />
            </Field>

            <Field label="Quantity *">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                placeholder="0"
              />
            </Field>

            <Field label={`Average buy price (${sym}) *`}>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.avg_price}
                onChange={(e) => setForm((f) => ({ ...f, avg_price: e.target.value }))}
                placeholder="0.00"
              />
            </Field>

            <Field label="Current price">
              <div className="flex h-10 items-center justify-between rounded-md border border-input bg-surface-2/60 px-3 text-sm">
                <span className={cn(priceFallback && "text-muted-foreground")}>
                  {priceLoading
                    ? "Fetching…"
                    : livePrice != null
                    ? `${sym}${livePrice.toLocaleString(form.currency === "INR" ? "en-IN" : "en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })}`
                    : avg > 0
                    ? `${sym}${avg.toLocaleString(form.currency === "INR" ? "en-IN" : "en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })}`
                    : "—"}
                </span>
                <span className="text-[10px] uppercase text-muted-foreground">
                  {priceLoading
                    ? ""
                    : livePrice != null
                    ? form.price_source ?? "live"
                    : "manual"}
                </span>
              </div>
            </Field>

            <Field label="Market value">
              <div className="flex h-10 items-center rounded-md border border-input bg-surface-2/60 px-3 text-sm">
                {marketValue > 0
                  ? `${sym}${marketValue.toLocaleString(
                      form.currency === "INR" ? "en-IN" : "en-US",
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                    )}`
                  : "—"}
                {invested > 0 && livePrice != null && (
                  <span
                    className={cn(
                      "ml-auto text-[11px]",
                      marketValue >= invested ? "text-emerald-500" : "text-rose-500",
                    )}
                  >
                    {marketValue >= invested ? "▲" : "▼"}{" "}
                    {(((marketValue - invested) / invested) * 100).toFixed(2)}%
                  </span>
                )}
              </div>
            </Field>

            <Field label="Notes" className="sm:col-span-2">
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional"
              />
            </Field>
          </div>
        </section>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={upsert.isPending}>
            Cancel
          </Button>
          <Button
            className="bg-mint text-[#04121C] hover:brightness-110"
            onClick={submit}
            disabled={upsert.isPending}
          >
            {upsert.isPending ? "Saving…" : "Add investment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Small helpers ----------

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      {children}
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <div className="truncate rounded-md border border-border bg-surface-2/40 px-2 py-1.5 text-xs text-foreground">
        {value}
      </div>
    </div>
  );
}

export default AddInvestmentModal;
