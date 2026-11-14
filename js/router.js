import { PAGES, DEFAULT_PAGE } from './config.js';
import { setCurrentPage } from './state.js';

let current = null; // { id, unmount }
let ctx = null;
const pages = {};

export function registerPage(id, module) { pages[id] = module; }

export function navigate(id) {
  if (location.hash !== `#/${id}`) location.hash = `#/${id}`;
  else render(); // aynı sayfa: yeniden çizim
}

const parse = () => {
  const id = location.hash.replace(/^#\/?/, '');
  return PAGES[id] ? id : DEFAULT_PAGE;
};

function render(initial = false) {
  const id = parse();
  const { view, main, navbar } = ctx;
  try {
    current?.unmount?.(); // olay dinleyicileri/abonelikler temizlenir
  } catch (err) {
    console.error('Router unmount hatası:', err);
  }
  view.replaceChildren();
  view.classList.remove('view--enter');
  void view.offsetWidth; // animasyonu yeniden tetikle
  view.classList.add('view--enter');

  try {
    const unmount = pages[id]?.mount(view);
    current = { id, unmount };
  } catch (err) {
    console.error(`Sayfa (${id}) yüklenirken hata oluştu:`, err);
    view.innerHTML = `
      <div style="background:#18181C; border:1px solid rgba(255,122,26,0.3); border-radius:24px; padding:36px 28px; max-width:540px; margin:40px auto; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.6);">
        <div style="width:52px; height:52px; margin:0 auto 16px; border-radius:16px; background:rgba(255,107,0,0.15); display:grid; place-items:center; color:#FF7A1A;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:28px;height:28px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h2 style="font-size:20px; font-weight:800; color:#FFFFFF; margin-bottom:10px;">Sayfa Yüklenirken Bir Sorun Oluştu</h2>
        <p style="font-size:14px; color:#A0A0AB; line-height:1.55; margin-bottom:24px;">Sayfayı yenileyebilir veya verilerinizi temizleyerek tertemiz bir başlangıç yapabilirsiniz.</p>
        <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
          <button onclick="location.reload()" style="background:#FF7A1A; color:#0A0A0B; border:none; padding:12px 22px; border-radius:14px; font-weight:700; font-size:14px; cursor:pointer;">Sayfayı Yenile</button>
          <button onclick="if(confirm('Tüm verileri sıfırlayıp temiz başlatmak istiyor musunuz?')){localStorage.clear();location.hash='#/home';location.reload();}" style="background:rgba(255,255,255,0.08); color:#FFFFFF; border:1px solid rgba(255,255,255,0.12); padding:12px 22px; border-radius:14px; font-weight:600; font-size:14px; cursor:pointer;">Verileri Sıfırla</button>
        </div>
      </div>
    `;
  }

  setCurrentPage(id);
  navbar?.setActive?.(id);
  const pageLabel = PAGES[id]?.label || 'Subvio';
  document.title = `${pageLabel} · Subvio`;
  if (!initial) { window.scrollTo(0, 0); main?.focus?.({ preventScroll: true }); }
}

export function startRouter(context) {
  ctx = context;
  window.addEventListener('hashchange', () => render());
  render(true);
}

