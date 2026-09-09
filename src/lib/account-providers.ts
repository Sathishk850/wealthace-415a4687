// Comprehensive provider directory for accounts (banks, card issuers,
// wallets/UPI apps and brokers). Grouped for display, alias-aware for search.

export type ProviderKind = "bank" | "card" | "wallet" | "broker" | "any";

export type ProviderGroup =
  | "Public Sector"
  | "Private Sector"
  | "Small Finance / Payments"
  | "International / Foreign"
  | "Card Issuers"
  | "Wallets / UPI"
  | "Brokers"
  | "Other / Custom";

export type ProviderEntry = {
  name: string;
  group: ProviderGroup;
  kinds: ProviderKind[];
  aliases?: string[];
};

const b = (
  name: string,
  group: ProviderGroup,
  aliases?: string[],
  kinds: ProviderKind[] = ["bank", "card"],
): ProviderEntry => ({ name, group, aliases, kinds });

/* ---------- India: Public Sector Banks ---------- */
const PUBLIC_SECTOR: ProviderEntry[] = [
  b("State Bank of India", "Public Sector", ["SBI", "State Bank"]),
  b("Punjab National Bank", "Public Sector", ["PNB"]),
  b("Bank of Baroda", "Public Sector", ["BOB", "Baroda"]),
  b("Canara Bank", "Public Sector", ["Canara"]),
  b("Union Bank of India", "Public Sector", ["UBI", "Union Bank"]),
  b("Bank of India", "Public Sector", ["BOI"]),
  b("Indian Bank", "Public Sector"),
  b("Central Bank of India", "Public Sector", ["CBI", "Central Bank"]),
  b("Indian Overseas Bank", "Public Sector", ["IOB"]),
  b("UCO Bank", "Public Sector", ["UCO"]),
  b("Bank of Maharashtra", "Public Sector", ["BOM", "Mahabank"]),
  b("Punjab & Sind Bank", "Public Sector", ["PSB", "Punjab and Sind"]),
];

/* ---------- India: Private Sector Banks ---------- */
const PRIVATE_SECTOR: ProviderEntry[] = [
  b("HDFC Bank", "Private Sector", ["HDFC"]),
  b("ICICI Bank", "Private Sector", ["ICICI"]),
  b("Axis Bank", "Private Sector", ["Axis", "UTI Bank"]),
  b("Kotak Mahindra Bank", "Private Sector", ["Kotak", "KMB"]),
  b("IndusInd Bank", "Private Sector", ["IndusInd"]),
  b("Yes Bank", "Private Sector", ["Yes"]),
  b("IDFC FIRST Bank", "Private Sector", ["IDFC", "IDFC First"]),
  b("Federal Bank", "Private Sector", ["Federal"]),
  b("RBL Bank", "Private Sector", ["RBL", "Ratnakar"]),
  b("Bandhan Bank", "Private Sector", ["Bandhan"]),
  b("South Indian Bank", "Private Sector", ["SIB"]),
  b("City Union Bank", "Private Sector", ["CUB"]),
  b("Karnataka Bank", "Private Sector", ["KBL"]),
  b("Karur Vysya Bank", "Private Sector", ["KVB"]),
  b("DCB Bank", "Private Sector", ["DCB", "Development Credit Bank"]),
  b("Tamilnad Mercantile Bank", "Private Sector", ["TMB"]),
  b("CSB Bank", "Private Sector", ["CSB", "Catholic Syrian Bank"]),
  b("Dhanlaxmi Bank", "Private Sector", ["Dhanlaxmi", "Dhanalakshmi"]),
  b("Jammu & Kashmir Bank", "Private Sector", ["J&K Bank", "JK Bank"]),
  b("Nainital Bank", "Private Sector", ["Nainital"]),
  b("IDBI Bank", "Private Sector", ["IDBI"]),
];

/* ---------- Small Finance / Payments Banks ---------- */
const SMALL_FINANCE: ProviderEntry[] = [
  b("AU Small Finance Bank", "Small Finance / Payments", ["AU Bank", "AU SFB"]),
  b("Ujjivan Small Finance Bank", "Small Finance / Payments", ["Ujjivan"]),
  b("Equitas Small Finance Bank", "Small Finance / Payments", ["Equitas"]),
  b("Jana Small Finance Bank", "Small Finance / Payments", ["Jana"]),
  b("Suryoday Small Finance Bank", "Small Finance / Payments", ["Suryoday"]),
  b("Utkarsh Small Finance Bank", "Small Finance / Payments", ["Utkarsh"]),
  b("ESAF Small Finance Bank", "Small Finance / Payments", ["ESAF"]),
  b("Fincare Small Finance Bank", "Small Finance / Payments", ["Fincare"]),
  b("Airtel Payments Bank", "Small Finance / Payments", ["Airtel"], ["bank", "wallet"]),
  b("India Post Payments Bank", "Small Finance / Payments", ["IPPB", "Post Office"]),
  b("Fino Payments Bank", "Small Finance / Payments", ["Fino"]),
  b("NSDL Payments Bank", "Small Finance / Payments", ["NSDL"]),
  b("Paytm Payments Bank", "Small Finance / Payments", ["Paytm Bank"], ["bank", "wallet"]),
];

/* ---------- International / Foreign banks in India ---------- */
const INTERNATIONAL: ProviderEntry[] = [
  b("HSBC", "International / Foreign", ["Hongkong and Shanghai Banking"]),
  b("Citibank", "International / Foreign", ["Citi"]),
  b("Standard Chartered", "International / Foreign", ["SCB", "StanChart"]),
  b("Deutsche Bank", "International / Foreign", ["Deutsche"]),
  b("Barclays", "International / Foreign"),
  b("Bank of America", "International / Foreign", ["BofA", "BAC"]),
  b("JPMorgan Chase", "International / Foreign", ["JP Morgan", "Chase"]),
  b("DBS Bank", "International / Foreign", ["DBS", "Digibank"]),
  b("BNP Paribas", "International / Foreign", ["BNP"]),
  b("Bank of Bahrain and Kuwait", "International / Foreign", ["BBK"]),
  b("Bank of Ceylon", "International / Foreign"),
  b("Bank of Nova Scotia", "International / Foreign", ["Scotiabank"]),
  b("Doha Bank", "International / Foreign", ["Doha"]),
  b("Emirates NBD", "International / Foreign", ["NBD"]),
  b("First Abu Dhabi Bank", "International / Foreign", ["FAB"]),
  b("Mizuho Bank", "International / Foreign", ["Mizuho"]),
  b("MUFG Bank", "International / Foreign", ["MUFG", "Mitsubishi UFJ"]),
  b("Qatar National Bank", "International / Foreign", ["QNB"]),
  b("Société Générale", "International / Foreign", ["Societe Generale", "SocGen"]),
  b("Sumitomo Mitsui Banking Corporation", "International / Foreign", ["SMBC", "Sumitomo"]),
  b("UBS", "International / Foreign"),
  b("Wells Fargo", "International / Foreign", ["Wells"]),
];

/* ---------- Card-only issuers ---------- */
const CARD_ISSUERS: ProviderEntry[] = [
  { name: "American Express", group: "Card Issuers", kinds: ["card"], aliases: ["Amex"] },
  { name: "SBI Card", group: "Card Issuers", kinds: ["card"], aliases: ["SBI Cards"] },
  { name: "OneCard", group: "Card Issuers", kinds: ["card"], aliases: ["One Card"] },
  { name: "Bajaj Finserv", group: "Card Issuers", kinds: ["card"], aliases: ["Bajaj"] },
  { name: "AU Bank Card", group: "Card Issuers", kinds: ["card"] },
  { name: "Slice", group: "Card Issuers", kinds: ["card"] },
];

/* ---------- Wallets / UPI apps ---------- */
const WALLETS: ProviderEntry[] = [
  { name: "Paytm", group: "Wallets / UPI", kinds: ["wallet"] },
  { name: "PhonePe", group: "Wallets / UPI", kinds: ["wallet"], aliases: ["Phone Pe"] },
  { name: "Google Pay", group: "Wallets / UPI", kinds: ["wallet"], aliases: ["GPay", "Tez"] },
  { name: "Amazon Pay", group: "Wallets / UPI", kinds: ["wallet"] },
  { name: "MobiKwik", group: "Wallets / UPI", kinds: ["wallet"] },
  { name: "Freecharge", group: "Wallets / UPI", kinds: ["wallet"] },
  { name: "BHIM UPI", group: "Wallets / UPI", kinds: ["wallet"], aliases: ["BHIM", "UPI"] },
  { name: "Cred", group: "Wallets / UPI", kinds: ["wallet"] },
  { name: "Jupiter", group: "Wallets / UPI", kinds: ["wallet"] },
  { name: "Slice UPI", group: "Wallets / UPI", kinds: ["wallet"] },
  { name: "WhatsApp Pay", group: "Wallets / UPI", kinds: ["wallet"] },
  { name: "Ola Money", group: "Wallets / UPI", kinds: ["wallet"] },
];

/* ---------- Brokers / Demat ---------- */
const BROKERS: ProviderEntry[] = [
  { name: "Zerodha", group: "Brokers", kinds: ["broker"], aliases: ["Kite"] },
  { name: "Groww", group: "Brokers", kinds: ["broker"] },
  { name: "Upstox", group: "Brokers", kinds: ["broker"], aliases: ["RKSV"] },
  { name: "Angel One", group: "Brokers", kinds: ["broker"], aliases: ["Angel Broking"] },
  { name: "ICICI Direct", group: "Brokers", kinds: ["broker"], aliases: ["ICICIdirect"] },
  { name: "HDFC Securities", group: "Brokers", kinds: ["broker"], aliases: ["HDFC Sec"] },
  { name: "Kotak Securities", group: "Brokers", kinds: ["broker"] },
  { name: "Axis Direct", group: "Brokers", kinds: ["broker"] },
  { name: "SBI Securities", group: "Brokers", kinds: ["broker"] },
  { name: "Motilal Oswal", group: "Brokers", kinds: ["broker"] },
  { name: "Sharekhan", group: "Brokers", kinds: ["broker"] },
  { name: "5paisa", group: "Brokers", kinds: ["broker"], aliases: ["Five Paisa"] },
  { name: "Dhan", group: "Brokers", kinds: ["broker"] },
  { name: "Fyers", group: "Brokers", kinds: ["broker"] },
  { name: "Paytm Money", group: "Brokers", kinds: ["broker"] },
  { name: "INDmoney", group: "Brokers", kinds: ["broker"], aliases: ["IND money"] },
  { name: "Interactive Brokers", group: "Brokers", kinds: ["broker"], aliases: ["IBKR"] },
  { name: "Vested", group: "Brokers", kinds: ["broker"] },
  { name: "IIFL Securities", group: "Brokers", kinds: ["broker"], aliases: ["IIFL"] },
  { name: "Nuvama", group: "Brokers", kinds: ["broker"], aliases: ["Edelweiss"] },
  { name: "CDSL", group: "Brokers", kinds: ["broker"] },
  { name: "NSDL Demat", group: "Brokers", kinds: ["broker"] },
];

export const PROVIDERS: ProviderEntry[] = [
  ...PUBLIC_SECTOR,
  ...PRIVATE_SECTOR,
  ...SMALL_FINANCE,
  ...INTERNATIONAL,
  ...CARD_ISSUERS,
  ...WALLETS,
  ...BROKERS,
];

export const GROUP_ORDER: ProviderGroup[] = [
  "Public Sector",
  "Private Sector",
  "Small Finance / Payments",
  "International / Foreign",
  "Card Issuers",
  "Wallets / UPI",
  "Brokers",
  "Other / Custom",
];

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function matches(e: ProviderEntry, q: string) {
  const hay = [e.name, ...(e.aliases ?? [])].map(norm);
  return hay.some((h) => h.includes(q) || h.split(" ").some((w) => w.startsWith(q)));
}

/** Providers relevant to a field, optionally filtered by a search query. */
export function searchProviders(query: string, kind: ProviderKind = "any"): ProviderEntry[] {
  const pool =
    kind === "any" ? PROVIDERS : PROVIDERS.filter((p) => p.kinds.includes(kind));
  const q = norm(query);
  if (!q) return pool;
  return pool.filter((p) => matches(p, q));
}

/** Providers grouped for display, in canonical group order. */
export function groupedProviders(
  query: string,
  kind: ProviderKind = "any",
): { group: ProviderGroup; items: ProviderEntry[] }[] {
  const found = searchProviders(query, kind);
  return GROUP_ORDER.map((group) => ({
    group,
    items: found.filter((p) => p.group === group),
  })).filter((g) => g.items.length > 0);
}
