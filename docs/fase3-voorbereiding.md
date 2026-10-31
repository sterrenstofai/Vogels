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

Regel: minstens 800 px breed; Naumann boven Gould; een plaat met alleen deze soort; publiek domein of "no restrictions"; de grootste.

- Met plaat: 184 soorten (156 Naumann, 28 Gould). 14 smaller dan 800 px, 73 smaller dan 1.000 px. 28 platen tonen meer soorten.
- Steekproef bekeken (merel, buizerd, boerenzwaluw): echte platen. Naumann tekent in een landschap, Gould op een witte achtergrond.
- Zonder plaat, inheems (33, met waarnemingen in Twente): zwarte kraai (20.972), blauwe reiger (14.099), dodaars (11.608), kuifeend (10.997), Turkse tortel (9.069), geelgors (9.000), grote zilverreiger (8.992), aalscholver (7.223), kraanvogel (6.121), zwarte specht (5.569), gierzwaluw (4.643), kneu (3.788), tafeleend (3.587), veldleeuwerik (2.684), patrijs (2.151), smient (1.883), Pontische meeuw (1.318), kramsvogel (1.131), grote zaagbek (762), visdief (622), toendrarietgans (609), brilduiker (402), sneeuwgans (279), krooneend (263), witoogeend (249), geelpootmeeuw (170), koereiger (127), Humes bladkoning (107), frater (104), topper (100), kleine zilverreiger (76), grote zee-eend (61), roodhalsfuut (54).
- Zonder plaat, exoot of ontsnapt (10): fazant, grote Canadese gans, mandarijneend, zwarte zwaan, barbarie-eend, Carolina-eend, zwaangans, Indische gans, helmparelhoen, ringtaling.

## Open punten

1. **Platen voor de 33 inheemse gaten.** Naumann heeft vrijwel al deze soorten. Opties: de 188 naamloze Naumann-scans op Commons met de hand koppelen; de Biodiversity Heritage Library (biodiversitylibrary.org op de netwerklijst); of Nozeman & Sepp, *Nederlandsche Vogelen*, als Nederlandse aanvulling.
2. **Stijlverschil Naumann en Gould.** Accepteren, of alleen Naumann gebruiken en de rest als gat behandelen.
3. **"Zang" bij eenden, ganzen en andere niet-zangvogels.** xeno-canto noemt sommige opnames "song". Tonen als zang, of bij die groepen alleen "geluid".
4. **Exoten zonder plaat.** Geen plaat tonen, of een neutrale tekening.
5. **GBIF-account** voor de maandelijkse download met DOI.
6. **Werktitel** van de site.
