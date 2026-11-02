'use client';

import { useEffect, useState } from 'react';

/**
 * A wide screen driven by a mouse. Width alone misjudges wide phones
 * (landscape) and emulated viewports, so the pointer must be fine too; a touch
 * device gets its touch shapes whatever its width. The same test the address
 * details sheet uses. Live: a resize or rotation re-decides.
 */
export const DESKTOP_POINTER_MQ = '(min-width: 640px) and (hover: hover) and (pointer: fine)';

export function useDesktopPointer(): boolean {
  const [desktop, setDesktop] = useState(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(DESKTOP_POINTER_MQ).matches,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(DESKTOP_POINTER_MQ);
    const apply = () => setDesktop(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return desktop;
}
