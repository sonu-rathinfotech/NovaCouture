import type { ArtKind } from './art'

/**
 * Temporary photography for design review.
 *
 * These are royalty-free stock photographs from Unsplash. They are NOT VK
 * Jewellers products — they exist so the design can be judged with real
 * jewellery in it, because a catalogue built around photographs cannot be
 * assessed with line drawings in the frames.
 *
 * The site says so plainly wherever they appear. Every one is deleted the
 * moment VK supplies real photography; nothing else changes, because the
 * components already render whatever `storage_path` points at.
 *
 * All twelve were chosen for a light, plain background. Mixing dark and light
 * backgrounds in one grid is the single fastest way to make a jewellery site
 * look amateur (DESIGN.md §9), which is the exact problem being fixed here.
 */

const BY_KIND: Record<ArtKind, string[]> = {
  necklace: ['necklace-1', 'necklace-2'],
  bangle: ['bangle-1', 'bangle-2', 'bangle-3'],
  ring: ['ring-1', 'ring-2', 'ring-3', 'ring-4'],
  bracelet: ['bracelet-1', 'bracelet-2'],
  // A pendant hangs on a chain, so the necklace photographs read correctly.
  pendant: ['necklace-1', 'necklace-2'],
  // 1 jhumka, 2 gold studs, 3 rose-gold drops — one per sub-category.
  earring: ['earring-1', 'earring-2', 'earring-3'],
  default: ['ring-1', 'necklace-1', 'bangle-1', 'bracelet-1'],
}

/*
 * Provenance, so these can be traced or replaced:
 *   earring-1  unsplash photo-1714733831162-0a6e849141be  (jhumka, white cloth)
 *   earring-2  unsplash photo-1708220040828-9ab1673681d3  (gold studs, plinth)
 *   earring-3  unsplash photo-1701777892740-88419a701472  (rose-gold drops)
 *   hero       unsplash photo-1719862056514-0cdacd9142b5  (Cleveland Museum of
 *              Art, diamond necklace on black; cropped to 2400x1350 at
 *              fp-y=0.62 so the left of the frame is empty for the headline)
 *
 * Unsplash licence: free for commercial use. Licensed stock — Getty, Shutterstock
 * and the like — must never be used here, licensed or not, because these files
 * ship inside a real jeweller's website.
 */

/** Lifestyle shot, used for the homepage hero. */
export const HERO_PHOTO = '/samples/hero.jpg'

export function samplePhoto(kind: ArtKind, index: number): string {
  const set = BY_KIND[kind] ?? BY_KIND.default
  return `/samples/${set[Math.abs(index) % set.length]}.jpg`
}

/** True while the catalogue is showing stock photography rather than VK's. */
export const USING_SAMPLE_PHOTOS = true
