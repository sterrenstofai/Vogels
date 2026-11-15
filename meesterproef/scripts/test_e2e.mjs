// Toets van begin tot eind in een echte browser. Vereist Playwright en een
// draaiende lokale server met lege opslag:
//   rm -rf .opslag && node bouw.mjs && PORT=8811 node scripts/dev.mjs
//   node scripts/test_e2e.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASIS = process.env.BASIS ?? "http://127.0.0.1:8811";
const browser = await chromium.launch();
const fouten = [];
async function pagina(context) {
  const p = await context.newPage();
  p.on("pageerror", (e) => fouten.push(`${p.url()}: ${e}`));
  p.on("console", (m) => m.type() === "error" && !/401|404/.test(m.text()) && fouten.push(`${p.url()}: ${m.text()}`));
  p.on("dialog", (d) => d.accept());
  return p;
}
const stap = (naam) => console.log("·", naam);

// 1. Een bezoeker zendt een oplossing in, in vier stappen.
const bezoeker = await browser.newContext();
let p = await pagina(bezoeker);
await p.goto(`${BASIS}/inzenden/`);
await p.click("#volgende");
await p.fill('[name="oplossing"]', "Testhulp");
await p.fill('[name="organisatie"]', "Testorganisatie E2E");
await p.fill('[name="sinds"]', "maart 2025");
await p.selectOption('[name="sector"]', "Onderwijs");
await p.selectOption('[name="type"]', "Agent");
await p.click("#volgende");
await p.fill('[name="beschrijving"]', "Een testoplossing die laat zien dat het inzendformulier werkt.");
await p.click("#volgende"); // resultaat ontbreekt: we blijven op deze stap
assert.equal(await p.isVisible('[name="resultaat"]'), true, "een onvolledige stap houdt je tegen");
await p.fill('[name="resultaat"]', "Tien procent minder zoektijd, gemeten door de organisatie.");
await p.fill('[name="bronnen"]', "https://example.com/testhulp");
await p.click("#volgende");
await p.fill('[name="naam"]', "Tes Ter");
await p.fill('[name="email"]', "tes@example.com");
await p.fill('[name="rol"]', "maker");
await p.check('[name="akkoord"]');
await p.click("#verstuur");
await p.waitForSelector("#klaar:not([hidden])");
assert.match(await p.textContent("#klaar-nummer"), /MP-0001/);
stap("inzending verstuurd");

// 2. Jury-aanmelding en contactbericht.
await p.goto(`${BASIS}/jury/`);
await p.fill('#aanmelding [name="naam"]', "Jet Jurylid");
await p.fill('#aanmelding [name="email"]', "jet@example.com");
await p.fill('#aanmelding [name="functie"]', "Onderzoeker");
await p.fill('#aanmelding [name="organisatie"]', "Testlab");
await p.fill('#aanmelding [name="ervaring"]', "Ik toets taalmodellen op betrouwbaarheid.");
await p.check('#aanmelding [name="akkoord"]');
await p.click('#aanmelding button[type="submit"]');
await p.waitForSelector("#aanmelding .formstatus.gelukt");
await p.goto(`${BASIS}/contact/`);
await p.fill('#contact [name="naam"]', "Co Contact");
await p.fill('#contact [name="email"]', "co@example.com");
await p.fill('#contact [name="bericht"]', "Een testbericht.");
await p.click('#contact button[type="submit"]');
await p.waitForSelector("#contact .formstatus.gelukt");
stap("aanmelding en contactbericht verstuurd");

// 3. De redactie logt in, maakt drie juryleden en publiceert de inzending.
const redactie = await browser.newContext();
p = await pagina(redactie);
await p.goto(`${BASIS}/beheer/`);
await p.waitForSelector("#geen-toegang:not([hidden])");
await p.goto(`${BASIS}/account/`);
await p.fill('[name="code"]', "fout");
await p.click('#inlogformulier button[type="submit"]');
await p.waitForSelector("#inlogformulier .formstatus.mislukt");
await p.fill('[name="code"]', process.env.BEHEER_CODE ?? "lokaal-beheer");
await p.click('#inlogformulier button[type="submit"]');
await p.waitForURL("**/beheer/");
await p.waitForSelector(".beheer-item");
assert.match(await p.textContent(".beheer-item"), /Testhulp/);

const codes = [];
await p.click('[data-deel="aanmeldingen"]');
await p.click("[data-maak-jurylid]");
await p.waitForSelector("#nieuw-jurylid");
assert.equal(await p.inputValue('#nieuw-jurylid [name="naam"]'), "Jet Jurylid", "de aanmelding vult het formulier vooraf in");
await p.click('#nieuw-jurylid button[type="submit"]');
await p.waitForSelector(".codevak code");
codes.push(await p.textContent(".codevak code"));
for (const naam of ["Bas Beoordelaar", "Cas Criticus"]) {
  await p.fill('#nieuw-jurylid [name="naam"]', naam);
  await p.fill('#nieuw-jurylid [name="functie"]', "Ontwikkelaar");
  const vorige = codes.at(-1);
  await p.click('#nieuw-jurylid button[type="submit"]');
  await p.waitForFunction((v) => document.querySelector(".codevak code")?.textContent !== v, vorige);
  codes.push(await p.textContent(".codevak code"));
}
assert.equal(new Set(codes).size, 3);
stap("drie juryleden met elk een eigen code");

await p.click('[data-deel="inzendingen"]');
await p.click("[data-open-publiceer]");
await p.fill('[data-publiceer] [name="kort"]', "Testoplossing die het inzendformulier van begin tot eind controleert.");
await p.fill('[data-publiceer] [name="bronnen"]', "Testartikel | Testpers | https://example.com/testhulp | 2026-01-05");
await p.click('[data-publiceer] button[type="submit"]');
await p.waitForSelector(".beheer-item.afgehandeld");
stap("inzending gepubliceerd");

// 4. Elk jurylid logt in en beoordeelt Finn van bunq.
const cijfers = [9, 8, 8];
for (const [i, code] of codes.entries()) {
  const jury = await browser.newContext();
  const j = await pagina(jury);
  await j.goto(`${BASIS}/account/`);
  await j.fill('[name="code"]', code);
  await j.click('#inlogformulier button[type="submit"]');
  await j.waitForSelector("#jurywerk:not([hidden])");
  await j.fill("#rij-zoek", "bunq");
  await j.click('#rij button[data-id="bunq-finn"]');
  for (const c of ["impact", "betrouwbaarheid", "ervaring", "verantwoord", "originaliteit"]) await j.fill(`.beoordeelformulier [name="${c}"]`, String(cijfers[i]));
  await j.fill('.beoordeelformulier [name="toelichting"]', `Toelichting van jurylid ${i + 1}: zorgvuldig gebouwd en eerlijk over de grenzen.`);
  await j.click('.beoordeelformulier button[type="submit"]');
  await j.waitForSelector("#beoordeel .formstatus.gelukt");
  if (i === 0) {
    // Het eerste jurylid trekt zich daarnaast terug voor een andere oplossing.
    await j.fill("#rij-zoek", "Anna");
    await j.click('#rij button[data-id^="abn-amro"]');
    await j.click("[data-belang]");
    await j.click('[data-rij="belang"]');
    await j.fill("#rij-zoek", "");
    await j.waitForSelector('#rij button[data-id^="abn-amro"]');
  }
  await jury.close();
}
stap("drie beoordelingen en één terugtrekking");

// 5. De uitslag staat openbaar, en de gepubliceerde inzending ook. Een nieuwe
// bezoeker, want de openbare stand mag een halve minuut in de cache staan.
p = await pagina(await browser.newContext());
await p.goto(`${BASIS}/oplossingen/bunq-finn/`);
await p.waitForSelector(".jury-eind-meesterproef");
assert.equal((await p.textContent(".jury-eind")).trim(), "8,3");
assert.equal(await p.locator(".stemmen .stem").count(), 3);
await p.goto(`${BASIS}/winnaars/`);
await p.waitForSelector(".kaart");
assert.match(await p.textContent("#winnaars-lijst"), /Finn/);
await p.goto(`${BASIS}/oplossingen/?zoek=Testhulp`);
await p.waitForSelector(".kaart");
await p.click(".kaart-link");
await p.waitForSelector(".detail-held h1");
assert.equal((await p.textContent(".detail-held h1")).trim(), "Testhulp");
await p.goto(`${BASIS}/jury/`);
await p.waitForSelector(".juryleden li");
assert.equal(await p.locator(".juryleden li").count(), 3);
stap("uitslag, winnaars, gepubliceerde inzending en jury zijn openbaar");

// 6. De redactie verbergt een oplossing; ze verdwijnt van de site.
p = await pagina(redactie);
await p.goto(`${BASIS}/beheer/`);
await p.click('[data-deel="oplossingen"]');
await p.click('[data-id="bunq-finn"][data-verberg="true"]');
await p.waitForSelector('[data-id="bunq-finn"][data-verberg="false"]');
p = await pagina(await browser.newContext());
await p.goto(`${BASIS}/oplossingen/?zoek=bunq`);
await p.waitForSelector("#raster .melding");
await p.goto(`${BASIS}/oplossingen/bunq-finn/`);
await p.waitForSelector(".nietgevonden");
stap("verborgen oplossing is weg");

await browser.close();
assert.deepEqual(fouten, [], "geen fouten in de browser");
console.log("e2e: alle stappen geslaagd");
