/* eslint-disable react-hooks/exhaustive-deps */
import { CheckCircle2, MapPin, MessageSquare, Send, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from '../lib/toast';
import { money } from '../lib/utils';
import { acceptOffer, createMessage, createReport, createReview, currentUserId, getMessages, getOffersForListing, type OfferWithSender } from '../services/marketplace';
import type { ListingWithCategory } from '../types';
import { CountdownBadge, PromotionBadge, UrgencyBadge } from './badges';
import { OfferForm, PromotionPlaceholderButton } from './Forms';
import { Badge, Button, Card } from './ui';

export function ListingDetail({ listing }: { listing: ListingWithCategory }) {
  const [offers, setOffers] = useState<OfferWithSender[]>([]);
  const [uid, setUid] = useState('');
  const reloadOffers = () => getOffersForListing(listing.id).then(setOffers).catch((e) => toast(e.message));
  useEffect(() => { currentUserId().then(setUid); reloadOffers(); }, [listing.id]);
  const mine = listing.owner_id === uid;
  const active = listing.status === 'active';
  const accepted = offers.find((o) => o.status === 'accepted');
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_380px]">
      <article>
        <Card className="p-6"><div className="flex flex-wrap gap-2"><Badge className="bg-zs-primary/10 text-zs-primary">{listing.category.name}</Badge><CountdownBadge expiresAt={listing.expires_at} />{listing.is_urgent && <UrgencyBadge />}{listing.is_promoted && <PromotionBadge />}{!active && <Badge className="bg-zs-urgent text-white">Bu talebin süresi dolmuş.</Badge>}</div><h1 className="mt-5 font-serif text-4xl font-bold text-zs-primary">{listing.title}</h1><p className="mt-4 whitespace-pre-line text-lg text-zs-text">{listing.description}</p>{listing.images && listing.images.length > 0 && <div className="mt-5 grid gap-3 md:grid-cols-3">{listing.images.map((src) => <img key={src} src={src} alt="Talep görseli" className="h-36 rounded-xl object-cover" />)}</div>}<div className="mt-6 flex flex-wrap gap-3"><Badge className="bg-zs-accent/15 text-zs-accent">{money(listing.budget_min)} - {money(listing.budget_max)}</Badge><Badge className="bg-white text-zs-muted"><MapPin size={14} />{listing.is_remote ? 'Online' : listing.city}</Badge></div><div className="mt-6 flex flex-wrap gap-3"><PromotionPlaceholderButton>Öne Çıkar</PromotionPlaceholderButton><PromotionPlaceholderButton>Acele Rozeti Al</PromotionPlaceholderButton><PromotionPlaceholderButton>Yenile</PromotionPlaceholderButton></div></Card>
        <div className="mt-3"><Button variant="secondary" onClick={async () => { try { await createReport({ listing_id: listing.id, reason: 'Uygunsuz veya şüpheli talep', detail: listing.title }); toast('Raporun alındı.'); } catch (e: any) { toast(e.message); } }}>Talebi Raporla</Button></div>
        <OfferList listingOwner={mine} offers={offers} onAccepted={reloadOffers} />
        {accepted && <Conversation listingId={listing.id} conversationId={accepted.id} />}
      </article>
      <aside>{active && !mine ? <OfferForm listingId={listing.id} onCreated={reloadOffers} /> : <Card className="p-5 text-zs-muted">{mine ? 'Bu talebin sahibi sensin. Gelen teklifleri aşağıdan yönetebilirsin.' : 'Bu talebe teklif verilemez.'}</Card>}{accepted && <ReviewBox listing={listing} accepted={accepted} />}</aside>
    </div>
  );
}

export function OfferList({ offers, listingOwner, onAccepted }: { offers: OfferWithSender[]; listingOwner: boolean; onAccepted: () => void }) {
  return <Card className="mt-6 p-6"><h2 className="font-serif text-2xl font-bold text-zs-primary">Teklifler</h2>{offers.length === 0 ? <p className="mt-3 text-zs-muted">Henüz teklif yok.</p> : <div className="mt-4 grid gap-3">{offers.map((o) => <div className="rounded-xl bg-zs-bg p-4" key={o.id}><div className="flex flex-wrap items-center justify-between gap-2"><b>{o.sender.full_name}</b><Badge className="bg-white text-zs-primary">{money(o.price)} · {o.duration_text} · {statusText(o.status)}</Badge></div><p className="mt-2 text-sm text-zs-muted">{o.status === 'accepted' ? o.message : o.sanitized_message}</p>{listingOwner && o.status === 'pending' && <Button className="mt-3" onClick={async () => { try { await acceptOffer(o.id); toast('Teklif kabul edildi.'); onAccepted(); } catch (e: any) { toast(e.message); } }}><CheckCircle2 size={18} /> Teklifi Kabul Et</Button>}</div>)}</div>}</Card>;
}

function Conversation({ listingId, conversationId }: { listingId: string; conversationId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const reload = () => getMessages(listingId).then(setMessages).catch(() => setMessages([]));
  useEffect(() => { reload(); }, [listingId]);
  return <Card className="mt-6 p-6"><h2 className="flex items-center gap-2 font-serif text-2xl font-bold text-zs-primary"><MessageSquare /> Mesajlaşma</h2><p className="text-sm text-zs-muted">Kabul edilen teklif sonrası güvenli mesajlaşma alanı.</p><div className="mt-4 grid gap-2">{messages.length === 0 ? <p className="text-sm text-zs-muted">Henüz mesaj yok.</p> : messages.map((m) => <div className="rounded-lg bg-white p-3" key={m.id}><b className="text-sm text-zs-primary">{m.profiles?.full_name || 'Üye'}</b><p>{m.content}</p></div>)}</div><form className="mt-4 flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (!content.trim()) return; try { await createMessage(listingId, conversationId, content.trim()); setContent(''); reload(); } catch (err: any) { toast(err.message); } }}><input className="flex-1 rounded-lg border border-zs-primary/15 px-3 py-2" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Mesaj yaz" /><Button><Send size={16} /> Gönder</Button></form></Card>;
}

function ReviewBox({ listing, accepted }: { listing: ListingWithCategory; accepted: OfferWithSender }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  return <Card className="mt-4 p-5"><h2 className="flex items-center gap-2 font-serif text-2xl font-bold text-zs-primary"><Star /> Değerlendir</h2><p className="text-sm text-zs-muted">İş tamamlandıktan sonra karşı tarafı değerlendirebilirsin.</p><select className="mt-3 w-full rounded-lg border border-zs-primary/15 px-3 py-2" value={rating} onChange={(e) => setRating(Number(e.target.value))}>{[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} yıldız</option>)}</select><textarea className="mt-3 w-full rounded-lg border border-zs-primary/15 px-3 py-2" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Kısa yorum" /><Button className="mt-3" onClick={async () => { try { await createReview(listing.owner_id === accepted.sender_id ? listing.owner_id : accepted.sender_id, listing.id, rating, comment); toast('Değerlendirmen kaydedildi.'); } catch (e: any) { toast(e.message); } }}>Değerlendirme Gönder</Button></Card>;
}

const statusText = (s: string) => s === 'accepted' ? 'Kabul edildi' : s === 'rejected' ? 'Reddedildi' : s === 'withdrawn' ? 'Geri çekildi' : 'Bekliyor';
