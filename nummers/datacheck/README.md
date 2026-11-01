# Datacheck fase 1

Draaien vanuit deze map, Python 3, alleen standaardbibliotheek (plus `ffprobe` voor previews).

| Script | Wat | Uitkomst |
|---|---|---|
| `nummers.py` | de testset | |
| `musicbrainz.py` | credits en samples per opname (zoeken op opname) | `uitkomsten/musicbrainz.json` |
| `musicbrainz_album.py` | idem, via het oorspronkelijke album | `uitkomsten/musicbrainz_album.json` |
| `musicbrainz_vast.py` | beste opname uit beide routes, met artiest per sample | `uitkomsten/musicbrainz_vast.json` |
| `discogs.py` | credits per release (hoofdrelease plus twaalf oudste versies) | `uitkomsten/discogs.json` |
| `previews.py` | preview bij iTunes en Deezer: lengte, formaat, CORS (bewaart geen audio) | `uitkomsten/previews.json` |
| `wikidata_sparql.py` | foto (P18) en Nederlandse naam per instrument | `uitkomsten/wikidata.json` |
| `beeld.py` | vrije foto's in het Met (afdeling Musical Instruments) | `uitkomsten/met.json` |

De Demucs-proef draaide los, buiten de repo, op gedownloade previews (`pip install demucs`, `python -m demucs -n htdemucs <bestand>`). De previews en sporen zijn niet bewaard.
