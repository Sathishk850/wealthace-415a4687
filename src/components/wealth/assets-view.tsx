import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { formatDateShort } from "@/lib/date-format";
import { useBulkSelection } from "@/lib/bulk/use-bulk-selection";
import { useBulkDeleteRows, useBulkUpdateRows } from "@/lib/bulk/use-bulk-mutations";
import { BulkActionBar } from "@/components/bulk/bulk-action-bar";
import { HoldingSummaryRow } from "@/components/wealth/holding-summary-row";
import {
  ASSET_CATEGORY_FOR,
  ASSET_CLASSIFICATIONS,
  INVESTMENT_CATEGORY_FOR,
  type AssetClassification,
} from "@/lib/asset-classification";
import { normalizeInvestmentCategory } from "@/lib/import/classify-security";
import { SelectCheckbox } from "@/components/bulk/select-checkbox";

import { openImport } from "@/components/import/import-host";

import {
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  Plus,
  Upload,
  ChevronDown,
  MoreHorizontal,

} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TextTabs } from "@/components/text-tabs";
import { AssetDialog } from "@/components/wealth/asset-dialog";
import { HoldingDetailsModal } from "@/components/wealth/holding-details-modal";
import { useInvestmentQuotes, useRefreshHoldings } from "@/lib/market/use-market-data";
import { deriveHolding, investmentQuoteKey } from "@/lib/market/derive";
import { fundCategory, marketCapBand, sectorFromNotes } from "@/lib/holding-meta";
import { normalizeSector } from "@/lib/import/classify-holding";
import { AUTO_REFRESH_MS, RefreshIconButton } from "@/components/refresh-icon-button";
import type { MarketQuote } from "@/lib/market/types";
import { usePaymentAccounts } from "@/lib/payment-accounts-api";
import { useCollapsibleGroups } from "@/lib/use-collapsible-groups";

import {
  type Asset,
  type Investment,
  amountIn,
  priceIn,
  useAssets,
  useDeleteAsset,
  useDeleteInvestment,
  useInvestments,
  inr,
  singleXirr,
  portfolioXirr,
  useInvestmentTxnCounts,
} from "@/lib/wealth-api";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

/** Investment platform chosen on the Add Investment form, stored in notes. */
function platformFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  for (const line of notes.split(/\r?\n/)) {
    const m = line.match(/^\s*Platform:\s*(.+)$/i);
    if (m && m[1].trim()) return m[1].trim();
  }
  return null;
}

/** Segment chosen on the Add Investment form, stored in notes as "Segment: X". */
function segmentFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  for (const line of notes.split(/\r?\n/)) {
    const m = line.match(/^\s*Segment:\s*(.+)$/i);
    if (m && m[1].trim()) return m[1].trim();
  }
  return null;
}

/** Fallback segment when the holding was created before segments were captured. */
const SEGMENT_FALLBACK: Record<string, string> = {
  Stocks: "Equity",
  "Mutual Funds": "Mutual Fund",
  ETFs: "Equity",
  Bonds: "Debt",
  Bond: "Debt",
  Gold: "Commodity",
  Commodities: "Commodity",
  Crypto: "Crypto",
  REIT: "Real Estate",
  REITs: "Real Estate",
  InvIT: "Infrastructure",
  InvITs: "Infrastructure",
  Property: "Real Estate",
  Cash: "Cash & Savings",
  EPF: "Cash & Savings",
  PPF: "Cash & Savings",
  Others: "Other",
  Other: "Other",
};

/* =========================================================
   Tab definitions & bucketing rules
========================================================= */

type AssetTab =
  | "All Holdings"
  | "Stocks"
  | "Mutual Funds"
  | "ETFs"
  | "Commodities"
  | "Bonds"
  | "REIT"
  | "InvIT"
  | "Real Estate"
  | "Savings"
  | "Crypto"
  | "Other Assets";

/** Unified asset-type tabs. Legacy Real Estate and Savings remain available as distinct views. */
const ASSET_TABS: AssetTab[] = [
  "All Holdings",
  "Stocks",
  "Mutual Funds",
  "ETFs",
  "Commodities",
  "Bonds",
  "REIT",
  "Crypto",
  "Real Estate",
  "Savings",
  "Other Assets",
];


const ADD_LABEL: Record<AssetTab, string> = {
  "All Holdings": "Add Investment",
  Stocks: "Add Stock",
  "Mutual Funds": "Add Mutual Fund",
  ETFs: "Add ETF",
  Commodities: "Add Commodity",
  Bonds: "Add Bond",
  REIT: "Add REIT",
  Crypto: "Add Crypto",
  InvIT: "Add InvIT",
  "Real Estate": "Add Property",
  Savings: "Add Savings",
  "Other Assets": "Add Asset",
};

const SEARCH_PLACEHOLDER: Record<AssetTab, string> = {
  "All Holdings": "Search holdings...",
  Stocks: "Search stocks...",
  "Mutual Funds": "Search mutual funds...",
  ETFs: "Search ETFs...",
  Commodities: "Search commodities...",
  Bonds: "Search bonds...",
  REIT: "Search REITs...",
  Crypto: "Search crypto...",
  InvIT: "Search InvITs...",
  "Real Estate": "Search properties...",
  Savings: "Search savings...",
  "Other Assets": "Search assets...",
};

function classifyInvestment(
  category: string,
  subCategory?: string | null,
  symbol?: string | null,
  name?: string | null,
): AssetTab {
  const canonical = normalizeInvestmentCategory(category);
  const sub = (subCategory ?? "").toLowerCase();
  const text = `${name ?? ""} ${symbol ?? ""} ${sub}`.toLowerCase();

  if (canonical === "Bonds") return "Bonds";
  if (canonical === "ETFs") return sub.includes("bond") ? "Bonds" : "ETFs";
  if (canonical === "Stocks") return "Stocks";
  if (canonical === "Mutual Funds") return "Mutual Funds";
  if (canonical === "Crypto") return "Crypto";
  if (canonical === "Gold" || canonical === "Commodities") return "Commodities";
  if (canonical === "REIT") return "REIT";
  if (canonical === "InvIT") return "Other Assets";

  // Legacy broker exports often save no useful category. Use the remaining
  // normalized fields so existing rows appear in the same tab as new imports.
  if (/\b(etf|index fund|bees)\b/.test(text)) return "ETFs";
  if (/\b(fund|scheme|mutual fund|direct plan|folio)\b/.test(text)) return "Mutual Funds";
  if (/\b(reit|invit)\b/.test(text)) return "Other Assets";
  if (symbol || name || subCategory) return "Stocks";
  return "Other Assets";
}


function classifyAsset(cat: string): AssetTab {
  if (cat === "Property") return "Real Estate";
  if (cat === "Cash" || cat === "EPF" || cat === "PPF") return "Savings";
  if (cat === "Gold") return "Commodities";
  return "Other Assets";
}

/** Which add-flow a tab belongs to. */
const INVESTMENT_TABS: AssetTab[] = [
  "All Holdings",
  "Stocks",
  "Mutual Funds",
  "ETFs",
  "Commodities",
  "Bonds",
  "REIT",
  "Crypto",
  "InvIT",
];

const TAB_STORAGE_KEY = "finvista:holdings-tab";
const LAST_TOUCHED_KEY = "finvista:holdings-last-touched";

/* =========================================================
   Unified Holding row
========================================================= */

type SourceKind = "investment" | "asset";

type Holding = {
  id: string;
  source: SourceKind;
  tab: AssetTab;
  name: string;
  symbol: string | null;
  type: string; // e.g. "Equity", "Property", "Gold"
  segment: string; // Equity / Debt / Hybrid / Commodity / Real Estate / …
  sector: string | null;
  market_cap: string | null;
  exchange: string | null;
  platform: string | null;
  platform_id: string | null;
  quantity: number;
  avg_price: number;
  cmp: number;
  /** True when a live market quote priced this row. */
  live_price?: boolean;
  /** True when the row is market-linked but no live quote is available. */
  price_stale?: boolean;
  invested: number;
  current: number;
  pnl: number;
  pnl_pct: number;
  xirr_pct: number;
  currency: string;
  raw_investment?: Investment;
  raw_asset?: Asset;
  quote?: MarketQuote | null;
  /** All duplicate entries merged into this row (investments only). */
  lots?: Investment[];
  /** Number of recorded buy/sell transactions across the merged entries. */
  txn_count?: number;
};


type SortKey =
  | "name"
  | "segment"
  | "quantity"
  | "avg_price"
  | "cmp"
  | "invested"
  | "current"
  | "pnl"
  | "xirr"
  | "platform";

const DEFAULT_SORT: { key: SortKey; dir: "asc" | "desc" } = { key: "name", dir: "asc" };


/* =========================================================
   Component
========================================================= */

export function AssetsView({ registerAdd }: { registerAdd?: (open: () => void) => void }) {
  const [tab, setTab] = useState<AssetTab>(() => {
    if (typeof sessionStorage === "undefined") return "All Holdings";
    const saved = sessionStorage.getItem(TAB_STORAGE_KEY) as AssetTab | null;
    return saved && ASSET_TABS.includes(saved) ? saved : "All Holdings";
  });

  const [search, setSearch] = useState("");

  const [fSegment, setFSegment] = useState<string>("all");
  const [fSector, setFSector] = useState<string>("all");
  const [fMarketCap, setFMarketCap] = useState<string>("all");
  const [fExchange, setFExchange] = useState<string>("all");
  const [fPlatform, setFPlatform] = useState<string>("all");
  const [deskView, setDeskView] = useState<"grouped" | "flat">("grouped");
  const [sortKey, setSortKey] = useState<SortKey>(DEFAULT_SORT.key);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(DEFAULT_SORT.dir);

  const [details, setDetails] = useState<Holding | null>(null);
  const [detailsTab, setDetailsTab] = useState<"fundamental" | "history">("fundamental");
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [confirm, setConfirm] = useState<Holding | null>(null);
  const [lastTouched, setLastTouched] = useState<string | null>(() =>
    typeof sessionStorage === "undefined" ? null : sessionStorage.getItem(LAST_TOUCHED_KEY),
  );
  const navigate = useNavigate();

  // Filters are per-tab: a value carried over from another tab would filter
  // every row out. Reset to "all" (= show everything) on every tab change.
  useEffect(() => {
    setFSegment("all");
    setFSector("all");
    setFMarketCap("all");
    setFExchange("all");
    setFPlatform("all");
    setSearch("");
  }, [tab]);

  // Fix 6: remember the active tab across add / edit navigations.
  useEffect(() => {
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(TAB_STORAGE_KEY, tab);
  }, [tab]);

  // Highlight the recently added/edited holding, then fade the marker away.
  useEffect(() => {
    if (!lastTouched) return;
    const el = document.querySelector<HTMLElement>(`[data-holding-id="${lastTouched}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    const t = setTimeout(() => {
      setLastTouched(null);
      if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(LAST_TOUCHED_KEY);
    }, 4000);
    return () => clearTimeout(t);
  }, [lastTouched]);


  const { data: investments = [], isLoading: invLoading, refetch: refetchInv } = useInvestments();
  const { data: assets = [], isLoading: assetLoading, refetch: refetchAssets } = useAssets();
  const { data: paymentAccounts = [] } = usePaymentAccounts();

  const delInv = useDeleteInvestment();
  const delAsset = useDeleteAsset();

  const {
    quoteMap,
    isFetching: quotesFetching,
    refetch: refetchQuotes,
  } = useInvestmentQuotes(investments);
  const refreshHoldings = useRefreshHoldings();
  const { data: txnCounts = {} } = useInvestmentTxnCounts();

  const refreshAll = async () => {
    try {
      await refreshHoldings.mutateAsync();
    } catch {
      /* fall through to a cache refresh */
    }
    await Promise.all([refetchQuotes(), refetchInv(), refetchAssets()]);
  };

  // Keep holdings (and every insight derived from them) at most 30 minutes old.
  useEffect(() => {
    const t = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      void refetchQuotes();
      void refetchInv();
      void refetchAssets();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(t);
  }, [refetchQuotes, refetchInv, refetchAssets]);


  const platformLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of paymentAccounts) {
      const label = p.institution ? `${p.institution}${p.name ? " · " + p.name : ""}` : p.name;
      m.set(p.id, label);
    }
    return m;
  }, [paymentAccounts]);

  const platformLabelFor = (h: Holding | null | undefined): string | undefined => {
    if (!h) return undefined;
    if (h.platform_id) return platformLabelById.get(h.platform_id) ?? h.platform ?? undefined;
    return h.platform ?? undefined;
  };

  /* Build unified rows */
  const flatRows: Holding[] = useMemo(() => {
    const out: Holding[] = [];
    for (const inv of investments) {
      const key = investmentQuoteKey(inv);
      const quote: MarketQuote | null = key ? (quoteMap.get(key) ?? null) : null;
      const d = deriveHolding(inv, quote);
      // Platform = the investment platform / broker chosen on the form
      // (stored as a "Platform: X" line in notes). Never the payment mode
      // and never the price provider.
      const platform =
        platformFromNotes(inv.notes) ??
        (inv.payment_account_id ? (platformLabelById.get(inv.payment_account_id) ?? null) : null);
      out.push({
        id: inv.id,
        source: "investment",
        tab: classifyInvestment(inv.category, inv.sub_category, inv.symbol, inv.name),
        name: inv.name,
        symbol: inv.symbol,
        type: inv.sub_category || inv.category,
        segment: segmentFromNotes(inv.notes) ?? SEGMENT_FALLBACK[inv.category] ?? "",
        sector: normalizeSector(sectorFromNotes(inv.notes)),
        market_cap: marketCapBand({ sub_category: inv.sub_category, notes: inv.notes }),
        exchange: inv.exchange ?? null,
        platform,
        platform_id: inv.payment_account_id ?? null,
        quantity: inv.quantity,
        avg_price: inv.avg_price,
        cmp: d.current_price,
        live_price: d.has_live,
        price_stale: !!(inv.identifier_type && inv.identifier) && !d.has_live,
        invested: d.invested,
        current: d.current_value,
        pnl: d.unrealized_pl,
        pnl_pct: d.return_pct,
        xirr_pct: singleXirr(inv),
        currency: inv.currency || "INR",
        raw_investment: inv,
        quote,
      });
    }
    for (const a of assets) {
      const invested = a.purchase_value ?? a.current_value;
      const pnl = a.current_value - invested;
      const pnl_pct = invested > 0 ? (pnl / invested) * 100 : 0;
      const platform = a.payment_account_id
        ? (platformLabelById.get(a.payment_account_id) ?? null)
        : null;
      out.push({
        id: a.id,
        source: "asset",
        tab: classifyAsset(a.category),
        name: a.name,
        symbol: null,
        type: a.sub_category || a.category,
        segment: SEGMENT_FALLBACK[a.category] ?? "",
        sector: normalizeSector(sectorFromNotes(a.notes)),
        market_cap: marketCapBand({ sub_category: a.sub_category, notes: a.notes }),
        exchange: null,
        platform,
        platform_id: a.payment_account_id ?? null,
        quantity: a.quantity ?? 1,
        avg_price: a.quantity ? invested / a.quantity : invested,
        cmp: a.quantity ? a.current_value / a.quantity : a.current_value,
        invested,
        current: a.current_value,
        pnl,
        pnl_pct,
        xirr_pct: 0,
        currency: "INR",
        raw_asset: a,
      });
    }
    return out;
  }, [investments, assets, quoteMap, platformLabelById]);

  /* Merge duplicate entries of the same instrument into one row */
  const rows: Holding[] = useMemo(() => {
    const out: Holding[] = [];
    const byKey = new Map<string, number>();
    for (const r of flatRows) {
      if (r.source !== "investment" || !r.raw_investment) {
        out.push(r);
        continue;
      }
      const key = [
        r.tab,
        (r.symbol ?? r.name).trim().toLowerCase(),
        r.name.trim().toLowerCase(),
        r.currency,
      ].join("|");
      const at = byKey.get(key);
      if (at == null) {
        byKey.set(key, out.length);
        out.push({ ...r, lots: [r.raw_investment] });
        continue;
      }
      const g = out[at];
      const lots = [...(g.lots ?? []), r.raw_investment];
      const quantity = g.quantity + r.quantity;
      const invested = g.invested + r.invested;
      const current = g.current + r.current;
      const pnl = current - invested;
      out[at] = {
        ...g,
        lots,
        quantity,
        invested,
        current,
        pnl,
        pnl_pct: invested > 0 ? (pnl / invested) * 100 : 0,
        avg_price: quantity > 0 ? invested / quantity : g.avg_price,
        cmp: r.cmp || g.cmp,
        xirr_pct: portfolioXirr(lots) ?? 0,
      };
    }
    return out.map((r) =>
      r.lots
        ? {
            ...r,
            txn_count: r.lots.reduce((s, l) => s + (txnCounts[l.id] ?? 0), 0) || r.lots.length,
          }
        : r,
    );
  }, [flatRows, txnCounts]);

  const tabRows = useMemo(
    () => (tab === "All Holdings" ? rows : rows.filter((r) => r.tab === tab)),
    [rows, tab],
  );

  /* Filter option lists (per-tab) */
  const segmentOptions = useMemo(
    () => uniqSorted(tabRows.map((r) => r.segment).filter(Boolean) as string[]),
    [tabRows],
  );
  const sectorOptions = useMemo(
    () => uniqSorted(tabRows.map((r) => r.sector).filter(Boolean) as string[]),
    [tabRows],
  );
  const marketCapOptions = useMemo(
    () => uniqSorted(tabRows.map((r) => r.market_cap).filter(Boolean) as string[]),
    [tabRows],
  );
  const exchangeOptions = useMemo(
    () => uniqSorted(tabRows.map((r) => r.exchange).filter(Boolean) as string[]),
    [tabRows],
  );
  const platformOptions = useMemo(
    () => uniqSorted(tabRows.map((r) => r.platform).filter(Boolean) as string[]),
    [tabRows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tabRows.filter((r) => {
      if (q) {
        const hay =
          `${r.name} ${r.symbol ?? ""} ${r.type} ${r.segment} ${r.platform ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (fSegment !== "all" && segmentOptions.includes(fSegment) && r.segment !== fSegment) return false;
      if (fSector !== "all" && sectorOptions.includes(fSector) && r.sector !== fSector) return false;
      if (fMarketCap !== "all" && marketCapOptions.includes(fMarketCap) && r.market_cap !== fMarketCap) return false;
      if (fExchange !== "all" && exchangeOptions.includes(fExchange) && r.exchange !== fExchange) return false;
      if (fPlatform !== "all" && platformOptions.includes(fPlatform) && r.platform !== fPlatform) return false;
      return true;
    });
  }, [
    tabRows,
    search,
    fSegment,
    fSector,
    fMarketCap,
    fExchange,
    fPlatform,
    segmentOptions,
    sectorOptions,
    marketCapOptions,
    exchangeOptions,
    platformOptions,
  ]);

  /* Individual holdings — one row per holding (no grouping). */
  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const cmp = (a: Holding, b: Holding): number => {

      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "segment":
          return (a.segment || "").localeCompare(b.segment || "") * dir;
        case "platform":
          return (a.platform || "").localeCompare(b.platform || "") * dir;
        case "quantity":
          return (a.quantity - b.quantity) * dir;
        case "avg_price":
          return (a.avg_price - b.avg_price) * dir;
        case "cmp":
          return (a.cmp - b.cmp) * dir;
        case "invested":
          return (a.invested - b.invested) * dir;
        case "current":
          return (a.current - b.current) * dir;
        case "pnl":
          return (a.pnl - b.pnl) * dir;
        case "xirr":
          return (a.xirr_pct - b.xirr_pct) * dir;
        default:
          return a.name.localeCompare(b.name) * dir;
      }
    };
    return [...filtered].sort(cmp);
  }, [filtered, sortKey, sortDir]);



  const totals = useMemo(() => {
    let invested = 0,
      current = 0;
    for (const r of sorted) {
      invested += r.invested;
      current += r.current;
    }
    return {
      invested,
      current,
      pnl: current - invested,
      pnl_pct: invested > 0 ? ((current - invested) / invested) * 100 : 0,
    };
  }, [sorted]);

  /* Desktop grouped view: sector buckets over the same filtered/sorted rows. */
  const deskCollapse = useCollapsibleGroups("assets-desktop-groups-v1", true);
  const deskGroups = useMemo(() => buildHoldingGroups(sorted, tab), [sorted, tab]);
  const deskAllOpen = deskGroups.length > 0 && deskGroups.every((g) => deskCollapse.isOpen(g.label));


  const openAdd = () => {
    if (
      tab === "Stocks" ||
      tab === "Mutual Funds" ||
      tab === "ETFs" ||
      tab === "Commodities" ||
      tab === "Crypto" ||
      tab === "REIT" ||
      tab === "InvIT"
    ) {
      // Investments go through the redesigned add flow.
      navigate({ to: "/wealth/add-investment" });
    } else {
      setEditAsset(null);
      setAssetDialogOpen(true);
    }
  };
  if (registerAdd) registerAdd(openAdd);

  const openImportForTab = () => {
    openImport(INVESTMENT_TABS.includes(tab) ? "investments" : "assets");
  };


  /* Edit routes to the matching existing form in edit mode */
  const openEdit = (h: Holding) => {
    if (h.source === "investment") {
      navigate({ to: "/wealth/add-investment", search: { id: h.id } });
    } else {
      setEditAsset(h.raw_asset!);
      setAssetDialogOpen(true);
    }
  };

  /* Row selection (global bulk framework) */
  const rowKey = useCallback((h: Holding) => `${h.source}-${h.id}`, []);
  const sel = useBulkSelection(filtered, rowKey);
  const bulkDelInv = useBulkDeleteRows("wealth_investments", "holdings");
  const bulkDelAsset = useBulkDeleteRows("wealth_assets", "assets");
  const bulkUpdInv = useBulkUpdateRows("wealth_investments", "holdings");
  const bulkUpdAsset = useBulkUpdateRows("wealth_assets", "assets");

  const splitSelection = () => {
    const inv: string[] = [];
    const ast: string[] = [];
    for (const h of sel.selectedRows) (h.source === "investment" ? inv : ast).push(h.id);
    return { inv, ast };
  };

  const bulkDelete = async () => {
    const { inv, ast } = splitSelection();
    if (inv.length) await bulkDelInv.mutateAsync(inv);
    if (ast.length) await bulkDelAsset.mutateAsync(ast);
    sel.clear();
  };

  const bulkClassify = async (value: string) => {
    const cls = value as AssetClassification;
    const { inv, ast } = splitSelection();
    if (inv.length)
      await bulkUpdInv.mutateAsync({
        ids: inv,
        patch: { category: INVESTMENT_CATEGORY_FOR[cls] ?? "Others", sub_category: cls },
      });
    if (ast.length)
      await bulkUpdAsset.mutateAsync({
        ids: ast,
        patch: { category: ASSET_CATEGORY_FOR[cls] ?? "Other", sub_category: cls },
      });
    sel.clear();
  };

  const bulkBusy =
    bulkDelInv.isPending ||
    bulkDelAsset.isPending ||
    bulkUpdInv.isPending ||
    bulkUpdAsset.isPending;

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  const doDelete = async () => {
    if (!confirm) return;
    if (confirm.source === "investment") {
      await delInv.mutateAsync(confirm.id);
    } else {
      await delAsset.mutateAsync(confirm.id);
    }
    setConfirm(null);
  };

  const isLoading = invLoading || assetLoading;

  return (
    <div className="space-y-4">
      {/* ============ ASSET TABS ============ */}
      <div className="-mx-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TextTabs
          items={ASSET_TABS.map((t) => ({ value: t, label: t }))}
          value={tab}
          onChange={(v) => {
            setTab(v as AssetTab);
            setSearch("");
            setFSegment("all");
            setFSector("all");
            setFMarketCap("all");
            setFExchange("all");
            setFPlatform("all");
          }}
          className="min-w-max flex-nowrap px-1"
        />
      </div>


      {/* ============ TAB SUMMARY ============ */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Invested", value: amountIn(totals.invested, sorted[0]?.currency ?? "INR") },
          { label: "Current value", value: amountIn(totals.current, sorted[0]?.currency ?? "INR") },
          {
            label: "Overall P&L",
            value: `${totals.pnl >= 0 ? "+" : ""}${amountIn(totals.pnl, sorted[0]?.currency ?? "INR")} · ${totals.pnl_pct.toFixed(2)}%`,
          },
          { label: "Holdings", value: String(sorted.length) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card px-3 py-2.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</div>
            <div className="mt-1 truncate text-sm font-semibold tabular-nums text-foreground">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* ============ TOOLBAR (mobile) ============ */}
      {/* Filters + add on the first row; search (with refresh on its right) below. */}
      <div className="space-y-2 md:hidden">
        <div className="flex items-center gap-2">
          <div className="-mx-1 min-w-0 flex-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max items-center gap-2">
              <FilterMenu
                label="Segment"
                value={fSegment}
                onChange={setFSegment}
                options={segmentOptions}
              />
              <FilterMenu
                label="Sector"
                value={fSector}
                onChange={setFSector}
                options={sectorOptions}
              />
              <FilterMenu
                label="Market Cap"
                value={fMarketCap}
                onChange={setFMarketCap}
                options={marketCapOptions}
              />
              <FilterMenu
                label="Platform"
                value={fPlatform}
                onChange={setFPlatform}
                options={platformOptions}
              />
            </div>
          </div>
          <button
            onClick={openImportForTab}
            aria-label="Import holdings"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-surface text-foreground"
          >
            <Upload className="h-4 w-4" />
          </button>
          <button
            onClick={openAdd}
            aria-label={ADD_LABEL[tab]}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint text-[#04121C]"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={SEARCH_PLACEHOLDER[tab]}
              className="w-full rounded-xl border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-mint/50 focus:outline-none"
            />
          </div>
          <RefreshIconButton busy={refreshHoldings.isPending} label="Refresh prices" onClick={refreshAll} />
        </div>
      </div>

      {/* ============ TOOLBAR (desktop) ============ */}
      <div className="hidden flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 md:flex">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={SEARCH_PLACEHOLDER[tab]}
            className="w-full rounded-xl border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-mint/50 focus:outline-none"
          />
        </div>
        <FilterMenu
          label="Segment"
          value={fSegment}
          onChange={setFSegment}
          options={segmentOptions}
        />
        <FilterMenu label="Sector" value={fSector} onChange={setFSector} options={sectorOptions} />
        <FilterMenu
          label="Market Cap"
          value={fMarketCap}
          onChange={setFMarketCap}
          options={marketCapOptions}
        />
        <FilterMenu
          label="Exchange"
          value={fExchange}
          onChange={setFExchange}
          options={exchangeOptions}
        />
        <FilterMenu
          label="Platform"
          value={fPlatform}
          onChange={setFPlatform}
          options={platformOptions}
        />
        <div className="inline-flex rounded-xl border border-border bg-surface-2 p-0.5">
          {(["grouped", "flat"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setDeskView(v)}
              aria-pressed={deskView === v}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                deskView === v ? "bg-mint text-[#04121C]" : "text-muted-foreground"
              }`}
            >
              {v === "grouped" ? "Grouped" : "List"}
            </button>
          ))}
        </div>
        {deskView === "grouped" ? (
          <button
            onClick={() => deskCollapse.setAll(deskGroups.map((g) => g.label), !deskAllOpen)}
            className="px-2 text-xs font-semibold text-mint"
          >
            {deskAllOpen ? "Collapse all" : "Expand all"}
          </button>
        ) : null}
        <RefreshIconButton busy={refreshHoldings.isPending} label="Refresh prices" onClick={refreshAll} />

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={openImportForTab}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground transition hover:border-mint/40"
          >
            <Upload className="h-3.5 w-3.5" /> Import
          </button>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 rounded-xl bg-mint px-3 py-2 text-xs font-semibold text-[#04121C] transition hover:brightness-110"
          >
            <Plus className="h-3.5 w-3.5" /> {ADD_LABEL[tab]}
          </button>
        </div>
      </div>

      {/* ============ TABLE ============ */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {/* Mobile: grouped card list */}
        <div className="md:hidden">
          {isLoading ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : sorted.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No {tab === "All Holdings" ? "holdings" : tab.toLowerCase()} found. Tap <span className="text-mint">+</span> to add one.
            </div>
          ) : (
            <MobileHoldingGroups
              rows={sorted}
              rowKey={rowKey}
              isSelected={(k) => sel.isSelected(k)}
              onSelectChange={(k, v) => sel.toggle(k, v)}
              onView={(h) => {
                setDetailsTab("fundamental");
                setDetails(h);
              }}
               onEdit={(h) => openEdit(h)}
               onDelete={(h) => setConfirm(h)}
               tab={tab}
             />
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">


          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="w-[44px] px-3 py-3">
                  <SelectCheckbox
                    label="Select all holdings"
                    checked={sel.allSelected}
                    indeterminate={sel.someSelected && !sel.allSelected}
                    onChange={(v) => sel.toggleAll(v)}
                  />
                </th>

                <SortHeader
                  label={`Holdings (${sorted.length})`}
                  col="name"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onClick={toggleSort}
                  align="left"
                />

                <SortHeader
                  label="Qty"
                  col="quantity"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onClick={toggleSort}
                  align="right"
                />
                <SortHeader
                  label="Avg. Price"
                  col="avg_price"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onClick={toggleSort}
                  align="right"
                />
                <SortHeader
                  label={tab === "Mutual Funds" ? "NAV" : "CMP"}
                  col="cmp"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onClick={toggleSort}
                  align="right"
                />
                <SortHeader
                  label="Invested"
                  col="invested"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onClick={toggleSort}
                  align="right"
                />
                <SortHeader
                  label="Current"
                  col="current"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onClick={toggleSort}
                  align="right"
                />
                <SortHeader
                  label="P&L"
                  col="pnl"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onClick={toggleSort}
                  align="right"
                />
                <SortHeader
                  label="XIRR"
                  col="xirr"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onClick={toggleSort}
                  align="right"
                />
                <th className="px-3 py-3 text-right">Alloc %</th>
                {/* Platform is available under the Platform filter, not as a column. */}
                {/* reserved actions column, no header */}
                <th className="w-[120px] px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No {tab === "All Holdings" ? "holdings" : tab.toLowerCase()} found. Click <span className="text-mint">{ADD_LABEL[tab]}</span>{" "}
                    to add one.
                  </td>
                </tr>
              ) : deskView === "grouped" ? (
                deskGroups.map((g) => {
                  const open = deskCollapse.isOpen(g.label);
                  const up = g.pct >= 0;
                  return (
                    <Fragment key={g.label}>
                      <tr className="border-b border-border bg-surface-2/40">
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => deskCollapse.toggle(g.label)}
                            className="flex items-center gap-2 text-left"
                          >
                            <ChevronDown
                              className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`}
                            />
                            <span className="text-sm font-semibold text-foreground">{g.label}</span>
                            <span className="rounded-full bg-card px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                              {g.items.length}
                            </span>
                          </button>
                        </td>
                        <td colSpan={4}></td>
                        <td className="px-3 py-2 text-right text-sm font-semibold tabular-nums text-foreground">
                          {amountIn(g.current, g.currency)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right text-xs font-semibold tabular-nums ${up ? "text-emerald-500" : "text-rose-500"}`}
                        >
                          {up ? "+" : ""}
                          {g.pct.toFixed(2)}%
                        </td>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums text-muted-foreground">
                          {totals.current > 0 ? `${((g.current / totals.current) * 100).toFixed(2)}%` : "—"}
                        </td>
                        <td className="px-3 py-2"></td>
                      </tr>
                      {open
                        ? g.items.map((h) => (
                            <HoldingRow
                              key={rowKey(h)}
                              h={h}
                              holdingId={h.id}
                              highlight={lastTouched === h.id}
                              allocPct={totals.current > 0 ? (h.current / totals.current) * 100 : null}
                              selected={sel.isSelected(rowKey(h))}
                              onSelectChange={(v) => sel.toggle(rowKey(h), v)}
                              onView={() => {
                                setDetailsTab("fundamental");
                                setDetails(h);
                              }}
                              onEdit={() => openEdit(h)}
                              onDelete={() => setConfirm(h)}
                            />
                          ))
                        : null}
                    </Fragment>
                  );
                })
              ) : (
                sorted.map((h) => (
                  <HoldingRow
                    key={rowKey(h)}
                    h={h}
                    holdingId={h.id}
                    highlight={lastTouched === h.id}
                    allocPct={totals.current > 0 ? (h.current / totals.current) * 100 : null}
                    selected={sel.isSelected(rowKey(h))}
                    onSelectChange={(v) => sel.toggle(rowKey(h), v)}
                    onView={() => {
                      setDetailsTab("fundamental");
                      setDetails(h);
                    }}
                    onEdit={() => openEdit(h)}
                    onDelete={() => setConfirm(h)}
                  />
                ))
              )}



            </tbody>
          </table>
        </div>

        {sorted.length > 0 && (
          <div className="border-t border-border px-3 py-3 sm:px-4">
            <div className="mb-2 text-xs text-muted-foreground">
              All {sorted.length} holdings visible on this page
            </div>
            <HoldingSummaryRow
              invested={totals.invested}
              current={totals.current}
              pnl={totals.pnl}
              pnlPct={totals.pnl_pct}
            />
          </div>
        )}
      </div>

      {/* ============ GLOBAL BULK ACTION BAR ============ */}
      <BulkActionBar
        count={sel.selectedCount}
        entityLabel="holding"
        busy={bulkBusy}
        onClear={sel.clear}
        onDelete={bulkDelete}
        fieldActions={[
          {
            label: "Change Asset Classification",
            options: ASSET_CLASSIFICATIONS.map((o) => ({ value: o, label: o })),
            onSelect: bulkClassify,
          },
        ]}
      />

      {/* ============ MODALS ============ */}
      <HoldingDetailsModal
        open={!!details && details.source === "investment"}
        onOpenChange={(v) => !v && setDetails(null)}
        investment={details?.source === "investment" ? (details.raw_investment ?? null) : null}
        lots={details?.source === "investment" ? (details.lots ?? null) : null}
        quote={details?.quote ?? null}
        platformLabel={platformLabelFor(details)}
        allocationPct={
          details && totals.current > 0 ? (details.current / totals.current) * 100 : null
        }
        initialTab={detailsTab}
      />

      {/* Asset details fallback: reuse edit dialog in read/edit mode for now */}
      {details?.source === "asset" ? (
        <AssetDetailsModal
          holding={details}
          onClose={() => setDetails(null)}
          onEdit={() => {
            setEditAsset(details.raw_asset!);
            setAssetDialogOpen(true);
            setDetails(null);
          }}
        />
      ) : null}

      <AssetDialog
        open={assetDialogOpen}
        onOpenChange={(v) => {
          setAssetDialogOpen(v);
          if (!v) setEditAsset(null);
        }}
        existing={editAsset}
        defaultCategory={
          tab === "Real Estate" ? "Property" : tab === "Savings" ? "Cash" : undefined
        }
      />

      <AlertDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete holding?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{confirm?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={delInv.isPending || delAsset.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 text-white hover:bg-rose-600"
              disabled={delInv.isPending || delAsset.isPending}
              onClick={doDelete}
            >
              {delInv.isPending || delAsset.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* =========================================================
   Mobile: grouped, compact holding cards with a "…" menu
========================================================= */

function compactAmount(v: number, currency: string): string {
  const abs = Math.abs(v);
  const sym = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "₹";
  const fmt = (n: number, s: string) => `${sym}${n.toFixed(2)}${s}`;
  if (currency === "INR") {
    if (abs >= 1e7) return fmt(v / 1e7, "Cr");
    if (abs >= 1e5) return fmt(v / 1e5, "L");
    if (abs >= 1e3) return fmt(v / 1e3, "K");
  } else {
    if (abs >= 1e9) return fmt(v / 1e9, "B");
    if (abs >= 1e6) return fmt(v / 1e6, "M");
    if (abs >= 1e3) return fmt(v / 1e3, "K");
  }
  return `${sym}${v.toFixed(2)}`;
}

/**
 * Group labels come from imported data and are often empty or literal
 * placeholders ("-", "n/a"). Everything unusable collapses to a single
 * readable "Uncategorised" bucket instead of a stray dash.
 */
const UNCATEGORISED = "Uncategorised";

const PLACEHOLDER_RE = /^(-+|_+|n\/?a|na|null|none|others?|unknown)$/i;

function firstUsable(...candidates: (string | null | undefined)[]): string | null {
  for (const c of candidates) {
    const v = (c ?? "").trim();
    if (!v || PLACEHOLDER_RE.test(v)) continue;
    return v;
  }
  return null;
}

/** Fund house / AMC inferred from a scheme name ("HDFC Mid Cap …" → "HDFC"). */
function fundHouseFromName(name: string): string | null {
  const first = name.trim().split(/[\s\-—·|]+/)[0];
  if (!first || first.length < 2) return null;
  return first.toUpperCase() === first && first.length <= 4 ? first : first;
}

/** What each tab groups by, shown in the grouped-view header. */
export const GROUP_FIELD_LABEL: Partial<Record<AssetTab, string>> = {
  Stocks: "Market Cap",

  "Mutual Funds": "Fund House",
  ETFs: "Category",
  Commodities: "Commodity Type",
  Bonds: "Issuer / Type",
  REIT: "Property Type",
  "Real Estate": "Property Type",
  Savings: "Type",
  "Other Assets": "Asset Type",
  "All Holdings": "Asset Class",
};

/**
 * Group label for a holding, chosen per asset type. Imported data is often
 * empty or a literal placeholder ("-", "n/a"), so anything unusable collapses
 * into a single readable "Uncategorised" bucket instead of a stray dash.
 */
export function groupLabelFor(h: Holding, tab: AssetTab): string {
  let label: string | null = null;
  switch (tab) {
    case "Stocks":
      // Stocks group by market cap; sector shows as the row subtitle.
      label = firstUsable(h.market_cap);
      break;

    case "Mutual Funds":
      label = firstUsable(fundHouseFromName(h.name), h.type, h.segment);
      break;
    case "ETFs":
      label = firstUsable(h.sector, h.type, h.segment);
      break;
    case "Commodities":
    case "Savings":
    case "Other Assets":
    case "Real Estate":
    case "REIT":
    case "InvIT":
      label = firstUsable(h.type, h.sector, h.segment);
      break;
    case "Bonds":
      label = firstUsable(h.type, h.segment, h.sector);
      break;
    case "All Holdings":
      label = firstUsable(h.tab, h.segment);
      break;
    default:
      label = firstUsable(h.sector, h.segment, h.type);
  }
  return label ?? UNCATEGORISED;
}

export type HoldingGroup = {
  label: string;
  items: Holding[];
  invested: number;
  current: number;
  pct: number;
  currency: string;
};

/** Bucket already-filtered/sorted rows for the grouped view of a tab. */
export function buildHoldingGroups(rows: Holding[], tab: AssetTab): HoldingGroup[] {
  const m = new Map<string, Holding[]>();
  for (const r of rows) {
    const k = groupLabelFor(r, tab);
    const list = m.get(k);
    if (list) list.push(r);
    else m.set(k, [r]);
  }
  return [...m.entries()]
    .map(([label, items]) => {
      const invested = items.reduce((s, i) => s + i.invested, 0);
      const current = items.reduce((s, i) => s + i.current, 0);
      return {
        label,
        items,
        invested,
        current,
        pct: invested > 0 ? ((current - invested) / invested) * 100 : 0,
        currency: items[0]?.currency || "INR",
      };
    })
    // Biggest groups first; the catch-all bucket always sits last.
    .sort((a, b) =>
      a.label === UNCATEGORISED ? 1 : b.label === UNCATEGORISED ? -1 : b.current - a.current,
    );
}


function MobileHoldingGroups({
  rows,
  rowKey,
  isSelected,
  onSelectChange,
  onView,
  onEdit,
  onDelete,
  tab,
}: {
  rows: Holding[];
  rowKey: (h: Holding) => string;
  isSelected: (key: string) => boolean;
  onSelectChange: (key: string, v: boolean) => void;
  onView: (h: Holding) => void;
  onEdit: (h: Holding) => void;
  onDelete: (h: Holding) => void;
  tab: AssetTab;
}) {
  const { isOpen, toggle, setAll } = useCollapsibleGroups("assets-mobile-groups-v2", false);
  const [view, setView] = useState<"grouped" | "flat">(tab === "Crypto" ? "flat" : "grouped");
  useEffect(() => {
    if (tab === "Crypto") setView("flat");
  }, [tab]);

  const groups = useMemo(() => buildHoldingGroups(rows, tab), [rows, tab]);

  const allOpen = groups.length > 0 && groups.every((g) => isOpen(g.label));

  const row = (h: Holding, detailed: boolean) => {
    const key = rowKey(h);
    const rowUp = h.pnl >= 0;
    return (
      <div
        key={key}
        data-holding-id={h.id}
        className={`flex items-center gap-2 border-t border-border/40 px-3 py-3 ${
          isSelected(key) ? "bg-mint/[0.06]" : ""
        }`}
      >
        <SelectCheckbox
          label={`Select ${h.name}`}
          checked={isSelected(key)}
          onChange={(v) => onSelectChange(key, v)}
        />
        <button
          onClick={() => onView(h)}
          className="min-w-0 flex-1 text-left"
          aria-label={`View ${h.name}`}
        >
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-foreground">{h.name}</span>
            {h.txn_count && h.txn_count > 1 ? (
              <span className="shrink-0 rounded-full bg-mint/10 px-1.5 py-0.5 text-[10px] font-semibold text-mint">
                {h.txn_count}
              </span>
            ) : null}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {[h.symbol?.toUpperCase(), h.type].filter(Boolean).join(" · ")}
          </div>
          {detailed ? (
            <div className="mt-0.5 truncate text-[11px] tabular-nums text-muted-foreground">
              Qty {formatQty(h.quantity)} · Avg {priceIn(h.avg_price, h.currency)}
            </div>
          ) : null}
        </button>
        <div className="shrink-0 text-right">
          <div className="text-sm font-semibold tabular-nums text-foreground">
            {compactAmount(h.current, h.currency)}
          </div>
          <div
            className={`text-[11px] font-medium tabular-nums ${rowUp ? "text-emerald-500" : "text-rose-500"}`}
          >
            {rowUp ? "+" : ""}
            {h.pnl_pct.toFixed(2)}%
          </div>
          <div className="text-[10px] tabular-nums text-muted-foreground">
            {rowUp ? "+" : ""}
            {compactAmount(h.pnl, h.currency)}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label={`Actions for ${h.name}`}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onView(h)}>
              <Eye className="mr-2 h-4 w-4" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(h)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(h)}
              className="text-rose-500 focus:text-rose-500"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <div className="divide-y divide-border">
      {/* View toggle + expand/collapse */}
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
          {(["grouped", "flat"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                view === v ? "bg-mint text-[#04121C]" : "text-muted-foreground"
              }`}
            >
              {v === "grouped" ? "Grouped" : "List"}
            </button>
          ))}
        </div>
        {view === "grouped" ? (
          <button
            onClick={() => setAll(groups.map((g) => g.label), !allOpen)}
            className="text-[11px] font-semibold text-mint"
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        ) : (
          <span className="text-[11px] text-muted-foreground">{rows.length} holdings</span>
        )}
      </div>

      {view === "flat"
        ? rows.map((h) => row(h, true))
        : groups.map((g) => {
            const open = isOpen(g.label);
            const up = g.pct >= 0;
            return (
              <div key={g.label}>
                <button
                  onClick={() => toggle(g.label)}
                  className="flex w-full items-center gap-2 px-3 py-3 text-left"
                >
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`}
                  />
                  <span className="truncate text-sm font-semibold text-foreground">{g.label}</span>
                  <span className="shrink-0 rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {g.items.length}
                  </span>
                  <span className="ml-auto shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {compactAmount(g.current, g.currency)}
                  </span>
                  <span
                    className={`shrink-0 text-xs font-medium tabular-nums ${up ? "text-emerald-500" : "text-rose-500"}`}
                  >
                    {up ? "+" : ""}
                    {g.pct.toFixed(1)}%
                  </span>
                </button>

                {open ? g.items.map((h) => row(h, false)) : null}
              </div>
            );
          })}
    </div>
  );
}




/* =========================================================
   Table row (with hover-reveal actions, no layout shift)
========================================================= */
type RowLike = {
  name: string;
  symbol: string | null;
  segment: string;
  sector?: string | null;
  type?: string | null;
  market_cap?: string | null;

  quantity: number;
  avg_price: number;
  cmp: number;
  price_stale?: boolean;
  invested: number;
  current: number;
  pnl: number;
  pnl_pct: number;
  xirr_pct: number;
  currency: string;
  platform: string | null;
  txn_count?: number;
  raw_investment?: { maturity_date?: string | null } | null;
};


function HoldingRow({
  h,
  onView,
  onEdit,
  onDelete,
  selected,
  indeterminate,
  onSelectChange,
  holdingId,
  highlight,
  allocPct,
}: {
  h: RowLike;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  selected: boolean;
  indeterminate?: boolean;
  onSelectChange: (v: boolean) => void;
  holdingId?: string;
  highlight?: boolean;
  /** Share of the visible portfolio's current value, in percent. */
  allocPct?: number | null;
}) {

  const up = h.pnl >= 0;
  const xirrUp = h.xirr_pct >= 0;
  return (
    <tr
      data-holding-id={holdingId}
      className={`group border-b border-border/40 last:border-0 hover:bg-surface-2/30 ${
        selected ? "bg-mint/[0.06]" : ""
      } ${highlight ? "ring-1 ring-inset ring-mint/50" : ""}`}
    >
      <td className="w-[44px] px-3 py-3">
        <SelectCheckbox
          label={`Select ${h.name}`}
          checked={selected}
          indeterminate={!!indeterminate}
          onChange={onSelectChange}
        />
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-mint/10 text-xs font-bold text-mint">
            {h.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="truncate text-sm font-medium text-foreground">{h.name}</div>
              {h.raw_investment?.maturity_date ? (
                <span
                  title="Maturity date"
                  className="shrink-0 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
                >
                  Matures {formatDateShort(h.raw_investment.maturity_date)}
                </span>
              ) : null}
              {h.txn_count && h.txn_count > 1 ? (
                <span
                  title={`${h.txn_count} transactions`}
                  className="shrink-0 rounded-full bg-mint/10 px-1.5 py-0.5 text-[10px] font-semibold text-mint"
                >
                  {h.txn_count} txns
                </span>
              ) : null}
            </div>
            {(() => {
              // "TICKER · Market Cap · Sector · Type" — only the parts we know.
              const bits = [h.market_cap, h.sector, h.segment || h.type].filter(
                (b) => !!b && String(b).trim() !== "",
              ) as string[];
              if (!h.symbol && bits.length === 0) return null;
              return (
                <div className="truncate text-[11px] text-muted-foreground">
                  {h.symbol ? <span className="uppercase">{h.symbol}</span> : null}
                  {h.symbol && bits.length ? " · " : ""}
                  {bits.join(" · ")}
                </div>
              );
            })()}

          </div>

        </div>

      </td>
      {/* Segment column removed — it stays available via the Segment filter. */}

      <td className="px-3 py-3 text-right tabular-nums text-foreground">{formatQty(h.quantity)}</td>
      <td className="px-3 py-3 text-right tabular-nums text-foreground">
        {priceIn(h.avg_price, h.currency)}
      </td>
      <td className="px-3 py-3 text-right tabular-nums text-foreground">
        <span className="inline-flex items-center gap-1">
          {priceIn(h.cmp, h.currency)}
          {h.price_stale && (
            <span
              title="Live price unavailable — showing last known price"
              className="text-[10px] font-medium text-amber-500"
            >
              ⚠
            </span>
          )}
        </span>
      </td>
      <td className="px-3 py-3 text-right tabular-nums text-foreground">
        {amountIn(h.invested, h.currency)}
      </td>
      <td className="px-3 py-3 text-right tabular-nums font-medium text-foreground">
        {amountIn(h.current, h.currency)}
      </td>
      <td className="px-3 py-3 text-right tabular-nums">
        <div className={up ? "text-emerald-500" : "text-rose-500"}>
          <div>
            {up ? "+" : ""}
            {amountIn(h.pnl, h.currency)}
          </div>
          <div className="text-[10px]">
            ({up ? "+" : ""}
            {h.pnl_pct.toFixed(2)}%)
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-right tabular-nums">
        {h.xirr_pct ? (
          <span className={xirrUp ? "text-emerald-500" : "text-rose-500"}>
            {xirrUp ? "+" : ""}
            {h.xirr_pct.toFixed(2)}%
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-right tabular-nums text-foreground">
        {allocPct != null && Number.isFinite(allocPct) ? (
          `${allocPct.toFixed(2)}%`
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>

      {/* Platform column removed — it stays available via the Platform filter. */}
      <td className="w-[150px] px-3 py-3">
        <div className="flex items-center justify-end gap-1">
          <span className="flex items-center gap-1 opacity-100 transition-opacity duration-150 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
            {onView ? (
              <IconBtn label="View Details" onClick={onView}>
                <Eye className="h-3.5 w-3.5" />
              </IconBtn>
            ) : null}

            {onEdit ? (
              <IconBtn label="Edit" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </IconBtn>
            ) : null}
            {onDelete ? (
              <IconBtn label="Delete" onClick={onDelete} tone="rose">
                <Trash2 className="h-3.5 w-3.5" />
              </IconBtn>
            ) : null}
          </span>
        </div>
      </td>

    </tr>
  );
}


function IconBtn({
  children,
  onClick,
  label,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  tone?: "rose";
}) {
  const hover =
    tone === "rose"
      ? "hover:bg-rose-500/10 hover:text-rose-500"
      : "hover:bg-mint/10 hover:text-mint";
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`grid h-7 w-7 place-items-center rounded-md text-muted-foreground ${hover}`}
    >
      {children}
    </button>
  );
}

/* =========================================================
   Sort header
========================================================= */
function SortHeader({
  label,
  col,
  sortKey,
  sortDir,
  onClick,
  align,
}: {
  label: string;
  col: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onClick: (c: SortKey) => void;
  align: "left" | "right";
}) {
  const active = sortKey === col;
  const Arrow = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={`px-3 py-3 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        onClick={() => onClick(col)}
        className={`inline-flex items-center gap-1 transition-colors ${active ? "text-mint" : "text-muted-foreground hover:text-foreground"}`}
      >
        {label}
        <Arrow className="h-3 w-3" />
      </button>
    </th>
  );
}

/* =========================================================
   Filter dropdown
========================================================= */
function FilterMenu({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const display = value === "all" ? label : value;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs text-foreground hover:bg-surface-2/80">
          {display} <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-[280px] overflow-y-auto">
        <DropdownMenuItem onSelect={() => onChange("all")}>
          All {label.toLowerCase()}s
        </DropdownMenuItem>
        {options.map((o) => (
          <DropdownMenuItem key={o} onSelect={() => onChange(o)}>
            {o}
          </DropdownMenuItem>
        ))}
        {options.length === 0 && <DropdownMenuItem disabled>No options</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* =========================================================
   Simple asset detail modal (non-investment holdings)
========================================================= */
function AssetDetailsModal({
  holding,
  onClose,
  onEdit,
}: {
  holding: Holding;
  onClose: () => void;
  onEdit: () => void;
}) {
  const a = holding.raw_asset!;
  const up = holding.pnl >= 0;
  const ccy = holding.currency;
  return (
    <AlertDialog open onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{a.name}</AlertDialogTitle>
          <AlertDialogDescription>
            {a.category}
            {a.sub_category ? ` · ${a.sub_category}` : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MiniStat label="Current Value" value={amountIn(a.current_value, ccy)} />
          <MiniStat label="Invested" value={amountIn(holding.invested, ccy)} />
          <MiniStat
            label="P&L"
            value={`${up ? "+" : ""}${amountIn(holding.pnl, ccy)} (${up ? "+" : ""}${holding.pnl_pct.toFixed(2)}%)`}
            tone={up ? "text-emerald-500" : "text-rose-500"}
          />
          <MiniStat
            label="Quantity"
            value={a.quantity != null ? `${a.quantity}${a.unit ? " " + a.unit : ""}` : "—"}
          />
          <MiniStat label="Location" value={a.location || "—"} />
          <MiniStat label="Status" value={a.status || "—"} />
        </div>
        {a.notes ? (
          <div className="rounded-lg border border-border bg-surface-2/40 p-3 text-sm text-muted-foreground">
            {a.notes}
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction
            onClick={onEdit}
            className="bg-mint text-[#04121C] hover:brightness-110"
          >
            Edit Holding
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm font-bold ${tone ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}

/* =========================================================
   Helpers
========================================================= */
function uniqSorted(arr: string[]): string[] {
  return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
}

function formatQty(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : n.toLocaleString("en-IN", { maximumFractionDigits: 4 });
}
