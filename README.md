# Sallati (سلتي)

Salla embedded app (Arabic, RTL) with storefront modules. Next.js 16 App Router + Tailwind + `@salla.sa/embedded-sdk`.

## Run

```powershell
npm install
Copy-Item .env.example .env.local   # fill in the values
npm run dev
```

Local preview: http://localhost:3000/embedded (`/` redirects there).

## Architecture rules

1. The browser never talks to the database and never receives a secret. Every read/write goes through our API routes, which verify the Salla session and use the service role server-side.
2. No public RLS policies on any table.
3. Freshness is server-driven: settings are refetched after a save and when the tab regains focus. No websockets, no polling timers.

See `AGENTS.md` for the full rules.

## Deploy

```powershell
vercel --prod
```

Environment variables live in Vercel (Production + Preview). `SALLA_CLIENT_SECRET`,
`SALLA_WEBHOOK_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` are server-only.

## Salla setup

1. Partners Portal → My Apps → your app → **Embedded Pages**: slug `sallati`, iframe URL `<APP_URL>/embedded`, default page on.
2. **Webhooks**: `<APP_URL>/webhooks/salla`, strategy **Token**; app events `app.store.authorize` + `app.uninstalled`.
3. **App Snippet**: paste `public/sallati-loader.js` (JS only, no HTML).
4. Install on the demo store; tokens are stored encrypted in `public.stores`.
