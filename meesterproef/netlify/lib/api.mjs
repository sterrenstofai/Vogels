// De API van Meesterproef: router en alle logica.
// Wordt aangeroepen door netlify/functions/api.mjs, door scripts/dev.mjs en door de tests.

import { createHmac, randomUUID } from "node:crypto";
import selectie from "../../src/data/oplossingen.json" with { type: "json" };
import { lees, werkBij } from "./opslag.mjs";
import { Fout, HERKOMST_CIJFER, eisGeldig, leesOplossing, leesScores, leesVelden, schoon, slug, uniekId, vandaag } from "./invoer.mjs";
import { beheerCode, gelijk, gelijkeHash, hashCode, maakSessie, nieuweCode, ontleedSessie, sessieCookie, sessieGeheim, sessieKlopt } from "./sessie.mjs";

const MAX_BODY = 20_000; // 20 kB
const MINUUT = 60_000;
const LIMIET_LOGIN = { max: 10, venster: 15 * MINUUT };
const LIMIET_FORMULIER = { max: 5, venster: 60 * MINUUT };

const PUBLIEK_JURYLID = ["id", "naam", "functie", "organisatie", "over", "expertise", "profiel"];
const SELECTIE_IDS = new Set(selectie.map((o) => o.id));

// ---------- antwoorden ----------

function json(status, inhoud, koppen = {}) {
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  for (const [naam, waarde] of Object.entries(koppen)) headers.set(naam, waarde);
  return new Response(JSON.stringify(inhoud), { status, headers });
}

const publiekJurylid = (j) => Object.fromEntries(PUBLIEK_JURYLID.map((veld) => [veld, j[veld] ?? ""]));

// Voor de beheerder: alles behalve de hash van de code.
function beheerJurylid(j) {
  const { codeHash, ...rest } = j;
  return rest;
}

// ---------- snelheidslimiet ----------

function adresVan(req, context) {
  return context?.ip || req.headers.get("x-nf-client-connection-ip") || "onbekend";
}

// Het IP-adres zelf bewaren we niet: de sleutel is een HMAC ervan.
function limietSleutel(soort, ip) {
  const merk = createHmac("sha256", sessieGeheim()).update(`limiet|${ip}`).digest("hex").slice(0, 32);
  return `limiet-${soort}-${merk}`;
}

function teVaak(tijden, { venster }, nu) {
  const wachten = Math.max(1, Math.ceil((tijden[0] + venster - nu) / 1000));
  return new Fout(429, "Dat waren te veel pogingen achter elkaar. Probeer het later opnieuw.", {}, { "Retry-After": String(wachten) });
}

const recent = (tijden, { venster }, nu) => (Array.isArray(tijden) ? tijden : []).filter((t) => t > nu - venster);

// Alleen kijken, niet tellen.
async function eisOnderLimiet(soort, ip, limiet) {
  const nu = Date.now();
  const tijden = recent(await lees(limietSleutel(soort, ip), []), limiet, nu);
  if (tijden.length >= limiet.max) throw teVaak(tijden, limiet, nu);
}

// Telt één poging en weigert als de limiet al bereikt was.
async function telPoging(soort, ip, limiet) {
  const nu = Date.now();
  let geweigerd = null;
  await werkBij(limietSleutel(soort, ip), [], (ruw) => {
    const tijden = recent(ruw, limiet, nu);
    geweigerd = tijden.length >= limiet.max ? teVaak(tijden, limiet, nu) : null;
    if (geweigerd) return undefined;
    return [...tijden, nu];
  });
  if (geweigerd) throw geweigerd;
}

// ---------- gedeelde gegevens ----------

async function bekendeIds() {
  const gepubliceerd = await lees("gepubliceerd", []);
  return new Set([...SELECTIE_IDS, ...gepubliceerd.map((o) => o.id)]);
}

// ---------- publiek ----------

async function staat() {
  const [jury, beoordelingen, belangen, gepubliceerd, verborgen] = await Promise.all([
    lees("jury", []),
    lees("beoordelingen", []),
    lees("belangen", []),
    lees("gepubliceerd", []),
    lees("verborgen", []),
  ]);
  const actief = new Set(jury.filter((j) => j.actief).map((j) => j.id));
  const weg = new Set(verborgen);
  // Wat verborgen is gaat de deur niet uit: geen record en ook geen cijfers.
  const zichtbaar = (r) => actief.has(r.jurylid) && !weg.has(r.oplossing);
  return json(
    200,
    {
      jury: jury.filter((j) => j.actief).map(publiekJurylid),
      beoordelingen: beoordelingen.filter(zichtbaar).map(({ oplossing, jurylid, datum, scores, toelichting }) => ({ oplossing, jurylid, datum, scores, toelichting })),
      belangen: belangen.filter(zichtbaar).map(({ oplossing, jurylid }) => ({ oplossing, jurylid })),
      oplossingen: gepubliceerd.filter((o) => !weg.has(o.id)),
      verborgen,
    },
    { "Cache-Control": "public, max-age=30" },
  );
}

async function login({ body, url, ip }) {
  await telPoging("login", ip, LIMIET_LOGIN);
  const code = schoon(body.code);
  if (!code) throw new Fout(400, "Vul je code in.");
  const mis = new Fout(401, "Deze code klopt niet.");
  if (code.length > 200) throw mis;

  const beheer = beheerCode();
  if (beheer && gelijk(code, beheer)) {
    return json(200, { rol: "beheer" }, { "Set-Cookie": sessieCookie(url, maakSessie("beheer", "beheer", beheer)) });
  }

  const hash = hashCode(code);
  let gevonden = null;
  await werkBij("jury", [], (jury) => {
    gevonden = null;
    // Altijd de hele lijst langs, zodat de duur niets zegt over wie er overeenkwam.
    for (const lid of jury) if (gelijkeHash(lid.codeHash, hash) && lid.actief) gevonden = lid;
    if (!gevonden) return undefined;
    gevonden.laatsteLogin = new Date().toISOString();
    return jury;
  });
  if (!gevonden) throw mis;
  return json(200, { rol: "jury", jurylid: publiekJurylid(gevonden) }, { "Set-Cookie": sessieCookie(url, maakSessie("jury", gevonden.id, gevonden.codeHash)) });
}

function uitloggen({ url }) {
  return json(200, { ok: true }, { "Set-Cookie": sessieCookie(url, null) });
}

function ik({ sessie }) {
  return sessie.rol === "jury" ? { rol: "jury", jurylid: publiekJurylid(sessie.jurylid) } : { rol: "beheer" };
}

const INZENDER = {
  naam: { soort: "tekst", max: 100, verplicht: true, naam: "je naam" },
  email: { soort: "email", max: 254, verplicht: true, naam: "je e-mailadres" },
};

function inzendingSchema(soort) {
  const nieuw = soort === "inzending";
  return {
    oplossing: { soort: "tekst", max: 120, verplicht: true, naam: "de naam van de oplossing" },
    organisatie: { soort: "tekst", max: 120, verplicht: true, naam: "de organisatie" },
    gebouwdDoor: { soort: "tekst", max: 200, naam: "wie het bouwde" },
    sinds: { soort: "tekst", max: 20, verplicht: nieuw, naam: "sinds wanneer de oplossing in gebruik is" },
    sector: { soort: "tekst", max: 80, verplicht: nieuw, naam: "de sector" },
    type: { soort: "tekst", max: 80, verplicht: nieuw, naam: "het type oplossing" },
    status: { soort: "tekst", max: 80, naam: "de status" },
    beschrijving: { soort: "lang", max: 3000, verplicht: true, naam: "de beschrijving" },
    resultaat: { soort: "lang", max: 1000, verplicht: nieuw, naam: "het resultaat" },
    herkomstCijfer: { soort: "keuze", max: 20, uit: HERKOMST_CIJFER, naam: "de herkomst van het cijfer" },
    demo: { soort: "adres", max: 300, naam: "het adres van de demo" },
    bronnen: { soort: "adressen", max: 2000, naam: "de bronnen" },
    ...INZENDER,
    rol: { soort: "tekst", max: 100, verplicht: true, naam: "je rol bij de oplossing" },
    verwijzing: { soort: "tekst", max: 200, naam: "hoe je ons vond" },
    akkoord: { soort: "vinkje", verplicht: true, naam: "de voorwaarden" },
  };
}

const AANMELDING = {
  ...INZENDER,
  functie: { soort: "tekst", max: 120, verplicht: true, naam: "je functie" },
  organisatie: { soort: "tekst", max: 120, verplicht: true, naam: "je organisatie" },
  profiel: { soort: "adres", max: 300, naam: "het adres van je profiel" },
  expertise: { soort: "tekst", max: 300, naam: "je expertise" },
  ervaring: { soort: "lang", max: 2000, verplicht: true, naam: "je ervaring" },
  akkoord: { soort: "vinkje", verplicht: true, naam: "de voorwaarden" },
};

const CONTACT = {
  ...INZENDER,
  onderwerp: { soort: "tekst", max: 150, naam: "het onderwerp" },
  bericht: { soort: "lang", max: 4000, verplicht: true, naam: "je bericht" },
};

// De honingpot: een veld dat mensen niet zien. Wie het invult is een robot
// en krijgt een vriendelijk antwoord, maar er wordt niets bewaard.
const isRobot = (body) => schoon(body.website) !== "";

const kop = () => ({ id: randomUUID(), ontvangen: new Date().toISOString(), status: "nieuw" });

async function inzending({ body, ip }) {
  if (isRobot(body)) return { ok: true };
  await eisOnderLimiet("inzending", ip, LIMIET_FORMULIER);
  const soort = schoon(body.soort) || "inzending";
  if (soort !== "inzending" && soort !== "aanvulling") throw new Fout(400, "Kies of het om een inzending of een aanvulling gaat.");
  const { waarden, fouten } = leesVelden(body, inzendingSchema(soort));
  eisGeldig(fouten);

  let nummer;
  await werkBij("inzendingen", [], (lijst) => {
    // Het hoogste nummer plus één, binnen dezelfde stap als het wegschrijven: geen dubbele nummers.
    const hoogste = lijst.reduce((max, i) => Math.max(max, Number(String(i.nummer).slice(3)) || 0), 0);
    nummer = `MP-${String(hoogste + 1).padStart(4, "0")}`;
    // `status` is hier de voortgang van de inzending (nieuw, gepubliceerd, ...). De status
    // van de oplossing zelf, zoals de inzender die opgaf, staat daarom in `statusOplossing`.
    const { status: statusOplossing, ...rest } = waarden;
    const { id, ontvangen, status } = kop();
    return [...lijst, { id, nummer, ontvangen, status, soort, ...rest, statusOplossing }];
  });
  await telPoging("inzending", ip, LIMIET_FORMULIER).catch(() => {});
  return { ok: true, nummer };
}

function formulier(soort, sleutel, schema) {
  return async ({ body, ip }) => {
    if (isRobot(body)) return { ok: true };
    await eisOnderLimiet(soort, ip, LIMIET_FORMULIER);
    const { waarden, fouten } = leesVelden(body, schema);
    eisGeldig(fouten);
    await werkBij(sleutel, [], (lijst) => [...lijst, { ...kop(), ...waarden }]);
    await telPoging(soort, ip, LIMIET_FORMULIER).catch(() => {});
    return { ok: true };
  };
}

// ---------- jury ----------

async function juryWerk({ sessie }) {
  const [beoordelingen, belangen] = await Promise.all([lees("beoordelingen", []), lees("belangen", [])]);
  return {
    mijn: beoordelingen.filter((b) => b.jurylid === sessie.id),
    belangen: belangen.filter((b) => b.jurylid === sessie.id).map((b) => b.oplossing),
  };
}

async function juryBeoordeling({ body, sessie }) {
  const oplossing = schoon(body.oplossing);
  const [ids, verborgen] = await Promise.all([bekendeIds(), lees("verborgen", [])]);
  if (!oplossing || !ids.has(oplossing) || verborgen.includes(oplossing)) throw new Fout(404, "Deze oplossing bestaat niet.");

  const jurylid = sessie.id;
  const andere = (r) => !(r.oplossing === oplossing && r.jurylid === jurylid);
  const zonder = (lijst) => (lijst.some((r) => !andere(r)) ? lijst.filter(andere) : undefined);

  if (body.belang === true) {
    // Wie betrokken is bij een oplossing trekt zich terug; een eerder cijfer vervalt dan.
    await werkBij("belangen", [], (lijst) => [...lijst.filter(andere), { oplossing, jurylid, datum: vandaag() }]);
    await werkBij("beoordelingen", [], zonder);
    return { ok: true };
  }

  const scores = leesScores(body.scores);
  if (!scores) throw new Fout(400, "Geef voor elk van de vijf criteria een heel cijfer van 1 tot en met 10.");
  const toelichting = schoon(body.toelichting, true);
  if (toelichting.length < 20 || toelichting.length > 600) throw new Fout(400, "Schrijf een toelichting van 20 tot 600 tekens.");

  await werkBij("beoordelingen", [], (lijst) => [...lijst.filter(andere), { oplossing, jurylid, datum: vandaag(), scores, toelichting }]);
  await werkBij("belangen", [], zonder);
  return { ok: true };
}

// ---------- beheer ----------

async function beheerOverzicht() {
  const sleutels = ["jury", "inzendingen", "aanmeldingen", "berichten", "beoordelingen", "belangen", "gepubliceerd", "verborgen"];
  const lijsten = await Promise.all(sleutels.map((s) => lees(s, [])));
  const overzicht = Object.fromEntries(sleutels.map((s, i) => [s, lijsten[i]]));
  overzicht.jury = overzicht.jury.map(beheerJurylid);
  return overzicht;
}

const JURYLID = {
  naam: { soort: "tekst", max: 100, verplicht: true, naam: "de naam" },
  functie: { soort: "tekst", max: 120, naam: "de functie" },
  organisatie: { soort: "tekst", max: 120, naam: "de organisatie" },
  over: { soort: "lang", max: 600, naam: "de tekst over het jurylid" },
  expertise: { soort: "tekst", max: 300, naam: "de expertise" },
  profiel: { soort: "adres", max: 300, naam: "het adres van het profiel" },
};

function leesActief(body, standaard) {
  if (body.actief === undefined) return standaard;
  if (typeof body.actief !== "boolean") throw new Fout(400, "Actief moet waar of onwaar zijn.");
  return body.actief;
}

async function beheerJurylidOpslaan({ body }) {
  const id = schoon(body.id);

  if (!id) {
    const { waarden, fouten } = leesVelden(body, JURYLID);
    eisGeldig(fouten);
    const actief = leesActief(body, true);
    const code = nieuweCode();
    let lid;
    await werkBij("jury", [], (jury) => {
      lid = {
        id: uniekId(slug(waarden.naam, "jurylid"), new Set(jury.map((j) => j.id))),
        ...waarden,
        actief,
        aangemaakt: new Date().toISOString(),
        laatsteLogin: null,
        codeHash: hashCode(code),
      };
      return [...jury, lid];
    });
    // De code gaat hier één keer in klare tekst naar de beheerder; bewaard is alleen de hash.
    return { jurylid: beheerJurylid(lid), code };
  }

  // Bijwerken: alleen de velden die zijn meegestuurd veranderen.
  const schema = Object.fromEntries(Object.entries(JURYLID).filter(([veld]) => body[veld] !== undefined));
  const { waarden, fouten } = leesVelden(body, schema);
  eisGeldig(fouten);
  const actief = leesActief(body, undefined);
  let lid = null;
  await werkBij("jury", [], (jury) => {
    lid = jury.find((j) => j.id === id) ?? null;
    if (!lid) return undefined;
    Object.assign(lid, waarden);
    if (actief !== undefined) lid.actief = actief;
    return jury;
  });
  if (!lid) throw new Fout(404, "Dit jurylid bestaat niet.");
  return { jurylid: beheerJurylid(lid) };
}

async function beheerNieuweCode({ body }) {
  const id = schoon(body.id);
  const code = nieuweCode();
  let gevonden = false;
  await werkBij("jury", [], (jury) => {
    const lid = jury.find((j) => j.id === id);
    gevonden = Boolean(lid);
    if (!lid) return undefined;
    // De hash tekent mee in de sessie, dus wie nog met de oude code was ingelogd is dat nu niet meer.
    lid.codeHash = hashCode(code);
    return jury;
  });
  if (!gevonden) throw new Fout(404, "Dit jurylid bestaat niet.");
  return { code };
}

const NA_ACTIE = { publiceer: "gepubliceerd", wijsaf: "afgewezen", archiveer: "gearchiveerd" };

async function zetStatus(sleutel, id, status, extra = {}) {
  let gevonden = null;
  await werkBij(sleutel, [], (lijst) => {
    gevonden = lijst.find((r) => r.id === id) ?? null;
    if (!gevonden) return undefined;
    Object.assign(gevonden, { status, bijgewerkt: new Date().toISOString() }, extra);
    return lijst;
  });
  return gevonden;
}

async function beheerInzending({ body }) {
  const id = schoon(body.id);
  const actie = schoon(body.actie);
  if (!Object.hasOwn(NA_ACTIE, actie)) throw new Fout(400, "Kies een actie: publiceer, wijsaf of archiveer.");
  const bestaande = (await lees("inzendingen", [])).find((i) => i.id === id);
  if (!bestaande) throw new Fout(404, "Deze inzending bestaat niet.");

  if (actie !== "publiceer") {
    await zetStatus("inzendingen", id, NA_ACTIE[actie]);
    return { ok: true, status: NA_ACTIE[actie] };
  }

  // Twee keer publiceren zou dezelfde oplossing dubbel op de site zetten.
  if (bestaande.status === "gepubliceerd") throw new Fout(400, "Deze inzending is al gepubliceerd.");
  const { oplossing, fouten } = leesOplossing(body.oplossing);
  if (fouten.length > 0) throw new Fout(400, `De oplossing kan nog niet worden gepubliceerd: ${fouten.join("; ")}.`, { fouten });

  let record;
  await werkBij("gepubliceerd", [], (lijst) => {
    const bezet = new Set([...SELECTIE_IDS, ...lijst.map((o) => o.id)]);
    record = {
      ...oplossing,
      id: uniekId(oplossing.id || slug(`${oplossing.organisatie} ${oplossing.naam}`), bezet),
      gecontroleerd: oplossing.gecontroleerd ?? vandaag(),
      herkomst: "inzending",
      toegevoegd: vandaag(),
    };
    return [...lijst, record];
  });
  await zetStatus("inzendingen", id, "gepubliceerd", { gepubliceerdAls: record.id });
  return { ok: true, status: "gepubliceerd", oplossing: record };
}

async function beheerVerborgen({ body }) {
  const id = schoon(body.id);
  if (typeof body.verborgen !== "boolean") throw new Fout(400, "Geef aan of de oplossing verborgen moet zijn: waar of onwaar.");
  if (!(await bekendeIds()).has(id)) throw new Fout(404, "Deze oplossing bestaat niet.");
  const verborgen = await werkBij("verborgen", [], (lijst) => {
    const zonder = lijst.filter((v) => v !== id);
    return body.verborgen ? [...zonder, id] : zonder;
  });
  return { ok: true, verborgen };
}

const AFHANDELBAAR = { aanmelding: "aanmeldingen", bericht: "berichten", inzending: "inzendingen" };

async function beheerAfgehandeld({ body }) {
  const soort = schoon(body.soort);
  if (!Object.hasOwn(AFHANDELBAAR, soort)) throw new Fout(400, "Kies een soort: aanmelding, bericht of inzending.");
  const gevonden = await zetStatus(AFHANDELBAAR[soort], schoon(body.id), "afgehandeld");
  if (!gevonden) throw new Fout(404, "Dit is niet gevonden.");
  return { ok: true };
}

// ---------- router ----------

// pad → methode → { rol, doe }. Rol "iemand" betekent: ingelogd, in welke rol dan ook.
const ROUTES = {
  "/staat": { GET: { doe: staat } },
  "/login": { POST: { doe: login } },
  "/uitloggen": { POST: { doe: uitloggen } },
  "/ik": { GET: { rol: "iemand", doe: ik } },
  "/inzending": { POST: { doe: inzending } },
  "/aanmelding": { POST: { doe: formulier("aanmelding", "aanmeldingen", AANMELDING) } },
  "/contact": { POST: { doe: formulier("contact", "berichten", CONTACT) } },
  "/jury/werk": { GET: { rol: "jury", doe: juryWerk } },
  "/jury/beoordeling": { POST: { rol: "jury", doe: juryBeoordeling } },
  "/beheer/overzicht": { GET: { rol: "beheer", doe: beheerOverzicht } },
  "/beheer/jurylid": { POST: { rol: "beheer", doe: beheerJurylidOpslaan } },
  "/beheer/jurylid/code": { POST: { rol: "beheer", doe: beheerNieuweCode } },
  "/beheer/inzending": { POST: { rol: "beheer", doe: beheerInzending } },
  "/beheer/verborgen": { POST: { rol: "beheer", doe: beheerVerborgen } },
  "/beheer/afgehandeld": { POST: { rol: "beheer", doe: beheerAfgehandeld } },
};

async function leesBody(req, url) {
  const soort = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (soort !== "application/json") throw new Fout(400, "Stuur het verzoek als JSON (Content-Type: application/json).");

  // Een formulier op een andere site kan geen JSON sturen zonder Origin; komt er een
  // Origin mee, dan moet die van onszelf zijn.
  const origin = req.headers.get("origin");
  if (origin !== null) {
    let host = null;
    try {
      host = new URL(origin).host;
    } catch {}
    if (host !== url.host) throw new Fout(403, "Dit verzoek komt van een andere site en is geweigerd.");
  }

  const teGroot = new Fout(413, "Het verzoek is te groot. Kort de tekst in en probeer het opnieuw.");
  if (Number(req.headers.get("content-length")) > MAX_BODY) throw teGroot;
  const bytes = Buffer.from(await req.arrayBuffer());
  if (bytes.length > MAX_BODY) throw teGroot;
  if (bytes.length === 0) return {};
  let body;
  try {
    body = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Fout(400, "Het verzoek is geen geldige JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Fout(400, "Het verzoek moet een JSON-object zijn.");
  return body;
}

async function eisRol(req, rol) {
  const nietIngelogd = new Fout(401, "Je bent niet ingelogd.");
  const sessie = ontleedSessie(req);
  if (!sessie) throw nietIngelogd;
  let binding = beheerCode();
  if (sessie.rol === "jury") {
    // Een jurylid dat weg is of op inactief staat komt er niet meer in, ook niet met een geldige cookie.
    const lid = (await lees("jury", [])).find((j) => j.id === sessie.id);
    if (!lid || !lid.actief) throw nietIngelogd;
    sessie.jurylid = lid;
    binding = lid.codeHash;
  }
  if (!sessieKlopt(sessie, binding)) throw nietIngelogd;
  if (rol !== "iemand" && sessie.rol !== rol) throw new Fout(403, "Hier heb je geen toegang toe.");
  return sessie;
}

async function verwerk(req, context) {
  const url = new URL(req.url);
  const pad = url.pathname.replace(/^\/api(?=\/|$)/, "").replace(/\/+$/, "");
  const methodes = Object.hasOwn(ROUTES, pad) ? ROUTES[pad] : null;
  if (!methodes) throw new Fout(404, "Dit adres bestaat niet.");
  const route = Object.hasOwn(methodes, req.method) ? methodes[req.method] : null;
  if (!route) throw new Fout(405, "Deze methode is hier niet toegestaan.", {}, { Allow: Object.keys(methodes).join(", ") });

  if (!sessieGeheim()) {
    console.error("Meesterproef: de omgevingsvariabele SESSIE_GEHEIM ontbreekt.");
    throw new Fout(500, "De server is niet goed ingesteld: SESSIE_GEHEIM ontbreekt.");
  }

  const body = req.method === "POST" ? await leesBody(req, url) : null;
  const sessie = route.rol ? await eisRol(req, route.rol) : null;
  const uitkomst = await route.doe({ req, url, body, sessie, ip: adresVan(req, context) });
  return uitkomst instanceof Response ? uitkomst : json(200, uitkomst);
}

export async function behandel(req, context = {}) {
  try {
    return await verwerk(req, context);
  } catch (e) {
    if (e instanceof Fout) return json(e.status, { fout: e.message, ...e.extra }, e.koppen);
    // Alleen de foutmelding zelf, nooit de inhoud van het verzoek of de omgeving.
    console.error("Meesterproef: onverwachte fout:", e?.stack ?? e);
    return json(500, { fout: "Er ging iets mis aan onze kant. Probeer het later opnieuw." });
  }
}
