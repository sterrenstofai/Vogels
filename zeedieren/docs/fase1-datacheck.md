# Fase 1: datacheck dieren in zee

Datum: 7 november 2026. Status: klaar, wacht op akkoord. Er is nog niets van de site gebouwd.

Waar het staat: er is nog geen eigen repo, dus dit staat in `zeedieren/` op de tak `claude/new-session-ulffx4` van Vogels. Die tak gaat niet live. Zodra de nieuwe repo er is, verhuist `zeedieren/` daarheen. Dan gaan ook de map en `.github/workflows/zeedieren_datacheck.yml` weg uit Vogels.

- Scripts en ruwe uitkomsten: `zeedieren/datacheck/` (uitleg in `datacheck/README.md`).
- Bronnen, licenties en veiligheid, met een citaat per bewering: `docs/bronnen-onderzoek.md`.

## Kort

1. **Namen en indeling zijn geen probleem.** Alle 16 dieren staan in WoRMS (CC BY) en in Wikidata (CC0), met een Nederlandse naam en een Nederlands Wikipedia-artikel. Lengte en gewicht staan alleen bij de bultrug in Wikidata. De maten moeten dus met de hand, met bron (de weetjes leveren die).
2. **Weetjes met controlezin werken.** Er zijn 78 weetjes voor 16 dieren, 5 per dier (het zeepaardje 3). Alle 78 controlezinnen zijn in de GitHub Action letterlijk teruggevonden op de live Wikipedia-pagina.
3. **Foto's: voor 12 van de 16 dieren is er een goede vrije foto in het wild,** maar vaak niet de foto die Wikidata geeft. De Wikidata-foto (P18) is in 7 gevallen geen goede keuze: studio met zwarte achtergrond, een dier in gevangenschap, een tekening of een bak. Geen goede wilde foto (in de eerste resultaten) voor de **haring, de kleine pieterman en de bruinvis**. Voor het zeepaardje is er één kandidaat.
4. **Oude platen zijn er voor 15 van de 16 dieren.** Bronnen: Bloch (vissen, bruinvis), Haeckel (kwal, zeester, octopus) en Iconographia Zoologica van de UvA (schelpen, krab, wadpier, zeehonden). Alle platen zijn publiek domein. Voor de bultrug zijn er alleen schedels en baleinen.
5. **Geluid is het zwakke punt.**
   - Vrij en echt: alleen de bultrug (NOAA, publiek domein) en de gewone zeehond (Artis via Beeld en Geluid, CC BY-SA).
   - Bruinvis en grijze zeehond: niets vrij gevonden; toestemming vragen.
   - De meeste geluidsbestanden op Commons zijn uitspraakbestanden ("Nl-kokkel.ogg"). Die kunnen wel van pas komen in de kinderversie.
6. **Meldingen zijn er genoeg, maar 72% is CC BY-NC (Observation.org), op een raster van 0,05°** (ongeveer 3,4 × 5,6 km). Voor een maandstrip per dier volstaat dat ruim. Een open alternatief (CC BY/CC0) is er per groep: ICES-visonderzoek, walvisstrandingen en de ANEMOON-strandmonitoring.
7. **"Wat vind je aan het strand?" kan, met een eerlijke bron.**
   - De ANEMOON-strandmonitoring (SMP) staat in GBIF onder CC BY, met per strandbezoek per soort "gevonden" of "niet gevonden". De data lopen tot 2021.
   - Proef voor november bij Kijkduin-Scheveningen: de bovenste soorten kloppen met een tweede bron.
8. **Getijden van Rijkswaterstaat werken, maar niet vanuit de browser** (geen CORS). Ophalen via een GitHub Action, een jaar vooruit. De proef voor Scheveningen dit weekend wijkt 3 tot 9 minuten af van tide-forecast.com.
9. **Wat wel vanuit de browser werkt** (CORS `*`): WoRMS, GBIF, OBIS en Wikidata (SPARQL en EntityData).
   - Wikipedia, Commons en upload.wikimedia.org gaven vanaf deze machine een 429, ook voor miniaturen.
   - Alles van Wikimedia loopt daarom via een GitHub Action, net als bij de vorige projecten.

## Per dier

GBIF-meldingen 2016–2025: "kust" is een veelhoek om de kust en de Waddenzee, "NCP" een rechthoek om het Nederlandse deel van de Noordzee.

| Dier | WoRMS | GBIF kust / NCP | Piek (maand) | Beste foto (in het wild) | Plaat | Echt geluid | Weetjes |
|---|---|---|---|---|---|---|---|
| kokkel | 138998 | 9.281 / 14.297 | 8, 9, 7 | lege schelp op zand, CC BY-SA 4.0; levend in het wild niet gevonden | Iconographia Zoologica | – | 5 |
| mossel | 140480 | 5.717 / 10.818 | 9, 8, 10 | P18 (op het strand, CC BY-SA 2.0) of een mosselbank (Ifremer, CC BY 4.0) | Iconographia, 8 platen | – | 5 |
| strandkrab | 107381 | 13.111 / 20.411 | 9, 8, 7 | Sylt, in het water, CC BY-SA 4.0 (P18 is een studiofoto) | Iconographia | – | 5 |
| gewone zeester | 123776 | 5.598 / 11.364 | 9, 10, 8 | op het strand of onder water, CC0 / CC BY-SA 4.0 (P18 is een studiofoto) | Haeckel, plaat 40 | – | 5 |
| oorkwal | 135306 | 6.920 / 10.430 | 5, 6, 7 | P18 (in zee, CC BY 2.0) | Haeckel (welke plaat precies de oorkwal is: nog na te kijken) | – | 5 |
| wadpier | 129868 | 782 / 1.086 | 9, 8, 4 | P18 (opgegraven op het wad, CC BY 3.0); hoopjes op het wad, CC0 | Iconographia | – | 5 |
| schol | 127143 | 16.812 / 65.754 | 9, 10, 8 | Ifremer, levend op zand, CC BY 4.0 (P18 is een dode vis in de studio) | Bloch, meerdere | – | 5 |
| haring | 126417 | 9.528 / 35.687 | 9, 1, 10 | **geen goede**: alleen in de hand of op een meetlat | Bloch | – | 5 |
| kortsnuitzeepaardje | 127380 | 701 / 1.753 | 9, 1, 10 | P18 (Hillewaert, op wier; misschien een bak, na te kijken) of onder water, CC BY-SA 4.0 | Bloch | – | 3 |
| kleine pieterman | 150630 | 1.559 / 8.682 | 9, 8, 10 | **geen goede**: studio, vangst | Iconographia; P18-plaat publiek domein | – | 5 |
| grote pieterman | 127082 | 22 / 433 | – | onder water, CC BY-SA 4.0 | Bloch, meerdere | – | 5 |
| bruinvis | 137117 | 16.668 / 31.094 | 10, 8, 9 | **geen goede**: de P18-foto's zijn dieren in een bassin; verder een dood gestrand dier | Bloch | NOAA-clip (opname Denise Risch: rechten na te vragen) | 5 |
| gewone zeehond | 137084 | 25.321 / 43.495 | 1, 10, 12 | P18 (strand, CC BY-SA 2.5) | Iconographia | Artis, CC BY-SA 3.0 | 5 |
| grijze zeehond | 137080 | 18.765 / 27.114 | 1, 12, 10 | P18 (strand, CC BY-SA 2.5) | Iconographia | – | 5 |
| bultrug | 137092 | 444 / 990 | 10, 11, 6 | onder water (Louis Herman/NOAA, publiek domein); P18 is een tekening | alleen schedel en baleinen | "Humpback whale moo.ogg", "Akhumphi1x.ogg" (publiek domein) | 5 |
| gewone octopus | 140605 | 1 / 1 | – | in het wild, CC BY-SA 3.0 (P18 is een plaat van Merculiano, publiek domein) | Haeckel, plaat 54 | – | 5 |

Opmerkingen bij de tabel:

- **Beelden zelf bekeken.** De contactbladen staan in `datacheck/uitkomsten/contactblad_*.jpg`: groen is een vrije licentie, rood niet. Bij elk beeld staan bestand, maker en licentie in `commons.json`.
- **De automatische keuze is vaak mis.**
  - Bij "Hippocampus" kwamen hersenscans boven.
  - Bij "Aurelia aurita" kwamen foto's van een vrouw die zo heet.
  - Bij de bruinvis zaten vooral dieren in een bassin.
  - De keuze moet dus met de hand, zoals de briefing al zei.
- **De haring, de kleine pieterman en de bruinvis** hebben in de eerste 15 resultaten geen goede wilde foto. In fase 2 zoek ik breder (Commons-categorieën, NOAA, iNaturalist met CC BY/CC0). Lukt dat niet, dan krijgen ze de plaat en één zin waarom er geen foto is.
- **De octopus** komt in Nederland niet voor (1 melding). Dat klopt met "verder weg".
- **De bultrug** komt vaker langs dan je zou denken: 444 meldingen langs de kust, vooral in oktober en november. In november staan er alleen al 176 meldingen in het vak bij Scheveningen, waarschijnlijk één dier dat er een tijd rondzwom (nog na te kijken welk jaar).
- **De grote pieterman** komt aan de kust bijna niet voor (22 meldingen). De pieterman die op het strand steekt, is de **kleine pieterman** (ANEMOON, Huisarts en Wetenschap). Op de site dus de kleine pieterman als "de pieterman", en de grote als apart dier of helemaal niet.
- **Het zeepaardje:** er zijn in Nederland twee soorten (kortsnuit en langsnuit), allebei zeldzaam. Het Nederlandse artikel over het kortsnuitzeepaardje is kort, vandaar 3 weetjes. Keuze nodig: één zeepaardje of allebei?

## Weetjes met controlezin

- Invoer: `datacheck/weetjes.json`, per dier `[sectie, tekst voor de site, bron, controlezin]`, zoals bij Voertuigen.
- Uitkomst: `datacheck/uitkomsten/weetjes_nagekeken.json`. Alle 78 zijn gevonden.
- De Action (`wikimedia.py`) haalt de live pagina op en zoekt de zin na normaliseren, net als `nakijken.py` in De Ruimte. Dat script kan zo over naar de nieuwe repo.
- De weetjes zijn door een hulpagent gekozen en door mij steekproefsgewijs gelezen. Ze zijn nog niet allemaal met de hand nagekeken. Dat hoort in fase 2, voordat iets het label "nagekeken" krijgt.
- Een weetje uit een voetnoot (een nieuwsbericht over één zeepaardje van 7 cm) heb ik eruit gehaald.
- **Fouten in de Wikipedia-artikelen,** gevonden bij het kiezen en niet als weetje gebruikt:
  - Grijze zeehond: "grootste soort uit de onderfamilie Phocidae". Phocidae is een familie, en de zeeolifant is groter.
  - Bruinvis: de tekst zegt "maximaal 60 kilogram", een voetnoot noemt een dier van 152 kg.
  - Bultrug: volgens het artikel is de blauwe vinvis "tweemaal zo zwaar". In werkelijkheid is hij een veelvoud zwaarder.
  - Mossel: "kweekmosselen, ook wel mosselzaad genoemd". Mosselzaad zijn jonge mosselen.
  - Haring: de zin over maatjesharing en paaien is verward.
  - Oorkwal: het artikel zegt dat de steek geen pijn doet. Bewust niet gebruikt, om kinderen niet aan te moedigen een kwal aan te raken.
- Wikipedia heeft na een link soms een spatie voor een leesteken. Twee controlezinnen die daarover heen liepen, zijn ingekort.

## Waarnemingen: waar en wanneer

- **GBIF** (`soorten.py`): per dier het totaal en de verdeling per maand, licenties en de grootste datasets (`uitkomsten/soorten.json`, `gbif_datasets.json`).
  - Licenties van de meldingen langs de kust:
    - CC BY-NC 4.0: 94.912 (72%), vooral Observation.org en iNaturalist;
    - CC BY 4.0: 31.923, onder andere ICES DATRAS (visonderzoek met trawls) en de ANEMOON-strandmonitoring;
    - CC0: 4.395, onder andere de walvisstrandingen en de macrobenthosmonitoring van Rijkswaterstaat.
  - **Raster:** Observation.org zet de coördinaten in GBIF op een raster van 0,05° (`floor(coord × 20) / 20`, onzekerheid 5.000 m). Voor een kaartje van de kust per vak van ongeveer 5 km en een maandstrip is dat genoeg. Een stip op een strandpaal kan het niet.
- **OBIS** (`soorten.py`): vergelijkbare aantallen, CORS open, licentie per dataset. Geen maandverdeling in één vraag; GBIF is handiger.
- **ANEMOON-strandmonitoring (SMP)** via GBIF, CC BY 4.0, dataset `01f868e3-…`: 1,6 miljoen regels, waarvan 97.000 "gevonden" en de rest "niet gevonden". De data lopen van 1978 tot 2021.
  - Nieuwere data en de rest van de ANEMOON-gegevens zijn niet vrij (zie het bronnenonderzoek). Daarvoor moet je ANEMOON vragen.
  - Het SMP telt in mei en juni weinig of niet. Dat zie je terug in de cijfers.

## Proef: wat vind je dit weekend aan het strand van Scheveningen?

### Getij (Rijkswaterstaat, astronomisch)

Uit `getij.py`, met de ddapi20-API, locatie `scheveningen` en de groepering "getijextremen". De tweede bron is tide-forecast.com, opgehaald op 7 november.

| | RWS (cm NAP) | tide-forecast.com | verschil |
|---|---|---|---|
| za 7 nov hoogwater | 01:26 (121) | 01:20 | 6 min |
| za laagwater | 09:43 (−48) | 09:34 | 9 min |
| za hoogwater | 13:48 (102) | 13:45 | 3 min |
| za laagwater | 21:38 (−67) | 21:42 | 4 min |
| zo 8 nov hoogwater | 02:08 (122) | 02:02 | 6 min |
| zo laagwater | 10:09 (−44) | 10:04 | 5 min |
| zo hoogwater | 14:28 (111) | 14:24 | 4 min |
| zo laagwater | 22:12 (−60) | 22:16 | 4 min |

- De tijden kloppen binnen 10 minuten. De hoogtes van tide-forecast staan tegenover een ander nulpunt (niet NAP), maar het verschil tussen hoog en laag is vergelijkbaar: 169 cm bij RWS, 177 cm bij tide-forecast.
- tide-forecast noemt 's avonds ook een klein tussentijds hoog- en laagwater (de "agger"). De RWS-reeks met getijextremen heeft dat niet. Op de site laat ik alleen de hoofdtijden zien, met de zin: "Dit is een voorspelling zonder wind. Bij harde wind kan het water veel hoger of lager staan."
- De pagina met astronomische getijden van Rijkswaterstaat (waterinfo.rws.nl) is dezelfde bron. Hij is dus handig om mee te vergelijken, maar geen echte tweede bron.

### Wat spoelt er in november aan bij Kijkduin-Scheveningen?

Uit `strand_november.py`: de ANEMOON-strandmonitoring, het vak Kijkduin-Scheveningen, 49 strandbezoeken in november, 24 jaren tussen 1991 en 2021. Per soort het deel van de bezoeken waarop hij gevonden is.

| gevonden bij | soort |
|---|---|
| 82% | Amerikaanse zwaardschede |
| 65% | mossel |
| 49% | gestreepte venusschelp |
| 35% | otterschelp, nonnetje, zaagje |
| 31% | Noordzeekrab |
| 26% | strandkrab |
| 24% | schelpkokerworm |
| 22% | gewone zwemkrab, kokkel, Amerikaanse boormossel |
| 20% | zeester |
| 18% | breedpootkrab, bloemkoolkwal, tepelhoren |
| 14% | zeekat |

**Tweede bron** (`strand_tweede_bron.py`): alle GBIF-meldingen in hetzelfde vak, november 2016–2025, vooral Observation.org.
- Overeenkomsten: de otterschelp, de mossel, de strandkrab, de kokkel, de zeester, het nonnetje, de venusschelp, het zaagje, de tepelhoren, de zwaardschede, de bloemkoolkwal en de zeekat staan in allebei bovenaan.
- Extra in GBIF:
  - de gewone zeehond, de bruinvis en de grijze zeehond;
  - de stekelrog en de hondshaai, waarschijnlijk vooral eikapsels ("nixenbeurzen"), want die meldt bijna iedereen. Die staan niet in de SMP-lijst;
  - landslakken en pissebedden uit de duinen. Het vak moet dus beter op het strand passen.

**Conclusie:** een blok "Wat vind je nu aan het strand?" kan, op basis van de ANEMOON-strandmonitoring (CC BY), met de zin: "Zo vaak werd dit in deze maand gevonden, 1991–2021. Het is geen voorspelling: na een storm vind je meer en andere dingen." Eikapsels en zeezoogdieren komen dan uit GBIF. Daarvoor is een keuze over CC BY-NC nodig (zie de open vragen).

## Veiligheid (nagekeken in het bronnenonderzoek)

- **Zeehond: minstens 30 meter afstand.** Bevestigd door Pieterburen ("minimaal 30 meter") en A Seal ("minstens 30 meter"). Ecomare zegt hetzelfde, maar dat heb ik alleen via een zoekresultaat gezien.
  - Er is geen landelijk nummer. Pieterburen: 0595 526 526 (24 uur). Ecomare (Texel): 0222-317741 (alleen via een zoekresultaat). A Seal verwijst naar 144.
  - Het nummer van A Seal zelf verschilt per bron. Vragen voordat het op de site komt.
  - Advies op de site: "Bel 144 of het zeehondencentrum in de buurt", met per regio het nummer van de officiële site.
- **Pieterman:** het is bijna altijd de kleine pieterman.
  - Advies van ANEMOON: zo heet mogelijk water (tot 45 °C), minstens 15 minuten; waterschoenen helpen.
  - Huisarts en Wetenschap zegt 30 tot 90 minuten.
  - Op de site: "Laat een volwassene het water voelen."
- **Kwallen:** de blauwe haarkwal en de kompaskwal steken; de oorkwal nauwelijks. Ook aangespoelde kwallen kunnen nog steken (folder van RWS, Provincie Zeeland en GGD).
  - Het advies na een steek spreekt elkaar tegen (azijn of afspoelen). Dat moet een actuele medische bron vaststellen voordat het op de site komt.
- **Wadlopen:** volgens de Wadloopverordening 2023 is wadlopen zonder vergunning verboden, tenzij je met een gids meeloopt. Zonder gids mag alleen vlak bij de kust (geen geul over, binnen 500 m van de kwelder). Op de site: "Wadlopen alleen met een gids."

## Licenties (samenvatting; details in het bronnenonderzoek)

| Bron | Licentie | Opmerking |
|---|---|---|
| WoRMS | CC BY 4.0 (tekst); beelden CC BY-NC-SA | niet de hele database herverspreiden; citatie doi:10.14284/170 |
| Wikidata | CC0 | |
| Wikipedia (weetjes) | CC BY-SA | eigen zinnen op de site, de bron erbij |
| GBIF | per dataset: CC0, CC BY of CC BY-NC | Observation.org en iNaturalist zijn CC BY-NC |
| ANEMOON SMP | CC BY 4.0 (via GBIF) | de rest van de ANEMOON-data is niet vrij |
| OBIS, EMODnet | per dataset | |
| Rijkswaterstaat | "open, tenzij" | een expliciete licentie voor ddapi20 heb ik niet gevonden; navragen of vastleggen |
| Commons-foto's | per foto (CC0, CC BY, CC BY-SA) | maker en licentie bij elk beeld; CC BY-SA geldt voor het beeld, niet voor de site |
| Platen (Bloch, Haeckel, Iconographia) | publiek domein | |
| NOAA-geluid | meestal publiek domein | per bestand nakijken; de bruinvis van NOAA is van een andere onderzoeker |
| Watkins | alleen persoonlijk/academisch gebruik | toestemming vragen |

## Wat ik nog niet heb gedaan

- **Geluid:** de geluiden zelf heb ik niet beluisterd, alleen de licenties gelezen. Een bruinvisopname omlaag getransponeerd of vertraagd: niet gevonden onder een vrije licentie.
- **Haeckel-plaat bij de oorkwal:** nog niet nagekeken welke plaat precies de oorkwal toont.
- **De Wikidata-foto van het zeepaardje:** niet nagekeken of die in het wild of in een bak gemaakt is.
- **Nederlands Soortenregister en Waarneming.nl:** de sites zelf konden we niet openen (403). Hun voorwaarden zijn dus niet gelezen.

## Open vragen voor jou

1. **De naam, het domein en de repo.** Zodra de repo er is, verhuis ik `zeedieren/` en haal ik het uit Vogels.
2. **CC BY-NC-meldingen (Observation.org, iNaturalist):** mag dat? Het mag als de site niet-commercieel blijft (geen advertenties, geen betaalde delen). Zonder die meldingen zijn er veel minder meldingen van zeezoogdieren en eikapsels.
3. **ANEMOON:** wil je hun nieuwere strandgegevens (na 2021) vragen? De SMP-data tot 2021 mogen we al gebruiken.
4. **Pieterman en zeepaardje:** alleen de kleine pieterman (de pieterman van het strand), of beide? Eén zeepaardje of allebei?
5. **Dieren zonder goede foto** (de haring, de kleine pieterman, de bruinvis): eerst breder zoeken in fase 2, anders de plaat. Akkoord?
6. **Geluid:** toestemming vragen aan Watkins of een Nederlands instituut voor de bruinvis en de grijze zeehond? Anders laten we bij die dieren het tabje "Geluid" weg.
7. De vragen uit de briefing staan nog open: alleen de Nederlandse zee of ook de oceanen, locatie vragen, 3D in code, en de accentkleur.
