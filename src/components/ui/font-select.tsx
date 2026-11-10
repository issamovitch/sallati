"use client";

import { useEffect, useRef, useState } from "react";
import { HiCheck, HiChevronDown } from "react-icons/hi2";

export type FontOption = { value: string; label: string };

/**
 * Dropdown that renders every option in its own font, so the label previews
 * exactly what the merchant will get. A native <select> cannot do that.
 */
export default function FontSelect({
  value,
  options,
  onChange,
  className = "",
}: {
  value: string;
  options: FontOption[];
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const current = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((state) => !state)}
        style={{ fontFamily: `'${current?.value ?? ""}', sans-serif` }}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#1781ae] dark:border-white/15 dark:bg-zinc-950"
      >
        <span>{current?.label ?? ""}</span>
        <HiChevronDown className="size-4 shrink-0 text-zinc-400" />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-black/10 bg-white py-1 shadow-lg dark:border-white/15 dark:bg-zinc-900"
        >
          {options.map((option) => (
            <li key={option.value} role="option" aria-selected={option.value === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={{ fontFamily: `'${option.value}', sans-serif` }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                  option.value === value ? "text-[#1781ae]" : ""
                }`}
              >
                <span>{option.label}</span>
                {option.value === value && <HiCheck className="size-4 shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
