-- =============================================================================
-- Seed data for local development and internal review.
-- Not for production. Run after 0001_init.sql.
--
-- This file and web/src/data/fixtures.ts MUST stay identical — same ids, slugs,
-- visibility levels and gallery counts — otherwise the app behaves differently
-- before and after Supabase is connected, which is the one thing the fixture
-- approach exists to avoid.
--
-- That parity is enforced by web/src/data/seed-parity.test.ts, which parses
-- this file. If you edit one side, the test fails until you edit the other.
-- =============================================================================

insert into public.categories (id, name, slug, parent_id, sort_order) values
  ('11111111-1111-4111-8111-000000000001', 'Necklaces', 'necklaces', null, 1),
  ('11111111-1111-4111-8111-000000000002', 'Bangles',   'bangles',   null, 2),
  ('11111111-1111-4111-8111-000000000003', 'Rings',     'rings',     null, 3),
  ('11111111-1111-4111-8111-000000000004', 'Bracelets', 'bracelets', null, 4),
  ('11111111-1111-4111-8111-000000000005', 'Earrings', 'earrings', null, 5),
  ('11111111-1111-4111-8111-000000000006', 'Pendants & Chains', 'pendants-chains', null, 6)
on conflict (slug) do nothing;

-- One level of sub-categories only (scope §C).
insert into public.categories (id, name, slug, parent_id, sort_order) values
  ('22222222-2222-4222-8222-000000000001', 'Temple',    'temple',    '11111111-1111-4111-8111-000000000001', 1),
  ('22222222-2222-4222-8222-000000000002', 'Bridal',    'bridal',    '11111111-1111-4111-8111-000000000001', 2),
  ('22222222-2222-4222-8222-000000000003', 'Kada',      'kada',      '11111111-1111-4111-8111-000000000002', 1),
  ('22222222-2222-4222-8222-000000000004', 'Solitaire', 'solitaire', '11111111-1111-4111-8111-000000000003', 1),
  ('22222222-2222-4222-8222-000000000005', 'Haram', 'haram', '11111111-1111-4111-8111-000000000001', 3),
  ('22222222-2222-4222-8222-000000000006', 'Choker', 'choker', '11111111-1111-4111-8111-000000000001', 4),
  ('22222222-2222-4222-8222-000000000007', 'Bangle Sets', 'bangle-sets', '11111111-1111-4111-8111-000000000002', 2),
  ('22222222-2222-4222-8222-000000000008', 'Cocktail', 'cocktail', '11111111-1111-4111-8111-000000000003', 2),
  ('22222222-2222-4222-8222-000000000009', 'Tennis', 'tennis', '11111111-1111-4111-8111-000000000004', 1),
  ('22222222-2222-4222-8222-000000000010', 'Jhumka', 'jhumka', '11111111-1111-4111-8111-000000000005', 1),
  ('22222222-2222-4222-8222-000000000011', 'Chandbali', 'chandbali', '11111111-1111-4111-8111-000000000005', 2),
  ('22222222-2222-4222-8222-000000000012', 'Studs', 'studs', '11111111-1111-4111-8111-000000000005', 3),
  ('22222222-2222-4222-8222-000000000013', 'Pendants', 'pendants', '11111111-1111-4111-8111-000000000006', 1),
  ('22222222-2222-4222-8222-000000000014', 'Chains', 'chains', '11111111-1111-4111-8111-000000000006', 2)
on conflict (slug) do nothing;

-- All three visibility tiers are represented several times over, so the Phase 3
-- access matrix (3 roles x 3 levels) can be exercised against real rows.
insert into public.products (id, name, slug, category_id, visibility, sort_order) values
  -- public: visible to everyone
  ('33333333-3333-4333-8333-000000000001', 'Meera Temple Haram',     'meera-temple-haram',     '22222222-2222-4222-8222-000000000001', 'public', 1),
  ('33333333-3333-4333-8333-000000000002', 'Kanchi Broad Kada',      'kanchi-broad-kada',      '22222222-2222-4222-8222-000000000003', 'public', 2),
  ('33333333-3333-4333-8333-000000000003', 'Rivière Tennis Line',    'riviere-tennis-line',    '11111111-1111-4111-8111-000000000004', 'public', 3),
  ('33333333-3333-4333-8333-000000000008', 'Lakshmi Kasu Malai',     'lakshmi-kasu-malai',     '22222222-2222-4222-8222-000000000001', 'public', 8),
  ('33333333-3333-4333-8333-000000000009', 'Paisley Cuff Kada',      'paisley-cuff-kada',      '22222222-2222-4222-8222-000000000003', 'public', 9),
  ('33333333-3333-4333-8333-000000000010', 'Half-Eternity Band',     'half-eternity-band',     '11111111-1111-4111-8111-000000000003', 'public', 10),
  ('33333333-3333-4333-8333-000000000015', 'Ananta Jhumka', 'ananta-jhumka', '22222222-2222-4222-8222-000000000010', 'public', 15),
  ('33333333-3333-4333-8333-000000000016', 'Peacock Chandbali', 'peacock-chandbali', '22222222-2222-4222-8222-000000000011', 'public', 16),
  ('33333333-3333-4333-8333-000000000017', 'Kundan Stud Pair', 'kundan-stud-pair', '22222222-2222-4222-8222-000000000012', 'public', 17),
  ('33333333-3333-4333-8333-000000000018', 'Rope Chain 22K', 'rope-chain-22k', '22222222-2222-4222-8222-000000000014', 'public', 18),
  ('33333333-3333-4333-8333-000000000019', 'Lotus Pendant', 'lotus-pendant', '22222222-2222-4222-8222-000000000013', 'public', 19),
  ('33333333-3333-4333-8333-000000000020', 'Beaded Mani Haram', 'beaded-mani-haram', '22222222-2222-4222-8222-000000000005', 'public', 20),
  ('33333333-3333-4333-8333-000000000021', 'Bangle Set of Six', 'bangle-set-of-six', '22222222-2222-4222-8222-000000000007', 'public', 21),
  ('33333333-3333-4333-8333-000000000022', 'Ruby Cocktail Ring', 'ruby-cocktail-ring', '22222222-2222-4222-8222-000000000008', 'public', 22),

  -- login_required: hidden from guests
  ('33333333-3333-4333-8333-000000000004', 'Anjali Layered Chain',   'anjali-layered-chain',   '11111111-1111-4111-8111-000000000001', 'login_required', 4),
  ('33333333-3333-4333-8333-000000000005', 'Solitaire Six-Prong',    'solitaire-six-prong',    '22222222-2222-4222-8222-000000000004', 'login_required', 5),
  ('33333333-3333-4333-8333-000000000011', 'Filigree Link Bracelet', 'filigree-link-bracelet', '11111111-1111-4111-8111-000000000004', 'login_required', 11),
  ('33333333-3333-4333-8333-000000000012', 'Antique Nagas Choker',   'antique-nagas-choker',   '22222222-2222-4222-8222-000000000001', 'login_required', 12),
  ('33333333-3333-4333-8333-000000000023', 'Nakshi Jhumka', 'nakshi-jhumka', '22222222-2222-4222-8222-000000000010', 'login_required', 23),
  ('33333333-3333-4333-8333-000000000024', 'Pearl Drop Chandbali', 'pearl-drop-chandbali', '22222222-2222-4222-8222-000000000011', 'login_required', 24),
  ('33333333-3333-4333-8333-000000000025', 'Diamond Line Tennis', 'diamond-line-tennis', '22222222-2222-4222-8222-000000000009', 'login_required', 25),
  ('33333333-3333-4333-8333-000000000026', 'Guttapusalu Haram', 'guttapusalu-haram', '22222222-2222-4222-8222-000000000005', 'login_required', 26),
  ('33333333-3333-4333-8333-000000000027', 'Navratna Pendant', 'navratna-pendant', '22222222-2222-4222-8222-000000000013', 'login_required', 27),
  ('33333333-3333-4333-8333-000000000028', 'Twisted Bangle Set', 'twisted-bangle-set', '22222222-2222-4222-8222-000000000007', 'login_required', 28),

  -- premium_only: hidden from guests and registered users
  ('33333333-3333-4333-8333-000000000006', 'Padma Bridal Set',       'padma-bridal-set',       '22222222-2222-4222-8222-000000000002', 'premium_only', 6),
  ('33333333-3333-4333-8333-000000000007', 'Heritage Polki Suite',   'heritage-polki-suite',   '22222222-2222-4222-8222-000000000002', 'premium_only', 7),
  ('33333333-3333-4333-8333-000000000013', 'Emerald Drop Haram',     'emerald-drop-haram',     '22222222-2222-4222-8222-000000000002', 'premium_only', 13),
  ('33333333-3333-4333-8333-000000000014', 'Uncut Diamond Kada',     'uncut-diamond-kada',     '22222222-2222-4222-8222-000000000003', 'premium_only', 14),
  ('33333333-3333-4333-8333-000000000029', 'Polki Chandbali Suite', 'polki-chandbali-suite', '22222222-2222-4222-8222-000000000011', 'premium_only', 29),
  ('33333333-3333-4333-8333-000000000030', 'Kasu Bridal Haram', 'kasu-bridal-haram', '22222222-2222-4222-8222-000000000005', 'premium_only', 30),
  ('33333333-3333-4333-8333-000000000031', 'Emerald Cocktail Ring', 'emerald-cocktail-ring', '22222222-2222-4222-8222-000000000008', 'premium_only', 31),
  ('33333333-3333-4333-8333-000000000032', 'Nizami Diamond Choker', 'nizami-diamond-choker', '22222222-2222-4222-8222-000000000006', 'premium_only', 32)
on conflict (slug) do nothing;

-- Gallery placeholders: 6 images for premium pieces, 4 for the rest.
-- Real paths are written by the Phase 8 importer; alt is never null so a bulk
-- import cannot produce a gallery of inaccessible images.
insert into public.product_images (product_id, storage_path, sort_order, alt)
select p.id,
       'seed/' || p.slug || '-' || g.n || '.jpg',
       g.n,
       p.name || ' — view ' || g.n
from public.products p
cross join lateral generate_series(
  1,
  case when p.visibility = 'premium_only' then 6 else 4 end
) as g(n)
on conflict do nothing;

-- A curated collection for testing the Phase 5 link flow.
insert into public.collections (id, title, token, welcome_message) values
  ('44444444-4444-4444-8444-000000000001',
   'Diwali Preview 2026',
   'seed-token-diwali-preview-2026',
   'Welcome. A private selection, chosen for you.')
on conflict (token) do nothing;

insert into public.collection_items (collection_id, product_id, sort_order) values
  ('44444444-4444-4444-8444-000000000001', '33333333-3333-4333-8333-000000000006', 1),
  ('44444444-4444-4444-8444-000000000001', '33333333-3333-4333-8333-000000000007', 2),
  ('44444444-4444-4444-8444-000000000001', '33333333-3333-4333-8333-000000000001', 3)
on conflict do nothing;
