"use client";

import Hint from "./hint";
import Toggle from "./toggle";

export default function ToggleRow({
  title,
  description,
  checked,
  onChange,
  label,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        {description && <Hint className="mt-1">{description}</Hint>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}
