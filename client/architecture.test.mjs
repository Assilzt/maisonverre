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
    expect(app).toContain('<Route path="/" element={isDashboard ? <Dashboard /> : <HomePage />} />');
    expect(app).toContain('<Route path="/ecom12" element={<HomePage design="ecom12" />} />');
    expect(home).toContain("fetch('/api/orders'");
    expect(home).toContain("fetch('/api/telegram'");
    expect(home).toContain("fireFacebookEventOnce(product, 'Purchase'");
    expect(home).toContain("fireFacebookEventOnce(product, 'Lead'");
    expect(home).toContain("fireFacebookEvent('ViewContent', productEventData)");
    expect(home).toContain('`purchase:${leadId}`');
    expect(home).not.toContain('`view-content:${offerPrice}`');
    expect(home).toContain('price: offerPrice');
    expect(home).toContain('campaign: campaignLabel');
    expect(product).toContain('{ quantity: 1, price: 1990, label: "علبة واحدة" }');
    expect(product).toContain('{ quantity: 2, price: 2990, label: "علبتان" }');
    expect(product).toContain('{ quantity: 3, price: 3500, label: "3 علب" }');
  });
});
