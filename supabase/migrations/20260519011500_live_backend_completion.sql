-- ZamanSepeti live backend hardening: auth profile bootstrap, storage, reports and notifications

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  reason text not null,
  detail text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;
alter table public.notifications enable row level security;

do $$ begin
  create policy "reports authenticated insert" on public.reports for insert with check (auth.uid() = reporter_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "reports own read" on public.reports for select using (auth.uid() = reporter_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "notifications owner read" on public.notifications for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "notifications owner update" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

do $$ begin
  create policy "listing images public storage read" on storage.objects for select using (bucket_id = 'listing-images');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "listing images authenticated upload" on storage.objects for insert with check (bucket_id = 'listing-images' and auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "listing images owner update" on storage.objects for update using (bucket_id = 'listing-images' and owner = auth.uid()) with check (bucket_id = 'listing-images' and owner = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "listing images owner delete" on storage.objects for delete using (bucket_id = 'listing-images' and owner = auth.uid());
exception when duplicate_object then null; end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, created_at, updated_at)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'ZamanSepeti üyesi'), now(), now())
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.notify_offer_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare target_user uuid;
begin
  select owner_id into target_user from public.listings where id = new.listing_id;
  if target_user is not null then
    insert into public.notifications(user_id, type, title, body)
    values(target_user, 'offer_created', 'Yeni teklif geldi', 'Talebine yeni bir teklif gönderildi.');
  end if;
  return new;
end;
$$;

drop trigger if exists on_offer_created_notify on public.offers;
create trigger on_offer_created_notify
after insert on public.offers
for each row execute procedure public.notify_offer_created();
