import Link from 'next/link';

export default function NietGevonden() {
  return (
    <main className="pagina">
      <div className="wrap stel">
        <h1>Deze pagina bestaat niet.</h1>
        <p>Misschien is de link verlopen of verkeerd overgenomen.</p>
        <Link className="btn" href="/">Naar de voorpagina</Link>
      </div>
    </main>
  );
}
