import { useSession } from '@/hooks/useSession'
import type { Tier } from '@/types/db'

const TIERS: { value: Tier; label: string }[] = [
  { value: 'guest', label: 'Guest' },
  { value: 'registered', label: 'Registered' },
  { value: 'premium', label: 'Premium' },
]

/**
 * Review-only tier switcher.
 *
 * Auth arrives in Phase 2 and live OTP is blocked on the WhatsApp Business API,
 * so this is the only way to walk the client through the three access tiers.
 * It renders only while running on fixtures and disappears the moment Supabase
 * is configured — it is not a login and cannot grant real access.
 */
export function PreviewBar() {
  const { isPreview, tier, setPreviewTier } = useSession()
  if (!isPreview) return null

  return (
    <div className="bg-noir text-ivory/70">
      <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-center gap-x-4 gap-y-2 px-6 py-2.5 lg:px-14">
        <span className="text-[0.625rem] tracking-[0.16em] uppercase">
          Preview data · viewing as
        </span>
        <div className="flex gap-1">
          {TIERS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setPreviewTier(t.value)}
              aria-pressed={tier === t.value}
              className={[
                'cursor-pointer border px-3 py-1 text-[0.625rem] tracking-[0.14em] uppercase transition-colors duration-200',
                tier === t.value
                  ? 'border-gold-light text-gold-light'
                  : 'border-ivory/20 hover:border-ivory/50 hover:text-ivory',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
