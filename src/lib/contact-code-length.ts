// The length to size the code field to once a code is out. The server decides it
// from the pinned workflow and says so; anything but a length it could have sent
// (an older server sends nothing) falls back to the configured one.
// Mirrored by the React Native and Flutter SDKs.

const MIN_CODE_LENGTH = 4;
const MAX_CODE_LENGTH = 8;

export function sentCodeLength(sent: unknown, configured: number): number {
  return typeof sent === 'number' && Number.isInteger(sent) && sent >= MIN_CODE_LENGTH && sent <= MAX_CODE_LENGTH
    ? sent
    : configured;
}
