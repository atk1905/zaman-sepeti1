# Blocked / sorunlu AI araçları

- İlk browser-use local Chromium denemelerinde 6 aracın tamamı için 10'ar kez `No local browser path found after: uvx playwright install chromium` hatası alındı.
- Cloud browser ile ChatGPT, Gemini, Claude, DeepSeek, Qwen ve Lovable sayfalarına erişildi.
- ChatGPT, Gemini, Claude ve DeepSeek çıktısı alınabildi.
- Qwen çıktısı önceki backend/RLS bağlamına saptı; frontend kararları Hermes tarafından sentezlendi.
- Lovable promptu yazıldı ve gönderilmeye çalışıldı; gönderim sonrası browser-use bağlantısı `No local browser path found` hatasıyla koptu, bu nedenle Lovable dosyası Hermes senteziyle tamamlandı.

Takılmadan MVP geliştirme, test ve teslim adımlarına devam edildi.
