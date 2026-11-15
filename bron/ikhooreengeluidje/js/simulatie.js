// Spoorweergave als simulatie, zoals de simulatiekaart bij Voggels.
// Echt: welke instrumenten erin zitten (credits, apparaten, bezetting).
// Verzonnen: hoe de blokjes staan. Elk instrument krijgt een patroon dat past bij hoe zo'n instrument
// meestal speelt (bas laag op de tel, zang in zinnetjes, strijkers lang aangehouden), niet het echte patroon.
// Afspelen gaat met klanken die de browser zelf maakt (Web Audio), niet met opnames.

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const MATEN = 4, STAPPEN = MATEN * 16; // vier maten van zestien zestienden

// Rol per instrument: hoe het patroon eruitziet, welk toonbereik (MIDI-noten) en welke klank.
const ROL = {
  zang: { soort: "melodie", laag: 55, hoog: 79, klank: "zang" },
  rap: { soort: "rap", laag: 50, hoog: 62, klank: "zang" },
  achtergrondzang: { soort: "koor", laag: 55, hoog: 76, klank: "zang" },
  drumstel: { soort: "drums" }, drumcomputer: { soort: "drums", machine: true }, "kleine-trom": { soort: "trom" },
  slagwerk: { soort: "perc" }, tamboerijn: { soort: "perc" }, congas: { soort: "perc" }, pauken: { soort: "pauk", laag: 38, hoog: 55, klank: "pauk" },
  handgeklap: { soort: "klap" }, vingerknippen: { soort: "klap" },
  basgitaar: { soort: "bas", laag: 28, hoog: 52, klank: "bas" }, contrabas: { soort: "lang", laag: 28, hoog: 55, klank: "strijk" },
  gitaar: { soort: "akkoord-tik", laag: 45, hoog: 76, klank: "tokkel" }, "elektrische-gitaar": { soort: "akkoord-tik", laag: 45, hoog: 76, klank: "tokkel" },
  "akoestische-gitaar": { soort: "akkoord-tik", laag: 45, hoog: 76, klank: "tokkel" },
  piano: { soort: "akkoord", laag: 48, hoog: 84, klank: "toets" }, rhodes: { soort: "akkoord", laag: 48, hoog: 79, klank: "toets" },
  "elektrische-piano": { soort: "akkoord", laag: 48, hoog: 79, klank: "toets" }, keyboard: { soort: "akkoord", laag: 48, hoog: 84, klank: "synth" },
  orgel: { soort: "lang", laag: 48, hoog: 79, klank: "orgel" }, clavinet: { soort: "riff", laag: 48, hoog: 72, klank: "tokkel" },
  synthesizer: { soort: "lang", laag: 45, hoog: 84, klank: "synth" }, sampler: { soort: "riff", laag: 48, hoog: 76, klank: "synth" },
  vocoder: { soort: "melodie", laag: 50, hoog: 74, klank: "synth" }, talkbox: { soort: "melodie", laag: 50, hoog: 74, klank: "synth" },
  draaitafel: { soort: "scratch", laag: 50, hoog: 70, klank: "synth" },
  viool: { soort: "lang", laag: 60, hoog: 93, klank: "strijk" }, altviool: { soort: "lang", laag: 52, hoog: 81, klank: "strijk" },
  cello: { soort: "lang", laag: 36, hoog: 67, klank: "strijk" }, strijkers: { soort: "lang", laag: 48, hoog: 88, klank: "strijk" },
  harp: { soort: "arpeggio", laag: 48, hoog: 91, klank: "tokkel" }, celesta: { soort: "arpeggio", laag: 72, hoog: 96, klank: "toets" },
  trompet: { soort: "stoot", laag: 58, hoog: 82, klank: "blaas" }, trombone: { soort: "stoot", laag: 40, hoog: 67, klank: "blaas" },
  saxofoon: { soort: "stoot", laag: 49, hoog: 77, klank: "blaas" }, altsaxofoon: { soort: "stoot", laag: 49, hoog: 77, klank: "blaas" },
  tenorsaxofoon: { soort: "stoot", laag: 44, hoog: 72, klank: "blaas" }, baritonsaxofoon: { soort: "stoot", laag: 36, hoog: 64, klank: "blaas" },
  blazers: { soort: "stoot", laag: 48, hoog: 79, klank: "blaas" }, hoorn: { soort: "lang", laag: 41, hoog: 72, klank: "blaas" },
  dwarsfluit: { soort: "melodie", laag: 60, hoog: 93, klank: "fluit" }, klarinet: { soort: "melodie", laag: 52, hoog: 84, klank: "fluit" },
  hobo: { soort: "melodie", laag: 58, hoog: 88, klank: "fluit" }, fagot: { soort: "melodie", laag: 34, hoog: 67, klank: "blaas" },
};
// Apparaten met de hand nagekeken: welke rol ze krijgen
const APPARAAT_ROL = (naam, soort) => (/drum/i.test(soort) ? "drumcomputer" : /synth/i.test(soort) ? "synthesizer" : /toets/i.test(soort) ? "clavinet" : "synthesizer");
// Nummers met een rechte basdrum op elke tel (disco, house)
const VIER_OP_DE_VLOER = new Set(["i-feel-love", "one-more-time", "harder-better-faster-stronger", "hung-up", "blue-monday", "good-times", "rappers-delight"]);

// Een vaste toevalsgenerator per nummer, zodat hetzelfde nummer steeds hetzelfde patroon krijgt
function toeval(zaad) {
  let h = 2166136261;
  for (const c of zaad) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
}

// Akkoorden: vier maten I – V – vi – IV in een toonsoort die per nummer anders is (verzonnen)
function akkoorden(r) {
  const grond = Math.floor(r() * 12);
  return [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]].map((a) => a.map((x) => x + grond));
}
const inBereik = (noot, laag, hoog) => { let n = noot; while (n < laag) n += 12; while (n > hoog) n -= 12; return n; };

function patroon(rol, akk, r, vier) {
  const n = []; // { start, duur, toon, rij } — rij is voor drums (0 hihat, 1 snare, 2 kick)
  const midden = (rol.laag + rol.hoog) / 2;
  for (let m = 0; m < MATEN; m++) {
    const o = m * 16, a = akk[m], tonen = a.map((x) => inBereik(x + 60, rol.laag ?? 48, rol.hoog ?? 84));
    switch (rol.soort) {
      case "drums":
        for (let s = 0; s < 16; s += 2) n.push({ start: o + s, duur: 1, rij: 0 });
        for (const s of [4, 12]) n.push({ start: o + s, duur: 1, rij: 1 });
        for (const s of vier ? [0, 4, 8, 12] : [0, 8, m % 2 ? 10 : 6]) n.push({ start: o + s, duur: 1, rij: 2 });
        break;
      case "trom":
        for (let s = 0; s < 16; s += 2) n.push({ start: o + s, duur: 1, rij: 1 });
        break;
      case "perc":
        for (let s = 0; s < 16; s++) if (s % 2 || r() < 0.4) n.push({ start: o + s, duur: 1, rij: 0 });
        break;
      case "klap":
        for (const s of [4, 12]) n.push({ start: o + s, duur: 1, rij: 1 });
        break;
      case "pauk":
        if (m === MATEN - 1) for (let s = 8; s < 16; s++) n.push({ start: o + s, duur: 1, toon: inBereik(a[0] + 36, rol.laag, rol.hoog) });
        break;
      case "bas": {
        const g = inBereik(a[0] + 36, rol.laag, rol.hoog);
        for (let s = 0; s < 16; s += 2) n.push({ start: o + s, duur: 2, toon: s === 6 || s === 14 ? g + 7 : g });
        break;
      }
      case "akkoord":
        for (const s of [0, 8]) for (const t of tonen) n.push({ start: o + s, duur: 7, toon: t });
        break;
      case "akkoord-tik":
        for (const s of [2, 6, 10, 14]) for (const t of tonen) n.push({ start: o + s, duur: 1, toon: t });
        break;
      case "riff":
        for (let s = 0; s < 16; s += 2) if (r() < 0.7) n.push({ start: o + s, duur: 1, toon: tonen[Math.floor(r() * 3)] + (r() < 0.3 ? 12 : 0) });
        break;
      case "lang":
        for (const t of tonen.slice(0, rol.laag < 45 ? 1 : 3)) n.push({ start: o, duur: 16, toon: t });
        break;
      case "arpeggio":
        for (let s = 0; s < 16; s += 2) n.push({ start: o + s, duur: 2, toon: tonen[(s / 2) % 3] + (s >= 8 ? 12 : 0) });
        break;
      case "stoot":
        if (m % 2) for (const s of [6, 10]) for (const t of tonen.slice(1)) n.push({ start: o + s, duur: 2, toon: t });
        break;
      case "koor":
        if (m >= 2) for (const t of tonen.slice(1)) n.push({ start: o, duur: 14, toon: t });
        break;
      case "rap":
        for (let s = 0; s < 15; s++) if (r() < 0.75) n.push({ start: o + s, duur: 1, toon: Math.round(midden + (r() - 0.5) * 4) });
        break;
      case "scratch":
        if (m % 2) for (let s = 8; s < 16; s++) if (r() < 0.6) n.push({ start: o + s, duur: 1, toon: Math.round(midden + (r() - 0.5) * 10) });
        break;
      case "melodie": {
        // een zinnetje: stapjes op en neer langs de akkoordtonen, met een adempauze aan het eind van de maat
        let t = tonen[Math.floor(r() * 3)], s = m % 2 ? 2 : 0;
        while (s < 13) {
          const d = r() < 0.5 ? 2 : r() < 0.5 ? 1 : 4;
          n.push({ start: o + s, duur: Math.min(d, 14 - s), toon: t });
          t = inBereik(t + [-2, -1, 2, 3, -3, 0][Math.floor(r() * 6)], rol.laag, rol.hoog);
          s += d;
        }
        break;
      }
    }
  }
  return n;
}

/* ---------- Banen samenstellen ---------- */

export function banen(nummer, instrumenten) {
  const perKey = Object.fromEntries(instrumenten.map((i) => [i.key, i]));
  const uit = [];
  for (const a of nummer.apparaten || []) uit.push({ key: APPARAAT_ROL(a.naam, a.soort), naam: a.naam, apparaat: true, wie: [] });
  for (const c of nummer.credits || []) {
    if (!ROL[c.key]) continue;
    // het nagekeken apparaat staat er al (bijvoorbeeld de CR-78 als drumcomputer): geen tweede baan
    if (uit.some((b) => b.apparaat && b.key === c.key)) continue;
    const i = perKey[c.key];
    const nl = i ? i.nl : c.nl;
    uit.push({ key: c.key, naam: nl.charAt(0).toUpperCase() + nl.slice(1), wie: c.wie.map((w) => w.naam) });
  }
  return uit.slice(0, 14);
}

/* ---------- Tekenen en afspelen ---------- */

export function simulatie(el, nummer, instrumenten, tempo) {
  const lijst = banen(nummer, instrumenten);
  if (!lijst.length) {
    el.innerHTML = nummer.mbFout
      ? `<div class="leeg-blok"><p class="leeg-kop">MusicBrainz geeft nu geen antwoord</p><p>Daarom weten we niet welke instrumenten erin zitten. Probeer het over een minuut opnieuw.</p></div>`
      : `<div class="leeg-blok"><p class="leeg-kop">Nog geen instrumenten bekend</p><p>Voor dit nummer ${nummer.gevonden ? "weet MusicBrainz" : "weten MusicBrainz en Discogs"} nog niet welke instrumenten erin zitten. Zonder die lijst laten we liever niets zien dan iets te verzinnen.</p></div>`;
    return () => {};
  }
  const r = toeval(nummer.slug), akk = akkoorden(r), vier = VIER_OP_DE_VLOER.has(nummer.slug);
  const bpm = tempo?.bpm || 110;
  for (const b of lijst) { b.rol = ROL[b.key]; b.noten = patroon(b.rol, akk, toeval(nummer.slug + b.key + b.naam), vier); }
  const stil = new Set(), alleen = new Set();

  el.innerHTML = `
    <div class="sim-kop">
      <p class="label">simulatie</p>
      <p class="sim-uitleg">Welke instrumenten erin zitten, is echt: ${nummer.gevonden ? "uit de credits in MusicBrainz, niet door ons nagekeken" : "uit de credits en onze eigen controle"}. Hoe de blokjes staan, is nagemaakt: zo speelt zo'n instrument meestal, niet precies in dit nummer. Hoog in een baan is een hoge noot, een lang blokje een lange noot.</p>
    </div>
    <div class="sim-bediening">
      <button class="knop-rond knop-groot" type="button" data-sim-speel aria-label="Speel de simulatie">${'<svg viewBox="0 0 44 44" aria-hidden="true"><circle class="ring-bg" cx="22" cy="22" r="20"/><circle class="ring" cx="22" cy="22" r="20"/><path class="ico-pauze" d="M17 15v14M27 15v14"/><path class="ico-speel" d="M18 14l12 8-12 8z"/></svg>'}</button>
      <span class="sim-tempo mono">${bpm} tellen per minuut${tempo ? ` (${esc(tempo.bron)})` : " (tempo onbekend)"}</span>
    </div>
    ${nummer.opbouw?.length ? `<div class="sim-opbouw">
      <p class="etiket">Opbouw, met de hand nagekeken</p>
      <div class="sim-stappen" role="group" aria-label="Kies een stap in het nummer">${nummer.opbouw.map((st, k) => `<button type="button" class="sim-stap" data-stap="${k}" aria-pressed="false"><span class="sim-stap-nr">${k + 1}</span><span><strong>${esc(st.wanneer)}</strong>${esc(st.tekst)}</span></button>`).join("")}
        <button type="button" class="sim-stap" data-stap="alles" aria-pressed="true"><span class="sim-stap-nr">⋯</span><span><strong>Alles samen</strong>Alle instrumenten die erin zitten.</span></button></div>
      <p class="sim-stap-bron zacht"></p>
    </div>` : ""}
    <div class="sim-banen">${lijst.map((b, i) => `
      <div class="sim-baan${b.apparaat ? " sim-apparaat" : ""}" data-baan="${i}">
        <div class="sim-baan-kop"><strong>${esc(b.naam)}</strong>${b.wie.length ? `<span class="zacht">${esc(b.wie.slice(0, 3).join(", "))}${b.wie.length > 3 ? " e.a." : ""}</span>` : b.apparaat ? `<span class="zacht">met de hand nagekeken</span>` : ""}</div>
        <div class="sim-baan-knoppen"><button type="button" class="sp-knop" data-sim-stil="${i}" aria-pressed="false" aria-label="${esc(b.naam)} stilzetten">Stil</button><button type="button" class="sp-knop" data-sim-alleen="${i}" aria-pressed="false" aria-label="Alleen ${esc(b.naam)}">Alleen</button></div>
        <canvas class="sim-rol" data-rol="${i}" aria-hidden="true"></canvas>
      </div>`).join("")}
    </div>
    <p class="noot zacht">De klanken zijn nagemaakt door je browser, het zijn geen opnames. Vier maten, die steeds opnieuw spelen.</p>`;

  let stap = -1;
  const teken = () => {
    for (const [i, b] of lijst.entries()) {
      const doek = el.querySelector(`[data-rol="${i}"]`);
      const dpr = Math.min(2, devicePixelRatio || 1), rect = doek.getBoundingClientRect();
      doek.width = Math.max(60, rect.width * dpr); doek.height = Math.max(20, rect.height * dpr);
      const c = doek.getContext("2d"), W = doek.width, H = doek.height, sw = W / STAPPEN;
      c.clearRect(0, 0, W, H);
      // maatstrepen en tellen
      for (let s = 0; s <= STAPPEN; s += 4) { c.fillStyle = s % 16 ? "rgba(35,35,35,.06)" : "rgba(35,35,35,.22)"; c.fillRect(Math.round(s * sw), 0, s % 16 ? 1 : 1.5 * dpr, H); }
      const drums = !b.rol.laag;
      const y = (n) => {
        if (drums) { const rij = n.rij ?? 1; return { y: (rij / 3) * H + H * 0.06, h: H / 3 - H * 0.12 }; }
        const v = (n.toon - b.rol.laag) / (b.rol.hoog - b.rol.laag), h = Math.max(4 * dpr, H / 11);
        return { y: (1 - v) * (H - h), h };
      };
      for (const n of b.noten) {
        const { y: ny, h } = y(n), actief = stap >= n.start && stap < n.start + n.duur;
        c.fillStyle = actief ? "#A1FFCB" : b.apparaat ? "#232323" : "rgba(35,35,35,.82)";
        const x = n.start * sw + 1, w = Math.max(2, n.duur * sw - 2);
        c.beginPath(); c.roundRect ? c.roundRect(x, ny, w, h, Math.min(3 * dpr, h / 2)) : c.rect(x, ny, w, h); c.fill();
        if (actief) { c.strokeStyle = "#232323"; c.lineWidth = dpr; c.stroke(); }
      }
      if (stap >= 0) { c.fillStyle = "#232323"; c.fillRect(Math.round((stap + 0.5) * sw), 0, dpr, H); }
    }
  };
  requestAnimationFrame(teken);
  addEventListener("resize", teken);

  /* klanken, door de browser gemaakt */
  let ctx = null, timer = 0, volgende = 0, s16 = 0;
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // stap in de opbouw: welke banen klinken er dan (null = alles)
  let inStap = null;
  const hoorbaar = (i) => (!inStap || inStap.has(i)) && (alleen.size ? alleen.has(i) : !stil.has(i));
  function ruis(duur) {
    const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duur), ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = b; return s;
  }
  function slag(rij, t, zacht = 1) {
    const v = ctx.createGain(); v.connect(ctx.destination);
    if (rij === 2) {
      const o = ctx.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.15);
      v.gain.setValueAtTime(0.8 * zacht, t); v.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(v); o.start(t); o.stop(t + 0.32);
    } else {
      const n = ruis(rij === 1 ? 0.2 : 0.06), f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = rij === 1 ? 1500 : 7000;
      v.gain.setValueAtTime((rij === 1 ? 0.45 : 0.18) * zacht, t); v.gain.exponentialRampToValueAtTime(0.001, t + (rij === 1 ? 0.16 : 0.05));
      n.connect(f); f.connect(v); n.start(t); n.stop(t + 0.2);
    }
  }
  const KLANK = { zang: ["triangle", 0.09, 0.02], bas: ["sawtooth", 0.12, 0.01], tokkel: ["square", 0.035, 0.005], toets: ["triangle", 0.07, 0.005],
    synth: ["sawtooth", 0.045, 0.03], orgel: ["square", 0.03, 0.02], strijk: ["sawtooth", 0.035, 0.12], blaas: ["sawtooth", 0.05, 0.04], fluit: ["sine", 0.1, 0.05], pauk: ["sine", 0.25, 0.005] };
  function noot(b, n, t, sec) {
    if (!b.rol.laag) return slag(n.rij ?? 1, t, b.rol.soort === "perc" ? 0.5 : 1);
    const [vorm, luid, aanzet] = KLANK[b.rol.klank] || KLANK.synth;
    const o = ctx.createOscillator(), v = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = vorm; o.frequency.value = hz(n.toon);
    f.type = "lowpass"; f.frequency.value = b.rol.klank === "bas" ? 900 : 3200;
    const duur = n.duur * sec, kort = ["tokkel", "toets", "pauk"].includes(b.rol.klank);
    v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(luid, t + aanzet);
    if (kort) v.gain.exponentialRampToValueAtTime(0.001, t + Math.min(duur + 0.3, 1.2));
    else { v.gain.setValueAtTime(luid, t + Math.max(aanzet, duur - 0.05)); v.gain.linearRampToValueAtTime(0, t + duur + 0.08); }
    o.connect(f); f.connect(v); v.connect(ctx.destination);
    o.start(t); o.stop(t + duur + 1.3);
  }
  function plan() {
    const sec = 60 / bpm / 4;
    while (volgende < ctx.currentTime + 0.12) {
      for (const [i, b] of lijst.entries()) if (hoorbaar(i)) for (const n of b.noten) if (n.start === s16) noot(b, n, volgende, sec);
      const s = s16;
      setTimeout(() => { stap = s; teken(); }, Math.max(0, (volgende - ctx.currentTime) * 1000));
      volgende += sec;
      s16 = (s16 + 1) % STAPPEN;
    }
  }
  const knop = el.querySelector("[data-sim-speel]");
  function stop() { clearInterval(timer); timer = 0; stap = -1; knop.classList.remove("speelt"); knop.setAttribute("aria-label", "Speel de simulatie"); teken(); }
  knop.addEventListener("click", () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); // in de tik: zo mag het op iOS
    ctx.resume();
    if (timer) return stop();
    s16 = 0; volgende = ctx.currentTime + 0.05;
    timer = setInterval(plan, 25); plan();
    knop.classList.add("speelt"); knop.setAttribute("aria-label", "Stop de simulatie");
  });
  const werkBanen = () => el.querySelectorAll(".sim-baan").forEach((d) => {
    const i = +d.dataset.baan;
    d.classList.toggle("uit", !hoorbaar(i));
    d.classList.toggle("niet-in-stap", !!inStap && !inStap.has(i));
  });
  el.querySelectorAll("[data-stap]").forEach((b) => b.addEventListener("click", () => {
    const k = b.dataset.stap;
    el.querySelectorAll("[data-stap]").forEach((x) => x.setAttribute("aria-pressed", x === b));
    const bron = el.querySelector(".sim-stap-bron");
    if (k === "alles") { inStap = null; bron.textContent = ""; }
    else {
      const st = nummer.opbouw[+k];
      // 'rest': vanaf hier speelt alles; anders alleen de genoemde instrumenten
      inStap = st.rest ? null : new Set(lijst.map((bn, i) => [bn, i]).filter(([bn]) => (st.banen || []).includes(bn.key)).map(([, i]) => i));
      bron.innerHTML = `Bron: <a href="${esc(st.bron)}" rel="noopener">${esc(new URL(st.bron).hostname.replace(/^en\./, ""))}</a>. De stappen zijn echt, de blokjes blijven nagemaakt.`;
    }
    werkBanen();
  }));
  el.querySelectorAll("[data-sim-stil]").forEach((b) => b.addEventListener("click", () => {
    const i = +b.dataset.simStil; stil.has(i) ? stil.delete(i) : stil.add(i); b.setAttribute("aria-pressed", stil.has(i)); werkBanen();
  }));
  el.querySelectorAll("[data-sim-alleen]").forEach((b) => b.addEventListener("click", () => {
    const i = +b.dataset.simAlleen; alleen.has(i) ? alleen.delete(i) : alleen.add(i); b.setAttribute("aria-pressed", alleen.has(i)); werkBanen();
  }));
  return () => { stop(); removeEventListener("resize", teken); ctx?.close(); };
}
