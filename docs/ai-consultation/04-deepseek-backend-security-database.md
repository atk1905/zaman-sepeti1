# DeepSeek backend, güvenlik ve database

Kaynak: web AI oturumu üzerinden alındı; gereksiz navigasyon metinleri ayıklanmadan ham not olarak saklandı.

```text
New chat
Today
ZamanSepeti Supabase PostgreSQL Güvenlik Danışmanlığı
Resim Teknikleri
ZamanSepeti Supabase PostgreSQL Güvenlik Danışmanlığı
Instant
ZamanSepeti Supabase/PostgreSQL backend güvenlik danışmanlığı ver. Tablolar: profiles, categories(group smart/classic), listings(expires_at 7 gün), listing_images max 3 app-level, offers(sanitized_message), messages, reviews, promotions. RLS: public read profiles/categories/active listings, owner write listings, offers sender+owner read, authenticated offer create, listing owner accept/reject. Çıktı: schema/RLS önerileri, edge-case, performans, güvenlik riskleri. Türkçe._images max

Aşağıda ZamanSepeti uygulamanız için Supabase/PostgreSQL tabanlı güvenli ve performanslı backend tasarımı sunulmuştur.
Tablolar, RLS politikaları, edge-case’ler, performans ipuçları ve güvenlik riskleri detaylandırılmıştır.

1. Tablo Şemaları (Schema)
profiles (kullanıcı profilleri)
sql
Copy
Download
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  city TEXT,
  rating_avg DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
categories (grup: smart / classic)
sql
Copy
Download
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  group_name TEXT CHECK (group_name IN ('smart', 'classic')) NOT NULL,
  icon TEXT,
  is_active BOOLEAN DEFAULT true
);
listings (ilanlar, expires_at: 7 gün sonra)
sql
Copy
Download
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id INT REFERENCES categories(id),
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  city TEXT,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'expired', 'deleted')),
  views INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
listing_images (max 3 – app-level + DB kontrolü)
sql
Copy
Download
CREATE TABLE listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  position INT DEFAULT 0,  -- sıralama için
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(listing_id, position)  -- aynı pozisyon tekrarı engeller
);

App-level + DB: position 0,1,2 ile sınırlandırılır. Trigger ile listing başına max 3 image kontrolü eklenebilir.

offers (teklifler, sanitized_message)
sql
Copy
Download
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  message TEXT,
  sanitized_message TEXT,  -- XSS/HTML temizlenmiş kopya
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);
messages (sadece teklif bazlı mesajlaşma için opsiyonel)
sql
Copy
Download
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
reviews
sql
Copy
Download
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewee_id UUID NOT NULL REFERENCES profiles(id), -- puan alan kişi (satıcı/alıcı)
  reviewer_id UUID NOT NULL REFERENCES profiles(id),
  listing_id UUID REFERENCES listings(id),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
promotions
sql
Copy
Download
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('highlight', 'boost')),
  starts_at TIMESTAMPTZ DEFAULT now(),
  ends_at TIMESTAMPTZ DEFAULT (now() + interval '3 days'),
  is_active BOOLEAN DEFAULT true
);
2. Row Level Security (RLS) Politikaları
Genel
sql
Copy
Download
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
Profiles
sql
Copy
Download
-- Herkes aktif profilleri okuyabilir
CREATE POLICY "Public read profiles" ON profiles
  FOR SELECT USING (true);

-- Kendi profilini update edebilir
CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
Categories
sql
Copy
Download
CREATE POLICY "Public read categories" ON categories
  FOR SELECT USING (is_active = true);
Listings
sql
Copy
Download
-- Aktif ilanları herkes okuyabilir (expired/deleted/sold gizlenebilir)
CREATE POLICY "Public read active listings" ON listings
  FOR SELECT USING (status = 'active' AND expires_at > now());

-- İlan sahibi kendi ilanlarını CRUD yapabilir
CREATE POLICY "Owner manage own listings" ON listings
  FOR ALL USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
Listing Images
sql
Copy
Download
-- Herkes resimleri görebilir (ilan aktifse)
CREATE POLICY "Public read images" ON listing_images
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND status = 'active')
  );

-- Sadece ilan sahibi resim ekleyip silebilir
CREATE POLICY "Owner manage images" ON listing_images
  FOR ALL USING (
    EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND owner_id = auth.uid())
  );
Offers
sql
Copy
Download
-- Teklif sahibi ve ilan sahibi görebilir
CREATE POLICY "Sender and listing owner read offers" ON offers
  FOR SELECT USING (
    auth.uid() = sender_id OR 
    EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND owner_id = auth.uid())
  );

-- Oturum açmış herkes teklif oluşturabilir (kendi adına)
CREATE POLICY "Authenticated create offers" ON offers
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND status = 'active')
  );

-- İlan sahibi teklifi kabul/red edebilir
CREATE POLICY "Listing owner update offer status" ON offers
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND owner_id = auth.uid())
  )
  WITH CHECK (status IN ('accepted', 'rejected'));
Messages
sql
Copy
Download
-- Teklife dahil olan taraflar mesajları görebilir
CREATE POLICY "Offer participants read messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM offers o
      JOIN listings l ON l.id = o.listing_id
      WHERE o.id = offer_id AND (o.sender_id = auth.uid() OR l.owner_id = auth.uid())
    )
  );

CREATE POLICY "Sender insert messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
3. Edge-Case’ler ve Çözümleri
Edge-Case	Çözüm
Aynı ilana 3’ten fazla resim yüklenmesi	BEFORE INSERT trigger kontrolü + app validation
Expired listing’e teklif yapılması	offers insert policy’sinde listings.status='active' AND expires_at > now() kontrolü
Teklif kabul edildikten sonra başka teklif kabulü	offers update trigger ile listing status = ‘sold’ ve diğer teklifler ‘rejected’
Yorumların sadece işlem tamamlandıktan sonra yapılabilmesi	Listing sold, offer accepted kontrolü
Promotion süresi bitince otomatik pasif	cron veya pg_cron ile günlük UPDATE promotions SET is_active=false WHERE ends_at < now()
Kullanıcı profil resmi silme	Storage bucket’a RLS + ON DELETE CASCADE veya BEFORE DELETE trigger ile storage temizliği
SQL Injection riski (offers.message)	App’de DOMPurify + DB’de sanitized_message trigger ile temizleme
4. Performans Önerileri

Indexler

sql
Copy
Download
CREATE INDEX idx_listings_owner_status ON listings(owner_id, status);
CREATE INDEX idx_listings_expires ON listings(expires_at) WHERE status='active';
CREATE INDEX idx_offers_listing ON offers(listing_id);
CREATE INDEX idx_offers_sender ON offers(sender_id);
CREATE INDEX idx_messages_offer ON messages(offer_id);
CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id);

Partial Index – sadece aktif ilanlar için

sql
Copy
Download
CREATE INDEX idx_active_listings ON listings(id, expires_at) WHERE status='active';

Expired listing’leri temizleme

sql
Copy
Download
-- Günlük scheduled job (pg_cron veya supabase edge function)
UPDATE listings SET status='expired' WHERE expires_at < now() AND status='active';

Count sorgularından kaçın – paginate için cursor kullan.

Listing sorgusunda LEFT JOIN ile image limit

sql
Copy
Download
SELECT * FROM listings l
LEFT JOIN LATERAL (
  SELECT array_agg(image_url ORDER BY position) FROM listing_images WHERE listing_id=l.id LIMIT 3
) images ON true;
5. Güvenlik Riskleri ve Önlemleri
Risk	Seviye	Çözüm
RLS eksikliği	Kritik	Tüm tablolarda RLS açık, policy test edilmeli
Direct file upload XSS	Yüksek	Storage bucket public değil, resim URL’leri text/plain olarak saklanmaz, avatar_url validation
Offers.message XSS	Orta	Hem app-level sanitize, hem trigger ile sanitized_message oluştur
ID enumeration	Düşük	UUID kullan, serial ID kullanma
Expired listing yeniden aktif etme	Orta	expires_at immutable yap veya sadece admin update yetkisi
Rate limiting yok	Orta	Supabase Edge Functions + pg_ratelimit veya app-level throttle
Promotion abuse	Düşük	Aynı listing için aynı anda birden fazla aktif promotion engeli (unique constraint)
Mass assignment	Orta	Supabase JS client’ta return: 'minimal' ve form validasyonu
6. Özet Best Practice Checklist

Tüm tablolar auth.uid() ile RLS korumalı

offers.message için sanitized_message alanı

Her listing için max 3 image (trigger + app)

expires_at ile soft-delete mantığı

promotions için zamanlı geçerlilik

Indexler performans için eklendi

Edge-case trigger’ları ve scheduled job önerisi

Bu yapıyı Supabase Studio üzerinden uygulayabilir, pg_cron veya Edge Functions ile expired listing/promotion temizliğini otomatikleştirebilirsiniz.
Gerektiğinde Row Level Security policy testleri için ayrıca yardımcı olabilirim.

DeepThink
Search
AI-generated, for reference only

```
