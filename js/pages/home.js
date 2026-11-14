import { h } from '../utils/dom.js';
import { icon } from '../components/icons.js';
import { getState, subscribe, getCurrentTask, getTaskById, setActiveTask, toggleTask, loadDemoData } from '../state.js';
import { openTaskModal } from '../components/task-modal.js';
import { openSettingsModal } from '../components/settings-modal.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';
import { focusTask } from '../actions.js';
import { formatSchedule, formatHM } from '../utils/time.js';
import { formatLongDate } from '../utils/date.js';

export function mount(root) {
  const page = h('section', { class: 'page home-welcome-page' });
  root.append(page);

  function render(state) {
    const total = state.tasks.length;
    const pending = state.tasks.filter((t) => !t.completed);
    const done = state.tasks.filter((t) => t.completed);
    const current = getCurrentTask(state);
    const { timer, profile } = state;
    const isTimerActive = timer.status !== 'idle';
    const activeTask = timer.mode === 'focus' ? getTaskById(state, timer.taskId) : null;
    const effectiveTask = activeTask || current || (total ? state.tasks[0] : null);
    const progressPercent = total > 0 ? Math.round((done.length / total) * 100) : 0;
    const userName = profile?.name || 'Mert';

    // 1. Zarif Üst Bar (Topbar: Sol Tarafta Tarih/Durum Rozetleri, Sağ Tarafta Orantılı Ayarlar Butonu)
    const header = h('header', { class: 'home-topbar' },
      h('div', { class: 'home-topbar__left' },
        h('span', { class: 'home-topbar__date' }, icon('calendar'), formatLongDate()),
        h('span', { class: 'home-topbar__badge' },
          h('span', { class: `status-dot${isTimerActive ? ' status-dot--pulsing' : ''}` }),
          total > 0 ? `${total} Durak (${done.length} Bitti)` : 'Rota Boş')),
      h('button', {
        class: 'icon-btn icon-btn--sm home-topbar__settings',
        type: 'button',
        id: 'btn-home-settings',
        'aria-label': 'Ayarlar',
        title: 'Ayarlar',
        onClick: openSettingsModal,
      }, icon('settings')));

    // 2. Karşılama Kartı (Hoş Geldiniz & Profil Resmi)
    let welcomeDesc;
    if (!total) {
      welcomeDesc = 'Bugün için henüz bir odak durağı eklemedin. Yeni bir görev ekleyerek veya otomatik rota oluşturarak güne başla.';
    } else if (done.length === total) {
      welcomeDesc = `Tebrikler! Bugünün tüm ${total} durağını başarıyla tamamladın. Harika bir odak ritmi yakaladın.`;
    } else {
      welcomeDesc = `Bugün senin için planlanan ${total} duraklı bir odak yolculuğu var (${done.length} tamamlandı). Hedefine doğru odaklanmaya hazır mısın?`;
    }

    // Ana Eylem Butonu
    let primaryActionBtn;
    if (isTimerActive) {
      primaryActionBtn = h('button', {
        class: 'btn btn--primary btn--lg home-welcome__cta',
        type: 'button',
        onClick: () => navigate('timer'),
      }, icon('navigation'), timer.status === 'running' ? 'Canlı Seansa Dön' : 'Seansı Sürdür');
    } else if (effectiveTask) {
      primaryActionBtn = h('button', {
        class: 'btn btn--primary btn--lg home-welcome__cta',
        type: 'button',
        onClick: () => focusTask(effectiveTask.id),
      }, icon('play'), 'Rotayı Başlat ve Odaklan');
    } else {
      primaryActionBtn = h('button', {
        class: 'btn btn--primary btn--lg home-welcome__cta',
        type: 'button',
        onClick: () => openTaskModal(),
      }, icon('plus'), 'İlk Görevi Ekle');
    }

    const secondaryActionBtn = h('button', {
      class: 'btn btn--secondary btn--lg',
      type: 'button',
      onClick: () => navigate('route'),
    }, icon('route'), 'Günlük Rota');

    const welcomeCard = h('article', { class: 'home-welcome-card' },
      h('div', { class: 'home-welcome__glow' }),
      // Profil Resmi Alanı (Avatar)
      h('div', { class: 'home-avatar-wrap' },
        h('div', { class: 'home-avatar' },
          h('img', {
            src: profile?.avatar || 'assets/avatars/user.svg',
            alt: `${userName} Profil Resmi`,
            class: 'home-avatar__img',
          }),
          h('span', {
            class: `home-avatar__beacon${isTimerActive ? ' is-pulsing' : ''}`,
            title: isTimerActive ? 'Odak Navigasyonu Aktif' : 'Hazır',
          }))),
      // Hoş Geldiniz & Kullanıcı Adı
      h('div', { class: 'home-welcome__text-wrap' },
        h('div', { class: 'home-welcome__badge' }, icon('sparkles'), 'SUBVIO ODAK KOKPİTİ'),
        h('h1', { class: 'home-welcome__title' }, `Hoş Geldiniz, ${userName}`),
        h('p', { class: 'home-welcome__desc' }, welcomeDesc)),
      // Butonlar
      h('div', { class: 'home-welcome__actions' },
        primaryActionBtn,
        secondaryActionBtn));

    // 3. Kullanıcının İşaretlediği 4'lü Özet İstatistik Kartları (2x2 Grid)
    const totalFocusMinutes = state.tasks.reduce((acc, t) => acc + (t.durationMinutes || 25), 0);
    const totalHours = Math.floor(totalFocusMinutes / 60);
    const remainingMins = totalFocusMinutes % 60;
    const timeDisplay = totalHours > 0 ? `${totalHours} sa ${remainingMins} dk` : `${remainingMins} dk`;

    // 1. Kart: Duraklar
    const durakCard = h('article', {
      class: 'home-stat-card',
      onClick: () => navigate('route'),
      role: 'button',
      tabindex: '0',
      title: 'Günlük rotayı aç',
    },
      h('div', { class: 'home-stat-card__icon-wrap' }, icon('mapPin')),
      h('div', { class: 'home-stat-card__content' },
        h('div', { class: 'home-stat-card__val' }, `${total} Durak`),
        h('div', { class: 'home-stat-card__sub' }, `${pending.length} Kalan`),
        h('div', { class: 'home-stat-card__meta' }, `${done.length} Tamamlandı`)));

    // 2. Kart: Toplam Odak Süresi
    const timeCard = h('article', {
      class: 'home-stat-card',
      onClick: () => navigate('route'),
      role: 'button',
      tabindex: '0',
      title: 'Zaman dağılımını incele',
    },
      h('div', { class: 'home-stat-card__icon-wrap' }, icon('clock')),
      h('div', { class: 'home-stat-card__content' },
        h('div', { class: 'home-stat-card__val' }, timeDisplay),
        h('div', { class: 'home-stat-card__sub' }, 'Toplam Odak'),
        h('div', { class: 'home-stat-card__meta' }, `${total} Zamanlı Plan`)));

    // 3. Kart: Tamamlanma Yüzdesi & Mini Bar
    const progressCard = h('article', {
      class: 'home-stat-card',
      onClick: () => navigate('route'),
      role: 'button',
      tabindex: '0',
      title: 'İlerleme detayları',
    },
      h('div', { class: 'home-stat-card__icon-wrap' }, icon('target')),
      h('div', { class: 'home-stat-card__content' },
        h('div', { class: 'home-stat-card__val' }, `%${progressPercent}`),
        h('div', { class: 'home-stat-card__sub' }, `${done.length}/${total} Bitti`),
        h('div', { class: 'home-stat-card__progress-bar' },
          h('div', { class: 'home-stat-card__progress-fill', style: `width: ${progressPercent}%;` }))));

    // 4. Kart: Seans Durumu
    let sessionStatusText = 'Hazır';
    let sessionMetaText = '25 dk Periyot';
    if (isTimerActive) {
      sessionStatusText = timer.status === 'running' ? 'Odakta...' : 'Duraklatıldı';
      const remSec = timer.remainingSeconds ?? (25 * 60);
      const remMin = Math.ceil(remSec / 60);
      sessionMetaText = `${remMin} dk Kaldı`;
    }

    const sessionCard = h('article', {
      class: 'home-stat-card',
      onClick: () => navigate('timer'),
      role: 'button',
      tabindex: '0',
      title: 'Zamanlayıcıya git',
    },
      h('div', { class: 'home-stat-card__icon-wrap' }, icon('navigation')),
      h('div', { class: 'home-stat-card__content' },
        h('div', { class: 'home-stat-card__val' }, sessionStatusText),
        h('div', { class: 'home-stat-card__sub' }, 'Odak Seansı'),
        h('div', { class: 'home-stat-card__meta' }, sessionMetaText)));

    const statsGrid = h('section', { class: 'home-stats-grid', 'aria-label': 'Günlük Odak Özeti' },
      durakCard,
      timeCard,
      progressCard,
      sessionCard);

    // 4. Günün Durakları Yatay Navigasyon Şeridi (Horizontal Waypoint Flow)
    let waypointsSection = null;
    if (total > 0) {
      const waypoints = state.tasks.map((task, idx) => {
        const isCurrent = effectiveTask?.id === task.id;
        return h('button', {
          class: `waypoint-chip${task.completed ? ' is-done' : ''}${isCurrent ? ' is-active' : ''}`,
          type: 'button',
          title: `${task.title} (Seç ve odaklan)`,
          onClick: () => {
            setActiveTask(task.id);
            if (!task.completed && timer.status === 'idle') {
              focusTask(task.id);
            }
          },
        },
          h('span', { class: 'waypoint-chip__marker' },
            task.completed ? icon('check') : isCurrent ? icon('target') : String(idx + 1)),
          h('span', { class: 'waypoint-chip__name' }, task.title),
          task.scheduledStart ? h('span', { class: 'waypoint-chip__time' }, formatHM(task.scheduledStart)) : null);
      });

      waypointsSection = h('section', { class: 'home-waypoints-section' },
        h('div', { class: 'home-waypoints__header' },
          h('span', { class: 'home-waypoints__title' },
            icon('route'), 'Günün Rota Akışı'),
          h('button', {
            class: 'btn-link',
            type: 'button',
            onClick: () => navigate('route'),
          }, 'Tüm Rota Çizelgesi', icon('arrow'))),
        h('div', { class: 'home-waypoints__track' }, waypoints));
    }

    // Sayfa Montajı: Topbar -> Karşılama Kartı -> 4'lü Özet İstatistik Kartları -> Günün Rota Akışı
    const elements = [header, welcomeCard, statsGrid, waypointsSection].filter(Boolean);
    page.replaceChildren(...elements);
  }

  const unsubscribe = subscribe(render);
  render(getState());
  return () => unsubscribe();
}
