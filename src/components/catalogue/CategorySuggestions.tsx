import { Link } from 'react-router-dom'
import { samplePhoto } from './samplePhotos'
import type { ArtKind } from './art'

/**
 * "You might be looking for" — four category cards, offered on the dead ends:
 * 404, an empty search, a collection link that could not be opened.
 *
 * Extracted because the same block had been written three times and carried the
 * same two defects in each copy: `kind` widened to `string`, which does not
 * satisfy samplePhoto's ArtKind and broke the typecheck, and absolutely
 * positioned children with no positioned ancestor, which threw the photograph
 * out of its card. Fixing it in three places was the alternative.
 *
 * Not a general-purpose component. It exists for dead ends, and the wording of
 * its heading is the caller's business.
 */

/** Kept in step with the top-level categories in seed.sql. */
const CATEGORIES: { name: string; slug: string; kind: ArtKind }[] = [
  { name: 'Necklaces', slug: 'necklaces', kind: 'necklace' },
  { name: 'Earrings', slug: 'earrings', kind: 'earring' },
  { name: 'Bangles', slug: 'bangles', kind: 'bangle' },
  { name: 'Rings', slug: 'rings', kind: 'ring' },
]

export function CategorySuggestions({ heading }: { heading?: string }) {
  return (
    <div className="w-full">
      {heading && (
        <p className="eyebrow mb-6 text-center text-[var(--color-accent)]">{heading}</p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {CATEGORIES.map((category, i) => (
          <Link
            key={category.slug}
            to={`/c/${category.slug}`}
            /* `relative` is the fix for the bug this component was extracted to
               end: the photograph and its gradient are absolutely positioned,
               so the card itself has to be the positioned ancestor. */
            className="group relative block aspect-square overflow-hidden rounded-xl bg-[var(--color-bg-muted)] transition-all duration-300 hover:shadow-[var(--shadow-lg)]"
          >
            <img
              src={samplePhoto(category.kind, i)}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-[var(--color-fg)]/70 via-transparent to-transparent"
              aria-hidden="true"
            />
            <div className="absolute inset-0 z-10 flex items-end p-4 text-white">
              <h3 className="font-display text-lg font-medium tracking-tight">{category.name}</h3>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
