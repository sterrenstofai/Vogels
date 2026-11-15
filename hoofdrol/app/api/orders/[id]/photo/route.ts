import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { getOrder, publicView } from '@/lib/orders';
import { newId, putFile, saveOrder, withLock } from '@/lib/store';

const MAX = 12 * 1024 * 1024;

// Pas na betaling: foto ontvangen en het maken van de platen starten.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (Number(req.headers.get('content-length') || 0) > MAX + 4096) return NextResponse.json({ fout: 'De foto is te groot (maximaal 12 MB).' }, { status: 413 });
  const vooraf = await getOrder(id);
  if (!vooraf) return NextResponse.json({ fout: 'Bestelling niet gevonden.' }, { status: 404 });
  if (vooraf.status === 'awaiting_payment' || vooraf.status === 'draft') return NextResponse.json({ fout: 'Deze bestelling is nog niet betaald.' }, { status: 402 });
  const form = await req.formData().catch(() => null);
  const file = form?.get('foto');
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ fout: 'Kies eerst een foto.' }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ fout: 'De foto is te groot (maximaal 12 MB).' }, { status: 413 });
  if (form?.get('toestemming') !== 'ja') return NextResponse.json({ fout: 'We hebben je toestemming nodig om de foto te gebruiken.' }, { status: 400 });

  let jpg: Buffer;
  try {
    // Opnieuw opslaan als jpg: dat haalt locatie en andere gegevens uit het bestand.
    jpg = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 60_000_000 }).rotate().resize(1536, 1536, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
  } catch {
    return NextResponse.json({ fout: 'Dit bestand konden we niet lezen. Gebruik een jpg, png of webp.' }, { status: 400 });
  }

  return withLock(id, async () => {
    const order = await getOrder(id);
    if (!order) return NextResponse.json({ fout: 'Bestelling niet gevonden.' }, { status: 404 });
    if (order.status === 'awaiting_payment' || order.status === 'draft') return NextResponse.json({ fout: 'Deze bestelling is nog niet betaald.' }, { status: 402 });
    if (order.status !== 'paid') return NextResponse.json({ fout: 'Voor deze bestelling is al een foto gebruikt.' }, { status: 409 });
    await putFile(id, 'foto.jpg', jpg);
    order.hasPhoto = true;
    order.refKey = newId();
    order.consentAt = new Date().toISOString();
    order.status = 'generating';
    await saveOrder(order);
    return NextResponse.json(publicView(order));
  });
}
