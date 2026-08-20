import { ButtonLink } from '@/components/ui/Button'

/**
 * Shown when a data load fails.
 *
 * WHY IT MATTERS MORE THAN IT LOOKS
 *
 * Every page used to discard useAsync's `error`, so a failed load rendered as
 * an empty grid — or worse, on a product page, as "this piece cannot be found".
 * A visitor was told the piece did not exist when the truth was that the site
 * could not reach its database. On a catalogue whose purpose is to show a
 * jeweller's stock, telling a customer a piece is gone when it is not is the
 * most damaging thing the site can say.
 *
 * The wording avoids blaming the visitor's connection, because usually it is
 * not the visitor's connection. A paused or unreachable database looks exactly
 * the same from here.
 *
 * WHAT IT DOES NOT SAY
 *
 * The error text. It goes to the console, not to a customer.
 */
export function LoadError({
  what = 'this page',
  onRetry,
}: {
  /** Named in the sentence, e.g. "the collections". */
  what?: string
  /** Omitted, the button reloads — always correct, if blunt. */
  onRetry?: () => void
}) {
  return (
    <div className="mx-auto max-w-[46ch] py-20 text-center">
      <span className="eyebrow text-[var(--color-accent)]">Not available</span>

      <h2 className="mt-4 font-display text-[length:var(--text-h2)] text-[var(--color-fg)]">
        We could not load {what}
      </h2>

      <p className="mt-4 leading-relaxed text-[var(--color-fg-muted)]">
        This is a problem at our end, not yours. Nothing has been lost — please
        try again in a moment.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => (onRetry ? onRetry() : window.location.reload())}
          className="cursor-pointer border border-[var(--color-fg)] bg-[var(--color-fg)] px-6 py-3 text-sm text-[var(--color-bg)] transition-opacity hover:opacity-90"
        >
          Try again
        </button>
        <ButtonLink to="/contact" variant="secondary">
          Contact us
        </ButtonLink>
      </div>
    </div>
  )
}
