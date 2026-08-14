import { Link } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { catalogue } from '@/data/catalogue'
import type { SVGProps } from 'react'
import { Crown, Truck, Shield, RotateCcw, Headphones } from 'lucide-react'

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

function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function YoutubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
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
      heading: 'The House of VK',
      links: [
        { label: 'Our Story', to: '/about' },
        { label: 'Craftsmanship', to: '/about#craftsmanship' },
        { label: 'Heritage', to: '/about#heritage' },
        { label: 'Contact Us', to: '/contact' },
        { label: 'Client Portal', to: '/sign-in' },
      ],
    },
    {
      heading: 'Client Services',
      links: [
        { label: 'Certification Guide', to: '/certification' },
        { label: 'Care & Repair', to: '/care' },
        { label: 'Custom Orders', to: '/custom' },
        { label: 'Appointment Booking', to: '/contact#appointment' },
        { label: 'FAQs', to: '/faqs' },
      ],
    },
    {
      heading: 'Legal & Policies',
      links: [
        { label: 'Privacy Policy', to: '/privacy' },
        { label: 'Terms of Use', to: '/terms' },
        { label: 'Cookie Policy', to: '/cookies' },
        { label: 'Accessibility', to: '/accessibility' },
      ],
    },
  ]

  const trustBadges = [
    { icon: Shield, label: 'BIS Hallmarked', desc: 'Government certified purity' },
    { icon: Crown, label: 'Lifetime Warranty', desc: 'On all craftsmanship' },
    { icon: Truck, label: 'Insured Shipping', desc: 'Free & fully insured' },
    { icon: RotateCcw, label: '30-Day Returns', desc: 'Hassle-free exchange' },
    { icon: Headphones, label: 'Personal Concierge', desc: 'Dedicated support' },
  ]

  const socialLinks = [
    { icon: InstagramIcon, href: 'https://instagram.com', label: 'Instagram' },
    { icon: FacebookIcon, href: 'https://facebook.com', label: 'Facebook' },
    { icon: XIcon, href: 'https://x.com', label: 'X (Twitter)' },
    { icon: YoutubeIcon, href: 'https://youtube.com', label: 'YouTube' },
  ]

  return (
    <footer className="bg-[var(--color-fg)] text-[var(--base-50)]" role="contentinfo">
      {/* Trust Badges Bar - Tanishq/Blue Nile style */}
      <div className="border-b border-[var(--base-800)] py-6">
        <div className="container">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5 items-center">
            {trustBadges.map((badge, i) => (
              <div
                key={badge.label}
                className="flex items-center gap-3 p-3 hover:bg-[var(--base-900)] rounded-lg transition-colors animate-fade-in-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="p-2 bg-[var(--base-800)] rounded-lg">
                  <badge.icon className="h-5 w-5 text-[var(--trust-gold)]" aria-hidden="true" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm text-white">{badge.label}</p>
                  <p className="text-[var(--base-400)] text-xs">{badge.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer Grid */}
      <div className="py-16 lg:py-24">
        <div className="container">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
            {/* Brand Column */}
            <div className="lg:col-span-1 max-w-xs">
              <Link to="/" className="flex items-baseline gap-2 mb-6" aria-label="VK Jewellers, home">
                <span className="font-display text-2xl font-medium text-white tracking-tight">VK</span>
                <span className="font-ui text-[0.6rem] tracking-[0.3em] text-[var(--base-400)] uppercase">Jewellers</span>
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
              © {new Date().getFullYear()} VK Jewellers. All rights reserved.
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