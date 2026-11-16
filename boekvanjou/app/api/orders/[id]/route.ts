import { NextResponse } from 'next/server';
import { checkPayment, getOrder, publicView } from '@/lib/orders';
import { advance } from '@/lib/pipeline';
import { withLock } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const view = await withLock(id, async () => {
    let order = await getOrder(id);
    if (!order) return null;
    order = await checkPayment(order);
    try {
      order = await advance(order);
    } catch (e) {
      console.error('[pipeline]', e);
    }
    return publicView(order);
  });
  if (!view) return NextResponse.json({ fout: 'Bestelling niet gevonden.' }, { status: 404 });
  return NextResponse.json(view, { headers: { 'Cache-Control': 'no-store' } });
}
