// Prijsmodel. Alle kosten zijn schattingen exclusief btw, in euro's.
// Pas de aannames aan zodra er echte offertes zijn en draai `npm run prijs`.

export type Format = 'hardcover' | 'softcover';

export const BTW = 0.09; // gedrukte boeken vallen in Nederland onder het lage tarief

export const AANNAMES = {
  paginas: 30,
  beelden: 12, // platen per boek; de omslag gebruikt de eerste plaat
  kostenPerBeeld: 0.12, // ruim geschat; hangt af van model en resolutie
  herkansingen: 1.4, // mislukte platen en de drie herkansingen van de klant
  druk: { hardcover: 13.5, softcover: 7.5 } as Record<Format, number>,
  verzendingNL: 4.5, // inkoop bij de drukker
  betaalkosten: 0.35, // iDEAL via Mollie, per transactie
  platform: 0.3, // hosting, opslag, e-mail per bestelling
  reserve: 0.05, // deel van de omzet voor herdrukken en klantenservice
};

// Verkoopprijzen inclusief btw, in centen.
export const PRIJZEN = {
  boek: { hardcover: 3995, softcover: 2995 } as Record<Format, number>,
  extraExemplaar: { hardcover: 2495, softcover: 1795 } as Record<Format, number>,
  verzending: 495,
  gratisVerzendingVanafBoeken: 2,
};

export function orderTotaal(format: Format, aantal: number) {
  const extra = Math.max(0, aantal - 1);
  const boeken = PRIJZEN.boek[format] + extra * PRIJZEN.extraExemplaar[format];
  const verzending = aantal >= PRIJZEN.gratisVerzendingVanafBoeken ? 0 : PRIJZEN.verzending;
  return { boeken, verzending, totaal: boeken + verzending };
}

export function euro(cents: number) {
  return '€ ' + (cents / 100).toFixed(2).replace('.', ',');
}

export function marge(format: Format, aantal = 1, a = AANNAMES) {
  const { totaal } = orderTotaal(format, aantal);
  const omzet = totaal / 100 / (1 + BTW);
  const ai = a.beelden * a.kostenPerBeeld * a.herkansingen;
  const druk = a.druk[format] * aantal;
  const kosten = {
    ai,
    druk,
    verzending: a.verzendingNL,
    betaalkosten: a.betaalkosten,
    platform: a.platform,
    reserve: omzet * a.reserve,
  };
  const totaalKosten = Object.values(kosten).reduce((s, v) => s + v, 0);
  return { prijsInclBtw: totaal / 100, omzet, kosten, totaalKosten, marge: omzet - totaalKosten, margePct: (omzet - totaalKosten) / omzet };
}
