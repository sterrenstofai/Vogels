import { timingSafeEqual } from 'node:crypto';
import { mailOver } from '@/lib/mail';
import { getOrder, saveOrder, withLock } from '@/lib/store';

// Meldingen van de drukker: zodra er een volgcode is, gaat de bestelling op "onderweg".
// Geschreven naar de documentatie van Gelato en nog niet met echte meldingen getest;
// de velden worden daarom ruim gelezen.
export async function POST(req: Request) {
  const geheim = process.env.DRUKKER_WEBHOOK_SECRET || '';
  const gegeven = new URL(req.url).searchParams.get('s') || '';
  if (!geheim || gegeven.length !== geheim.length || !timingSafeEqual(Buffer.from(gegeven), Buffer.from(geheim))) return new Response('geen toegang', { status: 403 });
  const b = await req.json().catch(() => null);
  const id = String(b?.orderReferenceId || b?.order?.orderReferenceId || '');
  const zending = b?.trackingCode ? b : b?.fulfillments?.[0] || b?.items?.[0]?.fulfillments?.[0] || b?.shipment || {};
  const code = String(zending.trackingCode || '').slice(0, 60);
  const url = String(zending.trackingUrl || '');
  if (!id || !code) return new Response('ok');
  await withLock(id, async () => {
    const order = await getOrder(id);
    if (!order || order.status !== 'printing') return;
    order.track = { code, url: /^https:\/\//.test(url) ? url.slice(0, 300) : undefined };
    order.status = 'shipped'; order.shippedAt = new Date().toISOString();
    await saveOrder(order);
    await mailOver(order, 'verzonden');
  });
  return new Response('ok');
}
