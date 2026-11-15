// Bouwt de drukbestanden: het binnenwerk en de omslag.
// Vierkante bladzijden van 20 cm met afloop rondom. De tekst zetten we zelf,
// in een vast lettertype; die laat je niet aan het beeldmodel over.
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import sharp from 'sharp';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Blad } from './boek';

const MM = 72 / 25.4;
const BLAD_MM = 200;
const AFLOOP = 3 * MM;
const KANT = BLAD_MM * MM + 2 * AFLOOP;
const INKT = rgb(0.07, 0.07, 0.12);
const GRIJS = rgb(0.43, 0.43, 0.45);
const PAPIER = rgb(0.985, 0.972, 0.945);
const WIT = rgb(1, 1, 1);

const font = (gewicht: number) =>
  fs.readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), 'node_modules/@fontsource/baloo-2/files', `baloo-2-latin-${gewicht}-normal.woff`));

function regels(tekst: string, f: PDFFont, grootte: number, breedte: number) {
  const uit: string[] = [];
  let regel = '';
  for (const woord of tekst.split(/\s+/).filter(Boolean)) {
    const probeer = regel ? regel + ' ' + woord : woord;
    if (regel && f.widthOfTextAtSize(probeer, grootte) > breedte) { uit.push(regel); regel = woord; } else regel = probeer;
  }
  if (regel) uit.push(regel);
  return uit;
}

// Zet een blok tekst gecentreerd rond (cx, cy).
function blok(page: PDFPage, tekst: string, f: PDFFont, grootte: number, cx: number, cy: number, breedte: number, kleur = INKT, max = 99) {
  const rr = regels(tekst, f, grootte, breedte).slice(0, max);
  const stap = grootte * 1.22;
  rr.forEach((r, i) => page.drawText(r, { x: cx - f.widthOfTextAtSize(r, grootte) / 2, y: cy + ((rr.length - 1) / 2 - i) * stap - grootte * 0.32, size: grootte, font: f, color: kleur }));
}

async function fonts(pdf: PDFDocument) {
  pdf.registerFontkit(fontkit);
  return { vet: await pdf.embedFont(await font(700), { subset: true }), normaal: await pdf.embedFont(await font(500), { subset: true }) };
}

export async function bouwBinnenwerk(opts: { bladen: Blad[]; platen: Buffer[] }) {
  const pdf = await PDFDocument.create();
  const { vet, normaal } = await fonts(pdf);
  const m = KANT / 2;
  for (const [i, b] of opts.bladen.entries()) {
    const page = pdf.addPage([KANT, KANT]);
    if (b.soort === 'plaat') {
      page.drawImage(await pdf.embedJpg(opts.platen[b.plaat]), { x: 0, y: 0, width: KANT, height: KANT });
      continue;
    }
    page.drawRectangle({ x: 0, y: 0, width: KANT, height: KANT, color: b.soort === 'leeg' ? WIT : PAPIER });
    if (b.soort === 'titel') {
      if (!pdf.getTitle()) pdf.setTitle(`${b.titel} — ${b.naam}`);
      blok(page, b.titel, vet, 46, m, KANT * 0.6, KANT * 0.7);
      blok(page, `met ${b.naam} in de hoofdrol`, normaal, 20, m, KANT * 0.6 - 62, KANT * 0.7, GRIJS);
      blok(page, b.opdracht, normaal, 16, m, KANT * 0.26, KANT * 0.56, INKT, 5);
    } else if (b.soort === 'tekst') {
      blok(page, b.tekst, vet, 40, m, m, KANT - 2 * AFLOOP - 56 * MM);
      blok(page, String(i + 1), normaal, 11, m, AFLOOP + 11 * MM, 100, GRIJS);
    } else if (b.soort === 'einde') {
      blok(page, 'Einde', vet, 40, m, m, KANT * 0.7);
    } else if (b.soort === 'colofon') {
      blok(page, `Dit boek is speciaal gemaakt voor ${b.naam}.`, normaal, 13, m, AFLOOP + 30 * MM, KANT * 0.6, GRIJS);
      blok(page, `Hoofdrol, ${new Date().getFullYear()}`, normaal, 11, m, AFLOOP + 18 * MM, KANT * 0.6, GRIJS);
    }
  }
  return Buffer.from(await pdf.save());
}

// Waar de delen van de omslag liggen, in millimeters vanaf linksboven.
export type OmslagMaten = { breedte: number; hoogte: number; voor: Vlak; achter: Vlak; rug: { x: number; b: number } };
type Vlak = { x: number; y: number; b: number; h: number };

// Standaardmaten: achterkant, rug, voorkant, met afloop rondom.
export function standaardMaten(rugMm = Number(process.env.OMSLAG_RUG_MM) || 6, afloopMm = Number(process.env.OMSLAG_AFLOOP_MM) || 3): OmslagMaten {
  return {
    breedte: 2 * BLAD_MM + rugMm + 2 * afloopMm,
    hoogte: BLAD_MM + 2 * afloopMm,
    achter: { x: afloopMm, y: afloopMm, b: BLAD_MM, h: BLAD_MM },
    rug: { x: afloopMm + BLAD_MM, b: rugMm },
    voor: { x: afloopMm + BLAD_MM + rugMm, y: afloopMm, b: BLAD_MM, h: BLAD_MM },
  };
}

// De omslag als één vel: achterkant, rug, voorkant. De maten verschillen per drukker
// en uitvoering; zonder opgave gelden de standaardmaten.
export async function bouwOmslag(opts: { titel: string; naam: string; plaat: Buffer; maten?: OmslagMaten }) {
  const mt = opts.maten ?? standaardMaten();
  const B = mt.breedte * MM;
  const H = mt.hoogte * MM;
  const pdf = await PDFDocument.create();
  const { vet, normaal } = await fonts(pdf);
  const page = pdf.addPage([B, H]);
  page.drawRectangle({ x: 0, y: 0, width: B, height: H, color: rgb(0.02, 0.027, 0.1) });

  // Voorkant: de eerste plaat, bovenaan donkerder gemaakt zodat de titel leesbaar is.
  // Het beeld loopt door tot de rechter-, boven- en onderrand van het vel (afloop of omslag om het karton).
  const PX = 2400;
  const sluier = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${PX}" height="${PX}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05071a" stop-opacity=".88"/><stop offset=".42" stop-color="#05071a" stop-opacity="0"/></linearGradient></defs><rect width="${PX}" height="${PX}" fill="url(#g)"/></svg>`);
  const voor = await sharp(opts.plaat).resize(PX, PX, { fit: 'cover' }).composite([{ input: sluier }]).jpeg({ quality: 90 }).toBuffer();
  const vx = mt.voor.x * MM;
  const zijde = Math.max(B - vx, H);
  page.drawImage(await pdf.embedJpg(voor), { x: vx, y: (H - zijde) / 2, width: zijde, height: zijde });
  const marge = 16 * MM;
  const top = H - mt.voor.y * MM - marge;
  const tt = regels(opts.titel, vet, 44, mt.voor.b * MM - 2 * marge);
  tt.forEach((r, i) => page.drawText(r, { x: vx + marge, y: top - 34 - i * 46, size: 44, font: vet, color: WIT }));
  page.drawText(`met ${opts.naam} in de hoofdrol`, { x: vx + marge, y: top - 34 - tt.length * 46 + 8, size: 17, font: normaal, color: WIT });

  // Achterkant en rug.
  const ax = (mt.achter.x + mt.achter.b / 2) * MM;
  const onder = H - (mt.achter.y + mt.achter.h) * MM;
  blok(page, `Een avontuur met ${opts.naam} in de hoofdrol.`, normaal, 16, ax, onder + mt.achter.h * MM * 0.56, mt.achter.b * MM * 0.6, WIT);
  blok(page, 'HOOFDROL', vet, 11, ax, onder + 16 * MM, mt.achter.b * MM, rgb(0.7, 0.72, 0.8));
  if (mt.rug.b >= 5) {
    const t = `${opts.titel} · ${opts.naam}`;
    const g = 9;
    page.drawText(t, { x: (mt.rug.x + mt.rug.b / 2) * MM - g * 0.32, y: H / 2 + vet.widthOfTextAtSize(t, g) / 2, size: g, font: vet, color: WIT, rotate: { type: 'degrees' as never, angle: -90 } });
  }
  return Buffer.from(await pdf.save());
}

// Eén bestand zoals sommige drukkers het willen: omslag, leeg schutblad, binnenwerk, leeg schutblad.
export async function voegSamen(omslag: Buffer, binnenwerk: Buffer) {
  const uit = await PDFDocument.create();
  const [o, b] = await Promise.all([PDFDocument.load(omslag), PDFDocument.load(binnenwerk)]);
  uit.addPage((await uit.copyPages(o, [0]))[0]);
  uit.addPage([KANT, KANT]);
  for (const p of await uit.copyPages(b, b.getPageIndices())) uit.addPage(p);
  uit.addPage([KANT, KANT]);
  return Buffer.from(await uit.save());
}
