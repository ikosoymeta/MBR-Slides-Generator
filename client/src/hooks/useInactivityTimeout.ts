import { useEffect, useRef, useState, useCallback } from "react";

interface UseInactivityTimeoutOptions {
  /** Whether the timeout is active (e.g., only when in edit mode) */
  isActive: boolean;
  /** Inactivity duration before warning (ms). Default: 15 minutes */
  warningAfterMs?: number;
  /** Time to respond to warning before auto-exit (ms). Default: 3 minutes */
  graceMs?: number;
  /** Called when the grace period expires without user response */
  onTimeout: () => void;
}

interface UseInactivityTimeoutReturn {
  /** Whether the warning dialog should be shown */
  showWarning: boolean;
  /** Seconds remaining in the grace period */
  remainingSeconds: number;
  /** Call this when the user confirms they want to continue */
  continueSession: () => void;
  /** Call this to manually reset the inactivity timer (e.g., on user interaction) */
  resetTimer: () => void;
}

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const THREE_MINUTES = 3 * 60 * 1000;

export function useInactivityTimeout({
  isActive,
  warningAfterMs = FIFTEEN_MINUTES,
  graceMs = THREE_MINUTES,
  onTimeout,
}: UseInactivityTimeoutOptions): UseInactivityTimeoutReturn {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(Math.floor(graceMs / 1000));

  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const graceEndRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const clearAllTimers = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (graceTimerRef.current) clearInterval(graceTimerRef.current);
    if (graceEndRef.current) clearTimeout(graceEndRef.current);
    inactivityTimerRef.current = null;
    graceTimerRef.current = null;
    graceEndRef.current = null;
  }, []);

  const startGracePeriod = useCallback(() => {
    setShowWarning(true);
    setRemainingSeconds(Math.floor(graceMs / 1000));

    const startTime = Date.now();
    graceTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.floor((graceMs - elapsed) / 1000));
      setRemainingSeconds(remaining);
    }, 1000);

    graceEndRef.current = setTimeout(() => {
      clearAllTimers();
      setShowWarning(false);
      onTimeoutRef.current();
    }, graceMs);
  }, [graceMs, clearAllTimers]);

  const startInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      startGracePeriod();
    }, warningAfterMs);
  }, [warningAfterMs, startGracePeriod]);

  const resetTimer = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    if (isActive) {
      startInactivityTimer();
    }
  }, [isActive, clearAllTimers, startInactivityTimer]);

  const continueSession = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  // Start/stop based on isActive
  useEffect(() => {
    if (isActive) {
      startInactivityTimer();

      // Listen for user activity to reset the timer
      const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];
      const handleActivity = () => {
        // Only reset if warning is not showing (don't reset during grace period)
        if (!graceTimerRef.current) {
          if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
          startInactivityTimer();
        }
      };

      events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));

      return () => {
        clearAllTimers();
        events.forEach((e) => window.removeEventListener(e, handleActivity));
      };
    } else {
      clearAllTimers();
      setShowWarning(false);
    }
  }, [isActive, startInactivityTimer, clearAllTimers]);

  return {
    showWarning,
    remainingSeconds,
    continueSession,
    resetTimer,
  };
}
