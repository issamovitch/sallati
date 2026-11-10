"use client";

export default function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
      style={{ backgroundColor: checked ? "#1781ae" : "#d4d4d8" }}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
          checked ? "start-[22px]" : "start-0.5"
        }`}
      />
    </button>
  );
}
