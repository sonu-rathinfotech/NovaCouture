import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

/**
 * Dialog.
 *
 * The Bolt version handled Escape and the body scroll lock. This adds the
 * three things a dialog also needs to be usable without a mouse: it announces
 * itself as a dialog, it keeps Tab inside itself, and it puts focus back where
 * it came from on close. Without those, a keyboard user tabs into the page
 * behind and cannot find their way out.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: ReactNode
  maxWidth?: string
}) {
  const panel = useRef<HTMLDivElement>(null)
  const restoreTo = useRef<Element | null>(null)

  useEffect(() => {
    if (!open) return

    restoreTo.current = document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    // Focus the first thing inside, so the dialog is where typing goes.
    const focusable = () =>
      Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      )
    focusable()[0]?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const items = focusable()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      ;(restoreTo.current as HTMLElement | null)?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-noir/60 backdrop-blur-sm"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative max-h-[90vh] w-full overflow-y-auto border border-ivory-300 bg-ivory-100 shadow-elevated animate-scale-in ${maxWidth}`}
      >
        <div className="flex items-start justify-between px-8 pt-8 pb-4">
          <div>
            {title && <h2 className="font-serif text-2xl text-charcoal-800">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm font-light text-charcoal-400">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-1 cursor-pointer p-1 text-charcoal-400 transition-colors duration-300 hover:text-charcoal-800"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className="px-8 pb-8">{children}</div>
      </div>
    </div>
  )
}
