-- ZamanSepeti Supabase schema and RLS policies
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', phone text, city text, skills text[] not null default '{}', rating numeric, bio text, avatar_url text,
  is_provider boolean not null default false, provider_title text, provider_intro text, price_from integer,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null,
  "group" text not null check ("group" in ('smart','classic')), icon text not null, sort_order integer not null default 0
);
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null, description text not null, budget_min integer not null check (budget_min >= 0), budget_max integer not null check (budget_max >= budget_min),
  category_id uuid not null references public.categories(id), city text, is_remote boolean not null default false,
  status text not null default 'active' check (status in ('active','expired','closed','completed')), is_urgent boolean not null default false,
  is_promoted boolean not null default false, promoted_until timestamptz, renewal_count integer not null default 0,
  created_at timestamptz not null default now(), expires_at timestamptz not null default (now() + interval '7 days'), updated_at timestamptz not null default now()
);
create table if not exists public.listing_images (id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.listings(id) on delete cascade, url text not null, sort_order integer not null default 0, created_at timestamptz not null default now());
create table if not exists public.offers (id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.listings(id) on delete cascade, sender_id uuid not null references public.profiles(id) on delete cascade, price integer not null check (price >= 0), duration_text text not null, message text not null, sanitized_message text not null, status text not null default 'pending' check (status in ('pending','accepted','rejected','withdrawn')), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.messages (id uuid primary key default gen_random_uuid(), conversation_id uuid not null, listing_id uuid references public.listings(id) on delete cascade, sender_id uuid references public.profiles(id) on delete cascade, content text not null, created_at timestamptz not null default now());
create table if not exists public.reviews (id uuid primary key default gen_random_uuid(), reviewer_id uuid references public.profiles(id) on delete cascade, reviewee_id uuid references public.profiles(id) on delete cascade, listing_id uuid references public.listings(id) on delete cascade, rating integer not null check (rating between 1 and 5), comment text, created_at timestamptz not null default now());
create table if not exists public.promotions (id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete cascade, listing_id uuid references public.listings(id) on delete cascade, type text not null, price integer not null, status text not null default 'placeholder', created_at timestamptz not null default now());

alter table public.profiles enable row level security; alter table public.categories enable row level security; alter table public.listings enable row level security; alter table public.listing_images enable row level security; alter table public.offers enable row level security; alter table public.messages enable row level security; alter table public.reviews enable row level security; alter table public.promotions enable row level security;

create policy "profiles public read" on public.profiles for select using (true);
create policy "profiles owner update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles owner insert" on public.profiles for insert with check (auth.uid() = id);
create policy "categories public read" on public.categories for select using (true);
create policy "active listings public read" on public.listings for select using (status in ('active','closed','completed') or owner_id = auth.uid());
create policy "listing owner insert" on public.listings for insert with check (auth.uid() = owner_id);
create policy "listing owner update" on public.listings for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "listing images public read" on public.listing_images for select using (exists (select 1 from public.listings l where l.id = listing_id and l.status in ('active','closed','completed')));
create policy "listing images owner write" on public.listing_images for all using (exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid())) with check (exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid()));
create policy "offers participants read" on public.offers for select using (sender_id = auth.uid() or exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid()));
create policy "offers authenticated insert" on public.offers for insert with check (auth.uid() = sender_id and not exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid()));
create policy "offers listing owner update" on public.offers for update using (exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid()));
create policy "messages participants read" on public.messages for select using (sender_id = auth.uid() or exists (select 1 from public.offers o where o.listing_id = messages.listing_id and o.sender_id = auth.uid()));
create policy "messages participants insert" on public.messages for insert with check (auth.uid() = sender_id);
create policy "reviews public read" on public.reviews for select using (true);
create policy "reviews related insert" on public.reviews for insert with check (auth.uid() = reviewer_id);
create policy "promotions owner all" on public.promotions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
