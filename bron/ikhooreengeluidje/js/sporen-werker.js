// Rekent de sporen uit, los van de pagina (Web Worker), zodat de pagina blijft reageren.
// Model: HTDemucs (Meta, MIT), als ONNX-bestand van timcsy/demucs-web (MIT), van Hugging Face.
// Het model wordt één keer gedownload en daarna op dit apparaat bewaard (Cache Storage).
// Het muziekbestand zelf verlaat het apparaat nooit.
import * as ort from "./vendor/ort/ort.min.mjs";
import { DemucsProcessor } from "./vendor/demucs/processor.js";

export const MODEL = {
  url: "https://huggingface.co/timcsy/demucs-web-onnx/resolve/92e33df61cfc9eb820272aaa62d2ef6dcf4d950d/htdemucs_embedded.onnx",
  bytes: 180534758,
  sha256: "e5e425c17683f163a472462eb5f5a4ffcd11c31858d57fbd0833b012d8b88077",
};
const CACHE = "ikhoor-model-v1";

ort.env.wasm.wasmPaths = new URL("./vendor/ort/", import.meta.url).href;
ort.env.wasm.numThreads = 1; // meer draden vraagt speciale headers die de rest van de site breken
ort.env.wasm.proxy = false;

const meld = (type, data = {}) => self.postMessage({ type, ...data });

async function hex(buf) {
  const h = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function laadModel() {
  let cache = null;
  try { cache = await caches.open(CACHE); } catch {}
  const bewaard = cache && (await cache.match(MODEL.url));
  if (bewaard) {
    meld("model", { fase: "uit-cache" });
    return bewaard.arrayBuffer();
  }
  meld("model", { fase: "download", geladen: 0, totaal: MODEL.bytes });
  const r = await fetch(MODEL.url, { mode: "cors", referrerPolicy: "no-referrer" });
  if (!r.ok) throw new Error(`Het model laadt niet (${r.status}).`);
  const lezer = r.body.getReader();
  const buf = new Uint8Array(MODEL.bytes);
  let geladen = 0, laatst = 0;
  for (;;) {
    const { done, value } = await lezer.read();
    if (done) break;
    if (geladen + value.length > buf.length) throw new Error("Het model is groter dan verwacht.");
    buf.set(value, geladen);
    geladen += value.length;
    if (geladen - laatst > 1_000_000) { laatst = geladen; meld("model", { fase: "download", geladen, totaal: MODEL.bytes }); }
  }
  if (geladen !== MODEL.bytes) throw new Error("Het model is niet helemaal binnengekomen. Probeer het opnieuw.");
  meld("model", { fase: "controleren" });
  if ((await hex(buf.buffer)) !== MODEL.sha256) throw new Error("Het gedownloade model klopt niet (controlegetal wijkt af).");
  if (cache) {
    try { await cache.put(MODEL.url, new Response(buf.buffer.slice(0), { headers: { "Content-Type": "application/octet-stream" } })); } catch {}
  }
  return buf.buffer;
}

let processor = null;
async function sessie() {
  if (processor) return processor;
  const buf = await laadModel();
  meld("model", { fase: "starten" });
  const heeftGpu = !!(self.navigator && navigator.gpu && (await navigator.gpu.requestAdapter().catch(() => null)));
  processor = new DemucsProcessor({
    ort,
    sessionOptions: { executionProviders: heeftGpu ? ["webgpu", "wasm"] : ["wasm"], graphOptimizationLevel: "basic" },
    onProgress: ({ progress, currentSegment, totalSegments }) => meld("voortgang", { deel: progress, stuk: currentSegment, stukken: totalSegments }),
  });
  await processor.loadModel(buf);
  meld("model", { fase: "klaar", gpu: heeftGpu });
  return processor;
}

self.onmessage = async (e) => {
  const { type } = e.data;
  try {
    if (type === "heeft-model") {
      let ja = false;
      try { ja = !!(await (await caches.open(CACHE)).match(MODEL.url)); } catch {}
      meld("heeft-model", { ja });
    } else if (type === "scheid") {
      const p = await sessie();
      const begin = performance.now();
      // HTDemucs normaliseert het geluid zelf, binnen het model; dat hoeft hier niet.
      const uit = await p.separate(e.data.links, e.data.rechts);
      const sporen = {}, over = [];
      for (const k of ["vocals", "drums", "bass", "other"]) {
        sporen[k] = { links: uit[k].left, rechts: uit[k].right };
        over.push(uit[k].left.buffer, uit[k].right.buffer);
      }
      self.postMessage({ type: "klaar", sporen, seconden: (performance.now() - begin) / 1000 }, over);
    }
  } catch (err) {
    meld("fout", { tekst: String(err?.message || err) });
  }
};
