# DeepSeek backend / security / database

AI output unavailable, Hermes synthesized internally.

- PostgreSQL/Supabase tabloları user tarafından verilen modele göre migration içinde tanımlandı.
- RLS: public read gereken profiller/kategoriler/aktif ilanlar için okuma; sahip bazlı güncelleme; tekliflerde sender veya listing owner okuma.
- MVP’de gerçek ödeme yok; promotions placeholder status ile tasarlandı.
- Mesajlarda ve tekliflerde kabul öncesi iletişim bilgisi sansürü uygulama katmanında.
- Expiry MVP’de service/UI katmanında expires_at < now ise expired kabul ediliyor; Faz 2 scheduled function/pg_cron.
