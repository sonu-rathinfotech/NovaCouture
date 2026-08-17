import { Eye } from 'lucide-react'
import { currentPreviewTier, exitPreviewUrl } from '@/lib/previewTier'

const LABEL = {
  guest: 'a visitor who is not signed in',
  registered: 'a registered client',
  premium: 'a premium client',
} as const

/**
 * Shown while "View as client" is active.
 *
 * Deliberately loud. An administrator who forgets they are previewing will
 * otherwise report missing products as a fault in the catalogue.
 */
export function PreviewBanner() {
  const tier = currentPreviewTier()
  if (!tier) return null

  return (
    <div className="sticky top-0 z-50 bg-[#1a1a18] text-white">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-4 gap-y-1 px-6 py-2.5 text-[0.7rem] tracking-[0.12em] uppercase">
        <span className="inline-flex items-center gap-2">
          <Eye size={14} strokeWidth={1.75} />
          Previewing as {LABEL[tier]}
        </span>
        <span aria-hidden="true" className="opacity-40">
          ·
        </span>
        {/* A full reload, not a client-side link: the preview is read from the
            URL at query time, so the catalogue has to be fetched again. */}
        <a href={exitPreviewUrl()} className="underline underline-offset-4 hover:opacity-80">
          Exit preview
        </a>
      </div>
    </div>
  )
}
