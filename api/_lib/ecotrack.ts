export type EcoTrackSettings = {
  provider?: string | null;
  token?: string | null;
};

const envProvider = process.env.ECOTRACK_PROVIDER || "navexdelivery";
const envToken = process.env.ECOTRACK_API_TOKEN || "";

const getConfig = (settings?: EcoTrackSettings) => ({
  provider: String(settings?.provider || envProvider).trim(),
  token: String(settings?.token || envToken).trim(),
});

const getHeaders = (settings?: EcoTrackSettings) => {
  const { token } = getConfig(settings);
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

const getBaseUrl = (settings?: EcoTrackSettings) =>
  `https://${getConfig(settings).provider}.ecotrack.dz/api/v1`;

const ensureToken = (settings?: EcoTrackSettings) => {
  if (!getConfig(settings).token)
    throw new Error("ECOTRACK_API_TOKEN غير مضبوط في إعدادات لوحة التحكم");
};

const normalizePhone = (value: string) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("213") && digits.length === 12)
    return `0${digits.slice(3)}`;
  if (digits.length === 9) return `0${digits}`;
  return digits;
};

const officialToEcoTrack: Record<number, number> = {
  49: 57,
  50: 58,
  51: 51,
  52: 50,
  53: 52,
  54: 49,
  55: 55,
  56: 56,
  57: 53,
  58: 54,
};

const normalizeLocationText = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/[يى]/g, "ي")
    .replace(/[ة]/g, "ه")
    .replace(/[\s_-]+/g, " ");
const locationAliases: Record<string, string> = {
  mahelma: "maalma",
  ouzellaguen: "ouzellaguene",
  msirda: "msirda fouaga",
  ouaguenoun: "ouaguenoune",
  yakouren: "yakourene",
  "ziama mansouriah": "ziama mansouria",
  ziama: "ziama mansouria",
  "oued el bar": "oued el barad",
  "el harrouch": "el arrouch",
  hamma: "hamadi krouma",
  kanouar: "kanoua",
  khezaras: "khezara",
  "hammam n'bails": "hammam n'bail",
  "el ksir": "ain ouksir",
  "el meed": "el houamed",
  "el menaoua": "menaa",
  nesmoth: "nesmot",
  "el abiodh sidi cheikh": "el biodh sidi cheikh",
  "zemmouri el bahri": "zemmouri",
  grarem: "grarem gouga",
  oulhaca: "oulhaca el gheraba",
  "el fedjoudj boughrara": "el fedjoudj boughrara sa",
  "عين قزام": "in guezzam",
  "إن قزام": "in guezzam",
  "ain guezzam": "in guezzam",
  "in guezzam": "in guezzam",
};
const canonicalLocationText = (value: string) =>
  locationAliases[normalizeLocationText(value)] || normalizeLocationText(value);
const comparableLocationText = (value: string) =>
  canonicalLocationText(value)
    .replace(/['’]/g, " ")
    .replace(/^(les|el|al|l)\s*/i, "")
    .replace(/[\s-]/g, "")
    .replace(/(.)\1+/g, "$1");

const wilayaCode = (value: string) => {
  const raw = String(value || "");
  const match = raw.match(/^\s*(\d{1,2})/);
  const normalized = canonicalLocationText(
    raw.replace(/^\s*\d{1,2}\s*[-–:]?\s*/, "")
  );
  if (normalized === "in guezzam") return 54;
  const official = match ? Number(match[1]) : Number(raw);
  if (!Number.isInteger(official) || official < 1 || official > 58) return null;
  return officialToEcoTrack[official] || official;
};

const canonicalCommuneForEcoTrack = async (
  wilaya: string,
  commune: string,
  settings?: EcoTrackSettings
) => {
  const code = wilayaCode(wilaya);
  const communes = await fetchEcoTrackCommunes(wilaya, settings);
  const selected = comparableLocationText(commune);
  const match = communes.find(
    item => comparableLocationText(item.name) === selected
  );
  if (!match)
    throw new Error(
      `البلدية «${commune}» غير متاحة في EcoTrack لولاية ${wilaya}`
    );
  return { name: match.name, code, postalCode: match.codePostal };
};

export async function fetchEcoTrackWilayas(settings?: EcoTrackSettings) {
  ensureToken(settings);
  const response = await fetch(`${getBaseUrl(settings)}/get/wilayas`, {
    headers: getHeaders(settings),
  });
  if (!response.ok)
    throw new Error(`تعذر جلب قائمة الولايات (${response.status})`);
  const data = (await response.json()) as unknown;
  const items = Array.isArray(data)
    ? data
    : (data as { data?: unknown[]; wilayas?: unknown[] })?.data ||
      (data as { wilayas?: unknown[] })?.wilayas ||
      [];
  return (items as Array<Record<string, unknown>>)
    .map(item => ({
      id: Number(item.wilaya_id ?? item.id ?? item.code),
      name: String(item.wilaya_name ?? item.nom ?? item.name ?? ""),
    }))
    .filter(item => Number.isInteger(item.id) && item.id > 0);
}

export type EcoTrackProduct = {
  id: string;
  name: string;
  reference: string | null;
  quantity: number;
  active: boolean;
};
export type EcoTrackTrackingActivity = {
  reason?: string | null;
  details?: string | null;
  station?: string | null;
  driver?: string | null;
  driver_phone?: string | null;
  desk_phone?: string | null;
  date?: string | null;
  time?: string | null;
  postponed_to?: string | null;
  [key: string]: unknown;
};

export type EcoTrackShippingMode = "stock" | "without_stock";

const firstArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  for (const key of [
    "products",
    "data",
    "items",
    "results",
    "result",
    "rows",
  ]) {
    const nested = record[key];
    if (Array.isArray(nested)) return nested;
    if (nested && typeof nested === "object") {
      const found = firstArray(nested);
      if (found.length > 0) return found;
    }
  }
  return [];
};

const quantityFrom = (item: Record<string, unknown>) => {
  const candidates = [
    item.quantity,
    item.quantite,
    item.qte,
    item.stock_quantity,
    item.quantity_available,
    item.available_quantity,
    item.available_qty,
    item.stock_qty,
    item.qty,
    item.available,
    item.stock,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate))
      return Math.max(0, candidate);
    if (
      typeof candidate === "string" &&
      candidate.trim() !== "" &&
      Number.isFinite(Number(candidate))
    )
      return Math.max(0, Number(candidate));
    if (candidate && typeof candidate === "object") {
      const nested = candidate as Record<string, unknown>;
      const nestedValue =
        nested.quantity ??
        nested.quantite ??
        nested.qte ??
        nested.available ??
        nested.qty;
      if (typeof nestedValue === "number" && Number.isFinite(nestedValue))
        return Math.max(0, nestedValue);
      if (
        typeof nestedValue === "string" &&
        nestedValue.trim() !== "" &&
        Number.isFinite(Number(nestedValue))
      )
        return Math.max(0, Number(nestedValue));
    }
  }
  return 0;
};

export async function fetchEcoTrackProducts(settings?: EcoTrackSettings) {
  ensureToken(settings);
  const response = await fetch(`${getBaseUrl(settings)}/get/products/list`, {
    headers: getHeaders(settings),
  });
  if (!response.ok)
    throw new Error(`تعذر جلب منتجات المخزون (${response.status})`);
  const data = (await response.json()) as unknown;
  const items = firstArray(data);
  return (items as Array<Record<string, unknown>>)
    .map(item => ({
      id: String(
        item.reference ??
          item.id ??
          item.product_id ??
          item.productId ??
          item.code ??
          item.ref ??
          ""
      ),
      name: String(
        item.title ??
          item.name ??
          item.nom ??
          item.product_name ??
          item.productName ??
          item.produit ??
          ""
      ),
      reference:
        (item.reference ?? item.ref ?? item.sku ?? item.product_reference)
          ? String(
              item.reference ?? item.ref ?? item.sku ?? item.product_reference
            )
          : null,
      quantity: quantityFrom({
        ...item,
        quantity: item.stock_disponible ?? item.quantity,
      }),
      active:
        item.is_active !== 0 &&
        item.is_active !== false &&
        item.active !== false &&
        item.status !== false &&
        item.deleted !== true,
    }))
    .filter(item => item.id && item.name && item.active);
}

export async function fetchEcoTrackFees(settings?: EcoTrackSettings) {
  ensureToken(settings);
  const response = await fetch(`${getBaseUrl(settings)}/get/fees`, {
    headers: getHeaders(settings),
  });
  if (!response.ok)
    throw new Error(`تعذر جلب أسعار التوصيل (${response.status})`);
  const data = (await response.json()) as { livraison?: unknown[] };
  return data.livraison || [];
}

export async function fetchEcoTrackCommunes(
  wilaya: string,
  settings?: EcoTrackSettings
) {
  ensureToken(settings);
  const code = wilayaCode(wilaya);
  if (!code) throw new Error("رقم الولاية غير صالح");
  const response = await fetch(
    `${getBaseUrl(settings)}/get/communes?wilaya_id=${encodeURIComponent(code)}`,
    { headers: getHeaders(settings) }
  );
  if (!response.ok) throw new Error(`تعذر جلب البلديات (${response.status})`);
  const data = (await response.json()) as unknown;
  const record =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const items = Array.isArray(data)
    ? data
    : Array.isArray(record.data)
      ? record.data
      : Array.isArray(record.communes)
        ? record.communes
        : Object.values(record).filter(
            item => item && typeof item === "object"
          );
  return (items as Array<Record<string, unknown>>)
    .map(item => ({
      name: String(item.nom || item.name || item.commune_name || ""),
      codePostal: String(item.code_postal || item.codePostal || "") || null,
      hasStopDesk: Number(item.has_stop_desk ?? 0) === 1,
    }))
    .filter(item => item.name);
}

export async function createEcoTrackParcel(
  order: {
    leadId: string;
    price: number;
    deliveryFee?: number;
    phone: string;
    fullName?: string | null;
    wilaya?: string | null;
    commune?: string | null;
    deliveryType?: string | null;
    giftBooklet?: boolean;
    productName?: string | null;
    shippingMode: EcoTrackShippingMode;
    quantity?: number;
  },
  settings?: EcoTrackSettings
) {
  ensureToken(settings);
  const phone = normalizePhone(order.phone);
  if (!/^0[5-7]\d{8}$/.test(phone))
    throw new Error("رقم الهاتف غير صالح لـ EcoTrack");
  if (!order.wilaya || !order.commune)
    throw new Error("الولاية والبلدية مطلوبتان قبل رفع الشحنة");
  const code = wilayaCode(order.wilaya);
  if (!code) throw new Error("رقم الولاية غير صالح لـ EcoTrack");
  const supportedWilayas = await fetchEcoTrackWilayas(settings);
  if (
    supportedWilayas.length > 0 &&
    !supportedWilayas.some(item => item.id === code)
  ) {
    throw new Error(
      `شركة التوصيل الحالية لا تدعم ولاية ${order.wilaya} في EcoTrack. اطلب تفعيلها من الشركة أو اختر شركة تدعم عين قزام.`
    );
  }
  const commune = await canonicalCommuneForEcoTrack(
    order.wilaya,
    order.commune,
    settings
  );

  const params = new URLSearchParams({
    reference: order.leadId,
    nom_client: order.fullName || "زبون Atlasio",
    telephone: phone,
    adresse: `${commune.name} - ${order.wilaya}`,
    code_postal: commune.postalCode || "",
    commune: commune.name,
    code_wilaya: String(code),
    montant: String(Math.round(order.price + (order.deliveryFee || 0))),
    produit: order.productName || "باك الربيع الملكي",
    type: "1",
    stop_desk: order.deliveryType === "stop_desk" ? "1" : "0",
    stock: order.shippingMode === "stock" ? "1" : "0",
    quantite:
      order.shippingMode === "stock"
        ? String(Math.max(1, Math.floor(order.quantity || 1)))
        : "",
    remarque: `Atlasio ${order.leadId}${order.giftBooklet ? " - كتيب عناية مجاني" : ""}`,
    weight: "1",
  });
  const response = await fetch(
    `${getBaseUrl(settings)}/create/order?${params.toString()}`,
    {
      method: "POST",
      headers: { Authorization: getHeaders(settings).Authorization },
    }
  );

  const text = await response.text();
  if (!response.ok)
    throw new Error(
      `EcoTrack رفض الشحنة (${response.status}): ${text.slice(0, 240)}`
    );
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    /* text response */
  }
  const tracking =
    data.tracking ||
    data.reference ||
    (data.data as Record<string, unknown> | undefined)?.reference ||
    data.tracking_number ||
    data.order_id;
  if (!tracking)
    throw new Error("تم قبول الطلب لكن لم يصل رقم التتبع من EcoTrack");
  return String(tracking);
}

export const createEcoTrackStockParcel = (
  order: Omit<Parameters<typeof createEcoTrackParcel>[0], "shippingMode"> & {
    quantity?: number;
  },
  settings?: EcoTrackSettings
) => createEcoTrackParcel({ ...order, shippingMode: "stock" }, settings);

export const createEcoTrackNonStockParcel = (
  order: Omit<Parameters<typeof createEcoTrackParcel>[0], "shippingMode">,
  settings?: EcoTrackSettings
) =>
  createEcoTrackParcel({ ...order, shippingMode: "without_stock" }, settings);

export async function fetchEcoTrackOrders(
  settings?: EcoTrackSettings,
  page = 1
) {
  ensureToken(settings);
  const response = await fetch(
    `${getBaseUrl(settings)}/get/orders?page=${page}`,
    { headers: getHeaders(settings) }
  );
  if (!response.ok)
    throw new Error(`تعذر جلب حالات EcoTrack (${response.status})`);
  const payload = (await response.json()) as Record<string, unknown>;
  const nested =
    payload.data &&
    typeof payload.data === "object" &&
    !Array.isArray(payload.data)
      ? (payload.data as Record<string, unknown>)
      : null;
  const data = Array.isArray(payload.data)
    ? payload.data
    : Array.isArray(nested?.data)
      ? nested.data
      : Array.isArray(payload.orders)
        ? payload.orders
        : [];
  const meta =
    payload.meta && typeof payload.meta === "object"
      ? (payload.meta as Record<string, unknown>)
      : null;
  return {
    data: data as Array<Record<string, unknown>>,
    last_page:
      Number(payload.last_page ?? nested?.last_page ?? meta?.last_page ?? 1) ||
      1,
    total:
      Number(payload.total ?? nested?.total ?? meta?.total ?? data.length) ||
      data.length,
  };
}

export async function fetchEcoTrackTracking(
  tracking: string,
  settings?: EcoTrackSettings
) {
  ensureToken(settings);
  const response = await fetch(
    `${getBaseUrl(settings)}/get/tracking/info?tracking=${encodeURIComponent(tracking)}`,
    { headers: getHeaders(settings) }
  );
  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok)
    throw new Error(`تعذر جلب تتبع الشحنة (${response.status})`);
  const nested =
    payload.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : payload;
  return {
    status: nested.status || payload.status || null,
    activity: Array.isArray(nested.activity)
      ? (nested.activity as EcoTrackTrackingActivity[])
      : [],
    raw: payload,
  };
}

export async function fetchEcoTrackTrackingsInfo(
  trackings: string[],
  settings?: EcoTrackSettings
) {
  ensureToken(settings);
  const query = trackings
    .map(item => `trackings[]=${encodeURIComponent(item)}`)
    .join("&");
  const response = await fetch(
    `${getBaseUrl(settings)}/get/trackings/info?${query}`,
    { headers: getHeaders(settings) }
  );
  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok)
    throw new Error(`تعذر جلب تفاصيل الشحنات (${response.status})`);
  const data =
    payload.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : payload;
  return data;
}

export async function fetchEcoTrackUpdates(
  tracking: string,
  settings?: EcoTrackSettings
) {
  ensureToken(settings);
  const response = await fetch(
    `${getBaseUrl(settings)}/get/maj?tracking=${encodeURIComponent(tracking)}`,
    { headers: getHeaders(settings) }
  );
  const payload = (await response.json().catch(() => [])) as unknown;
  if (!response.ok)
    throw new Error(`تعذر جلب تعليقات شركة التوصيل (${response.status})`);
  if (Array.isArray(payload)) return payload as EcoTrackTrackingActivity[];
  if (payload && typeof payload === "object")
    return Object.values(payload as Record<string, unknown>).filter(
      item => item && typeof item === "object"
    ) as EcoTrackTrackingActivity[];
  return [];
}

export async function cancelEcoTrackParcel(
  tracking: string,
  settings?: EcoTrackSettings
) {
  ensureToken(settings);
  const response = await fetch(
    `${getBaseUrl(settings)}/delete/order?tracking=${encodeURIComponent(tracking)}`,
    { method: "DELETE", headers: getHeaders(settings) }
  );
  const data = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok || !(data.delete === "success" || data.success === true))
    throw new Error("تعذر إلغاء الشحنة من EcoTrack");
  return data;
}

export function normalizeEcoTrackStatus(value: unknown) {
  const status = String(value || "")
    .toLowerCase()
    .trim();
  if (/paye_et_archive|payed|paiements_prets|encaisse_non_paye/.test(status))
    return "paid";
  if (/livre_non_encaisse|livred|delivered|livr/.test(status))
    return "delivered";
  if (/retour|return|annule/.test(status))
    return status.includes("annule") ? "cancelled" : "returning";
  if (/suspendu|echec|refus|absent|failed/.test(status))
    return "failed_delivery";
  if (/en_livraison|livraison|out_for/.test(status)) return "out_for_delivery";
  if (
    /ramassage|preparation|vers_|en_hub|hub|picked|transit|transferred/.test(
      status
    )
  )
    return "in_transit";
  if (/prete_a_expedier|ready|created|pending|re[cç]u/.test(status))
    return "ready";
  return status || "unknown";
}
