// Eén speler voor de hele site, met een live spectrogram in inkt op papier.
// Het geluid komt rechtstreeks van xeno-canto (CORS staat open); er speelt altijd maar één opname.

const audio = new Audio();
audio.crossOrigin = "anonymous";
audio.preload = "none";
audio.setAttribute("playsinline", "");

let ctx = null, analyser = null, bins = null;
let huidig = null; // { id, soort, opname }
let frame = 0;
const doeken = new Set();
const luisteraars = new Set();

function startContext() {
  if (ctx) return;
  // iOS: speel ook als de stilteschakelaar aan staat
  if (navigator.audioSession) try { navigator.audioSession.type = "playback"; } catch {}
  const AC = window.AudioContext || window.webkitAudioContext;
  ctx = new AC();
  const bron = ctx.createMediaElementSource(audio);
  analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.15;
  bron.connect(analyser);
  analyser.connect(ctx.destination);
  bins = new Uint8Array(analyser.frequencyBinCount);
}

function inktKleur() {
  const s = getComputedStyle(document.documentElement);
  return { inkt: s.getPropertyValue("--inkt").trim() || "#1F1B16", papier: s.getPropertyValue("--passe").trim() || "#E8DFCC" };
}

function hexNaarRgb(hex) {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

// Tekent elke frame één nieuwe kolom rechts en schuift de rest naar links.
function teken() {
  if (!audio.paused && analyser) {
    analyser.getByteFrequencyData(bins);
    const maxHz = 11000, hzPerBin = ctx.sampleRate / analyser.fftSize;
    const maxBin = Math.min(bins.length - 1, Math.floor(maxHz / hzPerBin));
    for (const doek of doeken) {
      const c = doek.getContext("2d");
      const { width: b, height: h } = doek;
      const stap = Math.max(1, Math.round(b / 420));
      // doorschuiven; het doek is doorzichtig, zodat het lijnenpapier eronder zichtbaar blijft
      c.globalCompositeOperation = "copy";
      c.drawImage(doek, -stap, 0);
      c.globalCompositeOperation = "source-over";
      const [r, g, bl] = doek._rgb;
      c.clearRect(b - stap, 0, stap, h);
      for (let py = 0; py < h; py++) {
        const bin = Math.floor((1 - py / h) * maxBin);
        const v = bins[bin] / 255;
        const a = Math.min(1, 1.15 * Math.pow(Math.max(0, v - 0.08) / 0.92, 1.25));
        if (a > 0.02) {
          c.fillStyle = `rgba(${r},${g},${bl},${a.toFixed(3)})`;
          c.fillRect(b - stap, py, stap, 1);
        }
      }
    }
    if (++frame % 8 === 0) meldVoortgang();
  }
  requestAnimationFrame(teken);
}
requestAnimationFrame(teken);

export function koppelDoek(doek) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const rect = doek.getBoundingClientRect();
  doek.width = Math.max(100, Math.round(rect.width * dpr));
  doek.height = Math.max(20, Math.round(rect.height * dpr));
  const { inkt, papier } = inktKleur();
  doek._rgb = hexNaarRgb(inkt);
  doek._papier = papier;
  doek.getContext("2d").clearRect(0, 0, doek.width, doek.height);
  doeken.add(doek);
}
export function ontkoppelDoek(doek) { doeken.delete(doek); }

export function opVerandering(fn) { luisteraars.add(fn); return () => luisteraars.delete(fn); }
let fout = null, laadt = false, waakhond = null;
function meldVoortgang() {
  const deel = audio.duration ? audio.currentTime / audio.duration : 0;
  for (const fn of luisteraars) fn({ huidig, speelt: !audio.paused, deel, fout, laadt });
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
  const rest = huidig.reserves;
  if (rest.length) {
    const o = rest.shift();
    huidig.opname = o; huidig.id = `${huidig.soort.slug}:${o.id}`;
    audio.src = o.bestand;
    start();
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
  waakhond = setTimeout(() => { if (laadt) volgende("Deze opname laadt te traag."); }, 9000);
}

// Synchroon in de tik van de gebruiker: iOS staat geluid alleen toe als het direct uit een tik volgt.
// soort: object uit soorten.json (met key), type: "zang" of "roep"
export function speel(soort, type) {
  const t = soort[type] ? type : (soort.zang ? "zang" : "roep");
  const opname = soort[t];
  if (!opname) return;
  try { startContext(); if (ctx.state !== "running") ctx.resume(); } catch (e) { console.warn(e); }
  if (huidig && huidig.soort.key === soort.key && huidig.type === t) {
    if (audio.paused) start(); else audio.pause();
    return;
  }
  huidig = { id: `${soort.slug}:${opname.id}`, soort, opname, type: t, reserves: [...(soort[`${t}_reserve`] || [])] };
  audio.src = opname.bestand;
  for (const doek of doeken) koppelDoek(doek);
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: soort.nl, artist: `${t === "zang" ? "Zang" : "Roep"} · opname ${opname.opnemer}`, album: "xeno-canto",
      artwork: soort.plaat ? [{ src: soort.plaat.klein, sizes: "480x600", type: "image/webp" }] : [],
    });
  }
  start();
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
