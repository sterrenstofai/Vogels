// Maakt src/og.png, het beeld dat sociale media bij een link tonen.
// Vereist Playwright en een draaiende lokale server (voor de lettertypen).
import { createRequire } from "node:module";
import { poster } from "../src/js/poster.js";
const { chromium } = createRequire(import.meta.url)("playwright");
const BASIS = process.env.BASIS ?? "http://127.0.0.1:8811";
const vlak = (id, sector, type) => poster({ id, naam: "", sector, type });
const html = `<!doctype html><link rel="stylesheet" href="${BASIS}/css/stijl.css"><style>
  body{margin:0;width:1200px;height:630px;background:#121110;color:#f4f2ec;display:grid;grid-template-columns:1fr 420px;overflow:hidden}
  .l{padding:64px;display:flex;flex-direction:column;justify-content:space-between}
  .m{font:400 44px/1 "Instrument Serif";display:flex;align-items:center;gap:16px}.m svg{width:44px;height:44px;color:#e5381b}
  h1{font:400 104px/0.9 "Instrument Serif";letter-spacing:-0.03em;margin:0}h1 em{color:#e5381b}
  p{font:500 20px/1.3 "Geist Mono";letter-spacing:.08em;text-transform:uppercase;color:#a59f93;margin:0}
  .r{display:grid;grid-template-rows:repeat(3,1fr)}.r svg{width:100%;height:100%}
</style><div class="l"><div class="m"><svg viewBox="0 0 26 26"><circle cx="13" cy="13" r="13" fill="currentColor"/><path d="M6.5 18V8.5l6.5 6 6.5-6V18" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></svg>Meesterproef</div>
<h1>AI die <em>werkt</em>,<br>beoordeeld door vakmensen.</h1><p>De Nederlandse prijs voor AI-oplossingen</p></div>
<div class="r">${vlak("og-a", "Zorg", "Spraak en verslaglegging")}${vlak("og-b", "Financiën", "Agent")}${vlak("og-c", "Retail", "Assistent voor klanten")}</div>`;
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await p.goto(BASIS + "/404.html");
await p.setContent(html, { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: new URL("../src/og.png", import.meta.url).pathname });
await browser.close();
console.log("src/og.png gemaakt");
