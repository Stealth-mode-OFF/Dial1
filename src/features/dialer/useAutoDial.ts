// ═══════════════════════════════════════════════════════════════
// useAutoDial — auto-dial countdown after no-answer
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from "react";
import { AUTO_DIAL_SECONDS } from "./config";

export function useAutoDial(onNextAndCall: () => void) {
  const [countdown, setCountdown] = useState(0);
  const [queued, setQueued] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** Start the auto-dial countdown */
  const startCountdown = useCallback(() => {
    clearTimer();
    setCountdown(AUTO_DIAL_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearTimer();
          setQueued(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  /** Pause / cancel the countdown */
  const pause = useCallback(() => {
    clearTimer();
    setCountdown(0);
  }, [clearTimer]);

  /** Skip and immediately dial next */
  const skipToNext = useCallback(() => {
    pause();
    onNextAndCall();
  }, [pause, onNextAndCall]);

  /** Reset when changing contacts */
  const reset = useCallback(() => {
    clearTimer();
    setCountdown(0);
    setQueued(false);
  }, [clearTimer]);

  // Fire queued auto-dial
  useEffect(() => {
    if (!queued) return;
    setQueued(false);
    onNextAndCall();
  }, [queued, onNextAndCall]);

  // Cleanup on unmount
  useEffect(() => () => clearTimer(), [clearTimer]);

  return { countdown, startCountdown, pause, skipToNext, reset };
}
