type Props = { size?: number; className?: string; hurt?: boolean; label?: string }

export function BossArt({ size = 150, className = '', hurt = false, label }: Props) {
  return (
    <svg
      viewBox="0 0 160 150"
      width={size}
      height={size}
      className={`${className} ${hurt ? 'animate-hit' : ''}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <ellipse cx="80" cy="141" rx="46" ry="6" fill="rgba(15,23,42,0.18)" />
      <path d="M38 52 L26 20 L50 36 Z" fill="#7c3aed" />
      <path d="M122 52 L134 20 L110 36 Z" fill="#7c3aed" />
      <ellipse cx="80" cy="86" rx="52" ry="46" fill="#8b5cf6" />
      <ellipse cx="80" cy="98" rx="34" ry="30" fill="#a78bfa" opacity="0.55" />
      <ellipse cx="31" cy="98" rx="12" ry="20" fill="#7c3aed" />
      <ellipse cx="129" cy="98" rx="12" ry="20" fill="#7c3aed" />
      <circle cx="62" cy="76" r="15" fill="#ffffff" />
      <circle cx="98" cy="76" r="15" fill="#ffffff" />
      <circle cx="64" cy="78" r="6.5" fill="#4c1d95" />
      <circle cx="100" cy="78" r="6.5" fill="#4c1d95" />
      <circle cx="66" cy="75" r="2.2" fill="#ffffff" />
      <circle cx="102" cy="75" r="2.2" fill="#ffffff" />
      <path d="M62 103q18 13 36 0" stroke="#5b21b6" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M68 105l4 8 5-8M87 105l5 8 4-8" fill="#ffffff" opacity="0.9" />
      <ellipse cx="46" cy="94" rx="7" ry="4" fill="#f472b6" opacity="0.55" />
      <ellipse cx="114" cy="94" rx="7" ry="4" fill="#f472b6" opacity="0.55" />
      <path d="M36 120q-10 8-4 18M124 120q10 8 4 18" stroke="#7c3aed" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M50 132q30 8 60 0" stroke="#7c3aed" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.5" />
    </svg>
  )
}
