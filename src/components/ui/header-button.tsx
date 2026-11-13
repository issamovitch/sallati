"use client";

import type { ReactNode } from "react";

/**
 * Bordered header action used in the embedded app top bar. Text is optional so
 * icon-only actions keep the same square shape.
 */
export default function HeaderButton({
  icon,
  label,
  title,
  onClick,
}: {
  icon: ReactNode;
  label?: string;
  title?: string;
  onClick?: () => void;
}) {
  const accessible = title ?? label ?? "";

  return (
    <button
      type="button"
      onClick={onClick}
      title={accessible}
      aria-label={accessible}
      className="flex h-9 items-center gap-2 rounded-lg border border-black/10 px-2.5 text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {icon}
      {label && <span className="hidden text-sm font-medium sm:inline">{label}</span>}
    </button>
  );
}
