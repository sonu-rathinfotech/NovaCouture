#!/usr/bin/env node
/**
 * Lists every fact the static pages are still missing.
 *
 *   node tools/content-todo.mjs
 *
 * Reads the [[double bracket]] markers straight out of the page copy, so the
 * checklist cannot drift from what the site actually shows. When this prints
 * nothing, the pages are factually complete — which is not the same as
 * approved.
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(join(ROOT, 'web', 'src', 'content', 'staticPages.ts'), 'utf8')

// Only the copy object. Reading to the end of the file would also scrape the
// [[ ]] patterns out of splitPlaceholders() below it and report them as facts.
const start = source.indexOf('export const STATIC_PAGES')
const end = source.indexOf('export type StaticPageSlug')
const body = source.slice(start, end === -1 ? undefined : end)

const pages = []
let current = null

for (const line of body.split('\n')) {
  const page = /^ {2}(about|contact|privacy|terms): \{/.exec(line)
  if (page) {
    current = { name: page[1], items: [] }
    pages.push(current)
  }
  if (!current) continue
  for (const match of line.matchAll(/\[\[([^\]]+)\]\]/g)) {
    current.items.push(match[1].replace(/\s+/g, ' ').trim())
  }
}

const total = pages.reduce((n, p) => n + p.items.length, 0)

console.log('')
console.log('  Static page content — still needed')
console.log('  ' + '─'.repeat(50))

for (const page of pages) {
  if (page.items.length === 0) continue
  console.log('')
  console.log(`  ${page.name.toUpperCase()}`)
  for (const item of page.items) {
    const wrapped = item.match(/.{1,72}(\s|$)/g) ?? [item]
    console.log(`    · ${wrapped[0].trim()}`)
    for (const rest of wrapped.slice(1)) console.log(`      ${rest.trim()}`)
  }
}

console.log('')
console.log(`  ${total} item(s) outstanding.`)
console.log('')
console.log('  The Privacy Policy and Terms are drafts and show a warning banner')
console.log('  on the site. Filling these in does not remove it — someone qualified')
console.log('  must approve the wording, then set approved: true on that page.')
console.log('')
