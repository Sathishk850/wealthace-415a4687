// Add Investment — single-page template matching FinVista reference design.
// Two-column desktop layout: Sections 1–3 on the left, Payment sidebar on the
// right, and a single bottom action bar. Uses existing Market Data server fns,
// wealth-api mutations, and shared PaymentFields component.

import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  Loader2,
  Plus,
  ArrowLeft,
  HelpCircle,
  Pencil,
  CheckCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { searchInstruments, getMarketQuotes } from "@/lib/market.functions";
import type { IdentifierType, MarketQuote, SearchResult } from "@/lib/market/types";
import { curatedKindFor, searchIndiaListed } from "@/lib/market/india-listed";
import {
  CURRENCY_SYMBOL,
  useInvestments,
  useUpsertInvestment,
  type Currency,
  type Investment,
  type InvestmentInput,
} from "@/lib/wealth-api";
import { PaymentFields, type PaymentFieldsValue } from "@/components/payment/payment-fields";
// Note: staged preferences are auto-committed by the outflow save path; no direct flush needed here.

// ---------- Constants ----------

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
  "NSE Listed",
  "BullionByPost",
  "MMTC",
  "IBJA",
  "Interactive Brokers",
  "Charles Schwab",
  "Fidelity",
  "Robinhood",
  "Vanguard",
  "Other",
];

const CUSTOM_PLATFORMS_KEY = "finvista:custom-platforms";

type CategoryFilter =
  | "all"
  | "stock_in"
  | "mf_in"
  | "stock_us"
  | "etf_us"
  | "reit"
  | "invit"
  | "commodity"
  | "bond"
  | "crypto";

const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All Categories" },
  { value: "stock_in", label: "Stocks (India)" },
  { value: "mf_in", label: "Mutual Funds (India)" },
  { value: "stock_us", label: "Stocks (US)" },
  { value: "etf_us", label: "ETFs (US)" },
  { value: "commodity", label: "Commodities (Gold / Silver)" },
  { value: "reit", label: "REITs" },
  { value: "invit", label: "InvITs" },
  { value: "bond", label: "Bonds" },
  { value: "crypto", label: "Crypto" },
];

const CATEGORY_OPTIONS = [
  "Stocks",
  "Mutual Funds",
  "ETFs",
  "Commodities",
  "REIT",
  "InvIT",
  "Bonds",
  "Crypto",
];

const SEGMENT_BY_CATEGORY: Record<string, string[]> = {
  Stocks: ["Equity"],
  "Mutual Funds": ["Equity", "Debt", "Hybrid", "Commodity", "Multi Asset", "International"],
  ETFs: ["Equity", "Debt", "Commodity", "International"],
  Commodities: ["Precious Metal", "Energy", "Agriculture"],
  REIT: ["Real Estate"],
  InvIT: ["Infrastructure"],
  Bonds: ["Debt"],
  Crypto: ["Crypto"],
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
  Commodities: [
    "Gold ETF",
    "Silver ETF",
    "Crude Oil ETF",
    "Agricultural Commodity ETF",
    "Physical Gold",
    "Physical Silver",
  ],
  REIT: [
    "Residential REIT",
    "Commercial REIT",
    "Industrial REIT",
    "Mixed REIT",
    "Hospitality REIT",
  ],
  InvIT: [
    "Power Infrastructure",
    "Telecom Infrastructure",
    "Highway Infrastructure",
    "Water Infrastructure",
    "Mixed Infrastructure",
  ],
};

/** Currencies allowed per category (first entry is the default). */
const CURRENCY_BY_CATEGORY: Record<string, Currency[]> = {
  Stocks: ["INR", "USD"],
  "Mutual Funds": ["INR"],
  ETFs: ["INR", "USD"],
  Commodities: ["INR", "USD"],
  REIT: ["INR"],
  InvIT: ["INR"],
  Bonds: ["INR", "USD"],
  Crypto: ["INR", "USD"],
};

const SECTOR_SUGGESTIONS = [
  "Technology",
  "Banking",
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

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "sold", label: "Sold" },
  { value: "matured", label: "Matured" },
];

function kindsForFilter(f: CategoryFilter): IdentifierType[] {
  switch (f) {
    case "stock_in":
    case "reit":
    case "invit":
    case "bond":
      return ["stock_in"];
    case "mf_in":
      return ["mf_in"];
    case "stock_us":
    case "etf_us":
      return ["stock_us"];
    case "commodity":
      return ["stock_in", "stock_us"];
    case "crypto":
      return ["crypto"];
    case "all":
    default:
      return ["stock_in", "mf_in", "stock_us"];
  }
}

/** Curated instruments (REIT / InvIT / commodity) to merge into results. */
function curatedKindsForFilter(f: CategoryFilter): Array<"reit" | "invit" | "commodity"> | undefined {
  if (f === "reit") return ["reit"];
  if (f === "invit") return ["invit"];
  if (f === "commodity") return ["commodity"];
  if (f === "all") return undefined; // all curated kinds
  return [];
}

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
  if (/tech|software|infosys|tcs|wipro|hcl|apple|microsoft|google|amazon|meta|nvidia/.test(n))
    return "Technology";
  if (/energy|oil|gas|petro|coal|reliance|ongc|ntpc|power|solar|renew/.test(n))
    return "Energy/Oil & Gas";
  if (/motor|auto|maruti|mahindra|hero|bajaj\s*auto|tesla|ford/.test(n)) return "Auto/Automotive";
  if (/steel|metal|zinc|copper|aluminium|mining|jindal|hindalco/.test(n)) return "Metals/Mining";
  if (/cement|infra|construction/.test(n)) return "Infrastructure";
  if (/fmcg|hindustan\s*unilever|nestle|dabur|itc|godrej/.test(n)) return "FMCG";
  if (/telecom|airtel|jio|vodafone|idea|verizon|at&t/.test(n)) return "Telecom";
  if (/real\s*estate|realty|dlf|prestige|oberoi/.test(n)) return "Real Estate";
  if (/chemical|specialty/.test(n)) return "Chemical";
  return "";
}

function classifySearchResult(r: SearchResult): Classification {
  const name = r.name.toLowerCase();
  const isETF =
    /\betf\b|exchange traded fund/i.test(r.name) ||
    (r.meta?.quoteType ?? "").toUpperCase() === "ETF";

  const curated = (r.meta?.curatedKind ?? curatedKindFor(r.identifier)) as
    | "reit"
    | "invit"
    | "commodity"
    | null;

  // ---- InvIT ----
  if (curated === "invit" || /\binvit\b|infrastructure (investment )?trust/.test(name)) {
    let classification = "Mixed Infrastructure";
    if (/power|grid|energy|solar|renew/.test(name)) classification = "Power Infrastructure";
    else if (/telecom|tower|fibre|fiber/.test(name)) classification = "Telecom Infrastructure";
    else if (/highway|road|toll|nhit/.test(name)) classification = "Highway Infrastructure";
    else if (/water|pipeline/.test(name)) classification = "Water Infrastructure";
    return { category: "InvIT", segment: "Infrastructure", classification, sector: "Infrastructure" };
  }

  // ---- REIT ----
  if (curated === "reit" || /\breit\b|real estate (investment )?trust/.test(name)) {
    let classification = "Commercial REIT";
    if (/residential|housing|realty homes/.test(name)) classification = "Residential REIT";
    else if (/industrial|warehous|logistic/.test(name)) classification = "Industrial REIT";
    else if (/hotel|hospitality|resort/.test(name)) classification = "Hospitality REIT";
    else if (/mixed|diversified|select/.test(name)) classification = "Mixed REIT";
    return { category: "REIT", segment: "Real Estate", classification, sector: "Real Estate" };
  }

  // ---- Commodities ----
  if (curated === "commodity" || /\bgold\b|\bsilver\b|crude oil|agricultur|commodit/.test(name)) {
    let segment = "Precious Metal";
    let classification = "Gold ETF";
    if (/silver/.test(name)) classification = "Silver ETF";
    else if (/crude|oil|energy/.test(name)) {
      segment = "Energy";
      classification = "Crude Oil ETF";
    } else if (/agricultur|agri/.test(name)) {
      segment = "Agriculture";
      classification = "Agricultural Commodity ETF";
    }
    if (r.identifier_type === "mf_in") {
      // Gold/silver savings funds stay under Mutual Funds.
      return { category: "Mutual Funds", segment: "Commodity", classification, sector: "" };
    }
    return { category: "Commodities", segment, classification, sector: "Commodities" };
  }



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
    // Rough cap classification is not reliably derivable from search alone;
    // default to "Large Cap" and let the user edit.
    return {
      category: "Stocks",
      segment: "Equity",
      classification: "Large Cap",
      sector: detectSector(r.name),
    };
  }

  return { category: "", segment: "", classification: "", sector: "" };
}

function inferCountry(r: SearchResult): { country: string; flag: string } {
  if (r.identifier_type === "stock_in" || r.identifier_type === "mf_in")
    return { country: "India", flag: "🇮🇳" };
  if (r.identifier_type === "stock_us") return { country: "United States", flag: "🇺🇸" };
  return { country: "", flag: "" };
}

function kindBadge(k: IdentifierType): string {
  if (k === "mf_in") return "MF (India)";
  if (k === "stock_in") return "Stock (IN)";
  if (k === "stock_us") return "Stock (US)";
  return "Crypto";
}

// ---------- Search hook ----------

function useMultiSearch(query: string, filter: CategoryFilter) {
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
    const kinds = kindsForFilter(filter);

    (async () => {
      try {
        const settled = await Promise.allSettled(
          kinds.map((kind) => runSearch({ data: { query: q, kind } })),
        );
        if (seqRef.current !== mine) return;
        const merged: SearchResult[] = [];
        const seen = new Set<string>();
        // Curated NSE REITs / InvITs / commodity ETFs first — providers index
        // these inconsistently.
        const curatedKinds = curatedKindsForFilter(filter);
        for (const r of searchIndiaListed(q, curatedKinds)) {
          const key = `${r.identifier_type}:${r.identifier}:${r.exchange ?? ""}`;
          if (seen.has(key)) continue;
          seen.add(key);
          merged.push(r);
        }
        for (const s of settled) {
          if (s.status !== "fulfilled") continue;
          for (const r of s.value as SearchResult[]) {
            const key = `${r.identifier_type}:${r.identifier}:${r.exchange ?? ""}`;
            if (seen.has(key)) continue;
            seen.add(key);
            // ETF filter: keep only ETFs when user picked etf_us.
            if (filter === "etf_us") {
              const isETF =
                /\betf\b|exchange traded fund/i.test(r.name) ||
                (r.meta?.quoteType ?? "").toUpperCase() === "ETF";
              if (!isETF) continue;
            }
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
  }, [query, filter, runSearch]);

  return { results, loading, error };
}

// ---------- Form state ----------

type FormState = {
  name: string;
  symbol: string;
  identifier: string | null;
  identifier_type: IdentifierType | null;
  exchange: string | null;
  country: string;
  country_flag: string;
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

  is_sip: boolean;
  status: string;

  payment_mode: string | null;
  payment_account_id: string | null;

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
  country_flag: "",
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
  is_sip: false,
  status: "active",
  payment_mode: null,
  payment_account_id: null,
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
  const flag =
    inv.identifier_type === "stock_us" ? "🇺🇸" : inv.identifier_type ? "🇮🇳" : "";
  return {
    name: inv.name,
    symbol: inv.symbol ?? "",
    identifier: inv.identifier,
    identifier_type: (inv.identifier_type as IdentifierType | null) ?? null,
    exchange: inv.exchange,
    country: inv.identifier_type === "stock_us" ? "United States" : inv.identifier_type ? "India" : "",
    country_flag: flag,
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
    is_sip: !!inv.is_sip,
    status: inv.status || "active",
    payment_mode: inv.payment_mode ?? null,
    payment_account_id: inv.payment_account_id ?? null,
    current_price: inv.current_price ?? null,
    price_source: inv.price_source ?? null,
  };
}

// ---------- Shared class names ----------

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-mint focus:outline-none focus:ring-2 focus:ring-mint/20 disabled:cursor-not-allowed disabled:opacity-60 transition-colors";

const selectCls = inputCls + " appearance-none pr-9 bg-no-repeat bg-[right_0.75rem_center]";

const labelCls = "mb-1.5 block text-xs font-medium text-foreground";

const cardCls =
  "rounded-2xl border border-border bg-card shadow-sm";

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
  const [hydrated, setHydrated] = useState(!isEdit);
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [priceLoading, setPriceLoading] = useState(false);
  const [customPlatforms, setCustomPlatforms] = useState<string[]>([]);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);

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

  const { results, loading, error } = useMultiSearch(debounced, filter);
  const showPanel = panelOpen && debounced.length >= 2;

  useEffect(() => setActive(0), [results]);

  // Close panel on outside click.
  useEffect(() => {
    if (!showPanel) return;
    const onDoc = (e: MouseEvent) => {
      if (!searchWrapRef.current) return;
      if (!searchWrapRef.current.contains(e.target as Node)) setPanelOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [showPanel]);

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
    const { country, flag } = inferCountry(r);
    const currency = ((r.currency as Currency) ??
      (r.identifier_type === "stock_us" ? "USD" : "INR")) as Currency;
    setForm((prev) => ({
      ...prev,
      name: r.name,
      symbol: r.identifier,
      identifier: r.identifier,
      identifier_type: r.identifier_type,
      exchange: r.exchange ?? null,
      country,
      country_flag: flag,
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
  const displayPrice = livePrice ?? (avg > 0 ? avg : null);
  const marketValue = displayPrice != null ? qty * displayPrice : null;
  const sym = CURRENCY_SYMBOL[form.currency] ?? "₹";
  const locale = form.currency === "INR" ? "en-IN" : "en-US";
  const fmt = (n: number, max = 2) =>
    `${sym}${n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: max })}`;

  const segmentOptions = SEGMENT_BY_CATEGORY[form.category] ?? [];
  const classificationOptions = CLASSIFICATION_SUGGESTIONS[form.category] ?? [];
  const currencyOptions = CURRENCY_BY_CATEGORY[form.category] ?? (["INR", "USD"] as Currency[]);
  const isExchangeListedTrust = form.category === "REIT" || form.category === "InvIT";

  // REIT / InvIT units are bought directly on the exchange — default the
  // platform to "NSE Listed" and keep currency inside the allowed set.
  useEffect(() => {
    setForm((f) => {
      const allowed = CURRENCY_BY_CATEGORY[f.category] ?? (["INR", "USD"] as Currency[]);
      const nextCurrency = allowed.includes(f.currency) ? f.currency : allowed[0];
      const nextPlatform =
        (f.category === "REIT" || f.category === "InvIT") && !f.platform ? "NSE Listed" : f.platform;
      if (nextCurrency === f.currency && nextPlatform === f.platform) return f;
      return { ...f, currency: nextCurrency, platform: nextPlatform };
    });
  }, [form.category]);


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

  const canSave =
    !!form.platform.trim() &&
    qty > 0 &&
    avg > 0 &&
    !!form.purchase_date &&
    !!form.name.trim();

  const clearAll = () => {
    setForm({ ...EMPTY, purchase_date: todayISO() });
    setQuery("");
    setDebounced("");
    setPanelOpen(false);
    setFilter("all");
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

  const setPayment = (v: PaymentFieldsValue) => {
    setForm((f) => ({
      ...f,
      payment_mode: v.payment_mode,
      payment_account_id: v.payment_account_id,
    }));
  };

  const submit = async (keepOpen = false) => {
    if (!canSave) {
      if (!form.name.trim()) toast.error("Please select or enter an investment first");
      else if (!form.platform.trim()) toast.error("Investment platform is required");
      else if (qty <= 0) toast.error("Quantity must be greater than zero");
      else if (avg <= 0) toast.error("Average buy price must be greater than zero");
      else if (!form.purchase_date) toast.error("Purchase date is required");
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
      status: form.status || "active",
      is_sip: form.is_sip,
      identifier_type: form.identifier_type,
      identifier: form.identifier,
      exchange: form.exchange,
      currency: form.currency,
      payment_mode: form.payment_mode,
      payment_account_id: form.payment_account_id,
    };

    try {
      await upsert.mutateAsync(payload);
      toast.success(isEdit ? "Investment updated" : "Investment added");
      if (keepOpen && !isEdit) {
        clearAll();
        return;
      }
      if (onSaved) onSaved();
      else navigate({ to: "/wealth" });
    } catch {
      /* mutation surfaces its own toast */
    }
  };

  const priceSource = form.price_source ?? "live";
  const liveDot = livePrice != null;

  return (
    <div className="mx-auto w-full max-w-7xl px-3 pb-28 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 py-4 sm:py-6">
        <div className="flex items-start gap-3">
          <button
            type="button"
            aria-label="Back"
            onClick={goCancel}
            className="rounded-lg border border-border bg-card p-2 text-foreground transition hover:bg-surface-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {isEdit ? "Edit Investment" : "Add Investment"}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {isEdit
                ? "Update the details of this investment"
                : "Search, select and add your investment"}
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-mint">
          <HelpCircle className="h-4 w-4" />
          How it works
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ---------- Left column: sections 1-3 ---------- */}
        <div className="space-y-4 lg:col-span-2">
          {/* Section 1: Find Investment */}
          <section className={cardCls}>
            <SectionHeader
              n={1}
              title="Find Investment"
              subtitle="Search and select your investment"
            />
            <div className="space-y-4 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[220px_1fr]">
                <div>
                  <label className={labelCls}>Category</label>
                  <div className="relative">
                    <select
                      className={selectCls}
                      value={filter}
                      onChange={(e) => setFilter(e.target.value as CategoryFilter)}
                    >
                      {CATEGORY_FILTERS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <Chevron />
                  </div>
                </div>

                <div ref={searchWrapRef}>
                  <label className={labelCls}>Search Investment</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPanelOpen(true);
                      }}
                      onFocus={() => setPanelOpen(true)}
                      onKeyDown={onKeyDown}
                      placeholder="Search by name, ticker or fund name…"
                      className={cn(inputCls, "pl-9 pr-9")}
                    />
                    {query ? (
                      <button
                        type="button"
                        onClick={() => {
                          setQuery("");
                          setDebounced("");
                        }}
                        aria-label="Clear search"
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : loading ? (
                      <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    ) : null}

                    {showPanel ? (
                      <div className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                        {error ? (
                          <div className="px-3 py-2.5 text-xs text-amber-500">
                            Search provider unavailable.
                          </div>
                        ) : loading && results.length === 0 ? (
                          <div className="px-3 py-2.5 text-xs text-muted-foreground">
                            Searching…
                          </div>
                        ) : results.length === 0 ? (
                          <div className="px-3 py-2.5 text-xs text-muted-foreground">
                            No results found.
                          </div>
                        ) : (
                          <div className="max-h-80 overflow-y-auto py-1">
                            {results.map((r, idx) => (
                              <button
                                key={`${r.identifier_type}:${r.identifier}:${r.exchange ?? ""}`}
                                type="button"
                                onMouseEnter={() => setActive(idx)}
                                onClick={() => void commitSelection(r)}
                                className={cn(
                                  "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors",
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
                                  {kindBadge(r.identifier_type)}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>Search by company name, fund name or ticker (min 2 characters)</span>
                    <span className="hidden sm:inline">
                      Popular: RELIANCE, HDFCBANK, AAPL, VOO, VTI
                    </span>
                  </div>
                </div>
              </div>

              {/* Selected investment card */}
              {isLinked ? (
                <div className="rounded-xl border border-border bg-surface-2/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background text-lg">
                        {form.country_flag || "📈"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-base font-semibold text-foreground">
                            {form.name}
                          </div>
                          {form.identifier_type && (
                            <span className="rounded-md bg-mint/15 px-2 py-0.5 text-[10px] font-semibold text-mint">
                              {kindBadge(form.identifier_type)}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {form.symbol}
                          {form.exchange ? ` · ${form.exchange}` : ""}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleUnlink}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface-2"
                    >
                      <Pencil className="h-3 w-3" /> Change
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
                    <MetaCol label="Name" value={form.name} />
                    <MetaCol label="Symbol / Ticker" value={form.symbol || "—"} />
                    <MetaCol label="Exchange" value={form.exchange || "—"} />
                    <MetaCol
                      label="Country"
                      value={
                        <span className="inline-flex items-center gap-1">
                          {form.country_flag ? <span>{form.country_flag}</span> : null}
                          {form.country || "—"}
                        </span>
                      }
                    />
                    <MetaCol label="Currency" value={form.currency} />
                  </div>

                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-mint/10 px-2.5 py-1 text-[11px] font-medium text-mint">
                    <CheckCircle2 className="h-3 w-3" /> Auto-filled from market data
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-surface-2/20 p-6 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-muted-foreground">
                    <Search className="h-4 w-4" />
                  </div>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    No investment selected yet
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Search above to auto-fill classification and live price. Manual entry is also
                    supported below.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Section 2: Classification */}
          <section className={cardCls}>
            <SectionHeader
              n={2}
              title="Classification"
              subtitle="Automatically detected (editable)"
            />
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
              <div>
                <label className={labelCls}>Category</label>
                <div className="relative">
                  <select
                    className={selectCls}
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        category: e.target.value,
                        segment: "",
                      }))
                    }
                  >
                    <option value="">Select</option>
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <Chevron />
                </div>
              </div>

              <div>
                <label className={labelCls}>Segment</label>
                <div className="relative">
                  <select
                    className={selectCls}
                    value={form.segment}
                    onChange={(e) => setForm((f) => ({ ...f, segment: e.target.value }))}
                    disabled={!form.category}
                  >
                    <option value="">Select</option>
                    {segmentOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <Chevron />
                </div>
              </div>

              <div>
                <label className={labelCls}>Classification</label>
                <input
                  type="text"
                  className={inputCls}
                  list="classification-suggestions"
                  value={form.classification}
                  onChange={(e) => setForm((f) => ({ ...f, classification: e.target.value }))}
                  placeholder="e.g. Large Cap"
                />
                <datalist id="classification-suggestions">
                  {classificationOptions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className={labelCls}>Sector</label>
                <input
                  type="text"
                  className={inputCls}
                  list="sector-suggestions"
                  value={form.sector}
                  onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
                  placeholder="e.g. Technology"
                />
                <datalist id="sector-suggestions">
                  {SECTOR_SUGGESTIONS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              <div className="sm:col-span-2 lg:col-span-4">
                <p className="inline-flex items-center gap-1.5 text-[11px] text-sky-500">
                  <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sky-500/15 text-sky-500">
                    i
                  </span>
                  You can edit these details if required
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Investment Details */}
          <section className={cardCls}>
            <SectionHeader
              n={3}
              title="Investment Details"
              subtitle="Enter your investment details"
            />
            <div className="space-y-4 p-4 sm:p-5">
              {/* Manual name (only when nothing selected) */}
              {!isLinked && (
                <div>
                  <label className={labelCls}>
                    Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={inputCls}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Instrument name"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className={labelCls}>
                    Investment Platform <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      className={selectCls}
                      value={
                        mergedPlatforms.some(
                          (p) => p.toLowerCase() === form.platform.toLowerCase(),
                        )
                          ? form.platform
                          : form.platform || ""
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
                    <Chevron />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>
                    Purchase Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    className={inputCls}
                    value={form.purchase_date}
                    onChange={(e) => setForm((f) => ({ ...f, purchase_date: e.target.value }))}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    Quantity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    className={inputCls}
                    min={0}
                    step="0.0001"
                    value={form.quantity}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    Average Buy Price ({sym}){" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    className={inputCls}
                    min={0}
                    step="0.01"
                    value={form.avg_price}
                    onChange={(e) => setForm((f) => ({ ...f, avg_price: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className={labelCls}>Currency</label>
                  <div className="relative">
                    <select
                      className={selectCls}
                      value={form.currency}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, currency: e.target.value as Currency }))
                      }
                      disabled={currencyOptions.length <= 1}
                    >
                      {currencyOptions.map((c) => (
                        <option key={c} value={c}>
                          {CURRENCY_SYMBOL[c]} · {c}
                        </option>
                      ))}
                    </select>
                    <Chevron />
                  </div>
                  {isExchangeListedTrust ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      NSE listed — traded in INR.
                    </p>
                  ) : null}
                </div>
              </div>


              {/* Summary row */}
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-surface-2/40 p-4 sm:grid-cols-3">
                <SummaryCell
                  label="Invested Amount"
                  value={invested > 0 ? fmt(invested) : "—"}
                />
                <SummaryCell
                  label="Current Price (Live)"
                  value={
                    priceLoading
                      ? "Fetching…"
                      : displayPrice != null
                        ? fmt(displayPrice, 4)
                        : "—"
                  }
                  badge={
                    displayPrice != null ? (
                      <LivePill live={liveDot} source={priceSource} />
                    ) : null
                  }
                />
                <SummaryCell
                  label="Current Value (Live)"
                  value={marketValue != null ? fmt(marketValue) : "—"}
                  badge={
                    marketValue != null ? (
                      <LivePill live={liveDot} source={priceSource} />
                    ) : null
                  }
                />
              </div>
            </div>
          </section>
        </div>

        {/* ---------- Right column: Payment ---------- */}
        <aside className="lg:col-span-1">
          <section className={cn(cardCls, "lg:sticky lg:top-4")}>
            <SectionHeader
              n={4}
              title="Payment Mode"
              subtitle="How you purchased this investment"
            />
            <div className="space-y-4 p-4 sm:p-5">
              <PaymentFields
                value={{
                  payment_mode: form.payment_mode,
                  payment_account_id: form.payment_account_id,
                }}
                onChange={setPayment}
                required={false}
              />

              {/* SIP tracking toggle */}
              <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface-2/40 px-3 py-3">
                <div>
                  <div className="text-xs font-medium text-foreground">
                    SIP tracking{" "}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Track recurring contributions to this investment.
                  </p>
                </div>
                <ToggleSwitch
                  checked={form.is_sip}
                  onChange={(v) => setForm((f) => ({ ...f, is_sip: v }))}
                  label="SIP tracking"
                />
              </div>

              <div>
                <label className={labelCls}>Status</label>
                <div className="relative">
                  <select
                    className={selectCls}
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <Chevron />
                </div>
              </div>

              <div>
                <label className={labelCls}>
                  Notes <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  rows={4}
                  className={cn(inputCls, "resize-y")}
                  maxLength={300}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Add any additional notes (optional)"
                />
                <div className="mt-1 text-right text-[10px] text-muted-foreground">
                  {form.notes.length} / 300
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {/* ---------- Bottom action bar (sticky) ---------- */}
      <div className="fixed inset-x-0 bottom-[calc(78px+env(safe-area-inset-bottom))] z-[80] border-t border-border bg-background/95 shadow-lg backdrop-blur lg:bottom-0 lg:pb-0">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-end gap-2 px-3 py-3 sm:px-6">
          <button
            type="button"
            onClick={goCancel}
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface-2 sm:flex-none sm:px-4"
          >
            Cancel
          </button>
          {!isEdit && (
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={upsert.isPending || !canSave}
              className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border border-mint bg-transparent px-3 py-2 text-sm font-semibold text-mint transition hover:bg-mint/10 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-4"
            >
              {upsert.isPending ? "Saving…" : "Save & Add"}
            </button>
          )}
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={upsert.isPending || !canSave}
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg bg-mint px-3 py-2 text-sm font-semibold text-[#04121C] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-5"
          >
            {upsert.isPending ? "Saving…" : isEdit ? "Save Changes" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Small helpers ----------

function SectionHeader({
  n,
  title,
  subtitle,
}: {
  n: number;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3.5 sm:px-5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-mint text-sm font-semibold text-[#04121C]">
        {n}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-mint">{title}</div>
        {subtitle && <div className="text-[11px] text-muted-foreground">{subtitle}</div>}
      </div>
    </div>
  );
}

function MetaCol({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function SummaryCell({
  label,
  value,
  badge,
}: {
  label: string;
  value: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <div className="text-base font-semibold text-foreground">{value}</div>
        {badge}
      </div>
    </div>
  );
}

function LivePill({ live, source }: { live: boolean; source: string | null }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
        live ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          live ? "bg-emerald-500" : "bg-muted-foreground/60",
        )}
      />
      {live ? "Live" : source ?? "manual"}
    </span>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/40",
        checked ? "border-mint bg-mint" : "border-border bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full shadow-md transition",
          checked ? "translate-x-5 bg-[#04121C]" : "translate-x-0 bg-foreground",
        )}
      />
    </button>
  );
}

function Chevron() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
      fill="currentColor"
    >
      <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

// Backwards-compatible dummy export in case older callers imported Plus icon.
export const _AddInvestmentIcons = { Plus };

export default AddInvestmentForm;
