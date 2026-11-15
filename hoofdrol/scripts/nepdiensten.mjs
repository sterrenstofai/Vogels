// Nagemaakte versies van Higgsfield, Mollie, Resend en Gelato, om de echte koppelingen
// te proberen zonder accounts. Ze volgen de documentatie van die diensten zo goed als
// bekend; waar de documentatie niet te lezen was (Gelato) is de vorm een aanname.
//
//   node scripts/nepdiensten.mjs            (luistert op poort 4010)
//
// Start de site daarna met de instellingen die dit script afdrukt.
import http from 'node:http';
import { readFileSync } from 'node:fs';

const POORT = Number(process.env.NEP_POORT) || 4010;
const ik = `http://localhost:${POORT}`;
const plaat = readFileSync(new URL('../public/voorbeeld/ruimteschipper/plaat-0.jpg', import.meta.url));
const beelden = new Map(), betalingen = new Map();
export const log = { higgsfield: [], mail: [], gelato: [], druk429: 0 };
let teller = 0;

const lees = (req) => new Promise((r) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => r(d)); });
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

http.createServer(async (req, res) => {
  const u = new URL(req.url, ik);
  const body = req.method === 'POST' ? await lees(req) : '';
  const b = (() => { try { return JSON.parse(body); } catch { return {}; } })();

  // ---- Higgsfield ----
  if (req.method === 'POST' && u.pathname === '/xai/grok-imagine-image-2.0') {
    if (!/^Key .+:.+/.test(req.headers.authorization || '')) return json(res, 401, { error: 'unauthorized' });
    if (++teller % 4 === 0) { log.druk429++; return json(res, 429, { error: 'rate_limit_reached' }); }
    // De dienst moet de referenties kunnen ophalen: de foto met sleutel, daarna de eerste plaat.
    const ref = await Promise.all((b.image_urls || []).map((x) => fetch(x).then((r) => `${r.status} ${r.headers.get('content-type')}`).catch(() => 'onbereikbaar')));
    const id = 'req' + teller;
    beelden.set(id, Date.now() + 700);
    log.higgsfield.push({ refs: ref, resolution: b.resolution, aspect: b.aspect_ratio, prompt: b.prompt });
    return json(res, 200, { status: 'queued', request_id: id, status_url: `${ik}/requests/${id}/status`, cancel_url: `${ik}/requests/${id}/cancel` });
  }
  const st = u.pathname.match(/^\/requests\/(\w+)\/status$/);
  if (st) {
    const t = beelden.get(st[1]);
    if (!t) return json(res, 404, {});
    return json(res, 200, Date.now() < t ? { status: 'in_progress', request_id: st[1] } : { status: 'completed', request_id: st[1], images: [{ url: `${ik}/beeld.jpg` }] });
  }
  if (u.pathname === '/beeld.jpg') { res.writeHead(200, { 'Content-Type': 'image/jpeg' }); return res.end(plaat); }

  // ---- Mollie ----
  if (req.method === 'POST' && u.pathname === '/v2/payments') {
    const id = 'tr_nep' + (betalingen.size + 1);
    betalingen.set(id, { ...b, status: 'open' });
    return json(res, 201, { id, status: 'open', _links: { checkout: { href: `${ik}/betaal/${id}` } } });
  }
  const bt = u.pathname.match(/^\/betaal\/(\w+)$/);
  if (bt) { const p = betalingen.get(bt[1]); p.status = 'paid'; res.writeHead(302, { Location: p.redirectUrl }); return res.end(); }
  const terug = u.pathname.match(/^\/v2\/payments\/(\w+)\/refunds$/);
  if (terug) { betalingen.get(terug[1]).status = 'refunded'; return json(res, 201, { id: 're_nep' }); }
  const pg = u.pathname.match(/^\/v2\/payments\/(\w+)$/);
  if (pg) { const p = betalingen.get(pg[1]); return p ? json(res, 200, { id: pg[1], status: p.status, amount: p.amount, metadata: p.metadata }) : json(res, 404, {}); }

  // ---- Resend ----
  if (req.method === 'POST' && u.pathname === '/emails') { log.mail.push({ van: b.from, aan: b.to, onderwerp: b.subject }); return json(res, 200, { id: 'mail' + log.mail.length }); }

  // ---- Gelato (vorm is een aanname) ----
  if (u.pathname.endsWith('/cover-dimensions')) {
    const p = Number(u.searchParams.get('pageCount'));
    const rug = 8, rand = 17, blad = 200;
    return json(res, 200, { productUid: 'nep', pageCount: p, measureUnit: 'mm',
      wraparoundEdgeSize: { left: 0, top: 0, width: 2 * rand + 2 * blad + rug, height: blad + 2 * rand },
      contentBackSize: { left: rand, top: rand, width: blad, height: blad },
      spineSize: { left: rand + blad, top: rand, width: rug, height: blad },
      contentFrontSize: { left: rand + blad + rug, top: rand, width: blad, height: blad } });
  }
  if (req.method === 'POST' && u.pathname === '/v4/orders:quote') return json(res, 200, { quotes: [{ products: [{ price: 12.4 * (b.products?.[0]?.quantity || 1) }], shipmentMethods: [{ price: 6.9, maxDeliveryDays: 4 }, { price: 4.2, maxDeliveryDays: 7 }] }] });
  if (req.method === 'POST' && u.pathname === '/v4/orders') {
    const f = b.items?.[0]?.files?.[0]?.url;
    const r = await fetch(f).then(async (x) => `${x.status} ${x.headers.get('content-type')} ${(await x.arrayBuffer()).byteLength} bytes`).catch(() => 'onbereikbaar');
    log.gelato.push({ bestand: r, pageCount: b.items?.[0]?.pageCount, aantal: b.items?.[0]?.quantity, adres: b.shippingAddress?.city });
    return json(res, 200, { id: 'gelato-nep-1' });
  }
  if (u.pathname === '/_log') return json(res, 200, log);
  json(res, 404, { fout: 'onbekend pad ' + u.pathname });
}).listen(POORT, () => console.log(`Nepdiensten op ${ik}. Start de site met:
SITE_URL=http://localhost:3000 HIGGSFIELD_API=${ik} HIGGSFIELD_KEY_ID=a HIGGSFIELD_KEY_SECRET=b MOLLIE_API=${ik} MOLLIE_API_KEY=test_x RESEND_API=${ik} RESEND_API_KEY=x GELATO_ORDER_API=${ik} GELATO_PRODUCT_API=${ik} GELATO_API_KEY=x GELATO_PRODUCT_UID_HARDCOVER=nep npm run dev`));
