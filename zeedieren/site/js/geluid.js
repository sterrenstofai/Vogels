// Eén speler voor de hele site: een gewoon <audio>-element (zoals Voggels en Ik hoor een geluidje).
// Op iOS moet afspelen direct in de tik gebeuren, zonder await ervoor: speel() roept audio.play() meteen aan.
// Daarnaast een spectrogram: fetch, decodeAudioData op 22 kHz, FFT en een logaritmische frequentie-as.
const audio = new Audio();
audio.preload = "none";
let huidig = null;
const luisteraars = new Set();
const meld = () => { for (const fn of luisteraars) fn(huidig, !audio.paused); };
for (const ev of ["play", "pause", "ended"]) audio.addEventListener(ev, meld);
export function opVerandering(fn) { luisteraars.add(fn); return () => luisteraars.delete(fn); }
export const speelt = () => !audio.paused;
export const isHuidig = (id) => huidig?.id === id;
export const positie = () => (audio.duration ? audio.currentTime / audio.duration : 0);
export function speel(item) {
  if (huidig?.id === item.id) { if (audio.paused) audio.play().catch(() => {}); else audio.pause(); return; }
  huidig = item; audio.src = item.url; audio.currentTime = 0;
  audio.play().catch(() => {});
  meld();
}
export function stop() { audio.pause(); }

/* ---------- spectrogram ---------- */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (-2 * Math.PI) / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < len / 2; j++) {
        const ur = re[i + j], ui = im[i + j], vr = re[i + j + len / 2] * cr - im[i + j + len / 2] * ci, vi = re[i + j + len / 2] * ci + im[i + j + len / 2] * cr;
        re[i + j] = ur + vr; im[i + j] = ui + vi; re[i + j + len / 2] = ur - vr; im[i + j + len / 2] = ui - vi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}
const cache = new Map();
export async function spectrogram(url) {
  if (cache.has(url)) return cache.get(url);
  const p = (async () => {
    const buf = await (await fetch(url)).arrayBuffer();
    const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const ctx = new Off(1, 22050, 22050);
    const data = (await ctx.decodeAudioData(buf)).getChannelData(0);
    const N = 1024, stap = Math.max(256, Math.floor(data.length / 900)), kolommen = [];
    const venster = Float32Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
    for (let s = 0; s + N < data.length; s += stap) {
      const re = new Float32Array(N), im = new Float32Array(N);
      for (let i = 0; i < N; i++) re[i] = data[s + i] * venster[i];
      fft(re, im);
      const k = new Float32Array(N / 2);
      for (let i = 0; i < N / 2; i++) k[i] = Math.log10(re[i] * re[i] + im[i] * im[i] + 1e-10);
      kolommen.push(k);
    }
    return { kolommen, duur: data.length / 22050, nyquist: 11025 };
  })();
  cache.set(url, p);
  return p;
}
export function tekenSpectrogram(canvas, sp, voortgang = 0) {
  const dpr = Math.min(2, devicePixelRatio || 1), W = canvas.clientWidth, H = canvas.clientHeight;
  if (canvas.width !== Math.round(W * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
  const c = canvas.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  const L = 44, B = 18, w = W - L, h = H - B, fmin = 50, fmax = sp.nyquist, logmin = Math.log10(fmin), logmax = Math.log10(fmax);
  let max = -Infinity, min = Infinity;
  for (const k of sp.kolommen) for (let i = 2; i < k.length; i++) { if (k[i] > max) max = k[i]; if (k[i] < min) min = k[i]; }
  min = Math.max(min, max - 6);
  const img = c.createImageData(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  const nb = sp.kolommen[0]?.length || 1;
  for (let x = 0; x < img.width; x++) {
    const k = sp.kolommen[Math.floor((x / img.width) * sp.kolommen.length)];
    if (!k) continue;
    for (let y = 0; y < img.height; y++) {
      const f = 10 ** (logmax - (y / img.height) * (logmax - logmin)), bin = Math.min(nb - 1, Math.round((f / fmax) * nb));
      const v = Math.max(0, Math.min(1, (k[bin] - min) / (max - min))), o = (y * img.width + x) * 4;
      img.data[o] = 14 + v * 210; img.data[o + 1] = 42 + v * 200; img.data[o + 2] = 51 + v * 190; img.data[o + 3] = 255;
    }
  }
  // putImageData negeert de transform: teken via een tijdelijk canvas op de juiste plek
  const t = document.createElement("canvas"); t.width = img.width; t.height = img.height; t.getContext("2d").putImageData(img, 0, 0);
  c.clearRect(0, 0, W, H); c.drawImage(t, L, 0, w, h);
  c.fillStyle = "#9FC3CF"; c.font = "11px 'Geist Mono', monospace"; c.textAlign = "right"; c.textBaseline = "middle";
  for (const f of [100, 300, 1000, 3000, 10000]) { if (f > fmax) continue; const y = ((logmax - Math.log10(f)) / (logmax - logmin)) * h; c.fillText(f >= 1000 ? f / 1000 + " kHz" : f + " Hz", L - 6, y); c.fillRect(L, y, 4, 1); }
  c.textAlign = "left"; c.textBaseline = "alphabetic";
  c.fillText("0 s", L, H - 3); c.textAlign = "right"; c.fillText(sp.duur.toFixed(1).replace(".", ",") + " s", W, H - 3);
  if (voortgang > 0) { c.fillStyle = "#9FD6E8"; c.fillRect(L + voortgang * w, 0, 2, h); }
}
