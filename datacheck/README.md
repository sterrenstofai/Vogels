# Datacheck-scripts

Python 3, alleen standaardbibliotheek plus `shapely` voor de gemeentescripts. Draai ze vanuit deze map.

| Script | Wat | Uitvoer |
|---|---|---|
| `datacheck.py` | Drie locaties, stralen 500 m / 1 km / 2 km | stdout (`uitkomsten/locaties.json`) |
| `gemeenten.py` | Schatting per gemeente | stdout (`uitkomsten/gemeenten.json`) |
| `gevoeligheid.py` | Tweede rekenwijze per gemeente | stdout |
| `straat.py` | Steekproef van 140 adressen | `straat_rapport.json` |
| `soorten.py` | Soorten per vak per maand, met namen | `twente_soorten.json` (groot, niet in de repo) |
| `xc.py` | xeno-canto per soort | `xc_rapport.json` |
| `platen.py` | Naumann- en Gould-platen op Commons | `platen_raw.json` (niet in de repo) |

De gemeentescripts verwachten de gemeentegrenzen van PDOK:

```
mkdir -p geo
curl -o geo/gemeenten.json "https://api.pdok.nl/kadaster/bestuurlijkegebieden/ogc/v1/collections/gemeentegebied/items?f=json&limit=1000"
python3 gemeenten.py geo/gemeenten.json
```

`xc.py` leest de xeno-canto-sleutel uit de omgevingsvariabele `XC_KEY`. Zet de sleutel nooit in de repo.
