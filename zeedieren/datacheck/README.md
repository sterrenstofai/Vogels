# Datacheck zeedieren (fase 1)

Python 3, alleen standaardbibliotheek (Pillow alleen voor de contactbladen). Draai de scripts vanuit deze map. Het rapport staat in `../docs/fase1-datacheck.md`.

| Script | Wat | Waar het draait | Uitvoer in `uitkomsten/` |
|---|---|---|---|
| `soorten.py` | WoRMS, Wikidata (SPARQL), GBIF en OBIS per dier uit `testset.json` | lokaal | `soorten.json` |
| `cors.py` | welke API's vanuit de browser werken | lokaal | `cors.json` |
| `getij.py` | hoog- en laagwater bij Scheveningen (Rijkswaterstaat ddapi20) | lokaal; op de site via een Action (geen CORS) | `getij_scheveningen_*.json` |
| `strand_november.py` | wat er aanspoelt bij Kijkduin-Scheveningen (ANEMOON SMP via GBIF) | lokaal | `strand_scheveningen_m11.json` |
| `strand_tweede_bron.py` | hetzelfde vak, alle GBIF-meldingen | lokaal | `strand_scheveningen_gbif_m11.json` |
| `wikimedia.py` | licenties van foto's, platen en geluid op Commons, Wikipedia-teksten, en het nakijken van `weetjes.json` | GitHub Action (Wikimedia geeft lokaal 429) | `commons.json`, `wiki/`, `weetjes_nagekeken.json` |
| `contactblad.py` | contactbladen om de beelden met de hand te bekijken | GitHub Action | `contactblad_*.jpg`, `contactblad_*_index.json` |

De Action staat in `.github/workflows/zeedieren_datacheck.yml`. Hij draait bij een push van `wikimedia.py`, `contactblad.py`, `weetjes.json` of `platen_zoekvragen.json` en zet de uitkomsten terug op dezelfde tak.
