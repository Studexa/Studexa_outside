import type { BuddySpecies } from '../lib/store'

export type Mood = 'happy' | 'sleepy' | 'sparkle'
export type Accessory = 'hat' | 'glasses' | 'scarf' | 'cape' | null

type Props = {
  species?: BuddySpecies
  mood?: Mood
  accessory?: Accessory
  size?: number
  className?: string
  label?: string
}

const palette: Record<BuddySpecies, { body: string; belly: string; accent: string; dark: string }> = {
  owl: { body: '#8b7cf6', belly: '#ede9fe', accent: '#f59e0b', dark: '#5b4bd6' },
  cat: { body: '#fb923c', belly: '#ffedd5', accent: '#f472b6', dark: '#ea7a1f' },
  fox: { body: '#f97316', belly: '#fff7ed', accent: '#f59e0b', dark: '#dc5a0a' },
  elephant: { body: '#93c5fd', belly: '#dbeafe', accent: '#f9a8d4', dark: '#60a5fa' },
}

export function Mascot({ species = 'owl', mood = 'happy', accessory = null, size = 120, className = '', label }: Props) {
  const c = palette[species]

  return (
    <svg
      viewBox="0 0 140 140"
      width={size}
      height={size}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {accessory === 'cape' && (
        <path d="M52 78 L26 126 Q70 140 114 126 L88 78 Z" fill="#4f46e5" opacity="0.9" />
      )}

      {species === 'owl' && (
        <g>
          <ellipse cx="70" cy="127" rx="32" ry="6" fill="rgba(15,23,42,0.12)" />
          <polygon points="44,52 37,28 60,46" fill={c.body} />
          <polygon points="96,52 103,28 80,46" fill={c.body} />
          <ellipse cx="70" cy="83" rx="37" ry="41" fill={c.body} />
          <ellipse cx="70" cy="91" rx="25" ry="28" fill={c.belly} />
          <ellipse cx="34" cy="88" rx="8" ry="19" fill={c.dark} />
          <ellipse cx="106" cy="88" rx="8" ry="19" fill={c.dark} />
          {mood === 'sleepy' ? (
            <g stroke={c.dark} strokeWidth="3" strokeLinecap="round" fill="none">
              <path d="M49 74q8 6 16 0" />
              <path d="M75 74q8 6 16 0" />
            </g>
          ) : (
            <g>
              <circle cx="57" cy="73" r="12" fill="#ffffff" />
              <circle cx="83" cy="73" r="12" fill="#ffffff" />
              <circle cx="58" cy="74" r="5.4" fill={c.dark} />
              <circle cx="84" cy="74" r="5.4" fill={c.dark} />
              <circle cx="60" cy="72" r="1.8" fill="#ffffff" />
              <circle cx="86" cy="72" r="1.8" fill="#ffffff" />
            </g>
          )}
          <polygon points="70,78 64,87 76,87" fill={c.accent} />
          <path d="M62 100q8 6 16 0" stroke={c.dark} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M58 118v7M70 118v7M82 118v7" stroke={c.accent} strokeWidth="3.4" strokeLinecap="round" />
          {mood === 'sparkle' && (
            <g fill={c.accent}>
              <path d="M116 44l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" />
              <path d="M24 60l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6L24 60Z" />
            </g>
          )}
        </g>
      )}

      {species === 'cat' && (
        <g>
          <ellipse cx="70" cy="127" rx="32" ry="6" fill="rgba(15,23,42,0.12)" />
          <path d="M103 100q25 3 18-22" stroke={c.body} strokeWidth="9" fill="none" strokeLinecap="round" />
          <ellipse cx="70" cy="92" rx="33" ry="31" fill={c.body} />
          <ellipse cx="70" cy="99" rx="21" ry="23" fill={c.belly} />
          <polygon points="49,38 42,13 65,30" fill={c.body} />
          <polygon points="91,38 98,13 75,30" fill={c.body} />
          <polygon points="52,34 48,20 60,31" fill={c.accent} />
          <polygon points="88,34 92,20 80,31" fill={c.accent} />
          <circle cx="70" cy="57" r="30" fill={c.body} />
          <ellipse cx="70" cy="68" rx="16" ry="12" fill={c.belly} />
          {mood === 'sleepy' ? (
            <g stroke={c.dark} strokeWidth="3" strokeLinecap="round" fill="none">
              <path d="M50 57q6 5 12 0" />
              <path d="M78 57q6 5 12 0" />
            </g>
          ) : (
            <g>
              <ellipse cx="58" cy="56" rx="5" ry="6.5" fill={c.dark} />
              <ellipse cx="82" cy="56" rx="5" ry="6.5" fill={c.dark} />
              <circle cx="60" cy="54" r="1.6" fill="#ffffff" />
              <circle cx="84" cy="54" r="1.6" fill="#ffffff" />
            </g>
          )}
          <polygon points="70,66 66,71 74,71" fill={c.accent} />
          <path d="M70 71v4M70 75q-4 4-8 1M70 75q4 4 8 1" stroke={c.dark} strokeWidth="2" fill="none" strokeLinecap="round" />
          <g stroke={c.dark} strokeWidth="1.6" strokeLinecap="round" opacity="0.6">
            <path d="M44 68h10M44 73h10M96 68H86M96 73H86" />
          </g>
          {mood === 'sparkle' && (
            <g fill={c.accent}>
              <path d="M111 35l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" />
              <path d="M25 44l1.5 3.7 3.8 1.5-3.8 1.5L25 54l-1.5-3.8-3.8-1.5 3.8-1.5L25 44Z" />
            </g>
          )}
        </g>
      )}

      {species === 'fox' && (
        <g>
          <ellipse cx="70" cy="127" rx="32" ry="6" fill="rgba(15,23,42,0.12)" />
          <path d="M102 96q34 8 24-28q6 30-18 40Z" fill={c.body} />
          <path d="M126 68q8 12 0 28q-4-10 0-28Z" fill={c.belly} />
          <ellipse cx="70" cy="92" rx="33" ry="31" fill={c.body} />
          <ellipse cx="70" cy="99" rx="21" ry="23" fill={c.belly} />
          <polygon points="47,42 42,12 68,32" fill={c.body} />
          <polygon points="93,42 98,12 72,32" fill={c.body} />
          <polygon points="51,37 48,21 62,33" fill={c.dark} />
          <polygon points="89,37 92,21 78,33" fill={c.dark} />
          <circle cx="70" cy="59" r="30" fill={c.body} />
          <path d="M50 68q20 20 40 0q-4 16-20 17q-16-1-20-17Z" fill={c.belly} />
          {mood === 'sleepy' ? (
            <g stroke={c.dark} strokeWidth="3" strokeLinecap="round" fill="none">
              <path d="M50 58q6 5 12 0" />
              <path d="M78 58q6 5 12 0" />
            </g>
          ) : (
            <g>
              <ellipse cx="58" cy="57" rx="5" ry="6.5" fill={c.dark} />
              <ellipse cx="82" cy="57" rx="5" ry="6.5" fill={c.dark} />
              <circle cx="60" cy="55" r="1.6" fill="#ffffff" />
              <circle cx="84" cy="55" r="1.6" fill="#ffffff" />
            </g>
          )}
          <ellipse cx="70" cy="71" rx="5" ry="3.6" fill={c.dark} />
          <path d="M70 75v3" stroke={c.dark} strokeWidth="2" strokeLinecap="round" />
          {mood === 'sparkle' && (
            <g fill={c.accent}>
              <path d="M112 38l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" />
              <path d="M24 50l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6L24 50Z" />
            </g>
          )}
        </g>
      )}

      {species === 'elephant' && (
        <g>
          <ellipse cx="70" cy="127" rx="34" ry="6" fill="rgba(15,23,42,0.12)" />
          <ellipse cx="70" cy="94" rx="34" ry="30" fill={c.body} />
          <ellipse cx="70" cy="101" rx="21" ry="22" fill={c.belly} />
          <ellipse cx="34" cy="57" rx="19" ry="25" fill={c.body} />
          <ellipse cx="106" cy="57" rx="19" ry="25" fill={c.body} />
          <ellipse cx="35" cy="58" rx="12" ry="17" fill={c.belly} opacity="0.7" />
          <ellipse cx="105" cy="58" rx="12" ry="17" fill={c.belly} opacity="0.7" />
          <circle cx="70" cy="55" r="32" fill={c.body} />
          <path d="M70 76q-2 18 5 27q7 9-3 13q-10 2-7-11" stroke={c.body} strokeWidth="17" fill="none" strokeLinecap="round" />
          <path d="M64 80q-6 12-1 22" stroke={c.dark} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.4" />
          <path d="M50 88q-5 7-1 13M90 88q5 7 1 13" stroke="#fffdf5" strokeWidth="4" fill="none" strokeLinecap="round" />
          {mood === 'sleepy' ? (
            <g stroke={c.dark} strokeWidth="3" strokeLinecap="round" fill="none">
              <path d="M51 55q6 5 12 0" />
              <path d="M78 55q6 5 12 0" />
            </g>
          ) : (
            <g>
              <circle cx="58" cy="54" r="5.6" fill={c.dark} />
              <circle cx="82" cy="54" r="5.6" fill={c.dark} />
              <circle cx="60" cy="52" r="1.8" fill="#ffffff" />
              <circle cx="84" cy="52" r="1.8" fill="#ffffff" />
            </g>
          )}
          <ellipse cx="46" cy="68" rx="6" ry="3.6" fill={c.accent} opacity="0.45" />
          <ellipse cx="94" cy="68" rx="6" ry="3.6" fill={c.accent} opacity="0.45" />
          <path d="M62 70q8 5 16 0" stroke={c.dark} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          {mood === 'sparkle' && (
            <g fill={c.accent}>
              <path d="M116 34l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" />
              <path d="M22 44l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6L22 44Z" />
            </g>
          )}
        </g>
      )}

      {accessory === 'hat' && (
        <g>
          <path d="M48 34 Q70 -6 92 34 Z" fill="#4f46e5" />
          <ellipse cx="70" cy="34" rx="26" ry="6.5" fill="#4338ca" />
          <path d="M52 29h36" stroke="#f59e0b" strokeWidth="4" />
          <circle cx="70" cy="4" r="5.5" fill="#f59e0b" />
        </g>
      )}

      {accessory === 'glasses' && (
        <g stroke="#0f172a" strokeWidth="2.6" fill="none" opacity="0.85">
          <rect x={species === 'owl' ? 45 : 46} y={species === 'owl' ? 64 : 49} width="22" height="17" rx="7" />
          <rect x={species === 'owl' ? 73 : 72} y={species === 'owl' ? 64 : 49} width="22" height="17" rx="7" />
          <path d={species === 'owl' ? 'M67 72h6' : 'M68 57h4'} />
        </g>
      )}

      {accessory === 'scarf' && (
        <g>
          <path d="M44 101 Q70 116 96 101 L96 109 Q70 124 44 109 Z" fill="#f87171" />
          <path d="M84 112 l4 16 l8 -2 l-6 -16 Z" fill="#ef4444" />
        </g>
      )}

      {mood === 'sleepy' && (
        <g fill={c.dark} opacity="0.6" fontFamily="Nunito, sans-serif" fontWeight="800">
          <text x="108" y="30" fontSize="16">z</text>
          <text x="118" y="18" fontSize="11">z</text>
        </g>
      )}
    </svg>
  )
}
