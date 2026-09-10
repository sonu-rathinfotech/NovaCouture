import { getSupabase } from '@/lib/supabase'
import { isConfigured } from '@/lib/env'
import { useAsync } from '@/hooks/useAsync'
import type { ProductWithImages } from '@/types/db'

/**
 * "Ask about this piece on WhatsApp" -- opens a chat with the house, prefilled
 * with the piece name and a link back to it.
 *
 * -- Not the same thing as the Share button ---------------------------------
 * Share opens an empty WhatsApp so the VISITOR can forward the piece to
 * somebody they know. This opens a chat addressed to Nova Couture. They look
 * alike and do opposite things, which is why this one names the house in its
 * label rather than saying "WhatsApp".
 *
 * -- It renders nothing until the number exists -----------------------------
 * The number is a setting (migration 0018) and has not been supplied yet. An
 * icon that opens a chat addressed to nobody is worse than no icon: the client
 * taps it, types a real question, and it goes nowhere. So while the setting is
 * null this returns null.
 *
 * -- Why the number comes from an RPC ---------------------------------------
 * company_settings is admin-only, because it holds the bank details. This one
 * column has to be readable by a guest standing on a product page, so it is
 * exposed through public_whatsapp_number() rather than by opening up the
 * table.
 */

/** Everything a message needs, in the order a person would type it. */
function buildMessage(product: ProductWithImages): string {
  const url = typeof window === 'undefined' ? '' : window.location.href
  return [
    `Hello, I would like to ask about ${product.name}.`,
    url && `\n${url}`,
  ]
    .filter(Boolean)
    .join('')
}

export function WhatsAppEnquiry({ product }: { product: ProductWithImages }) {
  const { data: number } = useAsync(async () => {
    if (!isConfigured) return null
    const { data, error } = await getSupabase().rpc('public_whatsapp_number')
    if (error) return null
    return (data as string | null) ?? null
  }, [])

  if (!number) return null

  return (
    <a
      href={`https://wa.me/${number}?text=${encodeURIComponent(buildMessage(product))}`}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-2.5 rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 px-4 py-3 text-sm font-medium text-[var(--color-fg)] transition-colors hover:bg-[#25D366]/20"
    >
      {/* WhatsApp's own glyph. lucide has no brand marks, and an approximation
          of a brand icon reads as a knock-off on a jeweller's site. */}
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-[#25D366]">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.174.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.83 9.83 0 0 1 2.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.36.101 11.945c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a11.9 11.9 0 0 0 5.71 1.454h.005c6.585 0 11.946-5.36 11.949-11.945a11.87 11.87 0 0 0-3.479-8.408" />
      </svg>
      Ask about this piece on WhatsApp
    </a>
  )
}
