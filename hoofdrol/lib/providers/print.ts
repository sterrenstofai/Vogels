// Drukker. Met GELATO_API_KEY gaat de bestelling naar Gelato, anders naar een nepdrukker.
// Let op: de Gelato-koppeling is geschreven naar hun documentatie (Order API v4)
// en nog niet tegen een echt account getest.
import type { Order } from '../store';

const SITE = () => (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export const printMode = () => (process.env.GELATO_API_KEY ? 'gelato' : 'test');

export async function placePrintOrder(order: Order, paginas: number): Promise<string> {
  const key = process.env.GELATO_API_KEY;
  if (!key) return 'testdruk_' + order.id.slice(0, 8);
  const productUid = order.format === 'hardcover' ? process.env.GELATO_PRODUCT_UID_HARDCOVER : process.env.GELATO_PRODUCT_UID_SOFTCOVER;
  if (!productUid) throw new Error('GELATO_PRODUCT_UID ontbreekt voor ' + order.format);
  const [voornaam, ...rest] = order.shipping.naam.trim().split(/\s+/);
  const res = await fetch('https://order.gelatoapis.com/v4/orders', {
    method: 'POST',
    headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderType: 'order',
      orderReferenceId: order.id,
      customerReferenceId: order.id,
      currency: 'EUR',
      items: [{
        itemReferenceId: order.id + '-boek',
        productUid,
        pageCount: paginas,
        quantity: order.aantal,
        files: [{ type: 'default', url: `${SITE()}/api/orders/${order.id}/files/boek.pdf` }],
      }],
      shipmentMethodUid: 'standard',
      shippingAddress: {
        firstName: voornaam,
        lastName: rest.join(' ') || voornaam,
        addressLine1: order.shipping.straat,
        postCode: order.shipping.postcode,
        city: order.shipping.plaats,
        country: order.shipping.land,
        email: order.email,
      },
    }),
  });
  if (!res.ok) throw new Error(`Gelato ${res.status}: ${await res.text()}`);
  return (await res.json()).id;
}
