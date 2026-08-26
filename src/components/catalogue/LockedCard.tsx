import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import type { LockedTile, Tier } from '@/types/db'
import { artKindFor } from './art'
import { samplePhoto } from './samplePhotos'

/**
 * The blurred tile that stands in for a piece the viewer may not open.
 * Clicking it goes where the viewer can actually do something about it.
 *
 * ── What is behind the blur ─────────────────────────────────────────────────
 * `tile.blurPreview` — a ~20x25 pixel derivative of the piece's own first
 * photograph, so the tile shows the real silhouette and colour. The full file
 * is never sent: the detail was destroyed when that derivative was generated
 * (migration 0009), which is a different and much stronger guarantee than a
 * CSS blur, since there is no filter to switch off and ~500 pixels cannot be
 * upscaled back into a photograph. Locked tiles still carry no `storage_path`.
 *
 * The blur on top is cosmetic — it smooths the upscale so the tile reads as a
 * deliberate treatment rather than a broken thumbnail. Nothing rests on it.
 *
 * Rows without a preview (fixtures, or a piece photographed before the
 * backfill) fall back to decorative artwork chosen by category.
 *
 * ── Where the click goes ────────────────────────────────────────────────────
 * A guest can fix this by signing in, so it goes to /sign-in. A registered
 * client looking at a premium piece cannot — signing in again changes nothing,
 * and premium is granted by hand (scope §F) — so theirs goes to /contact.
 * ────────────────────────────────────────────────────────────────────────────
 */
export function LockedCard({
  tile,
  tier,
  index = 0,
}: {
  tile: LockedTile
  tier: Tier
  index?: number
}) {
  const isGuest = tier === 'guest'
  const to = isGuest ? '/sign-in' : '/contact'
  const label = tile.requires === 'premium_only' ? 'Premium' : 'Members'
  const action = isGuest ? 'Sign in to view' : 'Ask us for access'

  return (
    <article className="animate-fade-in-up" style={{ animationDelay: `${index * 80}ms` }}>
      <Link
        to={to}
        className="group block cursor-pointer"
        aria-label={`A ${tile.category?.name ?? 'catalogue'} piece reserved for ${label.toLowerCase()} clients. ${action}.`}
      >
        <div className="relative aspect-4/5 overflow-hidden rounded-xl bg-[var(--color-bg-muted)]">
          <img
            src={tile.blurPreview ?? samplePhoto(artKindFor(tile.category?.slug), index)}
            alt=""
            aria-hidden="true"
            loading="lazy"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            /*
             * scale-110 hides the soft edge a blur radius leaves behind.
             *
             * The two blur strengths are doing different jobs. The fallback is
             * a full-resolution stock photograph and needs blur-xl to read as
             * a treatment rather than a picture of someone else's jewellery.
             * A blurPreview is 20px wide and already unreadable, so its blur
             * is pure cosmetics — just enough to hide the blocky edges of the
             * upscale. Comparing 0 / 3 / 6 / 10px at tile size, everything
             * past blur-sm was indistinguishable, so anything more only spends
             * the little shape the tile has left.
             */
            className={[
              'absolute inset-0 h-full w-full scale-110 object-cover transition-transform duration-700 ease-out select-none group-hover:scale-[1.14]',
              tile.blurPreview ? 'blur-sm' : 'blur-xl saturate-50',
            ].join(' ')}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[var(--color-fg)]/70 via-[var(--color-fg)]/25 to-[var(--color-fg)]/40"
          />

          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
            <Lock
              size={22}
              strokeWidth={1.25}
              aria-hidden="true"
              className="mb-3 text-white/85 transition-transform duration-300 group-hover:scale-110"
            />
            <p className="text-[0.6rem] font-light tracking-[0.22em] text-white/75 uppercase">
              {label}
            </p>
            <p className="mt-2 font-display text-sm text-white underline decoration-white/30 underline-offset-4 transition-colors duration-300 group-hover:decoration-white">
              {action}
            </p>
          </div>
        </div>

        {/* Mirrors the caption block on ProductCard so the row of tiles keeps a
            single baseline. The piece has no name here, and must not get one. */}
        <div className="mt-4 space-y-2">
          {tile.category && (
            <p className="text-[0.7rem] font-light tracking-[0.15em] text-[var(--color-fg-muted)] uppercase">
              {tile.category.name}
            </p>
          )}
          <h3 className="line-clamp-1 font-display text-lg font-medium text-[var(--color-fg-muted)]">
            Reserved piece
          </h3>
        </div>
      </Link>
    </article>
  )
}
