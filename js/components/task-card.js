import { h } from '../utils/dom.js';
import { icon } from './icons.js';
import { formatMinutes, formatSchedule } from '../utils/time.js';

/** Görev durumu: yalnızca renkle değil metin + ikonla anlatılır. */
export function taskStatus(task, state) {
  const { timer } = state;
  if (task.completed) return { key: 'done', label: 'Tamamlandı', icon: 'check', cls: 'badge--success' };
  if (timer.mode === 'focus' && timer.taskId === task.id && ['running', 'paused'].includes(timer.status)) {
    return { key: 'focus', label: timer.status === 'running' ? 'Odakta' : 'Duraklatıldı', icon: 'navigation', cls: 'badge--accent' };
  }
  if (state.activeTaskId === task.id) return { key: 'active', label: 'Aktif', icon: 'target', cls: 'badge--accent' };
  return { key: 'queued', label: 'Sırada', icon: 'clock', cls: '' };
}

function metaItems(task) {
  const schedule = formatSchedule(task.scheduledStart, task.scheduledEnd);
  const items = [];
  if (schedule) items.push(h('span', { class: 'meta__item' }, icon('clock'), schedule));
  if (task.durationMinutes) items.push(h('span', { class: 'meta__item' }, icon('flag'), `Tahmini ${formatMinutes(task.durationMinutes)}`));
  return items;
}

/** Günlük Rota'nın en üstündeki büyük "o anki görev" kartı. */
export function createCurrentTaskCard({ task, state, onFocus, onToggle, onEdit, onDelete }) {
  const status = taskStatus(task, state);
  const meta = metaItems(task);
  const schedule = formatSchedule(task.scheduledStart, task.scheduledEnd);

  return h('article', { class: `current-task current-task--premium${task.completed ? ' is-done' : ''}`, 'aria-label': 'O anki görev' },
    h('div', { class: 'current-task__ambient' }),
    h('div', { class: 'current-task__top' },
      h('div', { style: 'display: flex; align-items: center; gap: var(--space-2);' },
        h('span', { class: 'badge badge--accent' }, icon('navigation'), 'Rota Lideri'),
        h('span', { class: `badge ${status.cls}` }, icon(status.icon), status.label)),
      h('div', { style: 'display: flex; align-items: center; gap: var(--space-2);' },
        onEdit ? h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Görevi düzenle', title: 'Düzenle', onClick: () => onEdit(task) }, icon('edit')) : null,
        onDelete ? h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Görevi sil', title: 'Sil', style: 'color: var(--color-danger);', onClick: () => onDelete(task.id) }, icon('trash')) : null)),
    h('div', { class: 'current-task__body' },
      h('h2', { class: 'current-task__title' }, task.title),
      task.description ? h('p', { class: 'current-task__desc' }, task.description) : null),
    meta.length ? h('div', { class: 'meta current-task__meta' }, meta) : null,
    h('div', { class: 'current-task__route-preview' },
      h('div', { class: 'current-task__route-badge' }, icon('mapPin'), schedule ? `Zamanlı Durak: ${schedule}` : 'Odaklanmaya Hazır Rota Durağı')),
    h('div', { class: 'current-task__actions' },
      task.completed
        ? h('button', { class: 'btn btn--secondary btn--lg', type: 'button', onClick: () => onToggle(task.id) }, icon('reset'), 'Tekrar Aç')
        : [
          h('button', { class: 'btn btn--primary btn--lg', type: 'button', dataset: { key: 'focus-current' }, onClick: () => onFocus(task.id) }, icon('target'), 'Rotayı Başlat ve Odaklan'),
          h('button', { class: 'btn btn--secondary btn--lg', type: 'button', dataset: { key: 'complete-current' }, onClick: () => onToggle(task.id) }, icon('check'), 'Tamamla'),
        ]));
}

/** Küçük to-do listesindeki kompakt satır. */
export function createTaskRow({ task, state, isCurrent, justToggled, onToggle, onSelect, onFocus, onEdit, onDelete }) {
  const sub = [formatSchedule(task.scheduledStart, task.scheduledEnd), task.durationMinutes ? formatMinutes(task.durationMinutes) : null].filter(Boolean).join(' · ');
  const status = taskStatus(task, state);
  const checkbox = h('button', {
    class: `checkbox${justToggled && task.completed ? ' is-pop' : ''}`, type: 'button', role: 'checkbox',
    'aria-checked': String(task.completed), 'aria-label': `${task.title} tamamlandı`,
    dataset: { key: `toggle-${task.id}` }, onClick: () => onToggle(task.id),
  }, h('span', { class: 'checkbox__box' }, icon('check')));

  return h('li', { class: `task-row${task.completed ? ' is-done' : ''}${isCurrent ? ' is-current' : ''}` },
    checkbox,
    h('button', {
      class: 'task-row__main', type: 'button', title: task.title, dataset: { key: `select-${task.id}` },
      'aria-label': task.completed ? `${task.title} (tamamlandı)` : `${task.title}: o anki görev yap`,
      'aria-current': isCurrent ? 'true' : null,
      onClick: () => onSelect(task.id),
    },
      h('span', { class: 'task-row__title' }, task.title),
      (sub || status.key === 'focus') ? h('span', { class: 'task-row__sub' }, [status.key === 'focus' ? status.label : null, sub].filter(Boolean).join(' · ')) : null),
    task.completed ? null
      : h('button', { class: 'icon-btn', type: 'button', 'aria-label': `${task.title} için odaklan`, dataset: { key: `focus-${task.id}` }, onClick: () => onFocus(task.id) }, icon('target')),
    onEdit ? h('button', { class: 'icon-btn', type: 'button', 'aria-label': `${task.title} düzenle`, onClick: () => onEdit(task) }, icon('edit')) : null,
    onDelete ? h('button', { class: 'icon-btn', type: 'button', 'aria-label': `${task.title} sil`, style: 'color: var(--color-danger);', onClick: () => onDelete(task.id) }, icon('trash')) : null);
}

/** Yan yana duran modern görev kartı (Side-by-side Grid Card). */
export function createTaskGridCard({ task, state, isCurrent, justToggled, onToggle, onSelect, onFocus, onEdit, onDelete, index }) {
  const schedule = formatSchedule(task.scheduledStart, task.scheduledEnd);
  const status = taskStatus(task, state);
  const durationText = task.durationMinutes ? formatMinutes(task.durationMinutes) : '25 dk';

  const checkbox = h('button', {
    class: `checkbox${justToggled && task.completed ? ' is-pop' : ''}`,
    type: 'button',
    role: 'checkbox',
    'aria-checked': String(task.completed),
    'aria-label': `${task.title} tamamlandı`,
    dataset: { key: `toggle-${task.id}` },
    onClick: (e) => {
      e.stopPropagation();
      onToggle(task.id);
    },
  }, h('span', { class: 'checkbox__box' }, icon('check')));

  // Üst Başlık Şeridi: Checkbox + Rozet
  let badgeEl;
  if (task.completed) {
    badgeEl = h('span', { class: 'badge badge--success' }, icon('check'), 'Bitti');
  } else if (isCurrent) {
    badgeEl = h('span', { class: 'badge badge--accent' }, icon('target'), 'Aktif');
  } else {
    badgeEl = h('span', { class: 'task-card-item__pill' }, icon('clock'), durationText);
  }

  const topBar = h('div', { class: 'task-card-item__top' },
    checkbox,
    badgeEl);

  // Gövde Alanı (Tıklanabilir)
  const body = h('div', {
    class: 'task-card-item__body',
    onClick: () => onSelect(task.id),
    role: 'button',
    tabindex: '0',
    title: `${task.title} (Aktif durak yap)`,
  },
    h('h3', { class: 'task-card-item__title' }, task.title),
    schedule ? h('p', { class: 'task-card-item__schedule' }, icon('mapPin'), schedule) : null,
    task.description ? h('p', { class: 'task-card-item__desc' }, task.description) : null);

  // Alt Eylem Şeridi: Odaklan Butonu + Düzenle/Sil Araçları
  const focusBtn = !task.completed
    ? h('button', {
      class: 'task-card-item__focus-btn',
      type: 'button',
      title: 'Bu durağa odaklan',
      onClick: (e) => {
        e.stopPropagation();
        onFocus(task.id);
      },
    }, icon('target'), 'Odaklan')
    : h('span', { class: 'task-card-item__done-label' }, icon('check'), 'Tamamlandı');

  const actionButtons = h('div', { class: 'task-card-item__tools' },
    onEdit ? h('button', {
      class: 'icon-btn icon-btn--xs',
      type: 'button',
      title: 'Düzenle',
      'aria-label': `${task.title} düzenle`,
      onClick: (e) => {
        e.stopPropagation();
        onEdit(task);
      },
    }, icon('edit')) : null,
    onDelete ? h('button', {
      class: 'icon-btn icon-btn--xs',
      type: 'button',
      title: 'Sil',
      'aria-label': `${task.title} sil`,
      style: 'color: var(--color-danger);',
      onClick: (e) => {
        e.stopPropagation();
        onDelete(task.id);
      },
    }, icon('trash')) : null);

  const footer = h('div', { class: 'task-card-item__footer' },
    focusBtn,
    actionButtons);

  return h('article', {
    class: `task-card-item${task.completed ? ' is-done' : ''}${isCurrent ? ' is-current' : ''}`,
    dataset: { id: task.id },
  },
    topBar,
    body,
    footer);
}

