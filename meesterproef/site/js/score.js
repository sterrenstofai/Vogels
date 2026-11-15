// Het beoordelingsmodel. Dit bestand is de enige plek waar criteria,
// gewichten en drempels staan; de pagina's lezen ze hier uit.

export const CRITERIA = [
  {
    id: "impact",
    naam: "Impact",
    gewicht: 30,
    vraag: "Levert het aantoonbaar iets op voor de mensen die ermee werken?",
    uitleg:
      "Gemeten resultaat telt zwaarder dan een verwachting. Een cijfer dat een onafhankelijke partij heeft vastgesteld telt zwaarder dan een cijfer van de leverancier.",
  },
  {
    id: "betrouwbaarheid",
    naam: "Betrouwbaarheid",
    gewicht: 25,
    vraag: "Doet het wat het belooft, ook bij lastige gevallen?",
    uitleg:
      "Hoe gaat de oplossing om met fouten, twijfel en vragen buiten haar terrein? Is er een mens die meekijkt waar dat nodig is?",
  },
  {
    id: "ervaring",
    naam: "Gebruikservaring",
    gewicht: 20,
    vraag: "Is het prettig en begrijpelijk in het gebruik?",
    uitleg:
      "Past de oplossing in het werk of het leven van de gebruiker, en is duidelijk wat ze wel en niet kan?",
  },
  {
    id: "verantwoord",
    naam: "Verantwoord gebruik",
    gewicht: 15,
    vraag: "Is zorgvuldig omgegaan met gegevens, uitleg en toezicht?",
    uitleg:
      "Weten gebruikers dat ze met AI te maken hebben? Is vastgelegd welke gegevens worden gebruikt en wie verantwoordelijk blijft?",
  },
  {
    id: "originaliteit",
    naam: "Originaliteit",
    gewicht: 10,
    vraag: "Lost het iets op een manier op die we nog niet kenden?",
    uitleg:
      "Een eigen idee of een slimme toepassing van bestaande techniek op een nieuw probleem.",
  },
];

export const MIN_JURYLEDEN = 3;

export const ONDERSCHEIDINGEN = [
  {
    id: "meesterproef",
    naam: "Meesterproef",
    vanaf: 8.0,
    uitleg: "Een gewogen eindcijfer van 8,0 of hoger.",
  },
  {
    id: "eervol",
    naam: "Eervolle vermelding",
    vanaf: 6.5,
    uitleg: "Een gewogen eindcijfer van 6,5 tot 8,0.",
  },
];

// Eén jurylid, één oplossing: het gewogen cijfer over de vijf criteria.
// Geeft null terug als een cijfer ontbreekt of buiten 1 tot 10 valt.
export function gewogenCijfer(scores) {
  let totaal = 0;
  for (const c of CRITERIA) {
    const s = scores?.[c.id];
    if (typeof s !== "number" || s < 1 || s > 10) return null;
    totaal += (s * c.gewicht) / 100;
  }
  return totaal;
}

// Alle beoordelingen van één oplossing samen. Telt per jurylid alleen de
// laatste geldige beoordeling. Pas vanaf MIN_JURYLEDEN is er een eindcijfer.
export function oordeel(beoordelingen) {
  const perJurylid = new Map();
  for (const b of beoordelingen ?? []) {
    const cijfer = gewogenCijfer(b.scores);
    if (cijfer === null || !b.jurylid) continue;
    const vorige = perJurylid.get(b.jurylid);
    if (!vorige || String(b.datum ?? "") >= String(vorige.datum ?? "")) {
      perJurylid.set(b.jurylid, { ...b, cijfer });
    }
  }
  const geldig = [...perJurylid.values()];
  const aantal = geldig.length;
  if (aantal < MIN_JURYLEDEN) {
    return { aantal, compleet: false, eindcijfer: null, perCriterium: null, onderscheiding: null, stemmen: geldig };
  }
  const gemiddelde = (waarden) => waarden.reduce((a, b) => a + b, 0) / waarden.length;
  const eindcijfer = gemiddelde(geldig.map((b) => b.cijfer));
  const perCriterium = {};
  for (const c of CRITERIA) perCriterium[c.id] = gemiddelde(geldig.map((b) => b.scores[c.id]));
  // Vergelijk op één decimaal, zoals het cijfer ook wordt getoond.
  const afgerond = Math.round(eindcijfer * 10) / 10;
  const onderscheiding = ONDERSCHEIDINGEN.find((o) => afgerond >= o.vanaf) ?? null;
  return { aantal, compleet: true, eindcijfer, perCriterium, onderscheiding, stemmen: geldig };
}

export function toonCijfer(getal) {
  return getal.toFixed(1).replace(".", ",");
}
