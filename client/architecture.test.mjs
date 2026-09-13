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
});
