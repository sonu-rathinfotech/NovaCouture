import { Link } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { catalogue } from '@/data/catalogue'
import type { SVGProps } from 'react'

/* lucide dropped brand icons in v1, so the social marks are inline SVGs. */
function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

/**
 * Footer - New Design System
 * 
 * Features from reference sites:
 * - Tanishq: Trust badges row, clear category links
 * - GIVA: Clean, minimal, organized columns
 * - CaratLane: Educational links, certification badges
 * - Tiffany: Editorial tone, brand story
 * - Mejuri: Sustainability, transparency links
 * - Blue Nile: Education center, certification
 * - Kalyan: Regional collections, heritage
 */

export function Footer() {
  const { data: categories } = useAsync(() => catalogue.listCategories(), [])

  const footerColumns = [
    {
      heading: 'Catalogue',
      links: [
        ...(categories ?? []).slice(0, 5).map((c) => ({ label: c.name, to: `/c/${c.slug}` })),
        { label: 'All Collections', to: '/collections' },
      ],
    },
    {
      heading: 'The House of Nova',
      links: [
        { label: 'Our Story', to: '/about' },
        // These pointed at /about#craftsmanship and /about#heritage. Neither
        // anchor exists on that page, so both quietly landed at the top — a
        // link that promises a section and delivers the page it is already on.
        // Give them their own headings on the about page, then link again.
        { label: 'Contact Us', to: '/contact' },
        { label: 'Client Portal', to: '/sign-in' },
      ],
    },
    {
      // Five links stood here — Certification Guide, Care & Repair, Custom
      // Orders, Appointment Booking, FAQs — and four of them pointed at pages
      // that do not exist, on every page of the site. A footer full of 404s
      // reads as an abandoned site, which is the opposite of what a footer is
      // for. Restore each one as its page is actually written.
      heading: 'Client Services',
      links: [
        { label: 'Contact us', to: '/contact' },
      ],
    },
    {
      heading: 'Legal & Policies',
      links: [
        { label: 'Privacy Policy', to: '/privacy' },
        { label: 'Terms of Use', to: '/terms' },
      ],
    },
  ]


  // Empty until Nova Couture supplies its own handles. These pointed at instagram.com
  // and facebook.com themselves — a "follow us" that goes to the platform's
  // front page is worse than no icon at all.
  const socialLinks: { icon: typeof InstagramIcon; href: string; label: string }[] = []

  return (
    <footer className="bg-[var(--color-fg)] text-[var(--base-50)]" role="contentinfo">
      {/* A row of trust badges stood here — BIS Hallmarked, Lifetime
          Warranty, Insured Shipping, 30-day returns, Personal Concierge.
          It came with the design this was adapted from. Nova Couture has never
          said any of it, and BIS hallmarking is a legal certification.
          Restore it only in Nova Couture's own words, claim by claim. */}

      {/* Main Footer Grid */}
      <div className="py-16 lg:py-24">
        <div className="container">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
            {/* Brand Column */}
            <div className="lg:col-span-1 max-w-xs">
              <Link to="/" className="mb-6 inline-block" aria-label="Nova Couture, home">
                {/* The bright variant: this sits on the near-black footer. */}
                <img
                  src="/logo-on-dark.png"
                  alt="Nova Couture"
                  width={253}
                  height={90}
                  className="h-11 w-auto"
                />
              </Link>
              <p className="text-[var(--base-400)] text-sm leading-relaxed mb-6 max-w-[38ch]">
                A private catalogue of fine gold and stone work, shown to registered clients.
                Nothing is sold through this site — pieces are available by private enquiry only.
              </p>
              
              {/* Social Links */}
              <div className="flex items-center gap-4">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="p-2 bg-[var(--base-800)] rounded-lg text-[var(--base-400)] hover:text-white hover:bg-[var(--base-700)] transition-colors"
                  >
                    <social.icon className="h-5 w-5" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>

            {/* Navigation Columns */}
            {footerColumns.map((col) => (
              <div key={col.heading}>
                <h2 className="font-medium text-sm tracking-[0.15em] uppercase text-white mb-5">
                  {col.heading}
                </h2>
                <ul className="space-y-3" role="list">
                  {col.links.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="text-sm text-[var(--base-400)] hover:text-white transition-colors duration-200 relative inline-block after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-[var(--trust-gold)] after:transition-all hover:after:w-full"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[var(--base-800)] py-6">
        <div className="container">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-[var(--base-500)] text-sm">
              © {new Date().getFullYear()} Nova Couture. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-[var(--base-500)] text-sm">
              <span>Display only — no online sale</span>
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link to="/cookies" className="hover:text-white transition-colors">Cookies</Link>
              <Link to="/accessibility" className="hover:text-white transition-colors">Accessibility</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}