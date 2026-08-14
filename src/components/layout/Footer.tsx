import { Link } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { catalogue } from '@/data/catalogue'

export function Footer() {
  const { data: categories } = useAsync(() => catalogue.listCategories(), [])

  const columns = [
    {
      heading: 'Catalogue',
      links: [
        ...(categories ?? []).slice(0, 4).map((c) => ({ label: c.name, to: `/c/${c.slug}` })),
        { label: 'All collections', to: '/collections' },
      ],
    },
    {
      heading: 'The House',
      links: [
        { label: 'About', to: '/about' },
        { label: 'Contact', to: '/contact' },
        { label: 'Client sign in', to: '/sign-in' },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { label: 'Privacy Policy', to: '/privacy' },
        { label: 'Terms of Use', to: '/terms' },
      ],
    },
  ]

  return (
    <footer className="border-t border-champagne-500/20 bg-noir pt-24 pb-10 text-charcoal-400">
      <div className="container-lux">
        <div className="grid grid-cols-1 gap-12 pb-16 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-2xl tracking-wide text-charcoal-800">VK</span>
              <span className="font-sans text-[0.6rem] tracking-[0.3em] text-charcoal-400 uppercase">
                Jewellers
              </span>
            </div>
            <p className="mt-6 max-w-[38ch] text-sm leading-relaxed font-light">
              A private catalogue of fine gold and stone work, shown to registered clients.
              Nothing is sold through this site.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.heading}>
              <h2 className="mb-5 text-[0.65rem] font-medium tracking-[0.25em] text-champagne-400 uppercase">
                {col.heading}
              </h2>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="link-underline text-sm font-light transition-colors duration-300 hover:text-charcoal-900"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-between gap-3 border-t border-champagne-700 pt-8 text-[0.7rem] font-light tracking-[0.1em] text-charcoal-300">
          <span>© {new Date().getFullYear()} VK Jewellers</span>
          <span>Display only — no online sale</span>
        </div>
      </div>
    </footer>
  )
}
