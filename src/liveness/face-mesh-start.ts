// ---------------------------------------------------------------------------
// Starting the model from one source, and when to give that source up.
//
// A source used to have 25 seconds to download about 5 MB and start. On a
// connection slower than about 2 Mbps that is not enough: the SDK gave the
// source up while its downloads were still arriving, started the same
// downloads from the next source, which then shared the line with the first
// and missed its own 25 seconds, and the person was told liveness detection
// failed to load (reported 2026-11-18).
//
// So a source is now given up only when it fails: the model's start rejects,
// the source refuses one of the files, or nothing has finished for a long
// time. Being slow is not failing.
// ---------------------------------------------------------------------------

import { watchForRefusedFile } from './face-mesh-refusal';

/**
 * How long a source may take to download and start the model before it is
 * treated as stalled. Long enough for the download at about 0.5 Mbps; a
 * source that fails says so long before this.
 */
export const MODEL_STALL_LIMIT_MS = 120_000;

export interface ModelStartOptions {
  stallLimitMs?: number;
  watch?: typeof watchForRefusedFile;
}

/**
 * Resolves when [model] has started from [base]. Rejects when the start
 * fails, when the source refuses one of the model's files, or after the stall
 * limit. Never because the download is slow.
 */
export function startModel(
  model: { initialize: () => Promise<void> },
  base: string,
  { stallLimitMs = MODEL_STALL_LIMIT_MS, watch = watchForRefusedFile }: ModelStartOptions = {},
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    let stopWatching: () => void = () => undefined;
    const settle = (error?: Error): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      stopWatching();
      if (error) reject(error);
      else resolve();
    };

    const timer = setTimeout(
      () => settle(new Error(`Face Mesh stalled from ${base}`)),
      stallLimitMs,
    );
    // Before initialize(), which is what asks for the model's files.
    stopWatching = watch(base, (file) => settle(new Error(`Face Mesh file refused: ${file}`)));

    model.initialize().then(
      () => settle(),
      (error: unknown) => settle(error instanceof Error ? error : new Error(String(error))),
    );
  });
}
