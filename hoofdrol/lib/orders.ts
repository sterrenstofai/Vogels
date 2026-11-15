import { getStory } from './stories';
import { isPaid, paymentMode } from './providers/payment';
import { getOrder, saveOrder, type Order } from './store';

export async function markPaid(order: Order) {
  if (order.status !== 'awaiting_payment') return order;
  order.status = 'paid';
  order.paidAt = new Date().toISOString();
  await saveOrder(order);
  // Hier hoort de bevestigingsmail met de link naar /maken/<id> (nog niet gekoppeld).
  console.log(`[bestelling] betaald: ${order.id} — link voor de klant: /maken/${order.id}`);
  return order;
}

// Controleert bij Mollie of er betaald is en of het bedrag klopt.
export async function checkPayment(order: Order) {
  if (order.status !== 'awaiting_payment' || paymentMode() !== 'mollie' || !order.paymentId) return order;
  const p = await isPaid(order.paymentId);
  if (p.paid && p.orderId === order.id && p.amount === (order.totaalCents / 100).toFixed(2)) return markPaid(order);
  return order;
}

// Wat de klantpagina te zien krijgt.
export function publicView(order: Order) {
  const story = getStory(order.storySlug)!;
  return {
    id: order.id,
    status: order.status,
    titel: story.titel,
    childName: order.childName,
    opdracht: order.opdracht,
    storySlug: order.storySlug,
    format: order.format,
    aantal: order.aantal,
    totaalCents: order.totaalCents,
    regenerationsLeft: order.regenerationsLeft,
    error: order.status === 'failed' ? order.error ?? 'onbekende fout' : undefined,
    pages: order.pages.map((p, i) => ({ status: p.status, version: p.version, tekst: story.scenes[i].tekst.replaceAll('{naam}', order.childName) })),
  };
}

export { getOrder };

// Waar een bestelling staat, in gewone woorden, en wat de klant nu kan doen.
export const STAPPEN = ['Betaald', 'Foto', 'Platen', 'Nakijken', 'Drukker'];
export function stand(order: Order): { stap: number; tekst: string; actie: string } {
  switch (order.status) {
    case 'awaiting_payment': return { stap: 0, tekst: 'Wacht op betaling', actie: 'Bekijk' };
    case 'paid': return { stap: 1, tekst: 'Betaald. Stuur nu de foto in.', actie: 'Stuur de foto in' };
    case 'generating': return { stap: 2, tekst: 'We maken de platen.', actie: 'Bekijk de voortgang' };
    case 'review': return { stap: 3, tekst: 'Klaar om na te kijken.', actie: 'Kijk het boek na' };
    case 'printing': return { stap: 5, tekst: 'Bij de drukker. Ongeveer een week onderweg.', actie: 'Bekijk het boek' };
    case 'failed': return { stap: 2, tekst: 'Er ging iets mis. We kijken ernaar.', actie: 'Bekijk' };
    default: return { stap: 0, tekst: 'Nog niet besteld', actie: 'Ga verder' };
  }
}
