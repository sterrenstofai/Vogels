import { timingSafeEqual } from 'node:crypto';
import { getFile, getOrder } from '@/lib/store';

// Platen en drukbestanden. Het adres bevat de geheime code van de bestelling.
// De foto zelf is alleen op te halen met een aparte sleutel, die alleen de beelddienst krijgt.
export async function GET(req: Request, ctx: { params: Promise<{ id: string; name: string }> }) {
  const { id, name } = await ctx.params;
  const order = await getOrder(id);
  const nee = () => new Response('Niet gevonden', { status: 404 });
  if (!order) return nee();
  if (name === 'foto.jpg') {
    const k = new URL(req.url).searchParams.get('k') || '';
    if (!order.refKey || k.length !== order.refKey.length || !timingSafeEqual(Buffer.from(k), Buffer.from(order.refKey))) return nee();
  } else if (!/^(pagina-\d{1,2}\.jpg|boek\.pdf|omslag\.pdf|druk-[a-z]+\.pdf)$/.test(name)) return nee();
  const data = await getFile(id, name);
  if (!data) return nee();
  return new Response(new Uint8Array(data), {
    headers: { 'Content-Type': name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' },
  });
}
