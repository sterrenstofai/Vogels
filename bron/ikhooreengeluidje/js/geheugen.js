// Bewaart gescheiden sporen op dit apparaat (IndexedDB), zodat hetzelfde stuk de volgende keer meteen klaar is.
// Alleen in deze browser, nergens anders. Als 16-bits geluid (een minuut is dan ongeveer 42 MB).
// Hooguit BEWAAR stukken: het oudste valt eraf.
const DB = "ikhoor-sporen", STORE = "sporen", BEWAAR = 3;
const SPOREN = ["vocals", "drums", "bass", "other"];

function open() {
  return new Promise((ok, fout) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "sleutel" });
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fout(r.error);
  });
}
function doe(modus, fn) {
  return open().then((db) => new Promise((ok, fout) => {
    const tx = db.transaction(STORE, modus), st = tx.objectStore(STORE);
    const r = fn(st);
    tx.oncomplete = () => { db.close(); ok(r?.result); };
    tx.onerror = () => { db.close(); fout(tx.error); };
  }));
}

const naarInt16 = (f) => { const u = new Int16Array(f.length); for (let i = 0; i < f.length; i++) { const v = Math.max(-1, Math.min(1, f[i])); u[i] = v < 0 ? v * 32768 : v * 32767; } return u; };
const naarFloat = (u) => { const f = new Float32Array(u.length); for (let i = 0; i < u.length; i++) f[i] = u[i] / (u[i] < 0 ? 32768 : 32767); return f; };

// Een vingerafdruk van het bestand zelf (niet van de naam): hetzelfde bestand geeft dezelfde sleutel
export async function vingerafdruk(buf) {
  const h = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(h)].slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function lijst() {
  try {
    const alles = await doe("readonly", (st) => st.getAll());
    return (alles || []).map(({ sleutel, bestand, naam, van, duur, gemaakt, bytes }) => ({ sleutel, bestand, naam, van, duur, gemaakt, bytes }));
  } catch { return []; }
}

export async function bewaar(bestand, naam, van, sporen) {
  const rec = { sleutel: `${bestand}:${van}`, bestand, naam, van, duur: sporen.vocals.links.length / 44100, gemaakt: Date.now(), sporen: {}, bytes: 0 };
  for (const k of SPOREN) {
    rec.sporen[k] = { links: naarInt16(sporen[k].links), rechts: naarInt16(sporen[k].rechts) };
    rec.bytes += rec.sporen[k].links.byteLength * 2;
  }
  await doe("readwrite", (st) => st.put(rec));
  // opruimen: alleen de nieuwste BEWAAR houden
  const alles = (await lijst()).sort((a, b) => b.gemaakt - a.gemaakt);
  for (const oud of alles.slice(BEWAAR)) await doe("readwrite", (st) => st.delete(oud.sleutel));
}

export async function haal(sleutel) {
  const rec = await doe("readonly", (st) => st.get(sleutel));
  if (!rec) return null;
  const sporen = {};
  for (const k of SPOREN) sporen[k] = { links: naarFloat(rec.sporen[k].links), rechts: naarFloat(rec.sporen[k].rechts) };
  return { ...rec, sporen };
}

export async function wis() {
  try { await doe("readwrite", (st) => st.clear()); } catch {}
}
