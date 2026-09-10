#!/usr/bin/env node
/**
 * Burns the house mark into photographs that are already in storage.
 *
 *   node tools/watermark-existing.mjs            # report, change nothing
 *   node tools/watermark-existing.mjs --apply    # do it
 *   node tools/watermark-existing.mjs --apply --limit 10
 *
 * Watermarking arrived after 208 photographs had been uploaded, so those carry
 * no mark. New uploads are marked as they arrive; this is for the backlog.
 *
 * -- Read the warning before running with --apply ---------------------------
 * There is no undo. The marked file REPLACES the original in storage, which is
 * the whole point of burning a mark in rather than drawing it over -- but it
 * means the unmarked photograph is gone. If the client may ever want these
 * pictures unmarked, take a copy of the bucket first.
 *
 * -- Safe to re-run ---------------------------------------------------------
 * Only rows with watermarked_at null are touched, and the column is set as
 * each one succeeds. Marking a photograph twice burns the logo in twice, so
 * this is not a nicety: a second run without the guard would visibly damage
 * the whole catalogue.
 *
 * -- Uses the same placement as the browser ---------------------------------
 * sharp composites differently from a canvas, but the arithmetic deciding
 * where the mark lands is the shared module, so a photograph marked here lands
 * up looking like one marked at upload.
 */
import sharp from 'sharp'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { watermarkPlacements, normaliseWatermarkSettings } from './lib/watermark-placement.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const LOGO = join(ROOT, 'public', 'logo-watermark.png')
const BUCKET = 'product-images'

function env() {
  const values = {}
  for (const file of ['.env', '.env.local']) {
    const path = join(ROOT, file)
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#') || t.startsWith('//')) continue
      const i = t.indexOf('=')
      if (i === -1) continue
      const k = t.slice(0, i).trim()
      if (values[k] === undefined) values[k] = t.slice(i + 1).trim()
    }
  }
  return values
}

const e = env()
const URL_BASE = e.VITE_SUPABASE_URL
const SERVICE_KEY = e.service_role || e.SUPABASE_SERVICE_ROLE_KEY
if (!URL_BASE) throw new Error('VITE_SUPABASE_URL is not set')
if (!SERVICE_KEY) throw new Error('service_role key is not set in .env')

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

const apply = process.argv.includes('--apply')
const limitFlag = process.argv.indexOf('--limit')
const limit = limitFlag > -1 ? Number(process.argv[limitFlag + 1]) : Infinity

async function rest(path, init = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${path}: ${res.status} ${text}`)
  return text ? JSON.parse(text) : null
}

async function download(path) {
  const res = await fetch(`${URL_BASE}/storage/v1/object/authenticated/${BUCKET}/${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  })
  if (!res.ok) throw new Error(`downloading ${path}: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

async function upload(path, buffer) {
  const res = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'PUT',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'true',
    },
    body: buffer,
  })
  if (!res.ok) throw new Error(`uploading ${path}: ${res.status} ${await res.text()}`)
}

/** Draws the mark at the settings the client chose, using shared placement. */
async function mark(imageBuffer, settings) {
  const image = sharp(imageBuffer)
  const meta = await image.metadata()
  const logoMeta = await sharp(LOGO).metadata()

  const places = watermarkPlacements(
    meta.width,
    meta.height,
    logoMeta.width,
    logoMeta.height,
    settings,
  )

  const overlays = []
  for (const at of places) {
    const w = Math.max(1, Math.round(at.width))
    const h = Math.max(1, Math.round(at.height))

    // sharp cannot composite an overlay that starts off-canvas, so a mark
    // hanging past an edge is pre-cropped to the visible part and its
    // position moved to the edge. The visible result is identical to the
    // canvas version, which simply clips.
    const left = Math.round(at.x)
    const top = Math.round(at.y)
    const cropLeft = Math.max(0, -left)
    const cropTop = Math.max(0, -top)
    const visibleW = Math.min(w - cropLeft, meta.width - Math.max(0, left))
    const visibleH = Math.min(h - cropTop, meta.height - Math.max(0, top))
    if (visibleW <= 0 || visibleH <= 0) continue

    let overlay = sharp(LOGO).resize(w, h, { fit: 'fill' })
    if (cropLeft || cropTop || visibleW !== w || visibleH !== h) {
      overlay = sharp(await overlay.png().toBuffer()).extract({
        left: cropLeft,
        top: cropTop,
        width: visibleW,
        height: visibleH,
      })
    }

    // Scale the logo's own alpha by the chosen strength.
    const buf = await overlay
      .composite([
        {
          input: Buffer.from([255, 255, 255, Math.round(settings.opacity * 255)]),
          raw: { width: 1, height: 1, channels: 4 },
          tile: true,
          blend: 'dest-in',
        },
      ])
      .png()
      .toBuffer()

    overlays.push({ input: buf, left: Math.max(0, left), top: Math.max(0, top) })
  }

  return image.composite(overlays).jpeg({ quality: 94 }).toBuffer()
}

async function run() {
  const settings = normaliseWatermarkSettings(
    (await rest('company_settings?select=watermark_enabled,watermark_position,watermark_size_percent,watermark_opacity'))
      .map((r) => ({
        enabled: r.watermark_enabled,
        position: r.watermark_position,
        sizePercent: r.watermark_size_percent,
        opacity: r.watermark_opacity,
      }))[0],
  )

  const pending = await rest(
    'product_images?select=id,storage_path&watermarked_at=is.null&order=storage_path',
  )
  const total = await rest('product_images?select=id')

  console.log('')
  console.log(`  settings   : ${settings.position}, ${settings.sizePercent}% width, ${Math.round(settings.opacity * 100)}% strength`)
  console.log(`  photographs: ${total.length} in the catalogue, ${pending.length} unmarked`)

  if (!settings.enabled) {
    console.log('\n  Watermarking is switched off in the admin. Nothing to do.\n')
    return
  }
  if (pending.length === 0) {
    console.log('\n  Nothing to mark.\n')
    return
  }
  if (!apply) {
    console.log('\n  This was a dry run. Add --apply to mark them.')
    console.log('  There is no undo: the marked file replaces the original in storage.\n')
    return
  }

  const todo = pending.slice(0, limit)
  console.log(`\n  Marking ${todo.length}. This replaces the stored file.\n`)

  let done = 0
  for (const row of todo) {
    const marked = await mark(await download(row.storage_path), settings)
    await upload(row.storage_path, marked)
    // Set only after the upload succeeds, so a crash mid-run leaves the row
    // unmarked and the next run picks it up rather than skipping it.
    await rest(`product_images?id=eq.${row.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ watermarked_at: new Date().toISOString() }),
    })
    done++
    process.stdout.write(`\r  ${done}/${todo.length} …`)
  }
  console.log(`\r  ${done} photographs marked.        \n`)
}

run().catch((error) => {
  console.error(`\n  ${error.message}\n`)
  process.exit(1)
})
