export type TopOffersBarConfig = {
  enabled: boolean;
  message: string;
  color: string;
  height: number;
  fontFamily: string;
  fontSize: number;
};

export const TOP_OFFERS_BAR_KEY = "sallati:top-offers-bar";
export const TOP_OFFERS_BAR_EVENT = "sallati:top-offers-bar";

export const DEFAULT_TOP_OFFERS_BAR: TopOffersBarConfig = {
  enabled: true,
  message: "شحن مجاني للطلبات فوق 200 ر.س",
  color: "#000000",
  height: 46,
  fontFamily: "Cairo",
  fontSize: 16,
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

export function readTopOffersBar(): TopOffersBarConfig {
  try {
    const raw = localStorage.getItem(TOP_OFFERS_BAR_KEY);
    if (!raw) return DEFAULT_TOP_OFFERS_BAR;
    const parsed = JSON.parse(raw) as Partial<TopOffersBarConfig>;
    return { ...DEFAULT_TOP_OFFERS_BAR, ...parsed };
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
