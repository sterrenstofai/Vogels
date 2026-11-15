import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { checkPayment } from '@/lib/orders';
import { advance } from '@/lib/pipeline';
import { deleteFile, deleteFiles, deleteOrder, getOrder, listAllOrders, ruimRecordsOp, saveOrder, withLock } from '@/lib/store';

export const dynamic = 'force-dynamic';
const DAG = 24 * 60 * 60 * 1000;

// Draait elke paar minuten. Zet bestellingen door als de klant de pagina heeft
// dichtgedaan, en ruimt op: oude ontwerpen, onbetaalde bestellingen en foto's die te lang blijven liggen.
export async function GET(req: Request) {
  const geheim = process.env.CRON_SECRET || '';
  const gegeven = new URL(req.url).searchParams.get('s') || req.headers.get('authorization')?.replace(/^Bearer /, '') || '';
  if (!geheim || gegeven.length !== geheim.length || !timingSafeEqual(Buffer.from(gegeven), Buffer.from(geheim))) return NextResponse.json({ fout: 'Geen toegang.' }, { status: 403 });

  const uit = { doorgezet: 0, verwijderd: 0, fotos: 0 };
  for (const o of await listAllOrders()) {
    const oud = Date.now() - new Date(o.createdAt).getTime();
    if ((o.status === 'draft' && oud > 7 * DAG) || (o.status === 'awaiting_payment' && oud > 14 * DAG)) {
      await deleteFiles(o.id); await deleteOrder(o.id); uit.verwijderd++;
      continue;
    }
    if (o.status === 'awaiting_payment' || o.status === 'generating') {
      await withLock(o.id, async () => {
        let order = await getOrder(o.id);
        if (!order) return;
        order = await checkPayment(order);
        await advance(order).catch((e) => console.error('[tick]', e));
      });
      uit.doorgezet++;
    }
    // Een foto die 90 dagen na betaling nog niet tot een boek heeft geleid, gaat weg.
    if (o.hasPhoto && ['generating', 'review', 'failed'].includes(o.status) && oud > 90 * DAG) {
      await deleteFile(o.id, 'foto.jpg');
      await saveOrder({ ...o, hasPhoto: false, refKey: undefined }); uit.fotos++;
    }
  }
  await ruimRecordsOp();
  return NextResponse.json(uit);
}
