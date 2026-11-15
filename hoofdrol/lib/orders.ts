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
    format: order.format,
    aantal: order.aantal,
    totaalCents: order.totaalCents,
    regenerationsLeft: order.regenerationsLeft,
    error: order.status === 'failed' ? order.error ?? 'onbekende fout' : undefined,
    pages: order.pages.map((p, i) => ({ status: p.status, version: p.version, tekst: story.scenes[i].tekst.replaceAll('{naam}', order.childName) })),
  };
}

export { getOrder };
