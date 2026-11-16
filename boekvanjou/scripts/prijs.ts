import { marge, AANNAMES, type Format } from '../lib/pricing.ts';

const f = (n: number) => n.toFixed(2).replace('.', ',').padStart(7);
const rij = (naam: string, format: Format, aantal: number, a = AANNAMES) => {
  const m = marge(format, aantal, a);
  console.log(`${naam.padEnd(34)} prijs ${f(m.prijsInclBtw)}  omzet ex btw ${f(m.omzet)}  kosten ${f(m.totaalKosten)}  marge ${f(m.marge)} (${Math.round(m.margePct * 100)}%)`);
  return m;
};

console.log('Basis');
const m = rij('Hardcover, 1 boek', 'hardcover', 1);
rij('Softcover, 1 boek', 'softcover', 1);
rij('Hardcover, 2 boeken (zelfde boek)', 'hardcover', 2);
rij('Hardcover, 3 boeken', 'hardcover', 3);
console.log('\nKosten per hardcover:', Object.entries(m.kosten).map(([k, v]) => `${k} ${f(v).trim()}`).join(' | '));

console.log('\nGevoeligheid (hardcover, 1 boek)');
rij('Druk valt duur uit (17,00)', 'hardcover', 1, { ...AANNAMES, druk: { ...AANNAMES.druk, hardcover: 17 } });
rij('Beelden 3x zo duur (0,36)', 'hardcover', 1, { ...AANNAMES, kostenPerBeeld: 0.36 });
rij('Beide tegelijk', 'hardcover', 1, { ...AANNAMES, kostenPerBeeld: 0.36, druk: { ...AANNAMES.druk, hardcover: 17 } });
