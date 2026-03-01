# Xero Spending Management

A reconciliation preparation tool for Xero. Capture receipts, categorize transactions, and prepare everything so reconciliation in Xero's web UI is just quick "OK" clicks.

## Architecture

```
Android Phone (Expo)  →  Supabase Edge Functions  →  Xero API
```

## Prerequisites

1. **Xero Developer App** — Register at [developer.xero.com](https://developer.xero.com), create a "Mobile or Desktop App", save your Client ID
2. **Supabase Project** — Create at [supabase.com](https://supabase.com) (free tier), save Project URL + Anon Key
3. **Expo Go** — Install on your Android phone from Google Play Store

## Setup

### 1. Supabase

```bash
# Set secrets for Edge Functions
supabase secrets set XERO_CLIENT_ID=your-client-id
supabase secrets set JWT_SECRET=your-secret-key

# Deploy database migrations
supabase db push

# Deploy Edge Functions
supabase functions deploy auth-token
supabase functions deploy auth-refresh
supabase functions deploy auth-logout
supabase functions deploy transactions
supabase functions deploy transactions-update
supabase functions deploy transactions-summary
supabase functions deploy attachments-upload
supabase functions deploy attachments-list
supabase functions deploy accounts
```

### 2. Mobile App

```bash
cd apps/mobile

# Copy env and fill in values
cp .env.example .env

# Install dependencies
npm install

# Start dev server
npx expo start
```

Scan the QR code with Expo Go on your Android phone.

### 3. Xero App Configuration

In your Xero Developer App settings, add this redirect URI:
```
xero-spending://
```

## Features

- **Dashboard** — Progress stats, spending totals, quick capture button
- **Transaction List** — Searchable list of unreconciled bank transactions
- **Transaction Detail** — View details, set account codes, attach receipts
- **Camera Capture** — Quick capture: snap receipt first, pick transaction after
- **Settings** — Connection info, disconnect

## Important

Xero's API **cannot perform reconciliation programmatically**. This app prepares everything (categorization + receipts) so the final reconciliation in Xero's web UI is trivial.
