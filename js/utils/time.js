const pad = (n) => String(n).padStart(2, '0');

/** 1500 → "25:00" */
export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

/** 90 → "1 sa 30 dk", 25 → "25 dk" */
export function formatMinutes(minutes) {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} dk`;
  return m ? `${h} sa ${m} dk` : `${h} sa`;
}

/** timestamp → "09:30" (yerel saat) */
export function formatHM(ts) {
  if (ts == null || !Number.isFinite(ts)) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "09:30" → bugünün yerel saatiyle timestamp; geçersizse null */
export function timeInputToTimestamp(value) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? '').trim());
  if (!m) return null;
  const d = new Date();
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d.getTime();
}

/** Planlanan saat aralığını okunur metne çevirir; yoksa null */
export function formatSchedule(start, end) {
  const validStart = typeof start === 'number' && Number.isFinite(start);
  const validEnd = typeof end === 'number' && Number.isFinite(end);
  if (validStart && validEnd) return `${formatHM(start)} – ${formatHM(end)}`;
  if (validStart) return `${formatHM(start)} başlangıç`;
  if (validEnd) return `${formatHM(end)} bitiş`;
  return null;
}

