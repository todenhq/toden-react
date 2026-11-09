'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Whether a step's photo camera (components/PhotoCamera.tsx) is open, and for
 * what. The step renders the camera while `open` and hides its own content
 * underneath it, so nothing it holds is lost.
 *
 * Focus goes back to whatever opened the camera when it closes: it is taken
 * at `show`, before the camera has hidden it.
 */
export function usePhotoCamera<T = null>() {
  const [state, setState] = useState<{ open: boolean; target: T | null }>({ open: false, target: null });
  const triggerRef = useRef<HTMLElement | null>(null);

  const show = useCallback((target: T) => {
    const active = typeof document === 'undefined' ? null : document.activeElement;
    triggerRef.current = active instanceof HTMLElement ? active : null;
    setState({ open: true, target });
  }, []);

  const dismiss = useCallback(() => {
    setState((prev) => (prev.open ? { ...prev, open: false } : prev));
  }, []);

  useEffect(() => {
    if (state.open) return;
    const trigger = triggerRef.current;
    triggerRef.current = null;
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  }, [state.open]);

  return { open: state.open, target: state.target, show, dismiss };
}
