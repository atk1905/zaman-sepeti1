# ZamanSepeti / Zaman Sepeti

ZamanSepeti, “zamanı olmayan ama bütçesi olan” kişilerin talep açtığı; çözüm verenlerin bu taleplere teklif verdiği talep odaklı marketplace MVP’sidir.

Ana marka cümlesi: “Zekan var, zamanın yok. Birinin yapay zekayla 30 dakikada yapacağı işi haftalarca bekleme.”

Alt konumlandırma: Türkiye’nin ilk akıllı iş pazaryeri.

Kurumsal sahip: zamansepeti.org bir Maya Elektronik Bilişim markasıdır.

## Özellikler

- Tek kullanıcı tipi: aynı kullanıcı talep açabilir ve teklif verebilir.
- Gerçek Supabase Auth: e-posta/şifre kayıt, giriş ve çıkış.
- Supabase CRUD entegrasyonu: profiller, talepler, teklifler, mesajlar, değerlendirmeler, bildirimler ve raporlar.
- Supabase Storage entegrasyonu: talep oluştururken en fazla 3 ilan görseli `listing-images` bucket’ına yüklenir.
- Sıcak Talepler vitrini: promoted, urgent ve created_at sıralaması.
- Çözüm Verenler vitrini ve public profil sayfaları.
- Akıllı İşler ve Klasik Hizmetler kategori grupları.
- 7 günlük geri sayım; süresi dolan talepler service/UI katmanında kapalı görünür.
- Talep oluşturma, profil düzenleme, çözüm veren toggle.
- Teklif oluşturma, talep sahibinin teklif kabul etmesi.
- Kabul edilen teklif sonrası mesajlaşma alanı.
- Profil değerlendirmeleri.
- Talep raporlama ve teklif bildirimleri için canlı backend altyapısı.
- Telefon, e-posta, URL ve WhatsApp link sansürü.
- Ödeme entegrasyonu yok; iyzico/PayTR için “Yakında” toast’u korunur.

## Local çalıştırma

```bash
npm install
cp .env.example .env
npm run dev
```

Kalite komutları:

```bash
npm run lint
npm run typecheck
npm test
npm run test:smoke
npm run build
```

`npm test` tüm Vitest testlerini çalıştırır. `npm run test:smoke` ana ürün akışları için hızlı smoke paketi olarak ayrıca CI’da da koşar.

## Ortam değişkenleri

`.env.example` dosyasını `.env` olarak kopyalayın. Canlı Supabase için public anon key ve URL girilir. Secret veya service role key repoya koymayın.

```bash
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=public-anon-key
```

## Supabase kurulum notları

Migration dosyaları `supabase/migrations/` altındadır. Canlı backend için şu alanlar hazırdır:

- `profiles`, `categories`, `listings`, `listing_images`, `offers`, `messages`, `reviews`, `promotions`
- `reports`, `notifications`
- `listing-images` public Storage bucket
- Auth sonrası otomatik profile bootstrap trigger’ı
- Teklif oluşturulduğunda talep sahibine bildirim trigger’ı
- RLS policy’leri

## Yayın ve domain durumu

GitHub Pages workflow’u `main` branch’e push edildiğinde lint, typecheck, test, smoke ve build adımlarını çalıştırıp `dist/` çıktısını yayınlar. PR’larda da aynı kalite kapıları koşar.

- GitHub Pages URL: `https://atk1905.github.io/zaman-sepeti1/`
- Custom domain hedefi: `https://www.zamansepeti.org`
- 19 Mayıs 2026 kontrolünde `www.zamansepeti.org` HTTP 200 dönüyor ancak GitHub Pages custom domain’i olarak tanımlı değil; apex `zamansepeti.org` WordPress içeriğine gidiyor. Canlı domain yayını için DNS/hosting tarafında GitHub Pages veya seçilecek hosting provider’a yönlendirme ayrıca yapılmalıdır.

## Test edilen MVP akışları

- Gerçek giriş/kayıt ekranları
- Profil düzenleme ve Çözüm Veren toggle
- Çözüm Verenler vitrini ve public profil
- Talep oluşturma ve sıcak taleplerde görünme
- Talep görsel yükleme için Storage akışı
- İlanlar listesi, akıllı/klasik grup filtreleri
- Talep detayı, teklif gönderme, teklif kabul
- Kabul edilen teklif sonrası mesajlaşma
- Değerlendirme gönderme ve public profilde listeleme
- Talep raporlama
- Bildirimleri listeleme ve okundu işaretleme
- İletişim bilgisi sansürü
- 7 günlük geri sayım ve expired state
- Responsive layout ve header/footer

## Sonraki fazlar

Bu görev kapsamında özellikle yapılmayanlar:

- zamansepeti.org custom domain bağlama ve DNS/hosting yönlendirmesini doğrulama
- iyzico/PayTR gerçek ödeme entegrasyonu

Önerilen sonraki işler:

- Supabase Auth redirect ve e-posta şablonlarını marka diline göre özelleştirme
- Mesajlaşmayı realtime subscription ile canlı hale getirme
- Review sadece tamamlanan iş taraflarına açık olacak şekilde daha sıkı iş kuralı
- Moderation admin paneli
- Scheduled expiry job veya pg_cron
- Bildirimleri e-posta/push kanallarına taşıma
- Doğrulanmış profil ve Pro abonelik
