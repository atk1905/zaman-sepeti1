export type CategoryGroup = 'smart' | 'classic';
export type ListingStatus = 'active' | 'expired' | 'closed' | 'completed';
export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';
export interface Profile { id:string; full_name:string; phone?:string|null; city?:string|null; skills:string[]; rating?:number|null; bio?:string|null; avatar_url?:string|null; is_provider:boolean; provider_title?:string|null; provider_intro?:string|null; price_from?:number|null; created_at:string; updated_at:string; }
export interface Category { id:string; name:string; slug:string; group:CategoryGroup; icon:string; sort_order:number; }
export interface Listing { id:string; owner_id:string; title:string; description:string; budget_min:number; budget_max:number; category_id:string; city?:string|null; is_remote:boolean; status:ListingStatus; is_urgent:boolean; is_promoted:boolean; promoted_until?:string|null; renewal_count:number; created_at:string; expires_at:string; updated_at:string; images?:string[]; }
export interface Offer { id:string; listing_id:string; sender_id:string; price:number; duration_text:string; message:string; sanitized_message:string; status:OfferStatus; created_at:string; updated_at:string; }
export interface Notification { id:string; user_id:string; type:string; title:string; body?:string|null; read_at?:string|null; created_at:string; }
export interface Report { id:string; reporter_id:string; listing_id?:string|null; profile_id?:string|null; reason:string; detail?:string|null; status:'open'|'reviewing'|'resolved'|'dismissed'; created_at:string; }
export interface ListingWithCategory extends Listing { category: Category; owner: Profile; offer_count?: number; }
