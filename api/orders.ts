import { neon } from '@neondatabase/serverless';
import {
  cancelEcoTrackParcel,
  createEcoTrackParcel,
  fetchEcoTrackCommunes,
  fetchEcoTrackFees,
  fetchEcoTrackOrders,
  normalizeEcoTrackStatus,
} from './_lib/ecotrack.js';

const databaseUrl = process.env.DATABASE_URL;
const dashboardPassword = process.env.DASHBOARD_PASSWORD;
const sql = databaseUrl ? neon(databaseUrl) : null;
let schemaReady: Promise<unknown> | null = null;

type Request = { method?: string; body?: unknown; query?: Record<string, string | string[] | undefined>; headers: Record<string, string | string[] | undefined> };
type Response = { status: (code: number) => Response; json: (body: unknown) => void; setHeader: (name: string, value: string) => void };

type OrderRow = {
  id: number; lead_id: string; status: string; campaign: string; price: number; delivery_fee: number; delivery_type: string | null;
  phone: string; full_name: string | null; wilaya: string | null; commune: string | null; source_url: string | null;
  ecotrack_tracking: string | null; ecotrack_status: string | null; status_before_trash: string | null; trashed_at: string | null; created_at: string; updated_at: string;
};

const selectColumns = `id, lead_id, status, campaign, price, delivery_fee, delivery_type, phone, full_name, wilaya, commune, source_url, ecotrack_tracking, ecotrack_status, status_before_trash, trashed_at, created_at, updated_at`;
const ecoToOfficialWilaya: Record<number, number> = { 57: 49, 58: 50, 51: 51, 50: 52, 52: 53, 49: 54, 55: 55, 56: 56, 53: 57, 54: 58 };

const ensureSchema = async () => {
  if (!sql) throw new Error('DATABASE_URL is not configured');
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql!`
        CREATE TABLE IF NOT EXISTS atlasio_orders (
          id BIGSERIAL PRIMARY KEY,
          lead_id VARCHAR(64) NOT NULL UNIQUE,
          status VARCHAR(24) NOT NULL DEFAULT 'abandoned',
          campaign VARCHAR(64) NOT NULL DEFAULT 'الرابط الأساسي',
          price INTEGER NOT NULL,
          delivery_fee INTEGER NOT NULL DEFAULT 0,
          delivery_type VARCHAR(24),
          phone VARCHAR(32) NOT NULL,
          full_name VARCHAR(160),
          wilaya VARCHAR(120),
          commune VARCHAR(160),
          source_url TEXT,
          ecotrack_tracking VARCHAR(120),
          ecotrack_status VARCHAR(120),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS delivery_fee INTEGER NOT NULL DEFAULT 0`;
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(24)`;
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS ecotrack_tracking VARCHAR(120)`;
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS ecotrack_status VARCHAR(120)`;
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS status_before_trash VARCHAR(24)`;
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS trashed_at TIMESTAMPTZ`;
      await sql!`
        CREATE TABLE IF NOT EXISTS atlasio_settings (
          key VARCHAR(64) PRIMARY KEY,
          value TEXT NOT NULL DEFAULT '',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql!`INSERT INTO atlasio_settings (key, value) VALUES ('ecotrack_provider', 'navexdelivery') ON CONFLICT (key) DO NOTHING`;
      await sql!`INSERT INTO atlasio_settings (key, value) VALUES ('ecotrack_token', '') ON CONFLICT (key) DO NOTHING`;
      await sql!`INSERT INTO atlasio_settings (key, value) VALUES ('delivery_fees', '{}') ON CONFLICT (key) DO NOTHING`;
    })();
  }
  await schemaReady;
};

const getBody = (body: unknown): Record<string, unknown> => {
  if (typeof body === 'string') { try { return JSON.parse(body) as Record<string, unknown>; } catch { return {}; } }
  return (body || {}) as Record<string, unknown>;
};

const headerValue = (request: Request, name: string) => {
  const value = request.headers[name] ?? request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
};

const isAdmin = (request: Request) => Boolean(dashboardPassword && headerValue(request, 'x-dashboard-password') === dashboardPassword);
const queryValue = (request: Request, name: string) => {
  const value = request.query?.[name];
  return Array.isArray(value) ? value[0] : value;
};

const loadEcoSettings = async () => {
  const rows = await sql!`SELECT key, value FROM atlasio_settings WHERE key IN ('ecotrack_provider', 'ecotrack_token', 'delivery_fees')` as Array<{ key: string; value: string }>;
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  let deliveryFees: Record<string, { home: number; stopDesk: number }> = {};
  try { deliveryFees = JSON.parse(values.delivery_fees || '{}') as Record<string, { home: number; stopDesk: number }>; } catch { deliveryFees = {}; }
  return { provider: values.ecotrack_provider || process.env.ECOTRACK_PROVIDER || 'navexdelivery', token: values.ecotrack_token || process.env.ECOTRACK_API_TOKEN || '', deliveryFees };
};

const rowById = async (id: number) => {
  const result = await sql!`SELECT ${sql!.unsafe(selectColumns)} FROM atlasio_orders WHERE id = ${id} LIMIT 1`;
  return result[0] as OrderRow | undefined;
};

export default async function handler(request: Request, response: Response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Dashboard-Password');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  if (request.method === 'OPTIONS') { response.status(204).json({}); return; }

  try {
    await ensureSchema();

    if (request.method === 'GET') {
      const resource = queryValue(request, 'resource');
      const ecoSettings = await loadEcoSettings();
      if (resource === 'settings') {
        if (!isAdmin(request)) { response.status(401).json({ error: 'غير مصرح' }); return; }
        response.status(200).json({ provider: ecoSettings.provider, tokenConfigured: Boolean(ecoSettings.token), deliveryFees: ecoSettings.deliveryFees });
        return;
      }
      if (resource === 'fees') {
        const toNumber = (value: unknown) => { const number = Number(value); return Number.isFinite(number) ? number : 0; };
        const getWilayaId = (fee: Record<string, unknown>) => {
          const raw = fee.wilaya_id ?? fee.code_wilaya ?? fee.wilaya ?? fee.code ?? fee.id;
          const match = String(raw ?? '').match(/\d{1,2}/);
          const ecoId = match ? Number(match[0]) : 0;
          return ecoToOfficialWilaya[ecoId] || ecoId;
        };
        let fees: Array<{ wilaya_id: number; tarif: number; tarif_stopdesk: number }> = [];
        try {
          const rawFees = await fetchEcoTrackFees(ecoSettings) as Array<Record<string, unknown>>;
          fees = rawFees.map((fee) => ({
            wilaya_id: getWilayaId(fee),
            tarif: toNumber(fee.tarif ?? fee.price ?? fee.home ?? fee.tarif_domicile ?? fee.tarif_home ?? fee.delivery_fee),
            tarif_stopdesk: toNumber(fee.tarif_stopdesk ?? fee.stop_desk ?? fee.stopdesk ?? fee.price_stopdesk ?? fee.tarif_bureau ?? fee.price ?? fee.tarif ?? fee.home),
          })).filter((fee) => fee.wilaya_id > 0);
        } catch (feeError) { console.warn('EcoTrack fees unavailable; using dashboard overrides', feeError); }
        const merged = new Map(fees.map((fee) => [fee.wilaya_id, fee]));
        for (const [key, value] of Object.entries(ecoSettings.deliveryFees)) {
          const wilayaId = Number(key); if (!Number.isInteger(wilayaId)) continue;
          merged.set(wilayaId, { wilaya_id: wilayaId, tarif: toNumber(value.home), tarif_stopdesk: toNumber(value.stopDesk || value.home) });
        }
        response.status(200).json({ fees: Array.from(merged.values()) });
        return;
      }
      if (resource === 'communes') {
        const wilaya = queryValue(request, 'wilaya');
        if (!wilaya) { response.status(400).json({ error: 'الولاية مطلوبة' }); return; }
        response.status(200).json({ communes: await fetchEcoTrackCommunes(wilaya, ecoSettings) });
        return;
      }
      if (!isAdmin(request)) { response.status(401).json({ error: 'غير مصرح' }); return; }
      if (resource === 'sync') {
        const remote = await fetchEcoTrackOrders(ecoSettings);
        const parcels = remote.data || [];
        let synced = 0;
        for (const parcel of parcels) {
          const tracking = String(parcel.tracking || parcel.tracking_number || '');
          const reference = String(parcel.reference || '');
          if (!tracking && !reference) continue;
          const matches = tracking
            ? await sql!`SELECT id FROM atlasio_orders WHERE ecotrack_tracking = ${tracking} OR lead_id = ${reference} LIMIT 1`
            : await sql!`SELECT id FROM atlasio_orders WHERE lead_id = ${reference} LIMIT 1`;
          if (!matches[0]) continue;
          const normalized = normalizeEcoTrackStatus(parcel.status);
          const nextStatus = normalized === 'delivered' ? 'delivered' : normalized === 'returned' ? 'returned' : undefined;
          if (nextStatus) {
            await sql!`UPDATE atlasio_orders SET ecotrack_tracking = COALESCE(NULLIF(${tracking}, ''), ecotrack_tracking), ecotrack_status = ${String(parcel.status || '')}, status = CASE WHEN status = 'trashed' THEN status ELSE ${nextStatus} END, updated_at = NOW() WHERE id = ${Number(matches[0].id)}`;
          } else {
            await sql!`UPDATE atlasio_orders SET ecotrack_tracking = COALESCE(NULLIF(${tracking}, ''), ecotrack_tracking), ecotrack_status = ${String(parcel.status || '')}, updated_at = NOW() WHERE id = ${Number(matches[0].id)}`;
          }
          synced += 1;
        }
        response.status(200).json({ synced, total: parcels.length });
        return;
      }
      const orders = await sql!`SELECT ${sql!.unsafe(selectColumns)} FROM atlasio_orders ORDER BY created_at DESC LIMIT 500`;
      response.status(200).json({ orders });
      return;
    }

    const body = getBody(request.body);

    if (request.method === 'PATCH') {
      if (!isAdmin(request)) { response.status(401).json({ error: 'غير مصرح' }); return; }

      if (body.action === 'edit') {
        const orderId = Number(body.id);
        const order = await rowById(orderId);
        if (!order) { response.status(404).json({ error: 'الطلب غير موجود' }); return; }
        if (order.ecotrack_tracking || order.status === 'shipped' || order.status === 'delivered' || order.status === 'returned') {
          response.status(409).json({ error: 'لا يمكن تعديل طلب تم رفعه إلى شركة التوصيل' }); return;
        }
        const phone = String(body.phone || '').replace(/\D/g, '');
        const fullName = String(body.fullName || '').trim();
        const wilaya = String(body.wilaya || '').trim();
        const commune = String(body.commune || '').trim();
        if (!/^0[5-7]\d{8}$/.test(phone) || !wilaya || !commune) { response.status(400).json({ error: 'الهاتف والولاية والبلدية مطلوبة بشكل صحيح' }); return; }
        const deliveryFee = Number(body.deliveryFee || order.delivery_fee || 0);
        const deliveryType = body.deliveryType ? String(body.deliveryType).slice(0, 24) : order.delivery_type;
        const updated = await sql!`UPDATE atlasio_orders SET phone = ${phone}, full_name = ${fullName || null}, wilaya = ${wilaya}, commune = ${commune}, delivery_fee = ${deliveryFee}, delivery_type = ${deliveryType}, updated_at = NOW() WHERE id = ${orderId} RETURNING ${sql!.unsafe(selectColumns)}`;
        response.status(200).json({ order: updated[0], message: 'تم تعديل بيانات الطلب' });
        return;
      }

      if (body.resource === 'settings') {
        const provider = String(body.provider || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
        const token = String(body.token || '').trim();
        if (!provider) { response.status(400).json({ error: 'اسم الشركة مطلوب' }); return; }
        await sql!`INSERT INTO atlasio_settings (key, value) VALUES ('ecotrack_provider', ${provider}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
        if (token) await sql!`INSERT INTO atlasio_settings (key, value) VALUES ('ecotrack_token', ${token}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
        if (body.deliveryFees && typeof body.deliveryFees === 'object') {
          const fees = JSON.stringify(body.deliveryFees);
          if (fees.length > 20000) { response.status(400).json({ error: 'بيانات أسعار التوصيل كبيرة جداً' }); return; }
          await sql!`INSERT INTO atlasio_settings (key, value) VALUES ('delivery_fees', ${fees}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
        }
        const currentSettings = await loadEcoSettings();
        response.status(200).json({ provider: currentSettings.provider, tokenConfigured: Boolean(currentSettings.token), deliveryFees: currentSettings.deliveryFees });
        return;
      }

      const ecoSettings = await loadEcoSettings();
      if (body.action === 'trash') {
        const orderId = Number(body.id);
        const order = await rowById(orderId);
        if (!order) { response.status(404).json({ error: 'الطلب غير موجود' }); return; }
        if (order.status === 'trashed') { response.status(200).json({ order, message: 'الطلب موجود مسبقاً في سلة المهملات' }); return; }
        const updated = await sql!`UPDATE atlasio_orders SET status = 'trashed', status_before_trash = ${order.status}, trashed_at = NOW(), updated_at = NOW() WHERE id = ${orderId} RETURNING ${sql!.unsafe(selectColumns)}`;
        response.status(200).json({ order: updated[0], message: 'تم نقل الطلب إلى سلة المهملات' }); return;
      }
      if (body.action === 'restore') {
        const orderId = Number(body.id);
        const order = await rowById(orderId);
        if (!order) { response.status(404).json({ error: 'الطلب غير موجود' }); return; }
        if (order.status !== 'trashed') { response.status(409).json({ error: 'الطلب ليس في سلة المهملات' }); return; }
        const restoredStatus = ['abandoned', 'complete', 'confirmed', 'not_responding', 'cancelled', 'shipped', 'delivered', 'returned'].includes(order.status_before_trash || '') ? order.status_before_trash : 'abandoned';
        const updated = await sql!`UPDATE atlasio_orders SET status = ${restoredStatus}, status_before_trash = NULL, trashed_at = NULL, updated_at = NOW() WHERE id = ${orderId} RETURNING ${sql!.unsafe(selectColumns)}`;
        response.status(200).json({ order: updated[0], message: 'تم استرجاع الطلب من سلة المهملات' }); return;
      }
      if (body.action === 'ship') {
        const orderId = Number(body.id);
        const order = await rowById(orderId);
        if (!order) { response.status(404).json({ error: 'الطلب غير موجود' }); return; }
        if (order.status !== 'confirmed') { response.status(409).json({ error: 'يمكن شحن الطلبات المؤكدة فقط' }); return; }
        if (order.ecotrack_tracking) { response.status(200).json({ order, message: 'الشحنة مرفوعة مسبقاً' }); return; }
        const tracking = await createEcoTrackParcel({ leadId: order.lead_id, price: order.price, deliveryFee: order.delivery_fee, phone: order.phone, fullName: order.full_name, wilaya: order.wilaya, commune: order.commune, deliveryType: order.delivery_type }, ecoSettings);
        const updated = await sql!`UPDATE atlasio_orders SET status = 'shipped', ecotrack_tracking = ${tracking}, ecotrack_status = 'created', updated_at = NOW() WHERE id = ${orderId} RETURNING ${sql!.unsafe(selectColumns)}`;
        response.status(200).json({ order: updated[0], message: 'تم رفع الشحنة إلى EcoTrack' }); return;
      }
      if (body.action === 'unship') {
        const orderId = Number(body.id);
        const order = await rowById(orderId);
        if (!order) { response.status(404).json({ error: 'الطلب غير موجود' }); return; }
        if (!order.ecotrack_tracking) { response.status(409).json({ error: 'الطلب غير مرفوع إلى EcoTrack' }); return; }
        await cancelEcoTrackParcel(order.ecotrack_tracking, ecoSettings);
        const updated = await sql!`UPDATE atlasio_orders SET status = 'confirmed', ecotrack_tracking = NULL, ecotrack_status = 'cancelled', updated_at = NOW() WHERE id = ${orderId} RETURNING ${sql!.unsafe(selectColumns)}`;
        response.status(200).json({ order: updated[0], message: 'تم إلغاء رفع الشحنة وإعادتها إلى المؤكدة' }); return;
      }
      if (body.action === 'shipAll') {
        const confirmed = await sql!`SELECT ${sql!.unsafe(selectColumns)} FROM atlasio_orders WHERE status = 'confirmed' AND ecotrack_tracking IS NULL ORDER BY created_at ASC` as OrderRow[];
        const results: Array<{ leadId: string; tracking?: string; error?: string }> = [];
        for (const order of confirmed) {
          try {
            const tracking = await createEcoTrackParcel({ leadId: order.lead_id, price: order.price, deliveryFee: order.delivery_fee, phone: order.phone, fullName: order.full_name, wilaya: order.wilaya, commune: order.commune, deliveryType: order.delivery_type }, ecoSettings);
            await sql!`UPDATE atlasio_orders SET status = 'shipped', ecotrack_tracking = ${tracking}, ecotrack_status = 'created', updated_at = NOW() WHERE id = ${order.id}`;
            results.push({ leadId: order.lead_id, tracking });
          } catch (shipError) { results.push({ leadId: order.lead_id, error: shipError instanceof Error ? shipError.message : 'فشل الرفع' }); }
        }
        response.status(200).json({ shipped: results.filter((item) => item.tracking).length, failed: results.filter((item) => item.error).length, results }); return;
      }

      const orderId = Number(body.id);
      const status = String(body.status || '');
      const allowedStatuses = ['abandoned', 'complete', 'confirmed', 'not_responding', 'cancelled', 'shipped', 'delivered', 'returned'];
      if (!Number.isInteger(orderId) || !allowedStatuses.includes(status)) { response.status(400).json({ error: 'بيانات الحالة غير صالحة' }); return; }
      const order = await rowById(orderId);
      if (!order) { response.status(404).json({ error: 'الطلب غير موجود' }); return; }
      if (status === 'cancelled' && order.ecotrack_tracking) { response.status(409).json({ error: 'استخدم زر إلغاء الرفع أولاً قبل إلغاء الطلب' }); return; }
      const updated = await sql!`UPDATE atlasio_orders SET status = ${status}, updated_at = NOW() WHERE id = ${orderId} RETURNING ${sql!.unsafe(selectColumns)}`;
      response.status(200).json({ order: updated[0], message: 'تم تحديث حالة الطلب' });
      return;
    }

    if (request.method === 'POST') {
      const phone = String(body.phone || '').trim();
      const price = Number(body.price);
      if (!phone || !Number.isFinite(price)) { response.status(400).json({ error: 'الهاتف والسعر مطلوبان' }); return; }
      const leadId = String(body.leadId || `AT-${Date.now().toString(36).toUpperCase()}`).slice(0, 64);
      const status = body.status === 'complete' ? 'complete' : 'abandoned';
      const campaign = String(body.campaign || 'الرابط الأساسي').slice(0, 64);
      const deliveryFee = Number(body.deliveryFee || 0);
      const deliveryType = body.deliveryType ? String(body.deliveryType).slice(0, 24) : null;
      const fullName = body.fullName ? String(body.fullName).slice(0, 160) : null;
      const wilaya = body.wilaya ? String(body.wilaya).slice(0, 120) : null;
      const commune = body.commune ? String(body.commune).slice(0, 160) : null;
      const sourceUrl = body.sourceUrl ? String(body.sourceUrl).slice(0, 1000) : null;
      const saved = await sql!`
        INSERT INTO atlasio_orders (lead_id, status, campaign, price, delivery_fee, delivery_type, phone, full_name, wilaya, commune, source_url)
        VALUES (${leadId}, ${status}, ${campaign}, ${price}, ${deliveryFee}, ${deliveryType}, ${phone}, ${fullName}, ${wilaya}, ${commune}, ${sourceUrl})
        ON CONFLICT (lead_id) DO UPDATE SET status = EXCLUDED.status, campaign = EXCLUDED.campaign, price = EXCLUDED.price, delivery_fee = EXCLUDED.delivery_fee, delivery_type = EXCLUDED.delivery_type, phone = EXCLUDED.phone, full_name = EXCLUDED.full_name, wilaya = EXCLUDED.wilaya, commune = EXCLUDED.commune, source_url = EXCLUDED.source_url, updated_at = NOW()
        RETURNING ${sql!.unsafe(selectColumns)}
      `;
      response.status(200).json({ order: saved[0] });
      return;
    }

    response.status(405).json({ error: 'الطريقة غير مدعومة' });
  } catch (error) {
    console.error('Atlasio orders API error', error);
    response.status(500).json({ error: error instanceof Error ? error.message : 'تعذر تنفيذ العملية حالياً' });
  }
}

export const config = { runtime: 'nodejs' };
export { isAdmin };
