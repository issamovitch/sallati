"use client";

import type { ReactNode } from "react";
import Hint from "./hint";

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-zinc-900"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <Hint className="mt-1">{description}</Hint>}
        {children}
      </div>
    </div>
  );
}
