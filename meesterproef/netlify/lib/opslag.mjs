// Opslaglaag: JSON-waarden onder een sleutel.
// Met MEESTERPROEF_OPSLAG_MAP gezet: bestanden in die map (lokaal en in tests).
// Anders: Netlify Blobs, in de winkel "meesterproef".

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const WINKEL = "meesterproef";
const POGINGEN = 6;

export function bestandsmodus() {
  return Boolean(process.env.MEESTERPROEF_OPSLAG_MAP);
}

const kopie = (waarde) => (waarde === undefined ? undefined : structuredClone(waarde));

// ---------- bestanden ----------

function bestand(sleutel) {
  // Sleutels komen uit de code, niet van gebruikers; toch alles weren wat een pad kan vormen.
  const naam = String(sleutel).replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(path.resolve(process.env.MEESTERPROEF_OPSLAG_MAP), `${naam}.json`);
}

async function leesBestand(sleutel) {
  try {
    return JSON.parse(await readFile(bestand(sleutel), "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return undefined;
    throw e;
  }
}

let volgnummer = 0;

async function schrijfBestand(sleutel, waarde) {
  const doel = bestand(sleutel);
  await mkdir(path.dirname(doel), { recursive: true });
  // Eerst naast het doel schrijven en dan hernoemen: een lezer ziet nooit een half bestand.
  const tijdelijk = `${doel}.${process.pid}.${++volgnummer}.tmp`;
  await writeFile(tijdelijk, JSON.stringify(waarde, null, 2), "utf8");
  await rename(tijdelijk, doel);
}

// Eén wachtrij per bestand, zodat lezen-wijzigen-schrijven binnen dit proces niet door elkaar loopt.
const wachtrijen = new Map();

function naElkaar(sleutel, taak) {
  const id = bestand(sleutel);
  const vorige = wachtrijen.get(id) ?? Promise.resolve();
  const deze = vorige.then(taak, taak);
  const staart = deze.catch(() => {});
  wachtrijen.set(id, staart);
  staart.then(() => {
    if (wachtrijen.get(id) === staart) wachtrijen.delete(id);
  });
  return deze;
}

// ---------- Netlify Blobs ----------

let winkel;

async function blobs() {
  if (!winkel) {
    // Dynamisch, zodat tests en de lokale server zonder Netlify draaien.
    const { getStore } = await import("@netlify/blobs");
    // Sterke consistentie: wie net schreef moet bij het volgende verzoek zijn eigen wijziging teruglezen.
    winkel = getStore({ name: WINKEL, consistency: "strong" });
  }
  return winkel;
}

// ---------- publiek ----------

export async function lees(sleutel, standaard) {
  const waarde = bestandsmodus()
    ? await leesBestand(sleutel)
    : await (await blobs()).get(sleutel, { type: "json" });
  return waarde === undefined || waarde === null ? kopie(standaard) : waarde;
}

export async function schrijf(sleutel, waarde) {
  if (bestandsmodus()) return naElkaar(sleutel, () => schrijfBestand(sleutel, waarde));
  await (await blobs()).setJSON(sleutel, waarde);
}

// Lezen, wijzigen en terugschrijven als één stap. `wijzig` krijgt de huidige waarde
// en geeft de nieuwe terug, of undefined om niets te schrijven. Bij Blobs kan `wijzig`
// vaker lopen: schreef een ander verzoek tussendoor, dan beginnen we opnieuw.
export async function werkBij(sleutel, standaard, wijzig) {
  if (bestandsmodus()) {
    return naElkaar(sleutel, async () => {
      const huidig = (await leesBestand(sleutel)) ?? kopie(standaard);
      const nieuw = await wijzig(huidig);
      if (nieuw !== undefined) await schrijfBestand(sleutel, nieuw);
      return nieuw;
    });
  }
  const w = await blobs();
  for (let poging = 0; poging < POGINGEN; poging++) {
    const gevonden = await w.getWithMetadata(sleutel, { type: "json" });
    const nieuw = await wijzig(gevonden ? gevonden.data : kopie(standaard));
    if (nieuw === undefined) return undefined;
    // Bestaat de sleutel nog niet, dan mag alleen de eerste schrijver hem aanmaken; anders
    // alleen schrijven als de versie nog dezelfde is. De nagebootste opslag van `netlify dev`
    // geeft bij lezen geen versie terug: daar schrijven we zonder voorwaarde.
    const voorwaarde = !gevonden ? { onlyIfNew: true } : gevonden.etag ? { onlyIfMatch: gevonden.etag } : {};
    const { modified } = await w.setJSON(sleutel, nieuw, voorwaarde);
    if (modified) return nieuw;
    await new Promise((klaar) => setTimeout(klaar, 20 + Math.random() * 60 * (poging + 1)));
  }
  throw new Error(`opslag: "${sleutel}" bleef door anderen gewijzigd worden`);
}
