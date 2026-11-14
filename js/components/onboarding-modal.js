import { h } from '../utils/dom.js';
import { icon } from './icons.js';
import { getState, completeOnboarding } from '../state.js';
import { showToast } from './toast.js';

let dialog = null;

/**
 * İlk defa gelen kullanıcılar için karşılama ve isim sorma penceresi.
 */
export function openOnboardingModal() {
  if (dialog?.open) return;

  const currentName = getState()?.profile?.name || '';

  const nameInput = h('input', {
    class: 'input',
    id: 'onboarding-user-name',
    type: 'text',
    value: currentName && currentName !== 'Odak Yolcusu' && currentName !== 'Mert' ? currentName : '',
    placeholder: 'Örn. Yiğit, Melisa, Mert...',
    autocomplete: 'name',
    required: true,
  });

  const submitBtn = h('button', {
    class: 'btn btn--primary btn--lg',
    type: 'submit',
    style: 'width: 100%; justify-content: center; font-size: 15px; font-weight: 700; padding: 14px 20px;',
  }, icon('sparkles'), 'Yolculuğa Başla');

  const close = () => {
    if (!dialog) return;
    try {
      if (dialog.open) dialog.close();
    } catch (e) {
      dialog.removeAttribute('open');
    }
    document.body.classList.remove('is-modal-open');
    dialog.remove();
    dialog = null;
  };

  const closeBtn = h('button', {
    class: 'icon-btn',
    type: 'button',
    style: 'position: absolute; top: 16px; right: 16px; z-index: 10;',
    'aria-label': 'Kapat',
    title: 'Kapat',
    onClick: () => {
      completeOnboarding('Odak Yolcusu');
      close();
    },
  }, icon('x'));

  const form = h('form', {
    class: 'onboarding-form',
    onSubmit: (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.focus();
        showToast('Lütfen adınızı girin', { type: 'warn' });
        return;
      }
      completeOnboarding(name);
      showToast(`Hoş geldiniz, ${name}! Rota hazır.`);
      close();
    },
  },
    h('div', { class: 'field', style: 'margin-bottom: var(--space-4); text-align: left;' },
      h('label', { class: 'field__label', for: 'onboarding-user-name', style: 'font-weight: 650; color: #FFFFFF;' }, 'Görünen İsim'),
      nameInput),
    submitBtn);

  const panel = h('div', {
    class: 'modal__panel onboarding-panel',
    role: 'document',
    style: 'position: relative; max-width: 440px; text-align: center; padding: 32px 28px; gap: 20px; border-radius: 24px;',
  },
    closeBtn,
    h('div', { class: 'onboarding-logo-wrap' },
      h('img', {
        src: 'assets/subvio-logo.png',
        alt: 'Subvio Logo',
        style: 'width: 68px; height: 68px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.6), 0 0 24px rgba(255,122,26,0.3); display: inline-block;',
      })),
    h('div', { style: 'display: flex; flex-direction: column; gap: 8px;' },
      h('h2', { style: 'font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.02em;' }, "Subvio'ya Hoş Geldiniz"),
      h('p', { class: 'meta', style: 'font-size: 13.5px; line-height: 1.55; color: var(--color-text-secondary); margin: 0;' },
        'Odak kokpitinizi kişiselleştirmek için lütfen adınızı girin. İsminiz profilinizde ve karşılama ekranında görünecektir.')),
    form);

  dialog = h('dialog', { class: 'modal onboarding-modal', 'aria-labelledby': 'onboarding-title' }, panel);
  document.body.append(dialog);

  // Dışına tıklama ile kapatma (klavye / programatik tıklamalarda e.detail === 0 olur)
  dialog.addEventListener('click', (e) => {
    if (e.target !== dialog || e.detail === 0) return;
    const rect = dialog.getBoundingClientRect();
    const isInDialog = (
      rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX && e.clientX <= rect.left + rect.width
    );
    if (!isInDialog) {
      completeOnboarding('Odak Yolcusu');
      close();
    }
  });

  dialog.addEventListener('cancel', () => {
    completeOnboarding('Odak Yolcusu');
    close();
  });

  dialog.addEventListener('close', () => {
    document.body.classList.remove('is-modal-open');
  });

  document.body.classList.add('is-modal-open');
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');

  setTimeout(() => nameInput.focus(), 100);
}

