// De stem van het toestel (Web Speech) en een klikje (Web Audio). Overgenomen van De Ruimte en Voertuigen.
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
export function klik() {
  try { const a = ctx(), o = a.createOscillator(), g = a.createGain(); o.frequency.value = 1400; g.gain.setValueAtTime(0.05, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.05); o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + 0.06); } catch {}
}
