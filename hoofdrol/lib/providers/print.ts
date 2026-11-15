// Drukkers. Elke drukker kan een offerte geven en een bestelling aannemen.
// Bij het versturen vragen we alle drukkers om een prijs en kiezen de goedkoopste.
// Zonder sleutels doen twee testdrukkers mee; er wordt dan niets gedrukt.
//
// Let op: de Gelato-koppeling is geschreven naar hun documentatie (Order API v4)
// en nog niet tegen een echt account getest.
import type { Order } from '../store';

export type Offerte = { drukker: string; drukCents: number; verzendCents: number; werkdagen: number };
export interface Drukker {
  naam: string;
  offerte(order: Order, paginas: number): Promise<Offerte | null>;
  bestel(order: Order, paginas: number): Promise<string>;
}

const SITE = () => (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

const testdrukker = (naam: string, hard: number, zacht: number, verzend: number, werkdagen: number): Drukker => ({
  naam,
  async offerte(order) {
    return { drukker: naam, drukCents: (order.format === 'hardcover' ? hard : zacht) * order.aantal, verzendCents: verzend, werkdagen };
  },
  async bestel(order) {
    return `${naam}_${order.id.slice(0, 8)}`;
  },
});

function gelatoBody(order: Order, paginas: number) {
  const productUid = order.format === 'hardcover' ? process.env.GELATO_PRODUCT_UID_HARDCOVER : process.env.GELATO_PRODUCT_UID_SOFTCOVER;
  if (!productUid) throw new Error('GELATO_PRODUCT_UID ontbreekt voor ' + order.format);
  const [voornaam, ...rest] = order.shipping.naam.trim().split(/\s+/);
  return {
    orderReferenceId: order.id,
    customerReferenceId: order.id,
    currency: 'EUR',
    items: [{ itemReferenceId: order.id + '-boek', productUid, pageCount: paginas, quantity: order.aantal, files: [{ type: 'default', url: `${SITE()}/api/orders/${order.id}/files/boek.pdf` }] }],
    shippingAddress: { firstName: voornaam, lastName: rest.join(' ') || voornaam, addressLine1: order.shipping.straat, postCode: order.shipping.postcode, city: order.shipping.plaats, country: order.shipping.land, email: order.email },
  };
}

const gelato: Drukker = {
  naam: 'gelato',
  async offerte(order, paginas) {
    const b = gelatoBody(order, paginas);
    const res = await fetch('https://order.gelatoapis.com/v4/orders:quote', {
      method: 'POST',
      headers: { 'X-API-KEY': process.env.GELATO_API_KEY!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderReferenceId: b.orderReferenceId, customerReferenceId: b.customerReferenceId, currency: 'EUR', recipient: b.shippingAddress, products: b.items }),
    });
    if (!res.ok) throw new Error(`Gelato offerte ${res.status}: ${await res.text()}`);
    const q = (await res.json()).quotes?.[0];
    const verzend = q?.shipmentMethods?.slice().sort((x: { price: number }, y: { price: number }) => x.price - y.price)[0];
    if (!q || !verzend) return null;
    const druk = q.products.reduce((s: number, p: { price: number }) => s + p.price, 0);
    return { drukker: 'gelato', drukCents: Math.round(druk * 100), verzendCents: Math.round(verzend.price * 100), werkdagen: verzend.maxDeliveryDays ?? 7 };
  },
  async bestel(order, paginas) {
    const res = await fetch('https://order.gelatoapis.com/v4/orders', {
      method: 'POST',
      headers: { 'X-API-KEY': process.env.GELATO_API_KEY!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderType: 'order', shipmentMethodUid: 'standard', ...gelatoBody(order, paginas) }),
    });
    if (!res.ok) throw new Error(`Gelato ${res.status}: ${await res.text()}`);
    return (await res.json()).id;
  },
};

// Een nieuwe drukker koppelen: een Drukker schrijven en hier toevoegen.
export function drukkers(): Drukker[] {
  const echt = [process.env.GELATO_API_KEY ? gelato : null].filter((d): d is Drukker => !!d);
  return echt.length ? echt : [testdrukker('testdruk-a', 1350, 750, 450, 6), testdrukker('testdruk-b', 1490, 820, 395, 4)];
}

export const printMode = () => (process.env.GELATO_API_KEY ? 'echt' : 'test');

// Vraagt alle drukkers om een prijs. Een drukker die niet antwoordt, doet niet mee.
export async function offertes(order: Order, paginas: number): Promise<Offerte[]> {
  const uit = await Promise.all(drukkers().map((d) => d.offerte(order, paginas).catch((e) => { console.error(`[drukker ${d.naam}]`, e); return null; })));
  return uit.filter((o): o is Offerte => !!o).sort((a, b) => a.drukCents + a.verzendCents - (b.drukCents + b.verzendCents));
}

export async function placePrintOrder(order: Order, paginas: number): Promise<{ id: string; offerte: Offerte }> {
  const [beste] = await offertes(order, paginas);
  if (!beste) throw new Error('geen enkele drukker gaf een offerte');
  const id = await drukkers().find((d) => d.naam === beste.drukker)!.bestel(order, paginas);
  return { id, offerte: beste };
}
