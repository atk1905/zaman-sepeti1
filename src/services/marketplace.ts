import { addDays, formatDistanceToNowStrict, isBefore } from 'date-fns';
import { tr } from 'date-fns/locale';
import { categories as fallbackCategories } from '../data/categories';
import { seedListings, seedOffers, seedProfiles } from '../data/seed';
import { supabase } from '../lib/supabase';
import type { Category, CategoryGroup, Listing, ListingStatus, ListingWithCategory, Notification, Offer, Profile, Report } from '../types';

const KEY = 'zamansepeti-demo-db-v2';
const CURRENT_KEY = 'zamansepeti-current-user';
type Db = { profiles: Profile[]; listings: Listing[]; offers: Offer[] };
export type ListingInput = Omit<Listing, 'id' | 'owner_id' | 'status' | 'created_at' | 'expires_at' | 'updated_at' | 'renewal_count' | 'is_promoted' | 'promoted_until' | 'images'> & { images?: File[] | string[] };
export type OfferWithSender = Offer & { sender: Profile };

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const initialDb = (): Db => ({ profiles: clone(seedProfiles), listings: clone(seedListings), offers: clone(seedOffers) });
export const getDb = (): Db => {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    const db = initialDb();
    localStorage.setItem(KEY, JSON.stringify(db));
    return db;
  }
  return JSON.parse(raw) as Db;
};
export const saveDb = (db: Db) => localStorage.setItem(KEY, JSON.stringify(db));
export const resetDemoData = () => saveDb(initialDb());
export const setCurrentUser = (id: string) => localStorage.setItem(CURRENT_KEY, id);
export const isSupabaseLive = () => Boolean(supabase);

const fallbackCurrentUserId = () => localStorage.getItem(CURRENT_KEY) || 'u-current';
const byCreatedDesc = (a: { created_at: string }, b: { created_at: string }) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

export const currentUserId = async () => {
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user?.id) return data.user.id;
  }
  return fallbackCurrentUserId();
};

export const getSessionUser = async () => {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
};

export const signUp = async (email: string, password: string, fullName: string) => {
  if (!supabase) {
    setCurrentUser('u-current');
    return getCurrentProfile();
  }
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
  if (error) throw error;
  if (data.user) await upsertMyProfile({ id: data.user.id, full_name: fullName });
  return data.user;
};

export const signIn = async (email: string, password: string) => {
  if (!supabase) {
    setCurrentUser('u-current');
    return getCurrentProfile();
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await ensureMyProfile(data.user?.user_metadata?.full_name || email.split('@')[0]);
  return data.user;
};

export const signOut = async () => {
  if (supabase) await supabase.auth.signOut();
  localStorage.removeItem(CURRENT_KEY);
};

const normalizeCategory = (row: any): Category => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  group: row.group,
  icon: row.icon,
  sort_order: row.sort_order ?? 0,
});

const normalizeProfile = (row: any): Profile => ({
  id: row.id,
  full_name: row.full_name || 'ZamanSepeti üyesi',
  phone: row.phone ?? null,
  city: row.city ?? null,
  skills: row.skills ?? [],
  rating: row.rating == null ? null : Number(row.rating),
  bio: row.bio ?? null,
  avatar_url: row.avatar_url ?? null,
  is_provider: Boolean(row.is_provider),
  provider_title: row.provider_title ?? null,
  provider_intro: row.provider_intro ?? null,
  price_from: row.price_from ?? null,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const normalizeListing = (row: any): Listing => ({
  id: row.id,
  owner_id: row.owner_id,
  title: row.title,
  description: row.description,
  budget_min: row.budget_min,
  budget_max: row.budget_max,
  category_id: row.category_id,
  city: row.city ?? null,
  is_remote: Boolean(row.is_remote),
  status: row.status,
  is_urgent: Boolean(row.is_urgent),
  is_promoted: Boolean(row.is_promoted),
  promoted_until: row.promoted_until ?? null,
  renewal_count: row.renewal_count ?? 0,
  created_at: row.created_at,
  expires_at: row.expires_at,
  updated_at: row.updated_at,
  images: (row.listing_images ?? []).sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((i: any) => i.url),
});

export const expireListingIfNeeded = (listing: Listing): Listing =>
  listing.status === 'active' && isBefore(new Date(listing.expires_at), new Date()) ? { ...listing, status: 'expired' as ListingStatus } : listing;

const hydrate = (listing: Listing, db = getDb()): ListingWithCategory => ({
  ...expireListingIfNeeded(listing),
  category: fallbackCategories.find((c) => c.id === listing.category_id) ?? fallbackCategories[0],
  owner: db.profiles.find((p) => p.id === listing.owner_id) ?? db.profiles[0],
  offer_count: db.offers.filter((o) => o.listing_id === listing.id).length,
});

const hydrateRemote = (row: any): ListingWithCategory => ({
  ...expireListingIfNeeded(normalizeListing(row)),
  category: row.categories ? normalizeCategory(row.categories) : fallbackCategories[0],
  owner: row.profiles ? normalizeProfile(row.profiles) : seedProfiles[0],
  offer_count: Array.isArray(row.offers) ? row.offers.length : 0,
});

async function selectListings() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('listings')
    .select('*, categories(*), profiles(*), listing_images(url, sort_order), offers(id)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(hydrateRemote);
}

export const getCategories = async (): Promise<Category[]> => {
  if (!supabase) return fallbackCategories;
  const { data, error } = await supabase.from('categories').select('*').order('group').order('sort_order');
  if (error) throw error;
  const remote = (data ?? []).map(normalizeCategory);
  return fallbackCategories.map((fallback) => remote.find((c) => c.slug === fallback.slug || c.name === fallback.name) ?? fallback);
};

export const getCategoriesByGroup = async (group: CategoryGroup) => (await getCategories()).filter((c) => c.group === group).sort((a, b) => a.sort_order - b.sort_order);

export const getCurrentProfile = async (): Promise<Profile | null> => {
  if (!supabase) return getDb().profiles.find((p) => p.id === fallbackCurrentUserId()) ?? getDb().profiles[0];
  const user = await getSessionUser();
  if (!user) return null;
  return ensureMyProfile(user.user_metadata?.full_name || user.email?.split('@')[0] || 'ZamanSepeti üyesi');
};

export const ensureMyProfile = async (fallbackName = 'ZamanSepeti üyesi'): Promise<Profile | null> => {
  if (!supabase) return getDb().profiles.find((p) => p.id === fallbackCurrentUserId()) ?? getDb().profiles[0];
  const user = await getSessionUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (data) return normalizeProfile(data);
  return upsertMyProfile({ id: user.id, full_name: fallbackName });
};

export const upsertMyProfile = async (profile: Partial<Profile> & { id: string; full_name?: string }): Promise<Profile> => {
  if (!supabase) return updateProviderProfile(profile as Partial<Profile> & { id: string });
  const now = new Date().toISOString();
  const payload = {
    id: profile.id,
    full_name: profile.full_name || 'ZamanSepeti üyesi',
    phone: profile.phone ?? null,
    city: profile.city ?? null,
    skills: profile.skills ?? [],
    bio: profile.bio ?? null,
    avatar_url: profile.avatar_url ?? null,
    is_provider: profile.is_provider ?? false,
    provider_title: profile.provider_title ?? null,
    provider_intro: profile.provider_intro ?? null,
    price_from: profile.price_from ?? null,
    updated_at: now,
  };
  const { data, error } = await supabase.from('profiles').upsert(payload).select('*').single();
  if (error) throw error;
  return normalizeProfile(data);
};

export const getProfile = async (id: string) => {
  if (!supabase) return getDb().profiles.find((p) => p.id === id) ?? null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? normalizeProfile(data) : null;
};

export const getListingById = async (id: string) => {
  if (!supabase) {
    const db = getDb();
    const listing = db.listings.find((l) => l.id === id);
    return listing ? hydrate(listing, db) : null;
  }
  const { data, error } = await supabase
    .from('listings')
    .select('*, categories(*), profiles(*), listing_images(url, sort_order), offers(id)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? hydrateRemote(data) : null;
};

export const getHotListings = async () => {
  const remote = await selectListings();
  const listings = remote ?? getDb().listings.map((l) => hydrate(l));
  return listings
    .filter((l) => l.status === 'active')
    .sort((a, b) => Number(b.is_promoted) - Number(a.is_promoted) || Number(b.is_urgent) - Number(a.is_urgent) || byCreatedDesc(a, b))
    .slice(0, 6);
};

export const getWeeklyListings = async () => {
  const remote = await selectListings();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return (remote ?? getDb().listings.map((l) => hydrate(l)))
    .filter((l) => l.status === 'active')
    .filter((l) => new Date(l.created_at).getTime() >= weekAgo)
    .slice(0, 8);
};

export const getAllListings = async (params?: { group?: CategoryGroup; q?: string }) => {
  const remote = await selectListings();
  return (remote ?? getDb().listings.map((l) => hydrate(l)))
    .filter((l) => l.status === 'active')
    .filter((l) => (params?.group ? l.category.group === params.group : true))
    .filter((l) => (params?.q ? (l.title + l.description + l.category.name).toLocaleLowerCase('tr').includes(params.q.toLocaleLowerCase('tr')) : true))
    .sort(byCreatedDesc);
};

export const getActiveListingCount = async () => {
  const listings = await getAllListings();
  return listings.filter((l) => l.status === 'active').length;
};

export const getLast24hListingCount = async () => {
  const listings = await getAllListings();
  const cutoff = Date.now() - 86400000;
  return listings.filter((l) => new Date(l.created_at).getTime() >= cutoff).length;
};

export const getProviderProfiles = async () => {
  const providers = await getAllProviderProfiles();
  return providers.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 4);
};

export const getAllProviderProfiles = async () => {
  if (!supabase) return getDb().profiles.filter((p) => p.is_provider && Boolean(p.provider_title));
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_provider', true)
    .not('provider_title', 'is', null)
    .order('rating', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalizeProfile).filter((p) => Boolean(p.provider_title));
};

export const updateProviderProfile = async (profile: Partial<Profile> & { id: string }): Promise<Profile> => {
  if (!supabase) {
    const db = getDb();
    db.profiles = db.profiles.map((p) => (p.id === profile.id ? { ...p, ...profile, updated_at: new Date().toISOString() } : p));
    saveDb(db);
    return getDb().profiles.find((p) => p.id === profile.id)!;
  }
  return upsertMyProfile(profile);
};

const resolveCategoryId = async (categoryId: string) => {
  if (!supabase || /^[0-9a-f-]{36}$/i.test(categoryId)) return categoryId;
  const local = fallbackCategories.find((c) => c.id === categoryId || c.slug === categoryId || c.name === categoryId);
  if (!local) return categoryId;
  const cats = await getCategories();
  return cats.find((c) => c.slug === local.slug || c.name === local.name)?.id ?? categoryId;
};

async function uploadListingImages(listingId: string, files: File[]) {
  if (!supabase || files.length === 0) return [] as string[];
  const urls: string[] = [];
  const limitedFiles = files.slice(0, 3);
  for (let index = 0; index < limitedFiles.length; index += 1) {
    const file = limitedFiles[index];
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${listingId}/${Date.now()}-${index}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('listing-images').upload(path, file, { upsert: false });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('listing-images').getPublicUrl(path);
    urls.push(data.publicUrl);
    await supabase.from('listing_images').insert({ listing_id: listingId, url: data.publicUrl, sort_order: index });
  }
  return urls;
}

export const createListing = async (input: ListingInput) => {
  if (!supabase) {
    const now = new Date();
    const listing: Listing = {
      ...(input as Omit<Listing, 'id' | 'owner_id' | 'status' | 'created_at' | 'expires_at' | 'updated_at' | 'renewal_count' | 'is_promoted' | 'promoted_until'>),
      images: Array.isArray(input.images) ? (input.images as string[]) : [],
      id: crypto.randomUUID(),
      owner_id: fallbackCurrentUserId(),
      status: 'active',
      is_promoted: false,
      promoted_until: null,
      renewal_count: 0,
      created_at: now.toISOString(),
      expires_at: addDays(now, 7).toISOString(),
      updated_at: now.toISOString(),
    };
    const db = getDb();
    db.listings.unshift(listing);
    saveDb(db);
    return listing;
  }
  const user = await getSessionUser();
  if (!user) throw new Error('Talep oluşturmak için giriş yapmalısın.');
  await ensureMyProfile(user.user_metadata?.full_name || user.email?.split('@')[0] || 'ZamanSepeti üyesi');
  const categoryId = await resolveCategoryId(input.category_id);
  const payload = {
    owner_id: user.id,
    title: input.title,
    description: input.description,
    budget_min: input.budget_min,
    budget_max: input.budget_max,
    category_id: categoryId,
    city: input.is_remote ? 'Online' : input.city,
    is_remote: input.is_remote,
    is_urgent: input.is_urgent,
  };
  const { data, error } = await supabase.from('listings').insert(payload).select('*').single();
  if (error) throw error;
  const files = (input.images ?? []).filter((file): file is File => typeof File !== 'undefined' && file instanceof File);
  const imageUrls = await uploadListingImages(data.id, files);
  return { ...normalizeListing(data), images: imageUrls };
};

export const updateListing = async (id: string, patch: Partial<Listing>) => {
  if (!supabase) {
    const db = getDb();
    db.listings = db.listings.map((l) => (l.id === id ? { ...l, ...patch, updated_at: new Date().toISOString() } : l));
    saveDb(db);
    return getListingById(id);
  }
  const { error } = await supabase.from('listings').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
  return getListingById(id);
};

export const renewListing = async (id: string) => {
  const listing = await getListingById(id);
  if (!listing) throw new Error('Talep bulunamadı.');
  return updateListing(id, { status: 'active', renewal_count: listing.renewal_count + 1, expires_at: addDays(new Date(), 7).toISOString() });
};

export const sanitizeContactInfo = (message: string) =>
  message
    .replace(/(^|[^\w.%+-])[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}(?=$|[^\w.-])/g, '$1***')
    .replace(/(?:https?:\/\/|www\.)\S+/gi, '***')
    .replace(/(^|\s)(?:wa\.me|whatsapp\.com)\/\S+/gi, '$1***')
    .replace(/(?:\+?90\s*)?(?:0\s*)?5\d{2}[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}(?=$|\D)/g, '***');

export const createOffer = async (input: { listing_id: string; price: number; duration_text: string; message: string }) => {
  const listing = await getListingById(input.listing_id);
  if (!listing) throw new Error('Talep bulunamadı.');
  const uid = await currentUserId();
  if (listing.owner_id === uid) throw new Error('Kendi talebine teklif veremezsin.');
  if (listing.status !== 'active') throw new Error('Bu talebin süresi dolmuş.');
  const now = new Date().toISOString();
  const offer: Offer = {
    id: crypto.randomUUID(),
    listing_id: input.listing_id,
    sender_id: uid,
    price: input.price,
    duration_text: input.duration_text,
    message: input.message,
    sanitized_message: sanitizeContactInfo(input.message),
    status: 'pending',
    created_at: now,
    updated_at: now,
  };
  if (!supabase) {
    const db = getDb();
    db.offers.unshift(offer);
    saveDb(db);
    return offer;
  }
  const { data, error } = await supabase.from('offers').insert({ ...offer, id: undefined }).select('*').single();
  if (error) throw error;
  return data as Offer;
};

export const getOffersForListing = async (listingId: string): Promise<OfferWithSender[]> => {
  if (!supabase) {
    const db = getDb();
    return db.offers.filter((o) => o.listing_id === listingId).map((o) => ({ ...o, sender: db.profiles.find((p) => p.id === o.sender_id)! }));
  }
  const { data, error } = await supabase.from('offers').select('*, profiles(*)').eq('listing_id', listingId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((o: any) => ({ ...(o as Offer), sender: normalizeProfile(o.profiles) }));
};

export const getMyOffers = async () => {
  const uid = await currentUserId();
  if (!supabase) return getDb().offers.filter((o) => o.sender_id === uid);
  const { data, error } = await supabase.from('offers').select('*').eq('sender_id', uid).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Offer[];
};

export const getMyListings = async () => {
  const uid = await currentUserId();
  const listings = await getAllListings();
  return listings.filter((l) => l.owner_id === uid);
};

export const acceptOffer = async (offerId: string) => {
  if (!supabase) {
    const db = getDb();
    const offer = db.offers.find((o) => o.id === offerId);
    if (!offer) throw new Error('Teklif bulunamadı.');
    const listing = db.listings.find((l) => l.id === offer.listing_id);
    if (!listing || listing.owner_id !== fallbackCurrentUserId()) throw new Error('Sadece talep sahibi teklifi kabul edebilir.');
    db.offers = db.offers.map((o) => (o.id === offerId ? { ...o, status: 'accepted', updated_at: new Date().toISOString() } : o.listing_id === offer.listing_id ? { ...o, status: o.status === 'pending' ? 'rejected' : o.status, updated_at: new Date().toISOString() } : o));
    db.listings = db.listings.map((l) => (l.id === listing.id ? { ...l, status: 'closed', updated_at: new Date().toISOString() } : l));
    saveDb(db);
    return db.offers.find((o) => o.id === offerId)!;
  }
  const offers = await getOffersForListing((await supabase.from('offers').select('listing_id').eq('id', offerId).single()).data?.listing_id ?? '');
  const offer = offers.find((o) => o.id === offerId);
  if (!offer) throw new Error('Teklif bulunamadı.');
  await supabase.from('offers').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('listing_id', offer.listing_id).eq('status', 'pending');
  const { error } = await supabase.from('offers').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', offerId);
  if (error) throw error;
  await supabase.from('listings').update({ status: 'closed', updated_at: new Date().toISOString() }).eq('id', offer.listing_id);
  return { ...offer, status: 'accepted' as const };
};

export const createMessage = async (listingId: string, conversationId: string, content: string) => {
  if (!supabase) throw new Error('Mesajlaşma canlı Supabase modunda kullanılabilir.');
  const user = await getSessionUser();
  if (!user) throw new Error('Mesaj göndermek için giriş yapmalısın.');
  const { data, error } = await supabase.from('messages').insert({ listing_id: listingId, conversation_id: conversationId, sender_id: user.id, content }).select('*').single();
  if (error) throw error;
  return data;
};

export const getMessages = async (listingId: string) => {
  if (!supabase) return [] as any[];
  const { data, error } = await supabase.from('messages').select('*, profiles(full_name)').eq('listing_id', listingId).order('created_at');
  if (error) throw error;
  return data ?? [];
};

export const createReview = async (revieweeId: string, listingId: string, rating: number, comment: string) => {
  if (!supabase) throw new Error('Değerlendirme canlı Supabase modunda kullanılabilir.');
  const user = await getSessionUser();
  if (!user) throw new Error('Değerlendirme yapmak için giriş yapmalısın.');
  const { data, error } = await supabase.from('reviews').insert({ reviewer_id: user.id, reviewee_id: revieweeId, listing_id: listingId, rating, comment }).select('*').single();
  if (error) throw error;
  return data;
};

export const getReviewsForProfile = async (profileId: string) => {
  if (!supabase) return [] as any[];
  const { data, error } = await supabase.from('reviews').select('*').eq('reviewee_id', profileId).order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

export const createReport = async (input: { listing_id?: string; profile_id?: string; reason: string; detail?: string }): Promise<Report> => {
  if (!supabase) throw new Error('Bildirim ve raporlama canlı Supabase modunda kullanılabilir.');
  const user = await getSessionUser();
  if (!user) throw new Error('Rapor göndermek için giriş yapmalısın.');
  const { data, error } = await supabase.from('reports').insert({ reporter_id: user.id, ...input }).select('*').single();
  if (error) throw error;
  return data as Report;
};

export const getMyNotifications = async (): Promise<Notification[]> => {
  if (!supabase) return [];
  const user = await getSessionUser();
  if (!user) return [];
  const { data, error } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Notification[];
};

export const markNotificationRead = async (id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
};

export const countdownLabel = (expiresAt: string) =>
  isBefore(new Date(expiresAt), new Date()) ? 'Süre doldu' : formatDistanceToNowStrict(new Date(expiresAt), { locale: tr, unit: 'day' }).replace(' gün', 'g');
