// Add Investment — 3-step wizard form.
// Rebuilt with standard HTML elements to avoid UI component dependency issues.
// Uses existing Market Data server fns and wealth-api mutations.

import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  Loader2,
  Link2,
  Link2Off,
  Plus,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Save,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { searchInstruments, getMarketQuotes } from "@/lib/market.functions";
import type { IdentifierType, MarketQuote, SearchResult } from "@/lib/market/types";
import {
  CURRENCY_SYMBOL,
  useInvestments,
  useUpsertInvestment,
  type Currency,
  type Investment,
  type InvestmentInput,
} from "@/lib/wealth-api";

// ---------- Constants ----------

const DEFAULT_PLATFORMS = [
  "Groww",
  "Zerodha",
  "Coin by Zerodha",
  "Angel One",
  "Upstox",
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

const CATEGORY_OPTIONS = ["Stocks", "Mutual Funds", "ETFs"];

const SEGMENT_BY_CATEGORY: Record<string, string[]> = {
  Stocks: ["Equity"],
  "Mutual Funds": ["Equity", "Debt", "Hybrid", "Commodity", "Multi Asset", "International"],
  ETFs: ["Equity", "Debt", "Commodity", "International"],
};

const CLASSIFICATION_SUGGESTIONS: Record<string, string[]> = {
  Stocks: ["Large Cap", "Mid Cap", "Small Cap", "Micro Cap"],
  "Mutual Funds": [
    "Large Cap",
    "Mid Cap",
    "Small Cap",
    "Flexi Cap",
    "ELSS",
    "Index",
    "Corporate Bond",
    "Gilt",
    "Balanced Advantage",
    "Liquid",
    "Multi Asset",
  ],
  ETFs: [
    "Index ETF",
    "Gold ETF",
    "Silver ETF",
    "Bond ETF",
    "Sector ETF",
    "International ETF",
    "Commodity ETF",
  ],
};

const SECTOR_SUGGESTIONS = [
  "Banking",
  "IT/Software",
  "Pharma/Healthcare",
  "Auto/Automotive",
  "Energy/Oil & Gas",
  "FMCG",
  "Infrastructure",
  "Telecom",
  "Metals/Mining",
  "Real Estate",
  "Finance",
  "Consumer Goods",
  "Chemical",
];

const SEARCH_KINDS: IdentifierType[] = ["mf_in", "stock_in", "stock_us"];

// ---------- Platform storage ----------

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

function detectSector(name: string): string {
  const n = name.toLowerCase();
  if (/bank|finance|financial|insur|nbfc|capital/.test(n)) return "Banking";
  if (/pharma|drug|health|hospital|life\s*sci|bio/.test(n)) return "Pharma/Healthcare";
  if (/tech|software|infosys|tcs|wipro|hcl|mindtree|infotech|systems|digital/.test(n))
    return "IT/Software";
  if (/energy|oil|gas|petro|coal|reliance|ongc|ntpc|power|solar|renew/.test(n))
    return "Energy/Oil & Gas";
  if (/motor|auto|maruti|mahindra|hero|bajaj\s*auto/.test(n)) return "Auto/Automotive";
  if (/steel|metal|zinc|copper|aluminium|mining|jindal|hindalco/.test(n)) return "Metals/Mining";
  if (/cement|infra|construction/.test(n)) return "Infrastructure";
  if (/fmcg|hindustan\s*unilever|nestle|dabur|itc|godrej/.test(n)) return "FMCG";
  if (/telecom|airtel|jio|vodafone|idea/.test(n)) return "Telecom";
  if (/real\s*estate|realty|dlf|prestige|oberoi/.test(n)) return "Real Estate";
  if (/chemical|specialty/.test(n)) return "Chemical";
  return "";
}

function classifySearchResult(r: SearchResult): Classification {
  const name = r.name.toLowerCase();
  const isETF =
    /\betf\b|exchange traded fund/i.test(r.name) ||
    (r.meta?.quoteType ?? "").toUpperCase() === "ETF";

  if (r.identifier_type === "mf_in") {
    let segment = "Equity";
    let classification = "";
    if (/debt|bond|gilt|liquid|overnight|duration|corporate|banking & psu/.test(name)) segment = "Debt";
    else if (/hybrid|balanced|arbitrage|dynamic asset/.test(name)) segment = "Hybrid";
    else if (/multi asset/.test(name)) segment = "Multi Asset";
    else if (/gold|silver|commodit/.test(name)) segment = "Commodity";
    else if (/nasdaq|s&p|global|international|us equity|emerging|developed/.test(name))
      segment = "International";

    if (/large\s*cap/.test(name)) classification = "Large Cap";
    else if (/mid\s*cap/.test(name)) classification = "Mid Cap";
    else if (/small\s*cap/.test(name)) classification = "Small Cap";
    else if (/flexi\s*cap/.test(name)) classification = "Flexi Cap";
    else if (/elss|tax\s*saver/.test(name)) classification = "ELSS";
    else if (/liquid/.test(name)) classification = "Liquid";
    else if (/gilt/.test(name)) classification = "Gilt";
    else if (/corporate\s*bond/.test(name)) classification = "Corporate Bond";
    else if (/index/.test(name)) classification = "Index";
    else if (/balanced\s*advantage/.test(name)) classification = "Balanced Advantage";
    else if (/multi asset/.test(name)) classification = "Multi Asset";

    return { category: "Mutual Funds", segment, classification, sector: "" };
  }

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
    } else if (/nasdaq|s&p|global|international|world|emerging/.test(name)) {
      segment = "International";
      classification = "International ETF";
    }
    return { category: "ETFs", segment, classification, sector: "" };
  }

  if (r.identifier_type === "stock_in" || r.identifier_type === "stock_us") {
    return {
      category: "Stocks",
      segment: "Equity",
      classification: "",
      sector: detectSector(r.name),
    };
  }

  return { category: "", segment: "", classification: "", sector: "" };
}

function inferCountry(r: SearchResult): string {
  if (r.identifier_type === "stock_in" || r.identifier_type === "mf_in") return "India";
  if (r.identifier_type === "stock_us") return "United States";
  return "";
}

// ---------- Search hook ----------

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
        const qUp = q.toUpperCase();
        merged.sort((a, b) => {
          const aExact = a.identifier.toUpperCase() === qUp ? 0 : 1;
          const bExact = b.identifier.toUpperCase() === qUp ? 0 : 1;
          if (aExact !== bExact) return aExact - bExact;
          const aStarts = a.identifier.toUpperCase().startsWith(qUp) ? 0 : 1;
          const bStarts = b.identifier.toUpperCase().startsWith(qUp) ? 0 : 1;
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

// ---------- Form state ----------

type FormState = {
  name: string;
  symbol: string;
  identifier: string | null;
  identifier_type: IdentifierType | null;
  exchange: string | null;
  country: string;
  currency: Currency;

  category: string;
  segment: string;
  classification: string;
  sector: string;

  platform: string;
  purchase_date: string;
  quantity: string;
  avg_price: string;
  notes: string;

  current_price: number | null;
  price_source: string | null;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

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
  purchase_date: todayISO(),
  quantity: "",
  avg_price: "",
  notes: "",
  current_price: null,
  price_source: null,
};

function extractPlatform(notes: string | null): { platform: string; rest: string } {
  if (!notes) return { platform: "", rest: "" };
  const lines = notes.split("\n");
  const idx = lines.findIndex((l) => /^Platform:\s*/i.test(l));
  if (idx === -1) return { platform: "", rest: notes };
  const platform = lines[idx].replace(/^Platform:\s*/i, "").trim();
  const rest = lines
    .filter((_, i) => i !== idx)
    .join("\n")
    .replace(/^(Sector:|Classification:|Segment:|Country:).*\n?/gim, "")
    .trim();
  return { platform, rest };
}

function investmentToForm(inv: Investment): FormState {
  const { platform, rest } = extractPlatform(inv.notes);
  return {
    name: inv.name,
    symbol: inv.symbol ?? "",
    identifier: inv.identifier,
    identifier_type: (inv.identifier_type as IdentifierType | null) ?? null,
    exchange: inv.exchange,
    country: inv.identifier_type === "stock_us" ? "United States" : inv.identifier_type ? "India" : "",
    currency: (inv.currency ?? "INR") as Currency,
    category: inv.category,
    segment: "",
    classification: inv.sub_category ?? "",
    sector: "",
    platform,
    purchase_date: inv.purchase_date ?? todayISO(),
    quantity: String(inv.quantity ?? ""),
    avg_price: String(inv.avg_price ?? ""),
    notes: rest,
    current_price: inv.current_price ?? null,
    price_source: inv.price_source ?? null,
  };
}

// ---------- Shared class names ----------

const inputCls =
  "w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-mint/50 focus:outline-none focus:ring-1 focus:ring-mint/40 disabled:cursor-not-allowed disabled:opacity-60";

const selectCls = inputCls + " appearance-none pr-8";

const btnPrimary =
  "inline-flex items-center gap-1 rounded-md bg-mint px-3 py-2 text-sm font-semibold text-[#04121C] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";

const btnOutline =
  "inline-flex items-center gap-1 rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground transition hover:bg-surface-2";

const btnGhost =
  "inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-surface-2 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50";

const labelCls = "mb-1.5 block text-xs font-medium text-foreground";

const cardCls = "rounded-xl border border-border bg-card shadow-sm";

// ---------- Main component ----------

export type AddInvestmentFormProps = {
  investmentId?: string;
  onSaved?: () => void;
  onCancel?: () => void;
};

export function AddInvestmentForm({ investmentId, onSaved, onCancel }: AddInvestmentFormProps) {
  const navigate = useNavigate();
  const isEdit = !!investmentId;
  const { data: investments = [] } = useInvestments();
  const existing = useMemo(
    () => (isEdit ? investments.find((i) => i.id === investmentId) : undefined),
    [investments, investmentId, isEdit],
  );

  const [form, setForm] = useState<FormState>(EMPTY);
  const [step, setStep] = useState<1 | 2 | 3>(isEdit ? 3 : 1);
  const [hydrated, setHydrated] = useState(!isEdit);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [priceLoading, setPriceLoading] = useState(false);
  const [customPlatforms, setCustomPlatforms] = useState<string[]>([]);

  useEffect(() => {
    setCustomPlatforms(loadCustomPlatforms());
  }, []);

  const upsert = useUpsertInvestment();
  const fetchQuotes = useServerFn(getMarketQuotes);

  useEffect(() => {
    if (isEdit && existing && !hydrated) {
      setForm(investmentToForm(existing));
      setHydrated(true);
    }
  }, [isEdit, existing, hydrated]);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  const { results, loading, error } = useMultiSearch(debounced);
  const showPanel = panelOpen && debounced.length >= 2;

  useEffect(() => setActive(0), [results]);

  const isLinked = !!(form.identifier && form.identifier_type);

  const fetchLivePrice = async (
    identifier: string,
    identifier_type: IdentifierType,
    exchange: string | null,
  ) => {
    setPriceLoading(true);
    try {
      const quotes = (await fetchQuotes({
        data: { items: [{ identifier, identifier_type, exchange }] },
      })) as MarketQuote[];
      const q = quotes[0];
      if (q && q.latest_price != null && q.latest_price > 0) {
        setForm((prev) => ({
          ...prev,
          current_price: Number(q.latest_price),
          price_source: q.source,
        }));
      }
    } catch (err) {
      console.error("[add-investment-form] quote fetch failed", err);
    } finally {
      setPriceLoading(false);
    }
  };

  const commitSelection = async (r: SearchResult) => {
    const cls = classifySearchResult(r);
    const currency = ((r.currency as Currency) ??
      (r.identifier_type === "stock_us" ? "USD" : "INR")) as Currency;
    setForm((prev) => ({
      ...prev,
      name: r.name,
      symbol: r.identifier,
      identifier: r.identifier,
      identifier_type: r.identifier_type,
      exchange: r.exchange ?? null,
      country: inferCountry(r),
      currency,
      category: cls.category || prev.category,
      segment: cls.segment || prev.segment,
      classification: cls.classification || prev.classification,
      sector: cls.sector || prev.sector,
      current_price: null,
      price_source: null,
    }));
    setQuery("");
    setDebounced("");
    setPanelOpen(false);
    setStep(2);
    void fetchLivePrice(r.identifier, r.identifier_type, r.exchange ?? null);
  };

  const handleUnlink = () => {
    setForm((f) => ({
      ...f,
      identifier: null,
      identifier_type: null,
      exchange: null,
      current_price: null,
      price_source: null,
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

  // Derived values
  const qty = Number(form.quantity) || 0;
  const avg = Number(form.avg_price) || 0;
  const invested = qty * avg;
  const livePrice = form.current_price && form.current_price > 0 ? form.current_price : null;
  const marketValue = livePrice != null ? qty * livePrice : qty * avg;
  const sym = CURRENCY_SYMBOL[form.currency] ?? "₹";
  const locale = form.currency === "INR" ? "en-IN" : "en-US";
  const fmt = (n: number, max = 2) =>
    `${sym}${n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: max })}`;

  const segmentOptions = SEGMENT_BY_CATEGORY[form.category] ?? [];
  const classificationOptions = CLASSIFICATION_SUGGESTIONS[form.category] ?? [];

  const mergedPlatforms = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of [...DEFAULT_PLATFORMS, ...customPlatforms]) {
      const k = p.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(p);
    }
    return out;
  }, [customPlatforms]);

  // Validation per step
  const canNext1 = isLinked || !!form.name.trim();
  const canNext2 =
    !!form.category.trim() && !!form.segment.trim() && !!form.classification.trim();
  const canSave =
    !!form.platform.trim() && qty > 0 && avg > 0 && !!form.purchase_date && !!form.name.trim();

  const resetClassification = () => {
    setForm((f) => ({ ...f, category: "", segment: "", classification: "", sector: "" }));
  };
  const clearDetails = () => {
    setForm((f) => ({
      ...f,
      platform: "",
      purchase_date: todayISO(),
      quantity: "",
      avg_price: "",
      notes: "",
    }));
  };

  const goCancel = () => {
    if (onCancel) return onCancel();
    navigate({ to: "/wealth" });
  };

  const handlePlatformChange = (v: string) => {
    if (v === "__add_custom__") {
      const name = typeof window !== "undefined" ? window.prompt("Enter platform name") : "";
      const trimmed = (name ?? "").trim();
      if (!trimmed) return;
      saveCustomPlatform(trimmed);
      setCustomPlatforms(loadCustomPlatforms());
      setForm((f) => ({ ...f, platform: trimmed }));
      return;
    }
    setForm((f) => ({ ...f, platform: v }));
  };

  const submit = async () => {
    if (!canSave) {
      if (!form.platform.trim()) toast.error("Investment platform is required");
      else if (qty <= 0) toast.error("Quantity must be greater than zero");
      else if (avg <= 0) toast.error("Average buy price must be greater than zero");
      else if (!form.purchase_date) toast.error("Purchase date is required");
      else if (!form.name.trim()) toast.error("Name is required");
      return;
    }

    const noteLines: string[] = [];
    noteLines.push(`Platform: ${form.platform}`);
    if (form.sector) noteLines.push(`Sector: ${form.sector}`);
    if (form.classification) noteLines.push(`Classification: ${form.classification}`);
    if (form.segment) noteLines.push(`Segment: ${form.segment}`);
    if (form.country) noteLines.push(`Country: ${form.country}`);
    if (form.notes.trim()) noteLines.push("", form.notes.trim());

    const payload: InvestmentInput = {
      id: investmentId,
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
      toast.success(isEdit ? "Investment updated" : "Investment added");
      if (onSaved) onSaved();
      else navigate({ to: "/wealth" });
    } catch {
      /* mutation surfaces its own toast */
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-mint" />
          <h1 className="text-xl font-semibold text-foreground">
            {isEdit ? "Update Investment" : "Add Investment"}
          </h1>
        </div>
        <div className="text-xs font-medium text-muted-foreground">Step {step} of 3</div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex-1">
            <div
              className={cn(
                "h-1.5 rounded-full transition-colors",
                n <= step ? "bg-mint" : "bg-muted",
              )}
            />
            <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              {n === 1 ? "Find" : n === 2 ? "Classify" : "Details"}
            </div>
          </div>
        ))}
      </div>

      {/* ---------- Step 1: Search ---------- */}
      {step === 1 && (
        <div className={cardCls}>
          <div className="space-y-3 p-4 sm:p-5">
            <div className="text-sm font-semibold text-foreground">Find investment</div>
            <p className="text-xs text-muted-foreground">
              Search by company name, fund name, or ticker. We auto-fill classification and live
              price.
            </p>

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
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] hover:bg-surface-2"
                >
                  <Link2Off className="h-3 w-3" /> Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPanelOpen(true);
                    }}
                    onFocus={() => setPanelOpen(true)}
                    onKeyDown={onKeyDown}
                    placeholder="Search Investment (e.g. HDFC, AAPL, Parag Parikh)"
                    className={cn(inputCls, "pl-9 pr-9")}
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
                              "flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors",
                              idx === active ? "bg-surface-2" : "hover:bg-surface-2",
                            )}
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">{r.name}</div>
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

            <div className="flex items-center justify-between pt-2">
              <button type="button" className={btnGhost} onClick={goCancel}>
                Cancel
              </button>
              <button
                type="button"
                className={btnPrimary}
                onClick={() => setStep(2)}
                disabled={!canNext1}
              >
                Next <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Step 2: Classification ---------- */}
      {step === 2 && (
        <div className={cardCls}>
          <div className="space-y-3 p-4 sm:p-5">
            <div className="text-sm font-semibold text-foreground">Classification</div>
            <p className="text-xs text-muted-foreground">
              Auto-filled from search. All fields remain editable.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Category *">
                <select
                  className={selectCls}
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      category: e.target.value,
                      segment: "",
                      classification: "",
                    }))
                  }
                >
                  <option value="">Select category</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Segment *">
                <select
                  className={selectCls}
                  value={form.segment}
                  onChange={(e) => setForm((f) => ({ ...f, segment: e.target.value }))}
                  disabled={!form.category}
                >
                  <option value="">Select segment</option>
                  {segmentOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Classification *">
                <input
                  type="text"
                  className={inputCls}
                  list="classification-suggestions"
                  value={form.classification}
                  onChange={(e) => setForm((f) => ({ ...f, classification: e.target.value }))}
                  placeholder="e.g. Large Cap, Flexi Cap, Gold ETF"
                />
                <datalist id="classification-suggestions">
                  {classificationOptions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>

              <Field label="Sector">
                <input
                  type="text"
                  className={inputCls}
                  list="sector-suggestions"
                  value={form.sector}
                  onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
                  placeholder="e.g. IT/Software, Banking"
                />
                <datalist id="sector-suggestions">
                  {SECTOR_SUGGESTIONS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </Field>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button type="button" className={btnGhost} onClick={() => setStep(1)}>
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <div className="flex items-center gap-2">
                <button type="button" className={btnOutline} onClick={resetClassification}>
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </button>
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={() => setStep(3)}
                  disabled={!canNext2}
                >
                  Next <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Step 3: Details ---------- */}
      {step === 3 && (
        <div className={cardCls}>
          <div className="space-y-3 p-4 sm:p-5">
            <div className="text-sm font-semibold text-foreground">Investment details</div>
            <p className="text-xs text-muted-foreground">
              Enter your purchase details. Current price and market value update automatically.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Name *" className="sm:col-span-2">
                <input
                  type="text"
                  className={inputCls}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Instrument name"
                />
              </Field>

              <Field label="Investment Platform *">
                <div className="relative">
                  <select
                    className={selectCls}
                    value={
                      mergedPlatforms.some(
                        (p) => p.toLowerCase() === form.platform.toLowerCase(),
                      )
                        ? form.platform
                        : form.platform
                        ? form.platform
                        : ""
                    }
                    onChange={(e) => handlePlatformChange(e.target.value)}
                  >
                    <option value="">Select platform…</option>
                    {mergedPlatforms.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    {form.platform &&
                      !mergedPlatforms.some(
                        (p) => p.toLowerCase() === form.platform.toLowerCase(),
                      ) && <option value={form.platform}>{form.platform}</option>}
                    <option value="__add_custom__">+ Add custom platform…</option>
                  </select>
                  <Plus className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
              </Field>

              <Field label="Purchase Date *">
                <input
                  type="date"
                  className={inputCls}
                  value={form.purchase_date}
                  onChange={(e) => setForm((f) => ({ ...f, purchase_date: e.target.value }))}
                />
              </Field>

              <Field label="Quantity *">
                <input
                  type="number"
                  className={inputCls}
                  min={0}
                  step="0.01"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  placeholder="0"
                />
              </Field>

              <Field label={`Average Buy Price (${sym}) *`}>
                <input
                  type="number"
                  className={inputCls}
                  min={0}
                  step="0.01"
                  value={form.avg_price}
                  onChange={(e) => setForm((f) => ({ ...f, avg_price: e.target.value }))}
                  placeholder="0.00"
                />
              </Field>

              <Field label="Current Price">
                <div className="flex h-10 items-center justify-between rounded-md border border-border bg-surface-2/60 px-3 text-sm">
                  <span className={cn(livePrice == null && "text-muted-foreground")}>
                    {priceLoading
                      ? "Fetching…"
                      : livePrice != null
                      ? fmt(livePrice, 4)
                      : avg > 0
                      ? fmt(avg, 4)
                      : "—"}
                  </span>
                  <span className="text-[10px] uppercase text-muted-foreground">
                    {priceLoading ? "" : livePrice != null ? form.price_source ?? "live" : "manual"}
                  </span>
                </div>
              </Field>

              <Field label="Market Value">
                <div className="flex h-10 items-center rounded-md border border-border bg-surface-2/60 px-3 text-sm">
                  {marketValue > 0 ? fmt(marketValue) : "—"}
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
                <textarea
                  rows={3}
                  className={cn(inputCls, "resize-y")}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Add notes about this investment..."
                />
              </Field>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <button
                type="button"
                className={btnGhost}
                onClick={() => setStep(isEdit ? 3 : 2)}
                disabled={isEdit}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <div className="flex items-center gap-2">
                <button type="button" className={btnOutline} onClick={clearDetails}>
                  <RotateCcw className="h-3.5 w-3.5" /> Clear
                </button>
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={submit}
                  disabled={upsert.isPending || !canSave}
                >
                  <Save className="h-3.5 w-3.5" />
                  {upsert.isPending
                    ? "Saving…"
                    : isEdit
                    ? "Update Investment"
                    : "Save Investment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
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
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div className="truncate rounded-md border border-border bg-surface-2/40 px-2 py-1.5 text-xs">
        {value}
      </div>
    </div>
  );
}

export default AddInvestmentForm;
