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
      {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
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
      <p className="eyebrow mb-4">{eyebrow}</p>
      <h2 className="font-serif text-display-sm text-charcoal-800">{title}</h2>
      {note && (
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed font-light text-charcoal-400">
          {note}
        </p>
      )}
    </div>
  )
}
