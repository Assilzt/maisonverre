export type ProductImage = {
  src: string;
  alt: string;
  label: string;
};

export type ProductFeature = {
  name: string;
  emoji: string;
  accent: string;
  details: string;
  area: string;
};

export type ProductBundle = {
  quantity: number;
  price: number;
  label: string;
};

export type ProductLandingConfig = {
  slug: string;
  name: string;
  shortName: string;
  headline: string;
  subheadline: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  bundles?: ProductBundle[];
  currency: string;
  images: ProductImage[];
  features: ProductFeature[];
  trustBadges: string[];
  resultEyebrow: string;
  resultTitle: string;
  resultDescription: string;
  gift?: {
    enabled: boolean;
    title: string;
    description: string;
    valueLabel: string;
    durationMinutes: number;
  };
  limitedOffer?: {
    enabled: boolean;
    durationMinutes: number;
  };
  tracking: {
    contentId: string;
    campaignName: string;
  };
};

export const PRODUCT_CONFIGS: Record<string, ProductLandingConfig> = {
  "white-strawberry-seeds": {
    slug: "white-strawberry-seeds",
    name: "بذور الفراولة البيضاء الأناناسية",
    shortName: "فراولة Pineberry",
    headline: "اكتشف فراولة Pineberry البيضاء النادرة",
    subheadline: "ثمار بيضاء مميزة بنكهة فراولة حلوة ولمسة أناناس خفيفة",
    description:
      "ازرع صنف Pineberry النادر في منزلك؛ فراولة بيضاء بطابع مميز ونكهة تذكّر قليلًا بالأناناس. اختَر الولاية والبلدية وسنتصل بك لتأكيد الطلب.",
    price: 1990,
    bundles: [
      { quantity: 1, price: 1990, label: "علبة واحدة" },
      { quantity: 2, price: 2700, label: "علبتان" },
      { quantity: 3, price: 3400, label: "3 علب" },
    ],
    currency: "دج",
    images: [
      {
        src: "/images/white-strawberry-cropped.webp",
        alt: "عبوة بذور الفراولة البيضاء الأناناسية Pineberry",
        label: "العبوة الرئيسية",
      },
    ],
    features: [
      {
        name: "Pineberry نادرة",
        emoji: "🍓🤍🍍",
        accent: "bg-rose-100 text-rose-700",
        details: "صنف أبيض مميز",
        area: "حتى 1 م²",
      },
      {
        name: "بداية سهلة",
        emoji: "🌱",
        accent: "bg-amber-100 text-amber-700",
        details: "مناسبة للمبتدئين",
        area: "حتى 2 م²",
      },
      {
        name: "زراعة منزلية",
        emoji: "🏡",
        accent: "bg-pink-100 text-pink-700",
        details: "للشرفة والحديقة",
        area: "حتى 6 م²",
      },
      {
        name: "نكهة استثنائية",
        emoji: "🍍🍓",
        accent: "bg-emerald-100 text-emerald-700",
        details: "حلاوة الفراولة ولمسة أناناس",
        area: "حتى 3 م²",
      },
    ],
    trustBadges: [
      "الدفع عند الاستلام",
      "نتصل قبل الشحن",
      "بذور أصلية",
      "صنف Pineberry قليل الانتشار",
    ],
    resultEyebrow: "نتائج تختلف حسب العناية",
    resultTitle: "ازرع فراولة Pineberry البيضاء في منزلك",
    resultDescription:
      "تُعرف Pineberry بندرتها ولونها الأبيض المميز، ويصف كثيرون نكهتها بأنها فراولة حلوة مع لمسة أناناس خفيفة. تحتاج إلى ضوء جيد وري منتظم، وتختلف النتائج حسب الموسم والعناية وظروف الزراعة.",
    gift: {
      enabled: true,
      title: "دليل زراعة الفراولة مجاناً",
      description: "يساعدك تنجح في الزراعة",
      valueLabel: "قيمته 300 دج",
      durationMinutes: 5,
    },
    limitedOffer: { enabled: true, durationMinutes: 10 },
    tracking: {
      contentId: "maisonverre-white-strawberry",
      campaignName: "بذور الفراولة البيضاء الأناناسية Pineberry",
    },
  },
};

export const DEFAULT_PRODUCT = PRODUCT_CONFIGS["white-strawberry-seeds"];

export function getProductConfig(
  slug?: string
): ProductLandingConfig | undefined {
  return slug ? PRODUCT_CONFIGS[slug] : DEFAULT_PRODUCT;
}

export function getProductSlugs(): string[] {
  return Object.keys(PRODUCT_CONFIGS);
}

export function getProductCampaignLabel(
  product: ProductLandingConfig,
  price: number,
  isLimitedOffer: boolean
): string {
  if (isLimitedOffer && price === product.price) return "عرض محدود";
  if (product.compareAtPrice && price === product.compareAtPrice)
    return "السعر العادي";
  return product.tracking.campaignName;
}

export function getProductEventData(
  product: ProductLandingConfig,
  price: number
): Record<string, unknown> {
  return {
    content_name: product.name,
    content_ids: [product.tracking.contentId],
    content_type: "product",
    value: price,
    // Meta Pixel expects an ISO 4217 code; keep product.currency (دج) for display only.
    currency: "DZD",
  };
}

export function getProductPurchaseEventData(
  product: ProductLandingConfig,
  price: number,
): Record<string, unknown> {
  const { currency: _currency, ...purchaseData } = getProductEventData(product, price);
  // Meta rejects DZD for Purchase in the browser Pixel. Keep the amount and
  // product data, but omit only the invalid currency parameter for this event.
  return purchaseData;
}

export function getProductOfferPrice(
  product: ProductLandingConfig,
  searchParams: URLSearchParams,
  isLimitedOffer: boolean
): number {
  if (isLimitedOffer) return product.price;
  return product.compareAtPrice &&
    searchParams.get("price") === String(product.compareAtPrice)
    ? product.compareAtPrice
    : product.price;
}

export function getProductStoragePrefix(product: ProductLandingConfig): string {
  return `maisonverre:${product.slug}`;
}

export function getOfferEndsAt(
  product: ProductLandingConfig,
  key: "limited" | "gift",
  enabled: boolean
): number | null {
  if (!enabled) return null;
  const storageKey = `${getProductStoragePrefix(product)}:${key}-ends-at`;
  const storedEndsAt = Number(window.localStorage.getItem(storageKey));
  if (storedEndsAt > Date.now()) return storedEndsAt;
  const durationMinutes =
    key === "limited"
      ? product.limitedOffer?.durationMinutes
      : product.gift?.durationMinutes;
  const endsAt = Date.now() + (durationMinutes || 0) * 60 * 1000;
  window.localStorage.setItem(storageKey, String(endsAt));
  return endsAt;
}

export function getProductLeadStorageKey(
  product: ProductLandingConfig,
  phone: string
): string {
  return `${getProductStoragePrefix(product)}:telegram-lead:${phone}`;
}

export function getProductLeadMessageStorageKey(
  product: ProductLandingConfig,
  phone: string
): string {
  return `${getProductStoragePrefix(product)}:telegram-message:${phone}`;
}

export function getProductLeadId(
  product: ProductLandingConfig,
  phone: string
): string {
  const storageKey = `${getProductStoragePrefix(product)}:lead-id:${phone}`;
  try {
    const existingId = window.sessionStorage.getItem(storageKey);
    if (existingId) return existingId;
    const leadId = `AT-${Date.now().toString(36).toUpperCase()}`;
    window.sessionStorage.setItem(storageKey, leadId);
    return leadId;
  } catch {
    return `AT-${Date.now().toString(36).toUpperCase()}`;
  }
}

export function getProductSessionLeadId(product: ProductLandingConfig): string {
  const storageKey = `${getProductStoragePrefix(product)}:lead-id:active-form-draft`;
  try {
    const existingId = window.sessionStorage.getItem(storageKey);
    if (existingId) return existingId;
    const leadId = `AT-${Date.now().toString(36).toUpperCase()}`;
    window.sessionStorage.setItem(storageKey, leadId);
    return leadId;
  } catch {
    return `AT-${Date.now().toString(36).toUpperCase()}`;
  }
}

export function resetProductSessionLeadId(product: ProductLandingConfig): void {
  try {
    window.sessionStorage.removeItem(
      `${getProductStoragePrefix(product)}:lead-id:active-form-draft`
    );
  } catch {
    // Starting a new form still works when session storage is unavailable.
  }
}

export function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function getPixelStorageKey(
  product: ProductLandingConfig,
  dedupeKey: string
): string {
  return `${getProductStoragePrefix(product)}:pixel:${dedupeKey}`;
}
