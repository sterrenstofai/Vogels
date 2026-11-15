import { laadData, toonFout, menu, onthul, BASIS } from "./kern.js";
import { kaart, esc, adresVan, etiket, detailHTML, juryLeeg, juryVol } from "./weergave.js";
import { poster } from "./poster.js";

menu();

const doel = document.querySelector("#oplossing");

function buur(o, richting) {
  return `<a class="buur buur-${richting}" href="${esc(adresVan(o, BASIS))}"><span class="meta">${richting === "vorige" ? "Vorige" : "Volgende"}</span><span class="buur-naam">${esc(o.naam)}</span><span class="buur-org">${esc(o.organisatie)}</span><span class="buur-beeld" aria-hidden="true">${poster(o)}</span></a>`;
}

try {
  const { oplossingen, jury } = await laadData();
  const id = doel.dataset.id ?? new URLSearchParams(location.search).get("id");
  const o = oplossingen.find((x) => x.id === id);
  if (!o) {
    document.title = "Niet gevonden · Meesterproef";
    doel.innerHTML = `<div class="breed nietgevonden"><h1>Deze oplossing staat niet in de selectie.</h1><p>Misschien is de vermelding verwijderd. <a href="${BASIS}/oplossingen/">Bekijk alle oplossingen</a></p></div>`;
  } else {
    // Vaste pagina's hebben hun tekst al; een later gepubliceerde
    // inzending wordt hier in de browser opgebouwd.
    if (!doel.dataset.id) {
      document.title = `${o.naam} van ${o.organisatie} · Meesterproef`;
      doel.innerHTML = detailHTML(o, BASIS);
    }
    doel.querySelector("#jurypaneel").innerHTML = o.oordeel?.compleet ? juryVol(o, jury) : juryLeeg(o);
    doel.querySelector("[data-etiket]").innerHTML = etiket(o);

    const deel = doel.querySelector("[data-deel]");
    deel?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        deel.textContent = "Link gekopieerd";
      } catch {
        deel.textContent = "Kopiëren lukt niet in deze browser";
      }
      setTimeout(() => (deel.textContent = "Kopieer de link"), 2500);
    });

    const rij = oplossingen.slice().sort((a, b) => a.organisatie.localeCompare(b.organisatie, "nl") || a.naam.localeCompare(b.naam, "nl"));
    const plek = rij.indexOf(o);
    if (rij.length > 1) {
      document.querySelector("#buren").innerHTML = buur(rij[(plek - 1 + rij.length) % rij.length], "vorige") + buur(rij[(plek + 1) % rij.length], "volgende");
    }

    const verwant = oplossingen.filter((x) => x.sector === o.sector && x !== o).slice(0, 4);
    if (verwant.length) {
      document.querySelector("#verwant").innerHTML = `<div class="blok-kop"><h2>Meer in ${esc(o.sector)}</h2><a class="pijl" href="${BASIS}/oplossingen/?sector=${encodeURIComponent(o.sector)}">Alles in deze sector</a></div><div class="raster raster-4">${verwant.map((x) => kaart(x, BASIS)).join("")}</div>`;
    }
    onthul();
  }
} catch (fout) {
  toonFout(document.querySelector("#jurypaneel") ?? doel, fout);
}
