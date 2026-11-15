import { laadData, esc, menu } from "./kern.js";
import { formulier } from "./formulier.js";

menu();
formulier(document.querySelector("form[data-netlify]"));

const doel = document.querySelector("#juryleden");
try {
  const { jury } = await laadData();
  if (jury.length) {
    doel.innerHTML = `<ul class="juryleden">${jury
      .map(
        (j) => `<li><h3>${esc(j.naam)}</h3><p class="meta">${esc([j.functie, j.organisatie].filter(Boolean).join(", "))}</p>${j.over ? `<p>${esc(j.over)}</p>` : ""}</li>`
      )
      .join("")}</ul>`;
  } else {
    doel.innerHTML = `<p class="leeg">De jury wordt op dit moment samengesteld. Zodra een jurylid is toegetreden, staat diens naam en achtergrond hier.</p>`;
  }
} catch (fout) {
  console.error(fout);
  doel.innerHTML = `<p class="melding">De jury kon niet worden geladen.</p>`;
}
