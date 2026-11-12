"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  isEnabled,
  readMerchantSettings,
  subscribeMerchantSettings,
} from "@/lib/settings";

type SettingsContextValue = {
  rows: Record<number, unknown>;
  states: Record<number, boolean>;
  setRow: (moduleNum: number, settings: unknown) => void;
};

const SettingsContext = createContext<SettingsContextValue>({
  rows: {},
  states: {},
  setRow: () => {},
});

export function useSettings() {
  return useContext(SettingsContext);
}

/** Server value for one module plus the optimistic setter. */
export function useModuleConfig(moduleNum: number) {
  const { rows, setRow } = useSettings();
  const setModuleRow = useCallback(
    (settings: unknown) => setRow(moduleNum, settings),
    [moduleNum, setRow],
  );
  return { settings: rows[moduleNum], setRow: setModuleRow };
}

/**
 * Single query on mount, then Realtime. Remounting is keyed by `merchantId`
 * (see the shell), so switching stores starts from a clean map.
 */
export default function SettingsProvider({
  merchantId,
  children,
}: {
  merchantId: number | null;
  children: React.ReactNode;
}) {
  const [rows, setRows] = useState<Record<number, unknown>>({});

  const setRow = useCallback((moduleNum: number, settings: unknown) => {
    setRows((prev) => ({ ...prev, [moduleNum]: settings }));
  }, []);

  const reload = useCallback(() => {
    void readMerchantSettings(merchantId).then(setRows);
  }, [merchantId]);

  useEffect(() => {
    if (merchantId === null) return;
    reload();
    return subscribeMerchantSettings(merchantId, { onRow: setRow, onResync: reload });
  }, [merchantId, reload, setRow]);

  const states = useMemo(() => {
    const next: Record<number, boolean> = {};
    for (const [key, value] of Object.entries(rows)) {
      next[Number(key)] = isEnabled(value);
    }
    return next;
  }, [rows]);

  const value = useMemo(() => ({ rows, states, setRow }), [rows, states, setRow]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
