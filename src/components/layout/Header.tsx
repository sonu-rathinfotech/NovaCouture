import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, ChevronDown, Crown, User, LogOut, ShoppingBag, ReceiptText } from 'lucide-react'
import { useSession } from '@/hooks/useSession'
import { useOrderDraft } from '@/hooks/useOrderDraft'
import { useAsync } from '@/hooks/useAsync'
import { catalogue } from '@/data/catalogue'
import { samplePhoto } from '@/components/catalogue/samplePhotos'
import { artKindFor } from '@/components/catalogue/art'
import { ButtonLink } from '@/components/ui'

/**
 * Site Header - New Design System
 * 
 * Features from reference sites:
 * - Tanishq: Trust badges, sticky header, clear category navigation
 * - GIVA: Clean minimalist, product-focused
 * - CaratLane: Smart filtering access, sticky nav
 * - Tiffany: Editorial wordmark, premium feel
 * - Mejuri: Transparent trust signals in header
 * - Blue Nile: Search prominence, account access
 */

export function Header() {
  const { tier, profile, signOut } = useSession()
  const { count: orderCount } = useOrderDraft()
  const { data: categories } = useAsync(() => catalogue.listCategories(), [])
  const location = useLocation()
  const navigate = useNavigate()

  const [mobileOpen, setMobileOpen] = useState(false)
  /*
   * Two separate reasons the Collections panel can be open, because one flag
   * cannot express both.
   *
   * With a single flag, hovering set it true and then the click toggled it
   * straight back to false — so clicking the menu closed the panel that
   * hovering had just opened, which reads as "I cannot click it".
   */
  const [collectionsHovered, setCollectionsHovered] = useState(false)
  const [collectionsPinned, setCollectionsPinned] = useState(false)
  const collectionsOpen = collectionsHovered || collectionsPinned
  const closeTimer = useRef<number | undefined>(undefined)

  function openCollections() {
    window.clearTimeout(closeTimer.current)
    setCollectionsHovered(true)
  }

  /*
   * Closing is delayed. The pointer has to travel from the trigger across to
   * the panel, and any twitch outside the wrapper on the way fires mouseleave.
   * Without the grace period the panel vanishes mid-journey.
   */
  function closeCollections() {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setCollectionsHovered(false), 180)
  }

  function dismissCollections() {
    window.clearTimeout(closeTimer.current)
    setCollectionsHovered(false)
    setCollectionsPinned(false)
  }
  const [searchOpen, setSearchOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Close menus on navigation
  useEffect(() => {
    setMobileOpen(false)
    dismissCollections()
    setSearchOpen(false)
    // dismissCollections is stable enough for this: it only touches refs and
    // setState, both of which are stable across renders.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // Escape closes the Collections panel. Without it a pinned panel can only be
  // dismissed with a mouse, which strands anyone navigating by keyboard.
  useEffect(() => {
    if (!collectionsOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissCollections()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionsOpen])

  // Body lock for mobile menu
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

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [searchOpen])

  async function onSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  const nav = categories ?? []
  const linkTone = 'text-[var(--color-fg)] hover:text-[var(--color-accent)] transition-colors duration-200'

  return (
    <>
      {/* Main Header */}
      <header className="sticky top-0 z-[var(--z-fixed)] border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]/95 backdrop-blur-md">
        <div className="container">
          <div className="flex h-18 items-center justify-between gap-4">
            {/* Logo / Wordmark - Tiffany-inspired editorial style */}
            <Link to="/" className="flex items-baseline gap-2 shrink-0" aria-label="Nova Couture, home">
              <span className="font-display text-xl font-medium text-[var(--color-fg)] tracking-tight transition-colors duration-500">
                Nova
              </span>
              <span className="font-ui text-[0.6rem] tracking-[0.3em] text-[var(--color-fg-muted)] uppercase transition-colors duration-500">
                Couture
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav aria-label="Main navigation" className="hidden items-center gap-8 lg:flex flex-1 justify-center">
              {/* Collections Dropdown - Tanishq/CaratLane style */}
              <div
                className="relative"
                onMouseEnter={openCollections}
                onMouseLeave={closeCollections}
              >
                <button
                  type="button"
                  onClick={() => setCollectionsPinned((pinned) => !pinned)}
                  aria-expanded={collectionsOpen}
                  aria-haspopup="true"
                  className={`flex cursor-pointer items-center gap-1.5 text-sm font-medium tracking-[0.15em] uppercase transition-colors duration-200 ${linkTone}`}
                >
                  Collections
                  <ChevronDown
                    size={14}
                    strokeWidth={1.5}
                    className={`transition-transform duration-200 ${collectionsOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>

                {collectionsOpen && nav.length > 0 && (
                  /*
                   * The width was `w-full max-w-4xl`. `w-full` is 100% of the
                   * positioning parent — the Collections BUTTON, about 110px —
                   * so max-w-4xl never applied and a four-column grid was
                   * crammed into 110px. That is why the category names sat on
                   * top of each other.
                   *
                   * The spacing below the trigger is padding, not margin: a
                   * margin leaves a gap that belongs to no element, and
                   * crossing it fires mouseleave.
                   */
                  <div className="absolute top-full left-1/2 w-[min(52rem,calc(100vw-3rem))] -translate-x-1/2 pt-3">
                    <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl shadow-[var(--shadow-xl)] p-6 animate-slide-down">
                      {/* Six top-level categories: three across reads better
                          than four-then-two. */}
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        {nav.slice(0, 8).map((c) => (
                          <Link
                            key={c.id}
                            to={`/c/${c.slug}`}
                            className="group text-left p-3 rounded-lg hover:bg-[var(--color-bg-muted)] transition-colors"
                          >
                            <div className="mb-2 aspect-square overflow-hidden bg-[var(--color-bg-muted)] rounded-md">
                              <img
                                src={samplePhoto(artKindFor(c.slug), 0)}
                                alt=""
                                aria-hidden="true"
                                className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                              />
                            </div>
                            <p className="font-display text-base font-medium text-[var(--color-fg)] group-hover:text-[var(--color-accent)] transition-colors">
                              {c.name}
                            </p>
                            {c.children.length > 0 && (
                              <p className="mt-1 text-[0.65rem] tracking-[0.1em] text-[var(--color-fg-muted)] uppercase">
                                {c.children.map((s) => s.name).join(' · ')}
                              </p>
                            )}
                          </Link>
                        ))}
                      </div>
                      <Link
                        to="/collections"
                        className="mt-4 inline-flex items-center gap-2 border-t border-[var(--color-border)] pt-4 text-sm tracking-[0.15em] text-[var(--color-fg-muted)] uppercase transition-colors hover:text-[var(--color-accent)]"
                      >
                        View all collections
                        <ChevronDown size={14} strokeWidth={1.5} className="rotate-90" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick links */}
              {[
                { to: '/collections', label: 'All Jewellery' },
                { to: '/about', label: 'About' },
                { to: '/contact', label: 'Contact' },
              ].map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`text-sm font-medium tracking-[0.15em] uppercase transition-colors duration-200 relative ${linkTone} after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-[var(--color-accent)] after:transition-all hover:after:w-full`}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* Right side actions */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Search button - Blue Nile style */}
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                className="p-2 rounded-lg text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-muted)] transition-colors lg:hidden"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Account / Sign in */}
              {tier === 'guest' ? (
                <>
                  <ButtonLink to="/sign-in" variant="ghost" size="sm" className="hidden sm:inline-flex">
                    Sign in
                  </ButtonLink>
                  <ButtonLink to="/register" variant="primary" size="sm">
                    Register
                  </ButtonLink>
                </>
              ) : (
                <>
                  {/*
                   * Cart, with a live count.
                   *
                   * It sits in the header rather than only inside the account
                   * menu because a basket the visitor cannot see is a basket
                   * they forget: they add a piece, carry on browsing, and
                   * nothing on screen says the order is waiting for them.
                   */}
                  <Link
                    to="/cart"
                    aria-label={
                      orderCount > 0
                        ? `Cart, ${orderCount} ${orderCount === 1 ? 'piece' : 'pieces'}`
                        : 'Cart, empty'
                    }
                    className="relative rounded-lg p-2 text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-fg)]"
                  >
                    <ShoppingBag className="h-5 w-5" />
                    {orderCount > 0 && (
                      <span
                        aria-hidden="true"
                        className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[0.625rem] font-medium text-white tabular-nums"
                      >
                        {/* Past 99 the badge stops being a number and starts
                            being a shape, so it is capped. */}
                        {orderCount > 99 ? '99+' : orderCount}
                      </span>
                    )}
                  </Link>

                  {/* Premium badge - Mejuri trust signal style */}
                  {tier === 'premium' && (
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[var(--trust-gold)] to-[var(--accent-600)] text-white text-xs font-medium tracking-[0.1em] uppercase rounded-full">
                      <Crown size={12} strokeWidth={2} />
                      Premium
                    </span>
                  )}

                  {/* User menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMobileOpen(true)}
                      aria-expanded={mobileOpen}
                      aria-haspopup="true"
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--color-fg)] hover:bg-[var(--color-bg-muted)] rounded-lg transition-colors"
                    >
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">{profile?.name || 'Account'}</span>
                      <ChevronDown size={14} strokeWidth={1.5} className="hidden sm:inline" />
                    </button>

                    {mobileOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl shadow-[var(--shadow-xl)] py-2 animate-slide-down">
                        {profile?.name && (
                          <p className="px-4 py-2 text-sm font-medium text-[var(--color-fg)]">{profile.name}</p>
                        )}
                        <p className="px-4 py-1 text-xs text-[var(--color-fg-muted)] capitalize">{tier} access</p>
                        <hr className="my-2 border-[var(--color-border)]" />
                        <Link
                          to="/cart"
                          onClick={() => setMobileOpen(false)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[var(--color-fg)] hover:bg-[var(--color-bg-muted)]"
                        >
                          <ShoppingBag className="h-4 w-4" />
                          Cart{orderCount > 0 ? ` (${orderCount})` : ''}
                        </Link>
                        <Link
                          to="/orders"
                          onClick={() => setMobileOpen(false)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[var(--color-fg)] hover:bg-[var(--color-bg-muted)]"
                        >
                          <ReceiptText className="h-4 w-4" />
                          Past orders
                        </Link>
                        <hr className="my-2 border-[var(--color-border)]" />
                        <button
                          type="button"
                          onClick={onSignOut}
                          className="w-full px-4 py-2 text-left text-sm text-[var(--color-fg)] hover:bg-[var(--color-bg-muted)] flex items-center gap-2"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Mobile menu button */}
              <button
                ref={menuButton}
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                aria-expanded={mobileOpen}
                className="p-2 rounded-lg text-[var(--color-fg)] hover:bg-[var(--color-bg-muted)] transition-colors lg:hidden"
              >
                <Menu className="h-6 w-6" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Search Bar - slides down when open */}
          {searchOpen && (
            <div className="absolute top-full left-0 right-0 bg-[var(--color-bg-elevated)] border-b border-[var(--color-border)] shadow-[var(--shadow-lg)] py-4 animate-slide-down lg:static lg:shadow-none lg:border-none lg:bg-transparent lg:py-0">
              <form
                className="container flex items-center gap-3"
                role="search"
                onSubmit={(e) => {
                  e.preventDefault()
                  const typed = searchInputRef.current?.value.trim() ?? ''
                  if (!typed) return
                  setSearchOpen(false)
                  navigate(`/search?q=${encodeURIComponent(typed)}`)
                }}
              >
                <label htmlFor="header-search" className="visually-hidden">
                  Search products
                </label>
                <div className="relative flex-1">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-fg-subtle)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    ref={searchInputRef}
                    id="header-search"
                    type="search"
                    placeholder="Search jewellery..."
                    className="w-full pl-12 pr-4 py-3 bg-[var(--color-bg-muted)] border border-[var(--color-border)] rounded-lg text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition-all"
                    autoComplete="off"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-3 rounded-lg bg-[var(--color-fg)] text-[var(--color-bg)] text-sm font-medium transition-opacity hover:opacity-90"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="p-2 rounded-lg text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-muted)] transition-colors lg:hidden"
                  aria-label="Close search"
                >
                  <X className="h-5 w-5" strokeWidth={2} />
                </button>
              </form>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div
            className="absolute inset-0 bg-[var(--color-fg)]/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-[var(--color-bg-elevated)] shadow-[var(--shadow-2xl)] animate-slide-down overflow-y-auto">
            <div className="flex h-18 items-center justify-between border-b border-[var(--color-border)] px-6">
              <span className="font-display text-xl font-medium text-[var(--color-fg)]">Nova Couture</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="p-2 rounded-lg text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-muted)] transition-colors"
              >
                <X className="h-6 w-6" strokeWidth={1.5} />
              </button>
            </div>

            <nav className="p-6 space-y-6">
              <div>
                <p className="eyebrow mb-4 text-[var(--color-accent)]">Collections</p>
                <ul className="space-y-3">
                  {nav.map((c) => (
                    <li key={c.id}>
                      <Link
                        to={`/c/${c.slug}`}
                        onClick={() => setMobileOpen(false)}
                        className="block py-3 font-display text-xl text-[var(--color-fg)] hover:text-[var(--color-accent)] transition-colors"
                      >
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="eyebrow mb-4 text-[var(--color-accent)]">More</p>
                <ul className="space-y-3">
                  {[
                    { to: '/collections', label: 'All Collections' },
                    { to: '/about', label: 'About' },
                    { to: '/contact', label: 'Contact' },
                    ...(tier === 'guest' ? [{ to: '/sign-in', label: 'Sign In' }] : []),
                    ...(tier === 'guest' ? [{ to: '/register', label: 'Register' }] : []),
                  ].map((item) => (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        onClick={() => setMobileOpen(false)}
                        className="block py-3 font-display text-xl text-[var(--color-fg)] hover:text-[var(--color-accent)] transition-colors"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {tier !== 'guest' && (
                <div className="pt-4 border-t border-[var(--color-border)]">
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="w-full py-3 text-left font-display text-xl text-[var(--color-fg-muted)] hover:text-[var(--color-danger)] transition-colors flex items-center gap-3"
                  >
                    <LogOut className="h-6 w-6" />
                    Sign out
                  </button>
                </div>
              )}
            </nav>
          </div>
        </div>
      )}

    </>
  )
}