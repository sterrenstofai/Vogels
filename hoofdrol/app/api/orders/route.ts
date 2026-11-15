import { NextResponse } from 'next/server';
import { getStory } from '@/lib/stories';
import { orderTotaal, type Format } from '@/lib/pricing';
import { createPayment } from '@/lib/providers/payment';
import { newId, saveOrder, type Order } from '@/lib/store';

const tekst = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const LANDEN = ['NL', 'BE'];

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ fout: 'Ongeldig verzoek.' }, { status: 400 });

  const story = getStory(tekst(b.storySlug, 40));
  if (!story?.beschikbaar) return NextResponse.json({ fout: 'Dit verhaal is nog niet te bestellen.' }, { status: 400 });
  const format: Format = b.format === 'softcover' ? 'softcover' : 'hardcover';
  const aantal = Math.min(10, Math.max(1, Math.floor(Number(b.aantal)) || 1));
  const childName = tekst(b.childName, 20);
  const email = tekst(b.email, 120);
  const shipping = { naam: tekst(b.naam, 80), straat: tekst(b.straat, 120), postcode: tekst(b.postcode, 12), plaats: tekst(b.plaats, 80), land: tekst(b.land, 2).toUpperCase() };

  if (!/^[\p{L}][\p{L} '-]*$/u.test(childName)) return NextResponse.json({ fout: 'Vul de voornaam van het kind in (alleen letters).' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ fout: 'Dit e-mailadres klopt niet.' }, { status: 400 });
  if (!shipping.naam || !shipping.straat || !shipping.postcode || !shipping.plaats) return NextResponse.json({ fout: 'Vul het hele bezorgadres in.' }, { status: 400 });
  if (!LANDEN.includes(shipping.land)) return NextResponse.json({ fout: 'We bezorgen nu alleen in Nederland en België.' }, { status: 400 });
  if (b.akkoord !== true) return NextResponse.json({ fout: 'Ga eerst akkoord met de voorwaarden.' }, { status: 400 });

  const order: Order = {
    id: newId(),
    createdAt: new Date().toISOString(),
    storySlug: story.slug,
    format,
    aantal,
    childName,
    email,
    shipping,
    totaalCents: orderTotaal(format, aantal).totaal, // de prijs rekent de server zelf uit
    status: 'awaiting_payment',
    hasPhoto: false,
    pages: story.scenes.map(() => ({ status: 'pending', attempts: 0, version: 0 })),
    regenerationsLeft: 3,
  };
  try {
    const pay = await createPayment(order, `${story.titel} voor ${childName}`);
    order.paymentId = pay.paymentId;
    await saveOrder(order);
    return NextResponse.json({ checkoutUrl: pay.checkoutUrl });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ fout: 'Het betalen kon niet worden gestart. Probeer het zo nog eens.' }, { status: 502 });
  }
}
