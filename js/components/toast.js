import { h } from '../utils/dom.js';
import { icon } from './icons.js';

let region = null;

export function initToast(el) { region = el; }

/** Kısa geri bildirim. type: 'success' | 'info' */
export function showToast(message, { type = 'success', duration = 3000 } = {}) {
  if (!region) return;
  const toast = h('div', { class: `toast toast--${type}` }, icon(type === 'success' ? 'check' : 'target'), h('span', {}, message));
  region.append(toast);
  setTimeout(() => {
    toast.classList.add('toast--leaving');
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

