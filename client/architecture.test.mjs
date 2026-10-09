import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('Atlasio security and workflow baseline', () => {
  it('keeps Telegram credentials out of browser code', async () => {
    const home = await readFile(new URL('./src/react-app/pages/Home.tsx', import.meta.url), 'utf8');
    expect(home).not.toMatch(/TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID|api\.telegram\.org\/bot/);
    expect(home).toContain("fetch('/api/telegram'");
  });

  it('exposes separate confirmation, shipment and payment fields in the API contract', async () => {
    const orders = await readFile(new URL('../api/orders.ts', import.meta.url), 'utf8');
    expect(orders).toContain('confirmation_status');
    expect(orders).toContain('shipment_status');
    expect(orders).toContain('payment_status');
    expect(orders).toContain('atlasio_order_events');
    expect(orders).toContain("body.action === 'contact'");
    expect(orders).toContain('body.action === "note"');
  });

  it('keeps the homepage unchanged and scopes the Ecom12-inspired look to /ecom12', async () => {
    const app = await readFile(new URL('./src/react-app/App.tsx', import.meta.url), 'utf8');
    const home = await readFile(new URL('./src/react-app/pages/Home.tsx', import.meta.url), 'utf8');
    const product = await readFile(new URL('./src/react-app/product-config.ts', import.meta.url), 'utf8');
    expect(app).toContain('const Dashboard = lazy(() => import("@/react-app/pages/Dashboard"));');
    expect(app).toContain('<Suspense fallback={<div className="min-h-screen bg-orange-50" />}>');
    expect(app).not.toContain('import Dashboard from "@/react-app/pages/Dashboard";');
    expect(app).toContain('<Route path="/ecom12" element={<HomePage design="ecom12" />} />');
    expect(home).toContain("fetch('/api/orders'");
    expect(home).toContain("fetch('/api/telegram'");
    expect(home).toContain("fireFacebookEventOnce(product, 'Purchase'");
    expect(home).toContain("fireFacebookEventOnce(product, 'Lead'");
    expect(home).toContain("fireFacebookEventOnce(product, 'ViewContent', 'view-content', productEventData)");
    expect(home).toContain("href=\"#lead-form\"");
    expect(home).toContain("'AddToCart',\n                    'ecom12-add-to-cart'");
    expect(home).toContain('🍓🤍🍍');
    expect(home).toContain('digitCount < 3 && !activeDraftLeadIdRef.current');
    expect(home).toContain('draftSync: true');
    expect(home).toContain("getProductSessionLeadId(product)");
    expect(home).toContain("data?.messageId ?? data?.result?.message_id ?? messageId");
    expect(home).toContain("{ action: 'edit', messageId, text }");
    expect(home).toContain('setPlaybackRate(1.3)');
    expect(home).toContain('https://www.youtube-nocookie.com/embed/${videoId}');
    expect(home).toContain('loading="lazy"');
    expect(home).toContain('<YouTubeEmbedPlayer videoId="u_yHscxu_pc" />');
    expect(home).toContain('حوالي 200–300 بذرة في العلبة');
    expect(home).toContain('التوصيل المعتاد: يوم إلى يومين');
    expect(home).toContain('ضمان استبدال عند وجود مشكلة بالمنتج');
    expect(home).toContain('ولا يمكن ضمان إنبات كل بذرة');
    expect(home).not.toContain('ازرع Pineberry المميزة: فراولة بيضاء قليلة الانتشار');
    expect(home).not.toContain('إلى المكتب');
    expect(home).not.toContain('المكتب');
    expect(home).not.toContain('type="radio"');
    expect(home).toContain("const deliveryType = 'home' as const");
    expect(home).toContain('String(Number(rawWilayaCode))');
    expect(home).toContain('الإجمالي النهائي: {offerPrice + deliveryFee}');
    expect(home).toContain('التوصيل إلى المنزل');
    expect(home).toContain('Object.prototype.hasOwnProperty.call(deliveryFees, selectedWilayaCode)');
    const styles = await readFile(new URL('./src/react-app/index.css', import.meta.url), 'utf8');
    expect(styles).toContain('.ecom12-video-card {\n  order: 8 !important;');
    expect(styles).toContain('height: min(460px, 60vh) !important;');
    expect(product).toContain('src: "/images/white-strawberry-cropped.webp"');
    const croppedProductImage = await readFile(new URL('./public/images/white-strawberry-cropped.webp', import.meta.url));
    expect(croppedProductImage.length).toBeGreaterThan(0);
    expect(home).toContain("/^(0[567]\\d{8}|\\+213[567]\\d{8})$/");
    expect(home.indexOf("fireFacebookEventOnce(product, 'Purchase'")).toBeLessThan(home.indexOf('const orderSaved = await saveOrder'));
    expect(home).toContain('`purchase:${leadId}`');
    expect(home).not.toContain('`view-content:${offerPrice}`');
    expect(home).toContain('price: offerPrice');
    expect(home).toContain('campaign: campaignLabel');
    expect(product).toContain('{ quantity: 1, price: 1990, label: "علبة واحدة" }');
    expect(product).toContain('price: 1990,');
    expect(product).toContain('{ quantity: 2, price: 2700, label: "علبتان" }');
    expect(product).toContain('{ quantity: 3, price: 3400, label: "3 علب" }');
  });

  it('stores the Meta Pixel ID behind dashboard authentication and initializes it from saved settings', async () => {
    const orders = await readFile(new URL('../api/orders.ts', import.meta.url), 'utf8');
    const dashboard = await readFile(new URL('./src/react-app/pages/Dashboard.tsx', import.meta.url), 'utf8');
    const home = await readFile(new URL('./src/react-app/pages/Home.tsx', import.meta.url), 'utf8');
    const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
    const pixel = await readFile(new URL('./src/react-app/lib/meta-pixel.ts', import.meta.url), 'utf8');
    expect(orders).toContain("'meta_pixel_id', '837444182648161'");
    expect(orders).toContain('resource === "pixel-config"');
    expect(orders).toContain('body.pixelId');
    expect(orders).toContain('!/^\\d{8,20}$/.test(pixelId)');
    expect(dashboard).toContain('معرّف Meta Pixel');
    expect(dashboard).toContain('حفظ معرّف Pixel');
    expect(pixel).toContain('resource=pixel-config');
    expect(pixel).toContain('"PageView"');
    expect(pixel).toContain('sessionStorage.getItem(storageKey)');
    expect(pixel).toContain('sendPageViewOnce(pixelId)');
    expect(pixel).toContain('Always ensure the real script is present');
    expect(home).toContain('getProductPurchaseEventData(product, offerPrice)');
    expect(html).not.toContain('837444182648161');
  });

  it('keeps EcoTrack and storefront codes aligned for wilayas 49-58', async () => {
    const ecoTrack = await readFile(new URL('../api/_lib/ecotrack.ts', import.meta.url), 'utf8');
    const orders = await readFile(new URL('../api/orders.ts', import.meta.url), 'utf8');
    const home = await readFile(new URL('./src/react-app/pages/Home.tsx', import.meta.url), 'utf8');
    expect(ecoTrack).toContain('49: 49, // Timimoun');
    expect(ecoTrack).toContain('58: 58, // El Meniaa');
    expect(orders).toContain('49: 49, // Timimoun');
    expect(orders).toContain('58: 58, // El Meniaa');
    expect(home).toContain("'49 - تيميمون'");
    expect(home).toContain("'58 - المنيعة'");
  });

  it('provides a real CRM order note field without removing shipping readiness', async () => {
    const orders = await readFile(new URL('../api/orders.ts', import.meta.url), 'utf8');
    const dashboard = await readFile(new URL('./src/react-app/pages/Dashboard.tsx', import.meta.url), 'utf8');
    expect(orders).toContain('body.action === "note"');
    expect(orders).toContain('تمت إضافة التعليق');
    expect(dashboard).toContain('إضافة تعليق');
    expect(dashboard).toContain('ملاحظات الطلب');
    expect(dashboard).toContain('جاهزية الشحن');
    expect(dashboard).not.toContain('إجراءات إضافية');
  });
});
