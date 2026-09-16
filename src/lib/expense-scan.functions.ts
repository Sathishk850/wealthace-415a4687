/**
 * Receipt / invoice OCR for the Expenses module.
 *
 * The browser sends a base64 data URL of the receipt (image or PDF); this
 * server function asks the Lovable AI gateway to extract the expense fields as
 * strict JSON and returns them together with a per-field confidence level.
 *
 * Privacy: the receipt bytes and the extracted financial values are never
 * logged. Only coarse failure reasons are surfaced.
 */

import { createServerFn } from "@tanstack/react-start";

export type Confidence = "high" | "medium" | "low" | "none";

export interface ScanLineItem {
  name: string | null;
  quantity: number | null;
  unit_price: number | null;
  tax: number | null;
  total: number | null;
}

export interface ScanFields {
  merchant: string | null;
  description: string | null;
  date: string | null; // YYYY-MM-DD
  amount: number | null;
  currency: string | null;
  tax_amount: number | null;
  discount: number | null;
  tip: number | null;
  payment_method: string | null;
  card_last4: string | null;
  invoice_number: string | null;
  category_hint: string | null;
  subcategory_hint: string | null;
  notes: string | null;
  location: string | null;
  multiple_totals: boolean;
  document_understood: boolean;
  line_items: ScanLineItem[];
}

export interface ScanResult {
  fields: ScanFields;
  confidence: Record<string, Confidence>;
  warnings: string[];
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "merchant",
    "description",
    "date",
    "amount",
    "currency",
    "tax_amount",
    "discount",
    "tip",
    "payment_method",
    "card_last4",
    "invoice_number",
    "category_hint",
    "subcategory_hint",
    "notes",
    "location",
    "multiple_totals",
    "document_understood",
    "line_items",
    "confidence",
  ],
  properties: {
    merchant: { type: ["string", "null"] },
    description: { type: ["string", "null"] },
    date: { type: ["string", "null"], description: "YYYY-MM-DD" },
    amount: { type: ["number", "null"], description: "grand total paid" },
    currency: { type: ["string", "null"], description: "ISO code e.g. INR" },
    tax_amount: { type: ["number", "null"] },
    discount: { type: ["number", "null"] },
    tip: { type: ["number", "null"] },
    payment_method: {
      type: ["string", "null"],
      description: "e.g. UPI, Credit Card, Debit Card, Cash, Wallet, Net Banking",
    },
    card_last4: { type: ["string", "null"] },
    invoice_number: { type: ["string", "null"] },
    category_hint: { type: ["string", "null"] },
    subcategory_hint: { type: ["string", "null"] },
    notes: { type: ["string", "null"] },
    location: { type: ["string", "null"] },
    multiple_totals: { type: "boolean" },
    document_understood: { type: "boolean" },
    line_items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "quantity", "unit_price", "tax", "total"],
        properties: {
          name: { type: ["string", "null"] },
          quantity: { type: ["number", "null"] },
          unit_price: { type: ["number", "null"] },
          tax: { type: ["number", "null"] },
          total: { type: ["number", "null"] },
        },
      },
    },
    confidence: {
      type: "object",
      additionalProperties: false,
      required: [
        "merchant",
        "date",
        "amount",
        "currency",
        "payment_method",
        "category_hint",
      ],
      properties: {
        merchant: { type: "string", enum: ["high", "medium", "low", "none"] },
        date: { type: "string", enum: ["high", "medium", "low", "none"] },
        amount: { type: "string", enum: ["high", "medium", "low", "none"] },
        currency: { type: "string", enum: ["high", "medium", "low", "none"] },
        payment_method: { type: "string", enum: ["high", "medium", "low", "none"] },
        category_hint: { type: "string", enum: ["high", "medium", "low", "none"] },
      },
    },
  },
} as const;

const PROMPT = [
  "You read receipts, invoices, bills and payment confirmations and return json.",
  "Extract only what is actually visible. Never invent a value: use null when unsure.",
  "amount is the final grand total actually paid, after discounts and including tax.",
  "Set multiple_totals true when several plausible totals appear (e.g. subtotal, total, amount due differ).",
  "Set document_understood false when the file is not a receipt/bill/invoice or is unreadable.",
  "date must be YYYY-MM-DD. currency must be an ISO code (default INR for Indian receipts with ₹/Rs).",
  "Rate your confidence per field honestly: high only when the value is clearly printed.",
].join(" ");

function parseDataUrl(dataUrl: string): { mime: string; base64: string } {
  const m = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl);
  if (!m) throw new Error("UNSUPPORTED_FILE");
  return { mime: m[1]!.toLowerCase(), base64: m[2]! };
}

export const scanReceipt = createServerFn({ method: "POST" })
  .inputValidator((input: { dataUrl: string; filename: string }) => {
    if (!input?.dataUrl || typeof input.dataUrl !== "string")
      throw new Error("UNSUPPORTED_FILE");
    return { dataUrl: input.dataUrl, filename: String(input.filename || "receipt") };
  })
  .handler(async ({ data }): Promise<ScanResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI_NOT_CONFIGURED");

    const { mime, base64 } = parseDataUrl(data.dataUrl);
    const isPdf = mime === "application/pdf";
    const isImage = mime.startsWith("image/");
    if (!isPdf && !isImage) throw new Error("UNSUPPORTED_FILE");

    const content = isPdf
      ? [
          { type: "input_text", text: PROMPT },
          {
            type: "input_file",
            filename: data.filename.endsWith(".pdf") ? data.filename : `${data.filename}.pdf`,
            file_data: `data:${mime};base64,${base64}`,
          },
        ]
      : [
          { type: "input_text", text: PROMPT },
          { type: "input_image", image_url: `data:${mime};base64,${base64}` },
        ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        input: [{ role: "user", content }],
        text: {
          format: {
            type: "json_schema",
            name: "receipt_extraction",
            strict: true,
            schema: SCHEMA,
          },
        },
      }),
    });

    if (!res.ok || !res.body) {
      const status = res.status;
      if (status === 402) throw new Error("AI_CREDITS");
      if (status === 429) throw new Error("AI_BUSY");
      throw new Error(`AI_FAILED_${status}`);
    }

    // Read the SSE stream and accumulate the output text deltas.
    let text = "";
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buf += decoder.decode(chunk.value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload);
          if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
            text += evt.delta;
          } else if (evt.type === "response.completed") {
            const out = evt.response?.output_text;
            if (typeof out === "string" && out && !text) text = out;
          }
        } catch {
          /* ignore keep-alive / partial frames */
        }
      }
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text.trim());
    } catch {
      throw new Error("UNREADABLE_DOCUMENT");
    }

    const num = (v: unknown): number | null =>
      typeof v === "number" && Number.isFinite(v) ? v : null;
    const str = (v: unknown): string | null =>
      typeof v === "string" && v.trim() ? v.trim() : null;
    const conf = (v: unknown): Confidence =>
      v === "high" || v === "medium" || v === "low" ? v : "none";

    const rawConf = (parsed["confidence"] ?? {}) as Record<string, unknown>;
    const items = Array.isArray(parsed["line_items"]) ? parsed["line_items"] : [];

    const fields: ScanFields = {
      merchant: str(parsed["merchant"]),
      description: str(parsed["description"]),
      date: str(parsed["date"]),
      amount: num(parsed["amount"]),
      currency: str(parsed["currency"]),
      tax_amount: num(parsed["tax_amount"]),
      discount: num(parsed["discount"]),
      tip: num(parsed["tip"]),
      payment_method: str(parsed["payment_method"]),
      card_last4: str(parsed["card_last4"]),
      invoice_number: str(parsed["invoice_number"]),
      category_hint: str(parsed["category_hint"]),
      subcategory_hint: str(parsed["subcategory_hint"]),
      notes: str(parsed["notes"]),
      location: str(parsed["location"]),
      multiple_totals: parsed["multiple_totals"] === true,
      document_understood: parsed["document_understood"] !== false,
      line_items: (items as Record<string, unknown>[]).slice(0, 50).map((it) => ({
        name: str(it["name"]),
        quantity: num(it["quantity"]),
        unit_price: num(it["unit_price"]),
        tax: num(it["tax"]),
        total: num(it["total"]),
      })),
    };

    const confidence: Record<string, Confidence> = {
      merchant: conf(rawConf["merchant"]),
      date: conf(rawConf["date"]),
      amount: conf(rawConf["amount"]),
      currency: conf(rawConf["currency"]),
      payment_method: conf(rawConf["payment_method"]),
      category_hint: conf(rawConf["category_hint"]),
    };

    const warnings: string[] = [];
    if (!fields.document_understood)
      warnings.push("This file doesn't look like a receipt or bill — please check it.");
    if (fields.amount == null) warnings.push("Amount could not be read.");
    else if (fields.multiple_totals)
      warnings.push("Multiple totals detected — please confirm the correct amount.");
    else if (confidence["amount"] === "low")
      warnings.push("Amount is unclear — please confirm it.");
    if (!fields.date) warnings.push("Date not found — today's date is suggested.");
    if (!fields.merchant) warnings.push("Merchant not found — please type it in.");

    return { fields, confidence, warnings };
  });
