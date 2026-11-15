// Beelden maken. Elke aanbieder werkt met "opdracht insturen, later ophalen",
// dus dat is ook de vorm hier: submit geeft een jobId, poll geeft het beeld zodra het klaar is.
//
// Nu is er alleen de testmaker: die tekent zelf een plaat en zet de geüploade
// foto in de helm, zodat de hele keten te proberen is zonder kosten.
// De echte koppeling (Higgsfield of Magnific) komt hier als tweede ImageProvider.
import sharp from 'sharp';

export type ImageJob = { prompt: string; stijl: string; foto: Buffer; pagina: number; naam: string };
export type PollResult = { status: 'running' } | { status: 'failed'; reden: string } | { status: 'done'; image: Buffer };
export interface ImageProvider {
  naam: string;
  submit(job: ImageJob): Promise<string>;
  poll(jobId: string): Promise<PollResult>;
}

export const PLAAT_PX = 1600;

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

export const imageProvider = (): ImageProvider => testProvider;
