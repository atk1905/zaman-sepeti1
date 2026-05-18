import * as Icons from 'lucide-react';
import type { ListingWithCategory } from '../types';
import { go, money } from '../lib/utils';
import { useAsyncValue } from '../lib/useAsyncValue';
import { getActiveListingCount, getHotListings, getWeeklyListings } from '../services/marketplace';
import { CountdownBadge, PromotionBadge, UrgencyBadge } from './badges';
import { Badge, Button, Card, EmptyState, LoadingSkeleton } from './ui';

export function HotListingCard({ listing }: { listing: ListingWithCategory }) {
  const Icon = (Icons as any)[listing.category.icon] ?? Icons.Sparkles;
  return (
    <Card onClick={() => go('/ilanlar/' + listing.id)} className="group cursor-pointer p-5 transition hover:-translate-y-1 hover:shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <Badge className="bg-zs-primary/10 text-zs-primary"><Icon size={14} />{listing.category.name}</Badge>
        <CountdownBadge expiresAt={listing.expires_at} />
      </div>
      <h3 className="mt-4 line-clamp-2 font-serif text-xl font-bold text-zs-primary">{listing.title}</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge className="bg-zs-accent/15 text-zs-accent">{money(listing.budget_min)} - {money(listing.budget_max)}</Badge>
        <Badge className="bg-white text-zs-muted">{listing.is_remote ? 'Online' : listing.city}</Badge>
        {listing.is_urgent && <UrgencyBadge />}
        {listing.is_promoted && <PromotionBadge />}
      </div>
    </Card>
  );
}

export function HotListingsSection() {
  const { value: listings, loading } = useAsyncValue(getHotListings, [], [] as ListingWithCategory[]);
  const { value: count } = useAsyncValue(getActiveListingCount, [], 0);
  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-5"><h2 className="font-serif text-4xl font-bold text-zs-primary">Sıcak Talepler</h2><p className="text-zs-muted">Şu an açık talepler. Hızlı ol, süre azalıyor.</p></div>
      {loading ? <div className="grid gap-4 md:grid-cols-2"><LoadingSkeleton /><LoadingSkeleton /></div> : listings.length === 0 ? <EmptyState title="Henüz sıcak talep yok — ilk talebi sen aç." action={<Button onClick={() => go('/talep-olustur')}>Talep Oluştur</Button>} /> : <div className="grid gap-4 md:grid-cols-2">{listings.map((l) => <HotListingCard key={l.id} listing={l} />)}</div>}
      <div className="mt-6"><Button onClick={() => go('/ilanlar')}>Tüm Talepleri Gör · {count} aktif</Button></div>
    </section>
  );
}

export function WeeklyListings() {
  const { value: listings, loading } = useAsyncValue(getWeeklyListings, [], [] as ListingWithCategory[]);
  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <h2 className="font-serif text-3xl font-bold text-zs-primary">Bu Hafta Açılanlar</h2>
      {loading ? <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4"><LoadingSkeleton /></div> : <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">{listings.map((l) => <button onClick={() => go('/ilanlar/' + l.id)} className="rounded-xl bg-white p-4 text-left text-sm shadow-sm" key={l.id}><b>{l.title}</b><p className="mt-1 text-zs-accent">{money(l.budget_min)} - {money(l.budget_max)}</p></button>)}</div>}
    </section>
  );
}
