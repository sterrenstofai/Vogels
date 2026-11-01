// De titel van de site staat hier, in index.html (<title>, .merk-naam) en in hoe-dit-werkt.html.
export const TITEL = "Voggels";
export const ONDERTITEL = "Welke vogels hoor je hier, en wanneer?";

export const SEIZOENEN = {
  jaar: { naam: "Heel jaar", maanden: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  lente: { naam: "Lente", maanden: [2, 3, 4] },
  zomer: { naam: "Zomer", maanden: [5, 6, 7] },
  herfst: { naam: "Herfst", maanden: [8, 9, 10] },
  winter: { naam: "Winter", maanden: [11, 0, 1] },
};

export const MAANDLETTERS = ["j", "f", "m", "a", "m", "j", "j", "a", "s", "o", "n", "d"];
export const MAANDNAMEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

export const PDOK = "https://api.pdok.nl/bzk/locatieserver/search/v3_1";
export const STRAAL_M = 500;
export const KERN_MIN = 50; // soorten met minder meldingen in Twente: geen kaart, alleen een regel

// Lidwoord bij een vogelnaam: verkleinwoorden (paapje, goudhaantje), namen op -hoen (waterhoen) en het smelleken zijn het-woorden.
export function lidwoord(naam, hoofdletter = false) {
  const n = naam.toLowerCase();
  const het = /je$/.test(n) || /hoen$/.test(n) || n === "smelleken";
  const lw = het ? "het" : "de";
  return hoofdletter ? lw.charAt(0).toUpperCase() + lw.slice(1) : lw;
}
