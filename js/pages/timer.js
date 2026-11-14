import { h } from '../utils/dom.js';
import { icon } from '../components/icons.js';
import { createNavScene } from '../components/nav-scene.js';
import { getState, subscribe, getCurrentTask, getTaskById, setActiveTask, toggleTask } from '../state.js';
import { startFocus, startBreak, pauseTimer, resumeTimer, resetTimer, getRemainingSeconds, getProgress } from '../timer.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';
import { formatClock, formatHM } from '../utils/time.js';

const STATUS_TEXT = {
  idle: 'Rota hazır',
  running: 'Yoldasınız',
  paused: 'Duraklatıldı',
  completed: 'Vardınız',
};

/** Seans durumuna göre gösterilecek görev (çalışan seans kendi görevine bağlıdır). */
function displayTask(state) {
  const { timer } = state;
  if (timer.mode === 'break') return null;
  if (timer.status !== 'idle') return getTaskById(state, timer.taskId);
  const t = getCurrentTask(state);
  return t && !t.completed ? t : null;
}

export function mount(root) {
  let isMenuOpen = false;
  let isFullscreen = false;

  const $ = {
    scene: h('div', { class: 'timer-scene' }),

    // Tam Ekran Düğmesi ve Tam Ekran HUD Köşe Göstergesi
    btnFullscreen: h('button', {
      class: 'stage-fullscreen-btn',
      type: 'button',
      'aria-label': 'Sürüş ekranını tam ekran yap',
      title: 'Tam Ekran Modu',
      onClick: () => toggleFullscreen(true),
    }, icon('maximize')),

    fullscreenHud: h('div', { class: 'stage-fullscreen-hud', 'aria-hidden': 'true' },
      h('span', { class: 'stage-fullscreen-hud__icon' }, icon('clock')),
      h('span', { class: 'stage-fullscreen-hud__time' }, '25:00'),
      h('span', { class: 'stage-fullscreen-hud__status' }, 'Rota hazır')),

    btnCloseFullscreen: h('button', {
      class: 'stage-fullscreen-close-btn',
      type: 'button',
      'aria-label': 'Tam ekrandan çık',
      title: 'Tam Ekrandan Çık (Esc)',
      onClick: () => toggleFullscreen(false),
    }, icon('minimize')),

    // 1. Üst Kapsül (Görev Seçimi)
    taskTitle: h('span', { class: 'pomo-task-selector__title' }, 'Odaklanılan Görev / Durak'),
    taskSelectBtn: h('button', {
      class: 'pomo-task-selector__btn',
      type: 'button',
      'aria-expanded': 'false',
      title: 'Odaklanılacak görevi seç',
    },
      h('span', { class: 'pomo-task-selector__chevron' }, icon('chevronDown')),
      h('span', {}, 'Seç')),
    taskMenu: h('div', { class: 'pomo-task-menu', hidden: true }),

    // 2. Orta Zaman ve Durum Satırı
    time: h('span', { class: 'pomo-time-digits', role: 'timer', 'aria-label': 'Kalan süre' }, '25:00'),
    statusText: h('span', { class: 'pomo-status-text' }, 'Rota hazır'),
    statusIcon: h('span', { class: 'pomo-status-icon' }, icon('navigation')),

    // 3. Alt Eylemler
    controls: h('div', { class: 'pomo-actions-wrap' }),
    live: h('p', { class: 'sr-only', 'aria-live': 'polite' }),
  };

  // Üst Kapsül Montajı
  const taskSelectorWrap = h('div', { class: 'pomo-task-selector-container' },
    h('div', {
      class: 'pomo-task-selector',
      onClick: () => toggleTaskMenu(),
      role: 'button',
      tabindex: '0',
    },
      h('div', { class: 'pomo-task-selector__left' },
        h('span', { class: 'pomo-task-selector__icon' }, icon('target')),
        $.taskTitle),
      $.taskSelectBtn),
    $.taskMenu);

  // Orta Zaman & Durum Satırı
  const timeRow = h('div', { class: 'pomo-time-row' },
    h('div', { class: 'pomo-time-wrap' },
      h('span', { class: 'pomo-time-icon' }, icon('clock')),
      $.time),
    h('div', { class: 'pomo-status-pill' },
      $.statusIcon,
      $.statusText));

  // Ana Panel
  const panel = h('div', { class: 'timer-panel card pomo-card' },
    taskSelectorWrap,
    timeRow,
    $.controls,
    $.live);

  // Sürüş Sahnesi Sahnesi (Kullanıcının isteği: Üstteki banner kaldırıldı, tam ekran butonu eklendi)
  const stage = h('div', { class: 'timer-stage' },
    $.scene,
    $.btnFullscreen,
    $.fullscreenHud,
    $.btnCloseFullscreen);

  const page = h('section', { class: 'timer-page', 'aria-label': 'Zamanlayıcı' },
    stage,
    panel);

  root.append(page);

  const scene = createNavScene($.scene);
  let raf = null;
  let lastStatusKey = null;
  let lastSecond = -1;

  function toggleFullscreen(enable) {
    isFullscreen = typeof enable === 'boolean' ? enable : !isFullscreen;
    stage.classList.toggle('is-stage-fullscreen', isFullscreen);
    document.body.classList.toggle('is-driving-fullscreen', isFullscreen);
    if (isFullscreen) {
      try {
        if (!document.fullscreenElement && stage.requestFullscreen) {
          stage.requestFullscreen().catch(() => {});
        }
      } catch (err) {}
      showToast('Tam ekran sürüş modu aktif (Çıkmak için Esc)', { type: 'info' });
    } else {
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (err) {}
    }
  }

  function onFullscreenChange() {
    if (!document.fullscreenElement && isFullscreen) {
      toggleFullscreen(false);
    }
  }
  document.addEventListener('fullscreenchange', onFullscreenChange);

  function toggleTaskMenu(forceState) {
    isMenuOpen = typeof forceState === 'boolean' ? forceState : !isMenuOpen;
    $.taskMenu.hidden = !isMenuOpen;
    $.taskSelectBtn.setAttribute('aria-expanded', String(isMenuOpen));
    if (isMenuOpen) {
      renderTaskMenu(getState());
    }
  }

  function renderTaskMenu(state) {
    const tasks = state.tasks || [];
    const current = getCurrentTask(state);
    if (!tasks.length) {
      $.taskMenu.replaceChildren(
        h('div', { class: 'pomo-task-menu__empty' },
          'Henüz durak eklenmemiş.',
          h('button', {
            class: 'btn-link',
            type: 'button',
            style: 'margin-top: 6px;',
            onClick: () => { toggleTaskMenu(false); navigate('route'); },
          }, 'Günlük Rota\'ya Git')));
      return;
    }

    const items = tasks.map((t) => {
      const isSelected = current?.id === t.id;
      return h('button', {
        class: `pomo-task-menu__item${isSelected ? ' is-selected' : ''}${t.completed ? ' is-done' : ''}`,
        type: 'button',
        onClick: () => {
          setActiveTask(t.id);
          toggleTaskMenu(false);
          const mins = t.durationMinutes || 25;
          showToast(`Odak durağı: ${t.title} (${mins} dk)`);
        },
      },
        h('span', { class: 'pomo-task-menu__item-name' },
          t.completed ? icon('check') : icon('target'),
          t.title),
        h('span', { class: 'pomo-task-menu__item-time' }, `${t.durationMinutes || 25} dk`));
    });

    $.taskMenu.replaceChildren(...items);
  }

  function onDocClick(e) {
    if (isMenuOpen && !taskSelectorWrap.contains(e.target)) {
      toggleTaskMenu(false);
    }
  }
  document.addEventListener('click', onDocClick);

  /* ---------- Sayaç / İlerleme Döngüsü ---------- */
  function tick() {
    const { timer } = getState();
    const now = Date.now();
    const p = getProgress(timer, now);
    const remaining = getRemainingSeconds(timer, now);
    if (remaining !== lastSecond) {
      lastSecond = remaining;
      const formatted = formatClock(timer.status === 'idle' ? timer.durationSeconds : remaining);
      $.time.textContent = formatted;
      const hudTime = $.fullscreenHud.querySelector('.stage-fullscreen-hud__time');
      if (hudTime) hudTime.textContent = formatted;
    }
    scene.update(p, timer.durationSeconds, timer.status !== 'running');
    raf = timer.status === 'running' ? requestAnimationFrame(tick) : null;
  }

  function startLoop() { if (raf == null) raf = requestAnimationFrame(tick); }

  function confirmReset() {
    return window.confirm('Seans sıfırlansın mı? Geçen süre kaybolur.') && (resetTimer(), true);
  }

  /* ---------- Kontrol Butonları ---------- */
  function renderControls(state, task) {
    const { timer } = state;
    const isBreak = timer.mode === 'break';
    let nodes;

    if (timer.status === 'idle') {
      nodes = [
        h('button', {
          class: 'btn btn--primary btn--lg pomo-primary-btn',
          type: 'button',
          dataset: { key: 'start' },
          onClick: () => {
            if (task) {
              setActiveTask(task.id);
              startFocus(task.id);
            } else if (state.tasks?.length) {
              const first = state.tasks.find((t) => !t.completed) || state.tasks[0];
              setActiveTask(first.id);
              startFocus(first.id);
            } else {
              navigate('route');
            }
          },
        }, icon('play'), 'Başlat'),
      ];
    } else if (timer.status === 'running') {
      nodes = [
        h('button', {
          class: 'btn btn--primary btn--lg pomo-primary-btn',
          type: 'button',
          dataset: { key: 'pause' },
          onClick: pauseTimer,
        }, icon('pause'), 'Duraklat'),
        h('button', {
          class: 'btn btn--secondary btn--md pomo-secondary-btn',
          type: 'button',
          dataset: { key: 'reset' },
          onClick: confirmReset,
          title: 'Seansı Sıfırla',
        }, icon('reset'), 'Sıfırla'),
      ];
    } else if (timer.status === 'paused') {
      nodes = [
        h('button', {
          class: 'btn btn--primary btn--lg pomo-primary-btn',
          type: 'button',
          dataset: { key: 'resume' },
          onClick: resumeTimer,
        }, icon('play'), 'Devam Et'),
        h('button', {
          class: 'btn btn--secondary btn--md pomo-secondary-btn',
          type: 'button',
          dataset: { key: 'reset' },
          onClick: confirmReset,
          title: 'Seansı Sıfırla',
        }, icon('reset'), 'Sıfırla'),
      ];
    } else {
      nodes = isBreak
        ? [
          h('button', {
            class: 'btn btn--primary btn--lg pomo-primary-btn',
            type: 'button',
            dataset: { key: 'new-session' },
            onClick: resetTimer,
          }, icon('target'), 'Yeni Odak Seansı'),
        ]
        : [
          h('button', {
            class: 'btn btn--primary btn--lg pomo-primary-btn',
            type: 'button',
            dataset: { key: 'break' },
            onClick: startBreak,
          }, icon('coffee'), 'Mola Başlat'),
          task && !task.completed
            ? h('button', {
              class: 'btn btn--secondary btn--md pomo-secondary-btn',
              type: 'button',
              dataset: { key: 'complete-task' },
              onClick: () => {
                toggleTask(task.id);
                showToast('Görev tamamlandı!');
              },
            }, icon('check'), 'Tamamla')
            : null,
          h('button', {
            class: 'btn btn--secondary btn--md pomo-secondary-btn',
            type: 'button',
            dataset: { key: 'new-session' },
            onClick: resetTimer,
          }, icon('reset'), 'Yeni Seans'),
        ].filter(Boolean);
    }

    $.controls.replaceChildren(...nodes);
  }

  function render(state) {
    const { timer } = state;
    const task = displayTask(state);
    const isBreak = timer.mode === 'break';

    // 1. Üst Kapsül Görev Metni
    if (isBreak) {
      $.taskTitle.textContent = 'Dinlenme Molası';
    } else if (task) {
      $.taskTitle.textContent = task.title;
    } else {
      $.taskTitle.textContent = 'Odaklanılan Görev / Durak';
    }

    // 2. Durum Rozeti + Metni
    const statusText = timer.status === 'completed'
      ? (isBreak ? 'Mola bitti' : 'Vardınız')
      : (isBreak && timer.status === 'running' ? 'Moladasınız' : STATUS_TEXT[timer.status]);
    $.statusText.textContent = statusText;
    $.statusIcon.replaceChildren(icon(timer.status === 'completed' ? 'flag' : 'navigation'));

    const hudStatus = $.fullscreenHud.querySelector('.stage-fullscreen-hud__status');
    if (hudStatus) hudStatus.textContent = statusText;

    renderControls(state, task);

    const key = `${timer.status}:${timer.mode}`;
    if (key !== lastStatusKey) {
      if (lastStatusKey) $.live.textContent = `${statusText}. ${isBreak ? 'Mola' : (task?.title ?? '')}`;
      lastStatusKey = key;
    }
    lastSecond = -1;
    if (timer.status === 'running') startLoop(); else { cancelAnimationFrame(raf); raf = null; tick(); }
  }

  const unsubscribe = subscribe(render);
  render(getState());

  function onKeyDown(e) {
    if (e.key === 'Escape' && isFullscreen) {
      toggleFullscreen(false);
      return;
    }
    if ((e.key === 'f' || e.key === 'F') && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      toggleFullscreen();
      return;
    }
    if (e.code === 'Space') {
      const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
      if (isInput) return;
      e.preventDefault();
      const { timer } = getState();
      const task = displayTask(getState());
      if (timer.status === 'idle') {
        if (task) {
          setActiveTask(task.id);
          startFocus(task.id);
        } else {
          const first = getState().tasks?.find((t) => !t.completed) || getState().tasks?.[0];
          if (first) {
            setActiveTask(first.id);
            startFocus(first.id);
          }
        }
      } else if (timer.status === 'running') {
        pauseTimer();
      } else if (timer.status === 'paused') {
        resumeTimer();
      }
    }
  }
  window.addEventListener('keydown', onKeyDown);

  return () => {
    unsubscribe();
    document.body.classList.remove('is-driving-fullscreen');
    document.removeEventListener('click', onDocClick);
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    window.removeEventListener('keydown', onKeyDown);
    cancelAnimationFrame(raf);
    scene.destroy();
  };
}
