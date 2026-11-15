// Alle voertuigen op de site, in de volgorde van de keuzelijst. De fiets heeft een eigen app (app.js, met bouwstappen);
// de rest is een module in /js/voertuigen/<slug>.js voor /js/kern.js. Het plaatje staat in /iconen/<slug>.svg.
export const VOERTUIGEN = [
  { slug: "fiets", naam: "de fiets", label: "Fiets", groep: "op wielen", zin: "Een racefiets met een motortje: een frame, twee wielen, een ketting en een accu." },
  { slug: "step", naam: "de step", label: "Step", groep: "op wielen", zin: "Een step zonder motor: je zet af met je voet en remt met je voet op het spatbord." },
  { slug: "skateboard", naam: "het skateboard", label: "Skateboard", groep: "op wielen", zin: "Een plank van zeven laagjes hout op twee trucks met vier wieltjes." },
  { slug: "trekker", naam: "de trekker", label: "Trekker", groep: "op de weg", zin: "Een trekker trekt en duwt machines over het land: een ploeg, een maaier of een kar." },
  { slug: "vrachtwagen", naam: "de vrachtwagen", label: "Vrachtwagen", groep: "op de weg", zin: "Een trekker met een oplegger: de cabine voorop, de lading achterop." },
  { slug: "bus", naam: "de bus", label: "Bus", groep: "op de weg", zin: "Een elektrische stadsbus met een lage vloer en drie dubbele deuren." },
  { slug: "brandweerauto", naam: "de brandweerauto", label: "Brandweerauto", groep: "op de weg", zin: "Een tankautospuit: water, een pomp, slangen, een ladder en plek voor zes mensen." },
  { slug: "vuilniswagen", naam: "de vuilniswagen", label: "Vuilniswagen", groep: "op de weg", zin: "Een achterlader die containers optilt, omkiept en het afval samenperst." },
  { slug: "trein", naam: "de trein", label: "Trein", groep: "op het spoor", zin: "Een elektrische trein op het spoor, met stroom uit de draad erboven." },
  { slug: "boot", naam: "de boot", label: "Boot", groep: "op het water", zin: "Een binnenvaartschip dat zand over rivieren en kanalen vaart." },
  { slug: "vliegtuig", naam: "het vliegtuig", label: "Vliegtuig", groep: "in de lucht", zin: "Een passagiersvliegtuig met twee motoren onder de vleugels." },
];
// alleen wat er al is (een voertuig in aanbouw staat er nog niet in)
export const KLAAR = new Set(["fiets", "step", "skateboard", "trekker", "vrachtwagen", "bus", "brandweerauto", "vuilniswagen", "trein", "vliegtuig", "boot"]);
export const lijst = () => VOERTUIGEN.filter((v) => KLAAR.has(v.slug));
export const pad = (v, kind = false) => (kind ? "/kinderen/" : "/") + v.slug;
