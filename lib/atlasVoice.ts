"use client";

// Hands-free "Hey Atlas" voice mode — a module-level singleton (not React
// state) on purpose: AppShell/TopBarActions remounts fresh on every
// cross-section navigation ((portal)/admin/agent are three separate
// layout.tsx files), but Next.js's app router never does a full page
// reload between them, so this module itself stays alive the whole time.
// A SpeechRecognition session living in plain component state would be
// torn down and restarted on every single navigation; one living here
// just keeps running, and each freshly-mounted AtlasAssistant re-attaches
// to it via subscribe()/getSnapshot() (see components/portal/
// TopBarActions.tsx's useSyncExternalStore call).

export type VoiceStatus =
  | "unsupported"
  | "off"
  | "standby"
  | "capturing"
  | "speaking";

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
type SpeechRecognitionWindow = typeof window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

const WAKE_PATTERN = /\b(hey|hi|ok(?:ay)?)\s+atlas\b[,.]?\s*/i;
const SILENCE_AUTO_SEND_MS = 1500;

let status: VoiceStatus = "off";
let muted = false;
let recognition: SpeechRecognitionLike | null = null;
let shouldBeListening = false; // the user's own on/off toggle
let lastResultIndex = 0;
// Text captured since the wake word fired: `capturedFinal` is every fully-
// recognized segment so far (continuous mode starts a new result index per
// pause, so a command spanning more than one pause needs these
// concatenated, not just the latest segment on its own); `captureBuffer`
// is what's actually submitted — capturedFinal plus whatever's still
// interim in the segment currently being spoken.
let capturedFinal = "";
let captureBuffer = "";
let silenceTimer: ReturnType<typeof setTimeout> | null = null;

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function getStatus() {
  return status;
}
export function getMuted() {
  return muted;
}

// Set by whichever AtlasAssistant instance is currently mounted — called
// once the wake word fires (to open the panel) and once more per
// auto-submitted command (to actually ask it). A fresh mount overwrites
// these, so only the live component ever receives them.
let onWake: (() => void) | null = null;
let onCommand: ((text: string) => void) | null = null;
export function setHandlers(handlers: {
  onWake: () => void;
  onCommand: (text: string) => void;
}) {
  onWake = handlers.onWake;
  onCommand = handlers.onCommand;
}

function clearSilenceTimer() {
  if (silenceTimer) {
    clearTimeout(silenceTimer);
    silenceTimer = null;
  }
}

function armSilenceTimer() {
  clearSilenceTimer();
  silenceTimer = setTimeout(() => {
    const text = captureBuffer.trim();
    capturedFinal = "";
    captureBuffer = "";
    if (text) onCommand?.(text);
    status = shouldBeListening ? "standby" : "off";
    notify();
  }, SILENCE_AUTO_SEND_MS);
}

function isSupported() {
  if (typeof window === "undefined") return false;
  const w = window as SpeechRecognitionWindow;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

// A short two-tone confirmation chime via the Web Audio API — no audio
// asset needed, and it's inaudible-adjacent enough not to be startling
// when "Hey Atlas" fires mid-conversation.
function playChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.15, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.2);
    });
    setTimeout(() => ctx.close(), 500);
  } catch {
    // Web Audio unavailable or blocked — the wake still works, just silently.
  }
}

function handleResult(e: SpeechRecognitionEventLike) {
  for (let i = e.resultIndex; i < e.results.length; i++) {
    if (i < lastResultIndex) continue;
    const transcript = e.results[i][0].transcript;
    const isFinal = e.results[i].isFinal;

    if (status === "standby") {
      const match = WAKE_PATTERN.exec(transcript);
      if (match) {
        playChime();
        status = "capturing";
        capturedFinal = "";
        const sameBreath = transcript.slice(match.index + match[0].length);
        captureBuffer = sameBreath;
        if (isFinal) capturedFinal = sameBreath;
        onWake?.();
        armSilenceTimer();
        notify();
      }
    } else if (status === "capturing") {
      // `transcript` is only this one segment's own text — continuous mode
      // starts a fresh result index per pause, so a command spanning more
      // than one pause needs every finalized segment concatenated, not
      // just whichever segment most recently updated.
      captureBuffer = `${capturedFinal} ${transcript}`.trim();
      if (isFinal) capturedFinal = captureBuffer;
      armSilenceTimer();
    }

    if (isFinal) lastResultIndex = i + 1;
  }
}

function startRecognitionSession() {
  const w = window as SpeechRecognitionWindow;
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) {
    status = "unsupported";
    notify();
    return;
  }
  const r = new Ctor();
  r.continuous = true;
  r.interimResults = true;
  r.lang = "en-US";
  lastResultIndex = 0;
  r.onresult = handleResult;
  // The browser silently ends a continuous session after a while
  // regardless of `continuous` — auto-restart is what actually makes this
  // "continuous" in practice, as long as the user hasn't turned hands-free
  // off and we're not mid-reply (speak() stops recognition on purpose
  // while talking, and restarts it itself when done).
  r.onend = () => {
    if (shouldBeListening && status !== "speaking") {
      startRecognitionSession();
    }
  };
  r.onerror = () => {
    // Treat like a natural end — onend fires right after in every browser
    // tested, which is what actually drives the restart-or-stop decision.
  };
  recognition = r;
  try {
    r.start();
  } catch {
    // start() throws if a session is somehow already running — harmless,
    // the existing one keeps going.
  }
}

export function enableHandsFree() {
  if (!isSupported()) {
    status = "unsupported";
    notify();
    return;
  }
  shouldBeListening = true;
  status = "standby";
  notify();
  startRecognitionSession();
}

export function disableHandsFree() {
  shouldBeListening = false;
  clearSilenceTimer();
  recognition?.stop();
  recognition = null;
  window.speechSynthesis?.cancel();
  status = "off";
  notify();
}

export function toggleMute() {
  muted = !muted;
  if (muted) window.speechSynthesis?.cancel();
  notify();
}

const SPEAK_STRIP_PATTERNS: [RegExp, string][] = [
  [/https?:\/\/\S+/g, ""], // URLs aren't speakable
  [/[*_`#]/g, ""], // markdown emphasis/heading characters
  [/^\s*[-•]\s+/gm, ""], // bullet markers, read as a plain pause instead
  [/\n{2,}/g, ". "],
  [/\n/g, ", "],
];

/** Plain text answers are already short/conversational by design (see the
 *  ask-ai route's own system prompt) — this just strips the handful of
 *  things that read fine on screen but sound wrong out loud (URLs,
 *  markdown punctuation, line breaks) rather than asking Gemini for an
 *  entirely separate spoken-vs-written response. */
export function toSpeakableText(answer: string): string {
  return SPEAK_STRIP_PATTERNS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    answer,
  ).trim();
}

export function speak(text: string, onDone: () => void) {
  if (muted || !text.trim() || typeof window.speechSynthesis === "undefined") {
    onDone();
    return;
  }
  status = "speaking";
  notify();
  // Stop listening while talking so hands-free mode doesn't hear (and
  // potentially react to) its own voice.
  recognition?.stop();
  const utterance = new SpeechSynthesisUtterance(toSpeakableText(text));
  utterance.onend = () => {
    status = shouldBeListening ? "standby" : "off";
    notify();
    if (shouldBeListening) startRecognitionSession();
    onDone();
  };
  utterance.onerror = () => {
    status = shouldBeListening ? "standby" : "off";
    notify();
    if (shouldBeListening) startRecognitionSession();
    onDone();
  };
  window.speechSynthesis.speak(utterance);
}
