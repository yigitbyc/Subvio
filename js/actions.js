/** Görev odaklama gibi birden fazla sayfanın paylaştığı eylemler. */
import { getState, setActiveTask } from './state.js';
import { resetTimer } from './timer.js';
import { navigate } from './router.js';

/** Görevi aktif yapar ve Zamanlayıcı'ya geçer. Devam eden başka bir seans varsa onay ister. */
export function focusTask(taskId) {
  const { timer } = getState();
  const sameSession = timer.mode === 'focus' && timer.taskId === taskId;
  if (timer.status !== 'idle' && !sameSession) {
    if (['running', 'paused'].includes(timer.status)) {
      const ok = window.confirm('Devam eden bir odaklanma seansı var. Yeni göreve odaklanmak mevcut seansı sıfırlar. Devam edilsin mi?');
      if (!ok) return;
    }
    resetTimer();
  }
  setActiveTask(taskId);
  navigate('timer');
}

