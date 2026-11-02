import { useEffect, useRef } from 'react';
import { VerificationError } from '../types/verification';

/**
 * Fire `onError` with `invalid_workflow` ONCE when the workflow is a business
 * workflow carrying a biometric scope (lib/scope.ts unsupportedScopeConfig).
 * The modal shows the configuration error in its place; no step runs.
 */
export function useReportUnsupportedScope(
  unsupported: boolean,
  onError: ((error: VerificationError) => void) | undefined,
  message: string,
): void {
  const reported = useRef(false);
  useEffect(() => {
    if (!unsupported || reported.current) return;
    reported.current = true;
    try {
      onError?.(new VerificationError('invalid_workflow', message));
    } catch {
      /* a consumer's handler must never break the flow */
    }
  }, [unsupported, onError, message]);
}
