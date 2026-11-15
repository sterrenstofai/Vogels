// Drukkers. Elke drukker kan een offerte geven en een bestelling aannemen.
// Bij het versturen vragen we alle drukkers om een prijs en kiezen de goedkoopste.
// Zonder sleutels doen twee testdrukkers mee; er wordt dan niets gedrukt.
//
// Let op: de Gelato-koppeling is geschreven naar hun documentatie (Order API v4)
// en nog niet tegen een echt account getest.
import { getFile, putFile, type Order } from '../store';
import { bouwOmslag, voegSamen, type OmslagMaten } from '../pdf';
import { getStory } from '../stories';

export type Offerte = { drukker: string; drukCents: number; verzendCents: number; werkdagen: number };
export interface Drukker {
  naam: string;
  offerte(order: Order, paginas: number): Promise<Offerte | null>;
  bestel(order: Order, paginas: number): Promise<string>;
}

const G_ORDER = () => (process.env.GELATO_ORDER_API || 'https://order.gelatoapis.com').replace(/\/$/, '');
const G_PRODUCT = () => (process.env.GELATO_PRODUCT_API || 'https://product.gelatoapis.com').replace(/\/$/, '');
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

const gelatoProduct = (order: Order) => {
  const uid = order.format === 'hardcover' ? process.env.GELATO_PRODUCT_UID_HARDCOVER : process.env.GELATO_PRODUCT_UID_SOFTCOVER;
  if (!uid) throw new Error('GELATO_PRODUCT_UID ontbreekt voor ' + order.format);
  return uid;
};

// Gelato rekent de omslagmaten per product en aantal bladzijden uit. Kloppen de
// velden niet met wat we verwachten, dan stoppen we: liever geen bestelling dan een scheve omslag.
async function gelatoOmslagMaten(order: Order, paginas: number): Promise<OmslagMaten> {
  const res = await fetch(`${G_PRODUCT()}/v3/products/${encodeURIComponent(gelatoProduct(order))}/cover-dimensions?pageCount=${paginas}`, { headers: { 'X-API-KEY': process.env.GELATO_API_KEY! } });
  if (!res.ok) throw new Error(`Gelato omslagmaten ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const d = await res.json();
  const vlak = (v: { left?: number; top?: number; width?: number; height?: number } | undefined) => {
    if (!v || [v.left, v.top, v.width, v.height].some((n) => typeof n !== 'number')) throw new Error('Gelato gaf onverwachte omslagmaten; de bestelling is niet geplaatst');
    return { x: v.left!, y: v.top!, b: v.width!, h: v.height! };
  };
  const voor = vlak(d.contentFrontSize), achter = vlak(d.contentBackSize), rug = vlak(d.spineSize);
  const alles = Object.values(d).filter((v): v is { left: number; top: number; width: number; height: number } => !!v && typeof v === 'object' && typeof (v as { left?: unknown }).left === 'number');
  return {
    breedte: Math.max(...alles.map((v) => v.left + v.width)),
    hoogte: Math.max(...alles.map((v) => v.top + v.height)),
    voor, achter, rug: { x: rug.x, b: rug.b },
  };
}

function gelatoBody(order: Order, paginas: number) {
  const productUid = gelatoProduct(order);
  const [voornaam, ...rest] = order.shipping.naam.trim().split(/\s+/);
  return {
    orderReferenceId: order.id,
    customerReferenceId: order.id,
    currency: 'EUR',
    items: [{ itemReferenceId: order.id + '-boek', productUid, pageCount: paginas, quantity: order.aantal, files: [{ type: 'default', url: `${SITE()}/api/orders/${order.id}/files/druk-gelato.pdf` }] }],
    shippingAddress: { firstName: voornaam, lastName: rest.join(' ') || voornaam, addressLine1: order.shipping.straat, postCode: order.shipping.postcode, city: order.shipping.plaats, country: order.shipping.land, email: order.email },
  };
}

const gelato: Drukker = {
  naam: 'gelato',
  async offerte(order, paginas) {
    const b = gelatoBody(order, paginas);
    const res = await fetch(`${G_ORDER()}/v4/orders:quote`, {
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
    // Gelato wil één bestand: omslag, leeg schutblad, binnenwerk, leeg schutblad.
    const [binnen, plaat] = await Promise.all([getFile(order.id, 'boek.pdf'), getFile(order.id, 'pagina-0.jpg')]);
    if (!binnen || !plaat) throw new Error('drukbestand ontbreekt');
    const omslag = await bouwOmslag({ titel: getStory(order.storySlug)!.titel, naam: order.childName, plaat, maten: await gelatoOmslagMaten(order, paginas) });
    await putFile(order.id, 'druk-gelato.pdf', await voegSamen(omslag, binnen));
    const res = await fetch(`${G_ORDER()}/v4/orders`, {
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
