// Je plek: alleen in het geheugen van deze pagina, nooit bewaard (niet in localStorage, niet op een server).
// Kiezen kan op twee manieren: je browser je locatie laten geven, of een woonplaats intikken.
// Woonplaatsen zoeken we bij PDOK (de Locatieserver van de overheid), net als bij Voggels.
// Voor de hemel is een woonplaats nauwkeurig genoeg: tussen twee dorpen scheelt het seconden.
import { MIDDEN } from "./hemel.js";

const PDOK = "https://api.pdok.nl/bzk/locatieserver/search/v3_1";
let plek = MIDDEN;
const luisteraars = new Set();
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export const huidig = () => plek;
export function opVerandering(fn) { luisteraars.add(fn); return () => luisteraars.delete(fn); }
function zet(p) { plek = p; for (const fn of luisteraars) fn(p); }

async function zoek(q, signal) {
  const p = new URLSearchParams({ q, rows: "6", fl: "id,weergavenaam,type", fq: "type:woonplaats" });
  const r = await fetch(`${PDOK}/suggest?${p}`, { signal, referrerPolicy: "no-referrer" });
  if (!r.ok) throw new Error("PDOK " + r.status);
  return (await r.json()).response.docs;
}
async function haal(id) {
  const r = await fetch(`${PDOK}/lookup?${new URLSearchParams({ id, fl: "weergavenaam,woonplaatsnaam,centroide_ll" })}`, { referrerPolicy: "no-referrer" });
  if (!r.ok) throw new Error("PDOK " + r.status);
  const d = (await r.json()).response.docs[0];
  const [lon, lat] = d.centroide_ll.replace("POINT(", "").replace(")", "").split(" ").map(Number);
  return { naam: d.woonplaatsnaam || d.weergavenaam.split(",")[0], lat, lon };
}

// Een klein blok: "We rekenen voor …" met een knop en een zoekveld. Werkt overal waar het nodig is.
export function kiezer(vak) {
  const teken = () => {
    vak.innerHTML = `<div class="plek">
      <p class="plek-nu"><span class="etiket">Je plek</span><span data-plek-naam>${plek.standaard ? `We rekenen nu voor ${esc(plek.naam)}.` : `We rekenen voor <b>${esc(plek.naam)}</b>.`}</span></p>
      <div class="plek-rij">
        <button class="knop-pil" type="button" data-plek-gps><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="currentColor"/><circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>Gebruik mijn locatie</button>
        <div class="plek-zoek"><label class="sr" for="plek-veld">Woonplaats</label><input class="veld" id="plek-veld" type="search" autocomplete="off" placeholder="Of tik je woonplaats" role="combobox" aria-expanded="false" aria-controls="plek-lijst"><ul class="zoek-lijst" id="plek-lijst" role="listbox" hidden></ul></div>
      </div>
      <p class="plek-melding zacht" aria-live="polite"></p>
      <p class="plek-noot zacht">Je plek blijft in je browser en wordt niet bewaard. Ververs je de pagina, dan rekenen we weer voor het midden van het land.</p>
    </div>`;
    const veld = vak.querySelector("#plek-veld"), lijst = vak.querySelector("#plek-lijst"), melding = vak.querySelector(".plek-melding");
    let docs = [], timer = 0, ctl = null;
    const sluit = () => { lijst.hidden = true; veld.setAttribute("aria-expanded", "false"); };
    veld.addEventListener("input", () => {
      clearTimeout(timer);
      const q = veld.value.trim();
      if (q.length < 2) { sluit(); return; }
      timer = setTimeout(async () => {
        ctl?.abort(); ctl = new AbortController();
        try {
          docs = await zoek(q, ctl.signal);
          lijst.innerHTML = docs.length ? docs.map((d, i) => `<li role="option" data-i="${i}">${esc(d.weergavenaam)}</li>`).join("") : `<li class="zacht">Geen woonplaats gevonden</li>`;
          lijst.hidden = false; veld.setAttribute("aria-expanded", "true");
        } catch (e) { if (e.name !== "AbortError") melding.textContent = "Zoeken lukt nu niet (PDOK geeft geen antwoord). Probeer het zo opnieuw, of gebruik je locatie."; }
      }, 200);
    });
    const kies = async (i) => {
      if (!docs[i]) return;
      sluit();
      try { zet(await haal(docs[i].id)); } catch { melding.textContent = "Deze plaats kon niet worden opgehaald. Probeer het opnieuw."; }
    };
    lijst.addEventListener("click", (e) => { const li = e.target.closest("li[data-i]"); if (li) kies(+li.dataset.i); });
    veld.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); kies(0); } else if (e.key === "Escape") sluit(); });
    veld.addEventListener("blur", () => setTimeout(sluit, 200));
    vak.querySelector("[data-plek-gps]").addEventListener("click", () => {
      if (!navigator.geolocation) { melding.textContent = "Je browser kan je locatie niet doorgeven. Tik je woonplaats."; return; }
      melding.textContent = "Locatie opvragen… Die blijft in je browser.";
      navigator.geolocation.getCurrentPosition(
        (p) => zet({ naam: "jouw plek", lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) }),
        () => { melding.textContent = "Je locatie kon niet worden bepaald. Tik je woonplaats."; },
        { maximumAge: 600000, timeout: 10000, enableHighAccuracy: false });
    });
  };
  teken();
  const weg = opVerandering(() => { if (vak.isConnected) teken(); else weg(); });
}
