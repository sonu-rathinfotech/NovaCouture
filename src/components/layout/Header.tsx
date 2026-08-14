import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, ChevronDown, Crown } from 'lucide-react'
import { useSession } from '@/hooks/useSession'
import { useAsync } from '@/hooks/useAsync'
import { catalogue } from '@/data/catalogue'
import { samplePhoto } from '@/components/catalogue/samplePhotos'
import { artKindFor } from '@/components/catalogue/art'

/**
 * Site header.
 *
 * Editorial couture: the bar is permanently solid ivory with a hairline rule
 * beneath — masthead, not chrome. The wordmark sits in near-black ink and
 * links stay black; there is no gold anywhere in this design.
 */
export function Header() {
  const { tier, profile, signOut } = useSession()
  const { data: categories } = useAsync(() => catalogue.listCategories(), [])
  const location = useLocation()
  const navigate = useNavigate()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [collectionsOpen, setCollectionsOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)

  const isHome = location.pathname === '/'

  // Leaving either menu open across a navigation is the most common way a
  // header feels broken.
  useEffect(() => {
    setMobileOpen(false)
    setCollectionsOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false)
        menuButton.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [mobileOpen])

  async function onSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  const nav = categories ?? []
  // Editorial: black links on ivory, darkening on hover. No gold.
  const linkTone = 'text-charcoal-700 hover:text-charcoal-900'

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-ivory-300 bg-ivory-100/95 backdrop-blur-md">
        <div className="container-lux">
          <div className="flex h-20 items-center justify-between">
            <Link to="/" className="flex items-baseline gap-2" aria-label="VK Jewellers, home">
              <span className="font-serif text-2xl tracking-wide text-charcoal-900 transition-colors duration-500">
                VK
              </span>
              <span className="font-sans text-[0.6rem] tracking-[0.3em] text-charcoal-400 uppercase transition-colors duration-500">
                Jewellers
              </span>
            </Link>

            <nav aria-label="Main" className="hidden items-center gap-10 lg:flex">
              <div
                className="relative"
                onMouseEnter={() => setCollectionsOpen(true)}
                onMouseLeave={() => setCollectionsOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setCollectionsOpen((open) => !open)}
                  aria-expanded={collectionsOpen}
                  className={`flex cursor-pointer items-center gap-1 text-xs font-medium tracking-[0.2em] uppercase transition-colors duration-300 ${linkTone}`}
                >
                  Collections
                  <ChevronDown
                    size={14}
                    strokeWidth={1.5}
                    className={`transition-transform duration-300 ${collectionsOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {collectionsOpen && nav.length > 0 && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4">
                    <div className="w-[640px] border border-ivory-300 bg-ivory-100 p-8 shadow-elevated animate-slide-down">
                      <div className="grid grid-cols-3 gap-6">
                        {nav.slice(0, 6).map((c) => (
                          <Link key={c.id} to={`/c/${c.slug}`} className="group text-left">
                            <div className="mb-3 aspect-square overflow-hidden bg-ivory-200">
                              <img
                                src={samplePhoto(artKindFor(c.slug), 0)}
                                alt=""
                                aria-hidden="true"
                                className="h-full w-full object-cover transition-transform duration-700 ease-lux group-hover:scale-105"
                              />
                            </div>
                            <p className="font-serif text-lg text-charcoal-800 transition-colors group-hover:text-champagne-800">
                              {c.name}
                            </p>
                            <p className="mt-0.5 text-[0.65rem] tracking-[0.15em] text-charcoal-400 uppercase">
                              {c.children.length > 0
                                ? c.children.map((s) => s.name).join(' · ')
                                : 'View all'}
                            </p>
                          </Link>
                        ))}
                      </div>
                      <Link
                        to="/collections"
                        className="mt-8 inline-flex items-center gap-2 border-t border-ivory-300 pt-6 text-[0.65rem] tracking-[0.2em] text-charcoal-500 uppercase transition-colors hover:text-charcoal-900"
                      >
                        View all collections
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {[
                { to: '/collections', label: 'Jewellery' },
                { to: '/about', label: 'About' },
                { to: '/contact', label: 'Contact' },
              ].map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`link-underline text-xs font-medium tracking-[0.2em] uppercase transition-colors duration-300 ${linkTone}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-5">
              {tier === 'guest' ? (
                <Link
                  to="/sign-in"
                  className={`link-underline hidden text-xs font-medium tracking-[0.2em] uppercase transition-colors duration-300 md:block ${linkTone}`}
                >
                  Sign in
                </Link>
              ) : (
                <>
                  <span className="hidden items-center gap-2 text-xs font-medium tracking-[0.2em] text-charcoal-700 uppercase md:flex">
                    {tier === 'premium' && (
                      <Crown size={14} strokeWidth={1.5} className="text-champagne-600" />
                    )}
                    <span>{tier === 'premium' ? 'Premium' : 'Account'}</span>
                    {profile?.name && (
                      <span className="hidden font-light tracking-normal normal-case text-charcoal-400 xl:inline">
                        — {profile.name}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="hidden cursor-pointer text-[0.65rem] font-light tracking-[0.15em] text-charcoal-400 uppercase transition-colors duration-300 hover:text-charcoal-600 md:block"
                  >
                    Sign out
                  </button>
                </>
              )}

              <button
                ref={menuButton}
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                aria-expanded={mobileOpen}
                className="-mr-2 grid size-11 cursor-pointer place-items-center text-charcoal-800 transition-colors hover:text-charcoal-900 lg:hidden"
              >
                <Menu size={22} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-charcoal-900/40 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-y-0 right-0 w-full max-w-sm overflow-y-auto bg-ivory-100 shadow-elevated animate-slide-down"
          >
            <div className="flex h-20 items-center justify-between border-b border-ivory-300 px-6">
              <span className="font-serif text-2xl text-charcoal-900">VK</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="grid size-11 cursor-pointer place-items-center text-charcoal-600"
              >
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>

            <nav aria-label="Menu" className="flex flex-col px-6 py-8">
              <p className="eyebrow mb-4">Collections</p>
              {nav.map((c) => (
                <Link
                  key={c.id}
                  to={`/c/${c.slug}`}
                  className="py-3 font-serif text-2xl text-charcoal-800 transition-colors hover:text-champagne-800"
                >
                  {c.name}
                </Link>
              ))}

              <p className="eyebrow mt-8 mb-4">More</p>
              {[
                { to: '/collections', label: 'All collections' },
                { to: '/about', label: 'About' },
                { to: '/contact', label: 'Contact' },
                ...(tier === 'guest' ? [{ to: '/sign-in', label: 'Sign in' }] : []),
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="py-3 font-serif text-2xl text-charcoal-800 transition-colors hover:text-champagne-800"
                >
                  {item.label}
                </Link>
              ))}

              {tier !== 'guest' && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="mt-4 cursor-pointer py-3 text-left font-serif text-2xl text-charcoal-400"
                >
                  Sign out
                </button>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* The header is fixed, so every page except the homepage needs its
          height back. The homepage hero deliberately runs underneath it. */}
      {!isHome && <div aria-hidden="true" className="h-20" />}
    </>
  )
}
