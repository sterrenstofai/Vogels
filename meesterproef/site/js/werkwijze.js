import { esc, menu } from "./kern.js";
import { CRITERIA, ONDERSCHEIDINGEN, MIN_JURYLEDEN } from "./score.js";

menu();

document.querySelector("#criteria-lang").innerHTML = CRITERIA.map(
  (c) => `<li><span class="gewicht">${c.gewicht}%</span><div><h3>${esc(c.naam)}</h3><p class="vraag">${esc(c.vraag)}</p><p>${esc(c.uitleg)}</p></div></li>`
).join("");

document.querySelector("#onderscheidingen").innerHTML = ONDERSCHEIDINGEN.map(
  (o) => `<li><span class="etiket etiket-${o.id}">${esc(o.naam)}</span><p>${esc(o.uitleg)}</p></li>`
).join("");

for (const plek of document.querySelectorAll("[data-min-jury]")) plek.textContent = MIN_JURYLEDEN;
