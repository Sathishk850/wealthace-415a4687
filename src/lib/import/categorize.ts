/**
 * Universal Import Engine — MERCHANT → CATEGORY CLASSIFIER.
 *
 * One shared, deterministic classifier used by both the Universal Import
 * Engine's transactions module and the legacy bank-statement importer. No ML,
 * no external API: a broad keyword/synonym taxonomy plus a small per-user
 * merchant→category correction map persisted in `import_category_rules`.
 *
 * Confidence tiers
 *  - "high"   → auto-apply (learned correction, or a distinctive brand/token hit)
 *  - "medium" → show as a suggestion in the preview, don't apply silently
 *  - "low"    → needs review (weak / generic signal only)
 */
import { supabase } from "@/integrations/supabase/client";

export type TxnKind = "income" | "expense";
export type CategoryConfidence = "high" | "medium" | "low" | "none";

export type CategoryGuess = {
  category: string | null;
  confidence: CategoryConfidence;
  /** Where the guess came from — useful for preview copy. */
  source: "learned" | "brand" | "keyword" | "weak" | "none";
  /** The token/phrase that produced the match. */
  matched?: string;
};

/**
 * `strong` terms are distinctive (brands, unambiguous phrases) → high confidence.
 * `keywords` are ordinary domain words → medium confidence.
 * `weak` terms are generic and often appear inside unrelated narrations → low.
 */
type CategoryRule = {
  name: string;
  kind: TxnKind;
  strong?: string[];
  keywords?: string[];
  weak?: string[];
};

/* ------------------------------------------------------------------ *
 * Taxonomy
 * ------------------------------------------------------------------ */

export const CATEGORY_TAXONOMY: CategoryRule[] = [
  /* ---------------- income ---------------- */
  {
    name: "Salary",
    kind: "income",
    strong: ["salary", "payroll", "sal cr", "salary credit", "monthly salary", "wages", "stipend", "arrears", "bonus payout"],
    keywords: ["ctc", "remuneration", "pay slip", "payslip", "employer", "compensation"],
  },
  {
    name: "Interest",
    kind: "income",
    strong: ["fd interest", "savings interest", "int pd", "int.pd", "interest credit", "interest paid", "rd interest", "sb int"],
    keywords: ["interest", "coupon", "accrued interest", "yield"],
  },
  {
    name: "Dividend",
    kind: "income",
    strong: ["dividend", "div payout", "final dividend", "interim dividend", "dvd", "idcw"],
    keywords: ["payout", "distribution"],
  },
  {
    name: "Refund",
    kind: "income",
    strong: ["refund", "reversal", "cashback", "chargeback", "reimbursement", "amount reversed", "failed txn reversal", "money returned"],
    keywords: ["credit note", "return", "settled back", "claim settled"],
  },
  {
    name: "Business Income",
    kind: "income",
    strong: ["invoice payment", "consulting fee", "professional fees", "freelance", "client payment", "retainer", "upwork", "fiverr", "stripe payout", "razorpay settlement", "paypal payout"],
    keywords: ["invoice", "settlement", "commission", "brokerage received", "royalty"],
  },
  {
    name: "Rental Income",
    kind: "income",
    strong: ["rent received", "rental income", "tenant", "lease rental", "house rent received"],
    keywords: ["rent credit", "maintenance received"],
  },
  {
    name: "Investment Proceeds",
    kind: "income",
    strong: ["redemption", "maturity proceeds", "sale proceeds", "mf redemption", "units redeemed", "fd maturity", "bond maturity"],
    keywords: ["proceeds", "matured", "sell", "exit load refund"],
  },
  {
    name: "Gift",
    kind: "income",
    strong: ["gift received", "shagun", "gift money"],
    keywords: ["gift", "present"],
  },

  /* ---------------- expenses ---------------- */
  {
    name: "Groceries",
    kind: "expense",
    strong: [
      "bigbasket", "big basket", "blinkit", "grofers", "zepto", "dmart", "d mart", "dunzo daily", "jiomart", "jio mart",
      "reliance fresh", "reliance smart", "more retail", "spencers", "star bazaar", "nature's basket", "licious",
      "fresh to home", "freshtohome", "country delight", "milk basket", "milkbasket", "amul parlour", "instamart",
      "kirana", "supermarket", "hypermarket", "provision store", "walmart", "costco", "tesco", "aldi", "kroger", "safeway", "whole foods",
    ],
    keywords: ["grocery", "groceries", "grocer", "vegetables", "fruits", "dairy", "supermart", "general store", "mart"],
  },
  {
    name: "Food & Dining",
    kind: "expense",
    strong: [
      "swiggy", "zomato", "eatsure", "faasos", "behrouz", "ovenstory", "dominos", "domino's", "pizza hut", "mcdonald",
      "burger king", "kfc", "subway", "starbucks", "cafe coffee day", "ccd", "chaayos", "chai point", "third wave coffee",
      "barbeque nation", "haldiram", "bikanervala", "wow momo", "biryani", "taco bell", "dunkin", "costa coffee",
      "uber eats", "ubereats", "doordash", "deliveroo", "grubhub", "just eat", "talabat", "noon food",
    ],
    keywords: ["restaurant", "resto", "cafe", "coffee", "bakery", "dine", "dining", "food court", "eatery", "canteen", "dhaba", "kitchen", "bistro", "pub", "bar & grill", "tiffin", "mess"],
    weak: ["hotel", "food"],
  },
  {
    name: "Transport",
    kind: "expense",
    strong: [
      "uber", "ola cabs", "olacabs", "rapido", "bluesmart", "blu smart", "meru", "lyft", "careem", "bolt ride",
      "irctc", "indian railway", "namma metro", "dmrc", "delhi metro", "bmtc", "msrtc", "ksrtc", "redbus", "abhibus",
      "fastag", "paytm fastag", "netc", "toll plaza", "parkzone", "park+", "parking",
      "hpcl", "iocl", "bpcl", "indian oil", "hp petrol", "bharat petroleum", "shell petrol", "nayara", "reliance petrol", "jio bp",
    ],
    keywords: ["petrol", "diesel", "fuel", "cab", "taxi", "auto rickshaw", "metro", "bus ticket", "toll", "ride", "commute", "charging station", "ev charge"],
  },
  {
    name: "Travel",
    kind: "expense",
    strong: [
      "makemytrip", "make my trip", "goibibo", "cleartrip", "yatra", "ixigo", "easemytrip", "booking.com", "agoda",
      "airbnb", "oyo rooms", "oyo", "treebo", "fabhotels", "trivago", "expedia", "skyscanner",
      "indigo", "air india", "vistara", "spicejet", "akasa air", "go first", "emirates", "qatar airways", "etihad", "lufthansa",
      "singapore airlines", "british airways", "visa fee", "passport seva",
    ],
    keywords: ["flight", "airline", "airfare", "air ticket", "hotel booking", "resort", "homestay", "holiday package", "tour", "travel", "boarding", "lodging", "baggage"],
  },
  {
    name: "Shopping",
    kind: "expense",
    strong: [
      "amazon", "amzn", "flipkart", "myntra", "ajio", "nykaa", "meesho", "snapdeal", "tatacliq", "tata cliq", "shopsy",
      "decathlon", "ikea", "pepperfry", "urban ladder", "westside", "lifestyle stores", "shoppers stop", "pantaloons",
      "max fashion", "zara", "h&m", "uniqlo", "levis", "puma", "adidas", "nike", "bata", "metro shoes", "titan",
      "tanishq", "caratlane", "lenskart", "croma", "reliance digital", "vijay sales", "apple store", "samsung shop",
      "ebay", "aliexpress", "shein", "temu", "etsy", "target", "best buy",
    ],
    keywords: ["shopping", "store", "retail", "boutique", "apparel", "clothing", "footwear", "electronics", "furniture", "jewellery", "jewelry", "cosmetics", "order"],
    weak: ["shop", "purchase", "mall"],
  },
  {
    name: "Bills & Utilities",
    kind: "expense",
    strong: [
      "electricity bill", "bescom", "msedcl", "tneb", "tangedco", "kseb", "adani electricity", "tata power", "torrent power",
      "bses", "cesc", "npdcl", "water bill", "jal board", "municipal water", "sewerage",
      "indane", "hp gas", "bharat gas", "gail gas", "mahanagar gas", "adani gas", "indraprastha gas", "piped gas",
      "airtel", "jio", "vodafone idea", "vi recharge", "bsnl", "mtnl", "act fibernet", "hathway", "excitel", "tikona",
      "tata sky", "tataplay", "tata play", "dish tv", "d2h", "sun direct", "bbps", "bharat billpay", "bill payment",
      "postpaid bill", "prepaid recharge", "mobile recharge",
    ],
    keywords: ["electricity", "utility", "broadband", "internet", "wifi", "landline", "dth", "cylinder", "lpg", "telecom", "recharge", "bill pay"],
    weak: ["bill", "gas", "water"],
  },
  {
    name: "Rent",
    kind: "expense",
    strong: ["house rent", "rent paid", "nobroker rent", "nobroker pay", "landlord", "monthly rent", "office rent", "lease rent", "pg rent", "hostel rent", "society maintenance", "flat maintenance"],
    keywords: ["rent", "tenancy", "brokerage rent", "maintenance charges"],
  },
  {
    name: "Entertainment",
    kind: "expense",
    strong: [
      "netflix", "prime video", "amazon prime", "hotstar", "disney+", "jiocinema", "jio cinema", "sonyliv", "sony liv",
      "zee5", "voot", "aha", "sun nxt", "spotify", "gaana", "wynk", "jiosaavn", "saavn", "apple music", "youtube premium",
      "bookmyshow", "book my show", "pvr", "inox", "cinepolis", "district by zomato", "ticketmaster",
      "steam games", "playstation", "xbox", "nintendo", "epic games", "google play games", "dream11", "mpl",
    ],
    keywords: ["movie", "cinema", "multiplex", "concert", "event ticket", "subscription", "ott", "gaming", "amusement", "theme park", "club entry"],
  },
  {
    name: "Health",
    kind: "expense",
    strong: [
      "apollo pharmacy", "apollo hospital", "medplus", "wellness forever", "netmeds", "1mg", "tata 1mg", "pharmeasy",
      "practo", "fortis", "manipal hospital", "max healthcare", "aiims", "narayana health", "cloudnine", "columbia asia",
      "dr lal pathlabs", "lal path", "srl diagnostics", "metropolis", "thyrocare", "healthians", "cult fit", "cultfit", "gym membership",
    ],
    keywords: ["pharmacy", "chemist", "medical", "medicine", "hospital", "clinic", "doctor", "dental", "diagnostic", "pathology", "lab test", "physio", "optician", "gym", "fitness", "yoga", "therapy", "vaccination"],
  },
  {
    name: "Insurance",
    kind: "expense",
    strong: [
      "lic of india", "lic premium", "hdfc life", "icici prudential", "icici pru", "sbi life", "max life", "bajaj allianz",
      "tata aia", "kotak life", "pnb metlife", "aditya birla sun life insurance", "star health", "niva bupa", "care health",
      "hdfc ergo", "icici lombard", "acko", "digit insurance", "new india assurance", "oriental insurance", "united india insurance",
      "policy premium", "premium paid", "renewal premium", "term plan premium", "motor insurance", "health insurance",
    ],
    keywords: ["insurance", "assurance", "policy no", "premium", "mediclaim"],
  },
  {
    name: "Investments",
    kind: "expense",
    strong: [
      "zerodha", "groww", "upstox", "angel one", "angelbroking", "icici direct", "hdfc securities", "kotak securities",
      "5paisa", "sharekhan", "motilal oswal", "iifl", "dhan", "fyers", "indmoney", "kuvera", "coin by zerodha",
      "cams", "kfintech", "karvy", "cdsl", "nsdl", "bse limited", "nse clearing", "mf purchase", "sip debit", "sip installment",
      "nps contribution", "ppf deposit", "sukanya samriddhi", "epf", "vpf", "gold bond", "sgb", "recurring deposit",
      "coinbase", "binance", "wazirx", "coindcx", "zebpay",
    ],
    keywords: ["sip", "mutual fund", "folio", "nav", "systematic investment", "demat", "trading", "equity purchase", "bond purchase", "invest"],
  },
  {
    name: "Loan / EMI",
    kind: "expense",
    strong: [
      "emi debit", "loan emi", "home loan emi", "car loan emi", "personal loan emi", "auto loan", "two wheeler loan",
      "education loan", "gold loan", "loan repayment", "principal repayment", "nach debit", "ecs debit", "ach debit",
      "bajaj finserv", "hdb financial", "tata capital", "l&t finance", "muthoot", "manappuram", "shriram finance",
      "credit card payment", "cc payment", "card bill payment",
    ],
    keywords: ["emi", "loan", "instalment", "installment", "nach", "ecs", "repayment", "overdraft", "mortgage"],
  },
  {
    name: "Education",
    kind: "expense",
    strong: [
      "school fee", "college fee", "tuition fee", "exam fee", "admission fee", "hostel fee", "byju", "unacademy",
      "vedantu", "physics wallah", "whitehat jr", "udemy", "coursera", "upgrad", "great learning", "simplilearn",
      "skillshare", "duolingo", "khan academy", "scaler", "newton school",
    ],
    keywords: ["school", "college", "university", "tuition", "coaching", "course", "training", "certification", "books", "stationery", "library"],
  },
  {
    name: "Cash Withdrawal",
    kind: "expense",
    strong: ["atm withdrawal", "cash withdrawal", "cash wdl", "atw", "nwd", "atm cash", "cash withdrawn", "self withdrawal", "atm-cash"],
    keywords: ["atm", "cash wdr", "withdrawal"],
  },
  {
    name: "Transfer",
    kind: "expense",
    strong: ["transfer to", "self transfer", "own account transfer", "fund transfer", "to own account", "sent to bank"],
    keywords: ["imps", "neft", "rtgs", "upi transfer", "p2a", "p2p", "transfer"],
  },
  {
    name: "Taxes & Fees",
    kind: "expense",
    strong: [
      "gst payment", "income tax", "advance tax", "self assessment tax", "tds deducted", "tcs", "professional tax",
      "property tax", "road tax", "stamp duty", "sms charges", "sms chrg", "annual maintenance charge", "amc charges",
      "service charge", "processing fee", "late fee", "penalty", "gst on", "convenience fee", "cheque return charge",
      "min balance charge", "atm decline charge",
    ],
    keywords: ["tax", "gst", "tds", "charges", "chrg", "fee", "levy", "surcharge", "commission charged"],
  },
  {
    name: "Personal Care",
    kind: "expense",
    strong: ["urban company", "urbanclap", "salon", "naturals salon", "lakme salon", "bodycraft", "spa", "barber", "beauty parlour"],
    keywords: ["grooming", "haircut", "cosmetic", "skincare", "massage", "wellness"],
  },
  {
    name: "Household",
    kind: "expense",
    strong: ["housekeeping", "maid salary", "domestic help", "cook salary", "driver salary", "plumber", "electrician", "carpenter", "pest control", "laundry", "dry clean", "urban company repair"],
    keywords: ["repair", "servicing", "maintenance", "cleaning", "appliance service"],
  },
  {
    name: "Gifts & Donations",
    kind: "expense",
    strong: ["donation", "temple donation", "ngo", "charity", "cry india", "goonj", "give india", "giveindia", "akshaya patra", "isckon", "zakat", "tithe", "gift card"],
    keywords: ["gift", "donate", "contribution", "offering", "seva"],
  },
  {
    name: "Pets",
    kind: "expense",
    strong: ["heads up for tails", "supertails", "petsy", "vet clinic", "veterinary", "pet food", "dog food", "cat food"],
    keywords: ["pet", "grooming pet", "kennel"],
  },
  {
    name: "Subscriptions",
    kind: "expense",
    strong: [
      "google one", "icloud storage", "apple icloud", "microsoft 365", "office 365", "adobe creative", "canva pro",
      "notion labs", "figma", "github", "openai", "chatgpt", "dropbox", "zoom.us", "slack", "linkedin premium",
    ],
    keywords: ["saas", "annual plan", "monthly plan", "membership fee", "auto renewal", "renewed"],
    weak: ["subscription"],
  },
];

/* ------------------------------------------------------------------ *
 * Normalisation
 * ------------------------------------------------------------------ */

const NARRATION_NOISE = [
  /\b(upi|imps|neft|rtgs|ach|nach|ecs|pos|vps|ecom|inb|mmt|tpt|ib|atm)\b/gi,
  /\b(ref|refno|rrn|txn|trn|utr|chq|cheque|no|id)\s*[:.#-]?\s*\w*\d{4,}\w*/gi,
  /\b\d{6,}\b/g,
  /@[a-z0-9.\-_]+/gi, // UPI handles
  /\b[a-z0-9._-]+@(okhdfcbank|oksbi|okicici|okaxis|ybl|paytm|apl|ibl|axl)\b/gi,
];

/** Lowercased, noise-stripped form of a narration used for keyword matching. */
export function normalizeNarration(raw: string): string {
  let s = String(raw ?? "").toLowerCase();
  for (const re of NARRATION_NOISE) s = s.replace(re, " ");
  return s.replace(/[^a-z0-9&+.'\s/-]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Stable key for the learned-corrections map. Collapses references, digits and
 * punctuation so "SWIGGY*ORDER 8891" and "swiggy order" share one key.
 */
export function merchantKey(raw: string): string {
  const cleaned = normalizeNarration(raw)
    .replace(/\b(order|payment|paid|pay|purchase|txn|transaction|bill|recharge|to|from|via|for)\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.split(" ").slice(0, 4).join(" ").slice(0, 64);
}

function hasTerm(haystack: string, term: string): boolean {
  if (term.includes(" ") || /[^a-z0-9]/.test(term)) return haystack.includes(term);
  // Single word → require a word boundary so "vi" doesn't match "video".
  return new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(haystack);
}

/* ------------------------------------------------------------------ *
 * Classification
 * ------------------------------------------------------------------ */

export type CorrectionMap = Map<string, string>;

function correctionLookupKey(key: string, kind: TxnKind) {
  return `${kind}|${key}`;
}

/**
 * Classify a merchant/narration into a category name.
 * Learned user corrections always win (high confidence).
 */
export function classifyCategory(
  rawText: string,
  kind: TxnKind,
  corrections?: CorrectionMap,
): CategoryGuess {
  const text = normalizeNarration(rawText);
  if (!text) return { category: null, confidence: "none", source: "none" };

  if (corrections && corrections.size) {
    const key = merchantKey(rawText);
    const learned = corrections.get(correctionLookupKey(key, kind));
    if (learned) return { category: learned, confidence: "high", source: "learned", matched: key };
    // Also try progressively shorter prefixes of the key (broker/merchant roots).
    const parts = key.split(" ");
    for (let n = parts.length - 1; n >= 1; n--) {
      const hit = corrections.get(correctionLookupKey(parts.slice(0, n).join(" "), kind));
      if (hit) return { category: hit, confidence: "high", source: "learned", matched: parts.slice(0, n).join(" ") };
    }
  }

  const rules = CATEGORY_TAXONOMY.filter((r) => r.kind === kind);

  for (const r of rules) {
    for (const term of r.strong ?? []) {
      if (hasTerm(text, term)) return { category: r.name, confidence: "high", source: "brand", matched: term };
    }
  }
  for (const r of rules) {
    for (const term of r.keywords ?? []) {
      if (hasTerm(text, term)) return { category: r.name, confidence: "medium", source: "keyword", matched: term };
    }
  }
  for (const r of rules) {
    for (const term of r.weak ?? []) {
      if (hasTerm(text, term)) return { category: r.name, confidence: "low", source: "weak", matched: term };
    }
  }

  return { category: null, confidence: "none", source: "none" };
}

/** All category names known to the classifier, for pickers. */
export function knownCategoryNames(kind?: TxnKind): string[] {
  return Array.from(
    new Set(CATEGORY_TAXONOMY.filter((r) => !kind || r.kind === kind).map((r) => r.name)),
  ).sort();
}

/* ------------------------------------------------------------------ *
 * Per-user learned corrections (persisted, synced across devices)
 * ------------------------------------------------------------------ */

/** Load the signed-in user's merchant→category corrections. Never throws. */
export async function loadCategoryCorrections(): Promise<CorrectionMap> {
  const map: CorrectionMap = new Map();
  try {
    const { data, error } = await supabase
      .from("import_category_rules")
      .select("merchant_key,kind,category")
      .order("hits", { ascending: false })
      .limit(2000);
    if (error || !data) return map;
    for (const r of data as { merchant_key: string; kind: string; category: string }[]) {
      const kind = r.kind === "income" ? "income" : "expense";
      map.set(correctionLookupKey(r.merchant_key, kind), r.category);
    }
  } catch {
    /* offline / signed out — classification simply falls back to keywords */
  }
  return map;
}

export type CategoryCorrection = { merchant: string; kind: TxnKind; category: string };

/**
 * Remember the categories a user confirmed for these merchants so future
 * imports classify them with high confidence. Never throws.
 */
export async function saveCategoryCorrections(corrections: CategoryCorrection[]): Promise<number> {
  const deduped = new Map<string, { merchant_key: string; kind: TxnKind; category: string }>();
  for (const c of corrections) {
    const key = merchantKey(c.merchant);
    const category = String(c.category ?? "").trim();
    if (!key || !category) continue;
    deduped.set(correctionLookupKey(key, c.kind), { merchant_key: key, kind: c.kind, category });
  }
  if (!deduped.size) return 0;

  try {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return 0;
    const rows = [...deduped.values()].map((r) => ({ ...r, user_id: userId, hits: 1 }));
    const { error } = await supabase
      .from("import_category_rules")
      .upsert(rows, { onConflict: "user_id,merchant_key,kind" });
    if (error) return 0;
    return rows.length;
  } catch {
    return 0;
  }
}
