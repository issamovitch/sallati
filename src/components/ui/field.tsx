import type { ReactNode } from "react";

export default function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-base font-bold text-zinc-900 dark:text-white">
        {label}
      </label>
      {children}
    </div>
  );
}
