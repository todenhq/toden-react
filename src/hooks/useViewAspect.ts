'use client';

import { useLayoutEffect, useState } from 'react';

/**
 * Width over height of an element, kept current as it resizes or the phone
 * turns. Null until it has been laid out (or while `active` is false), so a
 * caller deciding something from the shape (lib/document-turn.ts) keeps its
 * default until there is a real size to go on. Measured before paint, so the
 * first frame the person sees already has the right shape.
 */
export function useViewAspect(
  ref: React.RefObject<HTMLElement | null>,
  active: boolean,
): number | null {
  const [aspect, setAspect] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!active || !el) return undefined;
    const measure = () => {
      const { clientWidth: w, clientHeight: h } = el;
      setAspect(w > 0 && h > 0 ? w / h : null);
    };
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    return () => observer?.disconnect();
  }, [ref, active]);
  return active ? aspect : null;
}
