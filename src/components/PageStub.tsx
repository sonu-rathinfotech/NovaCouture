/** Placeholder for routes whose phase has not been built yet. */
export function PageStub({
  eyebrow,
  title,
  phase,
  note,
}: {
  eyebrow: string
  title: string
  phase: string
  note: string
}) {
  return (
    <section className="mx-auto max-w-[1360px] px-6 py-24 lg:px-14">
      <span className="eyebrow">{eyebrow}</span>
      <h1 className="mt-3 font-serif text-4xl font-light capitalize">
        {title.replace(/-/g, ' ')}
      </h1>
      <hr className="my-8 h-px border-0 bg-line" />
      <p className="max-w-[60ch] text-sm leading-relaxed text-ink-soft">
        <span className="text-gold">{phase}</span> — {note}
      </p>
    </section>
  )
}
