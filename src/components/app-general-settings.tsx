"use client";

import { useEffect, useState } from "react";
import { normalizeStoreUrl } from "@/lib/store-link";
import { readStoreUrl, saveStoreUrl } from "@/lib/stores";
import { readMerchantId } from "@/lib/settings";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Button, Card, Field, Hint, Page, TextInput, useToast } from "@/components/ui";

export default function AppGeneralSettings() {
  const [url, setUrl] = useState("");
  const { show } = useToast();

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
      show("رابط غير صالح", "warning");
      return;
    }
    const ok = await saveStoreUrl(readMerchantId(), normalized);
    if (ok) {
      setUrl(normalized);
      show("تم الحفظ");
    } else {
      show("تعذّر الحفظ", "error");
    }
  }

  return (
    <Page title="سلتي">
      <Hint className="mt-2 text-sm">اختر وحدة من القائمة للبدء</Hint>

      <Card title="إعدادات التطبيق العامة" className="mt-6">
        <Hint>رابط متجرك (صفحة المتجر الرئيسية).</Hint>

        <Field label="رابط المتجر" className="mt-3">
          <TextInput
            type="url"
            dir="ltr"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.salla.sa"
            className="mt-1 text-left"
          />
        </Field>

        <div className="mt-4 flex justify-end">
          <Button type="button" onClick={save}>
            حفظ
          </Button>
        </div>

        {!isSupabaseConfigured() && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            Supabase غير مهيّأ — سيتم الحفظ محليًا فقط.
          </p>
        )}
      </Card>
    </Page>
  );
}
