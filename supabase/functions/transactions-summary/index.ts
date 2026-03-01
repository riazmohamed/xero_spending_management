import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { extractSession } from "../_shared/token-manager.ts";
import { cachedXeroFetch } from "../_shared/xero-client.ts";
import type {
  XeroBankTransaction,
  XeroBankStatementsResponse,
  XeroStatementLine,
} from "../_shared/types.ts";

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  if (req.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const session = await extractSession(req);

    // Calculate date range (last 12 months)
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 12);
    const fromStr = fromDate.toISOString().split("T")[0];
    const toStr = toDate.toISOString().split("T")[0];

    // Get bank accounts
    const accountsData = (await cachedXeroFetch(
      session.userId,
      '/Accounts?where=Type=="BANK"&Status=="ACTIVE"',
      `bank_accounts_${session.userId}`,
      3600,
    )) as { Accounts: Array<{ AccountID: string; Name: string }> };

    const bankAccounts = accountsData.Accounts || [];

    // Fetch statement lines from Finance API for all bank accounts
    let totalStatementLines = 0;
    let totalSpend = 0;
    let totalReceive = 0;
    let currencyCode = "GBP";

    for (const account of bankAccounts) {
      try {
        const endpoint =
          `/finance/BankStatementsPlus/statements?BankAccountID=${account.AccountID}&FromDate=${fromStr}&ToDate=${toStr}&SummaryOnly=false`;
        const cacheKey = `stmtlines_${session.userId}_${account.AccountID}`;

        const data = (await cachedXeroFetch(
          session.userId,
          endpoint,
          cacheKey,
          300,
        )) as XeroBankStatementsResponse;

        if (data.bankAccountCurrencyCode) {
          currencyCode = data.bankAccountCurrencyCode;
        }

        for (const stmt of data.statements || []) {
          for (const line of stmt.statementLines || []) {
            if (!line.isReconciled && !line.isDeleted) {
              totalStatementLines++;
              if (line.amount < 0) {
                totalSpend += Math.abs(line.amount);
              } else {
                totalReceive += line.amount;
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error fetching statement lines for ${account.Name}:`, err);
      }
    }

    // Also get unreconciled BankTransactions for attachment/categorization stats
    const where = 'IsReconciled==false AND Status=="AUTHORISED"';
    const txEndpoint = `/BankTransactions?where=${encodeURIComponent(where)}&page=1`;
    const txCacheKey = `summary_tx_${session.userId}`;

    const txData = (await cachedXeroFetch(
      session.userId,
      txEndpoint,
      txCacheKey,
      300,
    )) as { BankTransactions: XeroBankTransaction[] };

    const transactions = txData.BankTransactions || [];
    const withAttachments = transactions.filter((t) => t.HasAttachments).length;
    const categorized = transactions.filter((t) =>
      t.LineItems?.every(
        (li) => li.AccountCode && li.AccountCode !== "",
      ),
    ).length;
    const ready = transactions.filter(
      (t) =>
        t.HasAttachments &&
        t.LineItems?.every((li) => li.AccountCode && li.AccountCode !== ""),
    ).length;

    return jsonResponse({
      totalCount: totalStatementLines,
      bankTransactionCount: transactions.length,
      withAttachments,
      categorized,
      ready,
      totalSpend,
      totalReceive,
      currency: currencyCode,
    });
  } catch (err) {
    console.error("Summary error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal error",
      500,
    );
  }
});
