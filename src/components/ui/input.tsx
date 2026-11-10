import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

const BASE =
  "w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#1781ae] dark:border-white/15 dark:bg-zinc-950";

export function TextInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${BASE} ${className}`} />;
}

export function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${BASE} ${className}`}>
      {children}
    </select>
  );
}
