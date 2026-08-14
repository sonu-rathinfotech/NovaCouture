import { ButtonLink } from '@/components/ui/Button'
import { usePageTitle } from '@/hooks/usePageTitle'

export function NotFound() {
  usePageTitle('Page not found')
  return (
    <section className="container py-32 text-center">
      <p className="eyebrow mb-4 text-[var(--color-accent)]">404</p>
      <h1 className="text-balance font-display text-[var(--text-h1)] text-[var(--color-fg)]">
        This page is not in the catalogue
      </h1>
      <p className="mx-auto mt-5 max-w-md text-base leading-relaxed font-light text-[var(--color-fg-muted)]">
        The page may have moved, or the piece may no longer be listed.
      </p>
      <div className="mt-10">
        <ButtonLink to="/" size="lg">Return home</ButtonLink>
      </div>
    </section>
  )
}
