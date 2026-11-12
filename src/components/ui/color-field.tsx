"use client";

import { HexColorPicker } from "react-colorful";
import Field from "./field";
import { TextInput } from "./input";

export default function ColorField({
  label,
  value,
  onChange,
  pickerHeight = 140,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  pickerHeight?: number;
}) {
  return (
    <Field label={label}>
      <div className="mt-3">
        <HexColorPicker
          color={value}
          onChange={onChange}
          style={{ width: "100%", height: pickerHeight }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="font-mono text-sm text-zinc-500 dark:text-zinc-400">{value}</span>
        <TextInput
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-24 px-2 py-1 text-sm"
        />
      </div>
    </Field>
  );
}
