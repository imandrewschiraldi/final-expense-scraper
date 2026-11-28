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
// Once real command speech has started, how long a pause before auto-
// submitting. Right after the wake word fires with nothing said yet, a much
// longer grace period applies instead (see armSilenceTimer) — the chime cue
// plus a beat to take a breath and actually start the question is normal,
// and the old single short timeout fired during exactly that beat, kicking
// back to standby before the user had said anything.
const SILENCE_AUTO_SEND_MS = 2200;
const WAKE_GRACE_MS = 4500;
// Once a conversation is open (the wake word has fired at least once),
// how long a total stretch of user silence is tolerated before the wake
// word is required again — lets a multi-question conversation happen off
// one "Hey Atlas" instead of needing it before every single question.
const CONVERSATION_TIMEOUT_MS = 30000;
const STORAGE_KEY = "atlas-hands-free-enabled";

let status: VoiceStatus = "off";
let muted = false;
let recognition: SpeechRecognitionLike | null = null;
let shouldBeListening = false; // the user's own on/off toggle
// True from the moment the wake word fires until either 30s of silence
// passes or hands-free is turned off entirely — while true, handleResult
// treats any speech as the next turn directly, skipping the wake-word check.
let conversationActive = false;
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
let conversationTimer: ReturnType<typeof setTimeout> | null = null;

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
export function getConversationActive() {
  return conversationActive;
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
  const delay = captureBuffer.trim() ? SILENCE_AUTO_SEND_MS : WAKE_GRACE_MS;
  silenceTimer = setTimeout(() => {
    const text = captureBuffer.trim();
    capturedFinal = "";
    captureBuffer = "";
    if (text) onCommand?.(text);
    status = shouldBeListening ? "standby" : "off";
    notify();
  }, delay);
}

function clearConversationTimer() {
  if (conversationTimer) {
    clearTimeout(conversationTimer);
    conversationTimer = null;
  }
}

// (Re)starts the 30-second "has the user gone quiet" clock — called on
// every bit of recognized speech, on wake, and once more each time Atlas
// finishes speaking (so time spent listening to Atlas's own reply never
// counts against the user's 30 seconds).
function armConversationTimer() {
  clearConversationTimer();
  conversationTimer = setTimeout(() => {
    conversationActive = false;
    if (status !== "speaking") {
      status = shouldBeListening ? "standby" : "off";
      notify();
    }
  }, CONVERSATION_TIMEOUT_MS);
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

    if (status === "standby" && conversationActive) {
      // A conversation is already open (the wake word fired at some point
      // in the last 30 seconds of actual silence) — treat this speech as
      // the next turn directly, no wake word needed.
      status = "capturing";
      capturedFinal = "";
      captureBuffer = transcript;
      if (isFinal) capturedFinal = transcript;
      armSilenceTimer();
      armConversationTimer();
      notify();
    } else if (status === "standby") {
      const match = WAKE_PATTERN.exec(transcript);
      if (match) {
        playChime();
        status = "capturing";
        conversationActive = true;
        capturedFinal = "";
        const sameBreath = transcript.slice(match.index + match[0].length);
        captureBuffer = sameBreath;
        if (isFinal) capturedFinal = sameBreath;
        onWake?.();
        armSilenceTimer();
        armConversationTimer();
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
      armConversationTimer();
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

function persistEnabled(enabled: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // Private browsing / storage disabled — hands-free just won't
    // auto-resume on the next load, nothing else is affected.
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
  persistEnabled(true);
}

export function disableHandsFree() {
  shouldBeListening = false;
  conversationActive = false;
  clearSilenceTimer();
  clearConversationTimer();
  recognition?.stop();
  recognition = null;
  window.speechSynthesis?.cancel();
  status = "off";
  notify();
  persistEnabled(false);
}

// Called once from the first AtlasAssistant that mounts on a fresh page
// load — resumes hands-free automatically if the user had it on last time,
// so it stays "always on" across reloads/new tabs instead of needing a
// fresh click every time. Guarded so it only actually runs once per page
// load even though every mount across (portal)/admin/agent layouts calls it.
let autoStartAttempted = false;
export function resumeHandsFreeIfPreviouslyEnabled() {
  if (autoStartAttempted || typeof window === "undefined") return;
  autoStartAttempted = true;
  try {
    if (window.localStorage.getItem(STORAGE_KEY) === "1") {
      enableHandsFree();
    }
  } catch {
    // Storage unavailable — just stays off until manually enabled.
  }
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

// The browser's absolute-default voice (often an old low-quality local
// engine, e.g. "Microsoft David" on Windows or eSpeak on Linux) is what
// reads as the "robot voice" — browsers ship much better voices too, they
// just aren't picked unless asked for by name/property. getVoices() is
// also notoriously empty until the async 'voiceschanged' event fires on
// first load, so the pick is cached and re-attempted on that event rather
// than looked up fresh (and wrongly empty) on every speak() call.
let resolvedVoice: SpeechSynthesisVoice | null = null;
let voiceListenerAttached = false;

function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const byNamePattern = (pattern: RegExp) => voices.find((v) => pattern.test(v.name));
  return (
    byNamePattern(/Natural/i) || // Edge's "Microsoft ... Online (Natural)" voices — the best available when present
    byNamePattern(/Google US English/i) || // Chrome's higher-quality network voice
    byNamePattern(/Samantha/i) || // macOS/Safari's good default
    voices.find((v) => v.lang === "en-US" && !v.localService) || // any other non-local (network) en-US voice
    voices.find((v) => v.lang.startsWith("en")) ||
    voices[0]
  );
}

function ensureVoiceResolved() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  if (!voiceListenerAttached) {
    voiceListenerAttached = true;
    window.speechSynthesis.onvoiceschanged = () => {
      resolvedVoice = pickBestVoice(window.speechSynthesis.getVoices());
    };
  }
  if (!resolvedVoice) {
    resolvedVoice = pickBestVoice(window.speechSynthesis.getVoices());
  }
}

if (typeof window !== "undefined") {
  // Kick off voice loading as soon as this module runs client-side, so a
  // voice is already resolved by the time the first reply needs speaking
  // rather than falling back to the default on that first call.
  ensureVoiceResolved();
}

export function speak(text: string, onDone: () => void) {
  if (muted || !text.trim() || typeof window.speechSynthesis === "undefined") {
    onDone();
    return;
  }
  ensureVoiceResolved();
  status = "speaking";
  notify();
  // Stop listening while talking so hands-free mode doesn't hear (and
  // potentially react to) its own voice. Also pause the 30s conversation
  // clock for the same reason it stops listening — time spent on Atlas's
  // own reply isn't user silence and shouldn't count against their window
  // to respond; it's restarted fresh in onend/onerror below instead.
  recognition?.stop();
  clearConversationTimer();
  const utterance = new SpeechSynthesisUtterance(toSpeakableText(text));
  if (resolvedVoice) utterance.voice = resolvedVoice;
  utterance.rate = 1.03;
  utterance.onend = () => {
    status = shouldBeListening ? "standby" : "off";
    notify();
    if (shouldBeListening) {
      startRecognitionSession();
      if (conversationActive) armConversationTimer();
    }
    onDone();
  };
  utterance.onerror = () => {
    status = shouldBeListening ? "standby" : "off";
    notify();
    if (shouldBeListening) {
      startRecognitionSession();
      if (conversationActive) armConversationTimer();
    }
    onDone();
  };
  window.speechSynthesis.speak(utterance);
}
