import type { SVGProps } from 'react'

const paths = {
  home: 'M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5Z',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5V5a2 2 0 0 1 2-2h14v14H6.5A2.5 2.5 0 0 0 4 19.5Z',
  note: 'M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM14 3v5h5M9 13h6M9 17h4',
  calendar: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
  user: 'M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  compass: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM16.2 7.8l-2.1 6.3-6.3 2.1 2.1-6.3 6.3-2.1Z',
  flame: 'M12 22c4 0 7-2.7 7-6.5 0-3-1.6-5-3.5-6.5C14 7.5 13 5 13 2c-3 2-4 5-4 7 0 1.5.5 2.5 1 3-2-1-3-3-3-5-1.5 2-2 4-2 6 0 3.8 3 9 7 9Z',
  coin: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v12M15 9.5c0-1-1.3-1.5-3-1.5s-3 .6-3 1.7 1 1.5 3 1.8c2 .3 3 .8 3 1.8s-1.3 1.7-3 1.7-3-.5-3-1.5',
  settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1Z',
  volume: 'M11 5 6 9H3v6h3l5 4V5ZM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13',
  volumeOff: 'M11 5 6 9H3v6h3l5 4V5ZM16 9l5 6M21 9l-5 6',
  play: 'M8 5v14l11-7-11-7Z',
  pause: 'M9 5v14M15 5v14',
  reset: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
  plus: 'M12 5v14M5 12h14',
  search: 'M21 21l-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  check: 'M5 13l4 4L19 7',
  chevronRight: 'M9 6l6 6-6 6',
  chevronLeft: 'M15 6l-6 6 6 6',
  eye: 'M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  eyeOff: 'm3 3 18 18M10.2 6.2a10 10 0 0 1 1.8-.2c6.4 0 10 6 10 6a14 14 0 0 1-3 3.3M6 7.7a14 14 0 0 0-4 4.3s3.6 6 10 6a10 10 0 0 0 4.3-1M10 10a3 3 0 0 0 4 4',
  chevronUp: 'M18 15l-6-6-6 6',
  chevronDown: 'M6 9l6 6 6-6',
  maximize: 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7',
  minimize: 'M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7',
  close: 'M6 6l12 12M18 6L6 18',
  trash: 'M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13M10 11v5M14 11v5',
  edit: 'M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3ZM13.5 6.5l4 4',
  sparkles: 'M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3ZM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15ZM5 16l.7 1.6L7.3 18l-1.6.7L5 20.3l-.7-1.6L2.7 18l1.6-.4L5 16Z',
  trophy: 'M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4ZM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2',
  sword: 'M14 4l6-1-1 6-9 9-4-4 8-10ZM5 15l4 4M3 21l3-3',
  gamepad: 'M6 12h4M8 10v4M15 11h.01M18 13h.01M7 7h10a5 5 0 0 1 0 10H7A5 5 0 0 1 7 7Z',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
  send: 'M22 2 9.5 14.5M22 2l-8 20-4.5-7.5L2 10l20-8Z',
  undo: 'M9 14 4 9l5-5M4 9h9a6 6 0 0 1 0 12h-3',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z',
  lock: 'M6 11h12v10H6V11ZM9 11V7a3 3 0 0 1 6 0v4',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 13a8.5 8.5 0 0 1-10-10 8.5 8.5 0 1 0 10 10Z',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  heart: 'M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6C19 16.5 12 21 12 21Z',
  timer: 'M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM12 10v4l3 2M9 2h6',
  cards: 'M4 7h11v13H4V7ZM8 4h11v13',
  layers: 'M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5M3 18l9 5 9-5',
  wand: 'M15 4V2M15 10V8M11 6H9M21 6h-2M18.5 3.5l-1 1M18.5 8.5l-1-1M4 20l10-10M14 14l2 2',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  bold: 'M7 4h6a4 4 0 0 1 0 8H7V4ZM7 12h7a4 4 0 0 1 0 8H7v-8Z',
  italic: 'M10 4h8M6 20h8M14 4l-4 16',
  heading: 'M6 4v16M18 4v16M6 12h12',
  save: 'M5 3h11l3 3v15H5V3ZM8 3v6h7V3M8 15h8v6H8v-6Z',
  copy: 'M8 8h11v13H8V8ZM5 16V3h11',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  menu: 'M4 6h16M4 12h16M4 18h16',
  checkCircle: 'M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4 12 14l-3-3',
  xCircle: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM15 9l-6 6M9 9l6 6',
  mapPin: 'M12 22s7-5.3 7-12a7 7 0 1 0-14 0c0 6.7 7 12 7 12ZM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  gift: 'M20 12v9H4v-9M2 7h20v5H2V7ZM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7ZM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z',
  palette: 'M12 22a10 10 0 1 1 0-20c5.5 0 10 3.6 10 8 0 2.5-2 4-4 4h-1.5a2 2 0 0 0-1.5 3.3c.6.8.2 1.7-.8 2.2A9 9 0 0 1 12 22ZM7.5 10h.01M9.5 6.5h.01M14 6.5h.01M17 9h.01',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  bookmark: 'M6 3h12v18l-6-4-6 4V3Z',
  wifiOff: 'M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 4-2.4M15 10.1a10 10 0 0 1 4 2.4M2 8.5a15 15 0 0 1 4.5-2.8M17.5 5.7A15 15 0 0 1 22 8.5M12 20h.01',
} as const

export type IconName = keyof typeof paths

type Props = SVGProps<SVGSVGElement> & {
  name: IconName
  size?: number
  title?: string
}

export function Icon({ name, size = 20, title, className = '', strokeWidth = 1.9, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <path d={paths[name]} />
    </svg>
  )
}
