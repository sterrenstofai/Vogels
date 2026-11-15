import { NextResponse } from 'next/server';
import { getOrder, publicView } from '@/lib/orders';
import { saveOrder, withLock } from '@/lib/store';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const b = await req.json().catch(() => ({}));
  return withLock(id, async () => {
    const order = await getOrder(id);
    if (!order) return NextResponse.json({ fout: 'Bestelling niet gevonden.' }, { status: 404 });
    const i = Number(b.pagina);
    if (order.status !== 'review' || !Number.isInteger(i) || !order.pages[i]) return NextResponse.json({ fout: 'Dat kan nu niet.' }, { status: 409 });
    if (order.regenerationsLeft <= 0) return NextResponse.json({ fout: 'Je hebt alle herkansingen gebruikt.' }, { status: 409 });
    order.regenerationsLeft--;
    order.pages[i] = { ...order.pages[i], status: 'pending', attempts: 0, jobId: undefined };
    order.status = 'generating';
    await saveOrder(order);
    return NextResponse.json(publicView(order));
  });
}
