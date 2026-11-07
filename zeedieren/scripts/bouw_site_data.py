"""Bouwt de data voor de site uit de lagen in data/:
- data/soorten.json      de lijst (met de hand);
- data/ruw/<slug>.json   automatisch uit open bronnen (scripts/ruw_ophalen.py);
- data/handwerk/<slug>.json  met de hand, met een bron en een controlezin per weetje;
- data/nagekeken.json    welke controlezinnen op de bronpagina staan (scripts/nakijken.py);
- data/beelden.json      foto's, platen en geluid met maker en licentie (scripts/beelden_ophalen.py);
- data/beeld_keuze.json  wat we gekozen hebben, en waarom er soms geen foto is;
- data/veiligheid.json   veiligheidszinnen met bronnen;
- site/data/strand.json  wat aanspoelt per maand (scripts/strand.py).
Schrijft site/data/dieren.json, site/data/dier/<slug>.json en de nette adressen in netlify.toml.
Alleen standaardbibliotheek. Draai: python3 scripts/bouw_site_data.py"""
import json, re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA, SITE = ROOT / "data", ROOT / "site"
lees = lambda p, standaard=None: json.loads(p.read_text()) if p.exists() else standaard

PLAAT_WERK = [
    (r"Iconographia Zoologica", "Iconographia Zoologica (Artis-bibliotheek, Universiteit van Amsterdam)", "1700–1880"),
    (r"Bloch|Ichthyologie|Ichtyologie|Oeconomische Naturgeschichte|Ökonomische Naturgeschichte", "Marcus Elieser Bloch, Ichthyologie", "1782–1795"),
    (r"Haeckel|Kunstformen", "Ernst Haeckel, Kunstformen der Natur", "1904"),
    (r"LCCN", "Prent uit de Library of Congress", ""),
    (r"Octopusvulgaris", "Comingio Merculiano, Fauna und Flora des Golfes von Neapel", "1896"),
    (r"Sperm whale and Bottlenose", "Oude prent van een potvis (en een butskop)", ""),
]

def plaat_werk(titel):
    for patroon, werk, jaar in PLAAT_WERK:
        if re.search(patroon, titel):
            return werk, jaar
    return None, None

def wiki_titel(url):
    from urllib.parse import unquote
    return unquote(url.rsplit("/wiki/", 1)[-1]).replace("_", " ")

def main():
    soorten = lees(DATA / "soorten.json")
    beelden = lees(DATA / "beelden.json", {})
    keuze = lees(DATA / "beeld_keuze.json", {})
    nagekeken = lees(DATA / "nagekeken.json", {})
    veilig = lees(DATA / "veiligheid.json", {})
    strand = lees(SITE / "data" / "strand.json", {})
    smp = {}   # slug -> aandeel per maand
    for key, s in (strand.get("soorten") or {}).items():
        if s.get("slug"):
            smp[s["slug"]] = [dict(strand["maanden"][str(m)]["soorten"]).get(key, 0) for m in range(1, 13)]
    (SITE / "data" / "dier").mkdir(parents=True, exist_ok=True)
    lijst = []
    for s in soorten:
        slug = s["slug"]
        ruw = lees(DATA / "ruw" / f"{slug}.json", {})
        hw = lees(DATA / "handwerk" / f"{slug}.json", {})
        bl = beelden.get(slug, {})
        kz = keuze.get(slug, {})
        nk = nagekeken.get(slug, {})
        het = s["naam"].startswith("het ")
        weetjes = []
        for i, w in enumerate(hw.get("weetjes", [])):
            gevonden = bool((nk.get("weetjes") or [])[i]) if i < len(nk.get("weetjes") or []) else False
            weetjes.append({"sectie": w["sectie"], "tekst": w["tekst"], "bron": w["bron"], "bron_titel": wiki_titel(w["bron"]),
                            "controle": w["controle"], "gevonden": gevonden, "datum": nk.get("datum")})
        lengte_ok = hw.get("lengte_cm") and hw.get("lengte_weetje") is not None and hw["lengte_weetje"] < len(weetjes) and weetjes[hw["lengte_weetje"]]["gevonden"]
        foto = plaat = geluid = None
        if bl.get("foto"):
            f = bl["foto"]
            foto = {"pad": f"/fotos/{slug}.webp", "klein": f"/fotos/klein/{slug}.webp", "breed": f["breed"], "hoog": f["hoog"], "maker": f["maker"],
                    "licentie": f["licentie"], "licentie_url": f.get("licentie_url"), "pagina": f["pagina"], "waar": kz.get("foto_waar"), "alt": kz.get("foto_alt")}
        if bl.get("plaat"):
            p = bl["plaat"]; werk, jaar = plaat_werk(p["titel"])
            plaat = {"pad": f"/platen/{slug}.webp", "klein": f"/platen/klein/{slug}.webp", "breed": p["breed"], "hoog": p["hoog"], "maker": p["maker"],
                     "licentie": p["licentie"], "pagina": p["pagina"], "werk": werk, "jaar": jaar}
        if bl.get("geluid") and kz.get("geluid"):
            g = bl["geluid"]
            geluid = {"pad": f"/klanken/{slug}.m4a", "maker": g["maker"] or "onbekend", "licentie": g["licentie"], "pagina": g["pagina"],
                      "wat": kz["geluid"].get("wat"), "noot": kz["geluid"].get("noot")}
        gb = ruw.get("gbif", {})
        kust = (gb.get("kust") or {}).get("per_maand") or [0] * 12
        ncp = (gb.get("ncp") or {}).get("per_maand") or [0] * 12
        som = [a + b for a, b in zip(kust, ncp)]
        veiligheid = None
        if slug in (veilig.get("dieren") or {}):
            groepen = [veilig["groepen"][g] for g in veilig["dieren"][slug]]
            bronnen = [veilig["_bronnen"][b] for g in groepen for b in g["bronnen"]]
            veiligheid = {"zinnen": [z for g in groepen for z in g["zinnen"]], "bronnen": list(dict.fromkeys(map(tuple, bronnen)))}
        worms = ruw.get("worms", {})
        ook = [n for n in worms.get("nl_namen", []) if n.lower() != s["naam"].split(" ", 1)[1].lower()][:6]
        d = {
            "slug": slug, "naam": s["naam"], "wet": worms.get("geldige_naam") or s["wet"], "groep": s["groep"], "plek": s["plek"], "ook": ook,
            "hij": "het" if het else "hij", "hem": "het" if het else "hem",
            "kort": hw.get("kort", ""),
            "lengte_cm": hw.get("lengte_cm") if lengte_ok else None, "lengte_tekst": hw.get("lengte_tekst") if lengte_ok else None,
            "lengte_kort": hw.get("lengte_kort") if lengte_ok else None, "lengte_bron": hw.get("lengte_weetje") if lengte_ok else None,
            "foto": foto, "foto_niet": kz.get("foto_niet"), "plaat": plaat, "geluid": geluid,
            "maanden": {"kust": kust, "ncp": ncp}, "vaakst": som.index(max(som)) if max(som) > 0 else None,
            "strand": smp.get(slug), "strand_jaren": "–".join(map(str, strand.get("jaren", []))) if smp.get(slug) else None,
            "vakken": (ruw.get("obis") or {}).get("vakken", []),
            "weetjes": weetjes, "nagekeken": nk.get("datum"), "veiligheid": veiligheid,
            "worms": worms.get("url"), "wikipedia": (ruw.get("wikidata") or {}).get("nlwiki"),
        }
        (SITE / "data" / "dier" / f"{slug}.json").write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")))
        labels = (["foto"] if foto else []) + (["plaat"] if plaat else []) + (["geluid"] if geluid else [])
        lijst.append({"slug": slug, "naam": s["naam"], "wet": d["wet"], "groep": s["groep"], "plek": s["plek"], "ook": ook, "kort": d["kort"],
                      "klein": (foto or plaat or {}).get("klein"), "beeld": (foto or plaat or {}).get("pad"), "beeld_soort": "foto" if foto else ("tekening" if plaat else None),
                      "bron_kind": (f"{(foto or plaat)['maker'][:40]}, {(foto or plaat)['licentie']}" if (foto or plaat) else None),
                      "bron_kind_url": (foto or plaat or {}).get("pagina"), "labels": labels,
                      "weetjes": sum(w["gevonden"] for w in weetjes), "geluid": geluid["pad"] if geluid else None, "lengte_cm": d["lengte_cm"],
                      "strand_nu": smp.get(slug), "maanden": som})
    (SITE / "data" / "dieren.json").write_text(json.dumps({"gebouwd": date.today().isoformat(), "dieren": lijst}, ensure_ascii=False, separators=(",", ":")))
    # nette adressen: /<slug> en /kinderen/<slug>
    toml = (ROOT / "netlify.toml").read_text()
    blok = "# BEGIN dieren (gebouwd door scripts/bouw_site_data.py)\n" + "".join(
        f'[[redirects]]\n  from = "/{s["slug"]}"\n  to = "/dier.html"\n  status = 200\n\n[[redirects]]\n  from = "/kinderen/{s["slug"]}"\n  to = "/kinderen.html"\n  status = 200\n\n'
        for s in soorten) + "# EINDE dieren\n"
    toml = re.sub(r"# BEGIN dieren.*?# EINDE dieren\n", lambda m: blok, toml, flags=re.S) if "# BEGIN dieren" in toml else toml + "\n" + blok
    (ROOT / "netlify.toml").write_text(toml)
    print(len(lijst), "dieren;", sum(x["weetjes"] for x in lijst), "weetjes nagekeken;", sum(1 for x in lijst if "foto" in x["labels"]), "met foto")

if __name__ == "__main__":
    main()
