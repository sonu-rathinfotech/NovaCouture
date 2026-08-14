/**
 * Placeholder artwork for fixture products.
 *
 * The client has not supplied photography yet, and inventing stock photos of
 * jewellery that VK does not sell would misrepresent the catalogue. Line art
 * keeps the layout, spacing and aspect ratio honest while making it obvious at
 * a glance that the imagery is not final.
 *
 * Deleted once real images exist — GalleryImage falls through to <img>.
 */
import type { ArtKind } from './art'

const STROKE = '#8B6A2F'
const FILL = '#B8933F'

/** Four variants per kind so a gallery of one product shows visible variety. */
const SHAPES: Record<ArtKind, ReadonlyArray<React.ReactNode>> = {
  necklace: [
    <>
      <path d="M16 24 Q50 82 84 24" />
      <circle cx="50" cy="76" r="12" />
      <circle cx="50" cy="76" r="17" strokeDasharray="2 4" />
      <circle cx="30" cy="50" r="2.5" />
      <circle cx="70" cy="50" r="2.5" />
    </>,
    <>
      <path d="M14 26 Q50 88 86 26" />
      <path d="M22 26 Q50 74 78 26" />
      <circle cx="50" cy="84" r="8" />
      <circle cx="35" cy="62" r="2.5" />
      <circle cx="65" cy="62" r="2.5" />
    </>,
    <>
      <circle cx="50" cy="60" r="30" strokeDasharray="3 5" />
      <circle cx="50" cy="60" r="14" />
      <circle cx="50" cy="60" r="5" fill={FILL} stroke="none" opacity=".45" />
    </>,
    <>
      <path d="M22 30 Q50 70 78 30" />
      <path d="M28 30 Q50 62 72 30" />
      <circle cx="50" cy="80" r="9" />
      <path d="M50 89 L50 100" />
    </>,
  ],
  bangle: [
    <>
      <circle cx="50" cy="60" r="28" />
      <circle cx="50" cy="60" r="21" />
      <circle cx="50" cy="32" r="4.5" />
    </>,
    <>
      <circle cx="50" cy="60" r="29" />
      <circle cx="50" cy="60" r="22" />
      <circle cx="50" cy="60" r="15" />
    </>,
    <>
      <ellipse cx="50" cy="60" rx="28" ry="20" />
      <ellipse cx="50" cy="60" rx="20" ry="13" />
      <circle cx="22" cy="60" r="3" fill={FILL} stroke="none" opacity=".5" />
    </>,
    <>
      <circle cx="50" cy="60" r="30" strokeDasharray="2 6" />
      <circle cx="50" cy="60" r="12" fill={FILL} fillOpacity=".18" />
    </>,
  ],
  ring: [
    <>
      <circle cx="50" cy="72" r="23" />
      <circle cx="50" cy="72" r="18" />
      <path d="M43 40 L50 24 L57 40 L50 51 Z" />
      <path d="M43 40 L57 40" />
    </>,
    <>
      <circle cx="50" cy="66" r="26" strokeDasharray="3 4" />
      <path d="M40 44 L50 28 L60 44 L50 58 Z" fill={FILL} fillOpacity=".18" />
    </>,
    <>
      <circle cx="50" cy="70" r="24" />
      <circle cx="50" cy="70" r="19" />
      <circle cx="50" cy="38" r="8" />
    </>,
    <>
      <circle cx="50" cy="68" r="25" />
      <path d="M50 33 L58 46 L50 59 L42 46 Z" />
    </>,
  ],
  bracelet: [
    <>
      <ellipse cx="50" cy="60" rx="30" ry="21" />
      <ellipse cx="50" cy="60" rx="24" ry="15" />
      <circle cx="50" cy="39" r="3.5" />
      <circle cx="50" cy="81" r="3.5" />
    </>,
    <>
      <path d="M20 60 Q50 34 80 60 Q50 86 20 60 Z" />
      <circle cx="50" cy="60" r="8" />
    </>,
    <>
      <ellipse cx="50" cy="60" rx="31" ry="22" />
      <ellipse cx="50" cy="60" rx="25" ry="16" />
      <circle cx="50" cy="38" r="3.5" />
    </>,
    <>
      <ellipse cx="50" cy="60" rx="29" ry="19" strokeDasharray="3 5" />
      <circle cx="50" cy="60" r="6" fill={FILL} stroke="none" opacity=".4" />
    </>,
  ],
  default: [
    <>
      <circle cx="50" cy="60" r="26" />
      <circle cx="50" cy="60" r="10" />
    </>,
    <>
      <path d="M50 30 L66 60 L50 90 L34 60 Z" />
    </>,
    <>
      <circle cx="50" cy="60" r="28" strokeDasharray="3 5" />
    </>,
    <>
      <path d="M34 42 L66 42 L50 88 Z" />
    </>,
  ],
}

export function ProductArt({
  kind = 'default',
  index = 0,
  className = '',
}: {
  kind?: ArtKind
  index?: number
  className?: string
}) {
  const set = SHAPES[kind]
  const shape = set[index % set.length]

  return (
    <svg
      viewBox="0 0 100 120"
      className={className}
      fill="none"
      stroke={STROKE}
      strokeWidth=".8"
      aria-hidden="true"
      focusable="false"
    >
      {shape}
    </svg>
  )
}
