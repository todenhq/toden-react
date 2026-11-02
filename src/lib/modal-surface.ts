'use client';

import { createContext, useContext } from 'react';

/**
 * The SDK window itself (the modal's content element), for a dialog that must
 * sit INSIDE the flow rather than over the whole page. A fixed element is a
 * containing block, so an `absolute inset-0` child covers exactly the window.
 * Null outside the modal (the hosted page), where the page is the window.
 */
export const ModalSurfaceContext = createContext<HTMLElement | null>(null);

export function useModalSurface(): HTMLElement | null {
  return useContext(ModalSurfaceContext);
}
