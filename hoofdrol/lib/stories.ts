// De verhalen. De tekst van "De ruimteschipper" is een plaatshouder:
// vervang `scenes` door de echte tekst en beeldbeschrijvingen van het boekje.
// {naam} wordt vervangen door de naam van het kind.

export type Scene = { tekst: string; beeld: string };
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
    stijl: 'Warme, kleurrijke prentenboekillustratie, zachte vormen, heldere kleuren, vriendelijk en nooit eng. Het kind uit de foto is de hoofdpersoon en blijft op elke plaat herkenbaar.',
    scenes: [
      { tekst: 'Ik ben {naam}. Ik ben ruimteschipper.', beeld: 'Het kind staat trots in een ruimtepak voor een kleine raket in de tuin.' },
      { tekst: 'Dit is mijn raket. Hij is rood en heel snel.', beeld: 'Een rode raket met ronde raampjes, het kind aait de neus van de raket.' },
      { tekst: 'Helm op. Riem vast. Klaar!', beeld: 'Het kind zit in de stoel van de raket en klikt de riem dicht.' },
      { tekst: 'Drie, twee, een. Daar ga ik!', beeld: 'De raket stijgt op boven de daken, vuur en rook, het kind juicht achter het raam.' },
      { tekst: 'Dag huis. Dag boom. Dag wolk.', beeld: 'Uitzicht uit het raampje: het huis en de boom worden klein onder de wolken.' },
      { tekst: 'Kijk, de maan! De maan is van steen.', beeld: 'De raket landt op de maan, het kind stapt uit in het grijze stof.' },
      { tekst: 'Ik spring. Ik zweef. Ik lach.', beeld: 'Het kind springt hoog boven het maanoppervlak, de aarde op de achtergrond.' },
      { tekst: 'Wie is dat? Het is een ster met een staart.', beeld: 'Een vrolijke komeet met een lange staart zoeft langs, het kind zwaait.' },
      { tekst: 'Ik vlieg langs een ring. Het is een ring van ijs.', beeld: 'De raket vliegt langs een planeet met ringen, glinsterende ijsstukjes.' },
      { tekst: 'Nu heb ik trek. Ik eet een boterham in de ruimte.', beeld: 'Het kind eet zwevend een boterham in de raket, kruimels zweven rond.' },
      { tekst: 'De aarde roept. Ik ga weer naar huis.', beeld: 'De blauwe aarde groot in beeld, de raket draait om en vliegt terug.' },
      { tekst: 'Ik ben {naam}. Morgen vlieg ik weer.', beeld: 'Het kind ligt in bed met de helm op het nachtkastje, sterren door het raam.' },
    ],
  },
  {
    slug: 'duikboot',
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
