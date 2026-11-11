# Orvyn

Günlük görevleri bir rota gibi gösteren ve Pomodoro seanslarını navigasyon yolculuğuna dönüştüren üretkenlik uygulaması.
**HTML5 + CSS3 + Vanilla JavaScript (ES Modules)** — framework, derleme adımı ve bağımlılık yok.

## Çalıştırma

ES Modules `file://` ile çalışmaz; basit bir statik sunucu gerekir:

```powershell
python -m http.server 5173
# sonra http://localhost:5173 adresini aç
```

(`npx serve` veya herhangi bir statik sunucu da olur.)

Test kolaylığı için seans sürelerini URL ile kısaltabilirsin: `http://localhost:5173/?focusSeconds=15&breakSeconds=5`

## Yapı

```
index.html
css/        reset · tokens · global · layout · components · responsive · pages/{home,route,timer}
js/
  app.js        başlatma
  config.js     merkezi ayarlar (süreler, sayfalar)
  state.js      tek merkezi durum + eylemler + seçiciler
  storage.js    sürümlü LocalStorage (bozuk veriye dayanıklı)
  timer.js      timestamp tabanlı zamanlayıcı motoru
  router.js     hash tabanlı yönlendirme (sayfa yenilemesiz)
  actions.js    sayfalar arası paylaşılan eylemler (odaklan)
  components/   navbar · task-modal · task-card · toast · icons · nav-scene
  pages/        home · route · timer
  utils/        dom · time · date
docs/       PRODUCT.md · DEVELOPMENT.md
```

## Adaptive UI

| Genişlik / yön | Navigasyon | Yerleşim |
|---|---|---|
| < 600 px dikey | Alt bar | Tek sütun, zamanlayıcıda sahne üstte panel altta |
| ≥ 600 px veya kısa yatay ekran | Sol dikey ray (ikon+etiket) | Günlük Rota ve Zamanlayıcı yan yana |
| ≥ 900 px | Sabit sol sidebar | Geniş çalışma alanı |
| ≥ 1440 px | Sidebar | Daha geniş içerik sınırı |

## Kararlaştırılmamış konular için geçici varsayımlar

Doküman bölüm 19'daki konular ürün kararı değildir; yalnızca çalışır bir temel için aşağıdakiler seçildi ve tek noktadan değiştirilebilir:

- Odak süresi **25 dk**, tek tür mola **5 dk** → `js/config.js`
- Mola otomatik başlamaz; seans bitince kullanıcı "Mola başlat" der.
- Görev tamamlanınca sonraki görev **otomatik seçilmez**. "O anki görev" kuralı: kullanıcının seçtiği aktif görev, yoksa ilk tamamlanmamış görev (`state.js › getCurrentTask`).
- Görevin "tahmini süresi" yalnızca bilgidir; seans süresini değiştirmez.

Henüz **yapılmayanlar** (karar bekliyor): ayarlar, bildirim/ses, istatistik/geçmiş, öncelik/otomatik sıralama, uzun mola döngüsü, görev silme/düzenleme, hesap/senkronizasyon.

