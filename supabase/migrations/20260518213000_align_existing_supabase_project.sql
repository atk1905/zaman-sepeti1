-- Align an existing ZamanSepeti Supabase project with the MVP v2 model.
create extension if not exists pgcrypto;

alter table if exists public.profiles add column if not exists phone text;
alter table if exists public.profiles add column if not exists city text;
alter table if exists public.profiles add column if not exists skills text[] not null default '{}';
alter table if exists public.profiles add column if not exists rating numeric;
alter table if exists public.profiles add column if not exists bio text;
alter table if exists public.profiles add column if not exists avatar_url text;
alter table if exists public.profiles add column if not exists is_provider boolean not null default false;
alter table if exists public.profiles add column if not exists provider_title text;
alter table if exists public.profiles add column if not exists provider_intro text;
alter table if exists public.profiles add column if not exists price_from integer;
alter table if exists public.profiles add column if not exists updated_at timestamptz not null default now();

alter table if exists public.categories add column if not exists "group" text;
alter table if exists public.categories add column if not exists icon text;
update public.categories set "group" = coalesce("group", 'classic'), icon = coalesce(icon, 'Circle') where true;
alter table if exists public.categories alter column "group" set not null;
alter table if exists public.categories alter column icon set not null;
do $$ begin alter table public.categories add constraint categories_group_check check ("group" in ('smart','classic')); exception when duplicate_object then null; end $$;

alter table if exists public.listings add column if not exists budget_min integer not null default 0;
alter table if exists public.listings add column if not exists budget_max integer not null default 0;
alter table if exists public.listings add column if not exists city text;
alter table if exists public.listings add column if not exists is_remote boolean not null default false;
alter table if exists public.listings add column if not exists is_urgent boolean not null default false;
alter table if exists public.listings add column if not exists is_promoted boolean not null default false;
alter table if exists public.listings add column if not exists promoted_until timestamptz;
alter table if exists public.listings add column if not exists renewal_count integer not null default 0;
alter table if exists public.listings add column if not exists expires_at timestamptz not null default (now() + interval '7 days');
alter table if exists public.listings add column if not exists updated_at timestamptz not null default now();

create table if not exists public.listing_images (id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.listings(id) on delete cascade, url text not null, sort_order integer not null default 0, created_at timestamptz not null default now());
create table if not exists public.offers (id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.listings(id) on delete cascade, sender_id uuid not null references public.profiles(id) on delete cascade, price integer not null check (price >= 0), duration_text text not null, message text not null, sanitized_message text not null, status text not null default 'pending' check (status in ('pending','accepted','rejected','withdrawn')), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.messages (id uuid primary key default gen_random_uuid(), conversation_id uuid not null, listing_id uuid references public.listings(id) on delete cascade, sender_id uuid references public.profiles(id) on delete cascade, content text not null, created_at timestamptz not null default now());
create table if not exists public.reviews (id uuid primary key default gen_random_uuid(), reviewer_id uuid references public.profiles(id) on delete cascade, reviewee_id uuid references public.profiles(id) on delete cascade, listing_id uuid references public.listings(id) on delete cascade, rating integer not null check (rating between 1 and 5), comment text, created_at timestamptz not null default now());
create table if not exists public.promotions (id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete cascade, listing_id uuid references public.listings(id) on delete cascade, type text not null, price integer not null, status text not null default 'placeholder', created_at timestamptz not null default now());

insert into public.categories (name, slug, "group", icon, sort_order) values
('Metin Gözden Geçirme & Düzenleme', 'metin-gozden-gecirme-duzenleme', 'smart', 'Sparkles', 1),
('Yazım & Dilbilgisi Kontrolü', 'yazim-dilbilgisi-kontrolu', 'smart', 'FileText', 2),
('Konuşma & Sunum Hazırlığı', 'konusma-sunum-hazirligi', 'smart', 'Mic', 3),
('Sosyal Medya İçeriği — AI Destekli', 'sosyal-medya-icerigi-ai-destekli', 'smart', 'Megaphone', 4),
('Araştırma Özeti', 'arastirma-ozeti', 'smart', 'Search', 5),
('Veri Analizi & Görselleştirme', 'veri-analizi-gorsellestirme', 'smart', 'BarChart3', 6),
('Sunum & Slayt Tasarımı', 'sunum-slayt-tasarimi', 'smart', 'Presentation', 7),
('Çeviri & Lokalizasyon', 'ceviri-lokalizasyon', 'smart', 'Languages', 8),
('Transkripsiyon', 'transkripsiyon', 'smart', 'AudioLines', 9),
('Web Site / Landing Page', 'web-site-landing-page', 'smart', 'Globe', 10),
('Yapay Zeka Otomasyonu', 'yapay-zeka-otomasyonu', 'smart', 'Bot', 11),
('Prompt Mühendisliği', 'prompt-muhendisligi', 'smart', 'Terminal', 12),
('Temizlik', 'temizlik', 'classic', 'Home', 1),
('Tamir & Tadilat', 'tamir-tadilat', 'classic', 'Hammer', 2),
('Nakliye & Taşıma', 'nakliye-tasima', 'classic', 'Truck', 3),
('Eğitim & Özel Ders', 'egitim-ozel-ders', 'classic', 'GraduationCap', 4),
('Tasarım', 'tasarim', 'classic', 'Palette', 5),
('Özel Yazılım Geliştirme', 'ozel-yazilim-gelistirme', 'classic', 'Code2', 6),
('Hayvan Bakımı', 'hayvan-bakimi', 'classic', 'PawPrint', 7),
('Bahçe & Tarım', 'bahce-tarim', 'classic', 'Leaf', 8),
('Etkinlik Organizasyonu', 'etkinlik-organizasyonu', 'classic', 'PartyPopper', 9),
('Sağlık & Bakım', 'saglik-bakim', 'classic', 'HeartPulse', 10),
('Hukuki & Mali Danışmanlık', 'hukuki-mali-danismanlik', 'classic', 'Scale', 11),
('Diğer', 'diger', 'classic', 'CircleEllipsis', 12)
on conflict (slug) do update set name = excluded.name, "group" = excluded."group", icon = excluded.icon, sort_order = excluded.sort_order;
