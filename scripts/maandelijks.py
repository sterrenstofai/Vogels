"""Maandelijkse verversing van de meldingen: steeds de laatste vijf jaar, tot en met de vorige maand.

1. Rekent het venster uit (bijvoorbeeld 1 december 2021 t/m 30 november 2026).
2. Haalt per vak de soorten en maanden op bij GBIF (datacheck/soorten.py).
3. Bouwt site/data opnieuw (scripts/bouw_sitedata.py).
4. Zet de nieuwe datums in de teksten van de site.

Alleen soorten die al op de site staan, worden bijgewerkt. Een nieuwe soort in Twente
krijgt pas een pagina na een handmatige ronde (namen, opnames, plaat); het script meldt ze wel.
GBIF vraagt geen inlog voor deze zoekvragen.
Gebruik vanuit de repo-root: python3 scripts/maandelijks.py [JJJJ-MM-DD als einddatum]
"""
import datetime as dt, glob, json, os, re, subprocess, sys

MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"]
GEO = "data/geo/twente_gemeenten.json"


def lang(d):
    return f"{d.day} {MAANDEN[d.month - 1]} {d.year}"


def venster(eind=None):
    if eind is None:
        eind = dt.date.today().replace(day=1) - dt.timedelta(days=1)  # laatste dag van vorige maand
    eind = (eind.replace(day=28) + dt.timedelta(days=4)).replace(day=1) - dt.timedelta(days=1)  # altijd een maandeinde
    begin = (eind + dt.timedelta(days=1)).replace(year=eind.year - 5)  # de 1e van een maand bestaat elk jaar
    return begin, eind


def teksten(begin, eind):
    oud = re.compile(r"\d{1,2} (?:%s) \d{4} tot en met \d{1,2} (?:%s) \d{4}" % ("|".join(MAANDEN), "|".join(MAANDEN)))
    nieuw = f"{lang(begin)} tot en met {lang(eind)}"
    for pad in ["site/index.html", "site/hoe-dit-werkt.html"]:
        s = open(pad, encoding="utf-8").read()
        s = oud.sub(nieuw, s)
        s = re.sub(r"Peildatum \d{1,2} \w+ \d{4}", f"Peildatum {lang(eind)}", s)
        s = re.sub(r"eventDate=\d{4}-\d{2}-\d{2},\d{4}-\d{2}-\d{2}", f"eventDate={begin},{eind}", s)
        open(pad, "w", encoding="utf-8").write(s)


def main():
    eind = dt.date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else None
    begin, eind = venster(eind)
    huidig = dt.date.fromisoformat(json.load(open("site/data/meta.json"))["peildatum"])
    if eind <= huidig:
        print(f"De site loopt al tot {huidig}; niets te doen.")
        return
    env = {**os.environ, "VOGGELS_PERIODE": f"{begin},{eind}"}
    print("venster", begin, eind, flush=True)

    subprocess.run([sys.executable, "soorten.py", os.path.abspath(GEO)], cwd="datacheck", env=env, check=True)

    for f in glob.glob("site/data/precies/*.json"):  # vakken zonder nieuwe precieze meldingen niet laten staan
        os.remove(f)
    subprocess.run([sys.executable, "scripts/bouw_sitedata.py", "datacheck/twente_soorten.json", GEO, "site/data"], env=env, check=True)
    teksten(begin, eind)

    T = json.load(open("datacheck/twente_soorten.json"))
    bekend = json.load(open("data/soorten_slugs.json"))
    nieuw = sorted(((c, T["namen"][k]["nl"] or T["namen"][k]["wet"]) for k, c in T["totaal"].items() if k not in bekend and c >= 50), reverse=True)
    if nieuw:
        print("Nieuwe soorten met 50+ meldingen, nog zonder pagina:", ", ".join(f"{n} ({c})" for c, n in nieuw))


if __name__ == "__main__":
    main()
