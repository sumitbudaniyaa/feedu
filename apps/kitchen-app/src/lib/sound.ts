/**
 * New-order chime via the Web Audio API (no asset needed).
 * Browsers block audio until a user gesture, so we lazily create/resume the
 * AudioContext on the first interaction (the kitchen login click suffices).
 */
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Warm up the audio context — call from a user gesture (e.g. sign-in). */
export function primeSound() {
  getCtx();
}

/** Pleasant two-note "ding-dong" to announce a new order. */
export function playNewOrderChime() {
  const audio = getCtx();
  if (!audio) return;
  const now = audio.currentTime;
  const notes = [
    { freq: 880, at: 0 },
    { freq: 1244.5, at: 0.16 },
  ];
  for (const { freq, at } of notes) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(audio.destination);
    const t = now + at;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    osc.start(t);
    osc.stop(t + 0.5);
  }
}
