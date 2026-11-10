import type { ReactNode } from "react";

export default function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-black/10 bg-white p-5 pt-4 shadow-sm dark:border-white/10 dark:bg-zinc-900 ${className}`}
    >
      {title && (
        <h2 className="-mx-5 mb-4 border-b-2 border-zinc-200 px-5 pb-3 text-lg font-bold tracking-tight dark:border-zinc-700">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}
