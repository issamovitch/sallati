"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { isEnabled, readMerchantSettings } from "@/lib/settings";

type SettingsContextValue = {
  rows: Record<number, unknown>;
  states: Record<number, boolean>;
  reload: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue>({
  rows: {},
  states: {},
  reload: async () => {},
});

export function useSettings() {
  return useContext(SettingsContext);
}

/** Server value for one module plus the shared reload. */
export function useModuleConfig(moduleNum: number) {
  const { rows, reload } = useSettings();
  return { settings: rows[moduleNum], reload };
}

/**
 * All reads come from our own API (Salla-token verified). Refetch happens on
 * mount, after a save, and when the tab regains focus — no timers, no sockets.
 */
export default function SettingsProvider({
  merchantId,
  children,
}: {
  merchantId: number | null;
  children: React.ReactNode;
}) {
  const [rows, setRows] = useState<Record<number, unknown>>({});

  const reload = useCallback(async () => {
    if (merchantId === null) return;
    const next = await readMerchantSettings(merchantId);
    setRows(next);
  }, [merchantId]);

  useEffect(() => {
    if (merchantId === null) return;
    let cancelled = false;

    const load = () => {
      void readMerchantSettings(merchantId).then((next) => {
        if (!cancelled) setRows(next);
      });
    };

    load();

    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };

    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [merchantId]);

  const states = useMemo(() => {
    const next: Record<number, boolean> = {};
    for (const [key, value] of Object.entries(rows)) {
      next[Number(key)] = isEnabled(value);
    }
    return next;
  }, [rows]);

  const value = useMemo(() => ({ rows, states, reload }), [rows, states, reload]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
