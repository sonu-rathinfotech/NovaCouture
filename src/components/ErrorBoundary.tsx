import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Catches a render error anywhere below it and shows a page instead of nothing.
 *
 * WHY THIS EXISTS
 *
 * Without it, one thrown error unmounts the whole tree and the visitor gets a
 * blank white screen — no header, no message, nothing to click. That is not a
 * theoretical risk here: the 404 page itself shipped using <Link> without
 * importing it, so every mistyped URL produced exactly that. A blank screen is
 * also the hardest failure to report, because there is nothing on it to
 * describe.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It does not show the error text. A stack trace tells a customer nothing and
 * can carry internals. It goes to the console, where the developer looks.
 *
 * WHAT IT CANNOT CATCH
 *
 * Errors thrown outside rendering — in an event handler, a promise, or a
 * setTimeout. Failed data loads are handled where they happen, by the pages
 * themselves via useAsync's `error`.
 */

interface State {
  failed: boolean
  /** A stale deployment is a different problem with a different fix. */
  staleBuild: boolean
}

/**
 * True for the error a browser throws when it asks for a code chunk that no
 * longer exists.
 *
 * This is the commonest error on a live site and it is not a bug: the visitor
 * has an old page open, the site is redeployed, the file names change, and the
 * next lazy route they open is gone. Reloading genuinely fixes it, so it gets
 * its own wording rather than "something went wrong".
 */
function isStaleBuildError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /ChunkLoadError/i.test(message)
  )
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false, staleBuild: false }

  static getDerivedStateFromError(error: unknown): State {
    return { failed: true, staleBuild: isStaleBuildError(error) }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // The one place the detail belongs. If error reporting is added later, this
    // is where it hooks in.
    console.error('Unhandled render error:', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <div className="grid min-h-screen place-items-center bg-[var(--color-bg)] px-6">
        <div className="w-full max-w-[46ch] text-center">
          <span className="eyebrow text-[var(--color-accent)]">
            {this.state.staleBuild ? 'Updated' : 'Something went wrong'}
          </span>

          <h1 className="mt-4 font-display text-[length:var(--text-h1)] text-[var(--color-fg)]">
            {this.state.staleBuild ? 'The site has been updated' : 'This page did not load'}
          </h1>

          <p className="mt-5 leading-relaxed text-[var(--color-fg-muted)]">
            {this.state.staleBuild
              ? 'A newer version is available. Reload to continue — nothing has been lost.'
              : 'Something on this page failed. Reloading usually fixes it. If it keeps happening, please tell us what you were looking at.'}
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            {/* Deliberately a full reload, not a router navigation: the tree
                below has already failed, and on a stale build the browser needs
                to fetch the new files. */}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="cursor-pointer border border-[var(--color-fg)] bg-[var(--color-fg)] px-6 py-3 text-sm text-[var(--color-bg)] transition-opacity hover:opacity-90"
            >
              Reload the page
            </button>
            <a
              href="/"
              className="border border-[var(--color-border)] px-6 py-3 text-sm text-[var(--color-fg)] transition-colors hover:border-[var(--color-fg)]"
            >
              Back to the catalogue
            </a>
          </div>

          {!this.state.staleBuild && (
            <p className="mt-8 text-sm text-[var(--color-fg-subtle)]">
              You can also{' '}
              <a href="/contact" className="underline underline-offset-4">
                contact us
              </a>{' '}
              about the piece you were looking for.
            </p>
          )}
        </div>
      </div>
    )
  }
}
