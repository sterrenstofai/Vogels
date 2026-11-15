import type { Story } from '@/lib/stories';

// Eén omslagontwerp voor de hele reeks: een horizon van licht in de kleur van het verhaal.
const TINTEN: Record<string, React.CSSProperties> = {
  ruimteschipper: { '--k0': '#05071a', '--k1': '#0b1440', '--k2': '#2643b8', '--k3': '#8fb1ff' } as React.CSSProperties,
  duikboot: { '--k0': '#031a1c', '--k1': '#06383d', '--k2': '#0f8f8a', '--k3': '#9af0df', '--stip': '.25' } as React.CSSProperties,
  boswachter: { '--k0': '#0a140c', '--k1': '#16301c', '--k2': '#4d8a45', '--k3': '#f1e6a8', '--stip': '.45' } as React.CSSProperties,
};

function Voorkant({ story, naam }: { story: Story; naam?: string }) {
  return (
    <>
      <i className="lucht" /><i className="stip" /><i className="bol" /><i className="vouw" />
      <div className="t">{story.titel}</div>
      {naam && <div className="n">met {naam} in de hoofdrol</div>}
      <div className="m">Hoofdrol</div>
    </>
  );
}

// Plat omslag, voor in een overzicht.
export function Cover({ story, naam }: { story: Story; naam?: string }) {
  return <div className="plat" style={TINTEN[story.slug]} aria-hidden="true"><Voorkant story={story} naam={naam} /></div>;
}

// Het boek als voorwerp, schuin gezien.
export function Boek({ story, naam }: { story: Story; naam?: string }) {
  return (
    <div className="boek" role="img" aria-label={`Het boek ${story.titel}`}>
      <div className="boek-in">
        <div className="achter" />
        <div className="blok" />
        <div className="kaft" style={TINTEN[story.slug]}><Voorkant story={story} naam={naam} /></div>
      </div>
    </div>
  );
}
