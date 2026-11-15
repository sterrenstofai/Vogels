// Toets van de API: node --test scripts/test_api.mjs
// Roept `behandel` direct aan met Request-objecten; de opslag is een tijdelijke map per test.

import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { behandel } from "../netlify/lib/api.mjs";
import selectie from "../src/data/oplossingen.json" with { type: "json" };

const BEHEER = "beheer-code-voor-de-test";
const BASIS = "https://meesterproef.test";
const [EERSTE, TWEEDE] = selectie.map((o) => o.id);

let map;
let ipTeller = 0;

beforeEach(async () => {
  map = await mkdtemp(path.join(os.tmpdir(), "meesterproef-test-"));
  process.env.MEESTERPROEF_OPSLAG_MAP = map;
  process.env.SESSIE_GEHEIM = "geheim-voor-de-test";
  process.env.BEHEER_CODE = BEHEER;
});

afterEach(async () => {
  await rm(map, { recursive: true, force: true });
});

// ---------- hulpjes ----------

// Elk verzoek krijgt standaard een eigen IP-adres, zodat de snelheidslimiet alleen meedoet waar we hem toetsen.
async function vraag(methode, pad, { body, cookie, ip, headers = {}, basis = BASIS, ruw } = {}) {
  const kop = new Headers(headers);
  if (cookie) kop.set("cookie", cookie);
  let inhoud;
  if (methode === "POST") {
    if (!kop.has("content-type")) kop.set("content-type", "application/json");
    inhoud = ruw ?? JSON.stringify(body ?? {});
  }
  const antwoord = await behandel(new Request(basis + pad, { method: methode, headers: kop, body: inhoud }), { ip: ip ?? `10.0.0.${++ipTeller}` });
  const tekst = await antwoord.text();
  return { status: antwoord.status, headers: antwoord.headers, json: tekst ? JSON.parse(tekst) : null };
}

const haal = (pad, opties) => vraag("GET", pad, opties);
const stuur = (pad, body, opties) => vraag("POST", pad, { body, ...opties });

// De cookie zoals een browser hem terugstuurt: alleen naam=waarde.
const cookieUit = (antwoord) => antwoord.headers.getSetCookie()[0]?.split(";")[0];

async function logIn(code) {
  const antwoord = await stuur("/api/login", { code });
  assert.equal(antwoord.status, 200, JSON.stringify(antwoord.json));
  return cookieUit(antwoord);
}

const alsBeheer = () => logIn(BEHEER);

async function maakJurylid(beheer, naam = "Sanne de Vries", extra = {}) {
  const antwoord = await stuur("/api/beheer/jurylid", { naam, functie: "Hoofd data", organisatie: "Voorbeeld bv", ...extra }, { cookie: beheer });
  assert.equal(antwoord.status, 200, JSON.stringify(antwoord.json));
  return antwoord.json;
}

// Een beheerder, een jurylid en de cookie van dat jurylid.
async function opzet(naam) {
  const beheer = await alsBeheer();
  const { jurylid, code } = await maakJurylid(beheer, naam);
  return { beheer, jurylid, code, jury: await logIn(code) };
}

const SCORES = { impact: 8, betrouwbaarheid: 7, ervaring: 8, verantwoord: 9, originaliteit: 6 };
const TOELICHTING = "Werkt aantoonbaar goed en is zorgvuldig ingevoerd bij de medewerkers.";
const beoordeling = (extra = {}) => ({ oplossing: EERSTE, scores: SCORES, toelichting: TOELICHTING, ...extra });

const inzending = (extra = {}) => ({
  soort: "inzending",
  oplossing: "Planhulp",
  organisatie: "Voorbeeld bv",
  gebouwdDoor: "Eigen team",
  sinds: "2025",
  sector: "Zorg",
  type: "Agent",
  status: "In productie",
  beschrijving: "Een agent die roosters voorstelt aan planners in de thuiszorg.",
  resultaat: "Planners zijn per week vier uur minder kwijt aan het rooster.",
  herkomstCijfer: "organisatie",
  demo: "https://voorbeeld.example/demo",
  bronnen: "https://voorbeeld.example/nieuws\nJaarverslag 2025, bladzijde 12",
  naam: "Noor Jansen",
  email: "noor@voorbeeld.example",
  rol: "Productmanager",
  verwijzing: "Via een collega",
  akkoord: true,
  website: "",
  ...extra,
});

const record = (extra = {}) => ({
  naam: "Planhulp",
  organisatie: "Voorbeeld bv",
  gebouwdMet: ["Eigen team"],
  sector: "Zorg",
  type: "Agent",
  status: "In productie",
  sinds: "2025",
  kort: "Een agent die roosters voorstelt aan planners in de thuiszorg.",
  beschrijving: "De agent leest de wensen van medewerkers en cliënten en stelt een rooster voor. De planner beslist.",
  opvallend: "Planners zien bij elk voorstel waarom het zo is gemaakt.",
  resultaat: { tekst: "Vier uur per week minder planwerk.", herkomst: "organisatie" },
  bronnen: [{ titel: "Planhulp in de praktijk", uitgever: "Voorbeeld bv", url: "https://voorbeeld.example/nieuws", datum: "2026-05-01" }],
  ...extra,
});

async function opgeslagen(sleutel) {
  try {
    return JSON.parse(await readFile(path.join(map, `${sleutel}.json`), "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
}

const VANDAAG = /^\d{4}-\d{2}-\d{2}$/;

// ---------- algemeen ----------

test("staat: leeg begin, juiste koppen", async () => {
  const a = await haal("/api/staat");
  assert.equal(a.status, 200);
  assert.equal(a.headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(a.headers.get("cache-control"), "public, max-age=30");
  assert.deepEqual(a.json, { jury: [], beoordelingen: [], belangen: [], oplossingen: [], verborgen: [] });
});

test("onbekend adres geeft 404, verkeerde methode 405", async () => {
  const weg = await haal("/api/bestaat-niet");
  assert.equal(weg.status, 404);
  assert.equal(typeof weg.json.fout, "string");
  assert.equal(weg.headers.get("content-type"), "application/json; charset=utf-8");

  const methode = await stuur("/api/staat", {});
  assert.equal(methode.status, 405);
  assert.equal(methode.headers.get("allow"), "GET");
  assert.equal((await haal("/api/login")).status, 405);
  assert.equal((await vraag("DELETE", "/api/ik")).status, 405);
  // Namen uit Object.prototype zijn geen routes of methodes.
  assert.equal((await haal("/api/constructor")).status, 404);
});

test("POST eist JSON als Content-Type", async () => {
  const a = await stuur("/api/contact", {}, { headers: { "content-type": "text/plain" } });
  assert.equal(a.status, 400);
  const formulier = await vraag("POST", "/api/login", { ruw: "code=x", headers: { "content-type": "application/x-www-form-urlencoded" } });
  assert.equal(formulier.status, 400);
  const metTekenset = await stuur("/api/login", { code: BEHEER }, { headers: { "content-type": "application/json; charset=utf-8" } });
  assert.equal(metTekenset.status, 200);
});

test("POST met een Origin van een andere site wordt geweigerd", async () => {
  const vreemd = await stuur("/api/login", { code: BEHEER }, { headers: { origin: "https://kwaadaardig.example" } });
  assert.equal(vreemd.status, 403);
  assert.equal(vreemd.headers.getSetCookie().length, 0);
  assert.equal((await stuur("/api/login", { code: BEHEER }, { headers: { origin: "null" } })).status, 403);
  assert.equal((await stuur("/api/login", { code: BEHEER }, { headers: { origin: BASIS } })).status, 200);
});

test("POST: te grote of kapotte body", async () => {
  const groot = await stuur("/api/contact", { naam: "A", email: "a@b.nl", bericht: "x".repeat(21_000) });
  assert.equal(groot.status, 413);
  assert.equal((await vraag("POST", "/api/contact", { ruw: "{geen json" })).status, 400);
  assert.equal((await vraag("POST", "/api/contact", { ruw: "[1,2]" })).status, 400);
  assert.deepEqual(await opgeslagen("berichten"), []);
});

test("zonder SESSIE_GEHEIM buiten de bestandsmodus: 500 met duidelijke melding", async (t) => {
  delete process.env.MEESTERPROEF_OPSLAG_MAP;
  delete process.env.SESSIE_GEHEIM;
  const gelogd = [];
  t.mock.method(console, "error", (...delen) => gelogd.push(delen.join(" ")));
  const a = await haal("/api/staat");
  assert.equal(a.status, 500);
  assert.match(a.json.fout, /SESSIE_GEHEIM/);
  assert.ok(!gelogd.join(" ").includes(BEHEER));
});

test("in de bestandsmodus werkt het ook zonder SESSIE_GEHEIM", async () => {
  delete process.env.SESSIE_GEHEIM;
  assert.equal((await haal("/api/staat")).status, 200);
  assert.equal((await haal("/api/ik", { cookie: await alsBeheer() })).status, 200);
});

// ---------- inloggen en sessie ----------

test("login als beheerder: cookie met de juiste eigenschappen", async () => {
  const a = await stuur("/api/login", { code: BEHEER });
  assert.equal(a.status, 200);
  assert.deepEqual(a.json, { rol: "beheer" });
  assert.equal(a.headers.get("cache-control"), "no-store");
  const cookie = a.headers.getSetCookie()[0];
  assert.match(cookie, /^mp_sessie=[\w-]+\.[\w-]+; /);
  for (const deel of ["HttpOnly", "SameSite=Lax", "Path=/", "Max-Age=2592000", "Secure"]) assert.ok(cookie.split("; ").includes(deel), deel);

  const inhoud = JSON.parse(Buffer.from(cookie.slice("mp_sessie=".length).split(".")[0], "base64url").toString());
  assert.deepEqual(Object.keys(inhoud).sort(), ["id", "rol", "tot"]);
  assert.equal(inhoud.rol, "beheer");
  assert.ok(Math.abs(inhoud.tot - (Date.now() + 2592000 * 1000)) < 5000);

  assert.deepEqual((await haal("/api/ik", { cookie: cookieUit(a) })).json, { rol: "beheer" });
});

test("Secure ontbreekt alleen over http op localhost", async () => {
  for (const basis of ["http://localhost:8811", "http://127.0.0.1:8811"]) {
    const a = await stuur("/api/login", { code: BEHEER }, { basis });
    assert.ok(!a.headers.getSetCookie()[0].includes("Secure"), basis);
  }
  for (const basis of ["https://localhost:8811", "http://meesterproef.test"]) {
    const a = await stuur("/api/login", { code: BEHEER }, { basis });
    assert.ok(a.headers.getSetCookie()[0].includes("Secure"), basis);
  }
});

test("login: verkeerde, lege en ontbrekende code", async () => {
  const mis = await stuur("/api/login", { code: "helemaal-fout" });
  assert.equal(mis.status, 401);
  assert.deepEqual(mis.json, { fout: "Deze code klopt niet." });
  assert.equal(mis.headers.getSetCookie().length, 0);
  assert.equal((await stuur("/api/login", { code: "" })).status, 400);
  assert.equal((await stuur("/api/login", {})).status, 400);
  assert.equal((await stuur("/api/login", { code: "x".repeat(500) })).status, 401);
});

test("zonder BEHEER_CODE kan niemand als beheerder inloggen", async () => {
  const cookie = await alsBeheer();
  delete process.env.BEHEER_CODE;
  assert.equal((await stuur("/api/login", { code: BEHEER })).status, 401);
  assert.equal((await stuur("/api/login", { code: "undefined" })).status, 401);
  // Ook een eerder uitgegeven beheercookie werkt dan niet meer.
  assert.equal((await haal("/api/beheer/overzicht", { cookie })).status, 401);
});

test("een andere BEHEER_CODE maakt oude beheersessies ongeldig", async () => {
  const cookie = await alsBeheer();
  process.env.BEHEER_CODE = "een-nieuwe-code";
  assert.equal((await haal("/api/ik", { cookie })).status, 401);
});

test("ik: zonder, met vervalste en met verlopen cookie", async () => {
  assert.equal((await haal("/api/ik")).status, 401);
  assert.equal((await haal("/api/ik", { cookie: "mp_sessie=onzin" })).status, 401);
  assert.equal((await haal("/api/ik", { cookie: "mp_sessie=a.b" })).status, 401);

  const echt = await alsBeheer();
  const [deel, handtekening] = echt.slice("mp_sessie=".length).split(".");

  // Zelfde handtekening, andere inhoud.
  const inhoud = JSON.parse(Buffer.from(deel, "base64url").toString());
  const langer = Buffer.from(JSON.stringify({ ...inhoud, tot: inhoud.tot + 1000 })).toString("base64url");
  assert.equal((await haal("/api/ik", { cookie: `mp_sessie=${langer}.${handtekening}` })).status, 401);
  assert.equal((await haal("/api/ik", { cookie: `mp_sessie=${deel}.${handtekening.slice(0, -2)}xx` })).status, 401);
  assert.equal((await haal("/api/ik", { cookie: `mp_sessie=${deel}.` })).status, 401);

  // Een ander geheim: de handtekening klopt niet meer.
  process.env.SESSIE_GEHEIM = "een-ander-geheim";
  assert.equal((await haal("/api/ik", { cookie: echt })).status, 401);
});

test("een verlopen sessie wordt geweigerd", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.now() });
  const cookie = await alsBeheer();
  t.mock.timers.tick(2592000 * 1000 - 1000);
  assert.equal((await haal("/api/ik", { cookie })).status, 200);
  t.mock.timers.tick(2000);
  assert.equal((await haal("/api/ik", { cookie })).status, 401);
});

test("uitloggen wist de cookie", async () => {
  const a = await stuur("/api/uitloggen", {}, { cookie: await alsBeheer() });
  assert.equal(a.status, 200);
  assert.deepEqual(a.json, { ok: true });
  const cookie = a.headers.getSetCookie()[0];
  assert.match(cookie, /^mp_sessie=; /);
  assert.ok(cookie.includes("Max-Age=0"));
  assert.ok(cookie.includes("HttpOnly"));
  // Ook zonder body en zonder sessie.
  assert.equal((await vraag("POST", "/api/uitloggen", { ruw: "" })).status, 200);
});

test("login: na tien pogingen in een kwartier volgt 429", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.now() });
  const ip = "203.0.113.7";
  for (let i = 0; i < 10; i++) assert.equal((await stuur("/api/login", { code: "fout" }, { ip })).status, 401);
  const geblokt = await stuur("/api/login", { code: BEHEER }, { ip });
  assert.equal(geblokt.status, 429);
  assert.equal(typeof geblokt.json.fout, "string");
  assert.ok(Number(geblokt.headers.get("retry-after")) > 0);
  // Een ander adres heeft er geen last van.
  assert.equal((await stuur("/api/login", { code: BEHEER }, { ip: "203.0.113.8" })).status, 200);
  // Het IP-adres zelf staat nergens in de opslag.
  for (const naam of await readdir(map)) {
    assert.ok(!naam.includes("203.0.113"));
    assert.ok(!(await readFile(path.join(map, naam), "utf8")).includes("203.0.113"));
  }
  t.mock.timers.tick(15 * 60 * 1000 + 1000);
  assert.equal((await stuur("/api/login", { code: BEHEER }, { ip })).status, 200);
});

test("het IP-adres komt uit context.ip, anders uit de kop, anders 'onbekend'", async () => {
  const viaKop = (kop) => behandel(new Request(`${BASIS}/api/login`, { method: "POST", headers: { "content-type": "application/json", ...kop }, body: '{"code":"fout"}' }), {});
  for (let i = 0; i < 10; i++) assert.equal((await viaKop({ "x-nf-client-connection-ip": "198.51.100.1" })).status, 401);
  assert.equal((await viaKop({ "x-nf-client-connection-ip": "198.51.100.1" })).status, 429);
  assert.equal((await viaKop({ "x-nf-client-connection-ip": "198.51.100.2" })).status, 401);
  for (let i = 0; i < 10; i++) assert.equal((await viaKop({})).status, 401);
  assert.equal((await viaKop({})).status, 429);
  // context.ip gaat voor de kop.
  assert.equal((await stuur("/api/login", { code: "fout" }, { ip: "198.51.100.9", headers: { "x-nf-client-connection-ip": "198.51.100.1" } })).status, 401);
});

// ---------- beheer: juryleden ----------

test("beheer-eindpunten: 401 zonder sessie, 403 voor een jurylid", async () => {
  const { jury } = await opzet();
  const paden = [
    ["GET", "/api/beheer/overzicht"],
    ["POST", "/api/beheer/jurylid"],
    ["POST", "/api/beheer/jurylid/code"],
    ["POST", "/api/beheer/inzending"],
    ["POST", "/api/beheer/verborgen"],
    ["POST", "/api/beheer/afgehandeld"],
  ];
  for (const [methode, pad] of paden) {
    assert.equal((await vraag(methode, pad)).status, 401, pad);
    assert.equal((await vraag(methode, pad, { cookie: jury })).status, 403, pad);
  }
});

test("jury-eindpunten: 401 zonder sessie, 403 voor de beheerder", async () => {
  const beheer = await alsBeheer();
  for (const [methode, pad] of [["GET", "/api/jury/werk"], ["POST", "/api/jury/beoordeling"]]) {
    assert.equal((await vraag(methode, pad)).status, 401, pad);
    assert.equal((await vraag(methode, pad, { cookie: beheer })).status, 403, pad);
  }
});

test("nieuw jurylid: code één keer in klare tekst, alleen de hash bewaard", async () => {
  const beheer = await alsBeheer();
  const { jurylid, code } = await maakJurylid(beheer, "  Sanne   de Vries ", {
    over: "Werkt al tien jaar\r\nmet taalmodellen.",
    expertise: "Taalmodellen, zorg",
    profiel: "https://www.linkedin.com/in/voorbeeld",
    stiekem: "<script>",
    codeHash: "zelfgekozen",
  });
  assert.match(code, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{20}$/);
  assert.equal(jurylid.id, "sanne-de-vries");
  assert.equal(jurylid.naam, "Sanne de Vries");
  assert.equal(jurylid.over, "Werkt al tien jaar\nmet taalmodellen.");
  assert.equal(jurylid.actief, true);
  assert.equal(jurylid.laatsteLogin, null);
  assert.match(jurylid.aangemaakt, /^\d{4}-\d{2}-\d{2}T/);
  assert.ok(!("codeHash" in jurylid) && !("stiekem" in jurylid));

  const ruw = await readFile(path.join(map, "jury.json"), "utf8");
  assert.ok(!ruw.includes(code), "de code staat niet in de opslag");
  assert.match(JSON.parse(ruw)[0].codeHash, /^[0-9a-f]{64}$/);

  const overzicht = (await haal("/api/beheer/overzicht", { cookie: beheer })).json;
  assert.equal(overzicht.jury.length, 1);
  assert.ok(!JSON.stringify(overzicht).includes("codeHash"));
  assert.ok(!JSON.stringify(overzicht).includes(code));

  // Dezelfde naam nog eens: het id wordt uniek gemaakt.
  assert.equal((await maakJurylid(beheer, "Sanne de Vries")).jurylid.id, "sanne-de-vries-2");
  assert.equal((await maakJurylid(beheer, "Sanne de Vries")).jurylid.id, "sanne-de-vries-3");
  assert.equal((await maakJurylid(beheer, "Zoë Çelik-Ünal")).jurylid.id, "zoe-celik-unal");
});

test("jurylid: foutpaden bij aanmaken en bijwerken", async () => {
  const beheer = await alsBeheer();
  const zonderNaam = await stuur("/api/beheer/jurylid", { functie: "Iets" }, { cookie: beheer });
  assert.equal(zonderNaam.status, 400);
  assert.ok(zonderNaam.json.velden.naam);
  assert.equal((await stuur("/api/beheer/jurylid", { naam: "A", profiel: "javascript:alert(1)" }, { cookie: beheer })).status, 400);
  assert.equal((await stuur("/api/beheer/jurylid", { naam: "A", over: "x".repeat(601) }, { cookie: beheer })).status, 400);
  assert.equal((await stuur("/api/beheer/jurylid", { naam: "A", actief: "ja" }, { cookie: beheer })).status, 400);
  assert.equal((await stuur("/api/beheer/jurylid", { id: "bestaat-niet", naam: "A" }, { cookie: beheer })).status, 404);
  assert.equal((await stuur("/api/beheer/jurylid/code", { id: "bestaat-niet" }, { cookie: beheer })).status, 404);
  assert.deepEqual(await opgeslagen("jury"), []);
});

test("jurylid bijwerken verandert alleen de meegestuurde velden", async () => {
  const beheer = await alsBeheer();
  const { jurylid } = await maakJurylid(beheer, "Sanne de Vries", { over: "Oud" });
  const a = await stuur("/api/beheer/jurylid", { id: jurylid.id, functie: "Directeur", over: "Nieuw" }, { cookie: beheer });
  assert.equal(a.status, 200);
  assert.ok(!("code" in a.json));
  assert.equal(a.json.jurylid.functie, "Directeur");
  assert.equal(a.json.jurylid.over, "Nieuw");
  assert.equal(a.json.jurylid.naam, "Sanne de Vries");
  assert.equal(a.json.jurylid.id, jurylid.id);
  assert.equal(a.json.jurylid.aangemaakt, jurylid.aangemaakt);
  // Een naam leegmaken mag niet.
  assert.equal((await stuur("/api/beheer/jurylid", { id: jurylid.id, naam: " " }, { cookie: beheer })).status, 400);
});

test("jurylid logt in: publieke velden, laatsteLogin vastgelegd", async () => {
  const beheer = await alsBeheer();
  const { jurylid, code } = await maakJurylid(beheer);
  const a = await stuur("/api/login", { code });
  assert.equal(a.status, 200);
  assert.equal(a.json.rol, "jury");
  assert.deepEqual(Object.keys(a.json.jurylid), ["id", "naam", "functie", "organisatie", "over", "expertise", "profiel"]);
  assert.equal(a.json.jurylid.id, jurylid.id);

  const ik = await haal("/api/ik", { cookie: cookieUit(a) });
  assert.deepEqual(ik.json, a.json);

  const lid = (await haal("/api/beheer/overzicht", { cookie: beheer })).json.jury[0];
  assert.match(lid.laatsteLogin, /^\d{4}-\d{2}-\d{2}T/);

  // Overtypen met kleine letters, spaties en streepjes werkt ook.
  const getikt = code.toLowerCase().replace(/(.{5})/g, "$1-").replace(/-$/, "");
  assert.equal((await stuur("/api/login", { code: ` ${getikt} ` })).status, 200);
  // Eén teken anders niet.
  const anders = (code[0] === "A" ? "B" : "A") + code.slice(1);
  assert.equal((await stuur("/api/login", { code: anders })).status, 401);
});

test("een inactief jurylid verliest toegang, ook met een geldige cookie", async () => {
  const { beheer, jurylid, code, jury } = await opzet();
  assert.equal((await stuur("/api/jury/beoordeling", beoordeling(), { cookie: jury })).status, 200);
  assert.equal((await haal("/api/staat")).json.beoordelingen.length, 1);

  assert.equal((await stuur("/api/beheer/jurylid", { id: jurylid.id, actief: false }, { cookie: beheer })).status, 200);
  assert.equal((await haal("/api/ik", { cookie: jury })).status, 401);
  assert.equal((await haal("/api/jury/werk", { cookie: jury })).status, 401);
  assert.equal((await stuur("/api/jury/beoordeling", beoordeling(), { cookie: jury })).status, 401);
  assert.equal((await stuur("/api/login", { code })).status, 401);

  // Publiek verdwijnen het lid en zijn cijfers; de beheerder ziet ze nog.
  const staat = (await haal("/api/staat")).json;
  assert.deepEqual(staat.jury, []);
  assert.deepEqual(staat.beoordelingen, []);
  const overzicht = (await haal("/api/beheer/overzicht", { cookie: beheer })).json;
  assert.equal(overzicht.jury[0].actief, false);
  assert.equal(overzicht.beoordelingen.length, 1);

  // Weer actief: dezelfde cookie werkt weer.
  await stuur("/api/beheer/jurylid", { id: jurylid.id, actief: true }, { cookie: beheer });
  assert.equal((await haal("/api/ik", { cookie: jury })).status, 200);
  assert.equal((await haal("/api/staat")).json.beoordelingen.length, 1);
});

test("nieuwe code: de oude werkt niet meer en oude sessies vervallen", async () => {
  const { beheer, jurylid, code, jury } = await opzet();
  const a = await stuur("/api/beheer/jurylid/code", { id: jurylid.id }, { cookie: beheer });
  assert.equal(a.status, 200);
  assert.match(a.json.code, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{20}$/);
  assert.notEqual(a.json.code, code);
  assert.equal((await stuur("/api/login", { code })).status, 401);
  assert.equal((await haal("/api/ik", { cookie: jury })).status, 401);
  const nieuw = await logIn(a.json.code);
  assert.equal((await haal("/api/ik", { cookie: nieuw })).json.jurylid.id, jurylid.id);
  assert.ok(!(await readFile(path.join(map, "jury.json"), "utf8")).includes(a.json.code));
});

test("een cookie van een jurylid geeft geen beheerrechten, ook niet met aangepaste rol", async () => {
  const { jury } = await opzet();
  const [deel, handtekening] = jury.slice("mp_sessie=".length).split(".");
  const inhoud = JSON.parse(Buffer.from(deel, "base64url").toString());
  const vals = Buffer.from(JSON.stringify({ ...inhoud, rol: "beheer" })).toString("base64url");
  assert.equal((await haal("/api/beheer/overzicht", { cookie: `mp_sessie=${vals}.${handtekening}` })).status, 401);
});

// ---------- jury: beoordelen ----------

test("beoordeling: opslaan, publiek zichtbaar, overschrijven", async () => {
  const { jurylid, jury } = await opzet();
  const a = await stuur("/api/jury/beoordeling", beoordeling({ stiekem: 1 }), { cookie: jury });
  assert.equal(a.status, 200);
  assert.deepEqual(a.json, { ok: true });

  const werk = (await haal("/api/jury/werk", { cookie: jury })).json;
  assert.deepEqual(werk.belangen, []);
  assert.equal(werk.mijn.length, 1);
  assert.deepEqual(Object.keys(werk.mijn[0]).sort(), ["datum", "jurylid", "oplossing", "scores", "toelichting"]);
  assert.match(werk.mijn[0].datum, VANDAAG);
  assert.deepEqual(werk.mijn[0].scores, SCORES);

  const staat = (await haal("/api/staat")).json;
  assert.deepEqual(staat.beoordelingen, [{ oplossing: EERSTE, jurylid: jurylid.id, datum: werk.mijn[0].datum, scores: SCORES, toelichting: TOELICHTING }]);
  assert.deepEqual(staat.jury.map((j) => j.id), [jurylid.id]);
  assert.deepEqual(Object.keys(staat.jury[0]), ["id", "naam", "functie", "organisatie", "over", "expertise", "profiel"]);

  // Nog een keer: de vorige wordt vervangen, er komt er geen bij.
  const beter = { ...SCORES, impact: 10 };
  assert.equal((await stuur("/api/jury/beoordeling", beoordeling({ scores: beter }), { cookie: jury })).status, 200);
  assert.equal((await stuur("/api/jury/beoordeling", beoordeling({ oplossing: TWEEDE }), { cookie: jury })).status, 200);
  const na = (await haal("/api/jury/werk", { cookie: jury })).json.mijn;
  assert.equal(na.length, 2);
  assert.equal(na.find((b) => b.oplossing === EERSTE).scores.impact, 10);
});

test("beoordeling: de datum is vandaag in Nederlandse tijd", async (t) => {
  // 30 juni 22.30 uur UTC is in Nederland al 1 juli.
  t.mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 5, 30, 22, 30) });
  const { jury } = await opzet();
  await stuur("/api/jury/beoordeling", beoordeling(), { cookie: jury });
  assert.equal((await haal("/api/jury/werk", { cookie: jury })).json.mijn[0].datum, "2026-07-01");
});

test("beoordeling: elk jurylid ziet alleen het eigen werk", async () => {
  const een = await opzet("Sanne de Vries");
  const { code } = await maakJurylid(een.beheer, "Tom Bakker");
  const twee = await logIn(code);
  await stuur("/api/jury/beoordeling", beoordeling(), { cookie: een.jury });
  await stuur("/api/jury/beoordeling", beoordeling({ oplossing: TWEEDE, belang: true }), { cookie: twee });
  assert.equal((await haal("/api/jury/werk", { cookie: een.jury })).json.mijn.length, 1);
  assert.deepEqual((await haal("/api/jury/werk", { cookie: twee })).json, { mijn: [], belangen: [TWEEDE] });
  assert.equal((await haal("/api/staat")).json.beoordelingen.length, 1);
});

test("beoordeling: ongeldige cijfers en toelichting geven 400", async () => {
  const { jury } = await opzet();
  const fout = [
    { scores: { ...SCORES, impact: 0 } },
    { scores: { ...SCORES, impact: 11 } },
    { scores: { ...SCORES, impact: 7.5 } },
    { scores: { ...SCORES, impact: "8" } },
    { scores: { ...SCORES, extra: 5 } },
    { scores: { impact: 8, betrouwbaarheid: 7, ervaring: 8, verantwoord: 9 } },
    { scores: [8, 7, 8, 9, 6] },
    { scores: null },
    { scores: undefined },
    { toelichting: "Te kort." },
    { toelichting: "x".repeat(601) },
    { toelichting: " ".repeat(50) },
    { toelichting: undefined },
    { belang: "ja", scores: undefined },
  ];
  for (const extra of fout) {
    const a = await stuur("/api/jury/beoordeling", beoordeling(extra), { cookie: jury });
    assert.equal(a.status, 400, JSON.stringify(extra));
    assert.equal(typeof a.json.fout, "string");
  }
  assert.equal((await stuur("/api/jury/beoordeling", beoordeling({ toelichting: "x".repeat(20) }), { cookie: jury })).status, 200);
  assert.equal((await stuur("/api/jury/beoordeling", beoordeling({ toelichting: "x".repeat(600) }), { cookie: jury })).status, 200);
  assert.equal((await opgeslagen("beoordelingen")).length, 1);
});

test("beoordeling: onbekende of verborgen oplossing geeft 404", async () => {
  const { beheer, jury } = await opzet();
  assert.equal((await stuur("/api/jury/beoordeling", beoordeling({ oplossing: "bestaat-niet" }), { cookie: jury })).status, 404);
  assert.equal((await stuur("/api/jury/beoordeling", beoordeling({ oplossing: undefined }), { cookie: jury })).status, 404);
  assert.equal((await stuur("/api/jury/beoordeling", { oplossing: "bestaat-niet", belang: true }, { cookie: jury })).status, 404);
  await stuur("/api/beheer/verborgen", { id: EERSTE, verborgen: true }, { cookie: beheer });
  assert.equal((await stuur("/api/jury/beoordeling", beoordeling(), { cookie: jury })).status, 404);
  assert.deepEqual(await opgeslagen("beoordelingen"), []);
});

test("belang: terugtrekken verwijdert de beoordeling en andersom", async () => {
  const { jurylid, jury } = await opzet();
  await stuur("/api/jury/beoordeling", beoordeling(), { cookie: jury });

  const terug = await stuur("/api/jury/beoordeling", { oplossing: EERSTE, belang: true }, { cookie: jury });
  assert.deepEqual(terug.json, { ok: true });
  assert.deepEqual((await haal("/api/jury/werk", { cookie: jury })).json, { mijn: [], belangen: [EERSTE] });
  let staat = (await haal("/api/staat")).json;
  assert.deepEqual(staat.beoordelingen, []);
  assert.deepEqual(staat.belangen, [{ oplossing: EERSTE, jurylid: jurylid.id }]);

  // Twee keer terugtrekken geeft geen dubbel record.
  await stuur("/api/jury/beoordeling", { oplossing: EERSTE, belang: true }, { cookie: jury });
  assert.equal((await opgeslagen("belangen")).length, 1);

  // Toch beoordelen: het belang vervalt.
  await stuur("/api/jury/beoordeling", beoordeling(), { cookie: jury });
  staat = (await haal("/api/staat")).json;
  assert.equal(staat.beoordelingen.length, 1);
  assert.deepEqual(staat.belangen, []);
  assert.deepEqual((await haal("/api/jury/werk", { cookie: jury })).json.belangen, []);
});

test("gelijktijdige beoordelingen raken niet kwijt", async () => {
  const beheer = await alsBeheer();
  const cookies = [];
  for (const naam of ["Een", "Twee", "Drie", "Vier", "Vijf", "Zes"]) cookies.push(await logIn((await maakJurylid(beheer, naam)).code));
  const antwoorden = await Promise.all(cookies.map((cookie) => stuur("/api/jury/beoordeling", beoordeling(), { cookie })));
  assert.ok(antwoorden.every((a) => a.status === 200));
  assert.equal((await haal("/api/staat")).json.beoordelingen.length, 6);
});

// ---------- publieke formulieren ----------

test("inzending: opgeslagen met nummer, tijdstempel en status nieuw", async () => {
  const a = await stuur("/api/inzending", inzending({ onbekend: "weg ermee", id: "zelfgekozen", status: "In productie" }));
  assert.equal(a.status, 200);
  assert.deepEqual(a.json, { ok: true, nummer: "MP-0001" });
  assert.equal((await stuur("/api/inzending", inzending({ soort: "aanvulling" }))).json.nummer, "MP-0002");

  const [eerste, tweede] = await opgeslagen("inzendingen");
  assert.equal(eerste.nummer, "MP-0001");
  assert.equal(eerste.status, "nieuw");
  assert.equal(eerste.statusOplossing, "In productie");
  assert.equal(eerste.soort, "inzending");
  assert.match(eerste.id, /^[0-9a-f-]{36}$/);
  assert.match(eerste.ontvangen, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.equal(eerste.oplossing, "Planhulp");
  assert.equal(eerste.email, "noor@voorbeeld.example");
  assert.equal(eerste.akkoord, true);
  assert.ok(!("onbekend" in eerste) && !("website" in eerste));
  assert.equal(tweede.soort, "aanvulling");
  assert.notEqual(eerste.id, tweede.id);
});

test("inzending: tekst wordt getrimd en blijft tekst", async () => {
  await stuur("/api/inzending", inzending({ oplossing: "  <b>Plan</b>\n hulp  ", beschrijving: "  Regel een.\r\n\r\n\r\n\r\nRegel twee <script>alert(1)</script>  ", sinds: 2025 }));
  const [i] = await opgeslagen("inzendingen");
  assert.equal(i.oplossing, "<b>Plan</b> hulp");
  assert.equal(i.beschrijving, "Regel een.\n\nRegel twee <script>alert(1)</script>");
  assert.equal(i.sinds, "2025");
});

test("inzending: verplichte velden", async () => {
  for (const veld of ["oplossing", "organisatie", "beschrijving", "naam", "email", "rol", "sinds", "sector", "type", "resultaat"]) {
    const a = await stuur("/api/inzending", inzending({ [veld]: "  " }));
    assert.equal(a.status, 400, veld);
    assert.deepEqual(Object.keys(a.json.velden), [veld]);
    assert.equal(a.json.fout, a.json.velden[veld]);
  }
  for (const akkoord of [false, "true", 1, undefined]) {
    assert.equal((await stuur("/api/inzending", inzending({ akkoord }))).status, 400, String(akkoord));
  }
  for (const email of ["noor", "noor@voorbeeld", "noor@@voorbeeld.example", "no or@voorbeeld.example", "<noor@voorbeeld.example>"]) {
    assert.equal((await stuur("/api/inzending", inzending({ email }))).status, 400, email);
  }
  assert.equal((await stuur("/api/inzending", inzending({ soort: "iets-anders" }))).status, 400);
  assert.equal((await stuur("/api/inzending", inzending({ herkomstCijfer: "gokje" }))).status, 400);
  assert.equal((await stuur("/api/inzending", inzending({ oplossing: "x".repeat(121) }))).status, 400);
  // Meer fouten tegelijk: één zin, en per veld een melding.
  const veel = await stuur("/api/inzending", {});
  assert.equal(veel.status, 400);
  assert.ok(Object.keys(veel.json.velden).length >= 7);
  assert.deepEqual(await opgeslagen("inzendingen"), []);
});

test("aanvulling: sinds, sector, type en resultaat mogen leeg blijven", async () => {
  const a = await stuur("/api/inzending", inzending({ soort: "aanvulling", sinds: "", sector: "", type: "", resultaat: "", status: "", herkomstCijfer: "", demo: "", bronnen: "" }));
  assert.equal(a.status, 200, JSON.stringify(a.json));
  assert.equal((await stuur("/api/inzending", inzending({ soort: "aanvulling", beschrijving: "" }))).status, 400);
});

test("inzending: adressen in demo en bronnen moeten met http(s):// beginnen", async () => {
  for (const demo of ["voorbeeld.example/demo", "www.voorbeeld.example", "javascript:alert(1)", "ftp://voorbeeld.example", "https://voor beeld.example"]) {
    const a = await stuur("/api/inzending", inzending({ demo }));
    assert.equal(a.status, 400, demo);
    assert.ok(a.json.velden.demo);
  }
  for (const bronnen of ["www.voorbeeld.example/nieuws", "https://goed.example\nvoorbeeld.example/rapport", "ftp://voorbeeld.example/bestand", "javascript://voorbeeld.example"]) {
    const a = await stuur("/api/inzending", inzending({ bronnen }));
    assert.equal(a.status, 400, bronnen);
    assert.ok(a.json.velden.bronnen);
  }
  assert.equal((await stuur("/api/inzending", inzending({ demo: "http://voorbeeld.example" }))).status, 200);
  assert.equal((await stuur("/api/inzending", inzending({ bronnen: ["https://een.example/a", "Vakblad Zorg, mei 2026"] }))).status, 200);
  const laatste = (await opgeslagen("inzendingen")).at(-1);
  assert.equal(laatste.bronnen, "https://een.example/a\nVakblad Zorg, mei 2026");
});

test("honingpot: antwoord 200, maar er wordt niets bewaard", async () => {
  assert.deepEqual((await stuur("/api/inzending", inzending({ website: "https://spam.example" }))).json, { ok: true });
  assert.deepEqual((await stuur("/api/aanmelding", { website: "x" })).json, { ok: true });
  assert.deepEqual((await stuur("/api/contact", { website: "x" })).json, { ok: true });
  assert.deepEqual(await readdir(map), []);
});

const aanmelding = (extra = {}) => ({
  naam: "Tom Bakker",
  email: "tom@voorbeeld.example",
  functie: "Onderzoeker",
  organisatie: "Hogeschool Voorbeeld",
  profiel: "https://www.linkedin.com/in/voorbeeld",
  expertise: "Spraakherkenning",
  ervaring: "Tien jaar onderzoek naar spraakherkenning in de zorg.",
  akkoord: true,
  website: "",
  ...extra,
});

test("aanmelding: opgeslagen en zichtbaar voor de beheerder", async () => {
  const a = await stuur("/api/aanmelding", aanmelding({ rol: "beheer" }));
  assert.equal(a.status, 200);
  assert.deepEqual(a.json, { ok: true });
  const [opgeslagenAanmelding] = await opgeslagen("aanmeldingen");
  assert.deepEqual(Object.keys(opgeslagenAanmelding).sort(), ["akkoord", "email", "ervaring", "expertise", "functie", "id", "naam", "ontvangen", "organisatie", "profiel", "status"]);
  assert.equal(opgeslagenAanmelding.status, "nieuw");
  // Aanmelden maakt nog geen jurylid.
  assert.deepEqual((await haal("/api/staat")).json.jury, []);
});

test("aanmelding: verplichte velden en ongeldige invoer", async () => {
  for (const veld of ["naam", "email", "functie", "organisatie", "ervaring"]) {
    const a = await stuur("/api/aanmelding", aanmelding({ [veld]: "" }));
    assert.equal(a.status, 400, veld);
    assert.ok(a.json.velden[veld]);
  }
  assert.equal((await stuur("/api/aanmelding", aanmelding({ akkoord: false }))).status, 400);
  assert.equal((await stuur("/api/aanmelding", aanmelding({ email: "geen-adres" }))).status, 400);
  assert.equal((await stuur("/api/aanmelding", aanmelding({ profiel: "linkedin.com/in/voorbeeld" }))).status, 400);
  assert.equal((await stuur("/api/aanmelding", aanmelding({ profiel: "", expertise: "" }))).status, 200);
});

test("contact: opgeslagen; verplichte velden", async () => {
  const goed = { naam: "Noor Jansen", email: "noor@voorbeeld.example", onderwerp: "Vraag", bericht: "Kan ik een oplossing laten weghalen?", website: "" };
  const a = await stuur("/api/contact", goed);
  assert.equal(a.status, 200);
  assert.deepEqual(a.json, { ok: true });
  const [bericht] = await opgeslagen("berichten");
  assert.deepEqual(Object.keys(bericht).sort(), ["bericht", "email", "id", "naam", "onderwerp", "ontvangen", "status"]);
  assert.equal(bericht.status, "nieuw");
  for (const veld of ["naam", "email", "bericht"]) assert.equal((await stuur("/api/contact", { ...goed, [veld]: "" })).status, 400, veld);
  assert.equal((await stuur("/api/contact", { ...goed, onderwerp: "" })).status, 200);
  assert.equal((await stuur("/api/contact", { ...goed, bericht: "x".repeat(4001) })).status, 400);
});

test("formulieren: vijf per uur per soort per IP-adres", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.now() });
  const ip = "203.0.113.50";
  const contact = { naam: "Noor", email: "noor@voorbeeld.example", bericht: "Een vraag." };
  // Afgekeurde invoer en de honingpot tellen niet mee.
  for (let i = 0; i < 8; i++) assert.equal((await stuur("/api/contact", { ...contact, bericht: "" }, { ip })).status, 400);
  for (let i = 0; i < 8; i++) assert.equal((await stuur("/api/contact", { ...contact, website: "x" }, { ip })).status, 200);
  for (let i = 0; i < 5; i++) assert.equal((await stuur("/api/contact", contact, { ip })).status, 200);
  const geblokt = await stuur("/api/contact", contact, { ip });
  assert.equal(geblokt.status, 429);
  assert.ok(Number(geblokt.headers.get("retry-after")) > 0);
  assert.equal((await opgeslagen("berichten")).length, 5);

  // Per soort een eigen teller, en per adres.
  for (let i = 0; i < 5; i++) assert.equal((await stuur("/api/inzending", inzending(), { ip })).status, 200);
  assert.equal((await stuur("/api/inzending", inzending(), { ip })).status, 429);
  for (let i = 0; i < 5; i++) assert.equal((await stuur("/api/aanmelding", aanmelding(), { ip })).status, 200);
  assert.equal((await stuur("/api/aanmelding", aanmelding(), { ip })).status, 429);
  assert.equal((await stuur("/api/contact", contact, { ip: "203.0.113.51" })).status, 200);
  // De limiet op formulieren houdt inloggen niet tegen.
  assert.equal((await stuur("/api/login", { code: BEHEER }, { ip })).status, 200);

  t.mock.timers.tick(60 * 60 * 1000 + 1000);
  assert.equal((await stuur("/api/contact", contact, { ip })).status, 200);
});

test("gelijktijdige inzendingen krijgen elk een eigen nummer", async () => {
  const antwoorden = await Promise.all(Array.from({ length: 8 }, () => stuur("/api/inzending", inzending())));
  const nummers = antwoorden.map((a) => a.json.nummer).sort();
  assert.deepEqual(nummers, ["MP-0001", "MP-0002", "MP-0003", "MP-0004", "MP-0005", "MP-0006", "MP-0007", "MP-0008"]);
  assert.equal((await opgeslagen("inzendingen")).length, 8);
});

// ---------- beheer: inzendingen, verbergen, afhandelen ----------

async function metInzending() {
  await stuur("/api/inzending", inzending());
  const beheer = await alsBeheer();
  const overzicht = (await haal("/api/beheer/overzicht", { cookie: beheer })).json;
  return { beheer, inzending: overzicht.inzendingen.at(-1) };
}

test("overzicht: alle lijsten voor de beheerder", async () => {
  const { beheer } = await metInzending();
  await stuur("/api/aanmelding", aanmelding());
  await stuur("/api/contact", { naam: "Noor", email: "noor@voorbeeld.example", bericht: "Een vraag." });
  const a = await haal("/api/beheer/overzicht", { cookie: beheer });
  assert.equal(a.status, 200);
  assert.equal(a.headers.get("cache-control"), "no-store");
  assert.deepEqual(Object.keys(a.json).sort(), ["aanmeldingen", "belangen", "beoordelingen", "berichten", "gepubliceerd", "inzendingen", "jury", "verborgen"]);
  assert.equal(a.json.inzendingen.length, 1);
  assert.equal(a.json.aanmeldingen.length, 1);
  assert.equal(a.json.berichten.length, 1);
  assert.equal(a.json.inzendingen[0].nummer, "MP-0001");
});

test("publiceer: het record komt in de staat en is te beoordelen", async () => {
  const { beheer, inzending: i } = await metInzending();
  const a = await stuur("/api/beheer/inzending", { id: i.id, actie: "publiceer", oplossing: record({ herkomst: "redactie", toegevoegd: "2020-01-01", stiekem: true }) }, { cookie: beheer });
  assert.equal(a.status, 200, JSON.stringify(a.json));
  const o = a.json.oplossing;
  assert.equal(o.id, "voorbeeld-bv-planhulp");
  assert.equal(o.herkomst, "inzending");
  assert.match(o.toegevoegd, VANDAAG);
  assert.notEqual(o.toegevoegd, "2020-01-01");
  assert.deepEqual(Object.keys(o).sort(), Object.keys(selectie[0]).sort(), "dezelfde velden als de selectie");

  const staat = (await haal("/api/staat")).json;
  assert.deepEqual(staat.oplossingen, [o]);

  const overzicht = (await haal("/api/beheer/overzicht", { cookie: beheer })).json;
  assert.equal(overzicht.inzendingen[0].status, "gepubliceerd");
  assert.equal(overzicht.inzendingen[0].gepubliceerdAls, o.id);
  assert.deepEqual(overzicht.gepubliceerd, [o]);

  // Een jurylid kan de nieuwe oplossing beoordelen.
  const jury = await logIn((await maakJurylid(beheer)).code);
  assert.equal((await stuur("/api/jury/beoordeling", beoordeling({ oplossing: o.id }), { cookie: jury })).status, 200);

  // Nog eens publiceren mag niet.
  assert.equal((await stuur("/api/beheer/inzending", { id: i.id, actie: "publiceer", oplossing: record() }, { cookie: beheer })).status, 400);
  assert.equal((await opgeslagen("gepubliceerd")).length, 1);
});

test("publiceer: het id is uniek ten opzichte van selectie en eerdere publicaties", async () => {
  const beheer = await alsBeheer();
  const ids = [];
  for (const id of [EERSTE, EERSTE, undefined, undefined]) {
    await stuur("/api/inzending", inzending());
    const i = (await opgeslagen("inzendingen")).at(-1);
    const a = await stuur("/api/beheer/inzending", { id: i.id, actie: "publiceer", oplossing: record({ id }) }, { cookie: beheer });
    assert.equal(a.status, 200, JSON.stringify(a.json));
    ids.push(a.json.oplossing.id);
  }
  assert.deepEqual(ids, [`${EERSTE}-2`, `${EERSTE}-3`, "voorbeeld-bv-planhulp", "voorbeeld-bv-planhulp-2"]);
});

test("publiceer: een record dat niet aan het schema voldoet geeft 400 met de lijst", async () => {
  const { beheer, inzending: i } = await metInzending();
  const publiceer = (oplossing) => stuur("/api/beheer/inzending", { id: i.id, actie: "publiceer", oplossing }, { cookie: beheer });

  const leeg = await publiceer({});
  assert.equal(leeg.status, 400);
  assert.ok(Array.isArray(leeg.json.fouten));
  for (const stuk of ["naam ontbreekt", "organisatie ontbreekt", "kort ontbreekt", "beschrijving ontbreekt", "onbekende sector", "onbekend type", "onbekende status", "minstens één bron"]) {
    assert.ok(leeg.json.fouten.some((f) => f.includes(stuk)), stuk);
  }
  assert.equal((await publiceer(undefined)).status, 400);
  assert.equal((await publiceer("tekst")).status, 400);

  const gevallen = [
    [{ id: "Hoofdletters En Spaties" }, "id moet"],
    [{ kort: "x".repeat(141) }, "kort is 141 tekens"],
    [{ sector: "Ruimtevaart" }, "onbekende sector"],
    [{ type: "Robot" }, "onbekend type"],
    [{ status: "Idee" }, "onbekende status"],
    [{ sinds: "vorig jaar" }, "sinds moet"],
    [{ gebouwdMet: "Eigen team" }, "gebouwdMet moet een lijst"],
    [{ resultaat: { tekst: "Veel beter.", herkomst: "gokje" } }, "resultaat heeft"],
    [{ resultaat: { tekst: "", herkomst: "organisatie" } }, "resultaat heeft"],
    [{ bronnen: [] }, "minstens één bron"],
    [{ bronnen: [{ titel: "Zonder https", url: "http://voorbeeld.example" }] }, "zonder https-adres"],
    [{ bronnen: [{ titel: "", url: "https://voorbeeld.example" }] }, "bron zonder titel"],
    [{ bronnen: [{ titel: "Datum", url: "https://voorbeeld.example", datum: "mei 2026" }] }, "datum van bron"],
    [{ gecontroleerd: "gisteren" }, "gecontroleerd is geen datum"],
    [{ beschrijving: "Een zin — met een gedachtestreepje." }, "gedachtestreepje"],
  ];
  for (const [extra, stuk] of gevallen) {
    const a = await publiceer(record(extra));
    assert.equal(a.status, 400, stuk);
    assert.ok(a.json.fouten.some((f) => f.includes(stuk)), `${stuk}: ${JSON.stringify(a.json.fouten)}`);
    assert.ok(a.json.fout.includes(stuk));
  }
  assert.deepEqual(await opgeslagen("gepubliceerd"), []);
  assert.equal((await opgeslagen("inzendingen"))[0].status, "nieuw");

  // Wat mag: geen resultaat, geen sinds, een bron met alleen een jaartal.
  const mag = await publiceer(record({ resultaat: null, sinds: null, gebouwdMet: undefined, opvallend: undefined, bronnen: [{ titel: "Bron", url: "https://voorbeeld.example", datum: "2026" }] }));
  assert.equal(mag.status, 200, JSON.stringify(mag.json));
  assert.equal(mag.json.oplossing.resultaat, null);
  assert.equal(mag.json.oplossing.sinds, null);
  assert.deepEqual(mag.json.oplossing.gebouwdMet, []);
});

test("wijsaf en archiveer zetten de status; foutpaden", async () => {
  const { beheer, inzending: i } = await metInzending();
  const af = await stuur("/api/beheer/inzending", { id: i.id, actie: "wijsaf" }, { cookie: beheer });
  assert.equal(af.status, 200);
  assert.equal((await opgeslagen("inzendingen"))[0].status, "afgewezen");
  await stuur("/api/beheer/inzending", { id: i.id, actie: "archiveer" }, { cookie: beheer });
  assert.equal((await opgeslagen("inzendingen"))[0].status, "gearchiveerd");
  assert.deepEqual((await haal("/api/staat")).json.oplossingen, []);

  assert.equal((await stuur("/api/beheer/inzending", { id: i.id, actie: "verwijder" }, { cookie: beheer })).status, 400);
  assert.equal((await stuur("/api/beheer/inzending", { id: i.id, actie: "toString" }, { cookie: beheer })).status, 400);
  assert.equal((await stuur("/api/beheer/inzending", { id: i.id }, { cookie: beheer })).status, 400);
  assert.equal((await stuur("/api/beheer/inzending", { id: "bestaat-niet", actie: "wijsaf" }, { cookie: beheer })).status, 404);
  assert.equal((await stuur("/api/beheer/inzending", { actie: "wijsaf" }, { cookie: beheer })).status, 404);
});

test("verborgen: verbergen en terugzetten", async () => {
  const { beheer, jurylid, jury } = await opzet();
  await stuur("/api/jury/beoordeling", beoordeling(), { cookie: jury });
  await stuur("/api/jury/beoordeling", { oplossing: TWEEDE, belang: true }, { cookie: jury });

  const a = await stuur("/api/beheer/verborgen", { id: EERSTE, verborgen: true }, { cookie: beheer });
  assert.equal(a.status, 200);
  await stuur("/api/beheer/verborgen", { id: EERSTE, verborgen: true }, { cookie: beheer });
  await stuur("/api/beheer/verborgen", { id: TWEEDE, verborgen: true }, { cookie: beheer });
  let staat = (await haal("/api/staat")).json;
  assert.deepEqual(staat.verborgen, [EERSTE, TWEEDE]);
  // Cijfers en belangen van een verborgen oplossing gaan niet mee naar buiten.
  assert.deepEqual(staat.beoordelingen, []);
  assert.deepEqual(staat.belangen, []);
  assert.deepEqual((await haal("/api/beheer/overzicht", { cookie: beheer })).json.verborgen, [EERSTE, TWEEDE]);

  await stuur("/api/beheer/verborgen", { id: EERSTE, verborgen: false }, { cookie: beheer });
  await stuur("/api/beheer/verborgen", { id: TWEEDE, verborgen: false }, { cookie: beheer });
  staat = (await haal("/api/staat")).json;
  assert.deepEqual(staat.verborgen, []);
  assert.equal(staat.beoordelingen.length, 1);
  assert.deepEqual(staat.belangen, [{ oplossing: TWEEDE, jurylid: jurylid.id }]);

  assert.equal((await stuur("/api/beheer/verborgen", { id: "bestaat-niet", verborgen: true }, { cookie: beheer })).status, 404);
  assert.equal((await stuur("/api/beheer/verborgen", { id: EERSTE, verborgen: "ja" }, { cookie: beheer })).status, 400);
  assert.equal((await stuur("/api/beheer/verborgen", { id: EERSTE }, { cookie: beheer })).status, 400);
});

test("verborgen: een gepubliceerde inzending verdwijnt uit de staat", async () => {
  const { beheer, inzending: i } = await metInzending();
  const { oplossing } = (await stuur("/api/beheer/inzending", { id: i.id, actie: "publiceer", oplossing: record() }, { cookie: beheer })).json;
  assert.equal((await stuur("/api/beheer/verborgen", { id: oplossing.id, verborgen: true }, { cookie: beheer })).status, 200);
  const staat = (await haal("/api/staat")).json;
  assert.deepEqual(staat.oplossingen, []);
  assert.deepEqual(staat.verborgen, [oplossing.id]);
  assert.equal((await haal("/api/beheer/overzicht", { cookie: beheer })).json.gepubliceerd.length, 1);
});

test("afgehandeld: voor aanmelding, bericht en inzending", async () => {
  const { beheer } = await metInzending();
  await stuur("/api/aanmelding", aanmelding());
  await stuur("/api/contact", { naam: "Noor", email: "noor@voorbeeld.example", bericht: "Een vraag." });
  const soorten = { aanmelding: "aanmeldingen", bericht: "berichten", inzending: "inzendingen" };
  for (const [soort, sleutel] of Object.entries(soorten)) {
    const [item] = await opgeslagen(sleutel);
    assert.equal(item.status, "nieuw");
    const a = await stuur("/api/beheer/afgehandeld", { soort, id: item.id }, { cookie: beheer });
    assert.equal(a.status, 200, soort);
    assert.deepEqual(a.json, { ok: true });
    assert.equal((await opgeslagen(sleutel))[0].status, "afgehandeld");
  }
  const [bericht] = await opgeslagen("berichten");
  assert.equal((await stuur("/api/beheer/afgehandeld", { soort: "jury", id: bericht.id }, { cookie: beheer })).status, 400);
  assert.equal((await stuur("/api/beheer/afgehandeld", { id: bericht.id }, { cookie: beheer })).status, 400);
  assert.equal((await stuur("/api/beheer/afgehandeld", { soort: "bericht", id: "bestaat-niet" }, { cookie: beheer })).status, 404);
  // Een id van een bericht is geen aanmelding.
  assert.equal((await stuur("/api/beheer/afgehandeld", { soort: "aanmelding", id: bericht.id }, { cookie: beheer })).status, 404);
});
