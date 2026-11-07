// Schermafbeeldingen op zes breedtes, met controle op horizontaal scrollen en fouten in de console.
// Gebruik: node tests/schermen.js [basis-url] [uitmap buiten de repo] [breedtes]
const { chromium } = require("playwright");
const BASIS = process.argv[2] || "http://127.0.0.1:8766";
const UIT = process.argv[3] || require("os").tmpdir() + "/zeezicht-schermen";
const BREEDTES = (process.argv[4] || "360,390,768,1024,1366,1920").split(",").map(Number);
const PAGINAS = [["start", "/"], ["kokkel", "/kokkel"], ["kokkel-waar", "/kokkel?tab=waar"], ["zeester-schaal", "/zeester?tab=schaal"], ["bultrug-geluid", "/bultrug?tab=geluid"],
  ["haring", "/haring"], ["zeeklit", "/zeeklit"], ["strand", "/strand"], ["kinderkeuze", "/kinderen"], ["kinderen", "/kinderen/zeester"], ["onderzoekjes", "/onderzoekjes"],
  ["oz-schelpen", "/onderzoekjes/schelpen-zoeken"], ["oz-ei", "/onderzoekjes/drijft-een-ei"], ["oz-eb", "/onderzoekjes/eb-en-vloed"], ["oz-walvis", "/onderzoekjes/hoe-groot-is-een-walvis"],
  ["mijn", "/mijn"], ["hoe", "/hoe-dit-werkt"], ["404", "/bestaat-niet"]];
(async () => {
  require("fs").mkdirSync(UIT, { recursive: true });
  const browser = await chromium.launch();
  let problemen = 0;
  for (const b of BREEDTES) {
    const page = await browser.newPage({ viewport: { width: b, height: b < 800 ? 780 : 900 } });
    const fouten = [];
    page.on("pageerror", (e) => fouten.push(e.message));
    page.on("console", (m) => { if (m.type() === "error" && !/404/.test(m.text())) fouten.push(m.text()); });
    for (const [naam, pad] of PAGINAS) {
      await page.goto(BASIS + pad, { waitUntil: "networkidle" });
      await page.waitForTimeout(700);
      const breed = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (breed > 0) { problemen++; console.log(`  ${b}px ${naam}: ${breed}px horizontaal scrollen`); }
      await page.screenshot({ path: `${UIT}/${naam}-${b}.png`, timeout: 120000 });
    }
    for (const f of new Set(fouten)) { problemen++; console.log(`  ${b}px fout: ${f.slice(0, 200)}`); }
    await page.close();
  }
  await browser.close();
  console.log(problemen ? `${problemen} problemen` : "geen problemen");
  process.exit(problemen ? 1 : 0);
})();
