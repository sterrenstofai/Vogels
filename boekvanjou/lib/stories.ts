// De verhalen. De tekst van "De ruimteschipper" is een plaatshouder:
// vervang `scenes` door de echte tekst en beeldbeschrijvingen van het boekje.
// {naam} wordt vervangen door de naam van het kind.

// tekst: wat er in het boek staat. beeld: wat de klant in het voorbeeld leest.
// prompt: de opdracht voor het beeldmodel (Engels werkt daar het best).
export type Scene = { tekst: string; beeld: string; prompt: string };
export type Story = {
  slug: string;
  titel: string;
  ondertitel: string;
  kort: string;
  leeftijd: string;
  kleur: string; // kaartkleur
  accent: string;
  tags: string[];
  beschikbaar: boolean;
  omslag?: string; // plaat voor op de omslag
  voorbeeld?: { naam: string }; // er staat een voorbeeldboek in public/voorbeeld/<slug>/
  stijl: string; // vaste stijlomschrijving voor alle beelden
  scenes: Scene[];
};

export const STORIES: Story[] = [
  {
    slug: 'ruimteschipper',
    titel: 'De ruimteschipper',
    ondertitel: 'Een reis langs de sterren',
    kort: 'Helm op, riem vast, aftellen maar. Jouw kind vliegt met een eigen raket naar de maan en nog een stukje verder.',
    leeftijd: '4 tot 8 jaar',
    kleur: '#1d2b8f',
    accent: '#ffd23f',
    tags: ['Ruimte', 'Avontuur', 'Zelf lezen'],
    beschikbaar: true,
    omslag: '/voorbeeld/ruimteschipper/plaat-0.jpg',
    voorbeeld: { naam: 'Sam' },
    stijl: "Children's picture book illustration, warm hand-painted gouache style with soft shapes and bright friendly colours, never scary. The child wears a white spacesuit with red details unless the scene says otherwise.",
    scenes: [
      { tekst: 'Ik ben {naam}. Ik ben ruimteschipper.', beeld: 'Het kind staat trots in een ruimtepak voor een kleine raket in de tuin.', prompt: "the child stands proudly in a white spacesuit, helmet under one arm, in front of a small red rocket in a back garden at sunrise" },
      { tekst: 'Dit is mijn raket. Hij is rood en heel snel.', beeld: 'Een rode raket met ronde raampjes, het kind aait de neus van de raket.', prompt: "a small red rocket with round windows stands in the back garden; the child gently pats the nose of the rocket" },
      { tekst: 'Helm op. Riem vast. Klaar!', beeld: 'Het kind zit in de stoel van de raket en klikt de riem dicht.', prompt: "inside the cosy rocket cockpit, the child sits in the pilot seat wearing the helmet with open visor and clicks the seat belt shut, buttons and dials around" },
      { tekst: 'Drie, twee, een. Daar ga ik!', beeld: 'De raket stijgt op boven de daken, vuur en rook, het kind juicht achter het raam.', prompt: "the red rocket lifts off above the rooftops of a Dutch village with soft fire and puffy smoke; the child cheers behind the round window" },
      { tekst: 'Dag huis. Dag boom. Dag wolk.', beeld: 'Uitzicht uit het raampje: het huis en de boom worden klein onder de wolken.', prompt: "seen from inside the rocket, the child looks out of a big round window and waves; far below a tiny house and a tree get small under fluffy clouds" },
      { tekst: 'Kijk, de maan! De maan is van steen.', beeld: 'De raket landt op de maan, het kind stapt uit in het grijze stof.', prompt: "the red rocket has landed on the grey moon; the child, in a clear glass helmet, steps out onto the dusty stony surface under a deep blue starry sky" },
      { tekst: 'Ik spring. Ik zweef. Ik lach.', beeld: 'Het kind springt hoog boven het maanoppervlak, de aarde op de achtergrond.', prompt: "the child, in a clear glass helmet, jumps high above the moon surface, arms wide, laughing, floating; the blue Earth in the starry sky behind" },
      { tekst: 'Wie is dat? Het is een ster met een staart.', beeld: 'Een vrolijke komeet met een lange staart zoeft langs, het kind zwaait.', prompt: "standing on the moon in a clear glass helmet, the child waves at a cheerful glowing comet with a long sparkling tail zooming across the starry sky" },
      { tekst: 'Ik vlieg langs een ring. Het is een ring van ijs.', beeld: 'De raket vliegt langs een planeet met ringen, glinsterende ijsstukjes.', prompt: "the small red rocket flies past a big ringed planet with glittering rings made of ice chunks; the child looks out of the round window in wonder" },
      { tekst: 'Nu heb ik trek. Ik eet een boterham in de ruimte.', beeld: 'Het kind eet zwevend een boterham in de raket, kruimels zweven rond.', prompt: "weightless inside the rocket, without helmet, the child floats and happily eats a sandwich while crumbs float all around; stars through the window" },
      { tekst: 'De aarde roept. Ik ga weer naar huis.', beeld: 'De blauwe aarde groot in beeld, de raket draait om en vliegt terug.', prompt: "the big blue Earth fills half the picture; the small red rocket turns around and flies back towards it, the child steering behind the round window" },
      { tekst: 'Ik ben {naam}. Morgen vlieg ik weer.', beeld: 'Het kind ligt in bed met de helm op het nachtkastje, sterren door het raam.', prompt: "the child, now in star pyjamas, lies cosy in bed at night, smiling with eyes almost closed, the space helmet on the bedside table, stars and a moon through the bedroom window, a toy rocket on the shelf" },
    ],
  },
  {
    slug: 'duikboot',
    omslag: '/omslag/duikboot.jpg',
    titel: 'De duikbootkapitein',
    ondertitel: 'Diep onder de golven',
    kort: 'Een gele duikboot, een inktvis die verstoppertje speelt en een schat die anders is dan je denkt.',
    leeftijd: '4 tot 8 jaar',
    kleur: '#0aa3a3',
    accent: '#ff9f1c',
    tags: ['Zee', 'Dieren'],
    beschikbaar: false,
    stijl: '',
    scenes: [],
  },
  {
    slug: 'boswachter',
    omslag: '/omslag/boswachter.jpg',
    titel: 'De boswachter',
    ondertitel: 'Een nacht in het bos',
    kort: 'Met een zaklamp en een thermos warme chocomelk op zoek naar de uil die niet kan slapen.',
    leeftijd: '4 tot 8 jaar',
    kleur: '#2f7d4f',
    accent: '#ffc2e2',
    tags: ['Natuur', 'Dieren'],
    beschikbaar: false,
    stijl: '',
    scenes: [],
  },
];

export const getStory = (slug: string) => STORIES.find((s) => s.slug === slug);
export const vulNaam = (tekst: string, naam: string) => tekst.replaceAll('{naam}', naam);

// De platen van het voorbeeldboek. Het kind daarin is verzonnen.
export const voorbeeldPlaten = (s: Story) => (s.voorbeeld ? s.scenes.map((_, i) => `/voorbeeld/${s.slug}/plaat-${i}.jpg`) : undefined);
