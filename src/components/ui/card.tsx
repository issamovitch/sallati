import type { ReactNode } from "react";

export default function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-black/10 bg-white p-5 pt-4 shadow-sm dark:border-white/10 dark:bg-zinc-900 ${className}`}
    >
      {title && (
        <div className="-mx-5 mb-4 flex items-center justify-between gap-3 border-b-2 border-zinc-200 px-5 pb-3 dark:border-zinc-700">
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
