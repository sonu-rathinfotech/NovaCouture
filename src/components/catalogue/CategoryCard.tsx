import { Link } from 'react-router-dom'
import { samplePhoto } from './samplePhotos'
import { artKindFor } from './art'

interface CategoryCardProps {
  category: {
    id: string
    slug: string
    name: string
    children: { id: string; name: string; slug: string }[]
  }
  large?: boolean
  index?: number
}

export function CategoryCard({ category, large = false, index = 0 }: CategoryCardProps) {
  const kind = artKindFor(category.slug)
  const subCount = category.children.length

  return (
    <article className="animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
      <Link to={`/c/${category.slug}`} className="group block">
        {/* Image */}
        <div className={`relative overflow-hidden bg-[var(--color-bg-muted)] rounded-xl ${large ? 'aspect-[4/5]' : 'aspect-square'}`}>
          <img
            src={samplePhoto(kind, 0)}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          
          {/* Gradient overlay for text readability on large cards */}
          {large && (
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[var(--color-fg)]/60 via-transparent to-transparent" />
          )}

          {/* Category Name Overlay on Large */}
          {large && (
            <div className="absolute inset-0 flex items-end p-6 text-white z-10">
              <div>
                <p className="eyebrow mb-2 text-[var(--base-300)]">
                  {subCount > 0
                    ? category.children.map((c) => c.name).join(' · ')
                    : 'From the catalogue'}
                </p>
                <h3 className="font-display text-2xl lg:text-3xl font-medium tracking-tight">
                  {category.name}
                </h3>
              </div>
            </div>
          )}

          {/* Watermark */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 200 60%27%3E%3Ctext x=%2750%25%27 y=%2750%25%27 dominant-baseline=%27middle%27 text-anchor=%27middle%27 font-family=%27Playfair Display, serif%27 font-size=%2718%27 font-weight=%27500%27 fill=%27white%27 fill-opacity=%270.05%27%3ENOVA COUTURE%3C/text%3E%3C/svg%27')] bg-repeat bg-[200px_60px]" />
          </div>
        </div>

        {/* Info below image for small cards */}
        {!large && (
          <div className="mt-4 text-center space-y-1">
            <h3 className="font-display text-lg font-medium text-[var(--color-fg)] group-hover:text-[var(--color-accent)] transition-colors">
              {category.name}
            </h3>
            {subCount > 0 && (
              <p className="text-[0.7rem] tracking-[0.1em] uppercase text-[var(--color-fg-muted)]">
                {category.children.slice(0, 3).map((c) => c.name).join(' · ')}
                {subCount > 3 && ` +${subCount - 3} more`}
              </p>
            )}
          </div>
        )}
      </Link>
    </article>
  )
}