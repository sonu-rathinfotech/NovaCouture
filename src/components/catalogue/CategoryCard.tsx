import { Link } from 'react-router-dom'
import { samplePhoto } from './samplePhotos'
import { artKindFor } from './art'
import type { CategoryNode } from '@/data/catalogue'

/**
 * Category tile: photograph, name set on the image, and a hover line that
 * draws itself. The very slow scale (1.5s) is what separates this from a
 * hover effect — it should feel like the image breathing, not reacting.
 */
export function CategoryCard({
  category,
  large = false,
  index = 0,
}: {
  category: CategoryNode
  large?: boolean
  index?: number
}) {
  const sub = category.children.map((c) => c.name).join(' · ')

  return (
    <Link
      to={`/c/${category.slug}`}
      className={`group relative block w-full overflow-hidden bg-ivory-200 animate-fade-in ${
        large ? 'aspect-16/10 lg:aspect-16/9' : 'aspect-4/5'
      }`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <img
        src={samplePhoto(artKindFor(category.slug), index)}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.5s] ease-lux group-hover:scale-105"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-noir/75 via-noir/15 to-transparent"
      />

      <div className="absolute inset-x-0 bottom-0 p-8 text-left lg:p-10">
        {sub && (
          <p className="mb-2 text-[0.65rem] tracking-[0.25em] text-charcoal-900/85 uppercase opacity-0 transition-opacity duration-500 group-hover:opacity-100">
            {sub}
          </p>
        )}
        <h3
          className={`font-serif text-charcoal-900 ${large ? 'text-4xl lg:text-5xl' : 'text-3xl'}`}
        >
          {category.name}
        </h3>
        <span className="mt-4 inline-flex items-center gap-2 text-[0.7rem] tracking-[0.2em] text-charcoal-900/0 uppercase transition-all duration-500 group-hover:gap-3 group-hover:text-charcoal-900/90">
          Explore
          <span
            aria-hidden="true"
            className="block h-px w-0 bg-charcoal-900/85 transition-all duration-500 group-hover:w-8"
          />
        </span>
      </div>
    </Link>
  )
}
