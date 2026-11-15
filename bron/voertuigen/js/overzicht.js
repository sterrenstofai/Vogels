// De voorpagina: een opening met het skateboard live in 3D, en alle voertuigen met zoeken en filters.
import { lijst, pad } from "/js/voertuigen.js";
const V = lijst(), $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const tellingen = {};
async function tel(v) {
  if (!tellingen[v.slug]) tellingen[v.slug] = fetch(v.slug === "fiets" ? "/data/weetjes.json" : `/data/weetjes-${v.slug}.json`).then((r) => r.json())
    .then((d) => { const s = Object.values(d.secties || {}); return { onderdelen: s.length, weetjes: s.flat().filter((w) => w.gevonden !== false).length }; }).catch(() => null);
  return tellingen[v.slug];
}
async function held(v) {
  const hij = v.naam.startsWith("het") ? "het" : "hem";
  $("[data-held-naam]").innerHTML = `${esc(v.naam.split(" ")[0])} <span class="accent">${esc(v.naam.split(" ").slice(1).join(" "))}</span>`;
  $("[data-held-zin]").textContent = `${v.zin} Draai ${hij} rond, kijk wat erin zit en haal ${hij} uit elkaar.`;
  for (const a of document.querySelectorAll("[data-held-link]")) a.href = pad(v);
  $("[data-held-link].knop-pil").textContent = `Bekijk ${v.naam}`;
  $("[data-held-kind]").href = pad(v, true);
  const t = await tel(v);
  $("[data-held-gegevens]").innerHTML = `<dt>Waar</dt><dd>${esc(v.groep)}</dd>` + (t ? `<dt>Onderdelen</dt><dd>${t.onderdelen}, elk met uitleg</dd><dt>Weetjes</dt><dd>${t.weetjes}, nagekeken bij de bron</dd>` : "") + `<dt>Voor kinderen</dt><dd>grote knoppen en een stem</dd>`;
}
// de opening: het skateboard, live in 3D (de pagina /skateboard?held in een kader); tot die klaar is staat het plaatje er
const HELD = V.find((v) => v.slug === "skateboard") || V[0];
held(HELD);
addEventListener("message", (e) => { if (e.origin === location.origin && e.data === "held-klaar") $("[data-held-3d]").classList.add("klaar"); });
// alle voertuigen
const groepen = [...new Set(V.map((v) => v.groep))];
let groep = null;
$("[data-chips]").innerHTML = groepen.map((g) => `<button type="button" class="chip" aria-pressed="false" data-groep="${esc(g)}">${esc(g[0].toUpperCase() + g.slice(1))}</button>`).join("");
function raster() {
  const q = $("#filterveld").value.trim().toLowerCase();
  const zien = V.filter((v) => (!groep || v.groep === groep) && (!q || v.label.toLowerCase().includes(q)));
  $("[data-teller]").textContent = `${zien.length} van ${V.length}`;
  $("[data-raster]").innerHTML = zien.map((v) => `<a class="vkaart" href="${pad(v)}"><span class="vkaart-beeld"><img src="/beeld/${v.slug}.webp" alt="" width="1200" height="800" loading="lazy"></span><span class="vkaart-tekst"><span class="vkaart-titel">${esc(v.label)}</span><span class="vkaart-sub">${esc(v.groep[0].toUpperCase() + v.groep.slice(1))}</span><span class="labels"><span class="label">tekening</span>${v.slug === "fiets" ? '<span class="label label-zacht">bouwstappen</span>' : ""}</span></span></a>`).join("") || `<p class="zacht">Geen voertuig met die naam.</p>`;
}
for (const c of document.querySelectorAll("[data-chips] .chip")) c.addEventListener("click", () => { groep = groep === c.dataset.groep ? null : c.dataset.groep; for (const x of document.querySelectorAll("[data-chips] .chip")) x.setAttribute("aria-pressed", String(x.dataset.groep === groep)); raster(); });
$("#filterveld").addEventListener("input", raster);
raster();
