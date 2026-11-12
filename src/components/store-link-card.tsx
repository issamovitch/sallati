"use client";

import { useCallback, useEffect, useState } from "react";
import { HiArrowPath } from "react-icons/hi2";
import { Button, Card, GhostButton, Hint } from "@/components/ui";
import { readMerchantId } from "@/lib/settings";

type Status = {
  linked: boolean;
  storeName: string | null;
  storeUrl: string | null;
  expiresAt: number | null;
  installUrl: string | null;
};

const DATE_FORMAT = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { dateStyle: "medium" });

/**
 * One-time store link. Salla only issues tokens when the merchant approves the
 * app, so this is the single explicit step; afterwards refreshes run silently.
 */
export default function StoreLinkCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const merchantId = readMerchantId();

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    if (!merchantId) return;

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(`/api/store/status?merchant_id=${merchantId}`, {
          cache: "no-store",
        });
        const data = response.ok ? ((await response.json()) as Status) : null;
        if (!cancelled && data) setStatus(data);
      } catch {
        /* keep the previous status */
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [merchantId, refreshKey]);

  // Coming back from the install tab re-focuses the app: re-check automatically.
  useEffect(() => {
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);

  if (!merchantId) return null;

  if (loading && !status) {
    return (
      <Card title="ربط المتجر">
        <Hint>جارٍ التحقق من الربط…</Hint>
      </Card>
    );
  }

  if (!status?.linked) {
    return (
      <Card title="ربط المتجر">
        <Hint className="text-sm leading-7">
          لإنشاء كوبون لكل زائر تلقائيًا، اربط متجرك مرة واحدة. بعد الموافقة يتولى
          التطبيق تجديد الصلاحية في الخلفية دون أي خطوة أخرى. حتى ذلك الحين تعمل
          الجوائز بأكواد الكوبون اليدوية.
        </Hint>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {status?.installUrl && (
            <Button
              type="button"
              onClick={() => window.open(status.installUrl as string, "_blank", "noopener")}
            >
              ربط المتجر
            </Button>
          )}
          <GhostButton type="button" onClick={refresh} className="inline-flex items-center gap-1">
            <HiArrowPath className="size-4" />
            تحديث الحالة
          </GhostButton>
        </div>

        <Hint className="mt-3">
          بعد الموافقة على التطبيق في سلة، ارجع إلى هذه الصفحة — يتم التحديث تلقائيًا.
        </Hint>
      </Card>
    );
  }

  return (
    <Card title="ربط المتجر">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            مربوط{status.storeName ? ` · ${status.storeName}` : ""}
          </p>
          {status.expiresAt ? (
            <Hint className="mt-1">
              صلاحية الوصول حتى {DATE_FORMAT.format(new Date(status.expiresAt))} ويُجدَّد
              تلقائيًا.
            </Hint>
          ) : null}
        </div>

        <GhostButton type="button" onClick={refresh} className="inline-flex items-center gap-1">
          <HiArrowPath className="size-4" />
          تحديث الحالة
        </GhostButton>
      </div>
    </Card>
  );
}
