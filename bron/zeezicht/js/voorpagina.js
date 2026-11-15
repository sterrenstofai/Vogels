// De voorpagina: een opening met een oude plaat, alle dieren met zoeken en filters, wat je nu aan het strand vindt.
import { dieren, pad, esc, hoofd, kaal, MAANDEN, PLEKKEN } from "/js/data.js";
import * as GETIJ from "/js/getij.js";
const $ = (s) => document.querySelector(s);
const maand = new Date().getMonth();

async function start() {
  const D = await dieren();
  // de opening: elke week een andere plaat
  const met = D.filter((d) => d.beeld_soort === "tekening" || d.labels.includes("plaat"));
  const week = Math.floor(Date.now() / (7 * 864e5));
  const held = met[week % met.length];
  if (held) {
    const img = $("[data-held-beeld] img");
    img.src = `/platen/${held.slug}.webp`; img.alt = `Oude plaat van ${held.naam}`;
    $("[data-held-link]").href = pad(held);
    fetch(`/data/dier/${held.slug}.json`).then((r) => r.json()).then((d) => {
      if (d.plaat) { img.width = d.plaat.breed; img.height = d.plaat.hoog; $("[data-held-bijschrift]").innerHTML = `Plaat van de week: <a href="${pad(held)}">${esc(d.naam)}</a>, uit ${esc(d.plaat.werk || "een oud boek")}${d.plaat.jaar ? " (" + esc(d.plaat.jaar) + ")" : ""}. ${esc(d.plaat.licentie)}.`; }
    });
  }
  const strand = D.filter((d) => d.plek.includes("strand")).length;
  $("[data-held-gegevens]").innerHTML = `<dt>Dieren</dt><dd>${D.length}, waarvan ${strand} aan het strand</dd><dt>Weetjes</dt><dd>${D.reduce((a, d) => a + d.weetjes, 0)}, nagekeken bij de bron</dd><dt>Foto's</dt><dd>${D.filter((d) => d.labels.includes("foto")).length} echte foto's, ${D.filter((d) => d.labels.includes("plaat")).length} oude platen</dd><dt>Getij</dt><dd data-getij-zin>even kijken…</dd>`;
  raster(D);
  strandBlok();
}

// ---------- alle dieren ----------
function raster(D) {
  const PLEK = [["strand", "Strand"], ["wad", "Wad"], ["noordzee", "Noordzee"], ["oceaan", "Verder weg"]];
  const groepen = [...new Set(D.map((d) => d.groep))];
  let plek = null, groep = null;
  const chips = $("[data-chips]");
  chips.innerHTML = PLEK.map(([k, t]) => `<button type="button" class="chip" aria-pressed="false" data-plek="${k}">${t}</button>`).join("") +
    groepen.map((g) => `<button type="button" class="chip" aria-pressed="false" data-groep="${esc(g)}">${esc(hoofd(g))}</button>`).join("");
  const teken = () => {
    const q = $("#filterveld").value.trim().toLowerCase().replace(/^(de|het)\s+/, "");
    const zien = D.filter((d) => (!plek || d.plek.includes(plek)) && (!groep || d.groep === groep) && (!q || [d.naam, d.wet, ...(d.ook || [])].some((x) => x.toLowerCase().includes(q))));
    $("[data-teller]").textContent = `${zien.length} van ${D.length}`;
    $("[data-raster]").innerHTML = zien.map((d) => `<a class="vkaart" href="${pad(d)}"><span class="vkaart-beeld">${d.klein ? `<img src="${d.klein}" alt="" width="480" height="320" loading="lazy">` : ""}</span><span class="vkaart-tekst"><span class="vkaart-titel">${esc(hoofd(kaal(d.naam)))}</span><span class="vkaart-sub">${esc(hoofd(d.groep))} · ${d.plek.map((p) => PLEKKEN[p]).slice(0, 2).join(", ")}</span><span class="labels">${d.beeld_soort ? `<span class="label">${d.beeld_soort}</span>` : `<span class="label label-zacht">geen beeld</span>`}${d.geluid ? '<span class="label label-zacht">geluid</span>' : ""}${d.weetjes ? '<span class="label label-zacht">nagekeken</span>' : ""}</span></span></a>`).join("") || `<p class="zacht">Geen dier met die naam. Kijk ook bij <a href="/strand">wat aanspoelt</a>.</p>`;
  };
  chips.addEventListener("click", (e) => {
    const c = e.target.closest(".chip"); if (!c) return;
    if (c.dataset.plek) plek = plek === c.dataset.plek ? null : c.dataset.plek;
    if (c.dataset.groep) groep = groep === c.dataset.groep ? null : c.dataset.groep;
    for (const x of chips.children) x.setAttribute("aria-pressed", String(x.dataset.plek ? x.dataset.plek === plek : x.dataset.groep === groep));
    teken();
  });
  $("#filterveld").addEventListener("input", teken);
  teken();
}

// ---------- strand ----------
async function strandBlok() {
  $("[data-strand-maand]").textContent = `In ${MAANDEN[maand]}`;
  try {
    const s = await fetch("/data/strand.json").then((r) => r.json());
    const m = s.maanden[String(maand + 1)];
    const top = [...m.soorten].sort((a, b) => b[1] - a[1]).slice(0, 10);
    $("[data-vondsten]").innerHTML = top.map(([k, f]) => { const i = s.soorten[k]; const naam = esc(i.nl || i.wet); return `<li>${i.slug ? `<a href="/${i.slug}">${naam} <b>${Math.round(f * 100)}%</b></a>` : `<span>${naam} <b>${Math.round(f * 100)}%</b></span>`}</li>`; }).join("");
  } catch { $("[data-vondsten]").innerHTML = ""; }
  try {
    const st = await GETIJ.stations(), code = GETIJ.gekozen(), info = st.stations.find((x) => x.code === code) || st.stations[0];
    const r = await GETIJ.reeks(info.code), k = GETIJ.komend(r, 4), nu = GETIJ.nuStand(r);
    $("[data-getij-klein]").innerHTML = `<p class="etiket">Getij bij ${esc(info.naam)}</p>
      <table><tbody>${k.map((x) => `<tr><td>${x.hoog ? "Hoogwater" : "Laagwater"}</td><td>${GETIJ.dag(x.t).split(" ")[0]} ${GETIJ.uur(x.t)}</td><td>${x.cm > 0 ? "+" : ""}${x.cm} cm NAP</td></tr>`).join("")}</tbody></table>
      <p class="noot">Een voorspelling van Rijkswaterstaat, zonder wind. Bij harde wind kan het water veel hoger of lager staan. <a href="/strand#getij">Ander strand kiezen</a></p>`;
    if (nu) $("[data-getij-zin]").textContent = `${nu.stijgt ? "Het water komt op" : "Het water gaat terug"} bij ${info.naam}; ${nu.volgend.hoog ? "hoogwater" : "laagwater"} om ${GETIJ.uur(nu.volgend.t)}`;
  } catch { $("[data-getij-zin]").textContent = "niet beschikbaar"; }
}

start();
