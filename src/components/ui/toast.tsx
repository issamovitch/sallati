"use client";

import { embedded } from "@salla.sa/embedded-sdk";

export type ToastKind = "success" | "warning" | "error";

/**
 * Shows Salla's native toast inside the dashboard only. There is deliberately
 * no local fallback, so the app never renders a toast of its own.
 */
export function showHostToast(
  message: string,
  kind: ToastKind = "success",
  ms = 2000,
): boolean {
  try {
    const toast = (window as any).embedded?.ui?.toast;
    const fn = toast?.[kind];
    if (typeof fn === "function") {
      fn.call(toast, message, ms);
      return true;
    }
  } catch {
    /* host unavailable */
  }

  try {
    const toast = (embedded as any)?.ui?.toast;
    const fn = toast?.[kind];
    if (typeof fn === "function") {
      fn.call(toast, message, ms);
      return true;
    }
  } catch {
    /* SDK not ready */
  }

  return false;
}

export function useToast() {
  return { show: showHostToast };
}
