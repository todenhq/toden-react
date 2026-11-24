'use client';

import { useState, useEffect } from 'react';

export type CameraPrimerStatus = 'checking' | 'needed' | 'granted';

/**
 * Best-effort detection of whether we still need to *prompt* for camera access.
 *
 * When the Permissions API reports the camera as already granted we skip the
 * priming screen and start the camera straight away. Otherwise (prompt, denied,
 * or the API is unsupported) we show the "Allow camera access" primer first, so
 * the user knows the native OS prompt is coming and is primed to accept it.
 * The actual `getUserMedia` request (and therefore
 * the OS prompt) still only fires once the user taps "Grant access".
 */
export function useCameraPrimer(): CameraPrimerStatus {
  const [status, setStatus] = useState<CameraPrimerStatus>('checking');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const perms = navigator.permissions;
        if (!perms?.query) {
          if (!cancelled) setStatus('needed');
          return;
        }
        // `'camera'` isn't in the TS PermissionName union but is widely supported.
        const result = await perms.query({ name: 'camera' as PermissionName });
        if (!cancelled) setStatus(result.state === 'granted' ? 'granted' : 'needed');
      } catch {
        // Unsupported (e.g. Firefox) or threw — fall back to showing the primer.
        if (!cancelled) setStatus('needed');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
