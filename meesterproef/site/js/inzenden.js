import { laadData, menu } from "./kern.js";
import { formulier } from "./formulier.js";

menu();
const form = document.querySelector("form[data-netlify]");
formulier(form);

// Een link vanaf een oplossing vult alvast in waar de aanvulling over gaat.
const p = new URLSearchParams(location.search);
const soort = p.get("soort");
if (soort && [...form.elements.soort.options].some((o) => o.value === soort)) form.elements.soort.value = soort;

const over = p.get("over");
if (over) {
  try {
    const { oplossingen } = await laadData();
    const o = oplossingen.find((x) => x.id === over);
    if (o) {
      form.elements.oplossing.value = o.naam;
      form.elements.organisatie.value = o.organisatie;
      form.elements.verwijzing.value = o.id;
    }
  } catch (fout) {
    console.error(fout);
  }
}

// Bij een aanvulling zijn de casusvelden niet verplicht.
const pasAan = () => {
  const aanvulling = form.elements.soort.value === "aanvulling";
  for (const veld of form.querySelectorAll("[data-casus]")) veld.required = !aanvulling;
  form.classList.toggle("is-aanvulling", aanvulling);
};
form.elements.soort.addEventListener("change", pasAan);
pasAan();
