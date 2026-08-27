/**
 * Admin-side review data.
 *
 * There is no `profiles` or `collection_views` data without Supabase, so these
 * stand in to make the admin screens reviewable. Unlike fixtures.ts these do
 * not mirror seed.sql — there is nothing to mirror, since accounts are created
 * by registration rather than seeded.
 */
import type { Profile } from '@/types/db'

const iso = (daysAgo: number) =>
  new Date(Date.UTC(2026, 6, 20 - daysAgo, 9, 30)).toISOString()

export const adminProfiles: Profile[] = [
  {
    id: 'u-1',
    mobile: '+919876543210',
    name: 'Anjali Rao',
    company: 'Rao & Sons Jewellers',
    email: 'anjali@raoandsons.example',
    is_premium: true,
    billing_address: null,
    gst_number: null,
    consent_at: iso(40),
    extra: {},
    created_at: iso(40),
  },
  {
    id: 'u-2',
    mobile: '+919812345678',
    name: 'Vikram Shah',
    company: 'Shah Retail',
    email: null,
    is_premium: true,
    billing_address: null,
    gst_number: null,
    consent_at: iso(28),
    extra: {},
    created_at: iso(28),
  },
  {
    id: 'u-3',
    mobile: '+919900112233',
    name: 'Priya Menon',
    company: null,
    email: 'priya.menon@example.com',
    is_premium: false,
    billing_address: null,
    gst_number: null,
    consent_at: iso(15),
    extra: {},
    created_at: iso(15),
  },
  {
    id: 'u-4',
    mobile: '+919845001122',
    name: 'Rahul Iyer',
    company: 'Iyer Gold House',
    email: null,
    is_premium: false,
    billing_address: null,
    gst_number: null,
    consent_at: iso(6),
    extra: {},
    created_at: iso(6),
  },
  {
    id: 'u-5',
    mobile: '+919701234567',
    name: 'Fatima Sheikh',
    company: null,
    email: 'fatima@example.com',
    is_premium: false,
    billing_address: null,
    gst_number: null,
    consent_at: iso(2),
    extra: {},
    created_at: iso(2),
  },
]

export interface AdminLink {
  id: string
  title: string
  token: string
  is_active: boolean
  created_at: string
  opens: number
  uniqueViewers: number
  lastOpenedAt: string | null
}

export const adminLinks: AdminLink[] = [
  {
    id: 'c-1',
    title: 'Diwali Preview 2026',
    token: 'seed-token-diwali-preview-2026',
    is_active: true,
    created_at: iso(12),
    opens: 27,
    uniqueViewers: 6,
    lastOpenedAt: iso(1),
  },
  {
    id: 'c-2',
    title: 'Shah Retail — Bridal Selection',
    token: 'seed-token-shah-bridal',
    is_active: true,
    created_at: iso(5),
    opens: 4,
    uniqueViewers: 1,
    lastOpenedAt: iso(3),
  },
  {
    id: 'c-3',
    title: 'Spring Sample Set (withdrawn)',
    token: 'seed-token-spring-sample',
    is_active: false,
    created_at: iso(60),
    opens: 112,
    uniqueViewers: 19,
    lastOpenedAt: iso(31),
  },
]
