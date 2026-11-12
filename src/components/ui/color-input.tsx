"use client";

import { TextInput } from "./input";

/** Compact color picker (native input + hex field) for per-prize colors. */
export default function ColorInput({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (next: string) => void;
  className?: string;
}) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <input
        type="color"
        value={safe}
        onChange={(event) => onChange(event.target.value)}
        aria-label="اختيار اللون"
        className="size-9 shrink-0 cursor-pointer rounded-md border border-black/10 bg-white p-1 dark:border-white/15 dark:bg-zinc-950"
      />
      <TextInput
        type="text"
        dir="ltr"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-24 px-2 py-1 text-left text-sm"
      />
    </div>
  );
}
