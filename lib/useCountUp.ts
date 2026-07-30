import { useEffect, useRef, useState } from "react";

const DURATION_MS = 800;

function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/** Animates a number from its previous value to `target` over ~800ms. */
export function useCountUp(target: number | undefined) {
  const [displayed, setDisplayed] = useState(target ?? 0);
  const fromRef = useRef(target ?? 0);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (target === undefined) return;
    const targetValue = target;
    const from = fromRef.current;
    const delta = targetValue - from;
    if (delta === 0) return;

    const start = performance.now();
    function tick(now: number) {
      const t = Math.min(1, (now - start) / DURATION_MS);
      setDisplayed(from + delta * easeOutExpo(t));
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = targetValue;
      }
    }
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target]);

  return target === undefined ? undefined : displayed;
}
