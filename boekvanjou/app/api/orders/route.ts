import { NextResponse } from 'next/server';
import { getStory } from '@/lib/stories';
import type { Format } from '@/lib/pricing';
import { newId, saveOrder, type Order } from '@/lib/store';
import { magDoor } from '@/lib/limiet';
import { drukbaar, nietDrukbaar } from '@/lib/letters';

const tekst = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Stap 1: het ontwerp opslaan. Er is dan nog niets besteld en er worden nog geen platen gemaakt.
export async function POST(req: Request) {
  if (!magDoor(req, 'ontwerp', 30)) return NextResponse.json({ fout: 'Te veel ontwerpen achter elkaar. Probeer het over een paar minuten opnieuw.' }, { status: 429 });
  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ fout: 'Ongeldig verzoek.' }, { status: 400 });
  const story = getStory(tekst(b.storySlug, 40));
  if (!story?.beschikbaar) return NextResponse.json({ fout: 'Dit verhaal is nog niet te bestellen.' }, { status: 400 });
  const childName = tekst(b.childName, 20);
  if (!/^[\p{L}][\p{L} '-]*$/u.test(childName)) return NextResponse.json({ fout: 'Vul de voornaam van het kind in (alleen letters).' }, { status: 400 });
  const opdracht = tekst(b.opdracht, 160).replace(/\s+/g, ' ');
  for (const [wat, t] of [['de naam', childName], ['de opdracht', opdracht]])
    if (!drukbaar(t)) return NextResponse.json({ fout: `In ${wat} staat een teken dat we nog niet kunnen drukken: ${nietDrukbaar(t)}` }, { status: 400 });
  const format: Format = b.format === 'softcover' ? 'softcover' : 'hardcover';

  const order: Order = {
    id: newId(),
    createdAt: new Date().toISOString(),
    storySlug: story.slug,
    format,
    aantal: 1,
    childName,
    opdracht,
    email: '',
    shipping: { naam: '', straat: '', postcode: '', plaats: '', land: 'NL' },
    totaalCents: 0,
    status: 'draft',
    hasPhoto: false,
    pages: story.scenes.map(() => ({ status: 'pending', attempts: 0, version: 0 })),
    regenerationsLeft: 3,
  };
  await saveOrder(order);
  return NextResponse.json({ id: order.id });
}
