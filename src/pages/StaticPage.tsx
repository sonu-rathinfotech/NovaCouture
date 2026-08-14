import { STATIC_PAGES, splitPlaceholders, type StaticPageSlug } from '@/content/staticPages'
import { usePageTitle } from '@/hooks/usePageTitle'

/**
 * Renders the About, Contact, Privacy and Terms pages from src/content.
 *
 * Two things are deliberately loud rather than tidy: unsupplied facts, and the
 * draft status of the legal pages. Both would otherwise reach launch unnoticed,
 * and a Privacy Policy that quietly says the wrong thing is worse than an
 * obviously unfinished one.
 */
export function StaticPage({ slug }: { slug: StaticPageSlug }) {
  const page = STATIC_PAGES[slug]
  const isLegal = slug === 'privacy' || slug === 'terms'
  usePageTitle(page.title)

  return (
    <article className="container max-w-[760px] py-16 lg:py-24">
      <header className="mb-12 text-center">
        <span className="eyebrow text-[var(--color-accent)]">{isLegal ? 'Legal' : 'Information'}</span>
        <h1 className="mt-4 font-display text-[var(--text-h1)] text-[var(--color-fg)]">{page.title}</h1>
        {page.updated && (
          <p className="mt-3 text-sm font-light text-[var(--color-fg-muted)]">
            Last updated <Text value={page.updated} />
          </p>
        )}
        {page.intro && (
          <p className="mx-auto mt-5 max-w-[58ch] text-[var(--text-body-lg)] leading-relaxed font-light text-[var(--color-fg-muted)]">
            <Text value={page.intro} />
          </p>
        )}
      </header>

      {!page.approved && isLegal && (
        <div
          role="note"
          className="mb-12 p-5 bg-[var(--color-warning-bg)] border border-[var(--color-warning)] border-l-4 rounded-lg"
        >
          <p className="text-sm leading-relaxed font-light text-[var(--color-warning)]">
            <strong className="text-[var(--color-fg)]">Draft — not yet approved.</strong> This text describes what
            the platform actually does, but it has not been reviewed by anyone qualified to approve
            it as a legal document. It must not be published in this state.
          </p>
        </div>
      )}

      {page.sections.map((section, i) => (
        <section key={i} className="mb-10">
          {section.heading && (
            <h2 className="mb-4 font-display text-[var(--text-h3)] text-[var(--color-fg)]">{section.heading}</h2>
          )}
          {section.paragraphs.map((paragraph, j) => (
            <p key={j} className="mb-4 text-[var(--text-body)] leading-relaxed font-light text-[var(--color-fg-muted)]">
              <Text value={paragraph} />
            </p>
          ))}
          {section.list && (
            <ul className="mb-4 space-y-2">
              {section.list.map((item, j) => (
                <li
                  key={j}
                  className="flex gap-3 text-[var(--text-body)] leading-relaxed font-light text-[var(--color-fg-muted)]"
                >
                  <span aria-hidden="true" className="text-[var(--color-accent)] flex-shrink-0">·</span>
                  <span>
                    <Text value={item} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </article>
  )
}

/** Renders text, marking any [[unsupplied fact]] so it cannot ship unnoticed. */
function Text({ value }: { value: string }) {
  return (
    <>
      {splitPlaceholders(value).map((part, i) =>
        part.placeholder ? (
          <mark
            key={i}
            className="bg-[var(--color-accent-light)] px-1.5 py-0.5 text-[var(--color-accent)] italic rounded-sm"
            title="Not supplied yet"
          >
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  )
}