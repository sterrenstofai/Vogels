import { isPaid } from '@/lib/providers/payment';
import { getOrder, markPaid } from '@/lib/orders';
import { withLock } from '@/lib/store';

// Mollie meldt alleen een betaalnummer; de status halen we zelf bij Mollie op.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const paymentId = String(form?.get('id') || '');
  if (!/^tr_[A-Za-z0-9]+$/.test(paymentId)) return new Response('ok');
  const p = await isPaid(paymentId);
  if (p.orderId) {
    await withLock(p.orderId, async () => {
      // Ook een eerdere betaallink van dezelfde bestelling telt, als het bedrag klopt met wat er nu besteld is.
      const order = await getOrder(p.orderId!);
      if (!order || !p.paid || p.amount !== (order.totaalCents / 100).toFixed(2)) return;
      order.paymentId = paymentId;
      await markPaid(order);
    });
  }
  return new Response('ok');
}
