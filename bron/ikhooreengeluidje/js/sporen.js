// Sporen: open je eigen muziekbestand, en een computer schat welk geluid bij de zang, de drums,
// de bas en de rest hoort. Alles gebeurt in deze browser; het bestand wordt nergens heen gestuurd.
// Het rekenen doet sporen-werker.js. Het afspelen gaat via Web Audio, zodat de vier sporen gelijk lopen.
import * as G from "./geluid.js";
import * as M from "./geheugen.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const RATE = 44100;
const STUK_S = 60; // we scheiden hooguit een minuut: dat past in het geheugen van een telefoon
const MODEL_MB = 181;
const SPOREN = [
  ["vocals", "Zang", "De stem, of stemmen."],
  ["drums", "Drums", "Drumstel, drumcomputer, klappen."],
  ["bass", "Bas", "Basgitaar, synthbas, lage tonen."],
  ["other", "Overig", "Alles wat overblijft: gitaar, piano, synthesizer, strijkers, blazers."],
];
const tijd = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

let opruimen = null;
export function verlaat() { opruimen?.(); opruimen = null; }

export function sporenPagina(app) {
  verlaat();
  G.stop();
  app.innerHTML = `
  <section class="breed sp">
    <p class="etiket">Sporen</p>
    <h1>Haal een nummer <span class="accent">uit elkaar</span></h1>
    <p class="held-sub">Open een muziekbestand van je eigen apparaat. Een computerprogramma probeert dan de zang, de drums, de bas en de rest los van elkaar te halen. Daarna kun je elk spoor apart beluisteren of stilzetten, en zie je wanneer elk spoor speelt.</p>
    <div class="sp-eerlijk">
      <p><strong>Dit is een schatting.</strong> In de studio wordt elk instrument apart opgenomen, maar die sporen zijn bijna nooit openbaar. Wat je hier hoort, heeft het programma uit de opname zelf geraden. Dat werkt verrassend goed, maar er lekt altijd iets door: een beetje drums in de zang, wat galm bij de rest.</p>
      <p><strong>Je bestand blijft bij jou.</strong> Alles gebeurt in je eigen browser. Er wordt niets geüpload.</p>
    </div>
    <div class="sp-stap" data-stap="kies">
      <label class="knop-pil knop-accent sp-bestand"><input type="file" accept="audio/*,.mp3,.m4a,.wav,.flac,.ogg,.aac" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M5 20h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>Kies een muziekbestand</label>
      <p class="zacht sp-klein">Mp3, m4a, wav, flac of ogg. Nummers die je bij een streamingdienst luistert, kun je hier niet openen: die staan niet als bestand op je apparaat.</p>
    </div>
    <div class="sp-stap" data-stap="stuk" hidden></div>
    <div class="sp-stap" data-stap="reken" hidden></div>
    <div class="sp-stap" data-stap="mixer" hidden></div>
  </section>`;

  const stap = (naam) => app.querySelector(`[data-stap="${naam}"]`);
  const invoer = app.querySelector('input[type="file"]');
  let werker = null, ctx = null, bron = null, mixer = null, afdruk = null;

  invoer.addEventListener("change", async () => {
    const f = invoer.files?.[0];
    if (!f) return;
    mixer?.stop();
    stap("mixer").hidden = true; stap("reken").hidden = true;
    const s = stap("stuk");
    s.hidden = false;
    s.innerHTML = `<p class="laden"><span></span>Je bestand openen…</p>`;
    try {
      const buf = await f.arrayBuffer();
      afdruk = await M.vingerafdruk(buf); // eerst: decoderen maakt de buffer leeg
      bron = await decodeer(buf);
      bron.naam = f.name;
      toonStukKiezer();
    } catch (e) {
      s.innerHTML = `<p class="sp-fout">Dit bestand kan je browser niet openen. Probeer een mp3 of wav.</p>`;
    }
  });

  async function decodeer(buf) {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const data = await new Promise((ok, fout) => { const p = new OAC(2, RATE, RATE).decodeAudioData(buf, ok, fout); if (p && p.then) p.then(ok, fout); });
    const links = data.getChannelData(0), rechts = data.numberOfChannels > 1 ? data.getChannelData(1) : links;
    return { links, rechts, duur: data.length / RATE };
  }

  function toonStukKiezer() {
    const s = stap("stuk");
    const lang = bron.duur > STUK_S + 1;
    s.innerHTML = `
      <h2>Kies een stuk</h2>
      <p>${esc(bron.naam)} duurt ${tijd(bron.duur)}. ${lang ? `We halen een stuk van een minuut uit elkaar. Kies waar het begint: liefst een stuk waar veel gebeurt, zoals het refrein.` : "We halen het hele bestand uit elkaar."}</p>
      <canvas class="sp-overzicht" aria-hidden="true"></canvas>
      ${lang ? `<label class="sp-schuif"><span>Begin bij <output>0:00</output></span><input type="range" min="0" max="${Math.floor(bron.duur - STUK_S)}" step="1" value="${Math.min(Math.floor(bron.duur * 0.3), Math.floor(bron.duur - STUK_S))}" aria-label="Begin van het stuk in seconden"></label>` : ""}
      <p><button class="knop-pil knop-donker knop-groot-pil" type="button" data-start>Haal de sporen uit elkaar</button></p>
      <p class="zacht sp-klein" data-model-noot></p>
      <div class="sp-bewaard" data-bewaard hidden></div>`;
    const doek = s.querySelector(".sp-overzicht"), schuif = s.querySelector('input[type="range"]');
    const teken = () => tekenOverzicht(doek, bron, schuif ? +schuif.value : 0, Math.min(STUK_S, bron.duur));
    if (schuif) schuif.addEventListener("input", () => { s.querySelector("output").textContent = tijd(+schuif.value); teken(); });
    if (schuif) s.querySelector("output").textContent = tijd(+schuif.value);
    requestAnimationFrame(teken);
    werkerKlaar().then(() => werker.postMessage({ type: "heeft-model" }));
    toonBewaard();
    s.querySelector("[data-start]").addEventListener("click", () => {
      // in de tik: zo mag het geluid straks op iOS
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)({ sampleRate: RATE });
      ctx.resume();
      const van = schuif ? +schuif.value : 0;
      M.lijst().then((l) => {
        // hetzelfde stuk van hetzelfde bestand staat al op dit apparaat: meteen tonen
        if (l.some((x) => x.sleutel === `${afdruk}:${van}`)) return openBewaard(`${afdruk}:${van}`);
        const [links, rechts] = stuk(van);
        reken(links, rechts, van);
      });
    });
  }

  function stuk(van) {
    const o = Math.floor(van * RATE), n = Math.min(Math.floor(STUK_S * RATE), bron.links.length - o);
    return [bron.links.slice(o, o + n), bron.rechts.slice(o, o + n)];
  }

  // Eerder uit elkaar gehaald op dit apparaat: van dit bestand, en een knop om alles te vergeten
  async function toonBewaard() {
    const vak = app.querySelector("[data-bewaard]");
    if (!vak) return;
    const l = await M.lijst();
    const hier = l.filter((x) => x.bestand === afdruk).sort((a, b) => a.van - b.van);
    if (!l.length) { vak.hidden = true; return; }
    const mb = Math.round(l.reduce((a, x) => a + (x.bytes || 0), 0) / 1e6);
    vak.hidden = false;
    vak.innerHTML = `${hier.length ? `<p><strong>Al eerder uit elkaar gehaald op dit apparaat.</strong> Die sporen staan meteen klaar:</p>
      <p class="sp-bewaard-knoppen">${hier.map((x) => `<button class="knop-pil" type="button" data-open="${x.sleutel}">${tijd(x.van)} tot ${tijd(x.van + x.duur)}</button>`).join("")}</p>` : ""}
      <p class="zacht sp-klein">Op dit apparaat ${l.length === 1 ? "staat 1 stuk" : `staan ${l.length} stukken`} bewaard (${mb} MB). We houden er hooguit drie. <button class="sp-tekstknop" type="button" data-vergeet>Vergeet alle bewaarde sporen</button></p>`;
    vak.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)({ sampleRate: RATE });
      ctx.resume();
      openBewaard(b.dataset.open);
    }));
    vak.querySelector("[data-vergeet]").addEventListener("click", async () => { await M.wis(); toonBewaard(); });
  }

  async function openBewaard(sleutel) {
    const rec = await M.haal(sleutel);
    if (!rec) return;
    const [links, rechts] = stuk(rec.van);
    stap("reken").hidden = true;
    mixer?.stop();
    mixer = maakMixer(stap("mixer"), rec.sporen, { links, rechts }, rec.van, null);
    stap("mixer").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }

  function werkerKlaar() {
    if (!werker) {
      werker = new Worker(new URL("./sporen-werker.js", import.meta.url), { type: "module" });
      werker.addEventListener("message", opBericht);
      werker.addEventListener("error", () => toonFout("Het rekenprogramma start niet in deze browser."));
    }
    return Promise.resolve();
  }

  let rekenBegin = 0, stukVan = 0, origineel = null;
  function reken(links, rechts, van) {
    stukVan = van;
    origineel = { links, rechts };
    const r = stap("reken");
    r.hidden = false;
    stap("mixer").hidden = true;
    r.innerHTML = `<h2>Bezig</h2><div class="sp-balk"><span></span></div><p class="sp-status">Het rekenprogramma starten…</p>
      <p class="zacht sp-klein">Laat dit venster open. Op een computer duurt het meestal een paar minuten, op een telefoon of tablet langer.</p>`;
    rekenBegin = performance.now();
    werker.postMessage({ type: "scheid", links: links.slice(), rechts: rechts.slice() });
  }

  function zet(deel, tekst) {
    const r = stap("reken");
    r.querySelector(".sp-balk span").style.width = `${Math.round(deel * 100)}%`;
    r.querySelector(".sp-status").textContent = tekst;
  }

  function opBericht(e) {
    const d = e.data;
    if (d.type === "heeft-model") {
      const noot = app.querySelector("[data-model-noot]");
      if (noot) noot.textContent = d.ja ? "Het rekenmodel staat al op dit apparaat." : `De eerste keer downloadt je browser het rekenmodel: ${MODEL_MB} MB, van Hugging Face. Daarna blijft het op dit apparaat staan. Gebruik liever wifi.`;
    } else if (d.type === "model") {
      if (d.fase === "download") zet((d.geladen / d.totaal) * 0.3, `Rekenmodel downloaden: ${Math.round(d.geladen / 1e6)} van ${Math.round(d.totaal / 1e6)} MB`);
      else if (d.fase === "controleren") zet(0.3, "Controleren of het model goed is binnengekomen…");
      else if (d.fase === "uit-cache") zet(0.3, "Rekenmodel van dit apparaat laden…");
      else if (d.fase === "starten") zet(0.32, "Rekenmodel starten…");
      else if (d.fase === "klaar") zet(0.34, d.gpu ? "Rekenen met de grafische kaart…" : "Rekenen…");
    } else if (d.type === "voortgang") {
      const verstreken = (performance.now() - rekenBegin) / 1000;
      // demucs-web telt soms één stuk te weinig; daarom nooit "stuk 6 van 5"
      const stukken = Math.max(d.stukken, d.stuk), deel = Math.min(1, d.stuk / stukken);
      const rest = (verstreken / d.stuk) * (stukken - d.stuk);
      zet(0.34 + 0.66 * deel, `Stuk ${d.stuk} van ${stukken} klaar${d.stuk < stukken ? `, nog ongeveer ${rest > 90 ? `${Math.round(rest / 60)} minuten` : `${Math.max(5, Math.round(rest / 5) * 5)} seconden`}` : ", bijna klaar"}`);
    } else if (d.type === "klaar") {
      stap("reken").hidden = true;
      mixer?.stop();
      mixer = maakMixer(stap("mixer"), d.sporen, origineel, stukVan, d.seconden);
      // bewaren op dit apparaat, zodat het de volgende keer meteen klaar is (mislukt het, dan niet erg)
      M.bewaar(afdruk, bron.naam, stukVan, d.sporen).then(() => { const n = app.querySelector("[data-bewaar-noot]"); if (n) n.textContent = "Bewaard op dit apparaat: de volgende keer staan deze sporen meteen klaar."; toonBewaard(); }).catch(() => {});
      stap("mixer").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    } else if (d.type === "fout") {
      toonFout(d.tekst);
    }
  }

  function toonFout(tekst) {
    const r = stap("reken");
    r.hidden = false;
    r.innerHTML = `<p class="sp-fout">${esc(tekst)}</p><p class="zacht sp-klein">Werkt het niet? Probeer een andere browser (Chrome, Edge of Safari), of een computer in plaats van een telefoon. Het rekenen vraagt veel geheugen.</p>`;
  }

  /* ---------- De mixer ---------- */

  function maakMixer(el, sporen, orig, van, seconden) {
    el.hidden = false;
    const n = sporen.vocals.links.length, duur = n / RATE;
    const buffers = {};
    for (const [k] of SPOREN) {
      const b = ctx.createBuffer(2, n, RATE);
      b.copyToChannel(sporen[k].links, 0); b.copyToChannel(sporen[k].rechts, 1);
      buffers[k] = b;
    }
    const ob = ctx.createBuffer(2, n, RATE);
    ob.copyToChannel(orig.links, 0); ob.copyToChannel(orig.rechts, 1);
    const stil = new Set(), alleen = new Set();
    let bronnen = [], gains = {}, startCtx = 0, startPos = 0, speelt = false, raf = 0, toonOrig = false;

    el.innerHTML = `
      <h2>De sporen</h2>
      <p class="zacht sp-klein">${seconden == null ? "Uit het geheugen van dit apparaat" : `Uit elkaar gehaald in ${Math.round(seconden)} seconden`}: ${tijd(van)} tot ${tijd(van + duur)} van ${esc(bron.naam)}. Een schatting, geen echte studiosporen. <span data-bewaar-noot></span></p>
      <div class="sp-bediening">
        <button class="knop-rond knop-groot" type="button" data-speel aria-label="Speel"><svg viewBox="0 0 44 44" aria-hidden="true"><circle class="ring-bg" cx="22" cy="22" r="20"/><circle class="ring" cx="22" cy="22" r="20"/><path class="ico-pauze" d="M17 15v14M27 15v14"/><path class="ico-speel" d="M18 14l12 8-12 8z"/></svg></button>
        <span class="mono sp-tijd">0:00 / ${tijd(duur)}</span>
        <button class="knop-pil" type="button" data-orig aria-pressed="false">Vergelijk met het origineel</button>
      </div>
      <div class="sp-lanen">
        ${SPOREN.map(([k, naam, uitleg]) => `<div class="sp-laan" data-laan="${k}">
          <div class="sp-laan-kop"><strong>${naam}</strong><span class="zacht">${uitleg}</span></div>
          <div class="sp-laan-knoppen"><button type="button" class="sp-knop" data-stil="${k}" aria-pressed="false" aria-label="${naam} stilzetten">Stil</button><button type="button" class="sp-knop" data-alleen="${k}" aria-pressed="false" aria-label="Alleen ${naam}">Alleen</button></div>
          <div class="sp-tijdlijn-vak"><canvas class="sp-tijdlijn" data-tijdlijn="${k}" aria-label="Wanneer ${naam.toLowerCase()} te horen is"></canvas><span class="sp-streep" aria-hidden="true"></span></div>
        </div>`).join("")}
      </div>
      <p class="zacht sp-klein">Hoe donkerder de balk, hoe harder dat spoor op dat moment. Tik in een balk om naar die plek te springen. "Overig" is een verzamelbak: het programma kent alleen zang, drums en bas.</p>
      <p><label class="knop-pil sp-bestand"><input type="file" accept="audio/*" hidden>Kies een ander bestand</label></p>`;

    // tijdlijnen: hoe hard elk spoor is, per kwart seconde
    const STAP = Math.floor(RATE / 4);
    const niveaus = {};
    let max = 1e-9;
    for (const [k] of SPOREN) {
      const L = sporen[k].links, R = sporen[k].rechts, lijst = [];
      for (let i = 0; i < n; i += STAP) {
        let som = 0, m = Math.min(n, i + STAP);
        for (let j = i; j < m; j++) som += L[j] * L[j] + R[j] * R[j];
        lijst.push(Math.sqrt(som / (2 * (m - i))));
      }
      niveaus[k] = lijst;
      max = Math.max(max, ...lijst);
    }
    if (location.search.includes("test")) {
      const e = Object.fromEntries(SPOREN.map(([k]) => [k, sporen[k].links.reduce((a, v) => a + v * v, 0) + sporen[k].rechts.reduce((a, v) => a + v * v, 0)]));
      const tot = Object.values(e).reduce((a, b) => a + b, 0);
      window.__sporenAandeel = Object.fromEntries(Object.entries(e).map(([k, v]) => [k, Math.round((1000 * v) / tot) / 10]));
      window.__sporenNiveaus = niveaus;
    }
    const tekenLanen = () => {
      for (const [k] of SPOREN) {
        const doek = el.querySelector(`[data-tijdlijn="${k}"]`);
        const dpr = Math.min(2, devicePixelRatio || 1), r = doek.getBoundingClientRect();
        doek.width = Math.max(50, r.width * dpr); doek.height = Math.max(20, r.height * dpr);
        const c = doek.getContext("2d"), lijst = niveaus[k], w = doek.width / lijst.length;
        c.clearRect(0, 0, doek.width, doek.height);
        lijst.forEach((v, i) => {
          const db = 20 * Math.log10(v / max + 1e-9), a = Math.max(0, Math.min(1, (db + 42) / 42)); // 42 dB bereik
          c.fillStyle = `rgba(35,35,35,${(a * a).toFixed(3)})`;
          c.fillRect(i * w, 0, Math.ceil(w), doek.height);
        });
      }
    };
    requestAnimationFrame(tekenLanen);
    const opResize = () => tekenLanen();
    addEventListener("resize", opResize);

    const hoorbaar = (k) => (alleen.size ? alleen.has(k) : !stil.has(k));
    const zetGains = () => {
      for (const [k] of SPOREN) if (gains[k]) gains[k].gain.setTargetAtTime(toonOrig ? 0 : hoorbaar(k) ? 1 : 0, ctx.currentTime, 0.015);
      if (gains.orig) gains.orig.gain.setTargetAtTime(toonOrig ? 1 : 0, ctx.currentTime, 0.015);
      el.querySelectorAll(".sp-laan").forEach((l) => l.classList.toggle("uit", toonOrig || !hoorbaar(l.dataset.laan)));
    };
    const positie = () => (speelt ? Math.min(duur, startPos + ctx.currentTime - startCtx) : startPos);

    function start(vanaf) {
      stopBronnen();
      startPos = vanaf; startCtx = ctx.currentTime + 0.03;
      bronnen = [];
      for (const [k, buf] of [...Object.entries(buffers), ["orig", ob]]) {
        const s = ctx.createBufferSource(); s.buffer = buf;
        const g = gains[k] || (gains[k] = ctx.createGain());
        g.connect(ctx.destination);
        s.connect(g); s.start(startCtx, vanaf);
        bronnen.push(s);
      }
      bronnen[0].onended = () => { if (speelt && positie() >= duur - 0.05) { speelt = false; startPos = 0; werkKnop(); } };
      speelt = true;
      zetGains(); werkKnop(); lus();
    }
    function stopBronnen() { for (const s of bronnen) { try { s.onended = null; s.stop(); } catch {} } bronnen = []; }
    function pauze() { startPos = positie(); stopBronnen(); speelt = false; werkKnop(); }
    function werkKnop() {
      const k = el.querySelector("[data-speel]");
      k.classList.toggle("speelt", speelt);
      k.setAttribute("aria-label", speelt ? "Pauzeer" : "Speel");
    }
    function lus() {
      cancelAnimationFrame(raf);
      const p = positie();
      el.querySelector(".sp-tijd").textContent = `${tijd(p)} / ${tijd(duur)}`;
      el.querySelector(".ring").style.strokeDashoffset = 125.7 * (1 - p / duur);
      for (const st of el.querySelectorAll(".sp-streep")) st.style.left = `${(100 * p) / duur}%`;
      if (speelt) raf = requestAnimationFrame(lus);
    }

    el.querySelector("[data-speel]").addEventListener("click", () => { ctx.resume(); if (speelt) pauze(); else start(startPos >= duur - 0.05 ? 0 : startPos); });
    el.querySelectorAll("[data-stil]").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.stil; stil.has(k) ? stil.delete(k) : stil.add(k);
      b.setAttribute("aria-pressed", stil.has(k)); zetGains();
    }));
    el.querySelectorAll("[data-alleen]").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.alleen; alleen.has(k) ? alleen.delete(k) : alleen.add(k);
      b.setAttribute("aria-pressed", alleen.has(k)); zetGains();
    }));
    el.querySelector("[data-orig]").addEventListener("click", (e) => {
      toonOrig = !toonOrig; e.currentTarget.setAttribute("aria-pressed", toonOrig); zetGains();
    });
    el.querySelectorAll(".sp-tijdlijn").forEach((d) => d.addEventListener("click", (e) => {
      const r = d.getBoundingClientRect(), p = ((e.clientX - r.left) / r.width) * duur;
      ctx.resume();
      if (speelt) start(p); else { startPos = p; lus(); }
    }));
    el.querySelector('input[type="file"]').addEventListener("change", (e) => {
      invoer.files = e.target.files; invoer.dispatchEvent(new Event("change"));
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    lus();
    return { stop: () => { stopBronnen(); speelt = false; cancelAnimationFrame(raf); removeEventListener("resize", opResize); } };
  }

  opruimen = () => { mixer?.stop(); werker?.terminate(); ctx?.close(); };
}

function tekenOverzicht(doek, bron, van, lengte) {
  const dpr = Math.min(2, devicePixelRatio || 1), r = doek.getBoundingClientRect();
  doek.width = Math.max(100, r.width * dpr); doek.height = Math.max(40, r.height * dpr);
  const c = doek.getContext("2d"), W = doek.width, H = doek.height, L = bron.links, per = Math.max(1, Math.floor(L.length / W));
  c.clearRect(0, 0, W, H);
  c.fillStyle = "#A1FFCB";
  c.fillRect((van / bron.duur) * W, 0, (lengte / bron.duur) * W, H);
  c.fillStyle = "#232323";
  for (let x = 0; x < W; x++) {
    let m = 0;
    for (let i = x * per, e = Math.min(L.length, i + per); i < e; i += 8) m = Math.max(m, Math.abs(L[i]));
    const h = Math.max(1, m * H * 0.9);
    c.fillRect(x, (H - h) / 2, 1, h);
  }
}
