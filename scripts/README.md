# Scripts

Bouwen de gegevens per soort in `data/`. Python 3, alleen standaardbibliotheek.

| Script | Invoer | Uitvoer |
|---|---|---|
| `naamtabel.py` | `twente_soorten.json` (uit `datacheck/soorten.py`), twee Wikipedia-lijsten | `data/namen.json` |
| `opnames.py` | `data/namen.json`, xeno-canto API | `data/opnames.json` |
| `platen_keuze.py` | `platen_raw.json` (uit `datacheck/platen.py`), `data/namen.json` | `data/platen.json` |

De Wikipedia-lijsten (wikitext) haal je op met de MediaWiki-API, rustig en met een eigen User-Agent:

```
https://nl.wikipedia.org/w/api.php?action=parse&page=Lijst_van_vogels_in_de_Benelux&prop=wikitext&format=json&formatversion=2
https://nl.wikipedia.org/w/api.php?action=parse&page=Lijst_van_vogels_in_Europa&prop=wikitext&format=json&formatversion=2
```

`opnames.py` leest de xeno-canto-sleutel uit `XC_KEY`. Zet de sleutel nooit in de repo.
