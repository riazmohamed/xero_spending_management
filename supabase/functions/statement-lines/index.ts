import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { extractSession } from "../_shared/token-manager.ts";
import { xeroFetch, cachedXeroFetch } from "../_shared/xero-client.ts";
import type {
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
    const url = new URL(req.url);
    const bankAccountId = url.searchParams.get("bankAccountId");

    // Calculate date range (last 12 months, the max allowed)
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 12);

    const fromStr = fromDate.toISOString().split("T")[0];
    const toStr = toDate.toISOString().split("T")[0];

    if (bankAccountId) {
      // Fetch statement lines for a specific bank account
      const endpoint =
        `/finance/BankStatementsPlus/statements?BankAccountID=${bankAccountId}&FromDate=${fromStr}&ToDate=${toStr}&SummaryOnly=false`;
      const cacheKey = `stmtlines_${session.userId}_${bankAccountId}`;

      const data = (await cachedXeroFetch(
        session.userId,
        endpoint,
        cacheKey,
        300,
      )) as XeroBankStatementsResponse;

      // Extract all unreconciled statement lines
      const allLines: (XeroStatementLine & {
        bankAccountId: string;
        bankAccountName: string;
        currencyCode: string;
      })[] = [];

      for (const stmt of data.statements || []) {
        for (const line of stmt.statementLines || []) {
          if (!line.isReconciled && !line.isDeleted) {
            allLines.push({
              ...line,
              bankAccountId: data.bankAccountId,
              bankAccountName: data.bankAccountName,
              currencyCode: data.bankAccountCurrencyCode,
            });
          }
        }
      }

      // Sort by date descending
      allLines.sort(
        (a, b) =>
          new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime(),
      );

      return jsonResponse({
        statementLines: allLines,
        totalCount: allLines.length,
        bankAccountName: data.bankAccountName,
        currencyCode: data.bankAccountCurrencyCode,
      });
    }

    // No bankAccountId specified: get all bank accounts, then fetch statement lines for each
    const accountsCacheKey = `bank_accounts_${session.userId}`;
    const accountsData = (await cachedXeroFetch(
      session.userId,
      '/Accounts?where=Type=="BANK"&Status=="ACTIVE"',
      accountsCacheKey,
      3600,
    )) as { Accounts: Array<{ AccountID: string; Name: string; Code: string }> };

    const bankAccounts = accountsData.Accounts || [];
    const allLines: (XeroStatementLine & {
      bankAccountId: string;
      bankAccountName: string;
      currencyCode: string;
    })[] = [];

    const bankAccountSummaries: Array<{
      accountId: string;
      accountName: string;
      unreconciledCount: number;
    }> = [];

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

        let accountUnreconciled = 0;
        for (const stmt of data.statements || []) {
          for (const line of stmt.statementLines || []) {
            if (!line.isReconciled && !line.isDeleted) {
              allLines.push({
                ...line,
                bankAccountId: account.AccountID,
                bankAccountName: data.bankAccountName || account.Name,
                currencyCode: data.bankAccountCurrencyCode || "GBP",
              });
              accountUnreconciled++;
            }
          }
        }

        bankAccountSummaries.push({
          accountId: account.AccountID,
          accountName: data.bankAccountName || account.Name,
          unreconciledCount: accountUnreconciled,
        });
      } catch (err) {
        console.error(
          `Error fetching statement lines for ${account.Name}:`,
          err,
        );
        bankAccountSummaries.push({
          accountId: account.AccountID,
          accountName: account.Name,
          unreconciledCount: 0,
        });
      }
    }

    // Sort all lines by date descending
    allLines.sort(
      (a, b) =>
        new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime(),
    );

    return jsonResponse({
      statementLines: allLines,
      totalCount: allLines.length,
      bankAccounts: bankAccountSummaries,
    });
  } catch (err) {
    console.error("Statement lines error:", err);
    if (err instanceof Error && err.message === "XERO_RATE_LIMITED") {
      return errorResponse("Rate limited by Xero. Please wait a moment.", 429);
    }
    return errorResponse(
      err instanceof Error ? err.message : "Internal error",
      500,
    );
  }
});
