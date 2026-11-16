const NAMEN = ['Ontwerp', 'Voorbeeld', 'Bestellen', 'Foto', 'Nakijken'];

// Waar de klant is in het maken van het boek.
export function Stappen({ nu }: { nu: number }) {
  return (
    <ol className="route" aria-label="Stappen">
      {NAMEN.map((n, i) => (
        <li key={n} className={i < nu ? 'af' : i === nu ? 'nu' : ''} aria-current={i === nu ? 'step' : undefined}>{n}</li>
      ))}
    </ol>
  );
}
