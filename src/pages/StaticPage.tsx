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
    <article className="container-lux max-w-[760px] py-20 lg:py-28">
      <header className="mb-12 text-center">
        <span className="eyebrow">{isLegal ? 'Legal' : 'Information'}</span>
        <h1 className="mt-4 font-serif text-display-sm text-charcoal-800">{page.title}</h1>
        {page.updated && (
          <p className="mt-3 text-[0.8125rem] font-light text-charcoal-400">
            Last updated <Text value={page.updated} />
          </p>
        )}
        {page.intro && (
          <p className="mx-auto mt-5 max-w-[58ch] text-base leading-relaxed font-light text-charcoal-400">
            <Text value={page.intro} />
          </p>
        )}
      </header>

      {!page.approved && isLegal && (
        <p
          role="note"
          className="mb-12 border border-line border-l-2 border-l-danger bg-ivory-50 px-5 py-4 text-[0.8125rem] leading-relaxed font-light text-charcoal-500"
        >
          <strong className="text-ink">Draft — not yet approved.</strong> This text describes what
          the platform actually does, but it has not been reviewed by anyone qualified to approve
          it as a legal document. It must not be published in this state.
        </p>
      )}

      {page.sections.map((section, i) => (
        <section key={i} className="mb-10">
          {section.heading && (
            <h2 className="mb-4 font-serif text-2xl text-charcoal-800">{section.heading}</h2>
          )}
          {section.paragraphs.map((paragraph, j) => (
            <p key={j} className="mb-4 text-base leading-[1.8] font-light text-charcoal-500">
              <Text value={paragraph} />
            </p>
          ))}
          {section.list && (
            <ul className="mb-4 space-y-2">
              {section.list.map((item, j) => (
                <li
                  key={j}
                  className="flex gap-3 text-base leading-[1.8] font-light text-charcoal-500"
                >
                  <span aria-hidden="true" className="text-champagne-500">
                    ·
                  </span>
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
            className="bg-champagne-50 px-1.5 py-0.5 text-charcoal-500 italic"
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
