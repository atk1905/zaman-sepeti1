import { addDays, formatDistanceToNowStrict, isBefore } from 'date-fns';
import { tr } from 'date-fns/locale';
import { categories } from '../data/categories';
import { seedListings, seedOffers, seedProfiles } from '../data/seed';
import type { CategoryGroup, Listing, ListingWithCategory, Offer, Profile } from '../types';

const KEY = 'zamansepeti-demo-db-v2';
type Db = { profiles: Profile[]; listings: Listing[]; offers: Offer[] };
const clone = <T,>(value:T):T => JSON.parse(JSON.stringify(value));
const initialDb = (): Db => ({ profiles: clone(seedProfiles), listings: clone(seedListings), offers: clone(seedOffers) });
export const getDb = (): Db => { const raw = localStorage.getItem(KEY); if (!raw) { const db=initialDb(); localStorage.setItem(KEY, JSON.stringify(db)); return db; } return JSON.parse(raw) as Db; };
export const saveDb = (db: Db) => localStorage.setItem(KEY, JSON.stringify(db));
export const resetDemoData = () => saveDb(initialDb());
export const currentUserId = () => localStorage.getItem('zamansepeti-current-user') || 'u-current';
export const setCurrentUser = (id: string) => localStorage.setItem('zamansepeti-current-user', id);
export const getCurrentProfile = () => getDb().profiles.find(p=>p.id===currentUserId()) ?? getDb().profiles[0];
export const getCategoriesByGroup = (group: CategoryGroup) => categories.filter(c=>c.group===group).sort((a,b)=>a.sort_order-b.sort_order);
export const expireListingIfNeeded = (listing: Listing): Listing => listing.status === 'active' && isBefore(new Date(listing.expires_at), new Date()) ? { ...listing, status: 'expired' } : listing;
const hydrate = (listing: Listing, db=getDb()): ListingWithCategory => ({ ...expireListingIfNeeded(listing), category: categories.find(c=>c.id===listing.category_id)!, owner: db.profiles.find(p=>p.id===listing.owner_id)!, offer_count: db.offers.filter(o=>o.listing_id===listing.id).length });
export const getListingById = (id: string) => { const db=getDb(); const listing=db.listings.find(l=>l.id===id); return listing ? hydrate(listing, db) : null; };
export const getHotListings = () => { const db=getDb(); return db.listings.map(l=>hydrate(l,db)).filter(l=>l.status==='active').sort((a,b)=>Number(b.is_promoted)-Number(a.is_promoted)||Number(b.is_urgent)-Number(a.is_urgent)||new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,6); };
export const getWeeklyListings = () => { const db=getDb(); const weekAgo=Date.now()-7*24*60*60*1000; return db.listings.map(l=>hydrate(l,db)).filter(l=>new Date(l.created_at).getTime()>=weekAgo).slice(0,8); };
export const getAllListings = (params?: { group?: CategoryGroup; q?: string }) => { const db=getDb(); return db.listings.map(l=>hydrate(l,db)).filter(l=> params?.group ? l.category.group===params.group : true).filter(l=> params?.q ? (l.title+l.description+l.category.name).toLocaleLowerCase('tr').includes(params.q.toLocaleLowerCase('tr')) : true).sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()); };
export const getActiveListingCount = () => getDb().listings.map(expireListingIfNeeded).filter(l=>l.status==='active').length;
export const getLast24hListingCount = () => { const cutoff=Date.now()-86400000; return getDb().listings.filter(l=>new Date(l.created_at).getTime()>=cutoff).length; };
export const getProviderProfiles = () => getDb().profiles.filter(p=>p.is_provider && Boolean(p.provider_title)).sort((a,b)=>(b.rating??-1)-(a.rating??-1)||new Date(b.updated_at).getTime()-new Date(a.updated_at).getTime()).slice(0,4);
export const getAllProviderProfiles = () => getDb().profiles.filter(p=>p.is_provider && Boolean(p.provider_title));
export const getProfile = (id:string) => getDb().profiles.find(p=>p.id===id) ?? null;
export const updateProviderProfile = (profile: Partial<Profile> & { id: string }) => { const db=getDb(); db.profiles=db.profiles.map(p=>p.id===profile.id?{...p,...profile,updated_at:new Date().toISOString()}:p); saveDb(db); return getProfile(profile.id)!; };
export const createListing = (input: Omit<Listing,'id'|'owner_id'|'status'|'created_at'|'expires_at'|'updated_at'|'renewal_count'|'is_promoted'|'promoted_until'>) => { const now=new Date(); const listing: Listing={...input,id:crypto.randomUUID(),owner_id:currentUserId(),status:'active',is_promoted:false,promoted_until:null,renewal_count:0,created_at:now.toISOString(),expires_at:addDays(now,7).toISOString(),updated_at:now.toISOString()}; const db=getDb(); db.listings.unshift(listing); saveDb(db); return listing; };
export const updateListing = (id:string, patch: Partial<Listing>) => { const db=getDb(); db.listings=db.listings.map(l=>l.id===id?{...l,...patch,updated_at:new Date().toISOString()}:l); saveDb(db); return getListingById(id); };
export const renewListing = (id:string) => { const db=getDb(); let renewed:Listing|null=null; db.listings=db.listings.map(l=>{ if(l.id!==id) return l; renewed={...l,status:'active',renewal_count:l.renewal_count+1,expires_at:addDays(new Date(),7).toISOString(),updated_at:new Date().toISOString()}; return renewed; }); saveDb(db); return renewed; };
export const sanitizeContactInfo = (message: string) => message
 .replace(/(^|[^\w.%+-])[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}(?=$|[^\w.-])/g,'$1***')
 .replace(/(?:https?:\/\/|www\.)\S+/gi,'***')
 .replace(/(^|\s)(?:wa\.me|whatsapp\.com)\/\S+/gi,'$1***')
 .replace(/(?:\+?90\s*)?(?:0\s*)?5\d{2}[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}(?=$|\D)/g,'***');
export const createOffer = (input:{ listing_id:string; price:number; duration_text:string; message:string }) => { const listing=getListingById(input.listing_id); if(!listing) throw new Error('Talep bulunamadı.'); if(listing.owner_id===currentUserId()) throw new Error('Kendi talebine teklif veremezsin.'); if(listing.status!=='active') throw new Error('Bu talebin süresi dolmuş.'); const now=new Date().toISOString(); const offer:Offer={id:crypto.randomUUID(),listing_id:input.listing_id,sender_id:currentUserId(),price:input.price,duration_text:input.duration_text,message:input.message,sanitized_message:sanitizeContactInfo(input.message),status:'pending',created_at:now,updated_at:now}; const db=getDb(); db.offers.unshift(offer); saveDb(db); return offer; };
export const getOffersForListing = (listingId:string) => { const db=getDb(); return db.offers.filter(o=>o.listing_id===listingId).map(o=>({ ...o, sender: db.profiles.find(p=>p.id===o.sender_id)! })); };
export const getMyOffers = () => getDb().offers.filter(o=>o.sender_id===currentUserId());
export const getMyListings = () => getDb().listings.filter(l=>l.owner_id===currentUserId()).map(l=>hydrate(l));
export const acceptOffer = (offerId:string) => { const db=getDb(); const offer=db.offers.find(o=>o.id===offerId); if(!offer) throw new Error('Teklif bulunamadı.'); const listing=db.listings.find(l=>l.id===offer.listing_id); if(!listing || listing.owner_id!==currentUserId()) throw new Error('Sadece talep sahibi teklifi kabul edebilir.'); db.offers=db.offers.map(o=>o.id===offerId?{...o,status:'accepted',updated_at:new Date().toISOString()}:o.listing_id===offer.listing_id?{...o,status:o.status==='pending'?'rejected':o.status,updated_at:new Date().toISOString()}:o); db.listings=db.listings.map(l=>l.id===listing.id?{...l,status:'closed',updated_at:new Date().toISOString()}:l); saveDb(db); return db.offers.find(o=>o.id===offerId)!; };
export const countdownLabel = (expiresAt:string) => isBefore(new Date(expiresAt), new Date()) ? 'Süre doldu' : formatDistanceToNowStrict(new Date(expiresAt), { locale: tr, unit:'day' }).replace(' gün','g');
