# Geliştirme Notları

## İlkeler
- Tek durum kaynağı: `js/state.js`. Sayfalar `subscribe` ile dinler, kendi kopyasını tutmaz.
- Kullanıcı metni asla `innerHTML` ile eklenmez (`utils/dom.js › h()` yalnızca `textContent` kullanır).
- Zaman: `timer.js` süreyi `Date.now()` farkından hesaplar; duraklatmada biriken süre `elapsedBeforePause`'dadır.
- Sayfalar `mount(root)` → `unmount` fonksiyonu döndürür; abonelik/RAF/observer orada temizlenir.
- Tüm renk ve boşluklar `css/tokens.css`'ten gelir.

## Yeni özellik eklerken
- Yeni süre/ayar → `config.js`. Yeni kalıcı alan → `state.js` sanitize + `storage.js` anahtarı.
- Yeni ana sayfa **eklenmez** (doküman bölüm 2).

## Sahne (`components/nav-scene.js`)
Perspektif projeksiyonu: `y = ufuk + K/d`. `update(progress, duration, braking)` dışarıdan tek giriş noktasıdır; kaynak olarak SVG yerine görsel/Canvas kullanılırsa yalnızca bu dosya değişir.

## Kalite kontrol listesi
Üç sayfada gezinme, görev ekleme/boş görev engeli, tamamlama, odaklan, başlat/duraklat/devam, sayfa değiştirirken süre, sekme arka plan, yenileme sonrası veri, 320–1920 px, reduced-motion.

