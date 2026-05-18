# Final synthesis

ZamanSepeti, zamanı olmayan ama bütçesi olan kullanıcıların kısa ömürlü talepler açtığı; çözüm verenlerin bu taleplere teklif verdiği talep odaklı bir marketplace olarak uygulanmıştır. Ürün, klasik ilan sitesi gibi pasif arşiv yaratmak yerine 7 günlük aktif talep döngüsüyle canlılık ve aciliyet hissi üretir.

## Ürün kararları

- Tek hesap tipi korunur; Talep Sahibi ve Çözüm Veren davranışsal rollerdir.
- Ana sayfa sırası ürün kararlarına göre kurulur: Header, Hero, Sıcak Talepler, Çözüm Verenler, Akıllı İşler, Klasik Hizmetler, Bu Hafta Açılanlar, reklam ve footer.
- Akıllı İşler daha premium/pastel vurgu ile ayrılır; Klasik Hizmetler ikinci katman olarak sunulur.
- Her talep 7 gün aktif kalır; expires_at geçmişse service/UI tarafında expired görünür.
- MVP ödeme aracılığı yapmaz. Promosyon, aciliyet ve yenileme gelir modeli placeholder/toast olarak bırakılır.

## Teknik kararlar

- React + TypeScript + Vite + Tailwind + lucide-react.
- Supabase Auth/CRUD/Storage/RLS canlı backend için hazırdır; env yoksa localStorage demo fallback çalışır.
- Domain servisleri: getHotListings, getWeeklyListings, getListingById, createListing, updateListing, expireListingIfNeeded, renewListing, createOffer, acceptOffer, sanitizeContactInfo, getProviderProfiles, updateProviderProfile, getCategoriesByGroup, getActiveListingCount, getLast24hListingCount.
- Teklif kabulünde kabul edilen teklif `accepted`, aynı ilana ait pending teklifler `rejected`, talep `closed` yapılır. Bu MVP’de net kapanış sağlar.
- Telefon, e-posta, URL ve WhatsApp bağlantıları kabul öncesi `***` ile sansürlenir.

## Güvenlik ve veri

- RLS migrationları public read ve owner/sender scoped write/read kurallarını tanımlar.
- Secrets commit edilmez; `.env.example` yalnız public Vite env anahtarlarını içerir.
- Görsel limiti application-level 3 dosya ile uygulanır; Storage bucket `listing-images` için hazırlanır.

## UX / microcopy

- UI tamamen Türkçe tutulur.
- Header’da Giriş ve Kayıt Ol görünür.
- Footer’da doğru kurumsal ifade yer alır: “zamansepeti.org bir Maya Elektronik Bilişim markasıdır.”
- Reklam alanı placeholder olarak ana sayfada ve ilanlar sayfasında gösterilir.
