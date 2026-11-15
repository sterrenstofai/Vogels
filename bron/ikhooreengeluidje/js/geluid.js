// Eén speler voor de hele site.
// Het geluid speelt via een gewoon audio-element: dat start op een iPhone het betrouwbaarst.
// Het spectrogram rekenen we los daarvan uit: bestand ophalen, decoderen op 22 kHz (dus tot 11 kHz),
// een FFT per 11,6 ms. Lukt dat niet, dan speelt het geluid gewoon door, zonder spectrogram.
// Previews van iTunes worden alleen gestreamd, nooit bewaard.

const audio = new Audio();
audio.preload = "none";
audio.setAttribute("playsinline", "");

let huidig = null; // { id, titel, artiest, url, hoes }
let frame = 0;
const doeken = new Map(); // canvas -> { modus: "venster" | "heel" }
const luisteraars = new Set();

/* ---------- Spectrogram ---------- */

const RATE = 22050, N = 1024, HOP = 256, BINS = 512; // 21,5 Hz per bin, 11,6 ms per kolom
const VENSTER_S = 8;
const spectra = new Map(); // id -> { status, beeld, kolommen, hop }

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

// Frequentie-as: logaritmisch, zodat bas en zang allebei zichtbaar zijn (40 Hz tot 11 kHz).
export const F_LAAG = 40, F_HOOG = 11000;
export const yVoorHz = (hz, h) => h - (Math.log(hz / F_LAAG) / Math.log(F_HOOG / F_LAAG)) * h;

async function decodeer(buf) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  return new Promise((ok, fout) => {
    const p = new OAC(1, RATE, RATE).decodeAudioData(buf, ok, fout);
    if (p && p.then) p.then(ok, fout);
  });
}

export async function maakSpectrum(id, bron) {
  if (spectra.has(id)) return spectra.get(id);
  const s = { status: "laden" };
  spectra.set(id, s);
  try {
    let buf;
    if (bron instanceof ArrayBuffer) buf = bron;
    else {
      const r = await fetch(bron, { mode: "cors", referrerPolicy: "no-referrer", cache: "no-store" });
      if (!r.ok) throw new Error(r.status);
      buf = await r.arrayBuffer();
    }
    const data = await decodeer(buf);
    const kanaal = data.getChannelData(0);
    let hop = HOP;
    while (kanaal.length / hop > 16000) hop *= 2; // maximale breedte van een canvas
    const n = Math.max(1, Math.floor((kanaal.length - N) / hop));
    const H = 256; // hoogte van het beeld; elke rij is een logaritmische band
    const rijBin = new Int32Array(H).map((_, y) => {
      const hz = F_LAAG * Math.pow(F_HOOG / F_LAAG, (H - 1 - y) / (H - 1));
      return Math.min(BINS - 1, Math.round(hz / (RATE / N)));
    });
    const db = new Float32Array(n * H);
    const hann = new Float32Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
    const re = new Float32Array(N), im = new Float32Array(N);
    for (let c = 0; c < n; c++) {
      const o = c * hop;
      for (let i = 0; i < N; i++) { re[i] = (kanaal[o + i] || 0) * hann[i]; im[i] = 0; }
      fft(re, im);
      for (let y = 0; y < H; y++) { const b = rijBin[y]; db[c * H + y] = 10 * Math.log10(re[b] * re[b] + im[b] * im[b] + 1e-12); }
      if (c % 600 === 599) await new Promise((t) => setTimeout(t));
    }
    const steek = Array.from(db.filter((_, i) => i % 7 === 0)).sort((a, b) => a - b);
    const top = steek[Math.floor(steek.length * 0.995)] || 0;
    const beeld = document.createElement("canvas");
    beeld.width = n; beeld.height = H;
    const img = beeld.getContext("2d").createImageData(n, H);
    for (let c = 0; c < n; c++) {
      for (let y = 0; y < H; y++) {
        const v = Math.max(0, Math.min(1, (db[c * H + y] - (top - 48)) / 48));
        const p = (y * n + c) * 4;
        img.data[p] = 35; img.data[p + 1] = 35; img.data[p + 2] = 35; img.data[p + 3] = Math.round(Math.pow(v, 2.2) * 255);
      }
    }
    beeld.getContext("2d").putImageData(img, 0, 0);
    Object.assign(s, { status: "klaar", beeld, kolommen: n, hop: hop / RATE, duur: kanaal.length / RATE });
  } catch (e) {
    console.warn("spectrogram niet beschikbaar", e);
    s.status = "geen";
  }
  meldVoortgang();
  return s;
}

// "venster": de laatste seconden schuiven voorbij. "heel": het hele fragment, met een streep op de plek van nu.
function teken() {
  const s = huidig && spectra.get(huidig.id);
  for (const [doek, opt] of doeken) {
    const c = doek.getContext("2d");
    c.clearRect(0, 0, doek.width, doek.height);
    const eigen = opt.id ? spectra.get(opt.id) : s;
    if (!eigen || eigen.status !== "klaar") continue;
    const speeltDit = huidig && (!opt.id || opt.id === huidig.id);
    if (opt.modus === "heel") {
      c.drawImage(eigen.beeld, 0, 0, eigen.kolommen, eigen.beeld.height, 0, 0, doek.width, doek.height);
      if (speeltDit && audio.currentTime) {
        const x = (audio.currentTime / eigen.duur) * doek.width;
        c.fillStyle = "#A1FFCB"; c.fillRect(x - 2, 0, 4, doek.height);
      }
      continue;
    }
    if (!speeltDit || !audio.currentTime) continue;
    const nu = audio.currentTime / eigen.hop, breed = VENSTER_S / eigen.hop, van = nu - breed;
    const bronX = Math.max(0, van), bronB = Math.min(nu, eigen.kolommen) - bronX;
    if (bronB <= 0) continue;
    c.drawImage(eigen.beeld, bronX, 0, bronB, eigen.beeld.height, ((bronX - van) / breed) * doek.width, 0, (bronB / breed) * doek.width, doek.height);
  }
  if (!audio.paused && ++frame % 8 === 0) meldVoortgang();
  requestAnimationFrame(teken);
}
requestAnimationFrame(teken);

export function koppelDoek(doek, opt = {}) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const rect = doek.getBoundingClientRect();
  doek.width = Math.max(100, Math.round(rect.width * dpr));
  doek.height = Math.max(20, Math.round(rect.height * dpr));
  doeken.set(doek, { modus: "venster", ...opt });
}
export function ontkoppelDoek(doek) { doeken.delete(doek); }
export function spectrum(id) { return spectra.get(id); }

/* ---------- Afspelen ---------- */

export function opVerandering(fn) { luisteraars.add(fn); return () => luisteraars.delete(fn); }
let fout = null, laadt = false, waakhond = null;
function meldVoortgang() {
  const deel = audio.duration ? audio.currentTime / audio.duration : 0;
  for (const fn of luisteraars) fn({ huidig, speelt: !audio.paused, deel, tijd: audio.currentTime, fout, laadt });
}
for (const ev of ["play", "pause", "ended", "timeupdate", "emptied"]) audio.addEventListener(ev, meldVoortgang);
audio.addEventListener("playing", () => { laadt = false; fout = null; clearTimeout(waakhond); meldVoortgang(); });
audio.addEventListener("error", () => mislukt("Dit fragment laadt niet."));

export function isHuidig(id) { return huidig && huidig.id === id; }
export function speelt() { return !audio.paused; }
export function huidigeId() { return huidig?.id; }

function mislukt(reden) {
  clearTimeout(waakhond);
  laadt = false;
  fout = `${reden} Probeer het later opnieuw.`;
  meldVoortgang();
}

function start() {
  laadt = true; fout = null;
  meldVoortgang();
  const p = audio.play();
  if (p) p.catch((e) => { if (e.name !== "AbortError") mislukt(e.name === "NotAllowedError" ? "Je browser blokkeerde het geluid." : "Dit fragment speelt niet af."); });
  clearTimeout(waakhond);
  waakhond = setTimeout(() => { if (laadt) mislukt("Dit fragment laadt te traag."); }, 12000);
}

// Synchroon in de tik van de gebruiker: iOS staat geluid alleen toe als het direct uit een tik volgt.
// item: { id, titel, artiest, url, hoes }. geheim: speler en vergrendelscherm tonen niets (voor een quiz).
export function speel(item, { geheim = false } = {}) {
  if (!item?.url) return;
  if (huidig && huidig.id === item.id) {
    if (audio.paused) start(); else audio.pause();
    return;
  }
  huidig = { ...item, geheim };
  audio.src = item.url;
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = geheim
      ? new MediaMetadata({ title: "Wat hoor ik?", artist: "ikhooreengeluidje" })
      : new MediaMetadata({ title: item.titel, artist: item.artiest, album: "Fragment van 30 seconden", artwork: item.hoes ? [{ src: item.hoes, sizes: "600x600", type: "image/jpeg" }] : [] });
  }
  start();
  if (!item.eigen) maakSpectrum(item.id, item.url);
}

export function spring(sec) {
  if (!huidig || !isFinite(sec)) return;
  if (audio.readyState >= 1) audio.currentTime = sec;
  else audio.addEventListener("loadedmetadata", () => { audio.currentTime = sec; }, { once: true });
}

export function stop() {
  clearTimeout(waakhond);
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  huidig = null; fout = null; laadt = false;
  meldVoortgang();
}
