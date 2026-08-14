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
    <section className="container py-24">
      <span className="eyebrow text-[var(--color-accent)]">{eyebrow}</span>
      <h1 className="mt-3 font-display text-4xl font-light capitalize text-[var(--color-fg)]">
        {title.replace(/-/g, ' ')}
      </h1>
      <hr className="my-8 h-px border-0 bg-[var(--color-border)]" />
      <p className="max-w-[60ch] text-sm leading-relaxed text-[var(--color-fg-muted)]">
        <span className="text-[var(--color-accent)]">{phase}</span> — {note}
      </p>
    </section>
  )
}
