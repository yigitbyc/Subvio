import { h } from '../utils/dom.js';
import { icon } from '../components/icons.js';
import { getState, subscribe, getCurrentTask, setActiveTask, toggleTask, deleteTask, loadDemoData } from '../state.js';
import { createTaskRow, createTaskGridCard } from '../components/task-card.js';
import { createRouteTimeline } from '../components/route-timeline.js';
import { openTaskModal } from '../components/task-modal.js';
import { openRoutePlannerModal } from '../components/route-planner-modal.js';
import { showToast } from '../components/toast.js';
import { focusTask } from '../actions.js';
import { formatLongDate } from '../utils/date.js';

export function mount(root) {
  const page = h('section', { class: 'page route-page' });
  root.append(page);

  let lastToggledId = null;
  let activeFilter = 'all'; // 'all' | 'pending' | 'done'

  const onToggle = (id) => {
    lastToggledId = id;
    toggleTask(id);
  };

  function render(state) {
    const focusKey = page.contains(document.activeElement) ? document.activeElement.dataset?.key : null;

    const current = getCurrentTask(state);
    const totalTasks = state.tasks.length;
    const pending = state.tasks.filter((t) => !t.completed);
    const done = state.tasks.filter((t) => t.completed);

    const onEdit = (task) => openTaskModal(task);
    const onDelete = (id) => {
      if (window.confirm('Bu görevi silmek istediğine emin misin?')) {
        deleteTask(id);
        showToast('Görev silindi', { type: 'info' });
      }
    };

    const gridCard = (task, idx) => createTaskGridCard({
      task,
      state,
      isCurrent: current?.id === task.id,
      justToggled: lastToggledId === task.id,
      onToggle,
      onSelect: setActiveTask,
      onFocus: focusTask,
      onEdit,
      onDelete,
      index: idx,
    });

    // 1. Üst Kısım: Görevlerin Yan Yana Kartlar Şeklinde Yazdığı Kısım (Durak Kartları)
    let displayedTasks = state.tasks;
    if (activeFilter === 'pending') displayedTasks = pending;
    else if (activeFilter === 'done') displayedTasks = done;

    const filterBtn = (key, label, count) =>
      h('button', {
        class: `route-filter-btn${activeFilter === key ? ' is-active' : ''}`,
        type: 'button',
        onClick: () => {
          activeFilter = key;
          render(getState());
        },
      }, `${label} (${count})`);

    let taskPoolCard = null;
    if (totalTasks > 0) {
      taskPoolCard = h('section', { class: 'card route-tasks-card', 'aria-label': 'Görev kartları' },
        h('div', { class: 'route-tasks-card__head' },
          h('div', { class: 'route-tasks-card__title-wrap' },
            h('span', { class: 'route-tasks-card__icon' }, icon('route')),
            h('div', {},
              h('h2', { class: 'route-tasks-card__title' }, 'Günün Görevleri & Durak Kartları'),
              h('p', { class: 'route-tasks-card__sub' }, `${totalTasks} görevden ${done.length} tanesi tamamlandı`))),
          h('div', { class: 'route-tasks-card__filters' },
            filterBtn('all', 'Tümü', totalTasks),
            filterBtn('pending', 'Kalan', pending.length),
            filterBtn('done', 'Biten', done.length))),
        h('div', { class: 'route-tasks-card__list-wrap' },
          displayedTasks.length
            ? h('div', { class: 'route-tasks-card__grid' }, displayedTasks.map(gridCard))
            : h('p', { class: 'route-tasks-card__empty' }, 'Bu filtrede görev bulunmuyor.')));
    } else {
      taskPoolCard = h('div', { class: 'card route-empty-card' },
        h('div', { class: 'route-empty__icon-wrap' }, icon('sparkles')),
        h('h2', { class: 'route-empty__title' }, 'Bugünün Rotası Henüz Boş'),
        h('p', { class: 'route-empty__text' },
          'Günün duraklarını belirlemek için ilk görevini ekle veya Otomatik Rota Oluştur ile günün planını tek tıkla oluştur.'),
        h('div', { class: 'route-empty__actions' },
          h('button', {
            class: 'btn btn--primary btn--lg',
            type: 'button',
            onClick: openRoutePlannerModal,
          }, icon('sparkles'), 'Otomatik Rota Oluştur'),
          h('button', {
            class: 'btn btn--secondary btn--lg',
            type: 'button',
            onClick: () => openTaskModal(),
          }, icon('plus'), 'Yeni Görev Ekle'),
          h('button', {
            class: 'btn btn--ghost btn--sm',
            type: 'button',
            onClick: () => {
              loadDemoData();
              showToast('Örnek rota verileri yüklendi');
            },
          }, 'Örnek Görevleri Yükle')));
    }

    // 2. Alt Kısım: Sadece Rota Zaman Çizelgesi
    const timeline = totalTasks > 0 ? createRouteTimeline(state.tasks, state) : null;

    // Sayfa Bileşimi:
    // Header -> Üstte Görev Listesi -> Altta Sadece Rota Zaman Çizelgesi
    page.replaceChildren(...[
      h('header', { class: 'page-header route-header' },
        h('div', { class: 'route-header__meta' },
          h('span', { class: 'route-header__date-badge' }, icon('calendar'), formatLongDate()),
          h('span', { class: 'route-header__pill' }, icon('mapPin'), `${totalTasks} Duraklı Seans`)),
        h('div', { class: 'route-header__row' },
          h('div', { class: 'route-header__titles' },
            h('h1', { class: 'route-header__title' }, 'Günlük Rota'),
            h('p', { class: 'page-header__sub' },
              'Günün duraklarını yönet, zaman çizelgeni takip et ve hedeflerine odaklan.')),
          h('div', { class: 'route-header__actions' },
            h('button', {
              class: 'btn btn--primary btn--md',
              type: 'button',
              id: 'btn-open-route-planner',
              title: 'Akıllı Otomatik Rota Planlayıcı',
              onClick: openRoutePlannerModal,
            }, icon('sparkles'), 'Otomatik Rota Oluştur')))),
      taskPoolCard,
      timeline,
    ].filter(Boolean));

    if (focusKey) page.querySelector(`[data-key="${CSS.escape(focusKey)}"]`)?.focus({ preventScroll: true });
    lastToggledId = null;
  }

  const unsubscribe = subscribe(render);
  render(getState());
  return () => unsubscribe();
}
