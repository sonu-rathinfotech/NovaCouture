import type { CollectionAudience } from '@/types/db'

/**
 * How each audience is described to the admin.
 *
 * Written once and used on every screen that mentions a link, because the one
 * choice with a lasting consequence — 'guest' — has to read the same way when
 * it is being made as it does three weeks later in the list.
 */
export const AUDIENCE: Record<
  CollectionAudience,
  { label: string; short: string; note: string }
> = {
  premium: {
    label: 'Premium clients only',
    short: 'Premium',
    note: 'The recipient must be signed in and marked premium. Anyone else — including anyone they forward it to — sees “not available”, so the link reveals nothing on its own.',
  },
  registered: {
    label: 'Any signed-in client',
    short: 'Registered',
    note: 'Any client with an account can open it, premium or not. Use this for a customer you have added but not made premium.',
  },
  guest: {
    label: 'Anyone with the link',
    short: 'Public link',
    note: 'No sign-in. The pieces in this link — names and photographs — become viewable by anyone the link reaches, and it can be forwarded on. Nothing else in the catalogue is affected. Disable the link to withdraw it.',
  },
}

export const AUDIENCE_ORDER: CollectionAudience[] = ['premium', 'registered', 'guest']
