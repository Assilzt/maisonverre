type Request = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined> };
type Response = { status: (code: number) => Response; json: (body: unknown) => void; setHeader: (name: string, value: string) => void };

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

const getBody = (body: unknown) => {
  if (typeof body === 'string') {
    try { return JSON.parse(body) as Record<string, unknown>; } catch { return {}; }
  }
  return (body || {}) as Record<string, unknown>;
};

export default async function handler(request: Request, response: Response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (request.method === 'OPTIONS') { response.status(204).json({}); return; }
  if (request.method !== 'POST') { response.status(405).json({ error: 'الطريقة غير مدعومة' }); return; }
  if (!botToken || !chatId) { response.status(503).json({ error: 'إشعارات Telegram غير مهيأة على الخادم' }); return; }

  try {
    const body = getBody(request.body);
    const isEdit = body.action === 'edit';
    const action = isEdit ? 'editMessageText' : 'sendMessage';
    const text = String(body.text || '').trim();
    const messageId = Number(body.messageId || 0);
    if (!text || text.length > 4000) { response.status(400).json({ error: 'نص الرسالة غير صالح' }); return; }
    if (isEdit && (!Number.isInteger(messageId) || messageId <= 0)) { response.status(400).json({ error: 'رقم الرسالة غير صالح' }); return; }

    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isEdit ? { chat_id: chatId, message_id: messageId, text } : { chat_id: chatId, text }),
    });
    const data = await telegramResponse.json().catch(() => ({})) as { ok?: boolean; result?: { message_id?: number }; description?: string };
    if (!telegramResponse.ok || !data.ok) { response.status(502).json({ error: data.description || 'تعذر إرسال إشعار Telegram' }); return; }
    response.status(200).json({ ok: true, messageId: data.result?.message_id || messageId });
  } catch (error) {
    console.error('Telegram notification error', error instanceof Error ? error.message : 'unknown');
    response.status(502).json({ error: 'تعذر الاتصال بخدمة الإشعارات' });
  }
}

export const config = { runtime: 'nodejs' };
