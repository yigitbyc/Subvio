import { initState } from './state.js';
import { initTimerEngine } from './timer.js';
import { createNavbar } from './components/navbar.js';
import { initToast } from './components/toast.js';
import { openTaskModal } from './components/task-modal.js';
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

boot();

