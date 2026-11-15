// De stappen na het betalen: beelden maken, laten nakijken, naar de drukker.
// `advance` wordt aangeroepen telkens als de klantpagina de stand opvraagt en zet
// dan de volgende stap; er is dus geen los achtergrondproces nodig.
import { getStory, vulNaam } from './stories';
import { imageProvider, PLAAT_PX } from './providers/images';
import { placePrintOrder } from './providers/print';
import { getFile, putFile, saveOrder, type Order } from './store';
import { bouwBoek } from './pdf';
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

  let bezig = order.pages.filter((p) => p.status === 'running').length;
  for (let i = 0; i < order.pages.length && bezig < TEGELIJK; i++) {
    const p = order.pages[i];
    if (p.status !== 'pending') continue;
    p.jobId = await provider.submit({ prompt: story.scenes[i].beeld, stijl: story.stijl, foto, pagina: i, naam: order.childName });
    p.status = 'running'; p.attempts++; bezig++;
  }

  if (order.pages.every((p) => p.status === 'done')) order.status = 'review';
  else if (!order.pages.some((p) => p.status === 'running' || p.status === 'pending')) order.status = 'failed';
  await saveOrder(order);
  return order;
}

export async function approve(order: Order): Promise<Order> {
  const story = getStory(order.storySlug)!;
  const paginas = [];
  for (let i = 0; i < story.scenes.length; i++) {
    const jpg = await getFile(order.id, pageFile(i));
    if (!jpg) throw new Error(`pagina ${i + 1} ontbreekt`);
    paginas.push({ tekst: vulNaam(story.scenes[i].tekst, order.childName), jpg });
  }
  const pdf = await bouwBoek({ titel: story.titel, naam: order.childName, opdracht: order.opdracht, paginas });
  await putFile(order.id, 'boek.pdf', pdf);
  order.printOrderId = await placePrintOrder(order, paginas.length + 2);
  order.status = 'printing';
  await saveOrder(order);
  return order;
}
