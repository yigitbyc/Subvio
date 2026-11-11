/**
 * Merkezi yapılandırma.
 * Henüz kararlaştırılmamış değerler (doküman bölüm 19) burada tek noktadan yönetilir.
 * Aşağıdaki süreler GEÇİCİ varsayılanlardır; ürün kararı verildiğinde yalnızca burası değişir.
 */
const params = new URLSearchParams(globalThis.location?.search ?? '');

/** Geliştirme/test kolaylığı: ?focusSeconds=10&breakSeconds=5 */
function seconds(name, fallback) {
  const v = Number(params.get(name));
  return Number.isFinite(v) && v >= 1 ? Math.floor(v) : fallback;
}

export const TIMER_CONFIG = Object.freeze({
  durations: Object.freeze({
    focus: seconds('focusSeconds', 25 * 60), // GEÇİCİ varsayılan
    break: seconds('breakSeconds', 5 * 60), //  GEÇİCİ varsayılan (tek tür mola)
  }),
});

export const STORAGE_VERSION = 1;

export const PAGES = Object.freeze({
  home: { id: 'home', label: 'Ana Sayfa', icon: 'home' },
  route: { id: 'route', label: 'Günlük Rota', icon: 'route' },
  timer: { id: 'timer', label: 'Zamanlayıcı', icon: 'navigation' },
});
export const DEFAULT_PAGE = 'home';

