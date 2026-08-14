import { Crown } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import type { Tier } from '@/types/db'

/**
 * Advertises that more of the catalogue exists — without revealing what.
 *
 * No counts, no lock badges, no blurred tiles. A "+12 premium pieces" counter
 * would confirm the size of the hidden set, and a lock on a card would confirm
 * that a specific piece exists. See DESIGN.md §6.
 */
export function AccessBand({ tier }: { tier: Tier }) {
  if (tier === 'premium') return null
  const isGuest = tier === 'guest'

  return (
    <aside className="mt-24 border border-champagne-200 bg-ivory-50 px-6 py-16 text-center">
      <Crown size={26} strokeWidth={1} className="mx-auto mb-6 text-champagne-500" />
      <p className="eyebrow mb-4">{isGuest ? 'Registered access' : 'Premium access'}</p>
      <h2 className="text-balance font-serif text-3xl text-charcoal-800">
        {isGuest
          ? 'The full archive is reserved for clients'
          : 'Selected pieces are shown to premium clients'}
      </h2>
      <p className="mx-auto mt-5 mb-9 max-w-lg text-base leading-relaxed font-light text-charcoal-400">
        {isGuest
          ? 'Sign in with your registered number to view the wider catalogue.'
          : 'Premium access is arranged by VK Jewellers. Speak to us to have it added to your account.'}
      </p>
      <ButtonLink to={isGuest ? '/sign-in' : '/contact'} size="lg">
        {isGuest ? 'Sign in' : 'Contact us'}
      </ButtonLink>
    </aside>
  )
}
