// Betalen. Met MOLLIE_API_KEY loopt het via Mollie, anders via een testbetaling op de site.
import type { Order } from '../store';

const SITE = () => (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
const KEY = () => process.env.MOLLIE_API_KEY || '';

export const paymentMode = () => (KEY() ? 'mollie' : 'test');

export async function createPayment(order: Order, omschrijving: string): Promise<{ paymentId: string; checkoutUrl: string }> {
  if (!KEY()) return { paymentId: 'test_' + order.id, checkoutUrl: `/betalen/test/${order.id}` };
  const body: Record<string, unknown> = {
    amount: { currency: 'EUR', value: (order.totaalCents / 100).toFixed(2) },
    description: omschrijving,
    redirectUrl: `${SITE()}/maken/${order.id}`,
    metadata: { orderId: order.id },
    locale: 'nl_NL',
  };
  // Mollie kan een webhook op localhost niet bereiken en weigert die dan.
  if (!/localhost|127\.0\.0\.1/.test(SITE())) body.webhookUrl = `${SITE()}/api/webhooks/mollie`;
  const res = await fetch('https://api.mollie.com/v2/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Mollie ${res.status}: ${await res.text()}`);
  const p = await res.json();
  return { paymentId: p.id, checkoutUrl: p._links.checkout.href };
}

// Vraagt de status altijd bij Mollie zelf op; de inhoud van de webhook vertrouwen we niet.
export async function isPaid(paymentId: string): Promise<{ paid: boolean; orderId?: string; amount?: string }> {
  if (!KEY()) return { paid: false };
  const res = await fetch(`https://api.mollie.com/v2/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${KEY()}` },
  });
  if (!res.ok) return { paid: false };
  const p = await res.json();
  return { paid: p.status === 'paid', orderId: p.metadata?.orderId, amount: p.amount?.value };
}

// Geld terugstorten. In de testversie gebeurt er niets.
export async function refund(order: Order): Promise<void> {
  if (!KEY() || !order.paymentId || order.paymentId.startsWith('test_')) return;
  const res = await fetch(`https://api.mollie.com/v2/payments/${encodeURIComponent(order.paymentId)}/refunds`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: { currency: 'EUR', value: (order.totaalCents / 100).toFixed(2) }, description: 'Terugbetaling Hoofdrol' }),
  });
  if (!res.ok) throw new Error(`Mollie ${res.status}: ${await res.text()}`);
}
