/**
 * Section and page headings.
 *
 * One component so every page opens the same way: eyebrow, serif title, and an
 * optional line beneath. Consistency here is most of what makes a set of pages
 * feel like one site.
 */
export function PageHeader({
  eyebrow,
  title,
  note,
  align = 'center',
}: {
  eyebrow?: string
  title: string
  note?: string
  align?: 'center' | 'left'
}) {
  const centred = align === 'center'

  return (
    <div className={`mb-16 ${centred ? 'text-center' : ''}`}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      {/* The heritage ornament: a gold diamond between two hairlines. */}
      <span
        aria-hidden="true"
        className={`mb-6 flex items-center gap-2 ${centred ? 'justify-center' : ''}`}
      >
        <span className="h-px w-8 bg-champagne-400" />
        <span className="size-1.5 rotate-45 bg-champagne-500" />
        <span className="h-px w-8 bg-champagne-400" />
      </span>
      <h1 className="text-balance font-serif text-display-sm text-charcoal-800">{title}</h1>
      {note && (
        <p
          className={`mt-4 text-base leading-relaxed font-light text-charcoal-400 ${
            centred ? 'mx-auto max-w-xl' : 'max-w-xl'
          }`}
        >
          {note}
        </p>
      )}
    </div>
  )
}

/** Same treatment, used for a section inside a page rather than its title. */
export function SectionHead({
  eyebrow,
  title,
  note,
}: {
  eyebrow: string
  title: string
  note?: string
}) {
  return (
    <div className="mb-16 text-center">
      <p className="eyebrow mb-3">{eyebrow}</p>
      <span aria-hidden="true" className="mb-6 flex items-center justify-center gap-2">
        <span className="h-px w-8 bg-champagne-400" />
        <span className="size-1.5 rotate-45 bg-champagne-500" />
        <span className="h-px w-8 bg-champagne-400" />
      </span>
      <h2 className="font-serif text-display-sm text-charcoal-800">{title}</h2>
      {note && (
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed font-light text-charcoal-400">
          {note}
        </p>
      )}
    </div>
  )
}
