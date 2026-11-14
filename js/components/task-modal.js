import { h } from '../utils/dom.js';
import { icon } from './icons.js';
import { addTask, updateTask, deleteTask } from '../state.js';
import { showToast } from './toast.js';
import { timeInputToTimestamp, formatHM } from '../utils/time.js';

let dialog = null;
let form = null;
let fields = null;
let editingTaskId = null;
let titleEl = null;
let submitBtn = null;
let deleteBtn = null;

function getCurrentTimeString() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function syncEndTimeFromDuration() {
  if (!fields) return;
  const startVal = fields.start.value;
  const durVal = parseInt(fields.duration.value, 10);
  if (!startVal || isNaN(durVal) || durVal <= 0) return;
  const [sh, sm] = startVal.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm)) return;
  const totalMin = sh * 60 + sm + durVal;
  const eh = Math.floor(totalMin / 60) % 24;
  const em = totalMin % 60;
  fields.end.value = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}

function syncDurationFromTimes() {
  if (!fields) return;
  const startVal = fields.start.value;
  const endVal = fields.end.value;
  if (!startVal || !endVal) return;
  const [sh, sm] = startVal.split(':').map(Number);
  const [eh, em] = endVal.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return;
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60; // Gece yarısını aşan durumlar
  if (diff > 0 && diff <= 600) {
    fields.duration.value = diff;
  }
}

function close() {
  if (!dialog) return;
  try {
    if (dialog.open) dialog.close();
  } catch (err) {
    dialog.removeAttribute('open');
  }
  document.body.classList.remove('is-modal-open');
}

/** Native <dialog>: odak tuzağı, ESC ve arka plan etkileşim engeli */
function build() {
  const field = (id, label, control, hint) =>
    h('div', { class: 'field' },
      h('label', { class: 'field__label', for: id }, label, hint ? h('small', {}, ` ${hint}`) : null),
      control,
      h('p', { class: 'field__error', id: `${id}-error` }));

  fields = {
    title: h('input', {
      class: 'input',
      id: 'task-title',
      name: 'title',
      type: 'text',
      maxlength: 120,
      autocomplete: 'off',
      placeholder: 'Örn. Rapor taslağını bitir',
      required: true,
      'aria-describedby': 'task-title-error',
    }),
    description: h('textarea', {
      class: 'input',
      id: 'task-description',
      name: 'description',
      maxlength: 500,
      rows: 2,
      placeholder: 'Kısa not (isteğe bağlı)',
    }),
    duration: h('input', {
      class: 'input',
      id: 'task-duration',
      name: 'duration',
      type: 'number',
      inputmode: 'numeric',
      min: 1,
      max: 600,
      step: 1,
      placeholder: 'Örn. 25',
      'aria-describedby': 'task-duration-error',
    }),
    start: h('input', {
      class: 'input',
      id: 'task-start',
      name: 'start',
      type: 'time',
    }),
    end: h('input', {
      class: 'input',
      id: 'task-end',
      name: 'end',
      type: 'time',
      'aria-describedby': 'task-end-error',
    }),
  };

  // Dinamik Zaman Senkronizasyonu
  fields.duration.addEventListener('input', syncEndTimeFromDuration);
  fields.start.addEventListener('input', () => {
    if (fields.duration.value) syncEndTimeFromDuration();
    else if (fields.end.value) syncDurationFromTimes();
  });
  fields.end.addEventListener('input', () => {
    syncDurationFromTimes();
  });

  // Hızlı Süre Seçim Çipleri
  const durationPresets = [15, 25, 45, 60].map((mins) =>
    h('button', {
      class: 'task-preset-chip',
      type: 'button',
      onClick: () => {
        fields.duration.value = mins;
        if (!fields.start.value) fields.start.value = getCurrentTimeString();
        syncEndTimeFromDuration();
      },
    }, `${mins} dk`));

  titleEl = h('h2', { id: 'task-modal-title' }, 'Yeni görev');
  submitBtn = h('button', { class: 'btn btn--primary', type: 'submit' }, 'Kaydet');
  deleteBtn = h('button', {
    class: 'btn btn--ghost',
    type: 'button',
    style: 'color: var(--color-danger); margin-right: auto;',
    onClick: onDelete,
  }, icon('trash'), 'Sil');

  const closeBtn = h('button', {
    class: 'icon-btn',
    type: 'button',
    'aria-label': 'Kapat',
    title: 'Kapat',
    'data-action': 'close',
    onClick: (e) => {
      e.preventDefault();
      e.stopPropagation();
      close();
    },
  }, icon('x'));

  const cancelBtn = h('button', {
    class: 'btn btn--ghost',
    type: 'button',
    'data-action': 'close',
    onClick: (e) => {
      e.preventDefault();
      e.stopPropagation();
      close();
    },
  }, 'İptal');

  // Yerleşim:
  // 1. Görev adı
  // 2. Açıklama
  // 3. Tahmini süre (saat girişlerinin orta üstünde) + Hızlı çipleri
  // 4. Başlangıç ve Bitiş saatleri (yan yana)
  form = h('form', { class: 'modal__panel', novalidate: true, method: 'dialog' },
    h('header', { class: 'modal__header' },
      titleEl,
      closeBtn),
    h('div', { class: 'modal__body' },
      field('task-title', 'Görev adı', fields.title),
      field('task-description', 'Açıklama', fields.description, '(isteğe bağlı)'),
      h('div', { class: 'task-duration-field' },
        field('task-duration', 'Tahmini Süre', fields.duration, '(dakika)'),
        h('div', { class: 'task-preset-chips' }, durationPresets)),
      h('div', { class: 'task-time-row' },
        field('task-start', 'Başlangıç Saati', fields.start),
        field('task-end', 'Bitiş Saati', fields.end))),
    h('footer', { class: 'modal__footer' },
      deleteBtn,
      cancelBtn,
      submitBtn));

  dialog = h('dialog', { class: 'modal', 'aria-labelledby': 'task-modal-title' }, form);
  document.body.append(dialog);

  form.addEventListener('submit', onSubmit);

  // Doğrudan tıklama ve backdrop kontrolü
  dialog.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="close"]')) {
      e.preventDefault();
      close();
      return;
    }
    if (e.target !== dialog || e.detail === 0) return;
    const rect = dialog.getBoundingClientRect();
    const isInDialog = (
      rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX && e.clientX <= rect.left + rect.width
    );
    if (!isInDialog) {
      close();
    }
  });

  dialog.addEventListener('cancel', () => {
    close();
  });

  dialog.addEventListener('close', () => {
    document.body.classList.remove('is-modal-open');
    form.reset();
    clearErrors();
    editingTaskId = null;
  });
}

function setError(input, message) {
  const err = document.getElementById(`${input.id}-error`);
  if (err) err.textContent = message;
  if (message) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
}

function clearErrors() { Object.values(fields).forEach((i) => setError(i, '')); }

function onDelete() {
  if (!editingTaskId) return;
  if (window.confirm('Bu görevi silmek istediğine emin misin?')) {
    deleteTask(editingTaskId);
    close();
    showToast('Görev silindi', { type: 'info' });
  }
}

function onSubmit(event) {
  event.preventDefault();
  clearErrors();

  const title = fields.title.value.trim();
  const durationRaw = fields.duration.value.trim();
  const start = timeInputToTimestamp(fields.start.value);
  const end = timeInputToTimestamp(fields.end.value);
  let firstInvalid = null;
  const fail = (input, msg) => { setError(input, msg); firstInvalid ??= input; };

  if (!title) fail(fields.title, 'Görev adı boş olamaz.');
  let durationMinutes = null;
  if (durationRaw) {
    const n = Number(durationRaw);
    if (!Number.isInteger(n) || n < 1 || n > 600) fail(fields.duration, '1–600 arası tam sayı girin.');
    else durationMinutes = n;
  }
  if (start != null && end != null && end <= start) fail(fields.end, 'Bitiş, başlangıçtan sonra olmalı.');

  if (firstInvalid) { firstInvalid.focus(); return; }

  if (editingTaskId) {
    updateTask(editingTaskId, {
      title,
      description: fields.description.value,
      durationMinutes,
      scheduledStart: start,
      scheduledEnd: end,
    });
    close();
    showToast('Görev güncellendi');
  } else {
    addTask({
      title,
      description: fields.description.value,
      durationMinutes,
      scheduledStart: start,
      scheduledEnd: end,
    });
    close();
    showToast('Görev eklendi');
  }
}

export function openTaskModal(taskToEdit = null) {
  if (!dialog) build();
  if (dialog.open) return;

  const isTask = Boolean(taskToEdit && typeof taskToEdit === 'object' && ('title' in taskToEdit || 'id' in taskToEdit));
  const task = isTask ? taskToEdit : null;

  editingTaskId = task?.id ?? null;
  if (task) {
    titleEl.textContent = 'Görevi düzenle';
    submitBtn.textContent = 'Güncelle';
    deleteBtn.style.display = 'inline-flex';
    fields.title.value = task.title ?? '';
    fields.description.value = task.description ?? '';
    fields.duration.value = task.durationMinutes ?? '';
    fields.start.value = task.scheduledStart ? formatHM(task.scheduledStart) : '';
    fields.end.value = task.scheduledEnd ? formatHM(task.scheduledEnd) : '';
  } else {
    titleEl.textContent = 'Yeni görev';
    submitBtn.textContent = 'Kaydet';
    deleteBtn.style.display = 'none';
    form.reset();

    // Kullanıcının isteği: Başlangıç vaktine anlık saati yaz
    const nowTime = getCurrentTimeString();
    fields.start.value = nowTime;
    fields.duration.value = '';
    fields.end.value = '';
  }

  document.body.classList.add('is-modal-open');
  dialog.showModal();
  fields.title.focus();
}
