/**
 * Types for tools/lib/import-validate.mjs — plain JavaScript shared with the
 * command-line importer. Declared here rather than converted to TypeScript so
 * the CLI keeps running under bare Node with no build step.
 */
declare module '@shared/import-validate.mjs' {
  export interface ImportProduct {
    line: number
    sku: string
    name: string
    category: string
    subCategory: string | null
    visibility: 'public' | 'login_required' | 'premium_only' | undefined
    sortOrder: number | null
    /** Grams, or null when the column is blank. See migration 0010. */
    weightGrams: number | null
    /** Defaults to true when the column is absent or blank. */
    isAvailable: boolean
  }

  export interface SheetResult {
    products: ImportProduct[]
    errors: string[]
    warnings: string[]
  }

  export interface ImageMatch {
    file: string
    position: number
  }

  export interface ImagesResult {
    errors: string[]
    warnings: string[]
    bySku: Map<string, ImageMatch[]>
  }

  export const REQUIRED_COLUMNS: string[]
  export const OPTIONAL_COLUMNS: string[]
  export const AVAILABLE: Map<string, boolean>
  export const IMAGE_EXTENSIONS: Set<string>
  export const MIN_IMAGE_EDGE: number
  export const MAX_IMAGE_BYTES: number

  export function parseCsv(text: string): string[][]
  export function hasUnbalancedQuotes(text: string): boolean
  export function validateSheet(text: string): SheetResult
  export function validateImages(products: ImportProduct[], filenames: string[]): ImagesResult
  export function parseImageName(
    filename: string,
  ): { sku: string; position: number; ext: string } | null
  export function probeImage(
    bytes: Uint8Array,
  ): { format: string; width: number; height: number } | null
  export function validateImageFile(filename: string, bytes: Uint8Array): string[]
}
