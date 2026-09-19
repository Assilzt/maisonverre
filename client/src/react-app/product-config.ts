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

export type ProductLandingConfig = {
  slug: string;
  name: string;
  shortName: string;
  headline: string;
  subheadline: string;
  description: string;
  price: number;
  compareAtPrice?: number;
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
  "spring-flower-pack": {
    slug: "spring-flower-pack",
    name: "باك الربيع الملكي",
    shortName: "باك الربيع",
    headline: "ازرع ربيعك بنفسك",
    subheadline: "باك واحد، 4 أنواع زهور، وبداية سهلة لشرفة أجمل",
    description:
      "اختَر الولاية والبلدية، وسنتصل بك قبل الشحن لتأكيد الطلب والتوصيل.",
    price: 1900,
    compareAtPrice: 2700,
    currency: "دج",
    images: [
      {
        src: "/images/main-pack.webp",
        alt: "باك الربيع الملكي مع أربعة أنواع من الزهور",
        label: "الباك الرئيسي",
      },
      {
        src: "/images/proof-seedling.webp",
        alt: "شتلات صغيرة نامية في أصيص",
        label: "بداية النمو",
      },
      {
        src: "/images/proof-flower.webp",
        alt: "زهور نامية في الحديقة",
        label: "نتيجة الزراعة",
      },
      {
        src: "/images/proof-pots.webp",
        alt: "أصص زهور مزروعة في المنزل",
        label: "مناسب للشرفة",
      },
    ],
    features: [
      {
        name: "زينيا قزم F1",
        emoji: "🌼",
        accent: "bg-rose-100 text-rose-700",
        details: "حوالي 15 بذرة",
        area: "حتى 1 م²",
      },
      {
        name: "مارغريت",
        emoji: "🌻",
        accent: "bg-amber-100 text-amber-700",
        details: "حوالي 1900 بذرة",
        area: "حتى 2 م²",
      },
      {
        name: "كوزموس",
        emoji: "🌸",
        accent: "bg-pink-100 text-pink-700",
        details: "حوالي 200 بذرة",
        area: "حتى 6 م²",
      },
      {
        name: "قتيفة (كوليوس)",
        emoji: "🌿",
        accent: "bg-emerald-100 text-emerald-700",
        details: "حوالي 680 بذرة",
        area: "حتى 3 م²",
      },
    ],
    trustBadges: [
      "الدفع عند الاستلام",
      "نتصل قبل الشحن",
      "4 أنواع متنوعة",
      "+100 طلبية بلا شكوى",
    ],
    resultEyebrow: "نتائج تختلف حسب العناية",
    resultTitle: "بداية بسيطة، فرق واضح في شرفتك",
    resultDescription:
      "الزينيا والكوسموس والقتيفة محبة للدفء، والنتائج تختلف حسب النوع والموسم والعناية.",
    gift: {
      enabled: true,
      title: "دليل العناية بالزهور مجاناً",
      description: "يساعدك تنجح في الزراعة",
      valueLabel: "قيمته 300 دج",
      durationMinutes: 5,
    },
    limitedOffer: { enabled: true, durationMinutes: 10 },
    tracking: {
      contentId: "atlasio-spring-pack",
      campaignName: "باك الربيع الملكي",
    },
  },
};

export const DEFAULT_PRODUCT = PRODUCT_CONFIGS["spring-flower-pack"];

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
    currency: product.currency,
  };
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
  return `atlasio:${product.slug}`;
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
