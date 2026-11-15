import { laadData, menu, formulier, VOORBEELD } from "./kern.js";
import { esc, initialen } from "./weergave.js";

menu();
if (!VOORBEELD) formulier(document.querySelector("#aanmelding"), "/aanmelding");
else document.querySelector("#aanmelding")?.closest(".jury-uitleg")?.remove();

const doel = document.querySelector("#juryleden");
const TINTEN = ["#f6c445", "#8fe0b4", "#f7b3ab", "#a9c4f5", "#c7b8f5", "#c6f06a", "#8fd6e8", "#e3b5d6"];

try {
  const { jury, beoordelingen } = await laadData();
  const aantal = new Map();
  for (const b of beoordelingen) aantal.set(b.jurylid, (aantal.get(b.jurylid) ?? 0) + 1);
  document.querySelector("#jury-teller").textContent = jury.length ? `${jury.length} juryleden` : "";
  if (jury.length) {
    doel.innerHTML = `<ul class="juryleden">${jury
      .map((j, i) => {
        const profiel = /^https?:\/\//.test(j.profiel ?? "") ? j.profiel : null;
        return `<li data-onthul>
          <div class="jurylid-beeld" style="--vlak:${TINTEN[i % TINTEN.length]}"><span>${esc(initialen(j.naam))}</span></div>
          <h3>${esc(j.naam)}</h3>
          <p class="jurylid-functie">${esc([j.functie, j.organisatie].filter(Boolean).join(", "))}</p>
          ${j.over ? `<p class="jurylid-over">${esc(j.over)}</p>` : ""}
          <p class="jurylid-voet">${j.expertise ? `<span class="etiket">${esc(j.expertise)}</span>` : ""}<span class="meta">${aantal.get(j.id) ?? 0} ${aantal.get(j.id) === 1 ? "beoordeling" : "beoordelingen"}</span>${profiel ? `<a href="${esc(profiel)}" rel="noopener nofollow">Profiel</a>` : ""}</p>
        </li>`;
      })
      .join("")}</ul>`;
  } else {
    doel.innerHTML = `<div class="leegstaat">
      <div><p class="meta">In oprichting</p><h3>De jury wordt nu samengesteld.</h3></div>
      <p>Zodra een jurylid is toegetreden, staat diens naam, achtergrond en aantal beoordelingen hier. Er worden geen cijfers gegeven voordat er minstens drie juryleden zijn.</p>
      <p class="leegstaat-links"><a class="pijl" href="#aanmelden">Meld je aan als jurylid</a><a class="pijl" href="/voorbeeld/jury/">Bekijk een voorbeeld</a></p>
    </div>`;
  }
} catch (fout) {
  console.error(fout);
  doel.innerHTML = `<p class="melding">De jury kon niet worden geladen.</p>`;
}
