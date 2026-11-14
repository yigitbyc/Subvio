import { h } from '../utils/dom.js';
import { icon } from './icons.js';
import { getState, updateProfile, updateTimerSettings, loadDemoData, resetAllData } from '../state.js';
import { showToast } from './toast.js';

let dialog = null;

function build() {
  const close = () => {
    if (!dialog) return;
    try {
      if (dialog.open) dialog.close();
    } catch (e) {
      dialog.removeAttribute('open');
    }
    document.body.classList.remove('is-modal-open');
  };

  const state = getState();
  const currentFocus = state?.timerSettings?.focusMinutes || 25;
  const currentBreak = state?.timerSettings?.breakMinutes || 5;

  const focusInput = h('input', {
    class: 'input',
    id: 'settings-focus-minutes',
    type: 'number',
    min: '1',
    max: '180',
    value: String(currentFocus),
    style: 'text-align: center; font-weight: 700; font-size: 15px;',
    onInput: (e) => {
      const val = Math.max(1, Math.min(180, Number(e.target.value) || 25));
      updateTimerSettings({ focusMinutes: val });
      updateSummaryBadge();
    },
  });

  const breakInput = h('input', {
    class: 'input',
    id: 'settings-break-minutes',
    type: 'number',
    min: '1',
    max: '60',
    value: String(currentBreak),
    style: 'text-align: center; font-weight: 700; font-size: 15px;',
    onInput: (e) => {
      const val = Math.max(1, Math.min(60, Number(e.target.value) || 5));
      updateTimerSettings({ breakMinutes: val });
      updateSummaryBadge();
    },
  });

  const focusPresetValues = [15, 20, 25, 45, 60];
  const breakPresetValues = [5, 10, 15, 20];

  const focusChips = focusPresetValues.map((mins) => h('button', {
    class: 'task-preset-chip',
    type: 'button',
    onClick: () => {
      focusInput.value = String(mins);
      updateTimerSettings({ focusMinutes: mins });
      updateSummaryBadge();
    },
  }, `${mins} dk`));

  const breakChips = breakPresetValues.map((mins) => h('button', {
    class: 'task-preset-chip',
    type: 'button',
    onClick: () => {
      breakInput.value = String(mins);
      updateTimerSettings({ breakMinutes: mins });
      updateSummaryBadge();
    },
  }, `${mins} dk`));

  const summaryBadge = h('div', { style: 'display: flex; gap: var(--space-3); flex-wrap: wrap; margin-top: 6px;' });

  function updateSummaryBadge() {
    const s = getState()?.timerSettings || { focusMinutes: 25, breakMinutes: 5 };
    summaryBadge.replaceChildren(
      h('span', { class: 'badge badge--accent' }, `Odak: ${s.focusMinutes} dk`),
      h('span', { class: 'badge' }, `Mola: ${s.breakMinutes} dk`));
  }
  updateSummaryBadge();

  const panel = h('div', { class: 'modal__panel', role: 'document' },
    h('header', { class: 'modal__header' },
      h('div', { style: 'display: flex; align-items: center; gap: var(--space-3);' },
        h('span', { class: 'nav__brand-mark', style: 'width: 32px; height: 32px;' }, icon('settings')),
        h('h2', { id: 'settings-modal-title' }, 'Ayarlar')),
      h('button', {
        class: 'icon-btn',
        type: 'button',
        'aria-label': 'Kapat',
        title: 'Kapat',
        'data-action': 'close',
        onClick: (e) => { e.preventDefault(); e.stopPropagation(); close(); },
      }, icon('x'))),
    h('div', { class: 'modal__body', style: 'gap: var(--space-5);' },
      // Profil Ayarları
      h('section', { class: 'card card--elevated', style: 'padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3);' },
        h('h3', { style: 'font-size: var(--text-md); font-weight: 650; display: flex; align-items: center; gap: 8px;' }, icon('user'), 'Kullanıcı Profili'),
        h('div', { class: 'field' },
          h('label', { class: 'field__label', for: 'settings-user-name' }, 'Görünen İsim'),
          h('input', {
            class: 'input',
            id: 'settings-user-name',
            type: 'text',
            value: getState()?.profile?.name || '',
            placeholder: 'Adınız',
            onInput: (e) => {
              const val = e.target.value.trim();
              if (val) updateProfile({ name: val });
            },
          }))),

      // Pomodoro süreleri ayarlanabilir alan
      h('section', { class: 'card card--elevated', style: 'padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3);' },
        h('h3', { style: 'font-size: var(--text-md); font-weight: 650; display: flex; align-items: center; gap: 8px;' }, icon('clock'), 'Pomodoro Seans Süreleri'),
        h('p', { class: 'meta', style: 'line-height: 1.5;' }, 'Varsayılan odaklanma ve mola sürelerinizi ayarlayın:'),
        h('div', { class: 'task-time-row', style: 'margin-top: 4px;' },
          h('div', { class: 'field' },
            h('label', { class: 'field__label', for: 'settings-focus-minutes' }, 'Odak Süresi (dk)'),
            focusInput,
            h('div', { class: 'task-preset-chips', style: 'flex-wrap: wrap; justify-content: flex-start;' }, ...focusChips)),
          h('div', { class: 'field' },
            h('label', { class: 'field__label', for: 'settings-break-minutes' }, 'Mola Süresi (dk)'),
            breakInput,
            h('div', { class: 'task-preset-chips', style: 'flex-wrap: wrap; justify-content: flex-start;' }, ...breakChips))),
        summaryBadge),

      // Demo ve Test Verisi
      h('section', { class: 'card card--elevated', style: 'padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3);' },
        h('h3', { style: 'font-size: var(--text-md); font-weight: 650; display: flex; align-items: center; gap: 8px;' }, icon('sparkles'), 'Demo ve Test Verisi'),
        h('p', { class: 'meta', style: 'line-height: 1.5;' }, 'Subvio\'yu dolu bir günlük rota ve görev listesiyle anında deneyimlemek için örnek verileri yükleyin.'),
        h('div', { style: 'display: flex; gap: var(--space-3); flex-wrap: wrap;' },
          h('button', {
            class: 'btn btn--secondary btn--sm',
            type: 'button',
            onClick: () => {
              loadDemoData();
              dialog.close();
              showToast('Demo görevleri ve rota yüklendi');
            },
          }, icon('sparkles'), 'Demo Verilerini Yükle'),
          h('button', {
            class: 'btn btn--ghost btn--sm',
            type: 'button',
            style: 'color: var(--color-danger);',
            onClick: () => {
              if (window.confirm('Tüm görevler ve veriler silinsin mi?')) {
                resetAllData();
                dialog.close();
                showToast('Tüm veriler temizlendi', { type: 'info' });
              }
            },
          }, icon('trash'), 'Verileri Sıfırla'))),

      // Uygulama Hakkında
      h('section', { style: 'display: flex; flex-direction: column; gap: 4px; padding: var(--space-2);' },
        h('span', { style: 'font-size: var(--text-xs); color: var(--color-text-muted);' }, 'Subvio · v1.0'),
        h('span', { style: 'font-size: var(--text-xs); color: var(--color-text-muted);' }, 'Navigasyon tabanlı odaklanma ve günlük rota yönetimi.'))),
    h('footer', { class: 'modal__footer' },
      h('button', { class: 'btn btn--primary', type: 'button', 'data-action': 'close', onClick: () => close() }, 'Tamam')));

  dialog = h('dialog', { class: 'modal', 'aria-labelledby': 'settings-modal-title' }, panel);
  document.body.append(dialog);

  // Dışına tıklamayla kapatma
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
}

export function openSettingsModal() {
  if (dialog) {
    dialog.remove();
    dialog = null;
  }
  build();
  document.body.classList.add('is-modal-open');
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

