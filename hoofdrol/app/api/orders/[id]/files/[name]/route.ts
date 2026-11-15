import { getFile, getOrder } from '@/lib/store';

// Platen en het drukbestand. Het adres bevat de geheime code van de bestelling.
export async function GET(_: Request, ctx: { params: Promise<{ id: string; name: string }> }) {
  const { id, name } = await ctx.params;
  if (!/^(pagina-\d{1,2}\.jpg|boek\.pdf)$/.test(name) || !(await getOrder(id))) return new Response('Niet gevonden', { status: 404 });
  const data = await getFile(id, name);
  if (!data) return new Response('Niet gevonden', { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: { 'Content-Type': name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' },
  });
}
