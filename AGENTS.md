<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Hard rules (never violate)

1. **No secret ever reaches the client.** Only `NEXT_PUBLIC_*` values may be inlined into the browser bundle, and they must not be credentials. Server-only names: `SALLA_CLIENT_SECRET`, `SALLA_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`. Keep `@supabase/supabase-js` out of any module reachable from a client component.
2. **No browser ↔ database connection, ever.** No Supabase client in the browser, no PostgREST calls, no Realtime/websocket from the browser, no publishable key needed client-side. Every read and write goes through our own API routes, which verify the Salla session and then talk to the database server-side.
3. Consequence: freshness is server-driven (short poll + refetch on focus + refetch after save). Do not reintroduce Realtime in the browser to "improve latency".
4. RLS: no `public`/`anon` policies on any table. Reads and writes use the service role from server code only.

If a task seems to require breaking rule 1 or 2, stop and ask instead.
