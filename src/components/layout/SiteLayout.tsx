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
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-charcoal-900 focus:px-4 focus:py-2 focus:text-ivory-100"
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
