# Fase 2: geluid, platen en opzet van de data

Peildatum 31 oktober 2026. Uitgangspunt: de 227 soorten met minstens 50 Observation.org-waarnemingen in de 106 Twentse vakken (329 in totaal: 325 soorten en 4 hybriden). Scripts: `datacheck/soorten.py`, `datacheck/xc.py`, `datacheck/platen.py`.

## Geluid (xeno-canto API v3)

| | Soorten |
|---|---|
| Opnames van kwaliteit A of B ergens in Europa | 227 |
| A/B uit NL/BE/DE, zonder ND-licentie | 209 |
| Daarvan minstens 5 opnames | 194 |
| Met zang (A/B, NL/BE/DE, zonder ND) | 169 |
| Met roep (idem) | 208 |

- Zonder bruikbare opname dichtbij (18, GBIF-namen): barbarie-eend, bokje, "bonte klaauwier", grijze wouw, helmparelhoen, huifduiker, kemphaan, koereiger, ringtaling, roodpootvalk, ruigpootbuizerd, smelleken, sneeuwgans, steppevorkstaartplevier, Temmincks strandloper, toppereend, zwarte ooievaar, nonnetje. Vooral exoten, wintergasten en zeldzaamheden. Voor deze soorten een opname uit elders in Europa.
- Licenties van A/B-opnames in Europa: 81% CC BY-NC-SA, 17% CC BY-NC-ND, minder dan 3% ruimer. Bij alle opnames staat de opnemer vermeld.
- We kiezen alleen opnames zonder ND, zodat een meelopend spectrogram geen licentievraag oproept.
- De geluidsbestanden hebben `Access-Control-Allow-Origin: *`: een live spectrogram in de browser werkt.
- De API-sleutel hoort niet in de browser. De keuze van opnames gebeurt vooraf.
- Wetenschappelijke namen verschillen soms tussen GBIF en xeno-canto (Sylvia/Curruca, Porzana/Zapornia). De GBIF-naam van de fluiter bevat een tikfout (`sibillatrix`). Er is een eigen naamtabel nodig.

## Platen (Wikimedia Commons)

- 1.424 bestanden onder Naumann (*Naturgeschichte der Vögel Mitteleuropas*) en Gould (*The Birds of Europe*).
- Automatisch gekoppeld: 184 van de 227 soorten (85 beide, 84 alleen Naumann, 15 alleen Gould). Bijna alles is publiek domein of "no restrictions".
- 43 soorten zonder plaat. Ongeveer 15 zijn exoten of moderne splitsingen. Ook gewone soorten ontbreken (blauwe reiger, zwarte kraai, dodaars, kuifeend, geelgors, gierzwaluw, veldleeuwerik): 188 platen op Commons hebben geen soortnaam of soortcategorie en moeten met de hand gekoppeld worden.
- Alternatieven: de Naumann-scans bij de Biodiversity Heritage Library, en Nozeman & Sepp, *Nederlandsche Vogelen* (1770–1829).
- Bij 44 soorten is de beste plaat smaller dan 1.000 px.
- Commons beperkt het aantal verzoeken (HTTP 429); scripts moeten rustig vragen.

## Opzet van de data

- Vakken met soorten per maand: 387 kB, gzip 91 kB. Per vak mediaan 3,5 kB.
- Precieze waarnemingen in Twente (niet Observation.org): ongeveer 47.000, vooral eBird (32.600), Vogeltrekstation (9.900), iNaturalist (2.900), Birda (1.400). Na het filter op ≤500 m onzekerheid minder.
- Maandelijks verversen met een GitHub Action, die commit; Netlify publiceert. Voor citatie met DOI een GBIF-download (GBIF-account als GitHub-secret).
- Privacy: de browser haalt data van de eigen site. Alleen PDOK ziet het ingetypte adres. xeno-canto ziet welke soort je afspeelt, niet waar je woont. Platen zelf hosten.

## Overig

- Nederlandse namen in GBIF zijn rommelig ("Ijslandse strandloper", "nonnetje"). Eigen namenlijst nodig.
- Exoten (mandarijneend, Indische gans) tonen met een label "ontsnapt of uitgezet".
- Bijna alle data en geluiden zijn NC: de site blijft vrij van betaalde aanbiedingen en advertenties.

## Toon (bomeninamsterdam.nl)

Overnemen: exacte getallen met peildatum, de letterlijke API-aanroepen op de methodepagina, per bron wat is weggelaten en waarom, een kale lijst "Wat de site niet kan", privacy in twee zinnen.
