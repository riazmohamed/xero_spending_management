import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { ReceiptOCRResult, MatchCandidate } from "./types.ts";
import { cachedXeroFetch } from "./xero-client.ts";

const AMOUNT_WEIGHT = 0.5;
const MERCHANT_WEIGHT = 0.3;
const DATE_WEIGHT = 0.2;
const HIGH_CONFIDENCE_THRESHOLD = 0.85;
const MAX_CANDIDATES = 5;

interface MatchResult {
  bestMatch: MatchCandidate | null;
  candidates: MatchCandidate[];
  confidence: number;
}

export async function matchReceipt(
  supabase: SupabaseClient,
  userId: string,
  receiptId: string,
  ocrResult: ReceiptOCRResult,
): Promise<MatchResult> {
  // Fetch unreconciled bank transactions from cache/Xero
  const txData = await cachedXeroFetch(
    userId,
    "/BankTransactions?where=IsReconciled==false&&Status==%22AUTHORISED%22&order=Date%20DESC",
    `transactions_${userId}_unreconciled`,
    300, // 5 min cache
  ) as { BankTransactions?: Array<Record<string, unknown>> };

  const transactions = txData?.BankTransactions || [];

  if (transactions.length === 0) {
    await supabase
      .from("receipts")
      .update({
        match_candidates: [],
        status: "extracted",
      })
      .eq("id", receiptId);

    return { bestMatch: null, candidates: [], confidence: 0 };
  }

  // Check merchant aliases for this user
  let aliasMap: Record<string, string> = {};
  if (ocrResult.merchant_name) {
    const { data: aliases } = await supabase
      .from("merchant_aliases")
      .select("receipt_merchant, xero_contact_name")
      .eq("user_id", userId);

    if (aliases) {
      aliasMap = Object.fromEntries(
        aliases.map((a: { receipt_merchant: string; xero_contact_name: string }) => [
          a.receipt_merchant.toLowerCase(),
          a.xero_contact_name.toLowerCase(),
        ]),
      );
    }
  }

  // Score each transaction
  const scored: MatchCandidate[] = transactions
    .map((tx) => {
      const amountScore = scoreAmount(
        ocrResult.total_amount,
        Math.abs(tx.Total as number),
      );
      const merchantScore = scoreMerchant(
        ocrResult.merchant_name,
        (tx.Contact as { Name: string })?.Name,
        aliasMap,
      );
      const dateScore = scoreDate(
        ocrResult.transaction_date,
        tx.DateString as string,
      );

      const totalScore =
        amountScore * AMOUNT_WEIGHT +
        merchantScore * MERCHANT_WEIGHT +
        dateScore * DATE_WEIGHT;

      return {
        transactionId: tx.BankTransactionID as string,
        contactName: (tx.Contact as { Name: string })?.Name || "Unknown",
        amount: tx.Total as number,
        date: tx.DateString as string,
        score: Math.round(totalScore * 10000) / 10000,
        type: tx.Type as "SPEND" | "RECEIVE",
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CANDIDATES);

  const bestMatch = scored.length > 0 ? scored[0] : null;
  const confidence = bestMatch?.score || 0;
  const newStatus = confidence >= HIGH_CONFIDENCE_THRESHOLD ? "matched" : "extracted";

  await supabase
    .from("receipts")
    .update({
      matched_transaction_id: bestMatch?.transactionId || null,
      match_confidence: confidence,
      match_candidates: scored,
      status: newStatus,
      matched_at: bestMatch ? new Date().toISOString() : null,
    })
    .eq("id", receiptId);

  return { bestMatch, candidates: scored, confidence };
}

function scoreAmount(
  receiptAmount: number | null,
  txAmount: number,
): number {
  if (receiptAmount === null || receiptAmount === 0) return 0.3;

  const diff = Math.abs(receiptAmount - txAmount);
  const ratio = diff / Math.max(receiptAmount, txAmount, 1);

  if (ratio === 0) return 1.0; // Exact match
  if (ratio <= 0.03) return 0.9; // Within 3% (rounding differences)
  if (ratio <= 0.10) return 0.7; // Within 10%
  if (ratio <= 0.30) return 0.5; // Within 30% (tips, adjustments)
  return 0.1;
}

function scoreMerchant(
  receiptMerchant: string | null,
  xeroContact: string | null,
  aliasMap: Record<string, string>,
): number {
  if (!receiptMerchant || !xeroContact) return 0.2;

  const normReceipt = receiptMerchant.toLowerCase().trim();
  const normContact = xeroContact.toLowerCase().trim();

  // Check alias map first
  const aliasedName = aliasMap[normReceipt];
  if (aliasedName && aliasedName === normContact) return 1.0;

  // Exact match
  if (normReceipt === normContact) return 1.0;

  // One contains the other
  if (normReceipt.includes(normContact) || normContact.includes(normReceipt)) {
    return 0.85;
  }

  // Word overlap score
  const receiptWords = new Set(normReceipt.split(/\s+/).filter((w) => w.length > 2));
  const contactWords = new Set(normContact.split(/\s+/).filter((w) => w.length > 2));

  if (receiptWords.size === 0 || contactWords.size === 0) return 0.2;

  let matches = 0;
  for (const word of receiptWords) {
    if (contactWords.has(word)) matches++;
  }

  const overlap = matches / Math.max(receiptWords.size, contactWords.size);
  if (overlap >= 0.5) return 0.7;
  if (overlap > 0) return 0.4;

  return 0.1;
}

function scoreDate(
  receiptDate: string | null,
  txDate: string | null,
): number {
  if (!receiptDate || !txDate) return 0.3;

  const rDate = new Date(receiptDate);
  const tDate = new Date(txDate);

  if (isNaN(rDate.getTime()) || isNaN(tDate.getTime())) return 0.3;

  const diffDays = Math.abs(
    (rDate.getTime() - tDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return 1.0;
  if (diffDays <= 1) return 0.9;
  if (diffDays <= 3) return 0.65;
  if (diffDays <= 7) return 0.4;
  if (diffDays <= 14) return 0.2;
  return 0.05;
}
