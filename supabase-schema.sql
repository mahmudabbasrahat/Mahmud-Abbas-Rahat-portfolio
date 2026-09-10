-- =========================================================
-- MAHMUD ABBAS RAHAT — PORTFOLIO DATABASE SCHEMA
-- Run this entire file once in: Supabase Dashboard → SQL Editor
-- =========================================================
-- What this file does:
--   1. Creates the "projects" table used by every public page
--      and the admin panel.
--   2. Adds indexes for the queries the site actually runs.
--   3. Enables Row Level Security so visitors can only ever
--      READ published projects, and only a logged-in admin can
--      create/edit/delete anything.
--   4. Adds matching storage policies for the "portfolio-images"
--      bucket (create the bucket first — see SETUP.md step 5).
--   5. Migrates your 13 existing graphic design projects so you
--      don't lose the work already on the live site.
-- =========================================================

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- =========================================================
-- 1. TABLE
-- =========================================================
create table if not exists public.projects (
  id                  uuid primary key default gen_random_uuid(),

  -- Basic information
  title               text not null,
  slug                text not null unique,
  sector              text not null check (sector in ('digital-marketing','seo','graphic-design','website-design')),
  category            text,                 -- e.g. "On-Page SEO", "Logo Design", "Landing Page"
  client              text,
  website             text,
  industry            text,
  duration            text,
  short_description   text,
  description         text,

  -- Case study narrative (optional — used when the info exists)
  role                text,
  problem             text,
  strategy            text,
  work_done           text,
  result              text,

  -- Flexible lists, stored as JSON arrays
  tools               jsonb default '[]'::jsonb,   -- ["Adobe Illustrator", "Canva"]
  services            jsonb default '[]'::jsonb,   -- ["Logo Design", "Brand Guidelines"]
  tags                jsonb default '[]'::jsonb,   -- filter tags shown on sector pages

  -- Media
  main_image          text,
  gallery             jsonb default '[]'::jsonb,   -- ["path/or/url-1.jpg", "..."]
  before_image        text,
  after_image         text,

  -- Sector-specific facts & figures, stored as a flexible JSON object.
  -- The front end only ever DISPLAYS what is present here — it never
  -- invents numbers. Missing keys are shown as "Data not added yet".
  -- Examples of keys used per sector (all optional):
  --   SEO:               keywords, ranking_before, ranking_after,
  --                       organic_traffic_before, organic_traffic_after,
  --                       impressions_before, impressions_after,
  --                       ctr_before, ctr_after, gsc_notes, ga4_notes
  --   Digital Marketing:  platform, campaign_objective, target_audience,
  --                       ad_type, budget, leads, conversions, roas, cpa, ctr
  --   Graphic Design:     design_type, creative_brief, deliverables, design_process
  --   Website Design:     technology, features, website_type, live_url
  metrics             jsonb default '{}'::jsonb,

  -- Status & ordering
  featured            boolean not null default false,
  published           boolean not null default false,
  sort_order          integer not null default 0,

  -- SEO metadata (used on project.html for this specific project)
  seo_title           text,
  meta_description    text,
  alt_text            text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.projects is 'All portfolio / case-study projects across the four service sectors.';

-- =========================================================
-- 2. INDEXES — match the queries the site actually runs
-- =========================================================
create index if not exists idx_projects_sector     on public.projects (sector);
create index if not exists idx_projects_featured    on public.projects (featured) where featured = true;
create index if not exists idx_projects_published   on public.projects (published) where published = true;
create index if not exists idx_projects_slug        on public.projects (slug);
create index if not exists idx_projects_sort_order  on public.projects (sort_order);

-- =========================================================
-- 3. AUTO-UPDATE "updated_at" ON EVERY EDIT
-- =========================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

-- =========================================================
-- 4. ADMIN AUTHORIZATION
-- Being logged in (authenticated) is NOT the same as being an
-- admin. Only a user_id listed in admin_users is treated as an
-- admin. This table has no public policies at all, so it is
-- unreadable/unwritable through the API by anyone — the only
-- way in is the SQL Editor (i.e. you, manually, once).
-- =========================================================
create table if not exists public.admin_users (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

alter table public.admin_users enable row level security;
-- Intentionally no policies are created for admin_users:
-- this makes it inaccessible via the anon/authenticated API
-- entirely. It can only be read by the SECURITY DEFINER
-- function below, and only written to by you via SQL Editor.

-- is_admin(): checks whether the currently logged-in user is
-- an admin. SECURITY DEFINER lets it read admin_users (which
-- normal API requests cannot) safely, because it only ever
-- returns true/false — it never exposes the table's contents.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

-- Allow logged-in users (and anon, harmlessly — auth.uid() is
-- null for them so this always returns false) to call the
-- function itself, without granting any table access.
grant execute on function public.is_admin() to anon, authenticated;

-- =========================================================
-- 5. ROW LEVEL SECURITY — projects table
-- =========================================================
alter table public.projects enable row level security;

-- Public visitors (anon key): can only ever SEE published projects.
drop policy if exists "Public can read published projects" on public.projects;
create policy "Public can read published projects"
  on public.projects for select
  using (published = true);

-- Admins only: can see every project, including drafts.
drop policy if exists "Authenticated can read all projects" on public.projects;
drop policy if exists "Admins can read all projects" on public.projects;
create policy "Admins can read all projects"
  on public.projects for select
  to authenticated
  using (public.is_admin());

-- Admins only: can create projects.
drop policy if exists "Authenticated can insert projects" on public.projects;
drop policy if exists "Admins can insert projects" on public.projects;
create policy "Admins can insert projects"
  on public.projects for insert
  to authenticated
  with check (public.is_admin());

-- Admins only: can edit projects.
drop policy if exists "Authenticated can update projects" on public.projects;
drop policy if exists "Admins can update projects" on public.projects;
create policy "Admins can update projects"
  on public.projects for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admins only: can delete projects.
drop policy if exists "Authenticated can delete projects" on public.projects;
drop policy if exists "Admins can delete projects" on public.projects;
create policy "Admins can delete projects"
  on public.projects for delete
  to authenticated
  using (public.is_admin());

-- IMPORTANT: a user who merely signs up/logs in but is NOT in
-- admin_users can only ever SELECT published rows — exactly
-- the same as an anonymous visitor. Insert/update/delete and
-- reading drafts all require public.is_admin() = true.

-- =========================================================
-- 6. STORAGE POLICIES (bucket: portfolio-images)
-- Create the bucket first in Dashboard → Storage → New bucket
-- named exactly "portfolio-images", set to Public. Then run this.
-- =========================================================
drop policy if exists "Public can view portfolio images" on storage.objects;
create policy "Public can view portfolio images"
  on storage.objects for select
  using (bucket_id = 'portfolio-images');

drop policy if exists "Authenticated can upload portfolio images" on storage.objects;
drop policy if exists "Admins can upload portfolio images" on storage.objects;
create policy "Admins can upload portfolio images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'portfolio-images' and public.is_admin());

drop policy if exists "Authenticated can update portfolio images" on storage.objects;
drop policy if exists "Admins can update portfolio images" on storage.objects;
create policy "Admins can update portfolio images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'portfolio-images' and public.is_admin());

drop policy if exists "Authenticated can delete portfolio images" on storage.objects;
drop policy if exists "Admins can delete portfolio images" on storage.objects;
create policy "Admins can delete portfolio images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'portfolio-images' and public.is_admin());

-- =========================================================
-- 7. SEED DATA — your existing graphic design projects
-- These are the same 13 projects that were previously hard-coded
-- in script.js. Titles, descriptions, images, categories and tools
-- are preserved exactly. They are inserted as sector =
-- 'graphic-design', published = true, featured = false (choose
-- which ones to feature from the Admin Panel).
-- Image paths point at your existing /assets folder — no
-- re-upload needed for these older projects.
-- =========================================================
insert into public.projects
  (title, slug, sector, category, short_description, description, role, work_done, tools, main_image, gallery, published, featured, sort_order)
values
('Delicious Menu — Restaurant Menu Design', 'delicious-menu', 'graphic-design', 'Menu Design',
 'A full food menu layout for a fast-casual restaurant, covering starters, main course, beverages and desserts on one page.',
 'A single-page restaurant menu built around a bold headline, a hero food photo and four clearly separated sections — Starters, Main Course, Beverages and Desserts. Pricing, short item descriptions and a promotional call-out are laid out for quick scanning.',
 'Graphic Designer — concept, layout and typography.',
 'Menu structure and hierarchy, section iconography, pricing layout, promotional badge, and colour and imagery selection.',
 '["Adobe Photoshop","Adobe Illustrator"]',
 'assets/01806907933872c1ee38a6aee0e35f78.webp',
 '["assets/01806907933872c1ee38a6aee0e35f78.webp"]',
 true, false, 1),

('Fast Food Restaurant — Trifold Brochure', 'fast-food-brochure', 'graphic-design', 'Brochure Design',
 'A trifold brochure for a fast food restaurant outlining a food package and contact details, shown flat and in a printed mockup.',
 'A three-panel brochure combining a package description panel, a contact panel with the restaurant''s logo and details, and a photography panel featuring the restaurant''s food. Delivered as a flat design file and a realistic print mockup for client presentation.',
 'Graphic Designer — layout, logo placement and print-ready panel design.',
 'Trifold panel layout, package copy formatting, logo and icon integration, and mockup presentation.',
 '["Adobe Illustrator","Adobe Photoshop"]',
 'assets/Brochure-01.webp',
 '["assets/Brochure-01.webp","assets/Free_Trifold_Flyer_Mockup_1.webp"]',
 true, false, 2),

('Super Delicious Burger — Promotional Banner', 'burger-banner', 'graphic-design', 'Banner Design',
 'A promotional web banner for a burger deal, built around bold script and display type and a discount call-out.',
 'A dark, high-contrast promotional banner combining product photography with layered display type, a circular discount badge and an order-now button — designed to work as a website or social ad banner.',
 'Graphic Designer — concept and layout.',
 'Typography pairing, discount badge design, image composition and CTA placement.',
 '["Adobe Photoshop"]',
 'assets/Burgur_Banner.webp',
 '["assets/Burgur_Banner.webp"]',
 true, false, 3),

('Personal Brand — Business Card Design', 'personal-business-card', 'graphic-design', 'Business Card',
 'Two business card concepts for my own graphic design practice, each pairing a personal photo or monogram with contact details.',
 'Personal business card designs exploring two directions — a wave-based layout with a portrait photo, and a geometric navy-and-gold layout built around the MR monogram. Both include name, title and contact information front and back.',
 'Graphic Designer — self-branding and layout.',
 'Layout exploration, colour system, iconography and monogram placement.',
 '["Adobe Illustrator","Canva"]',
 'assets/Business_Card.webp',
 '["assets/Business_Card.webp","assets/My_Business_Card.webp"]',
 true, false, 4),

('Man''s Mart — Brand Identity & Business Card', 'mans-mart-branding', 'graphic-design', 'Business Card',
 'A navy-and-gold business card and logo presentation card for the Man''s Mart brand.',
 'A business card and matching logo presentation card for ''Man''s Mart'', using a deep navy and gold colour system with a monogram mark, a QR code panel and clearly structured contact details.',
 'Graphic Designer — logo application and card layout.',
 'Card layout, colour system, QR code placement and logo presentation card.',
 '["Adobe Illustrator"]',
 'assets/Business_Card-01.webp',
 '["assets/Business_Card-01.webp","assets/Business_Card-02.webp"]',
 true, false, 5),

('R — Coffee Cup Packaging Mockup', 'r-coffee-packaging', 'graphic-design', 'Packaging',
 'Branded coffee cup packaging concepts showing the ''R'' logo mark applied across patterned and plain cup designs.',
 'A set of coffee cup packaging mockups showing how the ''R'' brand mark and a floral pattern can be applied consistently across different cup sizes, alongside a plain-label variant for a coffee plantation concept.',
 'Graphic Designer — brand mark application on packaging mockups.',
 'Pattern design, logo placement and mockup presentation across multiple cup formats.',
 '["Adobe Photoshop","Adobe Illustrator"]',
 'assets/Coffee_Cup_3_.webp',
 '["assets/Coffee_Cup_3_.webp"]',
 true, false, 6),

('Ascott The Residence Dhaka — Promotional Flyer', 'ascott-flyer', 'graphic-design', 'Flyer Design',
 'A promotional flyer for a boutique hotel''s fresh food offering, combining photography, an about section and a discount badge.',
 'A green-and-navy promotional flyer built around a trefoil photo composition, a headline introducing ''Fresh Food'', an about-us paragraph and a discount call-out, alongside full address and contact details.',
 'Graphic Designer — layout and photo composition.',
 'Photo-shape composition, headline and body copy layout, discount badge and contact block design.',
 '["Adobe Photoshop","Adobe Illustrator"]',
 'assets/Flyer_Design.webp',
 '["assets/Flyer_Design.webp"]',
 true, false, 7),

('MR — Personal Monogram Logo', 'mr-monogram-logo', 'graphic-design', 'Logo Design',
 'A hand-built interlocking monogram combining the letters M and R into a single ornamental mark.',
 'A decorative monogram logo interlocking the letters ''M'' and ''R'' in a navy-and-gold duotone, designed as a flexible personal/brand mark that reads clearly at both large and small sizes.',
 'Graphic Designer — logo construction.',
 'Letterform construction, interlocking layout and colour treatment.',
 '["Adobe Illustrator"]',
 'assets/Group_5.webp',
 '["assets/Group_5.webp"]',
 true, false, 8),

('Jucy Lucy — Pizza & Fast Food Menu', 'jucy-lucy-menu', 'graphic-design', 'Menu Design',
 'A multi-section fast food menu covering pizza, pasta, appetizers and wraps for the Jucy Lucy brand.',
 'A dense, well-organized menu spread covering pizza sizes and flavours, pasta, appetizers, fried items and wraps, using a red-and-black colour system with the Jucy Lucy logo and consistent price formatting throughout.',
 'Graphic Designer — full menu layout.',
 'Multi-column menu grid, size/price tables, section iconography and logo integration.',
 '["Adobe Illustrator","Adobe Photoshop"]',
 'assets/Jucy_Lucy.webp',
 '["assets/Jucy_Lucy.webp"]',
 true, false, 9),

('Food Menu — Hospital Road, Lakshmipur', 'hospital-road-menu', 'graphic-design', 'Menu Design',
 'A single-page food menu for a local restaurant, organized into main course, appetizers and beverages.',
 'A dark-textured menu layout using circular food photography and orange section labels to organize main course, appetizer and beverage listings, finished with contact and location details.',
 'Graphic Designer — layout and photo framing.',
 'Circular photo framing, section label design and price alignment.',
 '["Adobe Photoshop"]',
 'assets/Menu_Card_2.webp',
 '["assets/Menu_Card_2.webp"]',
 true, false, 10),

('Special Food Menu — Multi-Category Layout', 'special-food-menu', 'graphic-design', 'Menu Design',
 'A structured multi-category menu template covering pasta, burgers, pizza and additional food lists.',
 'A dark ornamental menu template organized into clearly labelled categories — pasta, burger, pizza and three additional food-name columns — designed as a reusable structure for a food business with a broad menu.',
 'Graphic Designer — template structure and layout system.',
 'Grid-based category system, ornamental frame elements and repeatable price-row styling.',
 '["Adobe Illustrator"]',
 'assets/Menu_Card_3.webp',
 '["assets/Menu_Card_3.webp"]',
 true, false, 11),

('R — Brand Mark', 'r-brand-logo', 'graphic-design', 'Logo Design',
 'A bold serif ''R'' letterform logo accented with a maroon ribbon-style swoosh.',
 'A single-letter brand mark built on a heavy serif ''R'', crossed with a two-tone maroon ribbon accent for a confident, versatile logo suitable for packaging and print applications.',
 'Graphic Designer — logo construction.',
 'Letterform design and accent ribbon detailing.',
 '["Adobe Illustrator"]',
 'assets/R_logo.webp',
 '["assets/R_logo.webp"]',
 true, false, 12),

('Event & Sports T-Shirt Design Collection', 'tshirt-collection', 'graphic-design', 'Apparel Design',
 'Four standalone t-shirt graphics — a softball print, a marathon event tee, a running-themed design and a typographic pattern print.',
 'A small collection of apparel graphics designed for different contexts: a softball emblem tee, a ''Midnight Madness Marathon'' event shirt with a city-skyline motif, a ''Born to Run'' athletic graphic, and a repeating ''good vibes'' typographic pattern — each shown on a garment mockup.',
 'Graphic Designer — print design and mockup presentation.',
 'Emblem and typography design, colour system per design, and mockup staging for client presentation.',
 '["Adobe Illustrator","Canva"]',
 'assets/T-shirt_mockup_ball.webp',
 '["assets/T-shirt_mockup_ball.webp","assets/T-shirt_mockup_Mid_Night_.webp","assets/T-shirt_mockup_Run.webp","assets/T-shirt_mockup.webp"]',
 true, false, 13)
on conflict (slug) do nothing;

-- =========================================================
-- Done. Next: create the "portfolio-images" storage bucket,
-- create your admin user in Authentication, then follow
-- SETUP.md to connect the site to this project.
-- =========================================================
