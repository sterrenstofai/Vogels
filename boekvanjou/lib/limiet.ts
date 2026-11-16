// Eenvoudige rem op misbruik: een maximum per adres per tien minuten.
// Dit telt per proces; voor zwaarder verkeer hoort er een gedeelde teller voor in de plaats.
const tellers = new Map<string, { n: number; tot: number }>();

export function magDoor(req: Request, soort: string, max: number) {
  const ip = (req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || 'onbekend').split(',')[0].trim();
  const sleutel = `${soort}:${ip}`;
  const nu = Date.now();
  const t = tellers.get(sleutel);
  if (!t || t.tot < nu) { tellers.set(sleutel, { n: 1, tot: nu + 10 * 60 * 1000 }); return true; }
  if (tellers.size > 5000) for (const [k, v] of tellers) if (v.tot < nu) tellers.delete(k);
  return ++t.n <= max;
}
