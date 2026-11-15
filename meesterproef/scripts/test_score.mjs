// Toets van het beoordelingsmodel: node scripts/test_score.mjs
import assert from "node:assert/strict";
import { CRITERIA, gewogenCijfer, oordeel, toonCijfer, MIN_JURYLEDEN } from "../src/js/score.js";

const alles = (n) => Object.fromEntries(CRITERIA.map((c) => [c.id, n]));
const stem = (jurylid, n, datum = "2026-01-01") => ({ oplossing: "x", jurylid, datum, scores: alles(n) });

assert.equal(CRITERIA.reduce((s, c) => s + c.gewicht, 0), 100, "gewichten tellen op tot 100");
assert.equal(gewogenCijfer(alles(7)), 7);
assert.ok(Math.abs(gewogenCijfer({ impact: 10, betrouwbaarheid: 8, ervaring: 6, verantwoord: 4, originaliteit: 2 }) - 7.0) < 1e-9);
assert.equal(gewogenCijfer({ ...alles(7), impact: 11 }), null, "cijfer boven 10 telt niet");
assert.equal(gewogenCijfer({ impact: 7 }), null, "onvolledige beoordeling telt niet");

assert.equal(oordeel(undefined).aantal, 0);
assert.equal(oordeel([stem("a", 9), stem("b", 9)]).compleet, false, `onder ${MIN_JURYLEDEN} juryleden geen eindcijfer`);
assert.equal(oordeel([stem("a", 9), stem("b", 9)]).eindcijfer, null);

const hoog = oordeel([stem("a", 9), stem("b", 8), stem("c", 8)]);
assert.equal(hoog.compleet, true);
assert.equal(toonCijfer(hoog.eindcijfer), "8,3");
assert.equal(hoog.onderscheiding.id, "meesterproef");
assert.equal(oordeel([stem("a", 7), stem("b", 7), stem("c", 6)]).onderscheiding.id, "eervol");
assert.equal(oordeel([stem("a", 6), stem("b", 6), stem("c", 6)]).onderscheiding, null);
assert.equal(oordeel([stem("a", 8), stem("b", 8), stem("c", 8)]).onderscheiding.id, "meesterproef", "precies 8,0 haalt de drempel");

// Eén jurylid telt één keer, met de laatste beoordeling.
const dubbel = oordeel([stem("a", 2, "2026-01-01"), stem("a", 8, "2026-02-01"), stem("b", 8), stem("c", 8)]);
assert.equal(dubbel.aantal, 3);
assert.equal(toonCijfer(dubbel.eindcijfer), "8,0");
assert.equal(oordeel([stem("a", 9), stem("a", 9), stem("a", 9)]).compleet, false, "drie keer hetzelfde jurylid is geen jury");

console.log("score: alle toetsen geslaagd");

// Bewijsniveau en ranglijst.
import { bewijs, stand, ranglijst } from "../src/js/score.js";
assert.equal(bewijs({ resultaat: null }).niveau, 0);
assert.equal(bewijs({ resultaat: { herkomst: "leverancier" } }).niveau, 1);
assert.equal(bewijs({ resultaat: { herkomst: "onafhankelijk" } }).niveau, 3);
const metOordeel = (id, organisatie, cijfers) => ({ id, organisatie, oordeel: oordeel(cijfers.map((n, i) => stem("j" + i, n))) });
const lijst = [metOordeel("a", "Alfa", [9, 9, 9]), metOordeel("b", "Alfa", [7, 7, 7]), metOordeel("c", "Beta", [9, 9, 9]), metOordeel("d", "Gamma", []), metOordeel("e", "Gamma", []), metOordeel("f", "Gamma", [])];
assert.equal(stand(lijst[0]), "meesterproef");
assert.equal(stand(lijst[3]), "genomineerd");
const rang = ranglijst(lijst, (o) => [o.organisatie]);
assert.deepEqual(rang.map((r) => r.naam), ["Alfa", "Beta", "Gamma"], "onderscheidingen gaan voor aantallen");
assert.equal(rang[0].eervol, 1);
console.log("bewijs en ranglijst: alle toetsen geslaagd");
