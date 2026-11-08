"use client";

import { useEffect, useState } from "react";
import { normalizeStoreUrl } from "@/lib/store-link";
import { readStoreUrl, saveStoreUrl } from "@/lib/stores";
import { readMerchantId } from "@/lib/settings";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function AppGeneralSettings() {
  const [url, setUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const current = await readStoreUrl(readMerchantId());
      if (!cancelled && current) setUrl(current);
    })();
    return () => { cancelled = true; };
  }, []);

  async function save() {
    const normalized = normalizeStoreUrl(url);
    if (!normalized) {
      setToast("رابط غير صالح");
      window.setTimeout(() => setToast(null), 2000);
      return;
    }
    const ok = await saveStoreUrl(readMerchantId(), normalized);
    if (ok) {
      setUrl(normalized);
      setToast("تم الحفظ");
    } else {
      setToast("تعذّر الحفظ");
    }
    window.setTimeout(() => setToast(null), 2000);
  }

  return (
    <div className="w-full px-10 py-8 md:px-16">
      <h1 className="text-2xl font-semibold">سلتي</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        اختر وحدة من القائمة للبدء
      </p>

      <div className="mt-6 rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-900">
        <h2 className="text-sm font-medium">إعدادات التطبيق العامة</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          رابط متجرك (صفحة المتجر الرئيسية).
        </p>
        <input
          type="url"
          dir="ltr"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.salla.sa"
          className="mt-3 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-left text-sm outline-none focus:border-[#1781ae] dark:border-white/15 dark:bg-zinc-950"
        />
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={save}
            className="btn-brand rounded-lg px-4 py-2 text-sm font-medium"
          >
            حفظ
          </button>
        </div>
        {!isSupabaseConfigured() && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            Supabase غير مهيّأ — سيتم الحفظ محليًا فقط.
          </p>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-white dark:text-zinc-900">
          {toast}
        </div>
      )}
    </div>
  );
}