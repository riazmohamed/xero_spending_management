import type { ReceiptOCRResult } from "./types.ts";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

const RECEIPT_SCHEMA = {
  type: "object",
  properties: {
    merchant_name: { type: ["string", "null"] },
    transaction_date: {
      type: ["string", "null"],
      description: "Date in ISO 8601 format (YYYY-MM-DD). Convert DD/MM/YYYY Australian dates to ISO.",
    },
    total_amount: { type: ["number", "null"] },
    subtotal: { type: ["number", "null"] },
    tax_amount: {
      type: ["number", "null"],
      description: "GST amount. In Australia, GST is 10% of the pre-tax amount.",
    },
    currency: {
      type: "string",
      description: "ISO currency code. Default to AUD for Australian receipts.",
    },
    payment_method: {
      type: ["string", "null"],
      description: "e.g. Cash, Visa, Mastercard, EFTPOS, etc.",
    },
    abn: {
      type: ["string", "null"],
      description: "Australian Business Number if visible on receipt.",
    },
    line_items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string" },
          quantity: { type: "number" },
          unit_price: { type: "number" },
          total: { type: "number" },
        },
        required: ["description", "quantity", "unit_price", "total"],
      },
    },
  },
  required: [
    "merchant_name",
    "transaction_date",
    "total_amount",
    "subtotal",
    "tax_amount",
    "currency",
    "payment_method",
    "abn",
    "line_items",
  ],
};

const SYSTEM_PROMPT = `You are a receipt OCR extraction assistant. Extract structured data from receipt images.

Key rules:
- Dates: Australian receipts use DD/MM/YYYY format. Convert to ISO 8601 (YYYY-MM-DD).
- Currency: Default to AUD unless another currency is clearly shown.
- GST: Australian GST is 10%. Look for "GST", "Tax", or "Includes GST" on the receipt.
- ABN: Look for an 11-digit Australian Business Number.
- Amounts: Extract as numbers without currency symbols. Use the final total including GST.
- Line items: Extract individual items with quantity, unit price, and line total.
- If a field is not visible or unclear, return null for that field.
- For line items, only include items you can clearly read. Return empty array if none are clear.`;

export async function extractReceiptData(
  imageBase64: string,
  mimeType: string,
): Promise<ReceiptOCRResult> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
            {
              type: "text",
              text: "Extract all structured data from this receipt image.",
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "receipt_extraction",
          strict: true,
          schema: RECEIPT_SCHEMA,
        },
      },
      max_tokens: 2000,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in OpenRouter response");
  }

  const parsed: ReceiptOCRResult = JSON.parse(content);

  // Ensure defaults
  return {
    merchant_name: parsed.merchant_name || null,
    transaction_date: parsed.transaction_date || null,
    total_amount: parsed.total_amount ?? null,
    subtotal: parsed.subtotal ?? null,
    tax_amount: parsed.tax_amount ?? null,
    currency: parsed.currency || "AUD",
    payment_method: parsed.payment_method || null,
    abn: parsed.abn || null,
    line_items: Array.isArray(parsed.line_items) ? parsed.line_items : [],
  };
}
