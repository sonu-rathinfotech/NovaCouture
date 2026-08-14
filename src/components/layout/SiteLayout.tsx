import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { PreviewBar } from '@/components/PreviewBar'

/** react-router's <ScrollRestoration> needs a data router; this app uses
 *  <BrowserRouter>, so scroll reset is handled here. */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export function SiteLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-fg)]">
      <ScrollToTop />
      <a
        href="#main"
        className="visually-hidden focus:not-visually-hidden focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--color-accent)] focus:text-white"
      >
        Skip to content
      </a>
      <PreviewBar />
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
