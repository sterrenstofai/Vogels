// Eén speler voor de hele site, met een live spectrogram in inkt op papier.
// Het geluid komt rechtstreeks van xeno-canto (CORS staat open); er speelt altijd maar één opname.

const audio = new Audio();
audio.crossOrigin = "anonymous";
audio.preload = "none";

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
      c.drawImage(doek, -stap, 0);
      const [r, g, bl] = doek._rgb;
      c.fillStyle = doek._papier;
      c.fillRect(b - stap, 0, stap, h);
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
  const c = doek.getContext("2d");
  c.fillStyle = papier;
  c.fillRect(0, 0, doek.width, doek.height);
  doeken.add(doek);
}
export function ontkoppelDoek(doek) { doeken.delete(doek); }

export function opVerandering(fn) { luisteraars.add(fn); return () => luisteraars.delete(fn); }
function meldVoortgang() {
  const deel = audio.duration ? audio.currentTime / audio.duration : 0;
  for (const fn of luisteraars) fn({ huidig, speelt: !audio.paused, deel });
}
for (const ev of ["play", "pause", "ended", "timeupdate", "emptied"]) audio.addEventListener(ev, meldVoortgang);

export function isHuidig(id) { return huidig && huidig.id === id; }
export function speelt() { return !audio.paused; }

// soort: object uit soorten.json (met key), soort: "zang" of "roep"
export async function speel(soort, type) {
  const opname = soort[type] || soort.roep || soort.zang;
  if (!opname) return;
  const id = `${soort.slug}:${opname.id}`;
  startContext();
  if (ctx.state === "suspended") await ctx.resume();
  if (huidig && huidig.id === id) {
    if (audio.paused) await audio.play(); else audio.pause();
    return;
  }
  huidig = { id, soort, opname, type: soort[type] ? type : (soort.roep ? "roep" : "zang") };
  audio.src = opname.bestand;
  for (const doek of doeken) koppelDoek(doek);
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: soort.nl, artist: `${huidig.type === "zang" ? "Zang" : "Roep"} · opname ${opname.opnemer}`, album: "xeno-canto",
      artwork: soort.plaat ? [{ src: soort.plaat.klein, sizes: "480x600", type: "image/webp" }] : [],
    });
  }
  try { await audio.play(); } catch (e) { console.warn(e); }
}

export function stop() {
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  huidig = null;
  meldVoortgang();
}

export function huidigeOpname() { return huidig; }
