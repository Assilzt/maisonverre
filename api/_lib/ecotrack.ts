export type EcoTrackSettings = { provider?: string | null; token?: string | null };

const envProvider = process.env.ECOTRACK_PROVIDER || 'navexdelivery';
const envToken = process.env.ECOTRACK_API_TOKEN || '';

const getConfig = (settings?: EcoTrackSettings) => ({
  provider: String(settings?.provider || envProvider).trim(),
  token: String(settings?.token || envToken).trim(),
});

const getHeaders = (settings?: EcoTrackSettings) => {
  const { token } = getConfig(settings);
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
};

const getBaseUrl = (settings?: EcoTrackSettings) => `https://${getConfig(settings).provider}.ecotrack.dz/api/v1`;

const ensureToken = (settings?: EcoTrackSettings) => {
  if (!getConfig(settings).token) throw new Error('ECOTRACK_API_TOKEN غير مضبوط في إعدادات لوحة التحكم');
};

const normalizePhone = (value: string) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('213') && digits.length === 12) return `0${digits.slice(3)}`;
  if (digits.length === 9) return `0${digits}`;
  return digits;
};

const officialToEcoTrack: Record<number, number> = {
  49: 57, 50: 58, 51: 51, 52: 50, 53: 52, 54: 49, 55: 55, 56: 56, 57: 53, 58: 54,
};

const normalizeLocationText = (value: string) => String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[إأآا]/g, 'ا').replace(/[يى]/g, 'ي').replace(/[ة]/g, 'ه').replace(/[\s_-]+/g, ' ');
const locationAliases: Record<string, string> = {
  'عين قزام': 'in guezzam',
  'إن قزام': 'in guezzam',
  'ain guezzam': 'in guezzam',
  'in guezzam': 'in guezzam',
};
const canonicalLocationText = (value: string) => locationAliases[normalizeLocationText(value)] || normalizeLocationText(value);

const wilayaCode = (value: string) => {
  const raw = String(value || '');
  const match = raw.match(/^\s*(\d{1,2})/);
  const normalized = canonicalLocationText(raw.replace(/^\s*\d{1,2}\s*[-–:]?\s*/, ''));
  if (normalized === 'in guezzam') return 54;
  const official = match ? Number(match[1]) : Number(raw);
  if (!Number.isInteger(official) || official < 1 || official > 58) return null;
  return officialToEcoTrack[official] || official;
};

const canonicalCommuneForEcoTrack = async (wilaya: string, commune: string, settings?: EcoTrackSettings) => {
  const code = wilayaCode(wilaya);
  const communes = await fetchEcoTrackCommunes(wilaya, settings);
  const selected = canonicalLocationText(commune);
  const match = communes.find((item) => canonicalLocationText(item.name) === selected);
  if (!match) throw new Error(`البلدية «${commune}» غير متاحة في EcoTrack لولاية ${wilaya}`);
  return { name: match.name, code, postalCode: match.codePostal };
};

export async function fetchEcoTrackWilayas(settings?: EcoTrackSettings) {
  ensureToken(settings);
  const response = await fetch(`${getBaseUrl(settings)}/get/wilayas`, { headers: getHeaders(settings) });
  if (!response.ok) throw new Error(`تعذر جلب قائمة الولايات (${response.status})`);
  const data = await response.json() as unknown;
  const items = Array.isArray(data) ? data : ((data as { data?: unknown[]; wilayas?: unknown[] })?.data || (data as { wilayas?: unknown[] })?.wilayas || []);
  return (items as Array<Record<string, unknown>>).map((item) => ({ id: Number(item.wilaya_id ?? item.id ?? item.code), name: String(item.wilaya_name ?? item.nom ?? item.name ?? '') })).filter((item) => Number.isInteger(item.id) && item.id > 0);
}

export type EcoTrackProduct = { id: string; name: string; reference: string | null; quantity: number; active: boolean };

export async function fetchEcoTrackProducts(settings?: EcoTrackSettings) {
  ensureToken(settings);
  const response = await fetch(`${getBaseUrl(settings)}/get/products/list`, { headers: getHeaders(settings) });
  if (!response.ok) throw new Error(`تعذر جلب منتجات المخزون (${response.status})`);
  const data = await response.json() as unknown;
  const items = Array.isArray(data) ? data : ((data as { products?: unknown[]; data?: unknown[] })?.products || (data as { data?: unknown[] })?.data || []);
  return (items as Array<Record<string, unknown>>).map((item) => ({
    id: String(item.id ?? item.product_id ?? item.reference ?? item.ref ?? ''),
    name: String(item.name ?? item.nom ?? item.product_name ?? item.produit ?? ''),
    reference: item.reference ?? item.ref ?? item.sku ? String(item.reference ?? item.ref ?? item.sku) : null,
    quantity: Math.max(0, Number(item.quantity ?? item.stock ?? item.qty ?? 0) || 0),
    active: item.active !== false && item.is_active !== false,
  })).filter((item) => item.id && item.name && item.active);
}

export async function fetchEcoTrackFees(settings?: EcoTrackSettings) {
  ensureToken(settings);
  const response = await fetch(`${getBaseUrl(settings)}/get/fees`, { headers: getHeaders(settings) });
  if (!response.ok) throw new Error(`تعذر جلب أسعار التوصيل (${response.status})`);
  const data = await response.json() as { livraison?: unknown[] };
  return data.livraison || [];
}

export async function fetchEcoTrackCommunes(wilaya: string, settings?: EcoTrackSettings) {
  ensureToken(settings);
  const code = wilayaCode(wilaya);
  if (!code) throw new Error('رقم الولاية غير صالح');
  const response = await fetch(`${getBaseUrl(settings)}/get/communes/${code}`, { headers: getHeaders(settings) });
  if (!response.ok) throw new Error(`تعذر جلب البلديات (${response.status})`);
  const data = await response.json() as unknown;
  const items = Array.isArray(data) ? data : ((data as { data?: unknown[]; communes?: unknown[] })?.data || (data as { communes?: unknown[] })?.communes || []);
  return (items as Array<Record<string, unknown>>).map((item) => ({
    name: String(item.nom || item.name || item.commune_name || ''),
    codePostal: String(item.code_postal || item.codePostal || '') || null,
    hasStopDesk: Number(item.has_stop_desk ?? 0) === 1,
  })).filter((item) => item.name);
}

export async function createEcoTrackParcel(order: {
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
  shipFromStock?: boolean;
}, settings?: EcoTrackSettings) {
  ensureToken(settings);
  const phone = normalizePhone(order.phone);
  if (!/^0[5-7]\d{8}$/.test(phone)) throw new Error('رقم الهاتف غير صالح لـ EcoTrack');
  if (!order.wilaya || !order.commune) throw new Error('الولاية والبلدية مطلوبتان قبل رفع الشحنة');
  const code = wilayaCode(order.wilaya);
  if (!code) throw new Error('رقم الولاية غير صالح لـ EcoTrack');
  const supportedWilayas = await fetchEcoTrackWilayas(settings);
  if (supportedWilayas.length > 0 && !supportedWilayas.some((item) => item.id === code)) {
    throw new Error(`شركة التوصيل الحالية لا تدعم ولاية ${order.wilaya} في EcoTrack. اطلب تفعيلها من الشركة أو اختر شركة تدعم عين قزام.`);
  }
  const commune = await canonicalCommuneForEcoTrack(order.wilaya, order.commune, settings);

  const response = await fetch(`${getBaseUrl(settings)}/create/order`, {
    method: 'POST',
    headers: getHeaders(settings),
    body: JSON.stringify({
      reference: order.leadId,
      nom_client: order.fullName || 'زبون Atlasio',
      telephone: phone,
      adresse: `${commune.name} - ${order.wilaya}`,
      commune: commune.name,
      code_wilaya: code,
      montant: Math.round(order.price + (order.deliveryFee || 0)),
      produit: order.productName || 'باك الربيع الملكي',
      type: 1,
      stop_desk: order.deliveryType === 'stop_desk' ? 1 : 0,
      stock: order.shipFromStock === false ? 0 : 1,
      remarque: `Atlasio ${order.leadId}${order.giftBooklet ? ' - كتيب عناية مجاني' : ''}`,
      poids: 1,
    }),
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`EcoTrack رفض الشحنة (${response.status}): ${text.slice(0, 240)}`);
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(text) as Record<string, unknown>; } catch { /* text response */ }
  const tracking = data.tracking || data.reference || (data.data as Record<string, unknown> | undefined)?.reference || data.tracking_number || data.order_id;
  if (!tracking) throw new Error('تم قبول الطلب لكن لم يصل رقم التتبع من EcoTrack');
  return String(tracking);
}

export async function fetchEcoTrackOrders(settings?: EcoTrackSettings) {
  ensureToken(settings);
  const response = await fetch(`${getBaseUrl(settings)}/get/orders?page=1&limit=100`, { headers: getHeaders(settings) });
  if (!response.ok) throw new Error(`تعذر جلب حالات EcoTrack (${response.status})`);
  return response.json() as Promise<{ data?: Array<Record<string, unknown>> }>;
}

export async function cancelEcoTrackParcel(tracking: string, settings?: EcoTrackSettings) {
  ensureToken(settings);
  const response = await fetch(`${getBaseUrl(settings)}/delete/order?tracking=${encodeURIComponent(tracking)}`, { method: 'DELETE', headers: getHeaders(settings) });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok || data.delete !== 'success') throw new Error('تعذر إلغاء الشحنة من EcoTrack');
  return data;
}

export function normalizeEcoTrackStatus(value: unknown) {
  const status = String(value || '').toLowerCase().trim();
  if (/retour|return|cancel|annul|echec|refus|absent/.test(status)) return 'returned';
  if (/livr|delivered|encaiss|pay/.test(status)) return 'delivered';
  if (/cours|transit|hub|picked|ramass/.test(status)) return 'in_transit';
  if (/pr[eê]t|ready/.test(status)) return 'ready';
  return status || 'unknown';
}
