export type TopOffersBarText = {
  message: string;
  duration: number; // seconds
};

export type TopOffersBarConfig = {
  enabled: boolean;
  texts: TopOffersBarText[];
  color: string;
  height: number;
  fontFamily: string;
  fontSize: number;
  /** Slide transition duration in milliseconds. */
  animationSpeed: number;
};

export const MIN_ANIMATION_SPEED = 100;
export const MAX_ANIMATION_SPEED = 3000;

export function clampAnimationSpeed(value: number): number {
  if (!Number.isFinite(value)) return 500;
  return Math.max(MIN_ANIMATION_SPEED, Math.min(MAX_ANIMATION_SPEED, value));
}

export const TOP_OFFERS_BAR_KEY = "sallati:top-offers-bar";
export const TOP_OFFERS_BAR_EVENT = "sallati:top-offers-bar";

export const DEFAULT_TOP_OFFERS_BAR: TopOffersBarConfig = {
  enabled: true,
  texts: [{ message: "شحن مجاني للطلبات فوق 200 ر.س", duration: 5 }],
  color: "#000000",
  height: 46,
  fontFamily: "Cairo",
  fontSize: 16,
  animationSpeed: 500,
};

export const TOP_OFFERS_BAR_FONTS = [
  "Cairo",
  "Tajawal",
  "Almarai",
  "IBM Plex Sans Arabic",
  "Noto Sans Arabic",
  "Amiri",
  "Scheherazade New",
  "Lateef",
  "Reem Kufi",
];

function normalizeTexts(raw: unknown): TopOffersBarText[] {
  if (Array.isArray(raw)) {
    const out = raw
      .map((t) => {
        if (typeof t === "string") return { message: t, duration: 5 };
        if (t && typeof t === "object") {
          const o = t as { message?: unknown; duration?: unknown };
          return {
            message: typeof o.message === "string" ? o.message : "",
            duration: typeof o.duration === "number" && o.duration >= 1 ? o.duration : 5,
          };
        }
        return null;
      })
      .filter((t): t is TopOffersBarText => t !== null);
    if (out.length) return out.slice(0, 5);
  }
  // Back-compat: old single `message` field.
  if (raw && typeof raw === "object" && "message" in (raw as object)) {
    const m = (raw as { message?: unknown }).message;
    if (typeof m === "string") return [{ message: m, duration: 5 }];
  }
  return [{ message: "شحن مجاني للطلبات فوق 200 ر.س", duration: 5 }];
}

export function normalizeTopOffersBar(raw: unknown): TopOffersBarConfig {
  const parsed = (raw && typeof raw === "object" ? raw : {}) as Partial<TopOffersBarConfig> & {
    message?: string;
  };

  return {
    enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULT_TOP_OFFERS_BAR.enabled,
    texts: normalizeTexts(parsed.texts ?? parsed),
    color:
      typeof parsed.color === "string" && parsed.color
        ? parsed.color
        : DEFAULT_TOP_OFFERS_BAR.color,
    height:
      typeof parsed.height === "number" && parsed.height > 0
        ? parsed.height
        : DEFAULT_TOP_OFFERS_BAR.height,
    fontFamily:
      typeof parsed.fontFamily === "string" && parsed.fontFamily
        ? parsed.fontFamily
        : DEFAULT_TOP_OFFERS_BAR.fontFamily,
    fontSize:
      typeof parsed.fontSize === "number" && parsed.fontSize > 0
        ? parsed.fontSize
        : DEFAULT_TOP_OFFERS_BAR.fontSize,
    animationSpeed: clampAnimationSpeed(
      typeof parsed.animationSpeed === "number"
        ? parsed.animationSpeed
        : DEFAULT_TOP_OFFERS_BAR.animationSpeed,
    ),
  };
}

export function readTopOffersBar(): TopOffersBarConfig {
  try {
    const raw = localStorage.getItem(TOP_OFFERS_BAR_KEY);
    if (!raw) return DEFAULT_TOP_OFFERS_BAR;
    return normalizeTopOffersBar(JSON.parse(raw));
  } catch {
    return DEFAULT_TOP_OFFERS_BAR;
  }
}

export function writeTopOffersBar(config: TopOffersBarConfig) {
  try {
    localStorage.setItem(TOP_OFFERS_BAR_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event(TOP_OFFERS_BAR_EVENT));
  } catch {
    /* storage unavailable */
  }
}