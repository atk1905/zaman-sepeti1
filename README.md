# ZamanSepeti / Zaman Sepeti

ZamanSepeti, “zamanı olmayan ama bütçesi olan” kişilerin talep açtığı; çözüm verenlerin bu taleplere teklif verdiği talep odaklı marketplace MVP’sidir.

Ana marka cümlesi: “Zekan var, zamanın yok. Birinin yapay zekayla 30 dakikada yapacağı işi haftalarca bekleme.”

Alt konumlandırma: Türkiye’nin ilk akıllı iş pazaryeri.

Kurumsal sahip: zamansepeti.org bir Maya Elektronik Bilişim markasıdır.

## Özellikler

- Tek kullanıcı tipi: aynı kullanıcı talep açabilir ve teklif verebilir.
- Sıcak Talepler vitrini: promoted, urgent ve created_at sıralaması.
- Çözüm Verenler vitrini ve public profil sayfaları.
- Akıllı İşler ve Klasik Hizmetler kategori grupları.
- 7 günlük geri sayım; süresi dolan talepler service/UI katmanında kapalı görünür.
- Talep oluşturma, profil düzenleme, çözüm veren toggle.
- Teklif oluşturma, talep sahibinin teklif kabul etmesi.
- Telefon, e-posta, URL ve WhatsApp link sansürü.
- Ödeme entegrasyonu yok; iyzico/PayTR için “Yakında” toast’u.
- Supabase schema/RLS migration hazır, local demo backend ile çalışır.

## Local çalıştırma

```bash
npm install
npm run dev
```

Kalite komutları:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Ortam değişkenleri

`.env.example` dosyasını `.env` olarak kopyalayın. Demo mod env olmadan çalışır; canlı Supabase için public anon key ve URL girilir. Secret veya service role key repoya koymayın.

## Test edilen MVP akışları

- Demo giriş/kayıt ekranları
- Profil düzenleme ve Çözüm Veren toggle
- Çözüm Verenler vitrini ve public profil
- Talep oluşturma ve sıcak taleplerde görünme
- İlanlar listesi, akıllı/klasik grup filtreleri
- Talep detayı, teklif gönderme, teklif kabul
- İletişim bilgisi sansürü
- 7 günlük geri sayım ve expired state
- Responsive layout ve header/footer

## Faz 2

- iyzico/PayTR entegrasyonu
- Gerçek mesajlaşma
- Değerlendirme sistemi
- Doğrulanmış profil
- Pro abonelik
- Moderation/report sistemi
- Scheduled expiry job veya pg_cron
- Bildirimler
