# Meesterproef (werktitel)

Een platform dat AI-oplossingen toont die in Nederland echt in gebruik zijn, en ze laat beoordelen door een vakjury met openbare cijfers.

Deze map staat tijdelijk in de Vogels-repository en heeft daar niets mee te maken. Ze hoort in een eigen repository.

## Wat er is

- **Openbare site:** start, oplossingen (filters, zoeken, raster en lijst), een vaste pagina per oplossing, winnaars, ranglijst, jury, werkwijze, inzenden, over, contact, privacy en voorwaarden.
- **Juryomgeving** (`/account/`): inloggen met een persoonlijke code, een wachtrij, beoordelen op vijf criteria met toelichting, en terugtrekken bij een belang.
- **Beheer** (`/beheer/`): inzendingen lezen en publiceren, juryleden toevoegen en codes uitgeven, aanmeldingen en berichten afhandelen, een vermelding verbergen.
- **Voorbeeldomgeving** (`/voorbeeld/`): dezelfde site met verzonnen oplossingen, juryleden en cijfers, om te laten zien hoe het eruitziet zodra de jury draait.

## Opzet

- `src/`: opmaak, scripts, lettertypen en gegevens.
  - `src/data/oplossingen.json`: de selectie. Elk record heeft een eigen beschrijving en de bronnen waarop die steunt.
  - `src/js/score.js`: het beoordelingsmodel. Criteria, gewichten en drempels staan alleen hier.
  - `src/js/poster.js`: de affiches. We tonen geen schermafbeeldingen van andermans werk; elke oplossing krijgt een tekening in de kleur van haar sector en met het motief van haar soort.
  - `src/js/weergave.js`: de opmaak van kaarten en detailpagina's, gedeeld door het bouwscript en de browser.
- `paginas.mjs`: de tekst van de vaste pagina's.
- `bouw.mjs`: bouwt alles naar `dist/`.
- `netlify/`: de achterkant, één functie op `/api/*` met Netlify Blobs als opslag.

## Lokaal draaien

```
npm install
npm run bouw
npm run dev        # http://127.0.0.1:8811, opslag in .opslag/, beheercode: lokaal-beheer
```

## Toetsen

```
npm test                              # het model en de API
python3 scripts/controleer_data.py    # de gegevens
node scripts/test_e2e.mjs             # de hele keten in een browser (Playwright, lege opslag, draaiende server)
```

## Publiceren op Netlify

De instellingen staan in `netlify.toml`. Zet twee omgevingsvariabelen:

- `SESSIE_GEHEIM`: een lange willekeurige tekst. Hiermee worden inlogsessies ondertekend.
- `BEHEER_CODE`: de inlogcode van de redactie.

Zet daarnaast `URL` op het definitieve adres als dat niet het Netlify-adres is; het bouwscript gebruikt het voor de sitemap en de deelbeelden.

## Hoe het werkt, in het kort

- De redactie nomineert en beschrijft. De jury beoordeelt. De organisatie geeft zelf geen cijfers.
- Vanaf drie juryleden is er een eindcijfer. Vanaf 6,5 volgt een eervolle vermelding, vanaf 8,0 de Meesterproef.
- Juryleden loggen in met een code die de redactie in Beheer aanmaakt en persoonlijk doorgeeft. De code is daar één keer te zien.
- Een gepubliceerde inzending staat direct in de selectie. Wil je haar een vaste pagina geven, zet het record dan ook in `src/data/oplossingen.json`.

## Wat er nog niet is

- E-mail. De redactie ziet inzendingen, aanmeldingen en berichten in Beheer, maar krijgt geen melding, en inzenders krijgen geen bevestiging per mail.
- Betalingen. Inzenden is gratis.
- Stemmen door het publiek.
- Foto's van juryleden; de jurypagina toont initialen.

## Regels voor de selectie

- Neem alleen op wat in gebruik is of publiek wordt getest.
- Schrijf elke beschrijving zelf en lees de bron. Neem geen teksten of beelden over.
- Zeg bij elk cijfer wie het heeft vastgesteld: een onafhankelijke partij, de organisatie of de leverancier.
- Geef geen cijfers of onderscheidingen die de jury niet heeft gegeven.
- Haal een vermelding weg als de organisatie daarom vraagt.
