// Eén speler voor de hele site.
// Het geluid speelt via een gewoon audio-element (zonder Web Audio): dat start op een iPhone het betrouwbaarst,
// ook als het geluid van xeno-canto een keer zonder CORS-header binnenkomt.
// Het spectrogram rekenen we los daarvan uit: bestand ophalen, decoderen op 22 kHz (dus tot 11 kHz),
// een FFT per 11,6 ms. Lukt dat niet, dan speelt het geluid gewoon door, zonder spectrogram.

const audio = new Audio();
audio.preload = "none";
audio.setAttribute("playsinline", "");

let huidig = null; // { id, soort, opname, type, reserves }
let frame = 0;
const doeken = new Set();
const luisteraars = new Set();

/* ---------- Spectrogram ---------- */

const RATE = 22050, N = 512, HOP = 256, BINS = 256; // 43 Hz per bin, 11,6 ms per kolom
const VENSTER_S = 6; // zoveel seconden zie je tegelijk
const spectra = new Map(); // id -> { status, beeld (canvas), kolommen, hop }

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const hoek = (-2 * Math.PI) / len, wr = Math.cos(hoek), wi = Math.sin(hoek);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

function inktRgb() {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--inkt").trim() || "#1F1B16";
  const h = v.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

async function maakSpectrum(opname) {
  const id = opname.id;
  if (spectra.has(id)) return spectra.get(id);
  const s = { status: "laden" };
  spectra.set(id, s);
  try {
    const r = await fetch(opname.bestand, { mode: "cors", referrerPolicy: "no-referrer" });
    if (!r.ok) throw new Error(r.status);
    const buf = await r.arrayBuffer();
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const data = await new Promise((ok, fout) => {
      const p = new OAC(1, RATE, RATE).decodeAudioData(buf, ok, fout);
      if (p && p.then) p.then(ok, fout);
    });
    const kanaal = data.getChannelData(0);
    let hop = HOP;
    while (kanaal.length / hop > 15000) hop *= 2; // maximale breedte van een canvas
    const n = Math.max(1, Math.floor((kanaal.length - N) / hop));
    const db = new Float32Array(n * BINS);
    const hann = new Float32Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
    const re = new Float32Array(N), im = new Float32Array(N);
    for (let c = 0; c < n; c++) {
      const o = c * hop;
      for (let i = 0; i < N; i++) { re[i] = (kanaal[o + i] || 0) * hann[i]; im[i] = 0; }
      fft(re, im);
      for (let b = 0; b < BINS; b++) db[c * BINS + b] = 10 * Math.log10(re[b] * re[b] + im[b] * im[b] + 1e-12);
      if (c % 800 === 799) await new Promise((t) => setTimeout(t)); // de pagina blijft soepel
    }
    // normaliseren op de opname zelf: de luidste 0,5% is zwart, 55 dB eronder is papier
    const steek = Array.from(db.filter((_, i) => i % 7 === 0)).sort((a, b) => a - b);
    const top = steek[Math.floor(steek.length * 0.995)] || 0;
    const [r0, g0, b0] = inktRgb();
    const beeld = document.createElement("canvas");
    beeld.width = n; beeld.height = BINS;
    const img = beeld.getContext("2d").createImageData(n, BINS);
    for (let c = 0; c < n; c++) {
      for (let b = 0; b < BINS; b++) {
        const v = Math.max(0, Math.min(1, (db[c * BINS + b] - (top - 55)) / 55));
        const a = Math.pow(v, 1.6);
        const p = ((BINS - 1 - b) * n + c) * 4;
        img.data[p] = r0; img.data[p + 1] = g0; img.data[p + 2] = b0; img.data[p + 3] = Math.round(a * 255);
      }
    }
    beeld.getContext("2d").putImageData(img, 0, 0);
    Object.assign(s, { status: "klaar", beeld, kolommen: n, hop: hop / RATE });
  } catch (e) {
    console.warn("spectrogram niet beschikbaar", e);
    s.status = "geen";
  }
  return s;
}

// Tekent per frame het venster van de laatste seconden, met de nieuwste kolom rechts.
function teken() {
  const s = huidig && spectra.get(huidig.opname.id);
  for (const doek of doeken) {
    const c = doek.getContext("2d");
    c.clearRect(0, 0, doek.width, doek.height);
    if (!s || s.status !== "klaar" || !audio.currentTime) continue;
    const nu = audio.currentTime / s.hop;
    const breed = VENSTER_S / s.hop;
    const van = nu - breed;
    const bronX = Math.max(0, van), bronB = Math.min(nu, s.kolommen) - bronX;
    if (bronB <= 0) continue;
    const doelX = ((bronX - van) / breed) * doek.width;
    c.imageSmoothingEnabled = true;
    c.drawImage(s.beeld, bronX, 0, bronB, s.beeld.height, doelX, 0, (bronB / breed) * doek.width, doek.height);
  }
  if (!audio.paused && ++frame % 8 === 0) meldVoortgang();
  requestAnimationFrame(teken);
}
requestAnimationFrame(teken);

export function koppelDoek(doek) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const rect = doek.getBoundingClientRect();
  doek.width = Math.max(100, Math.round(rect.width * dpr));
  doek.height = Math.max(20, Math.round(rect.height * dpr));
  doeken.add(doek);
}
export function ontkoppelDoek(doek) { doeken.delete(doek); }

/* ---------- Afspelen ---------- */

export function opVerandering(fn) { luisteraars.add(fn); return () => luisteraars.delete(fn); }
let fout = null, laadt = false, waakhond = null;
function meldVoortgang() {
  const deel = audio.duration ? audio.currentTime / audio.duration : 0;
  const spectro = huidig ? (spectra.get(huidig.opname.id)?.status || "laden") : null;
  for (const fn of luisteraars) fn({ huidig, speelt: !audio.paused, deel, fout, laadt, spectro });
}
for (const ev of ["play", "pause", "ended", "timeupdate", "emptied"]) audio.addEventListener(ev, meldVoortgang);
audio.addEventListener("playing", () => { laadt = false; fout = null; clearTimeout(waakhond); meldVoortgang(); });
audio.addEventListener("error", () => volgende("Deze opname laadt niet."));

export function isHuidig(id) { return huidig && huidig.id === id; }
export function speelt() { return !audio.paused; }

// Lukt een opname niet, probeer dan de reserve van dezelfde soort en hetzelfde type.
function volgende(reden) {
  clearTimeout(waakhond);
  if (!huidig) return;
  const o = huidig.reserves.shift();
  if (o) {
    huidig.opname = o; huidig.id = `${huidig.soort.slug}:${o.id}`;
    audio.src = o.bestand;
    start();
    maakSpectrum(o).then(meldVoortgang);
    return;
  }
  laadt = false;
  fout = `${reden} Probeer het later opnieuw of kies een andere soort.`;
  meldVoortgang();
}

function start() {
  laadt = true; fout = null;
  meldVoortgang();
  const p = audio.play();
  if (p) p.catch((e) => { if (e.name !== "AbortError") volgende(e.name === "NotAllowedError" ? "Je browser blokkeerde het geluid." : "Deze opname speelt niet af."); });
  clearTimeout(waakhond);
  waakhond = setTimeout(() => { if (laadt) volgende("Deze opname laadt te traag."); }, 10000);
}

// Synchroon in de tik van de gebruiker: iOS staat geluid alleen toe als het direct uit een tik volgt.
// soort: object uit soorten.json (met key), type: "zang" of "roep"
export function speel(soort, type) {
  const t = soort[type] ? type : (soort.zang ? "zang" : "roep");
  const opname = soort[t];
  if (!opname) return;
  if (huidig && huidig.soort.key === soort.key && huidig.type === t) {
    if (audio.paused) start(); else audio.pause();
    return;
  }
  huidig = { id: `${soort.slug}:${opname.id}`, soort, opname, type: t, reserves: [...(soort[`${t}_reserve`] || [])] };
  audio.src = opname.bestand;
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: soort.nl, artist: `${t === "zang" ? "Zang" : "Roep"} · opname ${opname.opnemer}`, album: "xeno-canto",
      artwork: soort.plaat ? [{ src: soort.plaat.klein, sizes: "480x600", type: "image/webp" }] : [],
    });
  }
  start();
  maakSpectrum(opname).then(meldVoortgang);
}

export function stop() {
  clearTimeout(waakhond);
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  huidig = null; fout = null; laadt = false;
  meldVoortgang();
}

export function huidigeOpname() { return huidig; }
