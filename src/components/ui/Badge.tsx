import type { ReactNode } from 'react'
import type { Visibility } from '@/types/db'

type Tone = Visibility | 'success' | 'warning' | 'error' | 'neutral'

const TONES: Record<Tone, string> = {
  public: 'bg-ivory-200 text-charcoal-600 border-charcoal-200',
  login_required: 'bg-champagne-50 text-champagne-800 border-champagne-200',
  premium_only: 'bg-charcoal-800 text-champagne-200 border-charcoal-700',
  success: 'bg-success/10 text-success border-success/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  error: 'bg-danger/10 text-danger border-danger/30',
  neutral: 'bg-ivory-200 text-charcoal-500 border-charcoal-200',
}

/** Client-facing wording. "Members only" reads better than "login required". */
const VISIBILITY_LABEL: Record<Visibility, string> = {
  public: 'Public',
  login_required: 'Members only',
  premium_only: 'Premium',
}

export function Badge({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-3 py-1 text-[0.65rem] font-medium tracking-[0.15em] uppercase ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

/**
 * Used in the admin only. Never on the public catalogue: a badge on a card
 * would confirm which pieces are being withheld from the viewer, which is the
 * one thing the gating model must not reveal (DESIGN.md §6).
 */
export function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  return <Badge tone={visibility}>{VISIBILITY_LABEL[visibility]}</Badge>
}
