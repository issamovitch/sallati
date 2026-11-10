import type { ReactNode } from "react";

export default function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="grid h-24 place-items-center rounded-lg border border-dashed border-black/15 text-sm text-zinc-400 dark:border-white/15">
      {children}
    </div>
  );
}
