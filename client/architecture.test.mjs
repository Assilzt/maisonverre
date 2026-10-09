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
    expect(home).toContain("/^(0[567]\\d{8}|\\+213[567]\\d{8})$/");
    expect(home.indexOf("fireFacebookEventOnce(product, 'Purchase'")).toBeLessThan(home.indexOf('const orderSaved = await saveOrder'));
    expect(home).toContain('`purchase:${leadId}`');
    expect(home).not.toContain('`view-content:${offerPrice}`');
    expect(home).toContain('price: offerPrice');
    expect(home).toContain('campaign: campaignLabel');
    expect(product).toContain('{ quantity: 1, price: 1990, label: "علبة واحدة" }');
    expect(product).toContain('{ quantity: 2, price: 2990, label: "علبتان" }');
    expect(product).toContain('{ quantity: 3, price: 3500, label: "3 علب" }');
  });

  it('stores the Meta Pixel ID behind dashboard authentication and initializes it from saved settings', async () => {
    const orders = await readFile(new URL('../api/orders.ts', import.meta.url), 'utf8');
    const dashboard = await readFile(new URL('./src/react-app/pages/Dashboard.tsx', import.meta.url), 'utf8');
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
    expect(html).not.toContain('837444182648161');
  });
});
