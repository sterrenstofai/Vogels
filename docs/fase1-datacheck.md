# Fase 1: datacheck waarnemingen

Peildatum 31 oktober 2026. Periode: 1 november 2021 t/m 31 oktober 2026. Bron: GBIF occurrence API, vogels (Aves, taxonKey 212), Nederland, alleen records met coördinaten en status "present".

Scripts en ruwe uitkomsten: `datacheck/`.

## De belangrijkste vondst

Observation.org (Waarneming.nl) levert 88% van alle Nederlandse vogelrecords in GBIF: 23,5 van 26,8 miljoen in deze periode. Al die Nederlandse records zijn in GBIF vergroofd tot een vak van 0,05 graad, ongeveer 3,4 × 5,6 km (19 km²):

- de coördinaat is altijd de zuidwesthoek van het vak (`coord = floor(coord × 20) / 20`, zo staat het in `dataGeneralizations`);
- de onzekerheid staat op 5.000 m, maar vanaf de hoek kan de echte afwijking tot ongeveer 6,5 km zijn.

Een zoekstraal rond een adres vangt daardoor alles of niets van een vak. Binnen 2 km van Rossum vallen twee vakhoeken (4.118 records erbij), binnen 2 km van de Oude Markt in Enschede geen enkele (0 records).

## Per locatie en straal

Maanden van januari tot december. "Onbekend" betekent dat de bron geen onzekerheid opgeeft; bij eBird is het punt de plek van een checklist.

### Rossum, Oranjestraat 1 (52,35197 N, 6,92325 O)

| Straal | Waarn. | Soorten | Maanden | Nauwkeurigheid | Bronnen |
|---|---|---|---|---|---|
| 500 m | 25 | 20 | 0 0 19 0 6 0 0 0 0 0 0 0 | 19 onbekend, 2 ≤1 km, 4 1–5 km | eBird 19, Vogeltrekstation 6 |
| 1 km | 29 | 21 | 0 0 19 0 6 4 0 0 0 0 0 0 | 19 onbekend, 2 ≤1 km, 8 1–5 km | eBird 19, Vogeltrekstation 10 |
| 2 km | 4.177 | 111 | 273 428 958 421 618 268 383 228 106 93 248 153 | 4.006 1–5 km | Observation.org 4.118, VTS 40, eBird 19 |
| 2 km zonder Obs.org | 59 | 22 | 0 0 19 0 11 26 3 0 0 0 0 0 | | |

Buiten Observation.org: 2 waarnemers, 8 dagen in 5 jaar.

### Enschede, Oude Markt 3A (52,22050 N, 6,89491 O)

| Straal | Waarn. | Soorten | Maanden | Nauwkeurigheid | Bronnen |
|---|---|---|---|---|---|
| 500 m | 122 | 38 | 0 1 26 12 9 52 6 3 2 11 0 0 | 4 ≤500 m, 77 onbekend, 41 >5 km | iNaturalist 93, eBird 21, Birda 8 |
| 1 km | 332 | 53 | 2 2 81 45 46 68 38 12 12 21 2 3 | 25 ≤500 m, 21 ≤1 km, 245 onbekend, 41 >5 km | iNat 234, eBird 69, VTS 21, Birda 8 |
| 2 km | 1.209 | 68 | 70 6 385 156 167 123 74 45 60 24 30 69 | 175 ≤500 m, 21 ≤1 km, 972 onbekend, 41 >5 km | iNat 1.043, eBird 119, Birda 22, VTS 21, xeno-canto 4 |

Eén iNaturalist-gebruiker levert 974 van de 1.209 records (81%).

### Engbertsdijksvenen (52,47500 N, 6,66806 O; dichtstbijzijnde adres 1,3 km)

| Straal | Waarn. | Soorten | Maanden | Nauwkeurigheid | Bronnen |
|---|---|---|---|---|---|
| 500 m | 58 | 40 | 4 0 8 17 14 0 0 0 6 7 2 0 | 56 onbekend | eBird 51, xeno-canto 5, iNat 2 |
| 1 km | 2.943 | 182 | 201 9 294 802 620 130 44 59 297 358 60 69 | 2.923 onbekend | eBird 2.917 |
| 2 km | 3.404 | 186 | 214 11 313 830 752 141 62 75 339 528 61 78 | 3.351 onbekend, 33 ≤100 m | eBird 3.338, iNat 56, Birda 5, xeno-canto 5 |

2.604 records liggen op één eBird-hotspotpunt, 0,8 km van het middelpunt.

### Het Observation.org-vak waarin elk adres ligt

| Vak | Waarn. | Soorten | Maanden |
|---|---|---|---|
| Rossum | 1.349 | 90 | 51 49 395 136 192 74 148 113 31 13 108 39 |
| Enschede centrum | 52.278 | 143 | 3.186 4.421 6.632 8.598 6.724 6.022 3.097 2.698 2.920 3.146 2.457 2.377 |
| Engbertsdijksvenen | 46.808 | 226 | 1.768 1.533 5.159 11.293 11.495 2.797 1.913 2.734 3.685 2.122 1.262 1.047 |

## Vervaging

- Observation.org: 100% vergroofd (zie boven).
- iNaturalist: 41 records bij de Oude Markt met 9,3 km onzekerheid, gewone soorten (kokmeeuw, fuut, meerkoet). Waarschijnlijk door de waarnemer afgeschermd.
- Binnen de stralen geen records die als gevoelige soort zijn gemarkeerd. Niet getest: of Observation.org en eBird gevoelige soorten helemaal weglaten.

## Bronnen en licenties (datasetniveau)

| Bron | Licentie |
|---|---|
| Observation.org | CC BY-NC 4.0 |
| eBird (EOD) | CC BY 4.0 |
| iNaturalist research-grade | CC BY-NC 4.0 |
| Birda | CC BY-NC 4.0 |
| Vogeltrekstation | CC BY-NC 4.0 |
| xeno-canto | CC BY-NC 4.0 |

## Schatting per gemeente

De 106 vakken over de 14 Twentse gemeenten gelegd en per vak verdeeld naar rato van oppervlak. Tweede rekenwijze ter controle: elk vak in zijn geheel naar de gemeente met het grootste deel.

| Gemeente | km² | Geschat (Obs.org) | Andere rekenwijze | Soorten | ≥50 waarn. | Zwakste maand | Overige bronnen |
|---|---|---|---|---|---|---|---|
| Almelo | 69 | 47.400 | +22% | 183 | 87 | 2.120 | 2.870 |
| Borne | 26 | 6.600 | −59% | 143 | 38 | 318 | 490 |
| Dinkelland | 177 | 48.900 | +1% | 202 | 111 | 1.815 | 1.941 |
| Enschede | 142 | 246.500 | +16% | 237 | 149 | 13.049 | 8.804 |
| Haaksbergen | 105 | 52.700 | −9% | 208 | 116 | 1.226 | 3.746 |
| Hellendoorn | 139 | 47.800 | −12% | 193 | 111 | 1.610 | 4.125 |
| Hengelo | 62 | 48.800 | −47% | 199 | 98 | 2.563 | 3.156 |
| Hof van Twente | 215 | 47.800 | −13% | 205 | 104 | 1.842 | 2.653 |
| Losser | 99 | 45.500 | −4% | 219 | 112 | 2.438 | 8.356 |
| Oldenzaal | 22 | 6.000 | −30% | 134 | 38 | 237 | 83 |
| Rijssen-Holten | 94 | 58.500 | +18% | 199 | 112 | 1.762 | 1.751 |
| Tubbergen | 147 | 24.600 | −56% | 189 | 78 | 803 | 1.231 |
| Twenterand | 108 | 75.800 | +4% | 242 | 139 | 2.615 | 6.219 |
| Wierden | 95 | 70.800 | −4% | 214 | 125 | 2.936 | 1.850 |

Eén vak (52,20–52,25 N, 6,80–6,85 O, met het Kristalbad op de grens van Enschede en Hengelo) bevat 165.000 records, 20% van alle Twentse data. De verdeling over gemeenten is daar niet te bepalen.

## Steekproef straatniveau

140 willekeurige Twentse adressen (per gemeente gelijk verdeeld, willekeurig over het oppervlak). Precieze waarnemingen binnen 500 m (onzekerheid ≤500 m, of eBird):

| | Adressen |
|---|---|
| Geen enkele | 80 (57%) |
| Minstens 1 | 60 (43%) |
| Meer dan 10 | 23 (16%) |
| Meer dan 50 | 4 (3%) |
| Op minstens 5 verschillende dagen | 7 (5%) |

## Besluit

Vijf lagen, van je straat naar steeds wijder, met op elk niveau echte tellingen en geen verdeelsleutels:

1. **Je straat (500 m):** losse precieze meldingen met datum, soort en bron. Vaak leeg, en dat zeggen we.
2. **Je vak (~4 × 6 km):** de lijst "deze vogels kun je hier verwachten", uit Observation.org.
3. **Vak plus buurvakken (~12 × 17 km):** vangt adressen bij de rand van hun vak op.
4. **Je gemeente:** alle vakken die de gemeente raken ("in en rond Hengelo"), niet naar rato verdeeld.
5. **Twente:** de maandkalender per soort.
