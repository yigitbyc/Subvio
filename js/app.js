import { initState, isFirstVisit } from './state.js';
import { initTimerEngine } from './timer.js';
import { createNavbar } from './components/navbar.js';
import { initToast } from './components/toast.js';
import { openTaskModal } from './components/task-modal.js';
import { openOnboardingModal } from './components/onboarding-modal.js';
import { icon } from './components/icons.js';
import { registerPage, startRouter } from './router.js';
import * as home from './pages/home.js';
import * as route from './pages/route.js';
import * as timer from './pages/timer.js';

function boot() {
  initState();
  initToast(document.getElementById('toast-region'));

  const navbar = createNavbar(document.getElementById('nav'));

  // Bağımsız görev ekleme butonu: navbar'ın parçası değil, her sayfada erişilebilir.
  const fab = document.getElementById('add-task-fab');
  fab.append(icon('plus'));
  fab.addEventListener('click', () => openTaskModal());

  registerPage('home', home);
  registerPage('route', route);
  registerPage('timer', timer);

  initTimerEngine();
  startRouter({ view: document.getElementById('view'), main: document.getElementById('main'), navbar });

  // İlk defa gelen kullanıcı için karşılama ve isim sorma penceresi (yalnızca ana sayfada)
  const currentHash = location.hash;
  const isHome = !currentHash || currentHash === '#/' || currentHash === '#/home';
  if (isFirstVisit() && isHome) {
    setTimeout(() => {
      openOnboardingModal();
    }, 200);
  }

  // Erişilebilirlik ve üretkenlik için klavye kısayolları
  window.addEventListener('keydown', (e) => {
    const isEditing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
    if (isEditing) return;

    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      openTaskModal();
    } else if (e.key === '1') {
      location.hash = '#/home';
    } else if (e.key === '2') {
      location.hash = '#/route';
    } else if (e.key === '3') {
      location.hash = '#/timer';
    }
  });
}

try {
  boot();
} catch (err) {
  console.error('Subvio başlatma hatası:', err);
  const root = document.getElementById('view') || document.body;
  root.innerHTML = `
    <div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0A0A0B;color:#fff;font-family:sans-serif;padding:24px;z-index:999999;">
      <div style="background:#18181C;border:1px solid #FF7A1A;border-radius:24px;padding:32px;max-width:480px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.8);">
        <h2 style="font-size:20px;font-weight:700;margin-bottom:12px;color:#FF7A1A;">Subvio Başlatılamadı</h2>
        <p style="color:#A0A0AB;font-size:14px;line-height:1.6;margin-bottom:20px;">Önceki oturum verileri yüklenirken bir uyumsuzluk oluştu. Verileri sıfırlayarak uygulamayı temiz şekilde başlatabilirsiniz.</p>
        <button onclick="localStorage.clear();location.reload();" style="background:#FF7A1A;color:#0A0A0B;border:none;padding:12px 24px;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;">Verileri Sıfırla ve Başlat</button>
      </div>
    </div>
  `;
}

