import { Suspense } from "react";
import EmbeddedShell from "./embedded-shell";

// The shell waits for the Salla session before rendering any module, so
// navigations into this subtree can't be instant.
export const instant = false;

function ShellFallback() {
  return (
    <div className="grid h-dvh place-items-center bg-zinc-50 dark:bg-zinc-950">
      <span className="text-sm text-zinc-400">جارٍ تحميل سلتي…</span>
    </div>
  );
}

export default function EmbeddedLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <EmbeddedShell>{children}</EmbeddedShell>
    </Suspense>
  );
}
