# Claude implementation blueprint

Kaynak: web AI oturumu üzerinden alındı; gereksiz navigasyon metinleri ayıklanmadan ham not olarak saklandı.

```text
ation blueprint ver.

ZamanSepeti React TypeScript Vite Supabase marketplace MVP için implementation blueprint ver. Domain types: profiles/categories/listings/offers/

5:53 PM
Reading frontend design skill
Reading frontend design skill

Güzel bir proje. Şimdi kapsamlı bir implementation blueprint hazırlayacağım.

Aşağıda tam implementation blueprint'i katman katman veriyorum.

1. Proje İskeleti
zamansepeti/
├── src/
│   ├── lib/
│   │   ├── supabase.ts          # createClient singleton
│   │   └── queryClient.ts       # TanStack Query setup
│   ├── types/
│   │   └── database.types.ts    # supabase gen types + custom helpers
│   ├── features/
│   │   ├── auth/
│   │   ├── profiles/
│   │   ├── categories/
│   │   ├── listings/
│   │   └── offers/
│   ├── components/ui/           # shadcn/ui slot
│   ├── hooks/                   # useAuth, useRealtime
│   └── main.tsx
├── supabase/
│   ├── migrations/
│   └── seed.sql
└── vite.config.ts

Bağımlılıklar:

bash
pnpm add @supabase/supabase-js @supabase/auth-helpers-react \
  @tanstack/react-query @tanstack/react-router \
  zustand react-hook-form zod @hookform/resolvers \
  lucide-react clsx tailwind-merge
pnpm add -D supabase typescript @types/node
2. Database Schema + RLS
sql
-- migrations/001_core.sql

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm"; -- full-text search için

-- ── PROFILES ──────────────────────────────────────
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  username    text unique not null,
  display_name text,
  avatar_url  text,
  bio         text,
  role        text not null default 'user' check (role in ('user','moderator','admin')),
  is_verified boolean not null default false,
  rating_avg  numeric(3,2),
  rating_count int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── CATEGORIES ────────────────────────────────────
create table categories (
  id          serial primary key,
  parent_id   int references categories(id),
  slug        text unique not null,
  name        text not null,
  icon        text,           -- Lucide icon name
  sort_order  smallint default 0,
  is_active   boolean not null default true
);

-- ── LISTINGS ──────────────────────────────────────
create type listing_status as enum
  ('draft','active','paused','sold','expired','removed');
create type listing_condition as enum
  ('new','like_new','good','fair','poor');

create table listings (
  id           uuid primary key default gen_random_uuid(),
  seller_id    uuid not null references profiles(id),
  category_id  int  not null references categories(id),
  title        text not null,
  description  text,
  price        numeric(12,2) not null check (price >= 0),
  currency     text not null default 'TRY',
  condition    listing_condition not null,
  status       listing_status   not null default 'draft',
  location_city text,
  location_district text,
  view_count   int not null default 0,
  expires_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- full-text search vector
  fts          tsvector generated always as (
    to_tsvector('turkish', coalesce(title,'') || ' ' || coalesce(description,''))
  ) stored
);
create index listings_fts_idx  on listings using gin(fts);
create index listings_seller   on listings(seller_id);
create index listings_category on listings(category_id, status);
create index listings_status   on listings(status, created_at desc);

-- ── LISTING IMAGES ────────────────────────────────
create table listing_images (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references listings(id) on delete cascade,
  storage_path text not null,
  alt_text    text,
  sort_order  smallint not null default 0
);

-- ── OFFERS ────────────────────────────────────────
create type offer_status as enum
  ('pending','accepted','rejected','withdrawn','expired');

create table offers (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references listings(id),
  buyer_id    uuid not null references profiles(id),
  seller_id   uuid not null references profiles(id),
  amount      numeric(12,2) not null check (amount > 0),
  message     text,
  status      offer_status not null default 'pending',
  expires_at  timestamptz default now() + interval '48 hours',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index offers_buyer  on offers(buyer_id, status);
create index offers_seller on offers(seller_id, status);
create index offers_listing on offers(listing_id);
sql
-- migrations/002_rls.sql

alter table profiles       enable row level security;
alter table listings       enable row level security;
alter table listing_images enable row level security;
alter table offers         enable row level security;

-- PROFILES
create policy "public read"   on profiles for select using (true);
create policy "own update"    on profiles for update using (auth.uid() = id);

-- LISTINGS
create policy "active read"   on listings for select
  using (status = 'active' or seller_id = auth.uid());
create policy "own insert"    on listings for insert
  with check (seller_id = auth.uid());
create policy "own update"    on listings for update
  using (seller_id = auth.uid());

-- LISTING_IMAGES
create policy "listing read"  on listing_images for select using (
  exists (select 1 from listings l where l.id = listing_id
          and (l.status = 'active' or l.seller_id = auth.uid()))
);
create policy "own insert"    on listing_images for insert
  with check (
    exists (select 1 from listings l where l.id = listing_id
            and l.seller_id = auth.uid())
  );

-- OFFERS
create policy "party read"    on offers for select
  using (buyer_id = auth.uid() or seller_id = auth.uid());
create policy "buyer insert"  on offers for insert
  with check (buyer_id = auth.uid());
create policy "party update"  on offers for update
  using (buyer_id = auth.uid() or seller_id = auth.uid());
3. TypeScript Domain Types
typescript
// src/types/database.types.ts
// `supabase gen types typescript --local` çıktısının üzerine custom helper'lar

export type ListingStatus   = 'draft'|'active'|'paused'|'sold'|'expired'|'removed';
export type ListingCondition = 'new'|'like_new'|'good'|'fair'|'poor';
export type OfferStatus     = 'pending'|'accepted'|'rejected'|'withdrawn'|'expired';
export type UserRole        = 'user'|'moderator'|'admin';

// ── Domain DTOs (Supabase'in döndürdüğü select şekilleri) ──

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  is_verified: boolean;
  rating_avg: number | null;
  rating_count: number;
  created_at: string;
}

export interface Category {
  id: number;
  parent_id: number | null;
  slug: string;
  name: string;
  icon: string | null;
  sort_order: number;
  children?: Category[];   // nested ile join gelirse
}

export interface ListingImage {
  id: string;
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
}

export interface Listing {
  id: string;
  seller_id: string;
  category_id: number;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  condition: ListingCondition;
  status: ListingStatus;
  location_city: string | null;
  location_district: string | null;
  view_count: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  // join'ler
  seller?: Pick<Profile, 'id'|'username'|'display_name'|'avatar_url'|'rating_avg'|'is_verified'>;
  category?: Pick<Category, 'id'|'slug'|'name'|'icon'>;
  images?: ListingImage[];
}

export interface Offer {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  message: string | null;
  status: OfferStatus;
  expires_at: string;
  created_at: string;
  listing?: Pick<Listing, 'id'|'title'|'price'|'images'>;
  buyer?:   Pick<Profile, 'id'|'username'|'display_name'|'avatar_url'>;
}

// ── Mutation payloads ──

export interface CreateListingPayload {
  category_id: number;
  title: string;
  description?: string;
  price: number;
  condition: ListingCondition;
  location_city?: string;
  location_district?: string;
}

export interface CreateOfferPayload {
  listing_id: string;
  seller_id: string;
  amount: number;
  message?: string;
}
4. Feature Modülleri

Her feature klasörü aynı yapıyı izler: api.ts → hooks.ts → components/.

4a. Listings API
typescript
// src/features/listings/api.ts
import { supabase } from '@/lib/supabase';
import type { Listing, CreateListingPayload } from '@/types/database.types';

const LISTING_SELECT = `
  *,
  seller:profiles!seller_id(id,username,display_name,avatar_url,rating_avg,is_verified),
  category:categories(id,slug,name,icon),
  images:listing_images(id,storage_path,alt_text,sort_order)
`;

export interface ListingFilters {
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  city?: string;
  query?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchListings(filters: ListingFilters = {}) {
  const { page = 1, pageSize = 20 } = filters;
  let q = supabase
    .from('listings')
    .select(LISTING_SELECT, { count: 'exact' })
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters.categorySlug)
    q = q.eq('category.slug', filters.categorySlug);
  if (filters.minPrice !== undefined) q = q.gte('price', filters.minPrice);
  if (filters.maxPrice !== undefined) q = q.lte('price', filters.maxPrice);
  if (filters.condition)  q = q.eq('condition', filters.condition);
  if (filters.city)       q = q.eq('location_city', filters.city);
  if (filters.query)      q = q.textSearch('fts', filters.query, { config: 'turkish' });

  const { data, error, count } = await q;
  if (error) throw error;
  return { listings: data as Listing[], total: count ?? 0 };
}

export async function fetchListingById(id: string) {
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('id', id)
    .single();
  if (error) throw error;

  // view_count artır (fire-and-forget)
  supabase.rpc('increment_view_count', { listing_id: id }).then(() => {});

  return data as Listing;
}

export async function createListing(payload: CreateListingPayload, sellerId: string) {
  const { data, error } = await supabase
    .from('listings')
    .insert({ ...payload, seller_id: sellerId })
    .select()
    .single();
  if (error) throw error;
  return data as Listing;
}

export async function uploadListingImages(listingId: string, files: File[]) {
  const paths: string[] = [];
  for (const [i, file] of files.entries()) {
    const ext  = file.name.split('.').pop();
    const path = `listings/${listingId}/${i}.${ext}`;
    const { error } = await supabase.storage
      .from('listing-images')
      .upload(path, file, { upsert: true });
    if (error) throw error;
    paths.push(path);
  }

  const rows = paths.map((p, i) => ({
    listing_id: listingId, storage_path: p, sort_order: i
  }));
  const { error } = await supabase.from('listing_images').insert(rows);
  if (error) throw error;
  return paths;
}
4b. Listings Hooks
typescript
// src/features/listings/hooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { CreateLi
Want to be notified when Claude responds?
Notify

eessages/reviews/promotions. Özellikler: Supabase Auth, RLS, talep oluşturma, teklif, sansür, 7 gün expiry, provider profilleri, kategori filtreleri, ödeme placeholder. Çıktı: teknik mimari, klasör 

Sonnet 4.6
Claude is AI and can make mistakes. Please double-check responses.

```
