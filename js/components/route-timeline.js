import { h } from '../utils/dom.js';
import { icon } from './icons.js';
import { formatHM, formatMinutes } from '../utils/time.js';
import { focusTask } from '../actions.js';
import { taskStatus } from './task-card.js';

/**
 * Günlük Rota Zaman Çizelgesi (Kartın altında yer alan otomatik akıllı rota akışı)
 */
export function createRouteTimeline(tasks, state) {
  if (!tasks || !tasks.length) return null;

  // Sadece "Otomatik Rota Oluştur" ile seçilen ve henüz tamamlanmamış görevleri göster
  const visibleTasks = tasks.filter((t) => t && t.inAutoRoute === true && !t.completed);
  if (!visibleTasks.length) {
    return h('section', { class: 'card route-timeline-card', 'aria-label': 'Günlük Rota Çizelgesi' },
      h('div', { class: 'route-timeline__header' },
        h('div', { class: 'route-timeline__title-group' },
          h('span', { class: 'route-timeline__icon-badge' }, icon('route')),
          h('div', {},
            h('h2', { class: 'route-timeline__title' }, 'Rota Zaman Çizelgesi'),
            h('p', { class: 'route-timeline__sub' }, 'Otomatik rota ile seçilen ve tamamlanmamış duraklar'))),
        h('span', { class: 'badge' }, '0 Durak Planı')),
      h('p', { class: 'route-tasks-card__empty' },
        'Zaman çizelgesinde aktif durak yok. "Otomatik Rota Oluştur" butonuyla eklemek istediğin görevleri seçebilirsin.'));
  }

  // Planlanmış saatli görevleri öncelikli sırala, yoksa oluşturulma sırasına göre al
  const scheduled = [...visibleTasks].sort((a, b) => {
    const aStart = (typeof a?.scheduledStart === 'number' && Number.isFinite(a.scheduledStart)) ? a.scheduledStart : null;
    const bStart = (typeof b?.scheduledStart === 'number' && Number.isFinite(b.scheduledStart)) ? b.scheduledStart : null;
    if (aStart != null && bStart != null) return aStart - bStart;
    if (aStart != null) return -1;
    if (bStart != null) return 1;
    const aCreated = (typeof a?.createdAt === 'number' && Number.isFinite(a.createdAt)) ? a.createdAt : 0;
    const bCreated = (typeof b?.createdAt === 'number' && Number.isFinite(b.createdAt)) ? b.createdAt : 0;
    return aCreated - bCreated;
  });

  const timelineItems = [];

  scheduled.forEach((task, index) => {
    if (!task) return;
    const isCurrent = state?.activeTaskId === task.id;
    const status = taskStatus(task, state);
    const hasValidStart = typeof task.scheduledStart === 'number' && Number.isFinite(task.scheduledStart);
    const hasValidEnd = typeof task.scheduledEnd === 'number' && Number.isFinite(task.scheduledEnd);
    const startStr = hasValidStart ? formatHM(task.scheduledStart) : '';
    const endStr = hasValidEnd ? formatHM(task.scheduledEnd) : '';
    const timeLabel = startStr && endStr
      ? `${startStr} – ${endStr}`
      : startStr || (task.durationMinutes ? `${task.durationMinutes} dk Seans` : `Durak ${index + 1}`);

    // Durak öğesi
    const itemEl = h('div', { class: `route-step${task.completed ? ' is-done' : ''}${isCurrent ? ' is-active' : ''}` },
      h('div', { class: 'route-step__marker' },
        h('span', { class: 'route-step__dot' },
          task.completed ? icon('check') : isCurrent ? icon('target') : h('span', { class: 'route-step__num' }, String(index + 1)))),
      h('div', { class: 'route-step__content' },
        h('div', { class: 'route-step__header' },
          h('span', { class: 'route-step__time-badge' }, icon('clock'), timeLabel),
          h('span', { class: `badge ${status.cls}` }, icon(status.icon), status.label)),
        h('h3', { class: 'route-step__title' }, task.title || 'İsimsiz Görev'),
        task.description ? h('p', { class: 'route-step__desc' }, task.description) : null),
      h('div', { class: 'route-step__action' },
        task.completed
          ? h('span', { class: 'route-step__done-tag' }, icon('check'), 'Bitti')
          : h('button', {
              class: `btn ${isCurrent ? 'btn--primary' : 'btn--secondary'} btn--sm`,
              type: 'button',
              title: `${task.title} için odaklan`,
              onClick: () => focusTask(task.id),
            }, icon('navigation'), isCurrent ? 'Odaktasın' : 'Odaklan')));

    timelineItems.push(itemEl);

    // Ardışık iki görev arası mola göstergesi (eğer saat aralığı varsa)
    const nextTask = scheduled[index + 1];
    const curEnd = hasValidEnd ? task.scheduledEnd : null;
    const nextStart = (typeof nextTask?.scheduledStart === 'number' && Number.isFinite(nextTask.scheduledStart)) ? nextTask.scheduledStart : null;
    if (curEnd != null && nextStart != null && nextStart > curEnd) {
      const breakDuration = Math.round((nextStart - curEnd) / 60000);
      if (breakDuration > 0 && breakDuration <= 180) {
        const breakEl = h('div', { class: 'route-step route-step--break' },
          h('div', { class: 'route-step__marker' },
            h('span', { class: 'route-step__dot route-step__dot--break' }, icon('coffee'))),
          h('div', { class: 'route-step__content' },
            h('div', { class: 'route-step__break-card' },
              h('span', { class: 'route-step__break-icon' }, icon('coffee')),
              h('span', { class: 'route-step__break-text' },
                `${breakDuration} dk Dinlenme Molası · ${formatHM(curEnd)} – ${formatHM(nextStart)}`))));
        timelineItems.push(breakEl);
      }
    }
  });

  return h('section', { class: 'card route-timeline-card', 'aria-label': 'Günlük Rota Çizelgesi' },
    h('div', { class: 'route-timeline__header' },
      h('div', { class: 'route-timeline__title-group' },
        h('span', { class: 'route-timeline__icon-badge' }, icon('route')),
        h('div', {},
          h('h2', { class: 'route-timeline__title' }, 'Rota Zaman Çizelgesi'),
          h('p', { class: 'route-timeline__sub' }, 'Günün planlanmış durakları ve mola durakları'))),
      h('span', { class: 'badge badge--accent' }, `${scheduled.length} Durak Planı`)),
    h('div', { class: 'route-timeline-track' }, timelineItems));
}
