import { useEffect } from 'react'

/**
 * Sets `document.title` for the current page, with the house name as the
 * suffix, e.g. "Meera Temple Haram — VK Jewellers". Pass nothing (or
 * undefined, while data is still loading) to fall back to the plain house
 * name, so a tab never shows a stale title from the previous page.
 */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} — VK Jewellers` : 'VK Jewellers'
  }, [title])
}
