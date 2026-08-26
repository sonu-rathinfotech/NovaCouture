import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase'
import { isConfigured } from '@/lib/env'
import { auth } from '@/auth'
import { setImageCacheOwner } from '@/lib/images'
import { setMockPremium } from '@/auth/mockAuth'
import type { Profile, Tier } from '@/types/db'

export interface SessionState {
  session: Session | null
  profile: Profile | null
  /** Viewer tier. Drives what the UI offers; the database decides what is
   *  actually returned. See DESIGN.md §6. */
  tier: Tier
  loading: boolean
  signOut: () => Promise<void>
  /** True while running without Supabase — see PreviewBar. */
  isPreview: boolean
  setPreviewTier: (tier: Tier) => void
  /** Re-reads the signed-in account. Called after register / verify. */
  refresh: () => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const SessionContext = createContext<SessionState | null>(null)

const PREVIEW_KEY = 'nova:preview-tier'

function readPreviewTier(): Tier {
  if (typeof window === 'undefined') return 'guest'
  const stored = window.localStorage.getItem(PREVIEW_KEY)
  return stored === 'registered' || stored === 'premium' ? stored : 'guest'
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const isPreview = !isConfigured

  /**
   * Preview state. Two ways in: signing in through the mock adapter, which
   * produces a real (fake) profile, or the tier switcher, for reviewing the
   * access levels without going through registration. Neither exists once
   * Supabase is configured.
   */
  const [previewTier, setPreviewTierState] = useState<Tier>(readPreviewTier)
  const [previewProfile, setPreviewProfile] = useState<Profile | null>(() =>
    isPreview ? auth.currentProfile() : null,
  )

  const refresh = useCallback(() => {
    if (isPreview) setPreviewProfile(auth.currentProfile())
  }, [isPreview])

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false)
      return
    }

    let active = true

    getSupabase()
      .auth.getSession()
      .then(({ data }) => {
        if (!active) return
        // No auth event fires for an existing session, so the cache would sit
        // on 'guest' and refuse every stored URL — re-downloading everything
        // the visitor already had.
        setImageCacheOwner(data.session?.user?.id ?? null)
        setSession(data.session)
        setLoading(false)
      })

    const { data: sub } = getSupabase().auth.onAuthStateChange((_event, next) => {
      // Entitlement may have changed, so previously signed URLs must not be
      // reused — a premium image URL would otherwise survive a sign-out.
      // setImageCacheOwner both clears the old account's URLs and loads any
      // still-valid ones belonging to this one, which is what makes a reload
      // cost no bandwidth.
      setImageCacheOwner(next?.user?.id ?? null)
      setSession(next)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setProfile(null)
      return
    }

    let active = true
    getSupabase()
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setProfile((data as Profile) ?? null)
      })

    return () => {
      active = false
    }
    /*
     * Keyed on the user id, NOT on the session object.
     *
     * Supabase hands back a fresh session object every time it re-checks the
     * token, which it does whenever the tab regains focus. Depending on the
     * object meant this effect saw a "change" on every tab switch and re-read
     * the profile — an API call each time, for a row that had not changed.
     *
     * The profile belongs to a person, so the person's id is the dependency.
     */
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  const setPreviewTier = useCallback(
    (tier: Tier) => {
      window.localStorage.setItem(PREVIEW_KEY, tier)
      setPreviewTierState(tier)

      // Keep the switcher and the mock account in step: promoting to premium
      // is what the admin does by hand in the real system (scope §F).
      if (auth.currentProfile()) {
        if (tier === 'guest') {
          void auth.signOut().then(() => setPreviewProfile(null))
        } else {
          setMockPremium(tier === 'premium')
          setPreviewProfile(auth.currentProfile())
        }
      }
    },
    [],
  )

  const value = useMemo<SessionState>(() => {
    let tier: Tier
    if (isPreview) {
      tier = previewProfile
        ? previewProfile.is_premium
          ? 'premium'
          : 'registered'
        : previewTier
    } else {
      tier = !session ? 'guest' : profile?.is_premium ? 'premium' : 'registered'
    }

    return {
      session,
      profile: isPreview ? previewProfile : profile,
      tier,
      loading,
      isPreview,
      setPreviewTier,
      refresh,
      signOut: async () => {
        if (isPreview) {
          await auth.signOut()
          setPreviewProfile(null)
          window.localStorage.setItem(PREVIEW_KEY, 'guest')
          setPreviewTierState('guest')
          return
        }
        await getSupabase().auth.signOut()
      },
    }
  }, [session, profile, loading, isPreview, previewTier, previewProfile, setPreviewTier, refresh])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
