export type LuckWheelPrize = {
  id: string;
  /** Text shown on the wheel segment. */
  label: string;
  /** Relative probability. Normalized against the sum of all prizes. */
  weight: number;
  /** Manual coupon code. Empty means "no prize" (حظ أوفر). */
  couponCode: string;
  color: string;
};

export type LuckWheelConfig = {
  enabled: boolean;

  // Copy / look
  headline: string;
  description: string;
  buttonText: string;
  successText: string;
  spinDuration: number; // milliseconds
  accentColor: string;
  fontFamily: string;

  prizes: LuckWheelPrize[];

  // Triggers
  openOnDelay: boolean;
  delaySeconds: number;
  openOnExit: boolean;
  openOnButton: boolean;

  // Rules / capture
  oncePerVisitor: boolean;
  requireEmail: boolean;
  emailPlaceholder: string;
};

export const MIN_PRIZES = 2;
export const MAX_PRIZES = 10;
export const MIN_SPIN_DURATION = 1500;
export const MAX_SPIN_DURATION = 10000;
export const MIN_DELAY_SECONDS = 1;
export const MAX_DELAY_SECONDS = 120;

export const LUCK_WHEEL_PALETTE = [
  "#1781ae",
  "#070d42",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#84cc16",
  "#ec4899",
];

function defaultPrizes(): LuckWheelPrize[] {
  return [
    { id: "prize-1", label: "خصم 10%", weight: 20, couponCode: "SPIN10", color: "#1781ae" },
    { id: "prize-2", label: "خصم 15%", weight: 15, couponCode: "SPIN15", color: "#070d42" },
    { id: "prize-3", label: "خصم 20%", weight: 10, couponCode: "SPIN20", color: "#f59e0b" },
    { id: "prize-4", label: "شحن مجاني", weight: 15, couponCode: "FREESHIP", color: "#10b981" },
    { id: "prize-5", label: "خصم 5%", weight: 30, couponCode: "SPIN5", color: "#8b5cf6" },
    { id: "prize-6", label: "حظ أوفر", weight: 10, couponCode: "", color: "#94a3b8" },
  ];
}

export const DEFAULT_LUCK_WHEEL: LuckWheelConfig = {
  enabled: true,
  headline: "جرّب حظك واربح خصمًا!",
  description: "أدخل بريدك الإلكتروني ثم أدر العجلة لتعرف جائزتك.",
  buttonText: "أدر العجلة",
  successText: "مبروك! هذه جائزتك:",
  spinDuration: 4500,
  accentColor: "#1781ae",
  fontFamily: "Cairo",
  prizes: defaultPrizes(),
  openOnDelay: true,
  delaySeconds: 5,
  openOnExit: true,
  openOnButton: true,
  oncePerVisitor: true,
  requireEmail: true,
  emailPlaceholder: "بريدك الإلكتروني",
};

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{3,8}$/.test(value.trim());
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function cleanString(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

function normalizePrize(raw: unknown, index: number): LuckWheelPrize {
  const parsed = (raw && typeof raw === "object" ? raw : {}) as Partial<LuckWheelPrize>;
  const label = cleanString(parsed.label, `جائزة ${index + 1}`, 40);

  return {
    id: cleanString(parsed.id, `prize-${index + 1}`, 60),
    label,
    weight: Math.round(clampNumber(parsed.weight, 1, 100, 10)),
    couponCode:
      typeof parsed.couponCode === "string" ? parsed.couponCode.trim().slice(0, 60) : "",
    color: isHexColor(parsed.color)
      ? parsed.color.trim()
      : LUCK_WHEEL_PALETTE[index % LUCK_WHEEL_PALETTE.length],
  };
}

function normalizePrizes(raw: unknown): LuckWheelPrize[] {
  if (!Array.isArray(raw)) return defaultPrizes();

  const prizes = raw
    .slice(0, MAX_PRIZES)
    .map((prize, index) => normalizePrize(prize, index));
  if (prizes.length < MIN_PRIZES) return defaultPrizes();

  // Keep ids unique even if the stored data had duplicates.
  const seen = new Set<string>();
  return prizes.map((prize, index) => {
    let id = prize.id;
    while (seen.has(id)) id = `${prize.id}-${index + 1}`;
    seen.add(id);
    return { ...prize, id };
  });
}

export function normalizeLuckWheel(raw: unknown): LuckWheelConfig {
  const parsed = (raw && typeof raw === "object" ? raw : {}) as Partial<LuckWheelConfig>;

  return {
    enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULT_LUCK_WHEEL.enabled,
    headline: cleanString(parsed.headline, DEFAULT_LUCK_WHEEL.headline, 120),
    description: cleanString(parsed.description, DEFAULT_LUCK_WHEEL.description, 240),
    buttonText: cleanString(parsed.buttonText, DEFAULT_LUCK_WHEEL.buttonText, 40),
    successText: cleanString(parsed.successText, DEFAULT_LUCK_WHEEL.successText, 80),
    spinDuration: Math.round(
      clampNumber(
        parsed.spinDuration,
        MIN_SPIN_DURATION,
        MAX_SPIN_DURATION,
        DEFAULT_LUCK_WHEEL.spinDuration,
      ),
    ),
    accentColor: isHexColor(parsed.accentColor)
      ? parsed.accentColor.trim()
      : DEFAULT_LUCK_WHEEL.accentColor,
    fontFamily: cleanString(parsed.fontFamily, DEFAULT_LUCK_WHEEL.fontFamily, 60),
    prizes: normalizePrizes(parsed.prizes),
    openOnDelay:
      typeof parsed.openOnDelay === "boolean"
        ? parsed.openOnDelay
        : DEFAULT_LUCK_WHEEL.openOnDelay,
    delaySeconds: Math.round(
      clampNumber(
        parsed.delaySeconds,
        MIN_DELAY_SECONDS,
        MAX_DELAY_SECONDS,
        DEFAULT_LUCK_WHEEL.delaySeconds,
      ),
    ),
    openOnExit:
      typeof parsed.openOnExit === "boolean"
        ? parsed.openOnExit
        : DEFAULT_LUCK_WHEEL.openOnExit,
    openOnButton:
      typeof parsed.openOnButton === "boolean"
        ? parsed.openOnButton
        : DEFAULT_LUCK_WHEEL.openOnButton,
    oncePerVisitor:
      typeof parsed.oncePerVisitor === "boolean"
        ? parsed.oncePerVisitor
        : DEFAULT_LUCK_WHEEL.oncePerVisitor,
    requireEmail:
      typeof parsed.requireEmail === "boolean"
        ? parsed.requireEmail
        : DEFAULT_LUCK_WHEEL.requireEmail,
    emailPlaceholder: cleanString(
      parsed.emailPlaceholder,
      DEFAULT_LUCK_WHEEL.emailPlaceholder,
      60,
    ),
  };
}

export function prizeChance(prizes: LuckWheelPrize[], prize: LuckWheelPrize): number {
  const total = prizes.reduce((sum, item) => sum + (item.weight > 0 ? item.weight : 1), 0);
  if (total <= 0) return 0;
  return Math.round(((prize.weight > 0 ? prize.weight : 1) / total) * 100);
}
