import { useEffect, useRef, useState } from 'react'
import { HERO_PHOTO } from '@/components/catalogue/samplePhotos'

/**
 * The hero background: the photograph, with a looping video over it when one
 * has been supplied.
 *
 * ── The photograph is the design, the video is an enhancement ────────────────
 * The still is always rendered and always visible first. The video fades in
 * over it only once it can actually play. That ordering is deliberate: the hero
 * carries the headline, so it must never be blank while a 3 MB file downloads
 * over Indian mobile data.
 *
 * ── When the video is skipped entirely ───────────────────────────────────────
 *   · no file at HERO_VIDEO (nothing has been supplied yet)
 *   · the visitor asked for reduced motion — autoplay video is a known
 *     trigger for motion sickness, and honouring that is not optional
 *   · the visitor is on a metered or slow connection
 *   · autoplay is refused, which iOS does in Low Power Mode
 *
 * In every one of those cases the page looks finished, because the photograph
 * was never a fallback — it is the floor.
 *
 * ── Adding the video ────────────────────────────────────────────────────────
 * Drop the file at web/public/videos/hero-bg.mp4. Nothing else to change.
 * 5–10 seconds, silent, landscape, and keep it under about 3 MB: past that the
 * download costs more than the movement is worth.
 */

const HERO_VIDEO = '/videos/hero-bg.mp4'

/** Reads the visitor's motion preference, and follows it if it changes. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (!window.matchMedia) return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return reduced
}

/**
 * True when the browser says the connection is metered or slow.
 *
 * Non-standard and absent in Safari, which is fine — absent means "no reason to
 * hold back", and the video is optional either way.
 */
function connectionIsExpensive(): boolean {
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string }
  }
  const c = nav.connection
  if (!c) return false
  if (c.saveData) return true
  return c.effectiveType === 'slow-2g' || c.effectiveType === '2g'
}

export function HeroMedia() {
  const reducedMotion = usePrefersReducedMotion()
  const [showVideo, setShowVideo] = useState(false)
  const [wanted, setWanted] = useState(false)
  const video = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (reducedMotion || connectionIsExpensive()) return

    let cancelled = false

    /*
     * Ask for the file before rendering a <video> element for it. A missing
     * file in a <video> src fails silently in some browsers and logs a console
     * error in others; a HEAD request is a plain answer either way, and while
     * no video has been supplied that is the normal case rather than an error.
     */
    fetch(HERO_VIDEO, { method: 'HEAD' })
      .then((res) => {
        if (!cancelled && res.ok) setWanted(true)
      })
      .catch(() => {
        /* No video. The photograph is already doing the job. */
      })

    return () => {
      cancelled = true
    }
  }, [reducedMotion])

  useEffect(() => {
    if (!wanted) return
    const element = video.current
    if (!element) return

    // Autoplay can still be refused — iOS Low Power Mode does exactly that.
    // Only reveal the video once it is genuinely playing.
    void element.play().then(
      () => setShowVideo(true),
      () => setShowVideo(false),
    )
  }, [wanted])

  return (
    <div className="absolute inset-0 z-0">
      <img src={HERO_PHOTO} alt="" aria-hidden="true" className="h-full w-full object-cover" />

      {wanted && (
        <video
          ref={video}
          src={HERO_VIDEO}
          poster={HERO_PHOTO}
          autoPlay
          loop
          muted
          playsInline
          // Decorative. A screen reader has nothing to gain from it, and the
          // headline over it is real text.
          aria-hidden="true"
          tabIndex={-1}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
            showVideo ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Above both, so the headline keeps its contrast whichever is showing. */}
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-fg)]/80 via-[var(--color-fg)]/40 to-transparent" />
    </div>
  )
}
