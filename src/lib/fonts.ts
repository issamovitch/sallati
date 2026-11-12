export type FontOption = { value: string; label: string };

/** Fonts loaded in `src/app/layout.tsx` (Arabic labels, values are CSS names). */
export const FONT_OPTIONS: FontOption[] = [
  { value: "Cairo", label: "القاهرة" },
  { value: "Tajawal", label: "تجوال" },
  { value: "Almarai", label: "المراعي" },
  { value: "IBM Plex Sans Arabic", label: "آي بي إم بلكس العربية" },
  { value: "Noto Sans Arabic", label: "نوتو سانس العربية" },
  { value: "Amiri", label: "أميري" },
  { value: "Scheherazade New", label: "شهرزاد الجديد" },
  { value: "Lateef", label: "لطيف" },
  { value: "Reem Kufi", label: "ريم كوفي" },
];

export const FONT_FAMILIES = FONT_OPTIONS.map((option) => option.value);
