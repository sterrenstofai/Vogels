import type { Order } from './store';
import { BTW } from './pricing';

export const STATUS: Record<Order['status'], [string, string]> = {
  draft: ['Ontwerp', ''],
  awaiting_payment: ['Wacht op betaling', ''],
  paid: ['Betaald, wacht op foto', 'let'],
  generating: ['Platen maken', 'let'],
  review: ['Klant kijkt na', 'let'],
  printing: ['Bij de drukker', 'goed'],
  shipped: ['Verzonden', 'goed'],
  failed: ['Mislukt', 'fout'],
  refunded: ['Terugbetaald', ''],
};

const betaald = (o: Order) => !!o.paidAt && !o.refundedAt;
export function cijfers(orders: Order[]) {
  const b = orders.filter(betaald);
  const omzet = b.reduce((s, o) => s + o.totaalCents, 0);
  const metInkoop = b.filter((o) => o.inkoopCents != null);
  return {
    bestellingen: b.length,
    omzet,
    actie: orders.filter((o) => o.status === 'failed').length,
    onderweg: orders.filter((o) => ['paid', 'generating', 'review'].includes(o.status)).length,
    // Marge op bestellingen die al bij de drukker zijn: omzet zonder btw min inkoop. Beeld- en betaalkosten zitten hier niet in.
    marge: metInkoop.reduce((s, o) => s + Math.round(o.totaalCents / (1 + BTW)) - o.inkoopCents!, 0),
    margeOver: metInkoop.length,
  };
}
