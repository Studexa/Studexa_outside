import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import './petGallery.css'

type Pose = 'hat' | 'plain' | 'ghost' | 'pirate' | 'pair' | 'head' | 'grin' | 'prop' | 'tongue'
  | 'horns' | 'hood' | 'nap' | 'sun' | 'blanket' | 'stretch' | 'toast' | 'wave' | 'overalls'
  | 'loaf' | 'rainbow' | 'ears' | 'shades' | 'eyes'

type Pet = { id: string; pose: Pose; accent: string; prop?: string }

const pets: Pet[] = [
  { id: 'cowboy', pose: 'hat', accent: '#a36c50' },
  { id: 'tabby', pose: 'plain', accent: '#ed9bb1' },
  { id: 'ghost', pose: 'ghost', accent: '#ed9bb1' },
  { id: 'pirate', pose: 'pirate', accent: '#f18c93', prop: '⚓' },
  { id: 'cuddle', pose: 'pair', accent: '#ed9bb1' },
  { id: 'sticky', pose: 'head', accent: '#ed9bb1', prop: '🗒️' },
  { id: 'grin', pose: 'grin', accent: '#ed9bb1' },
  { id: 'coffee', pose: 'prop', accent: '#ed9bb1', prop: '☕' },
  { id: 'tongue', pose: 'tongue', accent: '#ed9bb1' },
  { id: 'heart', pose: 'prop', accent: '#ed9bb1', prop: '💗' },
  { id: 'devil', pose: 'horns', accent: '#ed9bb1' },
  { id: 'chick', pose: 'hood', accent: '#ffd86b', prop: '🐤' },
  { id: 'puddle', pose: 'nap', accent: '#ed9bb1', prop: '💧' },
  { id: 'sun', pose: 'sun', accent: '#ed9bb1' },
  { id: 'bed', pose: 'blanket', accent: '#adc9ec', prop: '🛏️' },
  { id: 'stretch', pose: 'stretch', accent: '#ed9bb1' },
  { id: 'pickle', pose: 'hood', accent: '#75bd79', prop: '🥒' },
  { id: 'midnight', pose: 'horns', accent: '#746487', prop: '🌙' },
  { id: 'strawberry', pose: 'hood', accent: '#f6848f', prop: '🍓' },
  { id: 'wave', pose: 'wave', accent: '#ed9bb1' },
  { id: 'cheese', pose: 'head', accent: '#ed9bb1', prop: '🧀' },
  { id: 'nugget', pose: 'hood', accent: '#f2b46a' },
  { id: 'tomato', pose: 'hood', accent: '#ed8476', prop: '🍅' },
  { id: 'toast', pose: 'toast', accent: '#d99969' },
  { id: 'cookie', pose: 'prop', accent: '#ed9bb1', prop: '🍪' },
  { id: 'overalls', pose: 'overalls', accent: '#85a6dc', prop: '🎀' },
  { id: 'shrimp', pose: 'loaf', accent: '#ffc877', prop: '🍤' },
  { id: 'rainbow', pose: 'rainbow', accent: '#ed9bb1' },
  { id: 'knit', pose: 'hat', accent: '#86b7ec', prop: '🧶' },
  { id: 'blueberry', pose: 'hood', accent: '#839ce1', prop: '🫐' },
  { id: 'pup', pose: 'ears', accent: '#f6d58e' },
  { id: 'orange', pose: 'plain', accent: '#f4b47f' },
  { id: 'lovebirds', pose: 'pair', accent: '#ed9bb1', prop: '💕' },
  { id: 'bunny', pose: 'ears', accent: '#f6a5cd' },
  { id: 'pastry', pose: 'toast', accent: '#d296c6', prop: '✨' },
  { id: 'blanket', pose: 'blanket', accent: '#8db7ef' },
  { id: 'bear', pose: 'ears', accent: '#c8906c', prop: '🎩' },
  { id: 'drumstick', pose: 'prop', accent: '#ed9bb1', prop: '🍗' },
  { id: 'scholar', pose: 'overalls', accent: '#717698', prop: '📕' },
  { id: 'shades', pose: 'shades', accent: '#7279aa' },
  { id: 'berryhug', pose: 'prop', accent: '#ed9bb1', prop: '🍓' },
  { id: 'wideEyes', pose: 'eyes', accent: '#ed9bb1' },
  { id: 'snack', pose: 'prop', accent: '#ed9bb1', prop: '🍕' },
  { id: 'sprout', pose: 'head', accent: '#ed9bb1', prop: '🌱' },
  { id: 'traveler', pose: 'overalls', accent: '#9bc7c0', prop: '🧳' },
  { id: 'floppy', pose: 'ears', accent: '#bfd2ec' },
  { id: 'kitten', pose: 'eyes', accent: '#ed9bb1', prop: '🎀' },
  { id: 'flower', pose: 'prop', accent: '#ed9bb1', prop: '🌸' },
  { id: 'flowers', pose: 'prop', accent: '#ed9bb1', prop: '💐' },
]

function CatFace({ pose }: { pose: Pose }) {
  return <>
    <path d="M44 42l4 8m9-10 1 8m10-7-2 8" stroke="#b9a2b5" />
    <path d="M13 64l9 2m-9 5 9-1m69-4 10-2m-10 6 10 2" fill="none" />
    <ellipse cx="36" cy="71" rx="6" ry="3" fill="#f7b4bd" stroke="none" />
    <ellipse cx="77" cy="71" rx="6" ry="3" fill="#f7b4bd" stroke="none" />
    {pose === 'nap' ? <path d="M37 62q5 5 10 0m18 0q5 5 10 0" fill="none" /> :
      <g className="pet-eyes" fill="#382639" stroke="none">
        <ellipse cx="42" cy="62" rx={pose === 'eyes' ? 9 : 3.2} ry={pose === 'eyes' ? 11 : 3.7} />
        <ellipse cx="71" cy="62" rx={pose === 'eyes' ? 9 : 3.2} ry={pose === 'eyes' ? 11 : 3.7} />
        {pose === 'eyes' && <path d="M40 55h4m25 0h4" stroke="white" strokeWidth="3" />}
      </g>}
    {pose === 'grin' ? <><rect x="44" y="69" width="25" height="12" rx="6" fill="white" /><path d="M52 70v10m8-10v10" /></> :
      pose === 'tongue' || pose === 'wave'
        ? <path d="M50 70q7 4 13 0-4 20-9 13z" fill="#ed8caa" />
        : <path d="M49 70q4 5 8 0 4 5 8 0" fill="none" />}
  </>
}

function CatArt({ pet }: { pet: Pet }) {
  const { id, pose, accent, prop } = pet
  const fur = id === 'orange' || pose === 'pirate' || id === 'knit' ? accent : '#fff5e6'
  const backdrop = ['hood', 'sun', 'toast', 'ears'].includes(pose)
  return <svg className="pet-drawing" viewBox="0 0 120 120" aria-hidden="true">
    <ellipse cx="58" cy="106" rx="34" ry="5" fill="#51344d" opacity=".13" />
    <g className="pet-body" stroke="#382639" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      {pose === 'pair' && <path d="M65 74l2-18 12 6 12-4 10 14q8 26-14 31-19 3-25-8z" fill="#f4b47f" />}
      {pose === 'pair' && <path d="M79 78h1m12-1h1m-12 7q4 4 8 0" fill="none" />}
      {pose === 'sun' && <path d="M57 12l9 11 15-6 5 14 15 3-2 15 12 11-9 12 2 16-15 2-8 14-14-5-10 11-10-11-15 5-8-14-15-2 3-16L3 60l13-11-2-15 15-3 5-14 14 6z" fill="#ffc954" />}
      {pose === 'hood' && <path d="M57 23q13-9 28 5 15 12 13 40-2 35-40 39-40-4-42-37-4-27 13-42 15-12 28-5Z" fill={accent} />}
      {pose === 'toast' && <path d="M22 54q-13-11-5-24 7-13 40-13t42 13q7 13-5 24l-3 43H25z" fill={accent} />}
      {pose === 'ears' && <path d={id === 'bunny' ? 'M29 56Q13 9 31 7q15-1 20 34h13Q71 3 84 9q15 6 1 48l5 31H26Z' : 'M36 28Q19 17 12 43t12 22l9-7 48 1q21 21 22-4 1-30-21-24z'} fill={accent} />}
      {!backdrop && pose !== 'pair' && pose !== 'ghost' && <path d="M77 88q21 4 22-13" className="pet-tail" fill="none" stroke={accent} strokeWidth="6" />}
      <g transform={pose === 'pair' ? 'translate(-5 11) scale(.85)' : pose === 'nap' || pose === 'loaf' ? 'translate(1 30) scale(1 .75)' : undefined}>
        <path d={pose === 'ghost'
          ? 'M20 73q1-17 11-26l-1-16 16 7q11-4 22 0l14-6 2 17q13 10 12 32l5 16q-11-4-16 8-8-10-15 0-8-9-15 0-8-10-16-1-9-10-19-6z'
          : 'M28 50l2-22 17 11q10-3 21 0l17-10 2 22q13 12 5 27l-10 8 3 12q-6 8-17 4l-4-8h-13l-5 8q-11 4-17-4l4-12-10-7q-9-14 5-29z'}
          fill={fur} />
        {!backdrop && pose !== 'ghost' && <path d="M32 36l9 5-9 4m48-9-8 5 8 4" fill="#f3b3c4" stroke="none" />}
        <CatFace pose={pose} />
      </g>
      {pose === 'hat' && <path d="M27 38q-3-6 8-8l9-1 3-15 11 5 13-4 6 15q19 1 12 7-19 9-62 1Z" fill={accent} />}
      {id === 'cowboy' && <path d="M32 87l8-4q17 7 34 0l9 4 2 10q-6 8-17 4l-4-8H51l-5 8q-11 4-17-4z" fill="#8bafda" />}
      {pose === 'pirate' && <path d="M35 60l11-8 16 1m-27 8q0-9 14-8l3 9q-4 10-15 6z" fill="#382639" />}
      {pose === 'horns' && <path d="M28 47q-9-9-9-23l17 13m47 3 17-15q0 15-11 23" fill={id === 'midnight' ? accent : '#e9818e'} />}
      {pose === 'wave' && <path d="M27 87q-14 5-16-9-2-13 6-13 4 1 3 7 5-4 8 0" fill={fur} />}
      {pose === 'stretch' && <path d="M28 85q-11 2-17-5m72 5q12 1 19-6" fill="none" strokeWidth="6" />}
      {pose === 'blanket' && <path d="M29 76q21 12 53 0l14 22q-9 9-37 9t-38-9zM46 105l24-25" fill={accent} />}
      {pose === 'overalls' && <path d="M34 80h7l4 6h23l4-6h7l6 18q-5 8-17 4l-4-8H51l-5 8q-12 4-17-4Z" fill={accent} />}
      {pose === 'shades' && <path d="M31 55q11-4 22 0l4 4 5-4q10-4 22 0 0 16-12 16-9 0-11-10h-6q-3 10-11 10-12 0-13-16Z" fill={accent} />}
      {pose === 'rainbow' && ['#ef8396', '#fcc07d', '#ffdf77', '#9fc995', '#a99bdd'].map((color, index) =>
        <circle key={color} cx={30 + index * 13} cy={34 - (2 - Math.abs(2 - index)) * 7} r="10" fill={color} />)}
      {prop && <text x={pose === 'prop' ? 79 : 60} y={pose === 'prop' ? 101 : pose === 'pair' ? 40 : 34}
        textAnchor="middle" fontSize={pose === 'prop' ? 30 : 22} stroke="none">{prop}</text>}
    </g>
  </svg>
}

function PetTile({ pet }: { pet: Pet }) {
  const { t } = useTranslation()
  const [reaction, setReaction] = useState(0)
  const label = t('pets.names.' + pet.id)
  return <li>
    <button type="button" className="pet-tile" data-pet={pet.id} onClick={() => setReaction((value) => value + 1)}>
      <span className="pet-stage" aria-hidden="true">
        <span key={reaction} className={reaction ? 'pet-reaction' : undefined}>
          <CatArt pet={pet} />
          {reaction > 0 && <span className="pet-sparkle">✦</span>}
        </span>
      </span>
      <span>{label}</span>
    </button>
  </li>
}

export function PetGallery() {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const list = useRef<HTMLUListElement>(null)
  const headingId = useId()
  const listId = useId()

  useEffect(() => {
    if (!list.current || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => target.toggleAttribute('data-visible', isIntersecting))
    })
    list.current.querySelectorAll('.pet-tile').forEach((tile) => observer.observe(tile))
    return () => observer.disconnect()
  }, [expanded])

  return <section className="study-panel pet-gallery" aria-labelledby={headingId}>
    <div className="pet-gallery-heading">
      <h2 id={headingId} className="study-section-title">{t('pets.title')}</h2>
      <Button variant="secondary" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-controls={listId}>
        {t(expanded ? 'pets.showLess' : 'pets.showAll')}
      </Button>
    </div>
    <ul id={listId} ref={list} className="pet-grid" data-expanded={expanded}>
      {(expanded ? pets : pets.slice(0, 4)).map((pet) => <PetTile key={pet.id} pet={pet} />)}
    </ul>
  </section>
}
