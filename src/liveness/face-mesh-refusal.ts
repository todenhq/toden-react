// ---------------------------------------------------------------------------
// Telling a source that refused a file from one that is only slow.
//
// MediaPipe downloads its model file with an XMLHttpRequest whose errors it
// only logs, so a source that answers 404 or 500 for that file leaves the
// model's start waiting for ever. The browser still records every finished
// download, with its HTTP status, in the resource timing list, and that is
// where a refusal is seen.
// ---------------------------------------------------------------------------

/** The part of a PerformanceResourceTiming entry read here. */
export interface ResourceEntryLike {
  name: string;
  /** Absent in a browser that does not report it, 0 for a network error. */
  responseStatus?: number;
}

/**
 * PURE. The first file from [base] that the source answered with an HTTP
 * error, or null. A network error (status 0) is not counted: the browser also
 * reports 0 when it does not say, so it proves nothing.
 */
export function refusedFile(base: string, entries: readonly ResourceEntryLike[]): string | null {
  const absoluteBase = absolute(base);
  const refused = entries.find(
    (entry) => entry.name.startsWith(absoluteBase) && (entry.responseStatus ?? 0) >= 400,
  );
  return refused ? refused.name : null;
}

interface ObserverLike {
  observe(options: { type: string; buffered: boolean }): void;
  disconnect(): void;
}

type ObserverConstructor = new (
  callback: (list: { getEntries(): ResourceEntryLike[] }) => void,
) => ObserverLike;

/**
 * Calls [onRefused] once, with the file's URL, when the browser reports a
 * file from [base] answered with an HTTP error. Returns the function that
 * stops watching. In a browser with no resource timing nothing is reported,
 * and the caller's stall limit is the only guard.
 */
export function watchForRefusedFile(
  base: string,
  onRefused: (file: string) => void,
  Observer: ObserverConstructor | undefined = globalPerformanceObserver(),
): () => void {
  if (!Observer) return () => undefined;
  let reported = false;
  const observer = new Observer((list) => {
    const file = refusedFile(base, list.getEntries());
    if (file === null || reported) return;
    reported = true;
    onRefused(file);
  });
  try {
    // Not buffered: a refusal from an earlier attempt must not fail this one,
    // or after one passing 503 every Try Again would fail at once. The caller
    // starts watching before the model asks for any file.
    observer.observe({ type: 'resource', buffered: false });
  } catch {
    // A browser that cannot observe resources: the stall limit still applies.
    return () => undefined;
  }
  return () => observer.disconnect();
}

function globalPerformanceObserver(): ObserverConstructor | undefined {
  const candidate = (globalThis as { PerformanceObserver?: unknown }).PerformanceObserver;
  return typeof candidate === 'function' ? (candidate as ObserverConstructor) : undefined;
}

/** A base relative to the page (an integrator's `/assets/`) as the browser reports it. */
function absolute(base: string): string {
  const location = (globalThis as { location?: { href?: string } }).location;
  try {
    return new URL(base, location?.href).href;
  } catch {
    return base;
  }
}
