"use client";

// Per-device mute preference — same localStorage + custom-event pattern as
// useWideLayout, but read directly here (not via the React hook) since
// playClickSound()/playNotificationSound() are called from plain DOM event
// listeners, not component render.
const SOUND_ENABLED_KEY = "portal-sound-enabled";
export const SOUND_ENABLED_EVENT = "portal-sound-enabled-change";

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(SOUND_ENABLED_KEY);
  // On by default — unset means nobody has muted it on this device yet.
  return stored === null ? true : stored === "true";
}

export function setSoundEnabled(next: boolean) {
  localStorage.setItem(SOUND_ENABLED_KEY, String(next));
  window.dispatchEvent(new Event(SOUND_ENABLED_EVENT));
}

// Synthesized tones via Web Audio instead of shipping audio file assets —
// a few milliseconds of oscillator output is plenty for a UI click/chime
// and needs no hosting, loading, or format concerns. Lazily created and
// reused (browsers cap how many AudioContexts can exist), and resumed on
// every play since Safari/Chrome suspend it until a user gesture — which a
// click handler always is, so this is never blocked in practice.
let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) sharedContext = new Ctor();
  if (sharedContext.state === "suspended") sharedContext.resume().catch(() => {});
  return sharedContext;
}

function playTone(freq: number, durationSec: number, opts: { type?: OscillatorType; gain?: number; delaySec?: number } = {}) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const startAt = ctx.currentTime + (opts.delaySec ?? 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.value = freq;
  // Exponential ramp can't start exactly at 0, and a hard on/off would
  // click/pop — a short attack/decay envelope keeps the tone a soft blip.
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(opts.gain ?? 0.08, startAt + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + durationSec + 0.02);
}

/** A soft, short blip for clicking buttons, links, toggles, tabs, etc. */
export function playClickSound() {
  if (!isSoundEnabled()) return;
  playTone(980, 0.045, { gain: 0.045 });
}

/** A two-note chime for a new notification (bell or chat arrival). */
export function playNotificationSound() {
  if (!isSoundEnabled()) return;
  playTone(880, 0.12, { gain: 0.08 });
  playTone(1318.5, 0.16, { gain: 0.08, delaySec: 0.09 });
}
