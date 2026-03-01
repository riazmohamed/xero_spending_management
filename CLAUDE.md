# Xero Spending Management

Reconciliation preparation tool for Xero. Mobile app captures receipts, categorizes bank transactions so Xero web reconciliation becomes one-click "OK" confirmations.

## Project Structure

```
apps/mobile/                    # Expo SDK 54 / React Native mobile app
  app/                          # Expo Router file-based routing
    _layout.tsx                 # Root layout (providers, theme)
    (auth)/login.tsx            # OAuth login screen
    (app)/                      # Protected app routes (bottom tabs)
      dashboard.tsx             # Spending summary dashboard
      capture.tsx               # Receipt camera capture
      settings.tsx              # Connection management
      transactions/             # Transaction list + detail screens
        index.tsx               # Searchable transaction list
        [id].tsx                # Detail + categorization
  components/                   # Reusable UI (cards, overlays, previews)
  hooks/                        # useAuth, useTransactions, useApi
  services/                     # API client (api.ts), OAuth flow (auth.ts)
  stores/                       # Zustand auth store
  types/                        # TypeScript interfaces

supabase/                       # Backend
  functions/                    # Deno Edge Functions
    _shared/                    # token-manager, xero-client, cors, types
    auth-token/                 # PKCE OAuth exchange
    auth-refresh/               # Token refresh
    auth-logout/                # Logout + token cleanup
    transactions/               # Fetch Xero bank transactions
    transactions-update/        # Save category/notes/attachments
    transactions-summary/       # Dashboard stats
    accounts/                   # List Xero bank accounts
    statement-lines/            # Raw bank statement lines
    attachments-upload/         # Receipt image upload
    attachments-list/           # List receipts for transaction
  migrations/001_initial.sql    # DB schema (users, tokens, metadata)
```

## Tech Stack

- **Mobile**: Expo SDK 54, React Native 0.81, TypeScript, Expo Router v4
- **Styling**: NativeWind 4.x + Tailwind CSS 3.x
- **State**: Zustand 5.x + TanStack React Query 5.x
- **Backend**: Supabase Edge Functions (Deno/TypeScript) + PostgreSQL
- **Auth**: PKCE OAuth via expo-auth-session → Supabase → Xero API

## Organization Rules

- Screens go in `apps/mobile/app/` following Expo Router file conventions
- Reusable components in `components/`, one per file
- Custom hooks in `hooks/`, API logic in `services/`
- Types in `types/index.ts`
- Edge Functions: one folder per endpoint, shared code in `_shared/`
- Keep files focused — single responsibility per file

## Code Quality

After editing mobile app files, run from `apps/mobile/`:

```bash
npx tsc --noEmit                # TypeScript check — fix ALL errors
npx expo install --check        # Dependency compatibility check
```

## Key Constraints

- Xero API cannot do programmatic reconciliation (permanent limitation)
- Xero rate limits: 60/min, 5000/day — cache aggressively in PostgreSQL
- Xero tokens expire every 30min — auto-refresh in `_shared/token-manager.ts`
- Mobile app runs via Expo Go (SDK 54) — no native modules outside Expo
- Custom Xero brand colors defined in `tailwind.config.js` (xero-blue, xero-dark, xero-green, xero-navy)
