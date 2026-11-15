// De stem van het toestel (Web Speech) en nagemaakte geluidjes (Web Audio). Overgenomen van De Ruimte.
// Geluid start alleen na een tik van de gebruiker (iOS).
let stemmen = [];
function laad() { if ("speechSynthesis" in window) stemmen = speechSynthesis.getVoices().filter((v) => (v.lang || "").toLowerCase().replace("_", "-").startsWith("nl")); }
if ("speechSynthesis" in window) { laad(); speechSynthesis.addEventListener?.("voiceschanged", laad); }
export function zeg(tekst, { kind = false } = {}) {
  if (!("speechSynthesis" in window)) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(tekst);
  u.lang = "nl-NL"; u.rate = kind ? 0.8 : 0.95; u.pitch = kind ? 1.1 : 1;
  const s = stemmen.find((v) => v.localService && v.lang.toLowerCase().startsWith("nl-nl")) || stemmen.find((v) => v.localService) || stemmen[0];
  if (s) u.voice = s;
  speechSynthesis.speak(u);
  return true;
}
export function stil() { if ("speechSynthesis" in window) speechSynthesis.cancel(); }
let ac = null;
function ctx() { ac ||= new (window.AudioContext || window.webkitAudioContext)(); ac.resume?.(); return ac; }
// Een fietsbel (nagemaakt): twee keer "tring", een metalen klank met boventonen.
export function bel() {
  try {
    const a = ctx(), t0 = a.currentTime;
    for (const start of [0, 0.32]) for (const [f, v] of [[2850, 0.16], [4120, 0.08], [6400, 0.04]]) {
      const o = a.createOscillator(), g = a.createGain();
      o.frequency.value = f; g.gain.setValueAtTime(0, t0 + start); g.gain.linearRampToValueAtTime(v, t0 + start + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + 0.9);
      o.connect(g).connect(a.destination); o.start(t0 + start); o.stop(t0 + start + 1);
    }
  } catch {}
}
// Ratelen van de ketting en het vrijloopje (nagemaakt): korte tikjes.
export function ratel(n = 14) {
  try {
    const a = ctx(), t0 = a.currentTime;
    for (let i = 0; i < n; i++) {
      const b = a.createBuffer(1, 600, a.sampleRate), d = b.getChannelData(0);
      for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * Math.exp(-k / 60);
      const s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
      f.type = "highpass"; f.frequency.value = 2500; g.gain.value = 0.25; s.buffer = b; s.connect(f).connect(g).connect(a.destination); s.start(t0 + i * 0.055);
    }
  } catch {}
}
export function klik() {
  try { const a = ctx(), o = a.createOscillator(), g = a.createGain(); o.frequency.value = 1400; g.gain.setValueAtTime(0.05, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.05); o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + 0.06); } catch {}
}
// Een straalmotor (nagemaakt): ruis die aanzwelt, met een fluittoon erbij.
export function straal() {
  try {
    const a = ctx(), t0 = a.currentTime, n = a.sampleRate * 2.4, b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = b; f.type = "lowpass"; f.frequency.setValueAtTime(300, t0); f.frequency.linearRampToValueAtTime(1800, t0 + 1.6);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.35, t0 + 1.2); g.gain.linearRampToValueAtTime(0, t0 + 2.4);
    s.connect(f).connect(g).connect(a.destination); s.start(t0);
    const o = a.createOscillator(), og = a.createGain(); o.frequency.setValueAtTime(900, t0); o.frequency.linearRampToValueAtTime(2600, t0 + 1.8);
    og.gain.setValueAtTime(0, t0); og.gain.linearRampToValueAtTime(0.03, t0 + 1.2); og.gain.linearRampToValueAtTime(0, t0 + 2.4);
    o.connect(og).connect(a.destination); o.start(t0); o.stop(t0 + 2.5);
  } catch {}
}
// ---- geluiden voor de andere voertuigen (allemaal nagemaakt, geen opnames)
function toon(a, t0, f, duur, { v = 0.12, type = "sawtooth", lp = 2400, glij = 0 } = {}) {
  const o = a.createOscillator(), g = a.createGain(), fl = a.createBiquadFilter();
  o.type = type; o.frequency.setValueAtTime(f, t0); if (glij) o.frequency.linearRampToValueAtTime(f + glij, t0 + duur);
  fl.type = "lowpass"; fl.frequency.value = lp;
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + 0.03); g.gain.setValueAtTime(v, t0 + duur - 0.06); g.gain.linearRampToValueAtTime(0, t0 + duur);
  o.connect(fl).connect(g).connect(a.destination); o.start(t0); o.stop(t0 + duur + 0.02);
}
// Een toeter (auto, vrachtwagen, bus): twee tonen tegelijk, twee keer kort.
export function toeter() { try { const a = ctx(), t0 = a.currentTime; for (const s of [0, 0.42]) for (const f of [349, 440]) toon(a, t0 + s, f, 0.32, { v: 0.08 }); } catch {} }
// Een sirene (brandweer): twee tonen om en om, "taa-tuu".
export function sirene() { try { const a = ctx(), t0 = a.currentTime; for (let i = 0; i < 4; i++) toon(a, t0 + i * 0.55, i % 2 ? 440 : 587, 0.55, { v: 0.09, type: "square", lp: 1800 }); } catch {} }
// Een treinfluit: een hoge, iets hese toon.
export function fluit() { try { const a = ctx(), t0 = a.currentTime; for (const f of [622, 740, 932]) toon(a, t0, f, 1.1, { v: 0.05, type: "triangle", lp: 3000 }); } catch {} }
// Een scheepshoorn: een lage, lange toon.
export function hoorn() { try { const a = ctx(), t0 = a.currentTime; for (const f of [110, 165, 220]) toon(a, t0, f, 1.6, { v: 0.09, lp: 900 }); } catch {} }
// Een motor die aanslaat en bromt (trekker, vuilniswagen): lage tikjes die sneller worden.
export function brom() {
  try {
    const a = ctx(), t0 = a.currentTime, o = a.createOscillator(), g = a.createGain(), fl = a.createBiquadFilter(), lfo = a.createOscillator(), lg = a.createGain();
    o.type = "sawtooth"; o.frequency.setValueAtTime(38, t0); o.frequency.linearRampToValueAtTime(62, t0 + 1.2); o.frequency.linearRampToValueAtTime(48, t0 + 2.2);
    fl.type = "lowpass"; fl.frequency.value = 420; lfo.frequency.setValueAtTime(9, t0); lfo.frequency.linearRampToValueAtTime(16, t0 + 1.2); lg.gain.value = 0.06;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.14, t0 + 0.2); g.gain.setValueAtTime(0.14, t0 + 1.9); g.gain.linearRampToValueAtTime(0, t0 + 2.3);
    lfo.connect(lg).connect(g.gain); o.connect(fl).connect(g).connect(a.destination); o.start(t0); lfo.start(t0); o.stop(t0 + 2.4); lfo.stop(t0 + 2.4);
  } catch {}
}
// Wieltjes over de stoep (skateboard, step): een rollend gerommel met tikjes van de tegels.
export function rol() {
  try {
    const a = ctx(), t0 = a.currentTime, n = a.sampleRate * 1.6, b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (0.5 + 0.5 * ((i / a.sampleRate) % 0.32 < 0.012 ? 3 : 1));
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = b; f.type = "bandpass"; f.frequency.value = 500; f.Q.value = 0.8;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.3, t0 + 0.15); g.gain.linearRampToValueAtTime(0, t0 + 1.6);
    s.connect(f).connect(g).connect(a.destination); s.start(t0);
  } catch {}
}
