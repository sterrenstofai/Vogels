# Meesterproef (werktitel)

Een platform dat AI-oplossingen toont die in Nederland echt in gebruik zijn, en ze laat beoordelen door een vakjury met openbare cijfers.

Deze map staat tijdelijk in de Vogels-repository en heeft daar niets mee te maken. Ze hoort in een eigen repository.

## Opzet

De site in `site/` is statisch: HTML, CSS en JavaScript zonder bouwstap. De gegevens staan in drie JSON-bestanden en zijn daarmee de database van deze eerste versie.

- `site/data/oplossingen.json`: de selectie. Elk record heeft een eigen beschrijving en de bronnen waarop die steunt.
- `site/data/jury.json`: de juryleden (`id`, `naam`, `functie`, `organisatie`, `over`). Nu leeg.
- `site/data/beoordelingen.json`: de cijfers per jurylid per oplossing. Nu leeg.
- `site/js/score.js`: het beoordelingsmodel. Criteria, gewichten en drempels staan alleen hier.

Lokaal bekijken: `python3 -m http.server 8080 --directory site` en open http://127.0.0.1:8080.

## Een beoordeling toevoegen

Voeg een record toe aan `beoordelingen.json`:

```json
{
  "oplossing": "id-van-de-oplossing",
  "jurylid": "id-van-het-jurylid",
  "datum": "2027-01-15",
  "scores": { "impact": 8, "betrouwbaarheid": 7, "ervaring": 8, "verantwoord": 9, "originaliteit": 6 },
  "toelichting": "Korte toelichting van het jurylid."
}
```

Vanaf drie juryleden toont de site een eindcijfer en, boven de drempel, een onderscheiding.

## Controleren

- `python3 scripts/controleer_data.py` controleert de gegevens.
- `node scripts/test_score.mjs` toetst het beoordelingsmodel.

## Formulieren

De formulieren voor inzendingen en jury-aanmeldingen gebruiken Netlify Forms. Ze werken pas na publicatie op Netlify; lokaal meldt het formulier dat versturen niet is gelukt.

## Wat er nog niet is

- Accounts en een online omgeving waarin juryleden zelf cijfers invoeren.
- Betalingen.
- Een vaste pagina per oplossing voor zoekmachines; de detailpagina wordt nu in de browser opgebouwd.
- Een privacyverklaring en gebruiksvoorwaarden.

## Regels voor de selectie

- Neem alleen op wat in gebruik is of publiek wordt getest.
- Schrijf elke beschrijving zelf en lees de bron. Neem geen teksten of beelden over.
- Zeg bij elk cijfer wie het heeft vastgesteld: een onafhankelijke partij, de organisatie of de leverancier.
- Geef geen cijfers of onderscheidingen die de jury niet heeft gegeven.
- Haal een vermelding weg als de organisatie daarom vraagt.
