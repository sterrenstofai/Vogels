import { laadData, toonFout, menu, BASIS } from "./kern.js";
import { esc, adresVan, etiket } from "./weergave.js";
import { ranglijst } from "./score.js";

menu();
const doel = document.querySelector("#rang-lijst");

try {
  const { oplossingen } = await laadData();
  const lijsten = {
    organisaties: ranglijst(oplossingen, (o) => [o.organisatie]),
    makers: ranglijst(oplossingen, (o) => o.gebouwdMet ?? []),
  };
  const toon = (soort) => {
    const rijen = lijsten[soort];
    if (!rijen.length) {
      doel.innerHTML = `<p class="melding">Bij geen enkele oplossing is een maker genoemd.</p>`;
      return;
    }
    doel.innerHTML = `<ol class="rang">${rijen
      .map(
        (r, i) => `<li>
        <details>
          <summary>
            <span class="rang-plek">${String(i + 1).padStart(2, "0")}</span>
            <span class="rang-naam">${esc(r.naam)}</span>
            <span class="rang-tel" title="Meesterproef"><b>${r.meesterproef}</b><small>MP</small></span>
            <span class="rang-tel" title="Eervolle vermelding"><b>${r.eervol}</b><small>EV</small></span>
            <span class="rang-tel" title="In de selectie"><b>${r.totaal}</b><small>Selectie</small></span>
          </summary>
          <ul>${r.oplossingen.map((o) => `<li><a href="${esc(adresVan(o, BASIS))}">${esc(o.naam)}</a><span>${soort === "makers" ? esc(o.organisatie) : esc(o.sector)}</span>${etiket(o)}</li>`).join("")}</ul>
        </details>
      </li>`
      )
      .join("")}</ol>`;
  };
  for (const tab of document.querySelectorAll("[data-rang]")) {
    tab.addEventListener("click", () => {
      for (const t of document.querySelectorAll("[data-rang]")) t.setAttribute("aria-selected", String(t === tab));
      toon(tab.dataset.rang);
    });
  }
  toon("organisaties");
} catch (fout) {
  toonFout(doel, fout);
}
