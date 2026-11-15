// Verstuurt een Netlify-formulier zonder de pagina te verlaten en meldt
// eerlijk of het is gelukt. Zonder JavaScript werkt het formulier gewoon.
export function formulier(form) {
  if (!form) return;
  const status = form.querySelector(".formstatus");
  const knop = form.querySelector('button[type="submit"]');
  form.addEventListener("submit", async (gebeurtenis) => {
    gebeurtenis.preventDefault();
    knop.disabled = true;
    status.className = "formstatus";
    status.textContent = "Bezig met versturen.";
    try {
      const antwoord = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(new FormData(form)).toString(),
      });
      if (!antwoord.ok) throw new Error(String(antwoord.status));
      form.reset();
      status.className = "formstatus gelukt";
      status.textContent = form.dataset.gelukt ?? "Verstuurd. Dank je wel.";
    } catch (fout) {
      console.error(fout);
      status.className = "formstatus mislukt";
      status.textContent = "Het versturen is niet gelukt. Er is niets opgeslagen; probeer het later opnieuw.";
    } finally {
      knop.disabled = false;
    }
  });
}
