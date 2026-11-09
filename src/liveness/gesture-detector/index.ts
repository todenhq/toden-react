// ---------------------------------------------------------------------------
// Gesture detection from MediaPipe Face Mesh landmarks (468 points).
// Barrel — importers keep using '../liveness/gesture-detector'.
// ---------------------------------------------------------------------------

export { detectNod, detectHeadTurn, detectSmile, detectOpenMouth } from './gestures';
export { detectBlink, createBlinkState, calculateEAR, type BlinkState } from './blink';
export { checkFacePosition, type FacePosition } from './position';
