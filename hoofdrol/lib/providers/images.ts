// Beelden maken. Elke aanbieder werkt met "opdracht insturen, later ophalen",
// dus dat is ook de vorm hier: submit geeft een jobId, poll geeft het beeld zodra het klaar is.
//
// Zonder sleutels werkt de testmaker: die tekent zelf een plaat en zet de geüploade
// foto in de helm, zodat de hele keten te proberen is zonder kosten.
// Met HIGGSFIELD_KEY_ID en HIGGSFIELD_KEY_SECRET gaan de platen via de Higgsfield-API
// (model Grok Image 2.0, dat referentiefoto's aanneemt). Die koppeling is geschreven
// naar de documentatie en nog niet met een echte sleutel getest; hetzelfde model is
// wel met de hand geprobeerd en houdt een kind goed herkenbaar.
import sharp from 'sharp';

export type ImageJob = {
  prompt: string;
  stijl: string;
  pagina: number;
  naam: string;
  foto: Buffer; // voor de testmaker
  referenties: string[]; // openbare adressen: eerst de foto, daarna (als die er is) de eerste plaat
};
// Te veel opdrachten tegelijk: later opnieuw proberen, telt niet als mislukte poging.
export class Druk extends Error {}
export type PollResult = { status: 'running' } | { status: 'failed'; reden: string } | { status: 'done'; image: Buffer };
export interface ImageProvider {
  naam: string;
  submit(job: ImageJob): Promise<string>;
  poll(jobId: string): Promise<PollResult>;
}

export const PLAAT_PX = 2048; // ruim 250 dpi op 20 cm

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const LUCHTEN = ['#1d2b8f', '#3a1d8f', '#0b3d6e', '#5a189a', '#12355b', '#283593'];

const g = globalThis as unknown as { __testJobs?: Map<string, { job: ImageJob; klaarOm: number }> };
const jobs = (g.__testJobs ??= new Map());

const testProvider: ImageProvider = {
  naam: 'test',
  async submit(job) {
    const id = 'job_' + Math.random().toString(36).slice(2);
    jobs.set(id, { job, klaarOm: Date.now() + 1200 + Math.random() * 2500 });
    return id;
  },
  async poll(jobId) {
    const j = jobs.get(jobId);
    if (!j) return { status: 'failed', reden: 'opdracht niet gevonden (server opnieuw gestart)' };
    if (Date.now() < j.klaarOm) return { status: 'running' };
    jobs.delete(jobId);
    const { job } = j;
    const S = PLAAT_PX;
    let rnd = job.pagina * 7919 + 13;
    const r = () => ((rnd = (rnd * 1103515245 + 12345) % 2147483648) / 2147483648);
    const sterren = Array.from({ length: 70 }, () => `<circle cx="${r() * S}" cy="${r() * S}" r="${2 + r() * 5}" fill="#fff" opacity="${0.4 + r() * 0.6}"/>`).join('');
    const lucht = LUCHTEN[job.pagina % LUCHTEN.length];
    const px = 250 + r() * 250, py = 300 + r() * 200;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
      <rect width="${S}" height="${S}" fill="${lucht}"/>${sterren}
      <circle cx="${px}" cy="${py}" r="170" fill="#ffd23f"/><circle cx="${px - 50}" cy="${py - 40}" r="34" fill="#f5b700"/><circle cx="${px + 60}" cy="${py + 50}" r="22" fill="#f5b700"/>
      <ellipse cx="${S / 2}" cy="${S + 260}" rx="${S * 0.8}" ry="520" fill="#c9c9d6"/>
      <g transform="translate(${S / 2} ${S * 0.56})">
        <rect x="-190" y="230" width="380" height="430" rx="150" fill="#f4f4f8"/>
        <rect x="-70" y="330" width="140" height="90" rx="20" fill="#ff2e93"/>
        <circle r="300" fill="#f4f4f8"/><circle r="245" fill="#0b1026"/>
      </g>
      <text x="${S / 2}" y="${S - 70}" text-anchor="middle" font-family="sans-serif" font-size="44" fill="#1d2b8f" opacity=".7">testplaat ${job.pagina + 1} · ${esc(job.naam)}</text>
    </svg>`;
    const D = 470;
    const masker = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${D}" height="${D}"><circle cx="${D / 2}" cy="${D / 2}" r="${D / 2}"/></svg>`);
    const gezicht = await sharp(job.foto).resize(D, D, { fit: 'cover', position: 'attention' }).composite([{ input: masker, blend: 'dest-in' }]).png().toBuffer();
    const image = await sharp(Buffer.from(svg))
      .composite([{ input: gezicht, left: Math.round(S / 2 - D / 2), top: Math.round(S * 0.56 - D / 2) }])
      .jpeg({ quality: 86 })
      .toBuffer();
    return { status: 'done', image };
  },
};

export function bouwPrompt(job: Pick<ImageJob, 'prompt' | 'stijl' | 'referenties'>) {
  const tweede = job.referenties.length > 1;
  return [
    job.stijl,
    tweede ? 'Use the exact same illustration style and the same illustrated character as in the second reference image.' : '',
    'The main character is the child from the reference photo, drawn as an illustrated character but clearly recognisable: same face shape, hair, skin and smile.',
    `Scene: ${job.prompt}.`,
    'Full square composition, the child\'s face clearly visible. No text, no letters, no captions in the image.',
  ].filter(Boolean).join(' ');
}

const HF = 'https://api.higgsfield.ai';
const hfKop = () => ({ Authorization: `Key ${process.env.HIGGSFIELD_KEY_ID}:${process.env.HIGGSFIELD_KEY_SECRET}`, 'Content-Type': 'application/json' });

const higgsfield: ImageProvider = {
  naam: 'higgsfield',
  async submit(job) {
    const res = await fetch(`${HF}/${process.env.HIGGSFIELD_MODEL || 'xai/grok-imagine-image-2.0'}`, {
      method: 'POST',
      headers: { ...hfKop(), 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ prompt: bouwPrompt(job), image_urls: job.referenties, resolution: '2k', aspect_ratio: '1:1', quality: 'medium' }),
    });
    if (res.status === 429) throw new Druk('te veel opdrachten tegelijk');
    if (!res.ok) throw new Error(`Higgsfield ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const r = await res.json();
    if (typeof r.status_url !== 'string' || !r.status_url.startsWith(HF + '/')) throw new Error('Higgsfield gaf geen status_url');
    return r.status_url;
  },
  async poll(statusUrl) {
    if (!statusUrl.startsWith(HF + '/')) return { status: 'failed', reden: 'onbekende opdracht' };
    const res = await fetch(statusUrl, { headers: hfKop() });
    if (res.status === 429 || res.status >= 500) return { status: 'running' };
    if (!res.ok) return { status: 'failed', reden: `status ${res.status}` };
    const r = await res.json();
    if (r.status === 'completed') {
      const url = r.images?.[0]?.url;
      if (!url) return { status: 'failed', reden: 'geen beeld in het antwoord' };
      const img = await fetch(url);
      if (!img.ok) return { status: 'failed', reden: `beeld ophalen gaf ${img.status}` };
      return { status: 'done', image: Buffer.from(await img.arrayBuffer()) };
    }
    if (r.status === 'nsfw') return { status: 'failed', reden: 'geweigerd door het beeldfilter' };
    if (r.status === 'failed' || r.status === 'canceled') return { status: 'failed', reden: r.status };
    return { status: 'running' };
  },
};

export const imageMode = () => (process.env.HIGGSFIELD_KEY_ID && process.env.HIGGSFIELD_KEY_SECRET ? 'higgsfield' : 'test');
export const imageProvider = (): ImageProvider => (imageMode() === 'higgsfield' ? higgsfield : testProvider);
