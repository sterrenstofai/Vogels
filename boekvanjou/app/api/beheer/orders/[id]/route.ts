import { NextResponse } from 'next/server';
import { adminEmail } from '@/lib/auth';
import { mailOver } from '@/lib/mail';
import { approve } from '@/lib/pipeline';
import { refund } from '@/lib/providers/payment';
import { deleteFile, getOrder, saveOrder, withLock } from '@/lib/store';

const tekst = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Handelingen van de beheerder op één bestelling.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const wie = await adminEmail();
  if (!wie) return NextResponse.json({ fout: 'Geen toegang.' }, { status: 403 });
  const oorsprong = req.headers.get('origin');
  if (oorsprong && new URL(oorsprong).host !== (req.headers.get('x-forwarded-host') || req.headers.get('host'))) return NextResponse.json({ fout: 'Geen toegang.' }, { status: 403 });
  const { id } = await ctx.params;
  const b = await req.json().catch(() => ({}));

  return withLock(id, async () => {
    const order = await getOrder(id);
    if (!order) return NextResponse.json({ fout: 'Bestelling niet gevonden.' }, { status: 404 });
    console.log(`[beheer] ${wie}: ${b.actie} op ${id}`);
    try {
      switch (b.actie) {
        case 'opnieuw': // mislukte platen nog eens proberen
          if (!order.hasPhoto) return NextResponse.json({ fout: 'Er is geen foto meer bij deze bestelling.' }, { status: 409 });
          order.pages = order.pages.map((p) => (p.status === 'done' ? p : { ...p, status: 'pending', attempts: 0, jobId: undefined }));
          order.status = 'generating'; order.error = undefined;
          order.gemaild = order.gemaild?.filter((m) => m !== 'nakijken' && m !== 'mislukt');
          break;
        case 'herkansingen':
          order.regenerationsLeft += 3;
          break;
        case 'drukker': // nog eens naar de drukker sturen
          if (order.status !== 'review' && order.status !== 'printing') return NextResponse.json({ fout: 'Dit boek is nog niet klaar om te drukken.' }, { status: 409 });
          await approve(order);
          return NextResponse.json({ ok: true });
        case 'verzonden': {
          const code = tekst(b.code, 60);
          const url = tekst(b.url, 300);
          if (url && !/^https:\/\//.test(url)) return NextResponse.json({ fout: 'Het volgadres moet met https:// beginnen.' }, { status: 400 });
          order.track = code || url ? { code, url: url || undefined } : undefined;
          order.status = 'shipped'; order.shippedAt = new Date().toISOString();
          await saveOrder(order);
          await mailOver(order, 'verzonden');
          return NextResponse.json({ ok: true });
        }
        case 'terugbetalen':
          if (!order.paidAt || order.refundedAt) return NextResponse.json({ fout: 'Deze bestelling kan niet (nog eens) worden terugbetaald.' }, { status: 409 });
          await refund(order);
          order.status = 'refunded'; order.refundedAt = new Date().toISOString();
          await saveOrder(order);
          await mailOver(order, 'terugbetaald');
          return NextResponse.json({ ok: true });
        case 'verwijderfoto':
          await deleteFile(id, 'foto.jpg');
          order.hasPhoto = false; order.refKey = undefined;
          break;
        default:
          return NextResponse.json({ fout: 'Onbekende handeling.' }, { status: 400 });
      }
      await saveOrder(order);
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error('[beheer]', e);
      return NextResponse.json({ fout: e instanceof Error ? e.message : 'Er ging iets mis.' }, { status: 502 });
    }
  });
}
