/**
 * Zamanlayıcı motoru. Sayfadan bağımsızdır: sayfa değişse de seans sürer.
 * Süre, timestamp farkından hesaplanır; setInterval sayısına güvenilmez.
 */
import { TIMER_CONFIG } from './config.js';
import { getState, setTimer, subscribe, createIdleTimer, getTaskById, getCurrentTask } from './state.js';

export function getElapsedMs(timer, now = Date.now()) {
  if (timer.status === 'idle') return 0;
  if (timer.status === 'running') return timer.elapsedBeforePause + Math.max(0, now - timer.startedAt);
  return timer.elapsedBeforePause; // paused | completed
}

export function getRemainingSeconds(timer, now = Date.now()) {
  const left = timer.durationSeconds * 1000 - getElapsedMs(timer, now);
  return Math.max(0, Math.ceil(left / 1000));
}

export function getProgress(timer, now = Date.now()) {
  if (timer.status === 'completed') return 1;
  return Math.min(1, getElapsedMs(timer, now) / (timer.durationSeconds * 1000));
}

function begin(mode, taskId) {
  let dur = TIMER_CONFIG.durations[mode];
  if (mode === 'focus' && taskId) {
    const t = getTaskById(getState(), taskId);
    if (t?.durationMinutes) {
      dur = t.durationMinutes * 60;
    }
  }
  setTimer({
    status: 'running',
    mode,
    durationSeconds: dur,
    taskId,
    startedAt: Date.now(),
    elapsedBeforePause: 0,
  });
}

export const startFocus = (taskId) => begin('focus', taskId);
export const startBreak = () => begin('break', null);

export function pauseTimer() {
  const { timer } = getState();
  if (timer.status !== 'running') return;
  setTimer({ ...timer, status: 'paused', elapsedBeforePause: getElapsedMs(timer), startedAt: null });
}

export function resumeTimer() {
  const { timer } = getState();
  if (timer.status !== 'paused') return;
  setTimer({ ...timer, status: 'running', startedAt: Date.now() });
}

export function resetTimer() {
  const current = getCurrentTask(getState());
  const dur = current?.durationMinutes ? current.durationMinutes * 60 : TIMER_CONFIG.durations.focus;
  setTimer({
    ...createIdleTimer('focus'),
    durationSeconds: dur,
    taskId: current?.id || null,
  });
}

/** Süre dolduysa seansı tamamlanmış duruma getirir. */
export function checkCompletion() {
  const { timer } = getState();
  if (timer.status !== 'running') return;
  if (getElapsedMs(timer) >= timer.durationSeconds * 1000) {
    setTimer({ ...timer, status: 'completed', elapsedBeforePause: timer.durationSeconds * 1000, startedAt: null });
  }
}

/** Tek ve kontrollü güncelleme döngüsü; yalnızca seans çalışırken aktif. */
export function initTimerEngine() {
  let interval = null;
  const sync = () => {
    const running = getState().timer.status === 'running';
    if (running && !interval) interval = setInterval(checkCompletion, 500);
    if (!running && interval) { clearInterval(interval); interval = null; }
  };
  subscribe(sync);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkCompletion(); });
  window.addEventListener('pageshow', checkCompletion);
  checkCompletion(); // sayfa yenilenirken süre dolmuş olabilir
  sync();
}

