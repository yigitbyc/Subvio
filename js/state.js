/** Merkezi uygulama durumu: görevler, aktif görev, zamanlayıcı, geçerli sayfa. */
import { TIMER_CONFIG, DEFAULT_PAGE } from './config.js';
import { KEYS, read, write } from './storage.js';

const TIMER_STATUSES = ['idle', 'running', 'paused', 'completed'];
const TIMER_MODES = ['focus', 'break'];

let state = null;
const listeners = new Set();

export function createIdleTimer(mode = 'focus') {
  return {
    status: 'idle',
    mode,
    durationSeconds: TIMER_CONFIG.durations[mode],
    taskId: null,
    startedAt: null, //          çalışan dilimin başlangıç timestamp'i
    elapsedBeforePause: 0, //    önceki dilimlerde biriken süre (ms)
  };
}

/* ---------- Doğrulama (bozuk veriye karşı) ---------- */
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

function sanitizeTask(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string') return null;
  const title = str(raw.title, 120).trim();
  if (!title) return null;
  const now = Date.now();
  return {
    id: raw.id,
    title,
    description: str(raw.description, 500),
    durationMinutes: num(raw.durationMinutes) > 0 ? Math.round(raw.durationMinutes) : null,
    scheduledStart: num(raw.scheduledStart),
    scheduledEnd: num(raw.scheduledEnd),
    completed: raw.completed === true,
    inAutoRoute: raw.inAutoRoute === true,
    createdAt: num(raw.createdAt) ?? now,
    updatedAt: num(raw.updatedAt) ?? now,
  };
}

function sanitizeTimer(raw) {
  if (!raw || typeof raw !== 'object') return createIdleTimer();
  if (!TIMER_STATUSES.includes(raw.status) || !TIMER_MODES.includes(raw.mode)) return createIdleTimer();
  const duration = num(raw.durationSeconds);
  if (!duration || duration <= 0) return createIdleTimer();
  const timer = {
    status: raw.status,
    mode: raw.mode,
    durationSeconds: duration,
    taskId: typeof raw.taskId === 'string' ? raw.taskId : null,
    startedAt: num(raw.startedAt),
    elapsedBeforePause: Math.max(0, num(raw.elapsedBeforePause) ?? 0),
  };
  if (timer.status === 'running' && timer.startedAt == null) return createIdleTimer(timer.mode);
  return timer;
}

const DEFAULT_PROFILE = {
  name: 'Odak Yolcusu',
  title: 'Odak Yolcusu',
  avatar: 'assets/avatars/user.svg',
  onboarded: false,
};

export const DEFAULT_TIMER_SETTINGS = {
  focusMinutes: 25,
  breakMinutes: 5,
};

/* ---------- Başlatma / abonelik ---------- */
export function initState() {
  const rawTasks = read(KEYS.tasks);
  const rawProfile = read(KEYS.profile);
  const profile = rawProfile && typeof rawProfile === 'object'
    ? { ...DEFAULT_PROFILE, ...rawProfile }
    : DEFAULT_PROFILE;

  const rawTimerSettings = read(KEYS.timerSettings);
  const timerSettings = rawTimerSettings && typeof rawTimerSettings === 'object'
    ? {
        focusMinutes: Math.max(1, Math.min(180, Number(rawTimerSettings.focusMinutes) || DEFAULT_TIMER_SETTINGS.focusMinutes)),
        breakMinutes: Math.max(1, Math.min(60, Number(rawTimerSettings.breakMinutes) || DEFAULT_TIMER_SETTINGS.breakMinutes)),
      }
    : DEFAULT_TIMER_SETTINGS;

  TIMER_CONFIG.durations.focus = timerSettings.focusMinutes * 60;
  TIMER_CONFIG.durations.break = timerSettings.breakMinutes * 60;

  if (rawTasks == null) {
    state = {
      tasks: [],
      activeTaskId: null,
      currentPage: DEFAULT_PAGE,
      timer: sanitizeTimer(read(KEYS.timer)),
      profile,
      timerSettings,
    };
    write(KEYS.tasks, []);
    return state;
  }

  const tasks = Array.isArray(rawTasks) ? rawTasks.map(sanitizeTask).filter(Boolean) : [];
  const activeRaw = read(KEYS.activeTask);
  const activeTaskId = tasks.some((t) => t.id === activeRaw) ? activeRaw : null;

  state = {
    tasks,
    activeTaskId,
    currentPage: DEFAULT_PAGE,
    timer: sanitizeTimer(read(KEYS.timer)),
    profile,
    timerSettings,
  };
  return state;
}

export const getState = () => state;

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function commit(changes, persist = []) {
  state = { ...state, ...changes };
  if (persist.includes('tasks')) write(KEYS.tasks, state.tasks);
  if (persist.includes('activeTask')) write(KEYS.activeTask, state.activeTaskId);
  if (persist.includes('timer')) write(KEYS.timer, state.timer);
  if (persist.includes('profile')) write(KEYS.profile, state.profile);
  if (persist.includes('timerSettings')) write(KEYS.timerSettings, state.timerSettings);
  listeners.forEach((fn) => fn(state));
}

export function updateProfile(changes) {
  const profile = { ...(state?.profile ?? DEFAULT_PROFILE), ...changes };
  commit({ profile }, ['profile']);
}

export function updateTimerSettings(changes) {
  const current = state?.timerSettings ?? DEFAULT_TIMER_SETTINGS;
  const focusMinutes = Math.max(1, Math.min(180, Number(changes.focusMinutes) || current.focusMinutes));
  const breakMinutes = Math.max(1, Math.min(60, Number(changes.breakMinutes) || current.breakMinutes));
  const timerSettings = { focusMinutes, breakMinutes };

  TIMER_CONFIG.durations.focus = focusMinutes * 60;
  TIMER_CONFIG.durations.break = breakMinutes * 60;

  let timer = state.timer;
  if (timer.status === 'idle') {
    const isBreak = timer.mode === 'break';
    const task = getCurrentTask(state);
    const newDur = isBreak
      ? TIMER_CONFIG.durations.break
      : (task?.durationMinutes ? task.durationMinutes * 60 : TIMER_CONFIG.durations.focus);
    timer = { ...timer, durationSeconds: newDur };
  }

  commit({ timerSettings, timer }, ['timerSettings', 'timer']);
}

export function isFirstVisit() {
  const hasOnboarded = read(KEYS.onboarded);
  if (hasOnboarded === true) return false;
  const rawProfile = read(KEYS.profile);
  if (rawProfile?.onboarded) return false;
  // Kullanıcının kayıtlı ismi veya mevcut görevleri varsa ilk defa gelmiyor demektir
  if (rawProfile?.name && rawProfile.name.trim() !== '') return false;
  const rawTasks = read(KEYS.tasks);
  if (Array.isArray(rawTasks) && rawTasks.length > 0) return false;
  return true;
}

export function completeOnboarding(name) {
  const cleanName = String(name || '').trim() || 'Odak Yolcusu';
  updateProfile({ name: cleanName, onboarded: true });
  write(KEYS.onboarded, true);
}

/* ---------- Seçiciler ---------- */
export const getTaskById = (s, id) => s.tasks.find((t) => t.id === id) ?? null;

/**
 * "O anki görev" kuralı (açık ve tutarlı):
 * 1) Kullanıcının seçtiği aktif görev (tamamlanmış olsa bile gösterilir; otomatik atlama YOK).
 * 2) Aktif görev yoksa: oluşturulma sırasına göre ilk tamamlanmamış görev.
 */
export function getCurrentTask(s) {
  return getTaskById(s, s.activeTaskId) ?? s.tasks.find((t) => !t.completed) ?? null;
}

/* ---------- Eylemler ---------- */
function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addTask({ title, description = '', durationMinutes = null, scheduledStart = null, scheduledEnd = null }) {
  const now = Date.now();
  const task = {
    id: newId(),
    title: title.trim(),
    description: description.trim(),
    durationMinutes,
    scheduledStart,
    scheduledEnd,
    completed: false,
    inAutoRoute: false,
    createdAt: now,
    updatedAt: now,
  };
  commit({ tasks: [...state.tasks, task] }, ['tasks']);
  return task;
}

export function toggleTask(id) {
  const tasks = state.tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed, updatedAt: Date.now() } : t));
  commit({ tasks }, ['tasks']);
}

export function updateTask(id, { title, description, durationMinutes, scheduledStart, scheduledEnd }) {
  const tasks = state.tasks.map((t) => {
    if (t.id !== id) return t;
    return {
      ...t,
      title: typeof title === 'string' ? title.trim() : t.title,
      description: typeof description === 'string' ? description.trim() : t.description,
      durationMinutes: durationMinutes !== undefined ? durationMinutes : t.durationMinutes,
      scheduledStart: scheduledStart !== undefined ? scheduledStart : t.scheduledStart,
      scheduledEnd: scheduledEnd !== undefined ? scheduledEnd : t.scheduledEnd,
      updatedAt: Date.now(),
    };
  });
  commit({ tasks }, ['tasks']);
}

export function deleteTask(id) {
  const tasks = state.tasks.filter((t) => t.id !== id);
  const activeTaskId = state.activeTaskId === id ? null : state.activeTaskId;
  const timer = state.timer.taskId === id ? { ...state.timer, taskId: null } : state.timer;
  commit({ tasks, activeTaskId, timer }, ['tasks', 'activeTask', 'timer']);
}

export function setActiveTask(id) {
  const task = getTaskById(state, id);
  if (!task) return;
  const updates = { activeTaskId: id };
  if (state.timer.status === 'idle') {
    const durSec = task.durationMinutes ? task.durationMinutes * 60 : TIMER_CONFIG.durations.focus;
    updates.timer = {
      ...state.timer,
      durationSeconds: durSec,
      taskId: id,
    };
  }
  commit(updates, ['activeTask', 'timer']);
}

export function setCurrentPage(currentPage) {
  if (state.currentPage !== currentPage) commit({ currentPage });
}

export function setTimer(timer) {
  commit({ timer }, ['timer']);
}

export function loadDemoData() {
  const now = Date.now();
  const todayAt = (h, m) => {
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.getTime();
  };

  const demoTasks = [
    {
      id: newId(),
      title: 'Q4 Ürün Yol Haritası İncelemesi',
      description: 'Yeni sürüm hedeflerini gözden geçir ve kilometre taşlarını planla.',
      durationMinutes: 45,
      scheduledStart: todayAt(9, 30),
      scheduledEnd: todayAt(10, 15),
      completed: false,
      createdAt: now - 3600000,
      updatedAt: now,
    },
    {
      id: newId(),
      title: 'Subvio Tasarım Sistemi İyileştirmeleri',
      description: 'Siyah-turuncu premium bileşenleri ve adaptif yerleşim detaylarını optimize et.',
      durationMinutes: 30,
      scheduledStart: todayAt(11, 0),
      scheduledEnd: todayAt(11, 30),
      completed: false,
      createdAt: now - 3000000,
      updatedAt: now,
    },
    {
      id: newId(),
      title: 'Haftalık Ekip Senkronizasyon Toplantısı',
      description: 'Tamamlanan adımlar ve rota değerlendirmesi paylaşıldı.',
      durationMinutes: 20,
      scheduledStart: todayAt(8, 30),
      scheduledEnd: todayAt(8, 50),
      completed: true,
      createdAt: now - 7200000,
      updatedAt: now,
    },
    {
      id: newId(),
      title: 'Müşteri Geri Bildirimleri & Hata Taraması',
      description: 'Kullanıcı geri bildirimlerini analiz et ve öncelik listesini hazırla.',
      durationMinutes: 25,
      scheduledStart: todayAt(14, 0),
      scheduledEnd: todayAt(14, 25),
      completed: false,
      createdAt: now - 1800000,
      updatedAt: now,
    },
    {
      id: newId(),
      title: 'Dokümantasyon ve Sürüm Notları',
      description: 'Yeni özelliklerin açıklamalarını ve kılavuzu tamamla.',
      durationMinutes: 15,
      scheduledStart: null,
      scheduledEnd: null,
      completed: false,
      createdAt: now - 600000,
      updatedAt: now,
    },
  ];

  const existingTitles = new Set(state.tasks.map((t) => t.title));
  const newDemoTasks = demoTasks
    .filter((t) => !existingTitles.has(t.title))
    .map((t) => ({ ...t, inAutoRoute: false }));
  const mergedTasks = [...state.tasks, ...newDemoTasks];

  commit({
    tasks: mergedTasks,
    activeTaskId: state.activeTaskId ?? mergedTasks[0]?.id ?? null,
  }, ['tasks', 'activeTask']);
}

export function resetAllData() {
  commit({
    tasks: [],
    activeTaskId: null,
    timer: createIdleTimer('focus'),
  }, ['tasks', 'activeTask', 'timer']);
}

/**
 * Otomatik Akıllı Rota Oluşturucu:
 * Seçilen görevleri başlangıç saatinden itibaren görevlerin kendi sürelerine (veya varsayılan Pomodoro süresine)
 * ve mola sürelerine göre sıralı, mantık hatasız gerçekçi bir günlük rotaya dönüştürür.
 */
export function buildAutoRoute({ taskIds, startTimestamp, pomodoroMinutes = 25, breakMinutes = 5, overrideCustomDurations = false }) {
  if (!Array.isArray(taskIds) || !taskIds.length) return false;

  let cursor = startTimestamp;
  const breakMs = breakMinutes * 60 * 1000;

  const taskMap = new Map();
  taskIds.forEach((id) => {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return;

    // Kullanıcının görev eklerken belirlediği süreyi KORU (mantık hatasını önle)
    const effectiveMins = (!overrideCustomDurations && Number(task.durationMinutes) > 0)
      ? task.durationMinutes
      : (pomodoroMinutes || 25);

    const taskMs = effectiveMins * 60 * 1000;
    const scheduledStart = cursor;
    const scheduledEnd = cursor + taskMs;
    cursor = scheduledEnd + breakMs;

    taskMap.set(id, {
      ...task,
      durationMinutes: effectiveMins,
      scheduledStart,
      scheduledEnd,
      inAutoRoute: true,
      updatedAt: Date.now(),
    });
  });

  // Sadece otomatik rota oluşturucu ile seçilen görevler Rota Zaman Çizelgesi'nde yer alır
  const updatedTasks = state.tasks.map((t) =>
    taskMap.get(t.id) ?? (t.inAutoRoute ? { ...t, inAutoRoute: false } : t));

  commit({
    tasks: updatedTasks,
    activeTaskId: taskIds[0] ?? state.activeTaskId,
  }, ['tasks', 'activeTask']);

  return true;
}

