import { h } from '../utils/dom.js';
import { icon } from './icons.js';
import { openSettingsModal } from './settings-modal.js';
import { openTaskModal } from './task-modal.js';

/**
 * Ana navigasyon:
 * Tam olarak 3 önemli hedef içerir:
 * 1. Ana Sayfa (home)
 * 2. Günlük Rota (checklist)
 * 3. Odak Zamanlayıcı (calendar)
 *
 * Mobilde (<600px): Ekran altında yatay dock.
 * Masaüstü/Yatayda (>=600px): Sol dikey yüzen ray.
 */
export function createNavbar(root) {
  // 1. Üst Logo Squircle (Masaüstü dikey ray için)
  const brandSquircle = h('a', {
    class: 'nav__brand-squircle',
    href: '#/home',
    title: 'Orvyn Odak Kokpiti',
    'aria-label': 'Ana Sayfa',
  }, icon('logoSparkle'));

  // 2. Ana Navigasyon Kapsülü (Sadece 3 temel sayfa)
  const links = [
    h('li', { class: 'nav__item' },
      h('a', { class: 'nav__link', href: '#/home', dataset: { page: 'home' }, title: 'Ana Sayfa' },
        icon('home'),
        h('span', { class: 'nav__label' }, 'Ana Sayfa'))),
    h('li', { class: 'nav__item' },
      h('a', { class: 'nav__link', href: '#/route', dataset: { page: 'route' }, title: 'Günlük Rota' },
        icon('checklist'),
        h('span', { class: 'nav__label' }, 'Rota'))),
    h('li', { class: 'nav__item' },
      h('a', { class: 'nav__link', href: '#/timer', dataset: { page: 'timer' }, title: 'Odak Zamanlayıcı' },
        icon('calendar'),
        h('span', { class: 'nav__label' }, 'Zamanlayıcı'))),
  ];

  const mainCapsule = h('ul', { class: 'nav__list nav__capsule' }, links);

  // 3. Alt Araç Kapsülü (Masaüstü için: Ayarlar + Hızlı Eylem)
  const bottomCapsule = h('div', { class: 'nav__bottom-capsule' },
    h('button', {
      class: 'nav__action-btn',
      type: 'button',
      id: 'rail-btn-settings',
      title: 'Ayarlar',
      'aria-label': 'Ayarlar',
      onClick: openSettingsModal,
    }, icon('hexNut')),
    h('button', {
      class: 'nav__action-btn',
      type: 'button',
      id: 'rail-btn-action',
      title: 'Yeni Görev Ekle',
      'aria-label': 'Yeni Görev Ekle',
      onClick: () => openTaskModal(),
    }, icon('exitArrow')));

  root.replaceChildren(brandSquircle, mainCapsule, bottomCapsule);

  return {
    setActive(pageId) {
      root.querySelectorAll('.nav__link').forEach((a) => {
        if (a.dataset.page === pageId) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });
    },
  };
}
