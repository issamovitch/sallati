"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { embedded } from "@salla.sa/embedded-sdk";
import { moduleNumbers, orderedModules } from "@/lib/modules";
import { normalizeStoreUrl } from "@/lib/store-link";
import { readStoreUrl, saveStoreUrl } from "@/lib/stores";
import SettingsProvider, { useSettings } from "@/components/settings-provider";
import { Button, GhostButton, Modal, Spinner, TextInput } from "@/components/ui";

type Status = "connecting" | "ready" | "error";

const TOKEN_KEY = "sallati.session-token";
const REFRESH_GUARD_KEY = "sallati.token-refresh-at";
const REFRESH_GUARD_MS = 20_000;
const RETRY_DELAY_MS = 700;
const SLOW_AFTER_MS = 12_000;

const STORE_WINDOW_NAME = "sallati-store-preview";

// Demo merchant used when the dashboard is opened without a Salla session.
// Override with NEXT_PUBLIC_DEMO_MERCHANT_ID to point previews at another store.
const DEFAULT_MERCHANT_ID =
  Number(process.env.NEXT_PUBLIC_DEMO_MERCHANT_ID) || 415866005;

// Sallati is Arabic-only: force RTL regardless of the dashboard locale.
const APP_LANG = "ar";
const APP_DIR = "rtl";

// Sidebar status dot: light green = enabled for this store, gray = off.
const dotOn = "bg-emerald-400 dark:bg-emerald-400";
const dotOff = "bg-zinc-300 dark:bg-zinc-600";

// Single-flight: the SDK handshake must only start once, even under React StrictMode.
let initPromise: Promise<{ layout: { theme: "light" | "dark"; dir: "ltr" | "rtl"; locale: string } }> | null = null;

function initOnce() {
  if (!initPromise) {
    initPromise = embedded.init({ debug: true }).catch((cause) => {
      initPromise = null;
      throw cause;
    });
  }
  return initPromise;
}

type VerifyResult = { status: number; merchantId?: number; error?: string };

// Keeps the untranslated server/network detail so the error screen can show it.
class BootstrapError extends Error {
  readonly raw: string;

  constructor(message: string, raw: string) {
    super(message);
    this.name = "BootstrapError";
    this.raw = raw;
  }
}

async function verifySession(token: string): Promise<VerifyResult> {
  try {
    const response = await fetch("/api/embedded/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; merchant_id?: number }
      | null;
    return {
      status: response.status,
      merchantId: payload?.merchant_id,
      error: payload?.error,
    };
  } catch {
    return { status: 0 };
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function inIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Local development has no Salla host. Allow previewing the dashboard on
 * localhost without an embedded session; production and the tunnel stay strict.
 */
function isLocalDevPreview() {
  try {
    const { hostname } = window.location;
    return (
      (hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "[::1]") &&
      !inIframe() &&
      !readUrlToken()
    );
  } catch {
    return false;
  }
}

function canRequestRefresh() {
  try {
    const last = Number(sessionStorage.getItem(REFRESH_GUARD_KEY) ?? 0);
    return !Number.isFinite(last) || Date.now() - last > REFRESH_GUARD_MS;
  } catch {
    return true;
  }
}

function markRefreshRequested() {
  try {
    sessionStorage.setItem(REFRESH_GUARD_KEY, String(Date.now()));
  } catch {
    /* storage unavailable */
  }
}

function Icon({ path, className = "size-5" }: { path: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

const icons = {
  menu: "M4 6h16M4 12h16M4 18h16",
  expand: "M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3",
  shrink: "M8 3v3a2 2 0 0 1-2 2H3M16 3v3a2 2 0 0 0 2 2h3M8 21v-3a2 2 0 0 0-2-2H3M16 21v-3a2 2 0 0 1 2-2h3",
  close: "M6 6l12 12M18 6L6 18",
  preview: "M14 3h7v7M21 3l-9 9M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5",
};

function Logo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="سلتي"
      className="size-8 rounded-lg object-cover"
    />
  );
}

export default function EmbeddedShell({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [errorRaw, setErrorRaw] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const [merchantId, setMerchantId] = useState<number | null>(null);
  const [localPreview, setLocalPreview] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [storeUrl, setStoreUrl] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [storePromptOpen, setStorePromptOpen] = useState(false);
  const [storeInput, setStoreInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    const slowTimer = setTimeout(() => {
      if (!cancelled) setSlow(true);
    }, SLOW_AFTER_MS);

    async function bootstrap() {
      try {
        // Localhost preview: render the full dashboard without a Salla session.
        if (isLocalDevPreview()) {
          try { sessionStorage.setItem("sallati.merchant-id", String(DEFAULT_MERCHANT_ID)); } catch { /* */ }
          setMerchantId(DEFAULT_MERCHANT_ID);
          setLocalPreview(true);
          setStoreUrl("/");
          setStatus("ready");
          return;
        }

        // Direct visits (no Salla iframe, no token) fall back to the demo
        // merchant so the dashboard stays usable everywhere.
        if (!inIframe() && !readUrlToken() && !readStoredToken()) {
          setDemoMode(true);
          setMerchantId(DEFAULT_MERCHANT_ID);
          try { sessionStorage.setItem("sallati.merchant-id", String(DEFAULT_MERCHANT_ID)); } catch { /* */ }
          setStoreUrl(await readStoreUrl(DEFAULT_MERCHANT_ID));
          if (cancelled) return;
          setStatus("ready");
          return;
        }

        // Salla appends ?token=... to the iframe URL. Read it directly so identity
        // can be verified without waiting for the SDK handshake.
        let token = readUrlToken() ?? readStoredToken();

        // Some hosts only expose the token through the SDK, and it is only
        // available once init() has finished.
        if (!token) {
          await initOnce();
          if (cancelled) return;
          token = readSdkToken() ?? readUrlToken() ?? readStoredToken();
        }

        if (!token) {
          throw new BootstrapError(
            "لا يوجد رمز جلسة. افتح التطبيق من لوحة تحكم سلة.",
            "No session token found in the URL, the SDK, or sessionStorage.",
          );
        }

        let result = await verifySession(token);
        if (cancelled) return;

        // One silent retry for a transient network or edge failure.
        if (result.status === 0 || result.status >= 500) {
          await delay(RETRY_DELAY_MS);
          if (cancelled) return;
          result = await verifySession(token);
          if (cancelled) return;
        }

        // Session tokens last five minutes. Ask the host to re-render the iframe
        // with a fresh token instead of failing permanently.
        if (result.status === 401 && inIframe() && canRequestRefresh()) {
          markRefreshRequested();
          clearStoredToken();
          await initOnce().catch(() => null);
          if (cancelled) return;

          try {
            embedded.auth.refresh();
          } catch {
            /* host is not listening */
          }

          // If the host did not reload the iframe, surface the error.
          await delay(2500);
          if (cancelled) return;
          throw new BootstrapError(
            "انتهت صلاحية الجلسة. أعد فتح التطبيق من لوحة سلة.",
            `POST /api/embedded/session → HTTP ${result.status}: ${result.error ?? "Invalid or expired token"} (refresh requested)`,
          );
        }

        if (result.status !== 200 || !result.merchantId) {
          const raw =
            result.status === 0
              ? "POST /api/embedded/session → network error (no response from the app server)."
              : `POST /api/embedded/session → HTTP ${result.status}: ${result.error ?? "unknown error"}`;
          throw new BootstrapError(
            translateError(
              result.error ?? (result.status === 0 ? "failed to fetch" : undefined),
            ),
            raw,
          );
        }

        storeToken(token);
        setMerchantId(result.merchantId);
        try { sessionStorage.setItem("sallati.merchant-id", String(result.merchantId)); } catch { /* */ }

        // Load the store link from Supabase (null on first install).
        const link = await readStoreUrl(result.merchantId);
        setStoreUrl(link);

        // Then complete the host handshake (single-flight, no hard timeout).
        const { layout } = await initOnce();
        if (cancelled) return;

        const root = document.documentElement;
        root.lang = APP_LANG;
        root.dir = APP_DIR;
        root.classList.toggle("dark", layout.theme === "dark");

        embedded.page.setTitle("سلتي");
        embedded.ready();
        setStatus("ready");
      } catch (cause) {
        if (cancelled) return;
        if (cause instanceof BootstrapError) {
          setError(cause.message);
          setErrorRaw(cause.raw);
        } else if (cause instanceof Error) {
          setError(translateError(cause.message));
          setErrorRaw(cause.message);
        } else {
          const raw = String(cause);
          setError(translateError(raw));
          setErrorRaw(raw);
        }
        setStatus("error");
      } finally {
        clearTimeout(slowTimer);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
    };
  }, []);

  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      try {
        embedded.ui.toast.warning("المتصفح منع ملء الشاشة داخل سلة.", 3000);
      } catch {
        /* SDK not ready */
      }
    }
  }, []);

  const retry = useCallback(() => {
    // A manual retry is allowed to ask the host for a fresh token again.
    try {
      sessionStorage.removeItem(REFRESH_GUARD_KEY);
    } catch {
      /* storage unavailable */
    }
    window.location.reload();
  }, []);

  const openPreviewTab = useCallback((url: string) => {
    // Reuse one named tab: opening the same name focuses it, then navigating
    // its location again forces a fresh load even if the URL did not change.
    const tab = window.open(url, STORE_WINDOW_NAME);
    if (!tab) {
      try {
        embedded.ui.toast.warning("المتصفح منع فتح نافذة المعاينة.", 3000);
      } catch {
        /* SDK not ready */
      }
      return;
    }

    try {
      tab.location.href = url;
    } catch {
      /* cross-origin: already navigating */
    }
    tab.focus();
  }, []);

  const openStorePreview = useCallback(() => {
    if (localPreview) {
      openPreviewTab("/");
      return;
    }
    if (storeUrl) {
      openPreviewTab(storeUrl);
      return;
    }
    setStoreInput("");
    setStorePromptOpen(true);
  }, [localPreview, storeUrl, openPreviewTab]);

  const saveStoreLink = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const url = normalizeStoreUrl(storeInput);
      if (!url) {
        try {
          embedded.ui.toast.warning("رابط المتجر غير صالح. مثال: https://demo.salla.sa", 4000);
        } catch {
          /* SDK not ready */
        }
        return;
      }
      const ok = await saveStoreUrl(merchantId, url);
      if (ok) {
        setStoreUrl(url);
        setStorePromptOpen(false);
        try { embedded.ui.toast.success("تم الحفظ", 2000); } catch { /* */ }
      } else {
        try { embedded.ui.toast.warning("تعذّر حفظ الرابط", 3000); } catch { /* */ }
      }
    },
    [merchantId, storeInput],
  );

  if (status === "error") {
    return (
      <main className="grid h-dvh place-items-center bg-zinc-100 p-6 dark:bg-zinc-950">
        <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-6 text-center dark:border-red-900/50 dark:bg-zinc-900">
          <h1 className="text-base font-semibold">تعذّر تشغيل سلتي</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{error}</p>
          {errorRaw && (
            <details className="mt-4 text-right">
              <summary className="cursor-pointer text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
                تفاصيل الخطأ
              </summary>
              <pre
                dir="ltr"
                className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-zinc-100 p-3 text-left text-[11px] leading-relaxed text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
              >
                {errorRaw}
              </pre>
            </details>
          )}
          {(inIframe() || readUrlToken()) && (
            <button
              type="button"
              onClick={retry}
              className="mt-4 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              إعادة المحاولة
            </button>
          )}
        </div>
      </main>
    );
  }

  const ready = status === "ready";

  return (
    <SettingsProvider key={merchantId ?? "anon"} merchantId={merchantId}>
      <div className="relative flex h-dvh overflow-hidden bg-zinc-200 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <Modal
        open={storePromptOpen}
        onClose={() => setStorePromptOpen(false)}
        title="رابط متجرك"
        description="لم نتمكن من اكتشاف الرابط تلقائيًا. أدخله مرة واحدة وسنحفظه."
      >
        <form onSubmit={saveStoreLink}>
          <TextInput
            type="url"
            inputMode="url"
            dir="ltr"
            autoFocus
            value={storeInput}
            onChange={(event) => setStoreInput(event.target.value)}
            placeholder="https://demo.salla.sa"
            className="mt-3 text-left"
          />
          <div className="mt-4 flex items-center justify-end gap-2">
            <GhostButton
              size="sm"
              type="button"
              onClick={() => setStorePromptOpen(false)}
            >
              إلغاء
            </GhostButton>
            <Button size="sm" type="submit">
              حفظ ومعاينة
            </Button>
          </div>
        </form>
      </Modal>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="إغلاق القائمة"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`${
          sidebarOpen ? "fixed inset-y-0 start-0 z-40" : "hidden"
        } w-72 shrink-0 flex-col border-e border-black/10 bg-white md:static md:z-auto md:flex dark:border-white/10 dark:bg-zinc-900`}
      >
        <div className="flex h-14 items-center justify-between gap-2 border-b border-black/10 px-4 dark:border-white/10">
          <span className="text-sm font-semibold">الوحدات</span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {orderedModules.length}
          </span>
          <button
            type="button"
            className="md:hidden"
            aria-label="إغلاق القائمة"
            onClick={() => setSidebarOpen(false)}
          >
            <Icon path={icons.close} />
          </button>
        </div>

        <ModuleNav onNavigate={() => setSidebarOpen(false)} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-black/10 bg-white px-4 dark:border-white/10 dark:bg-zinc-900">
          <button
            type="button"
            className="md:hidden"
            aria-label="فتح القائمة"
            onClick={() => setSidebarOpen(true)}
          >
            <Icon path={icons.menu} />
          </button>

          <Link href="/embedded" className="flex items-center gap-2">
            <Logo />
            <span className="font-semibold">سلتي</span>
          </Link>

          <span className="hidden text-sm text-zinc-400 sm:inline">مساعد النمو لمتجرك</span>

          <div className="ms-auto flex items-center gap-2">
            <span
              className={`hidden rounded-full px-2 py-1 text-[11px] font-medium sm:inline ${
                ready && !localPreview && !demoMode
                  ? "bg-[#1781ae]/10 text-[#1781ae] dark:bg-[#1781ae]/15 dark:text-[#a4f0ed]"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
              }`}
            >
              {localPreview
                ? "معاينة محلية"
                : demoMode
                  ? "معاينة"
                  : ready
                    ? "متصل"
                    : slow
                      ? "الاتصال بطيء"
                      : "جارٍ الاتصال"}
            </span>

            {merchantId !== null && (
              <span className="hidden rounded-full border border-black/10 px-2 py-1 text-[11px] text-zinc-500 md:inline dark:border-white/15 dark:text-zinc-400">
                متجر #{merchantId}
              </span>
            )}

            <button
              type="button"
              onClick={openStorePreview}
              title="معاينة المتجر"
              aria-label="معاينة المتجر في نافذة جديدة"
              className="flex h-9 items-center gap-2 rounded-lg border border-black/10 px-2.5 text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Icon path={icons.preview} className="size-4" />
              <span className="hidden text-sm font-medium sm:inline">معاينة</span>
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? "إنهاء ملء الشاشة" : "ملء الشاشة"}
              aria-label={isFullscreen ? "إنهاء ملء الشاشة" : "ملء الشاشة"}
              className="grid size-9 place-items-center rounded-lg border border-black/10 text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Icon path={isFullscreen ? icons.shrink : icons.expand} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-[100px]">
          {ready ? (
            children
          ) : (
            <div className="grid h-full place-items-center p-6">
              <div className="text-center">
                <Spinner
                  label={slow ? "الاتصال بسلة يستغرق وقتًا أطول…" : "جارٍ الاتصال بسلة…"}
                />
                {slow && (
                  <button
                    type="button"
                    onClick={retry}
                    className="mt-3 text-sm font-medium text-[#1781ae] underline dark:text-[#a4f0ed]"
                  >
                    إعادة التحميل
                  </button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
      </div>
    </SettingsProvider>
  );
}

function ModuleNav({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const { states } = useSettings();

  return (
    <nav className="flex-1 overflow-y-auto p-2">
      <ul className="space-y-0.5">
        {orderedModules.map((module) => {
          const active = pathname === `/embedded/${module.slug}`;
          const enabled = states[moduleNumbers[module.slug]] === true;
          return (
            <li key={module.slug}>
              <Link
                href={`/embedded/${module.slug}`}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-[#1781ae]/15 font-medium text-[#1781ae] dark:bg-[#1781ae]/20 dark:text-[#a4f0ed]"
                    : "text-zinc-600 hover:bg-[#1781ae]/10 dark:text-zinc-400 dark:hover:bg-[#1781ae]/15"
                }`}
              >
                <span
                  className={`size-2.5 shrink-0 rounded-full ${enabled ? dotOn : dotOff}`}
                  title={enabled ? "مفعّل لهذا المتجر" : "غير مفعّل"}
                  aria-label={enabled ? "مفعّل" : "غير مفعّل"}
                />
                <span className="min-w-0 flex-1 truncate">{module.name}</span>
                <span className="text-[11px] text-zinc-400">{moduleNumbers[module.slug]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function translateError(message?: string): string {
  if (!message) return "تعذّر التحقق من الجلسة مع سلة. حاول مرة أخرى.";

  // Server errors may arrive as "HTTP 401: Invalid or expired token".
  const clean = message.replace(/^HTTP \d+:\s*/, "").trim();

  const known: Record<string, string> = {
    "Missing token": "لا يوجد رمز جلسة. افتح التطبيق من لوحة تحكم سلة.",
    "Invalid or expired token": "انتهت صلاحية الجلسة أو أنها غير صالحة. أعد فتح التطبيق من لوحة سلة.",
    "SALLA_APP_ID is not configured": "إعدادات التطبيق ناقصة (SALLA_APP_ID).",
    "Could not reach Salla introspection API": "تعذّر الوصول إلى سلة. تحقق من الاتصال ثم أعد المحاولة.",
  };

  if (known[clean]) return known[clean];

  if (/timed out|timeout|failed to fetch|networkerror|load failed/i.test(clean)) {
    return "تعذّر الاتصال بسلة. تأكد من فتح التطبيق من لوحة التحكم ثم أعد المحاولة.";
  }

  return clean;
}

function readUrlToken(): string | null {
  try {
    return new URLSearchParams(window.location.search).get("token");
  } catch {
    return null;
  }
}

function readSdkToken(): string | null {
  try {
    return embedded.auth.getToken() ?? null;
  } catch {
    return null;
  }
}

function readStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable */
  }
}

function clearStoredToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}
