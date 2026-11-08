# Sallati

Minimal Salla embedded app. Next.js 16 (App Router) + Tailwind + `@salla.sa/embedded-sdk`.

## Run

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

## Tunnel (Salla must reach your machine)

```powershell
.\.tools\cloudflared.exe tunnel --url http://localhost:3000 --no-autoupdate
```

Use the `https://*.trycloudflare.com` URL it prints. Do not use free ngrok: its
interstitial page breaks iframes.

## Connect it to the demo store

1. Partners Portal -> **My Apps** -> your app -> **Embedded Pages** -> Add:
   - **Route Slug**: `sallati`
   - **Iframe URL**: `https://<tunnel>/embedded`
   - **Default Page**: on
2. **App Testing** -> **Install App** on your demo store (skip if installed).
3. Demo store dashboard -> **Apps** -> Sallati -> **Use App**.
4. Copy the **App ID** into `.env.local` as `SALLA_APP_ID`, then restart `npm run dev`.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Status + env checklist |
| `/embedded` | Iframe UI; needs `?token=` from Salla |
| `/api/health` | Uptime/tunnel check |
| `POST /api/embedded/session` | Verifies the token via Salla introspection |
| `GET /api/store/link` | Returns the storefront URL for a merchant (cached from OAuth) |
| `POST /webhooks/salla` | HMAC-verified app events; stores OAuth tokens + store link |

## Store link (Preview button)

The embedded session token cannot read store details. The storefront URL is
discovered after Easy Mode sends `app.store.authorize` to
`<NEXT_PUBLIC_APP_URL>/webhooks/salla`:

1. Set `SALLA_WEBHOOK_SECRET` and register that webhook URL in the Partners Portal.
2. Reinstall the app on the demo store so Salla emits `app.store.authorize`.
3. The webhook stores the OAuth token in `.data/stores.json` and resolves the
   store link via `GET https://api.salla.dev/admin/v2/stores/{merchant_id}`.

`NEXT_PUBLIC_STORE_URL` overrides discovery. If neither is available, the
Preview button asks for the link once and saves it in the browser.
