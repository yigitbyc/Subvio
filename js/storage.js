/** LocalStorage erişimi tek noktada. Sürümlü zarf: { version, data }. Bozuk veri uygulamayı durdurmaz. */
import { STORAGE_VERSION } from './config.js';

export const KEYS = Object.freeze({
  tasks: 'orvyn:tasks',
  activeTask: 'orvyn:active-task',
  timer: 'orvyn:timer-state',
  profile: 'orvyn:user-profile',
  timerSettings: 'orvyn:timer-settings',
  onboarded: 'orvyn:onboarded',
});

export function read(key) {
  let raw = null;
  try {
    raw = localStorage.getItem(key);
    if (raw == null) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== STORAGE_VERSION) return null;
    return parsed.data ?? null;
  } catch (err) {
    console.warn(`[orvyn] "${key}" okunamadı, varsayılan kullanılacak.`, err);
    // Kullanıcı verisini sessizce yok etme: bozuk ham veriyi yedekle.
    try { if (raw != null) localStorage.setItem(`${key}:corrupt`, raw); } catch { /* yoksay */ }
    return null;
  }
}

export function write(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ version: STORAGE_VERSION, data }));
    return true;
  } catch (err) {
    console.warn(`[orvyn] "${key}" kaydedilemedi.`, err);
    return false;
  }
}

