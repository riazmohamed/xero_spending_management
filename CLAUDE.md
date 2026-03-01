# Xero Spending Management

Reconciliation preparation tool for Xero. Captures receipts via camera/files, runs OCR to extract merchant/amount/GST, auto-matches to bank transactions, and uploads to Xero so web reconciliation becomes one-click "OK" confirmations.

## Project Structure

```
apps/mobile/                         # Expo SDK 54 / React Native mobile app
  app/                               # Expo Router file-based routing
    _layout.tsx                      # Root layout (providers, theme)
    (auth)/login.tsx                 # OAuth login screen
    (app)/                           # Protected app routes (bottom tabs)
      _layout.tsx                    # Bottom tab navigator
      dashboard.tsx                  # Spending summary + recent receipts
      capture.tsx                    # Receipt capture → OCR → match → confirm
      settings.tsx                   # Connection management
      receipts/                      # Receipt OCR pipeline screens
        index.tsx                    # Receipt list with status filter tabs
        [id].tsx                     # Receipt detail + match candidates
      transactions/                  # Transaction list + detail
        index.tsx                    # Searchable transaction list
        [id].tsx                     # Detail + categorization
  components/                        # Reusable UI components (one per file)
  hooks/                             # useAuth, useTransactions (+ receipt hooks)
  services/                          # API client, OAuth flow, image compressor
  stores/                            # Zustand auth store
  types/                             # TypeScript interfaces

supabase/                            # Backend
  functions/                         # Deno Edge Functions
    _shared/                         # Shared utilities
      cors.ts                        # CORS headers + response helpers
      token-manager.ts               # JWT + Xero token auto-refresh
      xero-client.ts                 # xeroFetch + cachedXeroFetch
      types.ts                       # Backend TypeScript interfaces
      openrouter.ts                  # Gemini 2.5 Flash OCR extraction
      receipt-matcher.ts             # Weighted transaction matching engine
    auth-token/                      # PKCE OAuth code exchange
    auth-refresh/                    # Token refresh
    auth-logout/                     # Logout + cleanup
    transactions/                    # Fetch Xero bank transactions
    transactions-update/             # Update line items
    transactions-summary/            # Dashboard aggregation
    accounts/                        # List Xero bank accounts
    statement-lines/                 # Raw bank statement lines
    attachments-upload/              # Direct Xero attachment upload
    attachments-list/                # List transaction attachments
    receipt-upload/                  # Upload → Storage → OCR → match (inline)
    receipt-extract/                 # Retry OCR extraction
    receipt-match/                   # Re-run transaction matching
    receipt-confirm/                 # Confirm match → upload to Xero
    receipt-list/                    # Paginated receipt list
    receipt-detail/                  # Single receipt with signed URL
  migrations/
    001_initial.sql                  # tokens, cache tables
    002_receipts_ocr.sql             # receipts, merchant_aliases, receipt_queue
```

## Tech Stack

- **Mobile**: Expo SDK 54, React Native 0.81, TypeScript, Expo Router v4
- **Styling**: NativeWind 4.x + Tailwind CSS 3.x
- **State**: Zustand 5.x + TanStack React Query 5.x
- **Backend**: Supabase Edge Functions (Deno/TypeScript) + PostgreSQL
- **Auth**: PKCE OAuth via expo-auth-session → Supabase → Xero API
- **OCR**: OpenRouter API → Gemini 2.5 Flash (vision model, ~$0.0008/receipt)

## Organization Rules

- Screens in `apps/mobile/app/` following Expo Router file conventions
- Reusable components in `components/`, one per file
- Custom hooks in `hooks/`, API logic in `services/`
- Types in `types/index.ts` (mobile) and `_shared/types.ts` (backend)
- Edge Functions: one folder per endpoint, shared code in `_shared/`
- Keep files focused — single responsibility per file

## Code Quality

After editing mobile app files, run from `apps/mobile/`:

```bash
npx tsc --noEmit                # TypeScript check — fix ALL errors
npx expo install --check        # Dependency compatibility check
```

Fix ALL errors before continuing.

## Key Constraints

- Xero API cannot do programmatic reconciliation (permanent limitation)
- Xero rate limits: 60/min, 5000/day — cache aggressively in PostgreSQL
- Xero tokens expire every 30min — auto-refresh in `_shared/token-manager.ts`
- Mobile app runs via Expo Go (SDK 54) — no native modules outside Expo
- Edge Function pattern: `serve()` → `handleCors()` → method check → `extractSession()` → logic → `jsonResponse()`/`errorResponse()`
- Custom Xero brand colors in `tailwind.config.js`: xero-blue (#13B5EA), xero-dark, xero-green, xero-navy
- Receipt OCR requires `OPENROUTER_API_KEY` env var on Supabase
