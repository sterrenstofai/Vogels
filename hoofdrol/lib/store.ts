// Opslag van bestellingen en bestanden op schijf. Bewust achter een paar
// functies gehouden, zodat dit later een database en objectopslag kan worden.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import type { Format } from './pricing';

export type PageState = { status: 'pending' | 'running' | 'done' | 'failed'; jobId?: string; attempts: number; version: number };
export type OrderStatus = 'draft' | 'awaiting_payment' | 'paid' | 'generating' | 'review' | 'printing' | 'failed';
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
  consentAt?: string;
  pages: PageState[];
  regenerationsLeft: number;
  printOrderId?: string;
  drukker?: string;
  inkoopCents?: number; // wat de drukker rekent, druk en verzending samen
  error?: string;
};

const DIR = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR || '.data');
const ID = /^[a-f0-9]{32}$/;
const FILE = /^[a-z0-9-]+\.(jpg|png|pdf)$/;

export const newId = () => randomBytes(16).toString('hex');
export const validId = (id: string) => ID.test(id);

const orderPath = (id: string) => path.join(DIR, 'orders', `${id}.json`);
const filePath = (id: string, name: string) => {
  if (!ID.test(id) || !FILE.test(name)) throw new Error('ongeldig pad');
  return path.join(DIR, 'files', id, name);
};

export async function getOrder(id: string): Promise<Order | null> {
  if (!ID.test(id)) return null;
  try {
    return JSON.parse(await fs.readFile(orderPath(id), 'utf8'));
  } catch {
    return null;
  }
}

export async function saveOrder(order: Order) {
  await fs.mkdir(path.dirname(orderPath(order.id)), { recursive: true });
  const tmp = orderPath(order.id) + '.' + randomBytes(4).toString('hex');
  await fs.writeFile(tmp, JSON.stringify(order, null, 1));
  await fs.rename(tmp, orderPath(order.id));
}

export async function putFile(id: string, name: string, data: Buffer | Uint8Array) {
  const p = filePath(id, name);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, data);
}

export async function getFile(id: string, name: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(filePath(id, name));
  } catch {
    return null;
  }
}

export async function deleteFile(id: string, name: string) {
  await fs.rm(filePath(id, name), { force: true });
}

export async function listOrders(email: string): Promise<Order[]> {
  const dir = path.join(DIR, 'orders');
  const namen = await fs.readdir(dir).catch(() => [] as string[]);
  const uit: Order[] = [];
  for (const n of namen) {
    if (!n.endsWith('.json')) continue;
    const o = await getOrder(n.slice(0, -5));
    if (o && o.status !== 'draft' && o.email.toLowerCase() === email.toLowerCase()) uit.push(o);
  }
  return uit.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Kleine losse gegevens: inloglinks en sessies.
type Soort = 'logins' | 'sessions';
export type Record_ = { email: string; exp: number };
const recPath = (soort: Soort, id: string) => {
  if (!/^[a-f0-9]{64}$/.test(id)) throw new Error('ongeldig pad');
  return path.join(DIR, soort, `${id}.json`);
};
export async function putRecord(soort: Soort, id: string, data: Record_) {
  await fs.mkdir(path.dirname(recPath(soort, id)), { recursive: true });
  await fs.writeFile(recPath(soort, id), JSON.stringify(data));
}
export async function getRecord(soort: Soort, id: string): Promise<Record_ | null> {
  try {
    const r = JSON.parse(await fs.readFile(recPath(soort, id), 'utf8')) as Record_;
    return r.exp > Date.now() ? r : null;
  } catch {
    return null;
  }
}
export async function delRecord(soort: Soort, id: string) {
  try { await fs.rm(recPath(soort, id), { force: true }); } catch {}
}

// Eén bewerking per bestelling tegelijk (binnen dit proces).
const locks = new Map<string, Promise<unknown>>();
export function withLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(id) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  const tail = next.catch(() => {});
  locks.set(id, tail);
  tail.then(() => { if (locks.get(id) === tail) locks.delete(id); });
  return next;
}
