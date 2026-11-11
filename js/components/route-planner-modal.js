import { h } from '../utils/dom.js';
import { icon } from './icons.js';
import { getState, buildAutoRoute, loadDemoData } from '../state.js';
import { showToast } from './toast.js';
import { timeInputToTimestamp } from '../utils/time.js';

let dialog = null;

function defaultTimeString(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const h = date.getHours();
  const m = Math.ceil(date.getMinutes() / 5) * 5;
  const d = new Date(date);
  d.setMinutes(m, 0, 0);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function openRoutePlannerModal() {
  let state = getState();
  let tasks = state.tasks.filter((t) => !t.completed);
  if (!tasks.length) tasks = state.tasks;

  const selectedIds = new Set(tasks.map((t) => t.id));

  // Form kontrolleri
  const startInput = h('input', { class: 'input', type: 'time', value: defaultTimeString() });
  const endInput = h('input', { class: 'input', type: 'time', value: '18:00' });
  const pomoSelect = h('select', { class: 'input' },
    h('option', { value: '25', selected: true }, '25 dk (Klasik Pomodoro)'),
    h('option', { value: '30' }, '30 dk (Geniş Odak)'),
    h('option', { value: '45' }, '45 dk (Derin Odak)'),
    h('option', { value: '50' }, '50 dk (Çift Seans)'),
    h('option', { value: '15' }, '15 dk (Hızlı Sprint)'));

  const breakSelect = h('select', { class: 'input' },
    h('option', { value: '5', selected: true }, '5 dk Kısa Mola'),
    h('option', { value: '10' }, '10 dk Rahat Mola'),
    h('option', { value: '15' }, '15 dk Uzun Mola'));

  const summaryEl = h('div', { class: 'route-planner-summary' });

  function updateSummary() {
    const count = selectedIds.size;
    const pomo = Number(pomoSelect.value);
    const brk = Number(breakSelect.value);
    const totalMinutes = count * pomo + Math.max(0, count - 1) * brk;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const timeStr = hours > 0 ? `${hours} sa ${mins} dk` : `${mins} dk`;
    summaryEl.replaceChildren(
      h('div', { class: 'badge badge--accent' }, icon('route'), `${count} Durak Seçildi`),
      h('span', { class: 'meta__item' }, icon('clock'), `Toplam ${timeStr}`),
      h('span', { class: 'meta__item' }, icon('coffee'), `${Math.max(0, count - 1)} Dinlenme Molası`));
  }

  // Görev seçim listesi
  const taskListEl = h('ul', { class: 'route-planner-tasks' });

  function renderTasks() {
    taskListEl.replaceChildren();
    state = getState();
    let currentTasks = state.tasks.filter((t) => !t.completed);
    if (!currentTasks.length) currentTasks = state.tasks;

    if (!currentTasks.length) {
      taskListEl.replaceChildren(
        h('div', { class: 'route-planner-empty' },
          h('p', { class: 'meta' }, 'Listede henüz görev bulunmuyor.'),
          h('button', {
            class: 'btn btn--secondary btn--sm',
            type: 'button',
            onClick: () => {
              loadDemoData();
              showToast('Demo görevleri yüklendi');
              state = getState();
              state.tasks.forEach((t) => selectedIds.add(t.id));
              renderTasks();
            },
          }, icon('sparkles'), 'Örnek Görevleri Yükle')));
      updateSummary();
      return;
    }

    currentTasks.forEach((t) => {
      const isChecked = selectedIds.has(t.id);
      const cb = h('input', {
        type: 'checkbox',
        id: `rp-task-${t.id}`,
        checked: isChecked,
        onChange: (e) => {
          if (e.target.checked) selectedIds.add(t.id);
          else selectedIds.delete(t.id);
          updateSummary();
        },
      });

      const li = h('li', { class: `route-planner-task-item${isChecked ? ' is-selected' : ''}` },
        h('label', { for: `rp-task-${t.id}`, class: 'route-planner-task-label' },
          cb,
          h('div', { class: 'route-planner-task-info' },
            h('span', { class: 'route-planner-task-title' }, t.title),
            t.durationMinutes ? h('span', { class: 'meta__item' }, `${t.durationMinutes} dk`) : null)));
      taskListEl.append(li);
    });
    updateSummary();
  }

  const selectAllBtn = h('button', {
    class: 'btn btn--ghost btn--sm',
    type: 'button',
    onClick: () => {
      state = getState();
      let currentTasks = state.tasks.filter((t) => !t.completed);
      if (!currentTasks.length) currentTasks = state.tasks;
      if (selectedIds.size === currentTasks.length) selectedIds.clear();
      else currentTasks.forEach((t) => selectedIds.add(t.id));
      renderTasks();
    },
  }, 'Tümünü Seç / Temizle');

  pomoSelect.addEventListener('change', updateSummary);
  breakSelect.addEventListener('change', updateSummary);

  const close = () => {
    if (!dialog) return;
    try {
      if (dialog.open) dialog.close();
    } catch (e) {
      dialog.removeAttribute('open');
    }
    document.body.classList.remove('is-modal-open');
  };

  const panel = h('div', { class: 'modal__panel', role: 'document' },
    h('header', { class: 'modal__header' },
      h('div', { style: 'display: flex; align-items: center; gap: var(--space-3);' },
        h('span', { class: 'nav__brand-mark', style: 'width: 36px; height: 36px; border-radius: var(--radius-md);' }, icon('sparkles')),
        h('div', {},
          h('h2', { id: 'route-planner-title', style: 'font-size: var(--text-lg); font-weight: 700;' }, 'Otomatik Rota Oluşturucu'),
          h('p', { class: 'meta', style: 'font-size: var(--text-xs);' }, 'Günün Pomodoro yolculuğunu akıllıca planla'))),
      h('button', {
        class: 'icon-btn modal__close-btn',
        type: 'button',
        'aria-label': 'Kapat',
        title: 'Kapat',
        'data-action': 'close',
        onClick: (e) => { e.preventDefault(); e.stopPropagation(); close(); },
      }, icon('x'))),
    h('div', { class: 'modal__body' },
      h('p', { class: 'meta', style: 'line-height: 1.5; font-size: var(--text-sm);' },
        'Görevlerini seç, başlama saatini ve Pomodoro seans süresini belirle. Günün rotası molalarıyla birlikte otomatik oluşturulsun.'),

      // Zaman Ayarları
      h('div', { class: 'field-row' },
        h('div', { class: 'field' },
          h('label', { class: 'field__label' }, 'Rota Başlangıç Saati'),
          startInput),
        h('div', { class: 'field' },
          h('label', { class: 'field__label' }, 'Hedef Bitiş Saati'),
          endInput)),

      h('div', { class: 'field-row' },
        h('div', { class: 'field' },
          h('label', { class: 'field__label' }, 'Odak Seansı Süresi'),
          pomoSelect),
        h('div', { class: 'field' },
          h('label', { class: 'field__label' }, 'Mola Süresi'),
          breakSelect)),

      // Görev Listesi
      h('div', { class: 'field', style: 'margin-top: var(--space-1);' },
        h('div', { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2);' },
          h('label', { class: 'field__label', style: 'margin: 0;' }, 'Rotaya Eklenecek Görevler'),
          selectAllBtn),
        taskListEl),

      summaryEl),
    h('footer', { class: 'modal__footer' },
      h('button', {
        class: 'btn btn--ghost',
        type: 'button',
        'data-action': 'close',
        onClick: (e) => { e.preventDefault(); e.stopPropagation(); close(); },
      }, 'İptal'),
      h('button', {
        class: 'btn btn--primary btn--lg',
        type: 'button',
        id: 'btn-submit-auto-route',
        onClick: () => {
          if (!selectedIds.size) {
            showToast('Lütfen rotaya en az bir görev seçin.', { type: 'info' });
            return;
          }

          const startTs = timeInputToTimestamp(startInput.value) ?? Date.now();
          const pomo = Number(pomoSelect.value);
          const brk = Number(breakSelect.value);

          buildAutoRoute({
            taskIds: Array.from(selectedIds),
            startTimestamp: startTs,
            pomodoroMinutes: pomo,
            breakMinutes: brk,
          });

          close();
          showToast(`${selectedIds.size} görev için otomatik rota oluşturuldu!`);
        },
      }, icon('route'), 'Rotayı Oluştur')));

  if (dialog) dialog.remove();
  dialog = h('dialog', { class: 'modal route-planner-modal', 'aria-labelledby': 'route-planner-title' }, panel);
  document.body.append(dialog);

  // Dışına tıklama (backdrop) ile kapatma
  dialog.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="close"]')) {
      e.preventDefault();
      close();
      return;
    }
    const rect = dialog.getBoundingClientRect();
    const isInDialog = (
      rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX && e.clientX <= rect.left + rect.width
    );
    if (!isInDialog) close();
  });

  dialog.addEventListener('cancel', () => { close(); });
  dialog.addEventListener('close', () => { document.body.classList.remove('is-modal-open'); });

  renderTasks();
  document.body.classList.add('is-modal-open');
  dialog.showModal();
}
