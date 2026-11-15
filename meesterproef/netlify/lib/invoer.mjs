// Invoer opschonen en controleren. Alles wat van buiten komt gaat hier doorheen:
// alleen bekende velden, getrimd en begrensd. Tekst blijft tekst; HTML wordt nergens gelezen.

// Een fout die als antwoord naar de gebruiker gaat.
export class Fout extends Error {
  constructor(status, bericht, extra = {}, koppen = {}) {
    super(bericht);
    this.status = status;
    this.extra = extra;
    this.koppen = koppen;
  }
}

// Dezelfde lijsten als scripts/controleer_data.py.
export const SECTOREN = ["Retail", "Financiën", "Zorg", "Overheid", "Mobiliteit", "Media", "Zakelijke software", "Industrie", "Onderwijs", "Juridisch", "Logistiek", "Energie", "Agri en food", "Reizen"];
export const TYPES = ["Assistent voor klanten", "Assistent voor medewerkers", "Agent", "Voorspelmodel", "Beeldherkenning", "Spraak en verslaglegging", "Taalmodel"];
export const STATUSSEN = ["In productie", "Pilot", "In ontwikkeling"];
export const HERKOMST_CIJFER = ["onafhankelijk", "organisatie", "leverancier"];
export const CRITERIA = ["impact", "betrouwbaarheid", "ervaring", "verantwoord", "originaliteit"];

const DATUM = /^\d{4}(-\d{2}-\d{2})?$/;
const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;.]{2,}$/;

// Vandaag als JJJJ-MM-DD, in Nederlandse tijd: een beoordeling van 00.30 uur hoort bij die dag.
export function vandaag(nu = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam" }).format(nu);
}

// Maakt van een willekeurige waarde nette tekst. Eén regel, tenzij `regels` aan staat.
export function schoon(waarde, regels = false) {
  if (typeof waarde === "number" && Number.isFinite(waarde)) waarde = String(waarde);
  if (typeof waarde !== "string") return "";
  let t = waarde.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  t = regels ? t.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n") : t.replace(/\s+/g, " ");
  return t.trim();
}

export function isAdres(tekst) {
  return /^https?:\/\/\S+$/i.test(tekst) && URL.canParse(tekst);
}

// Lijkt deze regel op een webadres? Dan moet hij ook als adres kloppen.
function lijktOpAdres(regel) {
  if (/\s/.test(regel)) return false;
  return regel.includes("://") || /^www\./i.test(regel) || /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}([/?#:].*)?$/i.test(regel);
}

// Leest velden volgens een schema: { veld: { soort, max, verplicht, naam } }.
// Soorten: "tekst" (één regel), "lang" (meer regels), "email", "adres", "adressen"
// (regels waarvan elk adres met http(s):// begint), "keuze" (uit `uit`), "vinkje".
// Geeft { waarden, fouten } terug; onbekende velden in de invoer vallen weg.
export function leesVelden(invoer, schema) {
  const waarden = {};
  const fouten = {};
  for (const [veld, regel] of Object.entries(schema)) {
    const ruw = invoer?.[veld];
    if (regel.soort === "vinkje") {
      waarden[veld] = ruw === true;
      if (regel.verplicht && ruw !== true) fouten[veld] = `Geef akkoord op ${regel.naam}.`;
      continue;
    }
    const meerRegels = regel.soort === "lang" || regel.soort === "adressen";
    const t = schoon(Array.isArray(ruw) ? ruw.map((r) => schoon(r)).filter(Boolean).join(meerRegels ? "\n" : ", ") : ruw, meerRegels);
    waarden[veld] = t;
    if (!t) {
      if (regel.verplicht) fouten[veld] = `Vul ${regel.naam} in.`;
      continue;
    }
    if (t.length > regel.max) {
      fouten[veld] = `Maak ${regel.naam} korter: hooguit ${regel.max} tekens.`;
    } else if (regel.soort === "email" && !EMAIL.test(t)) {
      fouten[veld] = "Vul een geldig e-mailadres in.";
    } else if (regel.soort === "adres" && !isAdres(t)) {
      fouten[veld] = `Begin ${regel.naam} met https:// of http://.`;
    } else if (regel.soort === "adressen" && t.split("\n").some((r) => lijktOpAdres(r.trim()) && !isAdres(r.trim()))) {
      fouten[veld] = `Begin elk adres in ${regel.naam} met https:// of http://.`;
    } else if (regel.soort === "keuze" && !regel.uit.includes(t)) {
      fouten[veld] = `Kies bij ${regel.naam} een van: ${regel.uit.join(", ")}.`;
    }
  }
  return { waarden, fouten };
}

// Gooit een 400 als er fouten zijn. `velden` vertelt de voorkant bij welk veld wat hoort.
export function eisGeldig(fouten) {
  const meldingen = Object.values(fouten);
  if (meldingen.length === 0) return;
  const zin = meldingen.length === 1 ? meldingen[0] : `Er kloppen ${meldingen.length} velden nog niet. ${meldingen.join(" ")}`;
  throw new Fout(400, zin, { velden: fouten });
}

export function slug(tekst, reserve = "zonder-naam") {
  const s = String(tekst ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return s || reserve;
}

// Maakt een id uniek door er -2, -3, ... achter te zetten.
export function uniekId(basis, bezet) {
  if (!bezet.has(basis)) return basis;
  for (let n = 2; ; n++) if (!bezet.has(`${basis}-${n}`)) return `${basis}-${n}`;
}

// Controleert vijf cijfers: precies de vijf criteria, hele getallen van 1 tot en met 10.
export function leesScores(ruw) {
  if (!ruw || typeof ruw !== "object" || Array.isArray(ruw)) return null;
  const sleutels = Object.keys(ruw);
  if (sleutels.length !== CRITERIA.length || !CRITERIA.every((c) => sleutels.includes(c))) return null;
  const scores = {};
  for (const c of CRITERIA) {
    if (!Number.isInteger(ruw[c]) || ruw[c] < 1 || ruw[c] > 10) return null;
    scores[c] = ruw[c];
  }
  return scores;
}

// Een volledig oplossing-record, getoetst aan dezelfde regels als controleer_data.py.
// Geeft { oplossing, fouten } terug; het record bevat alleen de bekende velden.
// Id, herkomst en toegevoegd zet de aanroeper.
export function leesOplossing(ruw) {
  const fouten = [];
  if (!ruw || typeof ruw !== "object" || Array.isArray(ruw)) return { oplossing: null, fouten: ["oplossing ontbreekt"] };

  const o = {
    id: schoon(ruw.id),
    naam: schoon(ruw.naam),
    organisatie: schoon(ruw.organisatie),
    gebouwdMet: [],
    sector: schoon(ruw.sector),
    type: schoon(ruw.type),
    status: schoon(ruw.status),
    sinds: null,
    kort: schoon(ruw.kort),
    beschrijving: schoon(ruw.beschrijving, true),
    opvallend: schoon(ruw.opvallend, true),
    resultaat: null,
    bronnen: [],
    gecontroleerd: schoon(ruw.gecontroleerd) || null,
  };

  if (o.id && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(o.id)) fouten.push("id moet uit kleine letters, cijfers en streepjes bestaan");
  if (o.id.length > 80) fouten.push("id is te lang, hooguit 80 tekens");
  const grenzen = { naam: 120, organisatie: 120, kort: 140, beschrijving: 2000, opvallend: 1000 };
  for (const veld of ["naam", "organisatie", "kort", "beschrijving"]) if (!o[veld]) fouten.push(`${veld} ontbreekt`);
  for (const [veld, max] of Object.entries(grenzen)) {
    if (o[veld].length > max) fouten.push(`${veld} is ${o[veld].length} tekens, hooguit ${max}`);
  }
  if (!SECTOREN.includes(o.sector)) fouten.push(`onbekende sector "${o.sector}"`);
  if (!TYPES.includes(o.type)) fouten.push(`onbekend type "${o.type}"`);
  if (!STATUSSEN.includes(o.status)) fouten.push(`onbekende status "${o.status}"`);

  const sinds = schoon(ruw.sinds);
  if (sinds) {
    if (/^\d{4}$/.test(sinds)) o.sinds = sinds;
    else fouten.push("sinds moet een jaartal zijn of leeg");
  }

  if (ruw.gebouwdMet !== undefined && ruw.gebouwdMet !== null) {
    if (!Array.isArray(ruw.gebouwdMet)) fouten.push("gebouwdMet moet een lijst zijn");
    else o.gebouwdMet = ruw.gebouwdMet.map((g) => schoon(g).slice(0, 80)).filter(Boolean).slice(0, 10);
  }

  if (ruw.resultaat !== undefined && ruw.resultaat !== null) {
    const tekst = schoon(ruw.resultaat?.tekst, true);
    const herkomst = schoon(ruw.resultaat?.herkomst);
    if (!tekst || tekst.length > 600 || !HERKOMST_CIJFER.includes(herkomst)) {
      fouten.push("resultaat heeft een tekst (hooguit 600 tekens) en een geldige herkomst nodig");
    } else o.resultaat = { tekst, herkomst };
  }

  const bronnen = Array.isArray(ruw.bronnen) ? ruw.bronnen.slice(0, 20) : [];
  if (bronnen.length === 0) fouten.push("minstens één bron is verplicht");
  for (const b of bronnen) {
    const bron = { titel: schoon(b?.titel).slice(0, 300), uitgever: schoon(b?.uitgever).slice(0, 120), url: schoon(b?.url), datum: schoon(b?.datum) || null };
    if (!bron.titel || !bron.url.startsWith("https://") || !isAdres(bron.url) || bron.url.length > 500) {
      fouten.push(`bron zonder titel of zonder https-adres: "${bron.url.slice(0, 100)}"`);
    }
    if (bron.datum !== null && !DATUM.test(bron.datum)) fouten.push(`datum van bron is geen JJJJ of JJJJ-MM-DD: "${bron.datum.slice(0, 20)}"`);
    o.bronnen.push(bron);
  }

  if (o.gecontroleerd !== null && !DATUM.test(o.gecontroleerd)) fouten.push("gecontroleerd is geen datum");
  if (["kort", "beschrijving", "opvallend"].some((v) => o[v].includes("—"))) fouten.push("gedachtestreepje in de tekst");

  return { oplossing: o, fouten };
}
