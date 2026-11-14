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
  const tasks = state.tasks.filter((t) => !t.completed);

  const selectedIds = new Set(tasks.map((t) => t.id));

  // Form kontrolleri
  const startInput = h('input', { class: 'input', type: 'time', value: defaultTimeString() });
  const endInput = h('input', { class: 'input', type: 'time', value: '18:00', readonly: true, title: 'Otomatik hesaplanan rota bitiş saati' });
  const pomoSelect = h('select', { class: 'input' },
    h('option', { value: 'preserve', selected: true }, 'Görevlerin Kendi Süresini Koru (Önerilen)'),
    h('option', { value: '25' }, 'Eksik Süreliler İçin: 25 dk (Klasik Pomodoro)'),
    h('option', { value: '30' }, 'Eksik Süreliler İçin: 30 dk (Geniş Odak)'),
    h('option', { value: '45' }, 'Eksik Süreliler İçin: 45 dk (Derin Odak)'),
    h('option', { value: '15' }, 'Eksik Süreliler İçin: 15 dk (Hızlı Sprint)'),
    h('option', { value: 'force-25' }, 'Tüm Görevleri 25 dk Yap'),
    h('option', { value: 'force-30' }, 'Tüm Görevleri 30 dk Yap'),
    h('option', { value: 'force-45' }, 'Tüm Görevleri 45 dk Yap'));

  const breakSelect = h('select', { class: 'input' },
    h('option', { value: '5', selected: true }, '5 dk Kısa Mola'),
    h('option', { value: '10' }, '10 dk Rahat Mola'),
    h('option', { value: '15' }, '15 dk Uzun Mola'));

  const summaryEl = h('div', { class: 'route-planner-summary' });

  function updateSummary() {
    state = getState();
    const count = selectedIds.size;
    const mode = pomoSelect.value;
    const isForce = mode.startsWith('force-');
    const forcedPomo = isForce ? Number(mode.replace('force-', '')) : null;
    const fallbackPomo = (!isForce && mode !== 'preserve') ? Number(mode) : 25;
    const brk = Number(breakSelect.value) || 5;

    let totalFocusMinutes = 0;
    selectedIds.forEach((id) => {
      const t = state.tasks.find((task) => task.id === id);
      if (!t) return;
      if (isForce) {
        totalFocusMinutes += forcedPomo;
      } else {
        totalFocusMinutes += (Number(t.durationMinutes) > 0 ? t.durationMinutes : fallbackPomo);
      }
    });

    const totalBreakMinutes = Math.max(0, count - 1) * brk;
    const totalMinutes = totalFocusMinutes + totalBreakMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const timeStr = hours > 0 ? `${hours} sa ${mins} dk` : `${mins} dk`;

    // Görev süreleri ve molalar toplanarak gerçekçi bitiş saati hesaplanır
    const startTs = timeInputToTimestamp(startInput.value) ?? Date.now();
    const plannedEndTs = startTs + totalMinutes * 60 * 1000;
    const plannedEndDate = new Date(plannedEndTs);
    const pad = (n) => String(n).padStart(2, '0');
    endInput.value = `${pad(plannedEndDate.getHours())}:${pad(plannedEndDate.getMinutes())}`;

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
    const currentTasks = state.tasks.filter((t) => !t.completed);

    if (!currentTasks.length) {
      taskListEl.replaceChildren(
        h('div', { class: 'route-planner-empty' },
          h('p', { class: 'meta' }, 'Tamamlanmamış görev bulunmuyor.'),
          h('button', {
            class: 'btn btn--secondary btn--sm',
            type: 'button',
            onClick: () => {
              loadDemoData();
              showToast('Demo görevleri yüklendi');
              state = getState();
              state.tasks.filter((t) => !t.completed).forEach((t) => selectedIds.add(t.id));
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

      const mode = pomoSelect.value;
      const isForce = mode.startsWith('force-');
      const displayDuration = isForce
        ? Number(mode.replace('force-', ''))
        : (t.durationMinutes || (mode !== 'preserve' ? Number(mode) : 25));

      const li = h('li', { class: `route-planner-task-item${isChecked ? ' is-selected' : ''}` },
        h('label', { for: `rp-task-${t.id}`, class: 'route-planner-task-label' },
          cb,
          h('div', { class: 'route-planner-task-info' },
            h('span', { class: 'route-planner-task-title' }, t.title)),
          h('span', {
            class: 'badge badge--accent',
            style: 'margin-left: auto; font-weight: 700; font-size: 12px; padding: 3px 10px;',
          }, `${displayDuration} dk`)));
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

  startInput.addEventListener('input', updateSummary);
  pomoSelect.addEventListener('change', () => { renderTasks(); updateSummary(); });
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
          const mode = pomoSelect.value;
          const isForce = mode.startsWith('force-');
          const forcedPomo = isForce ? Number(mode.replace('force-', '')) : null;
          const fallbackPomo = (!isForce && mode !== 'preserve') ? Number(mode) : 25;
          const brk = Number(breakSelect.value) || 5;

          buildAutoRoute({
            taskIds: Array.from(selectedIds),
            startTimestamp: startTs,
            pomodoroMinutes: isForce ? forcedPomo : fallbackPomo,
            breakMinutes: brk,
            overrideCustomDurations: isForce,
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
