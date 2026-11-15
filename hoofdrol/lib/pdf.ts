// Bouwt het drukbestand: vierkante pagina's van 20 cm met 3 mm afloop rondom.
// De tekst zetten we zelf, in een vast lettertype; die laat je niet aan het beeldmodel over.
import { PDFDocument, rgb, type PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const MM = 72 / 25.4;
const AFLOOP = 3 * MM;
const KANT = 200 * MM + 2 * AFLOOP;
const INKT = rgb(0.07, 0.07, 0.12);
const PAPIER = rgb(1, 0.98, 0.93);

const font = (gewicht: number) =>
  fs.readFile(path.join(/*turbopackIgnore: true*/ process.cwd(), 'node_modules/@fontsource/baloo-2/files', `baloo-2-latin-${gewicht}-normal.woff`));

function regels(tekst: string, f: PDFFont, grootte: number, breedte: number) {
  const uit: string[] = [];
  let regel = '';
  for (const woord of tekst.split(/\s+/)) {
    const probeer = regel ? regel + ' ' + woord : woord;
    if (regel && f.widthOfTextAtSize(probeer, grootte) > breedte) { uit.push(regel); regel = woord; } else regel = probeer;
  }
  if (regel) uit.push(regel);
  return uit;
}

export async function bouwBoek(opts: { titel: string; naam: string; opdracht?: string; paginas: { tekst: string; jpg: Buffer }[] }) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const vet = await pdf.embedFont(await font(700), { subset: true });
  const normaal = await pdf.embedFont(await font(500), { subset: true });
  pdf.setTitle(`${opts.titel} — ${opts.naam}`);

  const midden = (page: ReturnType<typeof pdf.addPage>, tekst: string, f: PDFFont, grootte: number, y: number) =>
    page.drawText(tekst, { x: (KANT - f.widthOfTextAtSize(tekst, grootte)) / 2, y, size: grootte, font: f, color: INKT });

  const titel = pdf.addPage([KANT, KANT]);
  titel.drawRectangle({ x: 0, y: 0, width: KANT, height: KANT, color: PAPIER });
  midden(titel, opts.titel, vet, 44, KANT * 0.56);
  midden(titel, `met ${opts.naam} in de hoofdrol`, normaal, 22, KANT * 0.56 - 44);
  regels(opts.opdracht || '', normaal, 16, KANT * 0.6).slice(0, 4).forEach((r, i) => midden(titel, r, normaal, 16, KANT * 0.3 - i * 22));

  for (const p of opts.paginas) {
    const page = pdf.addPage([KANT, KANT]);
    const img = await pdf.embedJpg(p.jpg);
    page.drawImage(img, { x: 0, y: 0, width: KANT, height: KANT });
    const grootte = 24;
    const marge = AFLOOP + 14 * MM;
    const rr = regels(p.tekst, vet, grootte, KANT - 2 * marge - 16 * MM);
    const hoogte = rr.length * grootte * 1.25 + 12 * MM;
    page.drawRectangle({ x: marge, y: marge, width: KANT - 2 * marge, height: hoogte, color: PAPIER, opacity: 0.94 });
    rr.forEach((regel, i) => midden(page, regel, vet, grootte, marge + hoogte - 6 * MM - grootte * 0.85 - i * grootte * 1.25));
  }

  const slot = pdf.addPage([KANT, KANT]);
  slot.drawRectangle({ x: 0, y: 0, width: KANT, height: KANT, color: PAPIER });
  midden(slot, 'Einde', vet, 36, KANT * 0.54);
  midden(slot, `Dit boek is speciaal gemaakt voor ${opts.naam}.`, normaal, 16, KANT * 0.54 - 34);

  return Buffer.from(await pdf.save());
}
