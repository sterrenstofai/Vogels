// Opslag van bestellingen en bestanden. Alles loopt via een eenvoudige
// sleutel-waardeopslag met twee uitvoeringen: bestanden op schijf (lokaal) en
// Netlify Blobs (op Netlify, of met STORE=blobs). De Blobs-uitvoering is
// geschreven naar de documentatie en nog niet op Netlify zelf getest.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import type { Format } from './pricing';

export type PageState = { status: 'pending' | 'running' | 'done' | 'failed'; jobId?: string; attempts: number; version: number };
export type OrderStatus = 'draft' | 'awaiting_payment' | 'paid' | 'generating' | 'review' | 'printing' | 'shipped' | 'failed' | 'refunded';
export type Order = {
  id: string;
  createdAt: string;
  storySlug: string;
  format: Format;
  aantal: number;
  childName: string;
  opdracht: string;
  email: string;
  shipping: { naam: string; straat: string; postcode: string; plaats: string; land: string };
  totaalCents: number;
  status: OrderStatus;
  paymentId?: string;
  paidAt?: string;
  hasPhoto: boolean;
  refKey?: string; // geheime code waarmee de beelddienst de foto mag ophalen
  consentAt?: string;
  pages: PageState[];
  regenerationsLeft: number;
  printOrderId?: string;
  drukker?: string;
  inkoopCents?: number; // wat de drukker rekent, druk en verzending samen
  approvedAt?: string;
  track?: { code: string; url?: string };
  shippedAt?: string;
  refundedAt?: string;
  gemaild?: string[]; // welke berichten al verstuurd zijn, zodat niets dubbel gaat
  error?: string;
};

// ---- sleutel-waardeopslag ----
interface KV {
  get(key: string): Promise<Buffer | null>;
  set(key: string, data: Buffer | string): Promise<void>;
  del(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

const DIR = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR || '.data');
const schijf: KV = {
  async get(key) { try { return await fs.readFile(path.join(DIR, key)); } catch { return null; } },
  async set(key, data) {
    const p = path.join(DIR, key);
    await fs.mkdir(path.dirname(p), { recursive: true });
    const tmp = p + '.' + randomBytes(4).toString('hex');
    await fs.writeFile(tmp, data);
    await fs.rename(tmp, p);
  },
  async del(key) { await fs.rm(path.join(DIR, key), { force: true }); },
  async list(prefix) {
    const namen = await fs.readdir(path.join(DIR, prefix)).catch(() => [] as string[]);
    return namen.filter((n) => !/\.[a-f0-9]{8}$/.test(n)).map((n) => prefix + n);
  },
};

function blobs(): KV {
  const store = async () => (await import('@netlify/blobs')).getStore({ name: 'boekvanjou', consistency: 'strong' });
  return {
    async get(key) { const d = await (await store()).get(key, { type: 'arrayBuffer' }); return d ? Buffer.from(d) : null; },
    async set(key, data) { await (await store()).set(key, typeof data === 'string' ? data : new Uint8Array(data).buffer as ArrayBuffer); },
    async del(key) { await (await store()).delete(key); },
    async list(prefix) { return (await (await store()).list({ prefix })).blobs.map((b) => b.key); },
  };
}

// Op Netlify is de schijf alleen-lezen, dus daar moet het Blobs zijn. Tijdens het draaien
// zet Netlify niet NETLIFY maar wel NETLIFY_BLOBS_CONTEXT; STORE=blobs dwingt het af.
const opNetlify = () => !!(process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT || (globalThis as { netlifyBlobsContext?: unknown }).netlifyBlobsContext);
export const storeMode = () => (process.env.STORE === 'blobs' || (opNetlify() && process.env.STORE !== 'schijf') ? 'blobs' : 'schijf');
let _kv: KV | undefined;
const kv = () => (_kv ??= storeMode() === 'blobs' ? blobs() : schijf);

// ---- bestellingen en bestanden ----
const ID = /^[a-f0-9]{32}$/;
const FILE = /^[a-z0-9-]+\.(jpg|png|pdf)$/;
export const newId = () => randomBytes(16).toString('hex');
export const validId = (id: string) => ID.test(id);
const fileKey = (id: string, name: string) => {
  if (!ID.test(id) || !FILE.test(name)) throw new Error('ongeldig pad');
  return `files/${id}/${name}`;
};

export async function getOrder(id: string): Promise<Order | null> {
  if (!ID.test(id)) return null;
  const d = await kv().get(`orders/${id}.json`);
  try { return d ? JSON.parse(d.toString('utf8')) : null; } catch { return null; }
}
export const saveOrder = (order: Order) => kv().set(`orders/${order.id}.json`, JSON.stringify(order, null, 1));
export const deleteOrder = async (id: string) => { if (ID.test(id)) await kv().del(`orders/${id}.json`); };

export async function listAllOrders(): Promise<Order[]> {
  const keys = await kv().list('orders/');
  const uit = (await Promise.all(keys.filter((k) => k.endsWith('.json')).map((k) => getOrder(k.slice(7, -5))))).filter((o): o is Order => !!o);
  return uit.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function listOrders(email: string): Promise<Order[]> {
  return (await listAllOrders()).filter((o) => o.status !== 'draft' && o.email.toLowerCase() === email.toLowerCase());
}

export const putFile = (id: string, name: string, data: Buffer | Uint8Array) => kv().set(fileKey(id, name), Buffer.from(data));
export const getFile = (id: string, name: string) => kv().get(fileKey(id, name)).catch(() => null);
export const deleteFile = (id: string, name: string) => kv().del(fileKey(id, name));
export async function deleteFiles(id: string) {
  if (!ID.test(id)) return;
  for (const k of await kv().list(`files/${id}/`)) await kv().del(k);
}

// ---- losse gegevens: inloglinks, sessies en verstuurde mail ----
type Soort = 'logins' | 'sessions';
export type Record_ = { email: string; exp: number };
const recKey = (soort: Soort, id: string) => {
  if (!/^[a-f0-9]{64}$/.test(id)) throw new Error('ongeldig pad');
  return `${soort}/${id}.json`;
};
export const putRecord = (soort: Soort, id: string, data: Record_) => kv().set(recKey(soort, id), JSON.stringify(data));
export async function getRecord(soort: Soort, id: string): Promise<Record_ | null> {
  try {
    const d = await kv().get(recKey(soort, id));
    const r = d ? (JSON.parse(d.toString('utf8')) as Record_) : null;
    return r && r.exp > Date.now() ? r : null;
  } catch { return null; }
}
export async function delRecord(soort: Soort, id: string) { try { await kv().del(recKey(soort, id)); } catch {} }
export async function ruimRecordsOp() {
  for (const soort of ['logins', 'sessions'] as Soort[])
    for (const k of await kv().list(`${soort}/`)) {
      const d = await kv().get(k);
      try { if (!d || JSON.parse(d.toString('utf8')).exp < Date.now()) await kv().del(k); } catch { await kv().del(k); }
    }
}

export type MailLog = { at: string; aan: string; onderwerp: string; tekst: string; verstuurd: boolean; fout?: string };
export const logMail = (m: MailLog) => kv().set(`mail/${m.at.replace(/[^0-9]/g, '')}-${randomBytes(3).toString('hex')}.json`, JSON.stringify(m));
export async function listMail(max = 100): Promise<MailLog[]> {
  const keys = (await kv().list('mail/')).sort().reverse().slice(0, max);
  const uit = await Promise.all(keys.map(async (k) => { const d = await kv().get(k); try { return d ? (JSON.parse(d.toString('utf8')) as MailLog) : null; } catch { return null; } }));
  return uit.filter((m): m is MailLog => !!m);
}

// Eén bewerking per bestelling tegelijk. Dit werkt binnen één proces; op een
// platform met meerdere processen kan een stap heel soms dubbel lopen.
const locks = new Map<string, Promise<unknown>>();
export function withLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(id) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  const tail = next.catch(() => {});
  locks.set(id, tail);
  tail.then(() => { if (locks.get(id) === tail) locks.delete(id); });
  return next;
}
