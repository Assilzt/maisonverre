import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
const dashboardPassword = process.env.DASHBOARD_PASSWORD;
const sql = databaseUrl ? neon(databaseUrl) : null;

let schemaReady: Promise<unknown> | null = null;

type Request = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};

type Response = {
  status: (code: number) => Response;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

const ensureSchema = async () => {
  if (!sql) throw new Error('DATABASE_URL is not configured');
  if (!schemaReady) {
    schemaReady = sql`
      CREATE TABLE IF NOT EXISTS atlasio_orders (
        id BIGSERIAL PRIMARY KEY,
        lead_id VARCHAR(64) NOT NULL UNIQUE,
        status VARCHAR(24) NOT NULL DEFAULT 'abandoned',
        campaign VARCHAR(64) NOT NULL DEFAULT 'الرابط الأساسي',
        price INTEGER NOT NULL,
        phone VARCHAR(32) NOT NULL,
        full_name VARCHAR(160),
        wilaya VARCHAR(120),
        commune VARCHAR(160),
        source_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
  }
  await schemaReady;
};

const getBody = (body: unknown): Record<string, unknown> => {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return (body || {}) as Record<string, unknown>;
};

const headerValue = (request: Request, name: string) => {
  const value = request.headers[name] ?? request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
};

const isAdmin = (request: Request) => Boolean(dashboardPassword && headerValue(request, 'x-dashboard-password') === dashboardPassword);

export default async function handler(request: Request, response: Response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Dashboard-Password');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');

  if (request.method === 'OPTIONS') {
    response.status(204).json({});
    return;
  }

  try {
    await ensureSchema();

    if (request.method === 'GET') {
      if (!isAdmin(request)) {
        response.status(401).json({ error: 'غير مصرح' });
        return;
      }

      const orders = await sql!`
        SELECT id, lead_id, status, campaign, price, phone, full_name, wilaya, commune, source_url, created_at, updated_at
        FROM atlasio_orders
        ORDER BY created_at DESC
        LIMIT 500
      `;
      response.status(200).json({ orders });
      return;
    }

    const body = getBody(request.body);

    if (request.method === 'PATCH') {
      if (!isAdmin(request)) {
        response.status(401).json({ error: 'غير مصرح' });
        return;
      }

      const orderId = Number(body.id);
      const status = String(body.status || '');
      const allowedStatuses = ['abandoned', 'complete', 'confirmed', 'cancelled'];
      if (!Number.isInteger(orderId) || !allowedStatuses.includes(status)) {
        response.status(400).json({ error: 'بيانات الحالة غير صالحة' });
        return;
      }

      const updated = await sql!`
        UPDATE atlasio_orders
        SET status = ${status}, updated_at = NOW()
        WHERE id = ${orderId}
        RETURNING id, lead_id, status, campaign, price, phone, full_name, wilaya, commune, source_url, created_at, updated_at
      `;
      response.status(200).json({ order: updated[0] || null });
      return;
    }

    if (request.method === 'POST') {
      const phone = String(body.phone || '').trim();
      const price = Number(body.price);
      if (!phone || !Number.isFinite(price)) {
        response.status(400).json({ error: 'الهاتف والسعر مطلوبان' });
        return;
      }

      const leadId = String(body.leadId || `AT-${Date.now().toString(36).toUpperCase()}`).slice(0, 64);
      const status = body.status === 'complete' ? 'complete' : 'abandoned';
      const campaign = String(body.campaign || 'الرابط الأساسي').slice(0, 64);
      const fullName = body.fullName ? String(body.fullName).slice(0, 160) : null;
      const wilaya = body.wilaya ? String(body.wilaya).slice(0, 120) : null;
      const commune = body.commune ? String(body.commune).slice(0, 160) : null;
      const sourceUrl = body.sourceUrl ? String(body.sourceUrl).slice(0, 1000) : null;

      const saved = await sql!`
        INSERT INTO atlasio_orders (lead_id, status, campaign, price, phone, full_name, wilaya, commune, source_url)
        VALUES (${leadId}, ${status}, ${campaign}, ${price}, ${phone}, ${fullName}, ${wilaya}, ${commune}, ${sourceUrl})
        ON CONFLICT (lead_id) DO UPDATE SET
          status = EXCLUDED.status,
          campaign = EXCLUDED.campaign,
          price = EXCLUDED.price,
          phone = EXCLUDED.phone,
          full_name = EXCLUDED.full_name,
          wilaya = EXCLUDED.wilaya,
          commune = EXCLUDED.commune,
          source_url = EXCLUDED.source_url,
          updated_at = NOW()
        RETURNING id, lead_id, status, campaign, price, phone, full_name, wilaya, commune, source_url, created_at, updated_at
      `;
      response.status(200).json({ order: saved[0] });
      return;
    }

    response.status(405).json({ error: 'الطريقة غير مدعومة' });
  } catch (error) {
    console.error('Atlasio orders API error', error);
    response.status(500).json({ error: 'تعذر حفظ الطلب حالياً' });
  }
}

export const config = {
  runtime: 'nodejs',
};

export { isAdmin };

