// De stappen na het betalen: beelden maken, laten nakijken, naar de drukker.
// `advance` wordt aangeroepen telkens als de klantpagina de stand opvraagt en zet
// dan de volgende stap; er is dus geen los achtergrondproces nodig.
import { getStory } from './stories';
import { Druk, imageProvider, PLAAT_PX } from './providers/images';
import { placePrintOrder } from './providers/print';
import { getFile, putFile, saveOrder, type Order } from './store';
import { bouwBinnenwerk, bouwOmslag } from './pdf';
import { boekBladen } from './boek';
import { mailOver } from './mail';
import sharp from 'sharp';

const TEGELIJK = 4;
const MAX_POGINGEN = 3;
export const pageFile = (i: number) => `pagina-${i}.jpg`;

export async function advance(order: Order): Promise<Order> {
  if (order.status !== 'generating') return order;
  const story = getStory(order.storySlug)!;
  const provider = imageProvider();
  const foto = await getFile(order.id, 'foto.jpg');
  if (!foto) { order.status = 'paid'; order.hasPhoto = false; await saveOrder(order); return order; }

  for (let i = 0; i < order.pages.length; i++) {
    const p = order.pages[i];
    if (p.status !== 'running' || !p.jobId) continue;
    const r = await provider.poll(p.jobId);
    if (r.status === 'done') {
      const jpg = await sharp(r.image).resize(PLAAT_PX, PLAAT_PX, { fit: 'cover' }).jpeg({ quality: 88 }).toBuffer();
      await putFile(order.id, pageFile(i), jpg);
      p.status = 'done'; p.jobId = undefined; p.version++;
    } else if (r.status === 'failed') {
      p.jobId = undefined;
      p.status = p.attempts >= MAX_POGINGEN ? 'failed' : 'pending';
      if (p.status === 'failed') order.error = r.reden;
    }
  }

  // De eerste plaat gaat voorop: die dient daarna als voorbeeld, zodat het kind
  // en de tekenstijl op alle platen hetzelfde blijven.
  const site = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const fotoUrl = `${site}/api/orders/${order.id}/files/foto.jpg?k=${order.refKey}`;
  const eersteKlaar = order.pages[0].status === 'done';
  let bezig = order.pages.filter((p) => p.status === 'running').length;
  for (let i = 0; i < order.pages.length && bezig < TEGELIJK; i++) {
    const p = order.pages[i];
    if (p.status !== 'pending') continue;
    if (i > 0 && !eersteKlaar) break;
    try {
      p.jobId = await provider.submit({
        prompt: story.scenes[i].prompt, stijl: story.stijl, foto, pagina: i, naam: order.childName,
        referenties: i > 0 ? [fotoUrl, `${site}/api/orders/${order.id}/files/${pageFile(0)}`] : [fotoUrl],
      });
    } catch (e) {
      if (e instanceof Druk) break; // straks opnieuw
      console.error('[beelden]', e);
      p.attempts++;
      if (p.attempts >= MAX_POGINGEN) { p.status = 'failed'; order.error = e instanceof Error ? e.message : 'onbekende fout'; }
      continue;
    }
    p.status = 'running'; p.attempts++; bezig++;
  }

  if (order.pages.every((p) => p.status === 'done')) order.status = 'review';
  else if (!order.pages.some((p) => p.status === 'running' || p.status === 'pending')) order.status = 'failed';
  await saveOrder(order);
  if (order.status === 'review') await mailOver(order, 'nakijken');
  if (order.status === 'failed') await mailOver(order, 'mislukt');
  return order;
}

export async function approve(order: Order): Promise<Order> {
  const story = getStory(order.storySlug)!;
  const platen: Buffer[] = [];
  for (let i = 0; i < story.scenes.length; i++) {
    const jpg = await getFile(order.id, pageFile(i));
    if (!jpg) throw new Error(`plaat ${i + 1} ontbreekt`);
    platen.push(jpg);
  }
  const bladen = boekBladen(story, order.childName, order.opdracht);
  await putFile(order.id, 'boek.pdf', await bouwBinnenwerk({ bladen, platen }));
  await putFile(order.id, 'omslag.pdf', await bouwOmslag({ titel: story.titel, naam: order.childName, plaat: platen[0] }));
  const druk = await placePrintOrder(order, bladen.length);
  order.printOrderId = druk.id;
  order.drukker = druk.offerte.drukker;
  order.inkoopCents = druk.offerte.drukCents + druk.offerte.verzendCents;
  console.log(`[drukker] ${order.id}: ${order.drukker}, inkoop ${(order.inkoopCents / 100).toFixed(2)} op een bestelling van ${(order.totaalCents / 100).toFixed(2)}`);
  if (order.inkoopCents > order.totaalCents * 0.6) console.warn(`[drukker] let op: inkoop is meer dan 60% van de bestelling ${order.id}`);
  order.status = 'printing';
  order.approvedAt = new Date().toISOString();
  await saveOrder(order);
  await mailOver(order, 'drukker');
  return order;
}
