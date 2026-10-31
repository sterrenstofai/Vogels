# Fase 3: namen, opnames en platen per soort

Peildatum 31 oktober 2026. Kern: de 227 soorten met minstens 50 Observation.org-waarnemingen in de 106 Twentse vakken. Scripts in `scripts/`, uitkomsten in `data/`.

## Naamtabel (`data/namen.json`)

Alle 329 GBIF-soortsleutels uit de Twentse vakken: 325 soorten en 4 hybriden (zoals grauwe gans × Canadese gans). Hybriden gaan niet in de soortenlijsten.

Bron voor Nederlandse namen en status: Wikipedia NL, *Lijst van vogels in de Benelux* (status Nederland bijgewerkt tot 17 april 2026), met *Lijst van vogels in Europa* voor oudere wetenschappelijke namen. Tekst van Wikipedia valt onder CC BY-SA 4.0.

| | Kern (227) | Alle soorten (325) |
|---|---|---|
| Gekoppeld aan de Nederlandse lijst | 222 | 277 |
| Daarvan exoot volgens de lijst | 7 | |
| Niet op de lijst (ontsnapt of uitgezet) | 5 | 48 |

- Koppeling: 218 op wetenschappelijke naam, 3 via de Europa-lijst (koereiger, morinelplevier, braamsluiper), 1 via de GBIF-naam (kleine zwaan).
- De lijst verbetert GBIF-namen: "Bastaardnachtegaal" wordt heggenmus, "Eiber" ooievaar, "Kraai" zwarte kraai, "Ijsvogel" IJsvogel.
- Exoten volgens de lijst: fazant, nijlgans, zwarte zwaan, mandarijneend, grote Canadese gans, rotsduif, Indische gans.
- Niet op de lijst (kern): barbarie-eend, Carolina-eend, zwaangans, helmparelhoen, ringtaling.
- Per soort staat ook de naam die xeno-canto gebruikt (kolom `xc`); die wijkt bij 4 soorten af van GBIF.

## Opnames (`data/opnames.json`)

Per soort maximaal drie zang- en drie roepopnames, de eerste is de keuze. Regels: geen ND-licentie, kwaliteit A boven B, Nederland boven België/Duitsland boven de rest van Europa, geen playback, weinig andere soorten op de achtergrond, bij voorkeur 30 s tot 2 min.

| | Soorten |
|---|---|
| Met roepopname | 227 |
| Met zangopname | 216 |
| Eerste keus roep uit Nederland | 124 |
| Eerste keus zang uit Nederland | 84 |
| Eerste keus kwaliteit A | roep 226, zang 204 |

- Licenties van de eerste keuzes: vrijwel allemaal CC BY-NC-SA (3.0 of 4.0), 5 keer CC BY-SA, 1 keer CC0, 1 keer CC BY-NC.
- 136 verschillende opnemers.
- Zonder zangopname: Carolina-eend, ringtaling, barbarie-eend, lepelaar, zwaangans, topper, Indische gans, krombekstrandloper, koereiger, sneeuwgans, steppevorkstaartplevier.

## Platen (`data/platen.json`)

Regel: minstens 800 px breed; Naumann, dan Nozeman & Sepp, dan Gould; een plaat met alleen deze soort; publiek domein of "no restrictions"; de grootste. Handmatig gecontroleerde keuzes en lege platen staan in `data/platen_handmatig.json` en gaan voor.

| Bron | Soorten |
|---|---|
| Naumann, *Naturgeschichte der Vögel Mitteleuropas* (1896–1905) | 146 |
| Nozeman & Sepp, *Nederlandsche Vogelen* (1770–1829), KB-scans | 52 |
| Gould, *The Birds of Europe* (1832–37) en *A Century of Birds from the Himalaya* (1831) | 13 |
| Alphéraky, *The Geese of Europe and Asia* (1905): toendrarietgans | 1 |
| *Recueil de divers oiseaux étrangers* (18e eeuw): mandarijneend | 1 |
| Phillips, *A Natural History of the Ducks*: barbarie-eend (zwart-wit) | 1 |
| **Totaal met plaat** | **214** |
| Lege plaat met reden: Turkse tortel, Pontische meeuw, geelpootmeeuw | 3 |
| Nog open | 10 |

- De Sepp-platen hebben oude namen (smient = *Anas penelope*). Daarom staan in `data/namen.json` nu ook GBIF-synoniemen (`scripts/synoniemen.py`).
- Steekproeven bekeken: merel, buizerd, boerenzwaluw, tafeleend, krooneend, toendrarietgans, mandarijneend, Indische gans, barbarie-eend. Afgekeurd na bekijken: een boekband, een rat ("Mus humii"), een Amerikaanse blauwe reiger, een vol vel met eenden.
- Nog open: grote zilverreiger, kleine zilverreiger, koereiger, sneeuwgans, Humes bladkoning, grote Canadese gans, zwarte zwaan, Carolina-eend, zwaangans, ringtaling. Voor de Amerikaanse soorten bestaan Audubon-platen (publiek domein); voor de reigers heeft Naumann platen, maar die staan op Commons zonder naam. Met een BHL-API-sleutel zijn ze gericht te vinden.
- Geen AI-beelden voor ontbrekende soorten: zie `docs/ontwerprichting.md`.

## Open punten

Besloten op 31 oktober 2026:

1. Bronnen toegevoegd: Nederlandsche Vogelen (KB) en gerichte zoektochten op Commons. BHL vraagt een API-sleutel.
2. Stijl: Naumann, dan Sepp, dan Gould, verenigd met papiertint en passe-partout (`docs/ontwerprichting.md`).
3. "Zang" mag ook bij eenden en ganzen.
4. Geen AI-beelden; soorten zonder historische plaat krijgen een lege plaat met reden.

Nog open:

5. GBIF-account in de GitHub-secrets en de omgeving.
6. Titel van de site.
7. De 10 resterende platen.
