import { NextResponse } from 'next/server';
import { getOrder, publicView } from '@/lib/orders';
import { approve } from '@/lib/pipeline';
import { deleteFile, saveOrder, withLock } from '@/lib/store';

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withLock(id, async () => {
    const order = await getOrder(id);
    if (!order) return NextResponse.json({ fout: 'Bestelling niet gevonden.' }, { status: 404 });
    if (order.status !== 'review') return NextResponse.json({ fout: 'Dit boek kan nu niet naar de drukker.' }, { status: 409 });
    try {
      const klaar = await approve(order);
      await deleteFile(id, 'foto.jpg'); // de foto is niet meer nodig
      klaar.hasPhoto = false; klaar.refKey = undefined;
      await saveOrder(klaar);
      return NextResponse.json(publicView(klaar));
    } catch (e) {
      console.error('[drukker]', e);
      return NextResponse.json({ fout: 'Het versturen naar de drukker lukte niet. Probeer het zo nog eens.' }, { status: 502 });
    }
  });
}
