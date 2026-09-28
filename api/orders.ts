import { neon } from "@neondatabase/serverless";
import { createHash } from "node:crypto";
import {
  cancelEcoTrackParcel,
  createEcoTrackNonStockParcel,
  createEcoTrackStockParcel,
  fetchEcoTrackCommunes,
  fetchEcoTrackFees,
  fetchEcoTrackOrders,
  fetchEcoTrackTracking,
  fetchEcoTrackTrackingsInfo,
  fetchEcoTrackUpdates,
  fetchEcoTrackProducts,
  normalizeEcoTrackStatus,
} from "./_lib/ecotrack.js";

const databaseUrl = process.env.DATABASE_URL;
const dashboardPassword = process.env.DASHBOARD_PASSWORD;
const sql = databaseUrl ? neon(databaseUrl) : null;
let schemaReady: Promise<unknown> | null = null;

type Request = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
};
type Response = {
  status: (code: number) => Response;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

type ShippingProvider = {
  id: string;
  name: string;
  provider: string;
  token: string;
  deliveryFees: Record<string, { home: number; stopDesk: number }>;
};

type StockProduct = {
  id: number;
  name: string;
  sku: string | null;
  quantity: number;
  active: boolean;
  provider_product_id?: string | null;
  created_at: string;
  updated_at: string;
};

type OrderRow = {
  id: number;
  lead_id: string;
  status: string;
  campaign: string;
  price: number;
  delivery_fee: number;
  delivery_type: string | null;
  phone: string;
  full_name: string | null;
  wilaya: string | null;
  commune: string | null;
  source_url: string | null;
  ecotrack_tracking: string | null;
  ecotrack_status: string | null;
  gift_booklet: boolean;
  shipping_provider_id: string | null;
  shipping_provider_name: string | null;
  stock_product_id: number | null;
  stock_product_name: string | null;
  ship_from_stock: boolean;
  status_before_trash: string | null;
  trashed_at: string | null;
  created_at: string;
  updated_at: string;
  confirmation_status: string;
  contact_result: string;
  contact_attempts: number;
  last_contacted_at: string | null;
  follow_up_at: string | null;
  shipment_status: string;
  payment_status: string;
  ecotrack_driver: string | null;
  ecotrack_driver_phone: string | null;
  ecotrack_desk_phone: string | null;
  ecotrack_station: string | null;
  ecotrack_last_note: string | null;
  ecotrack_last_activity_at: string | null;
  ecotrack_last_synced_at: string | null;
};

const selectColumns = `id, lead_id, status, campaign, price, delivery_fee, delivery_type, phone, full_name, wilaya, commune, source_url, ecotrack_tracking, ecotrack_status, ecotrack_driver, ecotrack_driver_phone, ecotrack_desk_phone, ecotrack_station, ecotrack_last_note, ecotrack_last_activity_at, ecotrack_last_synced_at, gift_booklet, shipping_provider_id, shipping_provider_name, stock_product_id, stock_product_name, ship_from_stock, status_before_trash, trashed_at, confirmation_status, contact_result, contact_attempts, last_contacted_at, follow_up_at, shipment_status, payment_status, created_at, updated_at`;
const ecoToOfficialWilaya: Record<number, number> = {
  57: 49,
  58: 50,
  51: 51,
  50: 52,
  52: 53,
  49: 54,
  55: 55,
  56: 56,
  53: 57,
  54: 58,
};

const ensureSchema = async () => {
  if (!sql) throw new Error("DATABASE_URL is not configured");
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
          gift_booklet BOOLEAN NOT NULL DEFAULT FALSE,
          shipping_provider_id VARCHAR(64),
          shipping_provider_name VARCHAR(160),
          stock_product_id BIGINT,
          stock_product_name VARCHAR(160),
          ship_from_stock BOOLEAN NOT NULL DEFAULT TRUE,
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
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS gift_booklet BOOLEAN NOT NULL DEFAULT FALSE`;
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS shipping_provider_id VARCHAR(64)`;
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS shipping_provider_name VARCHAR(160)`;
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS stock_product_id BIGINT`;
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS stock_product_name VARCHAR(160)`;
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS ship_from_stock BOOLEAN NOT NULL DEFAULT TRUE`;
      await sql!`CREATE TABLE IF NOT EXISTS atlasio_stock_products (id BIGSERIAL PRIMARY KEY, name VARCHAR(160) NOT NULL, sku VARCHAR(80), quantity INTEGER NOT NULL DEFAULT 0, active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS status_before_trash VARCHAR(24)`;
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS trashed_at TIMESTAMPTZ`;
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS confirmation_status VARCHAR(32) NOT NULL DEFAULT 'pending'`;
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS contact_result VARCHAR(32) NOT NULL DEFAULT 'not_contacted'`;
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS contact_attempts INTEGER NOT NULL DEFAULT 0`;
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ`;
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ`;
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS shipment_status VARCHAR(32) NOT NULL DEFAULT 'not_ready'`;
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(32) NOT NULL DEFAULT 'cash_on_delivery'`;
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS ecotrack_driver VARCHAR(160)`;
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS ecotrack_driver_phone VARCHAR(32)`;
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS ecotrack_desk_phone VARCHAR(32)`;
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS ecotrack_station VARCHAR(160)`;
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS ecotrack_last_note TEXT`;
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS ecotrack_last_activity_at TIMESTAMPTZ`;
      await sql!`ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS ecotrack_last_synced_at TIMESTAMPTZ`;
      await sql!`CREATE TABLE IF NOT EXISTS atlasio_order_events (id BIGSERIAL PRIMARY KEY, order_id BIGINT NOT NULL, event_type VARCHAR(64) NOT NULL, from_value VARCHAR(64), to_value VARCHAR(64), message TEXT NOT NULL, metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await sql!`CREATE INDEX IF NOT EXISTS atlasio_order_events_order_id_idx ON atlasio_order_events (order_id, created_at DESC)`;
      await sql!`CREATE TABLE IF NOT EXISTS atlasio_shipment_updates (id BIGSERIAL PRIMARY KEY, order_id BIGINT NOT NULL, tracking VARCHAR(120) NOT NULL, source VARCHAR(24) NOT NULL, status VARCHAR(80), reason TEXT, details TEXT, station VARCHAR(160), driver VARCHAR(160), driver_phone VARCHAR(32), desk_phone VARCHAR(32), activity_date VARCHAR(32), activity_time VARCHAR(32), postponed_to VARCHAR(32), fingerprint VARCHAR(128) NOT NULL, raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await sql!`CREATE UNIQUE INDEX IF NOT EXISTS atlasio_shipment_updates_fingerprint_idx ON atlasio_shipment_updates (fingerprint)`;
      await sql!`ALTER TABLE atlasio_stock_products ADD COLUMN IF NOT EXISTS provider_id VARCHAR(64)`;
      await sql!`ALTER TABLE atlasio_stock_products ADD COLUMN IF NOT EXISTS provider_product_id VARCHAR(160)`;
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
      await sql!`INSERT INTO atlasio_settings (key, value) VALUES ('shipping_providers', '[]') ON CONFLICT (key) DO NOTHING`;
      await sql!`INSERT INTO atlasio_settings (key, value) VALUES ('active_provider_id', '') ON CONFLICT (key) DO NOTHING`;
    })();
  }
  await schemaReady;
};

const getBody = (body: unknown): Record<string, unknown> => {
  if (typeof body === "string") {
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

const isAdmin = (request: Request) =>
  Boolean(
    dashboardPassword &&
      headerValue(request, "x-dashboard-password") === dashboardPassword
  );
const queryValue = (request: Request, name: string) => {
  const value = request.query?.[name];
  return Array.isArray(value) ? value[0] : value;
};

const loadEcoSettings = async (providerId?: string) => {
  const rows =
    (await sql!`SELECT key, value FROM atlasio_settings WHERE key IN ('ecotrack_provider', 'ecotrack_token', 'delivery_fees', 'shipping_providers', 'active_provider_id')`) as Array<{
      key: string;
      value: string;
    }>;
  const values = Object.fromEntries(rows.map(row => [row.key, row.value]));
  let legacyFees: Record<string, { home: number; stopDesk: number }> = {};
  try {
    legacyFees = JSON.parse(values.delivery_fees || "{}") as Record<
      string,
      { home: number; stopDesk: number }
    >;
  } catch {
    legacyFees = {};
  }
  let providers: ShippingProvider[] = [];
  try {
    providers = JSON.parse(
      values.shipping_providers || "[]"
    ) as ShippingProvider[];
  } catch {
    providers = [];
  }
  if (
    !providers.length &&
    (values.ecotrack_provider || process.env.ECOTRACK_PROVIDER)
  )
    providers = [
      {
        id: "default",
        name: values.ecotrack_provider || "EcoTrack",
        provider:
          values.ecotrack_provider ||
          process.env.ECOTRACK_PROVIDER ||
          "navexdelivery",
        token: values.ecotrack_token || process.env.ECOTRACK_API_TOKEN || "",
        deliveryFees: legacyFees,
      },
    ];
  const selected =
    providers.find(item => item.id === providerId) ||
    providers.find(item => item.id === values.active_provider_id) ||
    providers[0];
  return {
    provider:
      selected?.provider || process.env.ECOTRACK_PROVIDER || "navexdelivery",
    token: selected?.token || process.env.ECOTRACK_API_TOKEN || "",
    deliveryFees: selected?.deliveryFees || legacyFees,
    providerId: selected?.id || "default",
    providerName: selected?.name || selected?.provider || "EcoTrack",
    providers,
  };
};

const publicProviders = (providers: ShippingProvider[]) =>
  providers.map(({ id, name, provider, deliveryFees, token }) => ({
    id,
    name,
    provider,
    deliveryFees,
    tokenConfigured: Boolean(token),
  }));

const rowById = async (id: number) => {
  const result =
    await sql!`SELECT ${sql!.unsafe(selectColumns)} FROM atlasio_orders WHERE id = ${id} LIMIT 1`;
  return result[0] as OrderRow | undefined;
};

const stockById = async (id: number, providerId: string) => {
  if (!Number.isInteger(id) || id <= 0) return undefined;
  const result =
    await sql!`SELECT id, name, sku, quantity, active, created_at, updated_at FROM atlasio_stock_products WHERE id = ${id} AND provider_id = ${providerId} AND active = TRUE LIMIT 1`;
  return result[0] as StockProduct | undefined;
};

const reserveStockUnit = async (productId: number) => {
  const result =
    await sql!`UPDATE atlasio_stock_products SET quantity = quantity - 1, updated_at = NOW() WHERE id = ${productId} AND active = TRUE AND quantity > 0 RETURNING id`;
  if (!result[0]) throw new Error("المنتج المختار غير متوفر في المخزون");
};

const releaseStockUnit = async (productId: number) => {
  await sql!`UPDATE atlasio_stock_products SET quantity = quantity + 1, updated_at = NOW() WHERE id = ${productId} AND active = TRUE`;
};

const reserveStockUnits = async (productId: number, quantity: number) => {
  let reserved = 0;
  try {
    for (; reserved < quantity; reserved += 1)
      await reserveStockUnit(productId);
  } catch (error) {
    for (let index = 0; index < reserved; index += 1)
      await releaseStockUnit(productId);
    throw error;
  }
};

const releaseStockUnits = async (productId: number, quantity: number) => {
  for (let index = 0; index < quantity; index += 1)
    await releaseStockUnit(productId);
};

const recordEvent = async (
  orderId: number,
  eventType: string,
  message: string,
  fromValue?: string | null,
  toValue?: string | null,
  metadata: Record<string, unknown> = {}
) => {
  try {
    await sql!`INSERT INTO atlasio_order_events (order_id, event_type, from_value, to_value, message, metadata) VALUES (${orderId}, ${eventType.slice(0, 64)}, ${fromValue || null}, ${toValue || null}, ${message.slice(0, 1000)}, ${JSON.stringify(metadata)})`;
  } catch (error) {
    console.error(
      "Atlasio order event error",
      error instanceof Error ? error.message : "unknown"
    );
  }
};

const textValue = (value: unknown) =>
  value == null ? null : String(value).trim().slice(0, 2000) || null;
const shipmentFingerprint = (
  tracking: string,
  source: string,
  item: Record<string, unknown>
) =>
  createHash("sha256")
    .update(JSON.stringify([tracking, source, item]))
    .digest("hex");
const saveShipmentUpdate = async (
  orderId: number,
  tracking: string,
  source: string,
  item: Record<string, unknown>
) => {
  const activityDate = textValue(item.date ?? item.created_at);
  const activityTime = textValue(item.time);
  const note = textValue(
    item.reason ?? item.remarque ?? item.content ?? item.details
  );
  const details = textValue(item.details);
  const station = textValue(item.station);
  const driver = textValue(item.driver ?? item.livreur);
  const driverPhone = textValue(item.driver_phone);
  const deskPhone = textValue(item.desk_phone);
  const postponedTo = textValue(item.postponed_to);
  const status = textValue(item.status ?? item.activity);
  const fingerprint = shipmentFingerprint(tracking, source, item);
  await sql!`
    INSERT INTO atlasio_shipment_updates (order_id, tracking, source, status, reason, details, station, driver, driver_phone, desk_phone, activity_date, activity_time, postponed_to, fingerprint, raw_payload)
    VALUES (${orderId}, ${tracking}, ${source}, ${status}, ${note}, ${details}, ${station}, ${driver}, ${driverPhone}, ${deskPhone}, ${activityDate}, ${activityTime}, ${postponedTo}, ${fingerprint}, ${JSON.stringify(item)})
    ON CONFLICT (fingerprint) DO NOTHING
  `;
  return {
    note,
    station,
    driver,
    driverPhone,
    deskPhone,
    activityDate,
    activityTime,
  };
};

const shippingModeFromBody = (
  body: Record<string, unknown>
): "stock" | "without_stock" | null => {
  if (body.shippingMode === "stock" || body.shippingMode === "without_stock")
    return body.shippingMode;
  if (body.shipFromStock === true) return "stock";
  if (body.shipFromStock === false) return "without_stock";
  return null;
};

export default async function handler(request: Request, response: Response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Dashboard-Password"
  );
  response.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, OPTIONS"
  );
  if (request.method === "OPTIONS") {
    response.status(204).json({});
    return;
  }

  try {
    await ensureSchema();

    if (request.method === "GET") {
      const resource = queryValue(request, "resource");
      const ecoSettings = await loadEcoSettings();
      if (resource === "settings") {
        if (!isAdmin(request)) {
          response.status(401).json({ error: "غير مصرح" });
          return;
        }
        response.status(200).json({
          provider: ecoSettings.provider,
          providerName: ecoSettings.providerName,
          activeProviderId: ecoSettings.providerId,
          providers: publicProviders(ecoSettings.providers),
          tokenConfigured: Boolean(ecoSettings.token),
          deliveryFees: ecoSettings.deliveryFees,
        });
        return;
      }
      if (resource === "stock") {
        if (!isAdmin(request)) {
          response.status(401).json({ error: "غير مصرح" });
          return;
        }
        const requestedProviderId =
          queryValue(request, "providerId") || ecoSettings.providerId;
        const providerSettings = await loadEcoSettings(requestedProviderId);
        const remoteProducts = await fetchEcoTrackProducts(providerSettings);
        await sql!`ALTER TABLE atlasio_stock_products ADD COLUMN IF NOT EXISTS provider_id VARCHAR(64)`;
        await sql!`ALTER TABLE atlasio_stock_products ADD COLUMN IF NOT EXISTS provider_product_id VARCHAR(160)`;
        if (remoteProducts.length === 0) {
          const products =
            (await sql!`SELECT id, name, sku, quantity, active, created_at, updated_at FROM atlasio_stock_products WHERE active = TRUE AND provider_id = ${providerSettings.providerId} ORDER BY name ASC`) as StockProduct[];
          response.status(200).json({
            products,
            providerId: providerSettings.providerId,
            providerName: providerSettings.providerName,
            synced: 0,
            preserved: true,
          });
          return;
        }
        for (const product of remoteProducts) {
          const existing =
            await sql!`SELECT id FROM atlasio_stock_products WHERE provider_id = ${providerSettings.providerId} AND provider_product_id = ${product.id} LIMIT 1`;
          if (existing[0]) {
            await sql!`UPDATE atlasio_stock_products SET name = ${product.name.slice(0, 160)}, sku = ${product.reference}, quantity = ${Math.floor(product.quantity)}, active = TRUE, updated_at = NOW() WHERE id = ${existing[0].id}`;
          } else {
            await sql!`INSERT INTO atlasio_stock_products (name, sku, quantity, active, provider_id, provider_product_id) VALUES (${product.name.slice(0, 160)}, ${product.reference}, ${Math.floor(product.quantity)}, TRUE, ${providerSettings.providerId}, ${product.id})`;
          }
        }
        const remoteIds = remoteProducts.map(product => product.id);
        const existingProducts =
          (await sql!`SELECT id, provider_product_id FROM atlasio_stock_products WHERE provider_id = ${providerSettings.providerId}`) as Array<{
            id: number;
            provider_product_id: string | null;
          }>;
        for (const product of existingProducts) {
          if (
            product.provider_product_id &&
            !remoteIds.includes(product.provider_product_id)
          ) {
            await sql!`UPDATE atlasio_stock_products SET active = FALSE, updated_at = NOW() WHERE id = ${product.id}`;
          }
        }
        const products =
          (await sql!`SELECT id, name, sku, quantity, active, created_at, updated_at FROM atlasio_stock_products WHERE active = TRUE AND provider_id = ${providerSettings.providerId} ORDER BY name ASC`) as StockProduct[];
        response.status(200).json({
          products,
          providerId: providerSettings.providerId,
          providerName: providerSettings.providerName,
          synced: remoteProducts.length,
        });
        return;
      }
      if (resource === "fees") {
        const toNumber = (value: unknown) => {
          const number = Number(value);
          return Number.isFinite(number) ? number : 0;
        };
        const getWilayaId = (fee: Record<string, unknown>) => {
          const raw =
            fee.wilaya_id ??
            fee.code_wilaya ??
            fee.wilaya ??
            fee.code ??
            fee.id;
          const match = String(raw ?? "").match(/\d{1,2}/);
          const ecoId = match ? Number(match[0]) : 0;
          return ecoToOfficialWilaya[ecoId] || ecoId;
        };
        let fees: Array<{
          wilaya_id: number;
          tarif: number;
          tarif_stopdesk: number;
        }> = [];
        try {
          const rawFees = (await fetchEcoTrackFees(ecoSettings)) as Array<
            Record<string, unknown>
          >;
          fees = rawFees
            .map(fee => ({
              wilaya_id: getWilayaId(fee),
              tarif: toNumber(
                fee.tarif ??
                  fee.price ??
                  fee.home ??
                  fee.tarif_domicile ??
                  fee.tarif_home ??
                  fee.delivery_fee
              ),
              tarif_stopdesk: toNumber(
                fee.tarif_stopdesk ??
                  fee.stop_desk ??
                  fee.stopdesk ??
                  fee.price_stopdesk ??
                  fee.tarif_bureau ??
                  fee.price ??
                  fee.tarif ??
                  fee.home
              ),
            }))
            .filter(fee => fee.wilaya_id > 0);
        } catch (feeError) {
          console.warn(
            "EcoTrack fees unavailable; using dashboard overrides",
            feeError
          );
        }
        const merged = new Map(fees.map(fee => [fee.wilaya_id, fee]));
        for (const [key, value] of Object.entries(ecoSettings.deliveryFees)) {
          const wilayaId = Number(key);
          if (!Number.isInteger(wilayaId)) continue;
          merged.set(wilayaId, {
            wilaya_id: wilayaId,
            tarif: toNumber(value.home),
            tarif_stopdesk: toNumber(value.stopDesk || value.home),
          });
        }
        response.status(200).json({ fees: Array.from(merged.values()) });
        return;
      }
      if (resource === "communes") {
        const wilaya = queryValue(request, "wilaya");
        if (!wilaya) {
          response.status(400).json({ error: "الولاية مطلوبة" });
          return;
        }
        response
          .status(200)
          .json({ communes: await fetchEcoTrackCommunes(wilaya, ecoSettings) });
        return;
      }
      if (resource === "events") {
        if (!isAdmin(request)) {
          response.status(401).json({ error: "غير مصرح" });
          return;
        }
        const orderId = Number(queryValue(request, "orderId"));
        if (!Number.isInteger(orderId) || orderId <= 0) {
          response.status(400).json({ error: "رقم الطلب غير صالح" });
          return;
        }
        const events =
          await sql!`SELECT id, order_id, event_type, from_value, to_value, message, metadata, created_at FROM atlasio_order_events WHERE order_id = ${orderId} ORDER BY created_at DESC LIMIT 100`;
        response.status(200).json({ events });
        return;
      }
      if (!isAdmin(request)) {
        response.status(401).json({ error: "غير مصرح" });
        return;
      }
      if (resource === "shipment") {
        if (!isAdmin(request)) {
          response.status(401).json({ error: "غير مصرح" });
          return;
        }
        const orderId = Number(queryValue(request, "orderId"));
        const order = await rowById(orderId);
        if (!order || !order.ecotrack_tracking) {
          response
            .status(404)
            .json({ error: "لا توجد شحنة مرتبطة بهذا الطلب" });
          return;
        }
        const settings = await loadEcoSettings(
          order.shipping_provider_id || ecoSettings.providerId
        );
        const [trackingInfo, comments] = await Promise.all([
          fetchEcoTrackTracking(order.ecotrack_tracking, settings),
          fetchEcoTrackUpdates(order.ecotrack_tracking, settings),
        ]);
        for (const activity of trackingInfo.activity)
          await saveShipmentUpdate(
            order.id,
            order.ecotrack_tracking,
            "tracking",
            activity
          );
        for (const comment of comments)
          await saveShipmentUpdate(
            order.id,
            order.ecotrack_tracking,
            "company_note",
            comment
          );
        const latestActivity =
          trackingInfo.activity[trackingInfo.activity.length - 1] || {};
        const latestComment = comments[comments.length - 1] || {};
        const latest = { ...latestActivity, ...latestComment } as Record<
          string,
          unknown
        >;
        const rawStatus = String(
          trackingInfo.status || order.ecotrack_status || ""
        );
        const normalized = normalizeEcoTrackStatus(rawStatus);
        const nextStatus =
          normalized === "delivered" || normalized === "paid"
            ? "delivered"
            : normalized === "returning"
              ? "returned"
              : normalized === "cancelled"
                ? "cancelled"
                : undefined;
        await sql!`UPDATE atlasio_orders SET ecotrack_status = ${rawStatus}, ecotrack_driver = ${textValue(latest.driver ?? latest.livreur)}, ecotrack_driver_phone = ${textValue(latest.driver_phone)}, ecotrack_desk_phone = ${textValue(latest.desk_phone)}, ecotrack_station = ${textValue(latest.station)}, ecotrack_last_note = ${textValue(latest.reason ?? latest.remarque ?? latest.details)}, ecotrack_last_activity_at = NOW(), ecotrack_last_synced_at = NOW(), shipment_status = ${normalized}, payment_status = CASE WHEN ${normalized} = 'paid' THEN 'paid' ELSE payment_status END, status = CASE WHEN status = 'trashed' OR ${nextStatus || null} IS NULL THEN status ELSE ${nextStatus || null} END, updated_at = NOW() WHERE id = ${order.id}`;
        const updates =
          await sql!`SELECT id, order_id, tracking, source, status, reason, details, station, driver, driver_phone, desk_phone, activity_date, activity_time, postponed_to, raw_payload, created_at FROM atlasio_shipment_updates WHERE order_id = ${order.id} ORDER BY created_at DESC LIMIT 200`;
        response.status(200).json({ order: await rowById(order.id), updates });
        return;
      }
      if (resource === "sync") {
        const syncProviders = ecoSettings.providers.length
          ? ecoSettings.providers
          : [ecoSettings];
        let synced = 0;
        let matched = 0;
        let total = 0;
        const providerResults: Array<{
          provider: string;
          fetched: number;
          matched: number;
          synced: number;
          activities: number;
          error?: string;
        }> = [];
        for (const providerConfig of syncProviders) {
          try {
            const firstPage = await fetchEcoTrackOrders(providerConfig, 1);
            const parcels = [...(firstPage.data || [])];
            const lastPage = Math.min(
              250,
              Math.max(1, Number(firstPage.last_page || 1))
            );
            for (let page = 2; page <= lastPage; page += 1) {
              const nextPage = await fetchEcoTrackOrders(providerConfig, page);
              parcels.push(...(nextPage.data || []));
            }
            total += parcels.length;
            const matches: Array<{
              orderId: number;
              tracking: string;
              parcel: Record<string, unknown>;
              previousStatus: string | null;
            }> = [];
            for (const parcel of parcels) {
              const tracking = String(
                parcel.tracking || parcel.tracking_number || ""
              );
              const reference = String(parcel.reference || "");
              if (!tracking && !reference) continue;
              const rows = tracking
                ? await sql!`SELECT id, ecotrack_status FROM atlasio_orders WHERE ecotrack_tracking = ${tracking} OR lead_id = ${reference} LIMIT 1`
                : await sql!`SELECT id, ecotrack_status FROM atlasio_orders WHERE lead_id = ${reference} LIMIT 1`;
              if (!rows[0]) continue;
              matches.push({
                orderId: Number(rows[0].id),
                tracking,
                parcel,
                previousStatus: rows[0].ecotrack_status as string | null,
              });
            }
            matched += matches.length;
            const trackingInfo: Record<string, Record<string, unknown>> = {};
            for (let offset = 0; offset < matches.length; offset += 100) {
              const batch = matches
                .slice(offset, offset + 100)
                .map(item => item.tracking)
                .filter(Boolean);
              if (!batch.length) continue;
              Object.assign(
                trackingInfo,
                await fetchEcoTrackTrackingsInfo(batch, providerConfig)
              );
            }
            let providerActivities = 0;
            for (const item of matches) {
              const detail = trackingInfo[item.tracking] || {};
              const rawStatus = String(
                detail.status || item.parcel.status || ""
              );
              const normalized = normalizeEcoTrackStatus(rawStatus);
              const activities = Array.isArray(detail.activity)
                ? (detail.activity as Array<Record<string, unknown>>)
                : [];
              for (const activity of activities) {
                await saveShipmentUpdate(
                  item.orderId,
                  item.tracking,
                  "tracking",
                  activity
                );
                providerActivities += 1;
              }
              const latest = (activities[activities.length - 1] ||
                detail) as Record<string, unknown>;
              const nextStatus =
                normalized === "delivered" || normalized === "paid"
                  ? "delivered"
                  : normalized === "returning"
                    ? "returned"
                    : normalized === "cancelled"
                      ? "cancelled"
                      : undefined;
              await sql!`UPDATE atlasio_orders SET ecotrack_tracking = COALESCE(NULLIF(${item.tracking}, ''), ecotrack_tracking), ecotrack_status = ${rawStatus}, ecotrack_driver = ${textValue(detail.driver ?? latest.driver ?? latest.livreur)}, ecotrack_driver_phone = ${textValue(detail.driver_phone ?? latest.driver_phone)}, ecotrack_desk_phone = ${textValue(detail.desk_phone ?? latest.desk_phone)}, ecotrack_station = ${textValue(detail.station ?? latest.station)}, ecotrack_last_note = ${textValue(latest.reason ?? latest.remarque ?? latest.details)}, ecotrack_last_activity_at = NOW(), ecotrack_last_synced_at = NOW(), shipment_status = ${normalized}, payment_status = CASE WHEN ${normalized} = 'paid' THEN 'paid' ELSE payment_status END, status = CASE WHEN status = 'trashed' OR ${nextStatus || null} IS NULL THEN status ELSE ${nextStatus || null} END, updated_at = NOW() WHERE id = ${item.orderId}`;
              if (item.previousStatus !== rawStatus)
                await recordEvent(
                  item.orderId,
                  "ecotrack_status_updated",
                  `تحديث EcoTrack: ${rawStatus || normalized}`,
                  item.previousStatus,
                  rawStatus,
                  { tracking: item.tracking, normalized }
                );
              synced += 1;
            }
            providerResults.push({
              provider: providerConfig.provider || "EcoTrack",
              fetched: parcels.length,
              matched: matches.length,
              synced: matches.length,
              activities: providerActivities,
            });
          } catch (providerError) {
            providerResults.push({
              provider: providerConfig.provider || "EcoTrack",
              fetched: 0,
              matched: 0,
              synced: 0,
              activities: 0,
              error:
                providerError instanceof Error
                  ? providerError.message
                  : "فشل الاتصال بـEcoTrack",
            });
          }
        }
        response
          .status(200)
          .json({ synced, matched, total, providers: providerResults });
        return;
      }
      const orders =
        await sql!`SELECT ${sql!.unsafe(selectColumns)} FROM atlasio_orders ORDER BY created_at DESC LIMIT 500`;
      response.status(200).json({ orders });
      return;
    }

    const body = getBody(request.body);

    if (request.method === "PATCH") {
      if (!isAdmin(request)) {
        response.status(401).json({ error: "غير مصرح" });
        return;
      }

      if (body.action === "contact") {
        // Compatibility marker: body.action === 'contact'
        const orderId = Number(body.id);
        const order = await rowById(orderId);
        if (!order) {
          response.status(404).json({ error: "الطلب غير موجود" });
          return;
        }
        const result = String(body.result || "contacted").slice(0, 32);
        const allowedResults = [
          "contacted",
          "confirmed",
          "no_answer",
          "busy",
          "call_later",
          "wrong_number",
          "refused",
        ];
        if (!allowedResults.includes(result)) {
          response.status(400).json({ error: "نتيجة الاتصال غير صالحة" });
          return;
        }
        const nextConfirmation =
          result === "confirmed"
            ? "confirmed"
            : result === "refused" || result === "wrong_number"
              ? "cancelled"
              : "pending";
        const nextOrderStatus =
          result === "confirmed"
            ? "confirmed"
            : result === "refused" || result === "wrong_number"
              ? "cancelled"
              : order.status;
        const updated =
          await sql!`UPDATE atlasio_orders SET confirmation_status = ${nextConfirmation}, contact_result = ${result}, contact_attempts = contact_attempts + 1, last_contacted_at = NOW(), status = ${nextOrderStatus}, updated_at = NOW() WHERE id = ${orderId} RETURNING ${sql!.unsafe(selectColumns)}`;
        await recordEvent(
          orderId,
          "contact_result",
          `نتيجة الاتصال: ${result}`,
          order.confirmation_status,
          nextConfirmation,
          { result }
        );
        if (result === "confirmed")
          await recordEvent(
            orderId,
            "order_confirmed",
            "تم تأكيد الطلب وتجهيزه للشحن",
            order.status,
            "confirmed"
          );
        response.status(200).json({
          order: updated[0],
          message:
            result === "confirmed"
              ? "تم تأكيد الطلب وتجهيزه للشحن"
              : "تم تسجيل نتيجة الاتصال",
        });
        return;
      }

      if (body.action === "edit") {
        const orderId = Number(body.id);
        const order = await rowById(orderId);
        if (!order) {
          response.status(404).json({ error: "الطلب غير موجود" });
          return;
        }
        if (
          order.ecotrack_tracking ||
          order.status === "shipped" ||
          order.status === "delivered" ||
          order.status === "returned"
        ) {
          response
            .status(409)
            .json({ error: "لا يمكن تعديل طلب تم رفعه إلى شركة التوصيل" });
          return;
        }
        const phone = String(body.phone || "").replace(/\D/g, "");
        const fullName = String(body.fullName || "").trim();
        const wilaya = String(body.wilaya || "").trim();
        const commune = String(body.commune || "").trim();
        if (!/^0[5-7]\d{8}$/.test(phone) || !wilaya || !commune) {
          response
            .status(400)
            .json({ error: "الهاتف والولاية والبلدية مطلوبة بشكل صحيح" });
          return;
        }
        const price = Number(body.price);
        const deliveryFee = Number(body.deliveryFee);
        if (
          !Number.isFinite(price) ||
          price < 0 ||
          !Number.isFinite(deliveryFee) ||
          deliveryFee < 0
        ) {
          response.status(400).json({
            error:
              "سعر المنتج وسعر التوصيل يجب أن يكونا أرقاماً صحيحة أو صفراً",
          });
          return;
        }
        const deliveryType = body.deliveryType
          ? String(body.deliveryType).slice(0, 24)
          : order.delivery_type;
        const updated =
          await sql!`UPDATE atlasio_orders SET price = ${Math.round(price)}, phone = ${phone}, full_name = ${fullName || null}, wilaya = ${wilaya}, commune = ${commune}, delivery_fee = ${Math.round(deliveryFee)}, delivery_type = ${deliveryType}, updated_at = NOW() WHERE id = ${orderId} RETURNING ${sql!.unsafe(selectColumns)}`;
        await recordEvent(orderId, "order_updated", "تم تعديل بيانات الطلب");
        response
          .status(200)
          .json({ order: updated[0], message: "تم تعديل بيانات الطلب" });
        return;
      }

      if (body.resource === "stock") {
        const action = String(body.action || "");
        const name = String(body.name || "").trim();
        const sku = String(body.sku || "").trim() || null;
        const quantity = Math.max(0, Math.floor(Number(body.quantity || 0)));
        if (action === "save") {
          if (!name) {
            response.status(400).json({ error: "اسم المنتج مطلوب" });
            return;
          }
          const productId = Number(body.id || 0);
          const saved =
            productId > 0
              ? await sql!`UPDATE atlasio_stock_products SET name = ${name.slice(0, 160)}, sku = ${sku}, quantity = ${quantity}, active = TRUE, updated_at = NOW() WHERE id = ${productId} RETURNING id, name, sku, quantity, active, created_at, updated_at`
              : await sql!`INSERT INTO atlasio_stock_products (name, sku, quantity) VALUES (${name.slice(0, 160)}, ${sku}, ${quantity}) RETURNING id, name, sku, quantity, active, created_at, updated_at`;
          response.status(200).json({ product: saved[0] });
          return;
        }
        if (action === "archive") {
          const productId = Number(body.id);
          await sql!`UPDATE atlasio_stock_products SET active = FALSE, updated_at = NOW() WHERE id = ${productId}`;
          response.status(200).json({ message: "تم أرشفة المنتج" });
          return;
        }
        response.status(400).json({ error: "إجراء المخزون غير صالح" });
        return;
      }

      if (body.resource === "settings") {
        if (Array.isArray(body.providers)) {
          const existingProviders = (await loadEcoSettings()).providers;
          const providers = body.providers
            .map(item => {
              const raw = item as Record<string, unknown>;
              const id = String(raw.id || crypto.randomUUID()).slice(0, 64);
              const existing = existingProviders.find(saved => saved.id === id);
              return {
                id,
                name: String(
                  raw.name || raw.provider || existing?.name || "شركة توصيل"
                ).slice(0, 160),
                provider: String(raw.provider || existing?.provider || "")
                  .trim()
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, ""),
                token: String(raw.token || existing?.token || "").trim(),
                deliveryFees:
                  raw.deliveryFees && typeof raw.deliveryFees === "object"
                    ? raw.deliveryFees
                    : existing?.deliveryFees || {},
              };
            })
            .filter(item => item.provider && item.token);
          if (providers.length > 10) {
            response.status(400).json({ error: "الحد الأقصى 10 شركات توصيل" });
            return;
          }
          await sql!`INSERT INTO atlasio_settings (key, value) VALUES ('shipping_providers', ${JSON.stringify(providers)}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
          const activeProviderId = String(
            body.activeProviderId || providers[0]?.id || ""
          );
          await sql!`INSERT INTO atlasio_settings (key, value) VALUES ('active_provider_id', ${activeProviderId}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
        } else {
          const provider = String(body.provider || "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "");
          const token = String(body.token || "").trim();
          if (!provider) {
            response.status(400).json({ error: "اسم الشركة مطلوب" });
            return;
          }
          await sql!`INSERT INTO atlasio_settings (key, value) VALUES ('ecotrack_provider', ${provider}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
          if (token)
            await sql!`INSERT INTO atlasio_settings (key, value) VALUES ('ecotrack_token', ${token}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
          if (body.deliveryFees && typeof body.deliveryFees === "object") {
            const fees = JSON.stringify(body.deliveryFees);
            if (fees.length > 20000) {
              response
                .status(400)
                .json({ error: "بيانات أسعار التوصيل كبيرة جداً" });
              return;
            }
            await sql!`INSERT INTO atlasio_settings (key, value) VALUES ('delivery_fees', ${fees}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
          }
        }
        const currentSettings = await loadEcoSettings(
          String(body.activeProviderId || "")
        );
        response.status(200).json({
          provider: currentSettings.provider,
          providerName: currentSettings.providerName,
          activeProviderId: currentSettings.providerId,
          providers: publicProviders(currentSettings.providers),
          tokenConfigured: Boolean(currentSettings.token),
          deliveryFees: currentSettings.deliveryFees,
        });
        return;
      }

      const ecoSettings = await loadEcoSettings();
      if (body.action === "trash") {
        const orderId = Number(body.id);
        const order = await rowById(orderId);
        if (!order) {
          response.status(404).json({ error: "الطلب غير موجود" });
          return;
        }
        if (order.status === "trashed") {
          response
            .status(200)
            .json({ order, message: "الطلب موجود مسبقاً في سلة المهملات" });
          return;
        }
        const updated =
          await sql!`UPDATE atlasio_orders SET status = 'trashed', status_before_trash = ${order.status}, trashed_at = NOW(), updated_at = NOW() WHERE id = ${orderId} RETURNING ${sql!.unsafe(selectColumns)}`;
        await recordEvent(
          orderId,
          "order_trashed",
          "تم نقل الطلب إلى سلة المهملات",
          order.status,
          "trashed"
        );
        response.status(200).json({
          order: updated[0],
          message: "تم نقل الطلب إلى سلة المهملات",
        });
        return;
      }
      if (body.action === "restore") {
        const orderId = Number(body.id);
        const order = await rowById(orderId);
        if (!order) {
          response.status(404).json({ error: "الطلب غير موجود" });
          return;
        }
        if (order.status !== "trashed") {
          response.status(409).json({ error: "الطلب ليس في سلة المهملات" });
          return;
        }
        const restoredStatus = [
          "abandoned",
          "complete",
          "confirmed",
          "not_responding",
          "cancelled",
          "shipped",
          "delivered",
          "returned",
        ].includes(order.status_before_trash || "")
          ? order.status_before_trash
          : "abandoned";
        const updated =
          await sql!`UPDATE atlasio_orders SET status = ${restoredStatus}, status_before_trash = NULL, trashed_at = NULL, updated_at = NOW() WHERE id = ${orderId} RETURNING ${sql!.unsafe(selectColumns)}`;
        await recordEvent(
          orderId,
          "order_restored",
          "تم استرجاع الطلب من سلة المهملات",
          "trashed",
          restoredStatus
        );
        response.status(200).json({
          order: updated[0],
          message: "تم استرجاع الطلب من سلة المهملات",
        });
        return;
      }
      if (body.action === "ship") {
        const orderId = Number(body.id);
        const order = await rowById(orderId);
        if (!order) {
          response.status(404).json({ error: "الطلب غير موجود" });
          return;
        }
        if (order.status !== "confirmed") {
          response.status(409).json({ error: "يمكن شحن الطلبات المؤكدة فقط" });
          return;
        }
        if (order.ecotrack_tracking) {
          response.status(200).json({ order, message: "الشحنة مرفوعة مسبقاً" });
          return;
        }
        const claim =
          await sql!`UPDATE atlasio_orders SET shipment_status = 'processing', updated_at = NOW() WHERE id = ${orderId} AND status = 'confirmed' AND ecotrack_tracking IS NULL AND COALESCE(shipment_status, '') <> 'processing' RETURNING id`;
        if (!claim[0]) {
          response.status(409).json({
            error:
              "الشحنة قيد المعالجة أو تم رفعها مسبقاً، انتظر النتيجة قبل إعادة المحاولة",
          });
          return;
        }

        const shippingMode = shippingModeFromBody(body);
        if (!shippingMode) {
          response
            .status(400)
            .json({ error: "حدد طريقة الشحن: من المخزون أو بدون مخزون" });
          return;
        }
        const useStock = shippingMode === "stock";
        const selectedProviderId = String(
          body.providerId ||
            order.shipping_provider_id ||
            ecoSettings.providerId
        );
        const selectedSettings = await loadEcoSettings(selectedProviderId);
        const shipmentQuantity = Math.max(
          1,
          Math.floor(Number(body.quantity) || 1)
        );
        const selectedProduct = useStock
          ? await stockById(
              Number(body.stockProductId || order.stock_product_id || 0),
              selectedProviderId
            )
          : null;

        // EcoTrack's standard API represents stock with stock=1 and quantite;
        // it does not require a product id from a remote product catalogue.
        if (
          useStock &&
          selectedProduct &&
          selectedProduct.quantity < shipmentQuantity
        ) {
          response
            .status(409)
            .json({ error: "الكمية المطلوبة غير متوفرة في المخزون" });
          return;
        }

        const productName =
          selectedProduct?.sku || selectedProduct?.name || "باك الربيع الملكي";
        const createParcel = useStock
          ? createEcoTrackStockParcel
          : createEcoTrackNonStockParcel;
        let stockReserved = false;
        if (useStock && selectedProduct) {
          await reserveStockUnits(selectedProduct.id, shipmentQuantity);
          stockReserved = true;
        }
        let tracking: string;
        try {
          tracking = await createParcel(
            {
              leadId: order.lead_id,
              price: order.price,
              deliveryFee: order.delivery_fee,
              phone: order.phone,
              fullName: order.full_name,
              wilaya: order.wilaya,
              commune: order.commune,
              deliveryType: order.delivery_type,
              giftBooklet: order.gift_booklet,
              productName,
              quantity: shipmentQuantity,
            },
            selectedSettings
          );
        } catch (shipError) {
          if (stockReserved && selectedProduct)
            await releaseStockUnits(selectedProduct.id, shipmentQuantity);
          await sql!`UPDATE atlasio_orders SET shipment_status = 'failed', updated_at = NOW() WHERE id = ${orderId} AND ecotrack_tracking IS NULL`;
          throw shipError;
        }

        const updated =
          await sql!`UPDATE atlasio_orders SET status = 'shipped', shipment_status = 'shipped', ecotrack_tracking = ${tracking}, ecotrack_status = 'created', shipping_provider_id = ${selectedSettings.providerId}, shipping_provider_name = ${selectedSettings.providerName}, stock_product_id = ${useStock && selectedProduct ? selectedProduct.id : null}, stock_product_name = ${useStock && selectedProduct ? selectedProduct.name : null}, ship_from_stock = ${useStock}, updated_at = NOW() WHERE id = ${orderId} RETURNING ${sql!.unsafe(selectColumns)}`;
        await recordEvent(
          orderId,
          "shipment_succeeded",
          `تم قبول الشحنة من ${selectedSettings.providerName} برقم تتبع ${tracking}`,
          "shipping",
          "shipped",
          { tracking, providerId: selectedSettings.providerId }
        );
        response.status(200).json({
          order: updated[0],
          message: "تم رفع الشحنة إلى EcoTrack",
          tracking,
        });
        return;
      }
      if (body.action === "unship") {
        const orderId = Number(body.id);
        const order = await rowById(orderId);
        if (!order) {
          response.status(404).json({ error: "الطلب غير موجود" });
          return;
        }
        if (!order.ecotrack_tracking) {
          response.status(409).json({ error: "الطلب غير مرفوع إلى EcoTrack" });
          return;
        }
        await cancelEcoTrackParcel(
          order.ecotrack_tracking,
          await loadEcoSettings(
            order.shipping_provider_id || ecoSettings.providerId
          )
        );
        if (order.ship_from_stock && order.stock_product_id) {
          await releaseStockUnit(order.stock_product_id);
        }
        const updated =
          await sql!`UPDATE atlasio_orders SET status = 'confirmed', shipment_status = 'cancelled', ecotrack_tracking = NULL, ecotrack_status = 'cancelled', updated_at = NOW() WHERE id = ${orderId} RETURNING ${sql!.unsafe(selectColumns)}`;
        await recordEvent(
          orderId,
          "shipment_cancelled",
          "تم إلغاء رفع الشحنة وإعادتها إلى المؤكدة",
          "shipped",
          "cancelled"
        );
        response.status(200).json({
          order: updated[0],
          message: "تم إلغاء رفع الشحنة وإعادتها إلى المؤكدة",
        });
        return;
      }
      if (body.action === "shipAll") {
        const confirmed =
          (await sql!`SELECT ${sql!.unsafe(selectColumns)} FROM atlasio_orders WHERE status = 'confirmed' AND ecotrack_tracking IS NULL ORDER BY created_at ASC`) as OrderRow[];
        const results: Array<{
          leadId: string;
          tracking?: string;
          error?: string;
        }> = [];
        const shippingMode = shippingModeFromBody(body);
        if (!shippingMode) {
          response
            .status(400)
            .json({ error: "حدد طريقة الشحن: من المخزون أو بدون مخزون" });
          return;
        }
        const useStock = shippingMode === "stock";

        for (const order of confirmed) {
          try {
            const selectedSettings = await loadEcoSettings(
              String(
                body.providerId ||
                  order.shipping_provider_id ||
                  ecoSettings.providerId
              )
            );
            const shipmentQuantity = Math.max(
              1,
              Math.floor(Number(body.quantity) || 1)
            );
            const selectedProviderId = String(
              body.providerId ||
                order.shipping_provider_id ||
                ecoSettings.providerId
            );
            const selectedProduct = useStock
              ? await stockById(
                  Number(body.stockProductId || order.stock_product_id || 0),
                  selectedProviderId
                )
              : null;
            if (
              useStock &&
              selectedProduct &&
              selectedProduct.quantity < shipmentQuantity
            )
              throw new Error("الكمية المطلوبة غير متوفرة في المخزون المحلي");

            const productName =
              selectedProduct?.sku ||
              selectedProduct?.name ||
              "باك الربيع الملكي";
            const createParcel = useStock
              ? createEcoTrackStockParcel
              : createEcoTrackNonStockParcel;
            let stockReserved = false;
            if (useStock && selectedProduct) {
              await reserveStockUnits(selectedProduct.id, shipmentQuantity);
              stockReserved = true;
            }
            let tracking: string;
            try {
              tracking = await createParcel(
                {
                  leadId: order.lead_id,
                  price: order.price,
                  deliveryFee: order.delivery_fee,
                  phone: order.phone,
                  fullName: order.full_name,
                  wilaya: order.wilaya,
                  commune: order.commune,
                  deliveryType: order.delivery_type,
                  giftBooklet: order.gift_booklet,
                  productName,
                  quantity: shipmentQuantity,
                },
                selectedSettings
              );
            } catch (shipError) {
              if (stockReserved && selectedProduct)
                await releaseStockUnits(selectedProduct.id, shipmentQuantity);
              throw shipError;
            }

            await sql!`UPDATE atlasio_orders SET status = 'shipped', ecotrack_tracking = ${tracking}, ecotrack_status = 'created', shipping_provider_id = ${selectedSettings.providerId}, shipping_provider_name = ${selectedSettings.providerName}, stock_product_id = ${useStock && selectedProduct ? selectedProduct.id : null}, stock_product_name = ${useStock && selectedProduct ? selectedProduct.name : null}, ship_from_stock = ${useStock}, updated_at = NOW() WHERE id = ${order.id}`;
            results.push({ leadId: order.lead_id, tracking });
          } catch (shipError) {
            results.push({
              leadId: order.lead_id,
              error:
                shipError instanceof Error ? shipError.message : "فشل الرفع",
            });
          }
        }
        response.status(200).json({
          shipped: results.filter(item => item.tracking).length,
          failed: results.filter(item => item.error).length,
          results,
        });
        return;
      }

      const orderId = Number(body.id);
      const status = String(body.status || "");
      const allowedStatuses = [
        "abandoned",
        "complete",
        "confirmed",
        "not_responding",
        "cancelled",
        "shipped",
        "delivered",
        "returned",
      ];
      if (!Number.isInteger(orderId) || !allowedStatuses.includes(status)) {
        response.status(400).json({ error: "بيانات الحالة غير صالحة" });
        return;
      }
      const order = await rowById(orderId);
      if (!order) {
        response.status(404).json({ error: "الطلب غير موجود" });
        return;
      }
      if (status === "cancelled" && order.ecotrack_tracking) {
        response
          .status(409)
          .json({ error: "استخدم زر إلغاء الرفع أولاً قبل إلغاء الطلب" });
        return;
      }
      const updated =
        await sql!`UPDATE atlasio_orders SET status = ${status}, updated_at = NOW() WHERE id = ${orderId} RETURNING ${sql!.unsafe(selectColumns)}`;
      response
        .status(200)
        .json({ order: updated[0], message: "تم تحديث حالة الطلب" });
      return;
    }

    if (request.method === "POST") {
      const phone = String(body.phone || "").trim();
      const price = Number(body.price);
      if (!phone || !Number.isFinite(price)) {
        response.status(400).json({ error: "الهاتف والسعر مطلوبان" });
        return;
      }
      const leadId = String(
        body.leadId || `AT-${Date.now().toString(36).toUpperCase()}`
      ).slice(0, 64);
      const status = body.status === "complete" ? "complete" : "abandoned";
      const campaign = String(body.campaign || "الرابط الأساسي").slice(0, 64);
      const deliveryFee = Number(body.deliveryFee || 0);
      const deliveryType = body.deliveryType
        ? String(body.deliveryType).slice(0, 24)
        : null;
      const fullName = body.fullName
        ? String(body.fullName).slice(0, 160)
        : null;
      const wilaya = body.wilaya ? String(body.wilaya).slice(0, 120) : null;
      const commune = body.commune ? String(body.commune).slice(0, 160) : null;
      const sourceUrl = body.sourceUrl
        ? String(body.sourceUrl).slice(0, 1000)
        : null;
      const giftBooklet = body.giftBooklet === true;
      const saved = await sql!`
        INSERT INTO atlasio_orders (lead_id, status, campaign, price, delivery_fee, delivery_type, phone, full_name, wilaya, commune, source_url, gift_booklet)
        VALUES (${leadId}, ${status}, ${campaign}, ${price}, ${deliveryFee}, ${deliveryType}, ${phone}, ${fullName}, ${wilaya}, ${commune}, ${sourceUrl}, ${giftBooklet})
        ON CONFLICT (lead_id) DO UPDATE SET status = EXCLUDED.status, campaign = EXCLUDED.campaign, price = EXCLUDED.price, delivery_fee = EXCLUDED.delivery_fee, delivery_type = EXCLUDED.delivery_type, phone = EXCLUDED.phone, full_name = EXCLUDED.full_name, wilaya = EXCLUDED.wilaya, commune = EXCLUDED.commune, source_url = EXCLUDED.source_url, gift_booklet = EXCLUDED.gift_booklet, updated_at = NOW()
        RETURNING ${sql!.unsafe(selectColumns)}
      `;
      await recordEvent(
        Number(saved[0].id),
        "order_created",
        "تم إنشاء الطلب من صفحة الهبوط",
        null,
        status,
        { campaign, sourceUrl }
      );
      response.status(200).json({ order: saved[0] });
      return;
    }

    response.status(405).json({ error: "الطريقة غير مدعومة" });
  } catch (error) {
    console.error("Atlasio orders API error", error);
    response.status(500).json({
      error:
        error instanceof Error ? error.message : "تعذر تنفيذ العملية حالياً",
    });
  }
}

export const config = { runtime: "nodejs" };
export { isAdmin };
