import { NextResponse } from 'next/server';
import { getStory } from '@/lib/stories';
import { orderTotaal, type Format } from '@/lib/pricing';
import { createPayment } from '@/lib/providers/payment';
import { getOrder, saveOrder, withLock } from '@/lib/store';

const tekst = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const LANDEN = ['NL', 'BE'];

// Stap 3: adres erbij en afrekenen.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ fout: 'Ongeldig verzoek.' }, { status: 400 });

  const format: Format = b.format === 'softcover' ? 'softcover' : 'hardcover';
  const aantal = Math.min(10, Math.max(1, Math.floor(Number(b.aantal)) || 1));
  const email = tekst(b.email, 120).toLowerCase();
  const shipping = { naam: tekst(b.naam, 80), straat: tekst(b.straat, 120), postcode: tekst(b.postcode, 12), plaats: tekst(b.plaats, 80), land: tekst(b.land, 2).toUpperCase() };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ fout: 'Dit e-mailadres klopt niet.' }, { status: 400 });
  if (!shipping.naam || !shipping.straat || !shipping.postcode || !shipping.plaats) return NextResponse.json({ fout: 'Vul het hele bezorgadres in.' }, { status: 400 });
  if (!LANDEN.includes(shipping.land)) return NextResponse.json({ fout: 'We bezorgen nu alleen in Nederland en België.' }, { status: 400 });
  if (b.akkoord !== true) return NextResponse.json({ fout: 'Ga eerst akkoord met de voorwaarden.' }, { status: 400 });

  return withLock(id, async () => {
    const order = await getOrder(id);
    if (!order) return NextResponse.json({ fout: 'Bestelling niet gevonden.' }, { status: 404 });
    if (order.status !== 'draft' && order.status !== 'awaiting_payment') return NextResponse.json({ fout: 'Deze bestelling is al betaald.' }, { status: 409 });
    Object.assign(order, { format, aantal, email, shipping, totaalCents: orderTotaal(format, aantal).totaal }); // de prijs rekent de server zelf uit
    try {
      const pay = await createPayment(order, `${getStory(order.storySlug)!.titel} voor ${order.childName}`);
      order.paymentId = pay.paymentId;
      order.status = 'awaiting_payment';
      await saveOrder(order);
      return NextResponse.json({ checkoutUrl: pay.checkoutUrl });
    } catch (e) {
      console.error(e);
      return NextResponse.json({ fout: 'Het betalen kon niet worden gestart. Probeer het zo nog eens.' }, { status: 502 });
    }
  });
}
