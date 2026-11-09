// ID types that are no longer offered. MIRRORS kyc-core's RETIRED_DOCUMENTS
// (src/lib/documents/catalog.ts): change both together.
//
// NG `bvn-premium` was a second ID type for one BVN lookup with one extra
// flag; it is now the `premium` option on BVN. Old grants still carry the
// row, and a server from before it was retired still serves it, so the
// picker drops it here as well: it must never sit beside BVN again. Its
// definition stays, so a run already holding it still resolves.

const RETIRED_ID_TYPES: ReadonlySet<string> = new Set(['NG/bvn-premium']);

export function isRetiredIdType(country: string, idType: string): boolean {
  return RETIRED_ID_TYPES.has(`${country.toUpperCase()}/${idType}`);
}
