// The NIN slip is NIN read from paper (kyc-core and the builder merged them,
// 2026-11-07): a workflow offers one or the other, as the builder's NIN Slip
// switch says. A workflow built before the merge may list both; then only the
// slip is offered, as the builder now reads that workflow, so the picker never
// shows "NIN" beside "NIN (Slip)".

export function withoutNinBesideSlip<T extends { key: string }>(country: string, types: T[]): T[] {
  if (country.toUpperCase() !== 'NG' || !types.some((t) => t.key === 'nin-slip')) return types;
  return types.filter((t) => t.key !== 'nin');
}
