/**
 * Web Audio API ile harici dosya baÄŸÄ±mlÄ±lÄ±ÄŸÄ± olmadan saf ton sentezi.
 * Hedefe varÄ±ÅŸta Ã§alan zarif, motive edici ve yumuÅŸak melodik varÄ±ÅŸ tÄ±nÄ±sÄ±.
 */
let ctx = null;

function getContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

export function playArrivalChime() {
  try {
    const audio = getContext();
    if (!audio) return;

    const now = audio.currentTime;

    // ÃœÃ§ aÅŸamalÄ± yumuÅŸak arpej (D5 -> F#5 -> A5)
    const notes = [
      { freq: 587.33, time: 0.0, dur: 0.8, vol: 0.15 },
      { freq: 739.99, time: 0.14, dur: 0.9, vol: 0.18 },
      { freq: 880.00, time: 0.28, dur: 1.2, vol: 0.22 },
    ];

    notes.forEach(({ freq, time, dur, vol }) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0.001, now + time);
      gain.gain.exponentialRampToValueAtTime(vol, now + time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

      osc.connect(gain);
      gain.connect(audio.destination);

      osc.start(now + time);
      osc.stop(now + time + dur);
    });
  } catch {
    // TarayÄ±cÄ± ses politikasÄ± sessizce yutulur
  }
}

