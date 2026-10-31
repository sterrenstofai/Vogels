# Ontwerprichting: "Tafel & Toon"

Doel: een site op Awwwards-niveau die eruitziet als een goed gedrukt natuurhistorisch boek dat kan zingen. Geen 3D, geen WebGL, geen scroll-hijacking. Gewone HTML, CSS en JavaScript, snel op een iPhone.

## Onderzoek (kort)

Relevante Awwwards-winnaars van de laatste jaren, voor zover via zoekresultaten te controleren (de sites zelf konden we vanuit deze omgeving niet openen):

- **Sculpting Harmony** (Getty × Resn, Site of the Month nov. 2023): archiefmateriaal in hoofdstukken, geluid draagt het verhaal.
- **UNESCO Stolen Objects Museum** (makemepulse, SOTD 2026): afwezigheid zelf als onderwerp. Precies de les voor onze straatlaag die vaak leeg is.
- **Language Explorer** (Google Research × Hook, SOTD jan. 2026): kaart plus open data plus een FAQ over wat er níét in zit.
- **Searching for Birds** (Nadieh Bremer, Honorable Mention feb. 2026): vogeldata als warm handwerk.
- **OceanX 2025** (Unseen Studio, SOTD): een jaar per maand verteld. Alleen het ritme overnemen, niet de WebGL.
- **Hearing Birdsong** (studiomade, Honorable Mention 2022): de enige vogelzangsite in de Awwwards-index.

Een vogel- of natuurhistorische Site of the Day uit 2024–2026 hebben we niet gevonden. Daar ligt ruimte.

Patronen die we overnemen: één papiertint voor de hele site, de platen als enige verzadigde kleur, een editoriale kolom waar beeld uit breekt, native scroll met één onthulling per beeld, een spectrogram als inkttekening, een eigen SVG-raster in plaats van kaarttegels.

## Beeld: de platen

**Keuze:** drie bronnen, in deze volgorde. De eerste twee tekenen de vogel in een landschap, de derde op een witte achtergrond.

1. Naumann, *Naturgeschichte der Vögel Mitteleuropas* (1896–1905), 146 soorten.
2. Nozeman & Sepp, *Nederlandsche Vogelen* (1770–1829), scans van de Koninklijke Bibliotheek, 52 soorten. Het eerste grote Nederlandse vogelboek: een mooi verhaal voor een Nederlandse site.
3. Gould, *The Birds of Europe* (1832–1837), alleen waar de andere twee ontbreken.

Behandeling, zodat de drie één familie worden:

- **Uitsnede.** Een vaste verhouding van 4:5 per soort voor kaarten en lijsten, met de hele plaat op de soortpagina.
- **Papier.** Bij de build brengen we het wit van elke scan naar dezelfde papiertint (`#F3EDE1`).
- **Passe-partout.** Een rand van 1 px inkt op 16 px papier, met het bijschrift: werk, deel, plaat, jaar, maker.
- **Kleur.** Geen duotoon en geen filter. De chromolithografie ís het beeld.

**Soorten zonder historische plaat** krijgen geen AI-beeld. De site draait op eerlijkheid over bronnen, en een gegenereerde vogel tussen echte platen ondermijnt dat. Zo'n soort krijgt een **lege plaat**: hetzelfde passe-partout, met de naam in de koppenletter en één zin waarom er niets is, bijvoorbeeld:

- "De Turkse tortel kwam pas rond 1950 naar Nederland. Naumann en Sepp hebben hem nooit gezien."
- "Naumann zag de geelpootmeeuw nog als zilvermeeuw."
- "Ontsnapt uit een vijver of dierentuin. Geen plaat in de oude Europese vogelboeken."

Dat wordt een eigen, herkenbaar element in plaats van een gat.

## Letters

Alle letters hosten we zelf, want een font-CDN stuurt het IP-adres van elke bezoeker door.

- **Bodoni Moda** voor koppen en soortnamen, alleen vanaf 32 px. Het past bij het drukwerk uit de tijd van de platen.
- **Source Serif 4** voor de lopende tekst; cursief voor wetenschappelijke namen.
- **IBM Plex Mono** voor data: aantallen, vakcodes, XC-nummers, Hz.

## Kleur

| Rol | Hex |
|---|---|
| Papier | `#F3EDE1` |
| Passe-partout | `#E8DFCC` |
| Inkt | `#1F1B16` |
| Inkt zacht | `#5A5246` |
| Tafelrood (accent, ~7:1 op papier) | `#9A3B26` |
| Heidegroen | `#4D5B3A` |
| Arcering "niet geteld" | `#CFC5B1` |
| Nacht (donkere modus) | `#15130F`, tekst `#E9E1D0` |

Kaartschaal: vijf stappen van passe-partout naar heidegroen. Elk tekstpaar toetsen we op WCAG AA.

## De adrespagina

- **Bovenaan:** het adres en een seizoenkeuze in vier segmenten. In de URL staat de vakcode, nooit het adres.
- **Daaronder de vijf lagen als hoofdstukken**, van dichtbij naar ver. Elk hoofdstuk heeft een kopregel in mono, zoals `500 m · 0 meldingen` of `Vak 52.35/6.90 · 1.349 meldingen · 90 soorten`.
- **Lege straatlaag:** een gestippelde cirkel en één zin: "Hier is niets gemeld. Dat zegt vooral iets over waar mensen tellen."
- **Kaart:** een eigen SVG-raster. Je eigen vak in inkt, de buurvakken met een dunne lijn, de gemeentegrens gestreept. "Niet geteld" is gearceerd en wordt nooit leeg gelaten.
- **Soortkaart:** een uitsnede van de plaat, de naam, een maandstrip van 12 cellen en een afspeelknop.

## Het soortdetail

- De hele plaat in passe-partout, met bijschrift.
- De geluidsmodule met de tabs **Zang** en **Roep**.
- De maandkalender voor heel Twente. De inktdichtheid geeft het aantal meldingen weer.
- "Waar in Twente": een miniraster van alle 106 vakken.

## Het geluidsmoment

- Je tikt op Afspelen. Het geluid komt rechtstreeks van xeno-canto, wat kan omdat xeno-canto CORS toestaat.
- Een Web Audio-analyser tekent het spectrogram **live** van rechts naar links, in sepia-inkt op papier: hoge tonen boven, luid is donker. Je ziet de vogel als het ware op papier zingen.
- Voor het afspelen staat het grijze sonogram van xeno-canto er als stille voorvertoning.
- Er speelt altijd maar één opname tegelijk. De opnemer, plek, datum en licentie staan eronder.
- Via de Media Session API verschijnt de plaat als hoesbeeld op het iPhone-vergrendelscherm.
- Op iOS zetten we `navigator.audioSession.type = "playback"`, anders blijft het stil als de stilteschakelaar aan staat. Het geluid start alleen na een tik.

## Beweging

- De seizoenswissel loopt via de View Transitions API: soorten schuiven naar hun nieuwe plek.
- De afspeelknop krijgt een voortgangsring.
- Een plaat onthult één keer met een `clip-path`. Bij `prefers-reduced-motion` gebeurt dat niet.
- Geen preloader, geen parallax, geen eigen cursor.

## Prestaties en toegankelijkheid

- **Platen:** AVIF/WebP met `srcset` en vaste afmetingen. De eerste plaat krijgt `fetchpriority="high"`. Doel: LCP onder 2 s op 4G.
- **iPhone:** `svh`/`dvh` in plaats van `100vh`, tikdoelen van minstens 44 px, niets dat alleen bij hover werkt.
- **Alt-tekst:** beschrijft wat er op de plaat staat, niet alleen de soortnaam.
