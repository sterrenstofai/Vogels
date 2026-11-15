import Link from 'next/link';

export function Knop({ href, children, kleur = '' }: { href: string; children: React.ReactNode; kleur?: string }) {
  return (
    <Link href={href} className={`btn ${kleur}`}>
      <span>{children}</span>
      <b aria-hidden="true">→</b>
    </Link>
  );
}
