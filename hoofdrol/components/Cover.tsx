import type { Story } from '@/lib/stories';

const ster = (x: number, y: number, r: number, k = '#fff') => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={k} />;

function Art({ slug, accent }: { slug: string; accent: string }) {
  if (slug === 'duikboot')
    return (
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <path d="M0 150 Q50 130 100 150 T200 150 V200 H0Z" fill="#067a7a" />
        <g transform="rotate(-8 100 120)">
          <rect x="55" y="96" width="100" height="50" rx="25" fill={accent} />
          <rect x="92" y="78" width="26" height="22" rx="6" fill={accent} />
          <rect x="102" y="62" width="6" height="18" fill={accent} /><rect x="102" y="62" width="16" height="6" fill={accent} />
          <circle cx="85" cy="121" r="11" fill="#d9f9f9" /><circle cx="118" cy="121" r="11" fill="#d9f9f9" />
          <path d="M155 121 l18 -14 v28z" fill="#ff2e93" />
        </g>
        {[[30, 90, 5], [40, 70, 3], [170, 60, 4], [160, 80, 2.5]].map(([x, y, r]) => ster(x, y, r, '#bff3f3'))}
      </svg>
    );
  if (slug === 'boswachter')
    return (
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="150" cy="70" r="24" fill="#fff3c4" />
        <path d="M0 200 V150 l30 -60 30 60 25 -75 30 75 28 -55 27 55 30 -40 V200Z" fill="#1c5235" />
        <g transform="translate(92 118)">
          <ellipse cx="0" cy="12" rx="22" ry="27" fill={accent} />
          <circle cx="-9" cy="2" r="8" fill="#fff" /><circle cx="9" cy="2" r="8" fill="#fff" />
          <circle cx="-9" cy="2" r="3.5" fill="#0d0d12" /><circle cx="9" cy="2" r="3.5" fill="#0d0d12" />
          <path d="M-4 11 h8 l-4 7z" fill="#ff9f1c" />
        </g>
      </svg>
    );
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true">
      {[[20, 110, 2], [44, 150, 3], [170, 96, 2.5], [150, 40, 2], [182, 150, 3], [70, 104, 1.8], [118, 186, 2]].map(([x, y, r]) => ster(x, y, r))}
      <circle cx="158" cy="150" r="30" fill={accent} /><circle cx="148" cy="142" r="6" fill="#f5b700" /><circle cx="168" cy="160" r="4" fill="#f5b700" />
      <g transform="rotate(32 92 138)">
        <path d="M92 84 C114 108 114 150 108 172 H76 C70 150 70 108 92 84Z" fill="#ff3b3b" />
        <circle cx="92" cy="126" r="11" fill="#d9f9f9" stroke="#0d0d12" strokeWidth="3" />
        <path d="M76 150 l-16 26 h18z M108 150 l16 26 h-18z" fill="#ff2e93" />
        <path d="M82 174 h20 l-10 24z" fill="#ffd23f" />
      </g>
    </svg>
  );
}

export function Cover({ story, naam, className = '' }: { story: Story; naam?: string; className?: string }) {
  return (
    <div className={`cover ${className}`} style={{ background: story.kleur }}>
      <Art slug={story.slug} accent={story.accent} />
      <div className="t">{story.titel}</div>
      {naam && <div className="n">met {naam}</div>}
    </div>
  );
}
