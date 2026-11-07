// Toegankelijkheidscontrole met axe-core (WCAG 2.1 AA) op elke soort pagina.
// Gebruik: node tests/toegankelijk.js [basis-url] [pad naar axe.min.js]
const { chromium } = require("playwright");
const fs = require("fs");
const BASIS = process.argv[2] || "http://127.0.0.1:8766";
const AXE = fs.readFileSync(process.argv[3] || require.resolve("axe-core/axe.min.js"), "utf8");
const PAGINAS = ["/", "/kokkel", "/kokkel?tab=waar", "/zeester?tab=schaal", "/bultrug?tab=geluid", "/zeeklit", "/strand", "/kinderen", "/kinderen/zeester", "/onderzoekjes", "/onderzoekjes/drijft-een-ei", "/onderzoekjes/hoe-groot-is-een-walvis", "/mijn", "/hoe-dit-werkt", "/bestaat-niet"];
(async () => {
  const b = await chromium.launch(); let n = 0;
  for (const w of [1366, 390]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 }, bypassCSP: true });
    for (const pad of PAGINAS) {
      await p.goto(BASIS + pad, { waitUntil: "networkidle" }); await p.waitForTimeout(500);
      await p.addScriptTag({ content: AXE });
      const r = await p.evaluate(() => axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] } }));
      for (const v of r.violations) { n++; console.log(`${w} ${pad}: ${v.id} (${v.impact}) ${v.nodes.length}x — ${v.nodes.slice(0, 2).map((x) => x.target.join(" ")).join(" | ")}`); }
    }
    await p.close();
  }
  await b.close(); console.log(n ? `${n} meldingen` : "geen meldingen"); process.exit(n ? 1 : 0);
})();
