# Nieuw project: dieren in zee (werktitel)

Briefing om een nieuwe Claude Code-sessie mee te starten. Geschreven na het bouwen van vier sites voor ouders en kinderen, in dezelfde familie:

| Site | Over | Code | Live | Accent |
|---|---|---|---|---|
| **Voggels** | vogels in Twente, op je eigen adres | `sterrenstofai/vogels` | voggels.nl | perzik `#FCBC96` |
| **Ik hoor een geluidje** | nummers uit elkaar gehaald | `sterrenstofai/ikhooreengeluidje` | ikhooreengeluidje.netlify.app | mint `#A1FFCB` |
| **De Ruimte** | wat staat er vanavond boven je huis | `sterrenstofai/deruimte` | deruimte-vncz.netlify.app | lavendel `#B5B1E5` |
| **Voertuigen** | voertuigen in 3D, getekend in code | `sterrenstofai/Fiets` | voertuigen.netlify.app | geel `#F7D46A` |

Alles wat daar werkte staat hieronder, met de valkuilen. **Geef de nieuwe sessie toegang tot alle vier de repo's**, zodat hij code overneemt in plaats van opnieuw te schrijven. De briefings van de vorige projecten staan in `deruimte/docs/briefing.md` en `ikhooreengeluidje/docs/briefing.md`.

## Het idee

Mijn zoon (4 jaar, heet Fos) vindt de dieren in zee prachtig. De site laat zien welke dieren er in zee leven, met de nadruk op wat je in Nederland echt kunt tegenkomen: aan het strand, op het wad, in de Noordzee. Daarnaast een paar beroemde dieren van verder weg (walvis, haai, octopus).

- **Per dier één scherm:** groot beeld, weetjes, hoe groot, waar en wanneer je het kunt zien, hoe het klinkt.
- **Wat vind je aan het strand?** Welke dieren, schelpen en eikapsels je nu (dit seizoen) kunt vinden, en wanneer het eb is.
- **Een kinderversie:** groot beeld, één knop, een stem die de naam zegt.
- **Onderzoekjes met Fos:** elke week samen op onderzoek. Eerst op de site, dan naar het strand, het wad of een aquarium.
- **Mijn …:** wat je zelf echt gezien of gevonden hebt, met datum.

De naam en het domein kies ik zelf. Werktitels om over na te denken: *Zeezicht*, *Onder water*, *Wat spoelt er aan?*, *Zeedieren*.

## Harde regels (overgenomen uit de vier projecten)

- **Eerlijk over wat de site niet weet.** Wat geschat of nagemaakt is, staat zo op de site, met een label:
  - "simulatie" voor alles wat de browser uitrekent of verzint (een animatie van een zwemmende vis, een kaart met stippen);
  - "tekening" voor een tekening of een plaat, "foto" alleen voor een echte foto;
  - "nagekeken" betekent: met de hand gecontroleerd, met een bron per feit.
  - Er komt een pagina "Hoe dit werkt / wat de site niet kan".
- **Weetjes alleen met een controlezin.** Elk weetje heeft een bron en een zin die letterlijk op de bronpagina staat. Een script (`scripts/nakijken.py`, uit `deruimte`) kijkt dat elke maand opnieuw na via een GitHub Action. Een weetje waarvan de zin niet meer gevonden wordt, gaat van de site.
- **Geen cookies en geen tracking.** Wat je zelf bijhoudt (onderzoekjes, gespotte dieren) blijft in de browser van je eigen apparaat (localStorage of IndexedDB). Een locatie alleen in het geheugen, nooit bewaard.
- **Browser-first.**
  - Ik werk zonder lokale ontwikkelomgeving.
  - Statische site (HTML, CSS, losse ES-modules, geen framework, geen build-stap), live via Netlify, data ververst door GitHub Actions.
  - Strikte CSP in `netlify.toml`; de lokale testserver stuurt dezelfde CSP mee.
- **Communicatie en sitetekst in het Nederlands,** direct en zonder marketingtoon. Let op "de" en "het": de zeehond, het zeepaardje, de kwal, het wad.
- **Geen AI-beelden.** Echte foto's en tekeningen uit open collecties, met maker en licentie bij elk beeld. Een dier zonder goede vrije foto krijgt geen gegenereerd beeld. Gebruik dan een oude plaat, een eigen tekening in code, of een lege plaat met één zin waarom er niets is (zoals bij Voggels).
- **Licenties per bron nakijken voordat iets in de repo komt.**
- **Veiligheid** (het gaat om kinderen aan het water):
  - Bij het water ben je samen met een volwassene; wie dichtbij het water komt, draagt een zwemvest.
  - Kwallen en de pieterman niet aanraken, ook niet als ze op het strand liggen.
  - Een zeehond op het strand: afstand houden (minstens 30 meter), niet aaien. Bel een zeehondencentrum. Controleer het nummer en de afstand in fase 1.
  - Wadlopen alleen met een gids. Let op eb en vloed.
  - Geen dieren meenemen; wat je in een emmertje doet, zet je terug waar je het vond.
- **Eerst een datacheck, dan stoppen** (fase 1, zie onderaan). Pas bouwen na mijn akkoord.

## Opbouw en uiterlijk: de familie-opzet

Alle vier de sites hebben **dezelfde basis; alleen de inhoud en de accentkleur verschillen.** Neem dit over uit de code en schrijf het niet opnieuw. In Voertuigen staat de basis als losse bestanden: `site/css/familie.css` en `site/js/familie.js`.

**Kop** (overal hetzelfde)
- Logo met een eenvoudig icoontje en de naam (Geist 600, 1,5rem).
- Een zoekpil, een zwarte knop "Zoeken" en een knop in de accentkleur: "Ontdek een dier" (een willekeurig dier).
- Ronde knoppen met icoon voor Onderzoekjes, Kinderen (in de accentkleur), "Mijn …" (met teller) en Index.
- Op de telefoon: logo en ronde knoppen boven, zoekpil eronder, de twee knoppen naast elkaar. Let op 360 px: de knoppen moeten kunnen krimpen (zie de valkuilen).

**Voorpagina**
- Een opening: links een klein etiket ("Dieren in zee, voor ouders en kinderen"), een grote kop met één woord in een vlak in de accentkleur ("Wat leeft er in **de zee**?"), een korte inleiding, een paar gegevens in mono (`<dl>`) en knoppen. Rechts het beeld: bij Voggels een plaat, bij De Ruimte een sterrenhemel, bij Voertuigen een skateboard uit elkaar dat live in 3D draait.
- Daaronder "Alle dieren": een zoekveld, filterchips (bijvoorbeeld strand, wad, Noordzee, oceaan; of vissen, schelpdieren, kwallen, zoogdieren) en een raster met kaarten (beeld, naam, groep, labels).
- Een blok "Onderzoekjes met Fos" in de accentkleur, met een groot vraagteken op de achtergrond en een zwarte knop "Begin".
- "Over dit project": twee kolommen met tekst en een beeld.

**Eén scherm per dier**
- In het midden een groot podium met tabjes, bijvoorbeeld:
  - **Foto:** echt beeld, met maker en licentie.
  - **Plaat:** een oude prent (Haeckel, Bloch, Sepp), zoals de vogelplaten bij Voggels.
  - **Op schaal:** hoe groot ten opzichte van een kind, een hand of een fiets.
  - **Geluid:** waar dat bestaat (bruinvis, zeehond, walvis). Eerlijk zeggen als een geluid omhoog getransponeerd is om het hoorbaar te maken.
  - **Waar en wanneer:** een kaartje van de Nederlandse kust en een maandstrip (wanneer zie je hem het meest).
- Titel en weetjes (`<dl class="weetjes">`) linksonder; onderaan een strook met verwante dieren; rechtsonder een klein kaartje.
- Op de telefoon eerst de titel, dan de tabjes, dan de strook.

**Voet:** vier kolommen (Data, Beeld, Geluid, Privacy), twee knoppen en groot het woordmerk.

**Typografie en kleur**
- Letters: Geist en Geist Mono (OFL), zelf gehost, met de latin- en latin-ext-bestanden (kopieer `site/fonts/` uit een van de repo's).
- **Koppen zoals bij Voggels: gewicht 500, letterafstand −0,01em, regelhoogte 0,95.** De Ruimte heeft dunne koppen (300); dat vond ik minder mooi. Nergens cursief.
- Kleine labels (`.etiket`) in Geist Mono, hoofdletters, met een zwart blokje ervoor.
- Kleur zit in vlakken, niet in letters. Een accentwoord in een kop krijgt een vlak (`.accent`).
- Altijd een licht thema (`color-scheme: only light`). Donker alleen binnen een podium of kaart, zoals de nachtkaart bij Voggels.
- **Accentkleur:** een eigen kleur naast perzik, mint, lavendel en geel. Voorstel: licht zeeblauw (bijvoorbeeld `#9FD6E8`, donker `#6FBCD6`). Toets het contrast van inkt op die kleur (minstens 4,5:1).
- Papier: wit (`#FFFFFF`, zoals De Ruimte en Ik hoor een geluidje) of warm (`#F1EEE8`, zoals Voggels). Kies er één.

**Kinderversie** (`/kinderen`, kopieer `site/js/kinderen.js` uit Ik hoor een geluidje)
- Eerst een keuzepagina met grote plaatjes, daarna per dier: een grote foto, een grote knop in de accentkleur, een stem die de naam zegt (Web Speech, Nederlandse stem van het toestel, `rate 0.8`, `pitch 1.1`).
- De eerste keer wijst een kloppend handje aan waar je kunt tikken (onthouden in localStorage).
- Vegen of de pijlen gaan naar het volgende; onderaan een strook om er een te kiezen.
- Rechtsboven klein de maker en licentie. Op de telefoon mag die regel niet achter de knop vallen.

**Onderzoekjes met Fos** (`/onderzoekjes`, kopieer `site/js/onderzoekjes.js`)
- Zes opdrachten, elk met "Wat heb je nodig", "Zo doe je het", een interactief stuk en een blok "En dan naar buiten".
- Een voortgangsbalk met zes vakjes, een logboek per opdracht, een stempel "Gedaan".
- Een certificaat met naam als A4-PNG, in de browser getekend op een canvas.
- "Opnieuw beginnen" met een bevestiging; de naam blijft bewaard. Alles in localStorage.

**"Mijn …"** (kopieer `site/js/mijn.js`): een plusje bij elk dier en op elk kaartje, een teller in de kop en een eigen pagina met de datum. Hier: "Mijn zee", wat je zelf echt gezien of gevonden hebt.

## Techniek: wat werkte

**Opbouw van de repo**
```
site/              alles wat live gaat (Netlify publiceert deze map)
  index.html       voorpagina
  hoe-dit-werkt.html, 404.html, favicon.svg, og.jpg
  css/             stijl.css (+ familie.css)
  js/              ES-modules, per onderdeel een bestand; zwaar spul met dynamic import()
  data/            JSON die de site leest (gebouwd door scripts), weetjes-*.json
  fotos/ platen/ klanken/ fonts/
data/              ruwe data, handwerk/ (met de hand, met bron per feit), uitkomsten van het nakijken
scripts/           Python (standaardbibliotheek waar het kan): ophalen, bouwen, nakijken, server.py
tests/             klikken.js en schermen.js (Playwright)
docs/              briefing, rapporten
.github/workflows/ maandelijks verversen en nakijken, foto's ophalen
netlify.toml       publish = "site", redirects voor de nette adressen, headers met CSP
CLAUDE.md          de harde regels
```

**Data in lagen**
- Automatisch uit open bronnen: `data/ruw/`.
- Met de hand, met een bron per feit: `data/handwerk/<slug>.json`.
- Een bouwscript voegt ze samen tot `site/data/*.json`.
- Een kleine vaste kern van 30 tot 50 met de hand gekozen dieren (nagekeken), plus zoeken in een grotere lijst met het label "niet nagekeken".

**Weetjes met controlezin** (Voertuigen: `scripts/weetjes_voertuig.py`)
- Invoer per onderwerp: `[sectie, tekst voor de site, bron, controlezin]`.
- Het script haalt de bron op en zoekt de controlezin letterlijk (na normaliseren van spaties en aanhalingstekens). Alleen gevonden weetjes gaan naar de site.
- Let op bij Wikipedia: na een link staat in de tekst een spatie voor een leesteken ("versneld , waardoor"). Laat een controlezin daar niet eindigen.

**Geluid**
- Op iOS moet afspelen direct in de tik gebeuren, zonder `await` ervoor. Een gewoon `<audio>`-element, één speler voor de hele site (`site/js/geluid.js`).
- Spectrogram: fetch, `decodeAudioData` op 22 kHz, FFT, en een logaritmische frequentie-as met labels.
- Geluid dat de browser zelf maakt (Web Audio): de `AudioContext` pas na een tik maken en `resume()` aanroepen. Zeg op de site dat het nagemaakt is.
- Bruinvissen klikken veel hoger dan een mens hoort. Laat je zo'n opname horen, zeg dan dat hij omlaag getransponeerd of vertraagd is.

**Beelden**
- Wikimedia Commons blokkeert gewone machines (429). Ophalen via een GitHub Action (`scripts/fotos_ophalen.py`, `.github/workflows/fotos.yml`).
- Neem alleen vrije licenties, zet maker en licentie erbij, en **bekijk elke foto daarna zelf**: de afbeelding die Wikidata bij een item geeft (P18) is lang niet altijd goed. Bij onderwaterdieren komen vaak foto's van een aquarium, een gedroogd museumstuk of een bord vis boven.
- Bij Voggels kregen oude platen een vaste behandeling (zelfde papiertint, passe-partout, bijschrift met werk, jaar en maker). Dat werkt ook voor zeedieren.

**3D (uit Voertuigen)**
- Een eigen motor (`site/js/kern.js`) met three.js r187 (MIT, zelf gehost, één keer verkleind met esbuild): licht uit een CC0-HDR van Poly Haven, een stand "Donker" en een stand "Tekening" met inktlijnen, namen met lijntjes, "uit elkaar", een kinderstand.
- Een dier kan in code getekend worden: een schelp als spiraal, een kwal als draaivorm met tentakels, een zeester, een krab uit losse delen. Een uit-elkaar-weergave van bijvoorbeeld een mossel (schelp, sluitspier, kieuwen) of een vis (vinnen, kieuwen, zwemblaas) kan mooi zijn, met het label "tekening".
- Een draaiend 3D-object in de opening: laad de pagina zelf in een kader met `?held` (kaal, langzaam draaiend, een tik opent de pagina). Daarvoor `frame-ancestors 'self'` in de CSP.

**Netlify**
- Een project kan Claude aanmaken en publiceren met de Netlify-koppeling.
- **Het koppelen van de GitHub-repo moet jij doen,** in Netlify: Project configuration → Build & deploy → Link repository. Daarna gaat elke push naar `main` vanzelf live.
- Zet `.netlify/` in `.gitignore`.

**CSP**
- `default-src 'self'`, met per externe bron een uitzondering in `connect-src`, `img-src` en `media-src`.
- Laat de testserver dezelfde CSP uit `netlify.toml` meesturen (`scripts/server.py`), anders zie je blokkades pas live.

**Delen:** `og:title`, `og:description` en `og:image` (1200 × 630) in de kop van de voorpagina.

**Testen**
- `tests/klikken.js`: klik alles door (onderdelen, kinderstand, onderzoekjes, certificaat, zoeken, filters).
- `tests/schermen.js`: schermafbeeldingen op 360, 390, 768, 1024, 1366 en 1920 px, met controle op horizontaal scrollen en fouten in de console.
- Een toegankelijkheidscontrole met axe-core (WCAG AA) op elke soort pagina. Bij Voertuigen vond die: te lichte grijze tekst, ontbrekende `h1` op de 3D-pagina's en een verkeerde kopvolgorde in de voet.
- Bekijk de schermafbeeldingen zelf.

## Valkuilen waar we in liepen

- **Eerst de familie bekijken, dan bouwen.** Bij Voertuigen bouwde ik eerst een eigen startpagina, terwijl de opzet van Voggels de basis moest zijn. Begin met de repo's van de familie te lezen.
- **Koppen:** De Ruimte gebruikt gewicht 300, Voggels 500. Neem die van Voggels.
- **360 px:** een knop met `white-space: nowrap` ("Ontdek een voertuig") maakte de pagina 5 px te breed. Laat de zoekrij krimpen (`minmax(0, 1fr)`) en laat op heel smalle schermen de icoontjes weg.
- **Class-namen die botsen:** een algemene `.label` uit de familie-CSS kleurde ook de labels in het paneel. Zet algemene regels onder `.familie` of in `:where()`.
- **Links:** `a { color: inherit }` met hogere specificiteit dan `.knop-donker` gaf zwarte tekst op een zwarte knop. Gebruik `:where(...) a`.
- **CSS overnemen:** knip niet midden in een `@media`-blok. Tel na elke grote wijziging `{` en `}`.
- **Processen:** stop een proces via zijn pid. `pkill -f` met een woord uit je eigen opdracht doodt je eigen shell.
- **Tests onder zware belasting:** als er veel tegelijk draait, doen schermafbeeldingen in de browser er minuten over. Geef ruime time-outs, en draai de klik-test niet tegelijk met de schermtest.
- **Parallel bouwen met hulpagenten werkt** (zes tegelijk voor elf voertuigen), mits elk alleen eigen bestanden aanraakt en gedeelde bestanden (lijst, CSS, motor) door één sessie worden bijgewerkt.
- **De automatische keuze uit zoekresultaten is vaak mis.** Kies de belangrijke dingen met de hand.
- **Kun je iets niet zelf zien of horen,** zeg dat dan en meet het op een andere manier.

## Mogelijke bronnen voor dieren in zee (alles eerst controleren in fase 1)

**Soorten en namen**
- **WoRMS** (World Register of Marine Species): wetenschappelijke namen en indeling, met een REST-API. Licentie (CC BY?) en CORS nakijken.
- **Nederlands Soortenregister** (nederlandsesoorten.nl): Nederlandse namen en of een soort in Nederland voorkomt.
- **Wikidata:** Nederlandse namen, lengte, gewicht, foto's (P18). CC0.

**Waarnemingen: waar en wanneer**
- **GBIF** (zoals bij Voggels) en **OBIS** (Ocean Biodiversity Information System): meldingen met plaats en datum. Licentie per dataset nakijken (Observation.org-data is CC BY-NC).
- **Waarneming.nl / Observation.org:** de meeste Nederlandse strandmeldingen, maar alleen op een grof raster te delen. Voorwaarden nakijken.
- **EMODnet Biology:** Europese zeedata. Licentie nakijken.
- **Stichting ANEMOON** (strand- en kwallenmonitoring): wat spoelt er wanneer aan. Of en hoe we hun gegevens mogen gebruiken, eerst vragen.

**Eb en vloed, water**
- **Rijkswaterstaat Waterinfo** (getij, waterstand, watertemperatuur): open data. Licentie, CORS en of het vanuit de browser mag nakijken. Anders ophalen via een GitHub Action.
- Eerlijk zeggen dat een getijtabel een voorspelling is en dat wind veel kan veranderen.

**Beeld**
- **Wikimedia Commons:** via een GitHub Action.
- **NOAA Photo Library:** meestal publiek domein. Per beeld nakijken.
- **Oude platen, publiek domein:**
  - Ernst Haeckel, *Kunstformen der Natur* (1899–1904): kwallen, zeesterren, radiolariën.
  - Marcus Elieser Bloch, *Ichthyologie* (1782–1795): vissen.
  - Sepp en Nozeman (zoals bij Voggels) en andere Nederlandse natuurboeken.
  - Via de Biodiversity Heritage Library en Commons. Licentie per scan nakijken.

**Geluid**
- **NOAA** (PMEL-akoestiek, walvisgeluiden): meestal publiek domein. Per bestand nakijken.
- **Watkins Marine Mammal Sound Database** (Woods Hole): voorwaarden nakijken.
- **xeno-canto:** vooral vogels, wel handig voor meeuwen, sterns en scholeksters aan het strand.
- Bruinvis en zeehond: opnames van Nederlandse onderzoeksinstituten. Licentie per bestand nakijken.

**Zelf tekenen:** schelpen, kwallen en zeesterren lenen zich goed voor 3D in code (zie Voertuigen).

## Ideeën voor Onderzoekjes met Fos (4 jaar)

1. **Schelpen zoeken.** Op de site leer je vijf schelpen herkennen (kokkel, mossel, zwaardschede, nonnetje, wulk). Dan naar het strand: welke vind je? Tellen en afvinken in het logboek.
2. **Wat spoelt er aan?** Na een storm of bij eb langs de vloedlijn lopen: eikapsels van de rog (een "nixenbeurs"), zeesterren, kwallen. Niet aanraken wat steekt.
3. **Drijft een ei?** Een ei in zoet water en in zout water. Waarom drijft een vis beter in zee? De site rekent uit hoeveel zout er in een emmer zeewater zit.
4. **Eb en vloed.** De site zegt wanneer het eb en vloed is. Leg een steentje bij de waterlijn en kijk na een uur waar het water is.
5. **Hoe groot is een walvis?** De walvis op schaal in de tuin of op het strand, met stappen of een touw. De site rekent uit hoeveel stappen.
6. **Garnalen kijken.** Met een schepnetje bij eb in een poeltje kijken (samen met een volwassene, met laarzen aan) en alles terugzetten. Of: een bezoek aan een aquarium of zeehondencentrum.

## Fase 1: eerst een datacheck, dan stoppen

Net als bij de vorige projecten: eerst kijken wat er echt aan data is, voordat er iets gebouwd wordt.

- **Een testset van ongeveer 15 dieren**, bijvoorbeeld:
  - aan het strand: kokkel, mossel, strandkrab, zeester, oorkwal, wadpier;
  - in de Noordzee: schol, haring, zeepaardje, pieterman, bruinvis, gewone zeehond, grijze zeehond;
  - verder weg: bultrug, octopus.
- **Per dier meten:**
  - Staat het in WoRMS en Wikidata, met een Nederlandse naam?
  - Is er een echte foto met een vrije licentie? Van wie, onder welke licentie? Is het een goede foto (in het wild, niet in een bak of op een bord)?
  - Is er een oude plaat (Haeckel, Bloch)?
  - Is er een geluid met een licentie die ons gebruik toestaat?
  - Hoeveel meldingen zijn er langs de Nederlandse kust, per maand, en op welk raster?
  - Werken de API's vanuit de browser (CORS)?
  - Haalt `nakijken.py` minstens drie weetjes per dier met een controlezin van Wikipedia?
- **Een korte proef:** "wat vind je dit weekend aan het strand van Scheveningen?" met de getijden van Rijkswaterstaat. Klopt het met een tweede bron?
- **Rapport in het Nederlands,** in `docs/fase1-datacheck.md`. Scripts en ruwe uitkomsten in `datacheck/`.
- **Daarna stoppen en wachten op mijn akkoord.**

## Open vragen voor mij

- De naam en het domein.
- Alleen de Nederlandse zee (strand, wad, Noordzee), of ook de oceanen?
- Een eigen repo: maak ik aan op GitHub. Daarna koppel ik hem zelf aan Netlify.
- Mag de site om je locatie vragen (welk strand is het dichtstbij, getijden daar)? Bij Voggels en De Ruimte: alleen in het geheugen, nooit bewaard, ook een plaats intikken kan.
- Ook 3D-dieren in code, zoals bij Voertuigen, of alleen foto's en platen?
- De accentkleur: licht zeeblauw, of iets anders?
