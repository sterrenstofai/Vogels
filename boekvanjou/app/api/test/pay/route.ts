import { NextResponse } from 'next/server';
import { getOrder, markPaid } from '@/lib/orders';
import { paymentMode } from '@/lib/providers/payment';

// Testbetaling. Bestaat alleen zolang er geen Mollie-sleutel is ingesteld.
export async function POST(req: Request) {
  if (paymentMode() !== 'test') return NextResponse.json({ fout: 'Niet beschikbaar.' }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const order = await getOrder(String(b.id || ''));
  if (!order) return NextResponse.json({ fout: 'Bestelling niet gevonden.' }, { status: 404 });
  await markPaid(order);
  return NextResponse.json({ ok: true });
}
