// Klikt alles door: voorpagina (zoeken, filters), een dier (tabjes, Mijn zee), strand (maand, plusje, station),
// kinderen (volgende, strook), onderzoekjes (spel, stempel, certificaat) en Mijn zee.
// Gebruik: node tests/klikken.js [basis-url]
const { chromium } = require("playwright");
const BASIS = process.argv[2] || "http://127.0.0.1:8766";
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1366, height: 900 } }); p.setDefaultTimeout(30000);
  const fouten = []; p.on("pageerror", (e) => fouten.push(e.message)); p.on("console", (m) => m.type() === "error" && fouten.push(m.text()));
  const controle = (ok, wat) => { if (!ok) fouten.push("mislukt: " + wat); else console.log("  ok", wat); };
  // voorpagina
  await p.goto(BASIS + "/"); await p.waitForSelector(".vkaart");
  const alle = await p.locator(".vkaart").count();
  controle(alle >= 30, `raster met ${alle} dieren`);
  await p.click('[data-plek="wad"]'); controle((await p.locator(".vkaart").count()) < alle, "filter wad");
  await p.click('[data-plek="wad"]'); await p.fill("#filterveld", "zeehond"); controle((await p.locator(".vkaart").count()) === 2, "zoeken naar zeehond in het raster");
  await p.fill("#zoekveld", "kok"); await p.waitForSelector("#zoek-lijst li"); await p.keyboard.press("Enter"); await p.waitForURL(/\/kokkel$/);
  controle(true, "zoeken in de kop naar kokkel");
  // dier
  await p.waitForSelector(".tabs [data-tab]");
  for (const t of await p.locator(".tabs [data-tab]").all()) { await t.click(); await p.waitForTimeout(200); }
  controle((await p.locator(".kaart-svg").count()) >= 1, "tabjes van de kokkel, kaart zichtbaar");
  await p.click("[data-mijn]"); controle((await p.getAttribute("[data-mijn]", "aria-pressed")) === "true", "Ik heb hem gezien");
  controle((await p.textContent(".nav-mijn-n")) === "1", "teller in de kop");
  await p.goto(BASIS + "/blauwe-vinvis?tab=schaal"); await p.waitForSelector(".schaal svg");
  await p.click('[data-ref="bus"]'); controle((await p.locator('[data-ref="bus"][aria-pressed="true"]').count()) === 1, "op schaal: bus");
  await p.goto(BASIS + "/bultrug?tab=geluid"); await p.waitForSelector(".knop-speel"); await p.click(".knop-speel"); await p.waitForTimeout(800);
  controle(true, "geluid van de bultrug aangezet");
  // strand
  await p.goto(BASIS + "/strand"); await p.waitForSelector(".vondst-plus");
  await p.click('[data-maand="5"]'); controle((await p.textContent("[data-maandnaam]")) === "juni", "strand: juni");
  await p.locator(".vondst-plus").first().click(); controle((await p.textContent(".nav-mijn-n")) === "2", "vondst in Mijn zee");
  await p.selectOption("#station", "vlissingen"); await p.waitForTimeout(400); controle((await p.locator(".getij-dag").count()) >= 2, "getij Vlissingen");
  // kinderen
  await p.goto(BASIS + "/kinderen"); await p.waitForSelector(".kinderkaart"); await p.locator(".kinderkaart").first().click();
  await p.waitForSelector(".kids-plaat"); const eerst = p.url();
  await p.click(".kids-volgende"); await p.waitForTimeout(300); controle(p.url() !== eerst, "kinderen: volgende");
  await p.click((await p.locator(".kids-tip").isVisible()) ? ".kids-tip" : ".kids-plaat"); await p.waitForTimeout(300);
  controle(!(await p.locator(".kids-tip").isVisible()), "kinderen: handje weg na de eerste tik"); controle(await p.locator(".kids-ballon.zichtbaar").count() === 1, "kinderen: naam in de ballon");
  await p.locator(".kids-duim").nth(3).click(); await p.waitForTimeout(300); controle(await p.locator(".kids-duim[aria-current]").getAttribute("data-i") === "3", "kinderen: strook");
  // onderzoekjes
  await p.goto(BASIS + "/onderzoekjes/schelpen-zoeken"); await p.waitForSelector(".oz-keuze");
  for (let i = 0; i < 5; i++) { await p.locator(".oz-keuze").first().click(); await p.click("[data-verder]"); }
  controle((await p.textContent(".oz-uitkomst")).includes("van de 5"), "schelpenspel");
  await p.click("[data-klaar]"); controle((await p.locator(".oz-stempel").count()) === 1, "stempel");
  for (const s of ["wat-spoelt-er-aan", "drijft-een-ei", "eb-en-vloed", "hoe-groot-is-een-walvis", "garnalen-kijken"]) {
    await p.goto(BASIS + "/onderzoekjes/" + s); await p.waitForSelector(".oz-werk *"); await p.click("[data-klaar]");
  }
  await p.goto(BASIS + "/onderzoekjes"); await p.fill("#naam", "Fos");
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("[data-cert]")]);
  controle(dl.suggestedFilename().endsWith(".png"), "certificaat " + dl.suggestedFilename());
  await p.click("[data-opnieuw]"); await p.click("[data-ja]"); controle((await p.locator(".oz-stempel").count()) === 0, "opnieuw beginnen");
  controle((await p.evaluate(() => JSON.parse(localStorage.getItem("zeezicht-onderzoekjes"))._naam)) === "Fos", "naam blijft bewaard");
  // mijn
  await p.goto(BASIS + "/mijn"); await p.waitForSelector(".mijnlijst"); controle((await p.locator(".mijnlijst li").count()) === 2, "Mijn zee: 2");
  await b.close();
  for (const f of new Set(fouten)) console.log("  FOUT", f.slice(0, 200));
  console.log(fouten.length ? `${fouten.length} problemen` : "alles werkt");
  process.exit(fouten.length ? 1 : 0);
})();
