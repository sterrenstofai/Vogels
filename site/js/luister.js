// Luister mee: je telefoon luistert en BirdNET raadt welke vogel het is.
// Alles gebeurt in de browser. Het geluid gaat nergens heen; het model komt van onze eigen server.
// BirdNET: Kahl e.a., Cornell Lab of Ornithology en TU Chemnitz. Model CC BY-NC-SA 4.0.
import * as G from "./geluid.js";
import * as SP from "./gespot.js";
import { lidwoord } from "./config.js";

const MAP = "/birdnet/v2.4";
const RATE = 48000, VENSTER = 144000; // BirdNET kijkt naar 3 seconden op 48 kHz
const STAP_S = 1.5;                   // elke anderhalve seconde een nieuwe gok
const DREMPEL = 0.3;                  // lager dan dit noemen we niet
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const klein = (t) => (t.startsWith("IJ") ? "ij" + t.slice(2) : t.charAt(0).toLowerCase() + t.slice(1));

/* ---------- het model ---------- */

let modelKlus = null;
function laadScript(src) {
  return new Promise((ok, fout) => {
    if (window.tf?.setBackend) return ok();
    // TensorFlow.js zet bij het laden een globale regeneratorRuntime; bestaat die nog niet, dan valt hij terug op
    // Function(...), en dat verbiedt onze CSP. Met een lege plek vooraf lukt de gewone toewijzing.
    if (!("regeneratorRuntime" in window)) window.regeneratorRuntime = undefined;
    const s = document.createElement("script");
    s.src = src; s.onload = ok; s.onerror = () => fout(new Error("script"));
    document.head.append(s);
  });
}

// De spectrogramlaag van BirdNET, zoals in BirdNET-Analyzer (MIT): normaliseren, STFT, mel-schaal, compressie.
function registreerLaag(tf) {
  class MelSpecLayerSimple extends tf.layers.Layer {
    static className = "MelSpecLayerSimple";
    constructor(c) {
      super(c);
      this.frameLength = c.frameLength ?? c.frame_length;
      this.frameStep = c.frameStep ?? c.frame_step;
      this.specShape = c.specShape ?? c.spec_shape;
      this.mel = tf.tensor2d(c.melFilterbank ?? c.mel_filterbank);
    }
    build() {
      this.magScale = this.addWeight("magnitude_scaling", [], "float32", tf.initializers.constant({ value: 1.23 }));
      super.build();
    }
    computeOutputShape(s) { return [s[0], this.specShape[0], this.specShape[1], 1]; }
    call(inputs) {
      return tf.tidy(() => {
        const x = Array.isArray(inputs) ? inputs[0] : inputs;
        const n = x.shape[0];
        const uit = tf.split(x, n, 0).map((rij) => {
          let s = rij.squeeze([0]);
          s = s.sub(s.min()).div(s.max().sub(s.min()).add(1e-6)).sub(0.5).mul(2);
          let spec = tf.real(tf.signal.stft(s, this.frameLength, this.frameStep));
          spec = tf.matMul(spec, this.mel).pow(2);
          spec = spec.pow(tf.div(1, tf.add(1, tf.exp(this.magScale.read()))));
          spec = tf.reverse(spec, -1);
          return tf.transpose(spec).expandDims(-1);
        });
        return tf.stack(uit);
      });
    }
  }
  tf.serialization.registerClass(MelSpecLayerSimple);
}

async function laadModel(opVoortgang) {
  if (modelKlus) return modelKlus;
  modelKlus = (async () => {
    await laadScript("/vendor/tf.min.js");
    const tf = window.tf;
    try { await tf.setBackend("webgl"); } catch { await tf.setBackend("cpu"); }
    await tf.ready();
    registreerLaag(tf);
    const [model, nl, kop] = await Promise.all([
      tf.loadLayersModel(`${MAP}/model.json`, { onProgress: (f) => opVoortgang?.(f) }),
      fetch(`${MAP}/labels/nl.txt`).then((r) => r.text()),
      fetch("/data/birdnet.json").then((r) => r.json()),
    ]);
    tf.tidy(() => { model.predict(tf.zeros([1, VENSTER])); }); // opwarmen
    const namen = nl.split("\n").map((r) => r.split("_").slice(1).join("_").trim() || r.split("_")[0]);
    return { tf, model, namen, koppel: kop.soorten, geenVogel: new Set(kop.geen_vogel) };
  })();
  modelKlus.catch(() => (modelKlus = null));
  return modelKlus;
}

async function raad(m, pcm) {
  const { tf, model } = m;
  const uit = tf.tidy(() => model.predict(tf.tensor2d(pcm, [1, VENSTER])));
  const p = await uit.data();
  uit.dispose();
  return p;
}

// lineair naar 48 kHz, precies 3 seconden
function naar48k(bron, rate) {
  if (rate === RATE && bron.length === VENSTER) return bron;
  const uit = new Float32Array(VENSTER), f = rate / RATE;
  for (let i = 0; i < VENSTER; i++) {
    const x = i * f, j = Math.floor(x), t = x - j;
    uit[i] = (bron[j] || 0) * (1 - t) + (bron[j + 1] || 0) * t;
  }
  return uit;
}

/* ---------- het oor: microfoon, de laatste 3 seconden, en elke 1,5 s een gok ---------- */

export class Oor {
  // opStatus(code): "microfoon" | "geen-microfoon" | "laden" | "laadfout" | "luistert" | "gestopt"
  // opGok(kansen, model) na elke gok; pauze() true = deze ronde overslaan (bijvoorbeeld als er zelf geluid speelt)
  constructor({ opStatus, opVoortgang, opGok, pauze } = {}) {
    Object.assign(this, { opStatus, opVoortgang, opGok, pauze });
    this.actief = false;
    this.model = null;
  }

  // roep aan in de tik zelf: iOS zet geluid alleen aan vanuit een tik
  async start() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx.resume();
    this.actief = true;
    this.opStatus?.("microfoon");
    try {
      this.stroom = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch {
      this.stop(true);
      this.opStatus?.("geen-microfoon");
      return false;
    }
    if (!this.actief) return false;
    const ctx = this.ctx;
    this.bron = ctx.createMediaStreamSource(this.stroom);
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 1024; this.analyser.smoothingTimeConstant = 0;
    this.proc = ctx.createScriptProcessor(4096, 1, 1);
    this.ring = new Float32Array(Math.ceil(ctx.sampleRate * 3)); this.schrijf = 0; this.gevuld = 0;
    this.proc.onaudioprocess = (e) => {
      const d = e.inputBuffer.getChannelData(0), ring = this.ring;
      if (!ring || this.polt) return; // net gestopt, of we gebruiken de tweede route
      this.viaProc = true;
      for (let i = 0; i < d.length; i++) { ring[this.schrijf] = d[i]; this.schrijf = (this.schrijf + 1) % ring.length; }
      this.gevuld = Math.min(ring.length, this.gevuld + d.length);
    };
    const stil = ctx.createGain(); stil.gain.value = 0;
    this.bron.connect(this.analyser); this.bron.connect(this.proc); this.proc.connect(stil); stil.connect(ctx.destination);
    // iOS kan het geluid pauzeren zodra de microfoon aangaat: opnieuw aanzetten, en blijven aanzetten
    if (ctx.state !== "running") ctx.resume().catch(() => {});
    ctx.onstatechange = () => { if (this.actief && this.ctx && this.ctx.state !== "running") this.ctx.resume().catch(() => {}); };
    // tweede route: komt er via de processor niets binnen, dan halen we het geluid uit een analyser
    this.taps = ctx.createAnalyser(); this.taps.fftSize = 32768;
    this.bron.connect(this.taps);
    this.viaProc = false;
    this.vangst = setTimeout(() => { if (this.actief && !this.viaProc) this.pollen(); }, 2000);
    if (!this.model) {
      this.opStatus?.("laden");
      try { this.model = await laadModel((f) => this.opVoortgang?.(f)); }
      catch { this.stop(true); this.opStatus?.("laadfout"); return false; }
    }
    if (!this.actief) return false;
    this.opStatus?.("luistert");
    this.timer = setInterval(() => this.stap(), STAP_S * 1000);
    return true;
  }

  // elke 200 ms de nieuwste stukjes uit de analyser in de ring zetten
  pollen() {
    this.polt = true;
    const buf = new Float32Array(this.taps.fftSize);
    let vorige = this.ctx.currentTime;
    this.pollTimer = setInterval(() => {
      if (!this.actief || !this.ctx) return;
      const nu = this.ctx.currentTime, n = Math.min(buf.length, Math.round((nu - vorige) * this.ctx.sampleRate));
      vorige = nu;
      if (n <= 0) return;
      this.taps.getFloatTimeDomainData(buf);
      const ring = this.ring;
      for (let i = buf.length - n; i < buf.length; i++) { ring[this.schrijf] = buf[i]; this.schrijf = (this.schrijf + 1) % ring.length; }
      this.gevuld = Math.min(ring.length, this.gevuld + n);
    }, 200);
  }

  // hoe hard het nu is, van 0 tot 1 (voor een oor dat meebeweegt)
  niveau() {
    if (!this.analyser) return 0;
    const d = this.niveauBuf || (this.niveauBuf = new Float32Array(this.analyser.fftSize));
    this.analyser.getFloatTimeDomainData(d);
    let som = 0;
    for (let i = 0; i < d.length; i++) som += d[i] * d[i];
    return Math.min(1, Math.sqrt(som / d.length) * 8);
  }

  async stap() {
    if (this.bezig || !this.ring || this.gevuld < this.ring.length * 0.9 || this.pauze?.()) return;
    this.bezig = true;
    const r = this.ring, venster = new Float32Array(r.length);
    venster.set(r.subarray(this.schrijf)); venster.set(r.subarray(0, this.schrijf), r.length - this.schrijf);
    try {
      const p = await raad(this.model, naar48k(venster, this.ctx.sampleRate));
      if (this.actief) this.opGok?.(p, this.model);
    } catch (e) {
      console.warn("BirdNET", e);
      this.opStatus?.("fout", e);
    } finally { this.bezig = false; }
  }

  stop(stil = false) {
    this.actief = false;
    clearInterval(this.timer); clearInterval(this.pollTimer); clearTimeout(this.vangst);
    this.polt = false;
    this.stroom?.getTracks().forEach((t) => t.stop());
    try { this.proc?.disconnect(); this.bron?.disconnect(); this.analyser?.disconnect(); this.taps?.disconnect(); } catch {}
    this.ctx?.close().catch(() => {});
    this.ctx = this.stroom = this.bron = this.proc = this.analyser = this.taps = this.ring = null;
    if (!stil) this.opStatus?.("gestopt");
  }
}

/* ---------- de pagina ---------- */

let opruimen = null;
export function verlaat() { opruimen?.(); opruimen = null; }

export function luisterPagina(app, S) {
  verlaat();
  app.innerHTML = `
  <section class="breed blok luister">
    <p class="oz-boventitel">Luister mee</p>
    <h1 class="index-kop">Wie <em>zingt</em> daar?</h1>
    <p class="held-sub">Houd je telefoon richting het geluid. BirdNET luistert mee en raadt welke vogel het is. Dat gebeurt in je telefoon zelf: het geluid gaat nergens heen.</p>
    <div class="luister-midden">
      <button class="luister-knop" type="button" aria-pressed="false">
        <span class="luister-golf"></span><span class="luister-golf"></span>
        <svg class="ico-mic" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        <svg class="ico-stop" viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor"/></svg>
        <span class="sr luister-knop-tekst">Begin met luisteren</span>
      </button>
      <p class="luister-status" aria-live="polite">Tik om te beginnen. De eerste keer laadt BirdNET (49 MB, liefst op wifi).</p>
      <div class="luister-laad" hidden><i></i></div>
      <canvas class="luister-spectro" aria-hidden="true" hidden></canvas>
    </div>
    <ol class="luister-lijst" aria-label="Gehoorde vogels"></ol>
    <p class="luister-anders zacht" hidden></p>
    <div class="luister-bestand">
      <label class="knop-pil"><input type="file" accept="audio/*" hidden>Of open een opname</label>
    </div>
    <p class="zacht luister-noot">BirdNET is gemaakt door het Cornell Lab of Ornithology en de TU Chemnitz (model CC BY-NC-SA 4.0). Het noemt alleen vogels die in Twente gemeld zijn. Een gok blijft een gok: kijk en luister zelf mee voordat je hem bij Mijn vogels zet. <a href="/hoe-dit-werkt#luister">Hoe dit werkt</a></p>
  </section>`;

  const knop = app.querySelector(".luister-knop"), status = app.querySelector(".luister-status");
  const laadBalk = app.querySelector(".luister-laad"), lijst = app.querySelector(".luister-lijst");
  const anders = app.querySelector(".luister-anders"), doek = app.querySelector(".luister-spectro");
  const gezien = new Map(); // key -> { max, laatst, keer }
  let actief = false, frame = 0, model = null;

  const zetStatus = (t) => (status.textContent = t);

  function toonLijst(nu = new Set()) {
    const rijen = [...gezien.entries()].sort((a, b) => b[1].max - a[1].max);
    lijst.innerHTML = rijen.map(([k, r]) => {
      const s = { key: k, ...S[k] };
      const woord = r.max >= 0.7 ? "Zeker" : r.max >= 0.4 ? "Waarschijnlijk" : "Misschien";
      const t = s.zang ? "zang" : "roep";
      return `<li class="luister-rij${nu.has(k) ? " nu" : ""}">
        <a class="luister-plaat" href="/soort/${s.slug}" data-link>${s.plaat ? `<img src="${s.plaat.klein}" alt="" width="96" height="120">` : ""}</a>
        <div class="luister-tekst">
          <a class="luister-naam" href="/soort/${s.slug}" data-link>${esc(s.nl)}</a>
          <span class="luister-zeker"><i style="width:${Math.round(r.max * 100)}%"></i></span>
          <span class="luister-woord">${woord} · ${Math.round(r.max * 100)}%${r.keer > 1 ? ` · ${r.keer}× gehoord` : ""}</span>
        </div>
        <div class="luister-acties">
          ${s[t] ? `<button class="knop-rond knop-klein" type="button" data-speel="${k}" data-type="${t}" aria-label="Vergelijk met ${lidwoord(s.nl)} ${esc(klein(s.nl))}"><svg viewBox="0 0 44 44" aria-hidden="true"><circle class="ring-bg" cx="22" cy="22" r="20"/><circle class="ring" cx="22" cy="22" r="20"/><path class="ico-pauze" d="M17 15v14M27 15v14"/><path class="ico-speel" d="M18 14l12 8-12 8z"/></svg></button>` : ""}
          <button type="button" class="gespot gespot-klein${SP.aantalVan(k) ? " ja" : ""}" data-gespot="${k}" aria-label="Ik heb ${lidwoord(s.nl)} ${esc(klein(s.nl))} gespot"><span class="gespot-plus" aria-hidden="true">+</span>${SP.aantalVan(k) ? `<span class="gespot-n">${SP.aantalVan(k)}</span>` : ""}</button>
        </div>
      </li>`;
    }).join("");
  }

  function verwerk(p) {
    const { koppel, geenVogel, namen } = model;
    const nu = new Set();
    let besteVreemd = null, besteGeen = 0;
    for (let i = 0; i < p.length; i++) {
      if (p[i] < DREMPEL) continue;
      const k = koppel[i];
      if (k && S[k]) {
        nu.add(k);
        const r = gezien.get(k) || { max: 0, keer: 0 };
        r.max = Math.max(r.max, p[i]); r.keer++; r.laatst = Date.now();
        gezien.set(k, r);
      } else if (geenVogel.has(i)) besteGeen = Math.max(besteGeen, p[i]);
      else if (p[i] >= 0.5 && (!besteVreemd || p[i] > besteVreemd.p)) besteVreemd = { p: p[i], naam: namen[i] };
    }
    toonLijst(nu);
    if (besteVreemd) { anders.hidden = false; anders.textContent = `BirdNET denkt ook aan de ${klein(besteVreemd.naam)}, maar die is in Twente (bijna) nooit gemeld.`; }
    return { nu, besteGeen };
  }

  /* -- live meeluisteren -- */
  const balk = (f) => { laadBalk.hidden = false; laadBalk.firstElementChild.style.width = `${Math.round(f * 100)}%`; zetStatus(`BirdNET laden… ${Math.round(f * 49)} van 49 MB`); };
  const oor = new Oor({
    opVoortgang: balk,
    pauze: () => G.speelt(), // niet naar de eigen speaker luisteren
    opStatus: (code) => {
      laadBalk.hidden = code !== "laden";
      if (code === "microfoon") zetStatus("Mag Voggels de microfoon gebruiken?");
      else if (code === "laden") zetStatus("BirdNET laden…");
      else if (code === "luistert") { zetStatus("Ik luister…"); doek.hidden = false; tekenSpectro(); }
      else if (code === "geen-microfoon") { uit(); zetStatus("Zonder microfoon kan ik niet meeluisteren. Je kunt het toestaan in de instellingen van je browser, of hieronder een opname openen."); }
      else if (code === "laadfout") { uit(); zetStatus("BirdNET laadt niet. Probeer het later opnieuw, of op wifi."); }
      else if (code === "fout") zetStatus("Er ging iets mis bij het raden. Ik probeer het opnieuw…");
      else if (code === "gestopt") { uit(); zetStatus(gezien.size ? `Gestopt. ${gezien.size} ${gezien.size === 1 ? "soort" : "soorten"} gehoord.` : "Tik om opnieuw te luisteren."); }
    },
    opGok: (p, m) => {
      model = m;
      const { nu, besteGeen } = verwerk(p);
      zetStatus(nu.size ? `Ik hoor ${[...nu].map((k) => `${lidwoord(S[k].nl)} ${klein(S[k].nl)}`).join(" en ")}.` : besteGeen >= 0.5 ? "Ik hoor vooral mensen of lawaai." : "Ik luister… (nog geen vogel)");
    },
  });
  function uit() {
    actief = false;
    cancelAnimationFrame(frame);
    knop.setAttribute("aria-pressed", "false");
    knop.classList.remove("aan");
  }
  function start() {
    G.stop();
    actief = true;
    knop.setAttribute("aria-pressed", "true");
    knop.classList.add("aan");
    oor.start(); // in de tik
  }
  function stop() { oor.stop(); }

  // een scrollend spectrogram van wat de microfoon hoort
  function tekenSpectro() {
    const c = doek.getContext("2d"), dpr = Math.min(2, devicePixelRatio || 1);
    doek.width = Math.round(doek.clientWidth * dpr); doek.height = Math.round(doek.clientHeight * dpr);
    const analyser = oor.analyser;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const bins = Math.floor(data.length * (11000 / (oor.ctx.sampleRate / 2)));
    const stap = () => {
      if (!oor.analyser) return;
      analyser.getByteFrequencyData(data);
      c.drawImage(doek, -2, 0);
      c.clearRect(doek.width - 2, 0, 2, doek.height);
      for (let y = 0; y < doek.height; y++) {
        const v = data[Math.floor((1 - y / doek.height) * bins)] / 255;
        if (v < 0.25) continue;
        c.fillStyle = `rgba(35,35,35,${Math.pow((v - 0.25) / 0.75, 1.5).toFixed(3)})`;
        c.fillRect(doek.width - 2, y, 2, 1);
      }
      frame = requestAnimationFrame(stap);
    };
    stap();
  }

  /* -- een opname openen -- */
  async function bestand(f) {
    if (actief) stop();
    G.stop();
    gezien.clear(); toonLijst(); anders.hidden = true;
    zetStatus("Opname lezen…");
    try {
      const buf = await f.arrayBuffer();
      const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const data = await new Promise((ok, fout) => { const pr = new OAC(1, RATE, RATE).decodeAudioData(buf, ok, fout); if (pr?.then) pr.then(ok, fout); });
      const pcm = data.getChannelData(0);
      if (!model) {
        model = oor.model = await laadModel(balk);
        laadBalk.hidden = true;
      }
      const stap = Math.round(STAP_S * RATE), max = Math.min(pcm.length, RATE * 120);
      for (let o = 0; o + stap <= max; o += stap) {
        const venster = new Float32Array(VENSTER);
        venster.set(pcm.subarray(o, Math.min(o + VENSTER, pcm.length)));
        zetStatus(`Luisteren naar de opname… ${Math.round((100 * o) / max)}%`);
        verwerk(await raad(model, venster));
        if (o + VENSTER >= pcm.length) break;
      }
      toonLijst();
      zetStatus(gezien.size ? `Klaar. ${gezien.size} ${gezien.size === 1 ? "soort" : "soorten"} gevonden in de opname.` : "Klaar. Geen vogel uit Twente herkend.");
    } catch (e) {
      console.warn(e);
      laadBalk.hidden = true;
      zetStatus("Deze opname kan ik niet lezen. Probeer een mp3, m4a of wav.");
    }
  }

  knop.addEventListener("click", () => (actief ? stop() : start()));
  app.querySelector(".luister-bestand input").addEventListener("change", (e) => { const f = e.target.files[0]; if (f) bestand(f); e.target.value = ""; });
  const wegGespot = SP.opVerandering(() => toonLijst());
  opruimen = () => { if (actief) stop(); wegGespot(); };
}
