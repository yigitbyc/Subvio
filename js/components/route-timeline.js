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

  // Planlanmış saatli görevleri öncelikli sırala, yoksa oluşturulma sırasına göre al
  const scheduled = [...tasks].sort((a, b) => {
    if (a.scheduledStart && b.scheduledStart) return a.scheduledStart - b.scheduledStart;
    if (a.scheduledStart) return -1;
    if (b.scheduledStart) return 1;
    return a.createdAt - b.createdAt;
  });

  const timelineItems = [];

  scheduled.forEach((task, index) => {
    const isCurrent = state.activeTaskId === task.id;
    const status = taskStatus(task, state);
    const startStr = task.scheduledStart ? formatHM(task.scheduledStart) : '';
    const endStr = task.scheduledEnd ? formatHM(task.scheduledEnd) : '';
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
        h('h3', { class: 'route-step__title' }, task.title),
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
    if (nextTask && task.scheduledEnd && nextTask.scheduledStart && nextTask.scheduledStart > task.scheduledEnd) {
      const breakDuration = Math.round((nextTask.scheduledStart - task.scheduledEnd) / 60000);
      if (breakDuration > 0 && breakDuration <= 60) {
        const breakEl = h('div', { class: 'route-step route-step--break' },
          h('div', { class: 'route-step__marker' },
            h('span', { class: 'route-step__dot route-step__dot--break' }, icon('coffee'))),
          h('div', { class: 'route-step__content' },
            h('div', { class: 'route-step__break-card' },
              h('span', { class: 'route-step__break-icon' }, icon('coffee')),
              h('span', { class: 'route-step__break-text' },
                `${breakDuration} dk Dinlenme Molası · ${formatHM(task.scheduledEnd)} – ${formatHM(nextTask.scheduledStart)}`))));
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
