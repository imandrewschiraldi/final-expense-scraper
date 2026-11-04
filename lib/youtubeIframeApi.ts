"use client";

/**
 * Minimal surface of the YouTube IFrame Player API this app actually
 * uses — enough to build a player into a container div, read/seek its
 * playback position, and hear state changes (to catch when it ends). The
 * full API surface is much larger; typing only what's called here keeps
 * this honest about what's in use.
 */
export type YTPlayer = {
  getCurrentTime(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
};

type YTPlayerState = { ENDED: number; PLAYING: number };

type YTNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      width?: string | number;
      height?: string | number;
      playerVars?: { rel?: 0 | 1; modestbranding?: 0 | 1 };
      events: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
      };
    },
  ) => YTPlayer;
  PlayerState: YTPlayerState;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

/** Loads youtube.com/iframe_api once per page (cached across every lesson
 *  a viewer opens in the same session) and resolves with the `YT`
 *  namespace once it's ready to construct players. */
export function loadYoutubeIframeApi(): Promise<YTNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube IFrame API requires a browser."));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve(window.YT!);
    };
    if (
      !document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]',
      )
    ) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }
  });
  return apiPromise;
}
