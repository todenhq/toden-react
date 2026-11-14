import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

import { initialVerificationState, verificationReducer } from '../context/VerificationContext';
import type { VerificationState } from '../context/types';
import { uploadCaptureVideos } from '../steps/submit-helpers';
import { emptyRecordingCaptures, isCurrentCapture, renewCapture } from './document-recordings';

// A side's recording must be the recording of the photo submitted for that side:
// the server compares the two to catch an injected capture.
//
// A recording is uploaded as soon as it stops, and the id it gets is preferred
// over the recording itself at submit. So an id left from an earlier capture of
// the side (restored with a resumed session, or an upload that landed after a
// retake) beat the new capture's recording, or rode along with a photo picked
// from the device that has no recording at all.

const blob = (name: string) => new Blob([name], { type: 'video/webm' });

const api = () => ({ upload: vi.fn(async (_b: Blob, type: string) => `new_${type}`) });

/** What the submit step sends for the document recordings. */
async function submitted(state: VerificationState, a = api()) {
  return uploadCaptureVideos(
    a as never,
    {
      documentFrontVideoBlob: state.documentFrontVideoBlob,
      documentBackVideoBlob: state.documentBackVideoBlob,
      livenessVideoBlob: null,
    },
    { documentFrontVideo: state.mediaIds.documentFrontVideo, documentBackVideo: state.mediaIds.documentBackVideo },
  );
}

const resumed = (): VerificationState =>
  verificationReducer(initialVerificationState, {
    type: 'RESTORE_PROGRESS',
    payload: {
      step: 'document-capture',
      mediaIds: {
        documentFront: 'med_old_front',
        documentFrontVideo: 'med_old_front_video',
        documentBack: 'med_old_back',
        documentBackVideo: 'med_old_back_video',
      },
    },
  } as never);

describe('a side submits only its own recording', () => {
  it('a resumed session captured again submits the new recording, even when its early upload failed', async () => {
    let state = resumed();
    // The front's camera starts: a new capture of the front.
    state = verificationReducer(state, { type: 'CLEAR_DOCUMENT_VIDEO', payload: 'front' });
    // Its recording stops; the early upload fails, so only the blob is held.
    state = verificationReducer(state, { type: 'SET_DOCUMENT_FRONT_VIDEO', payload: blob('new front') });

    const ids = await submitted(state);
    expect(ids.documentFrontVideo).toBe('new_document_front_video');
    // The back was not captured again, so its own pair stands.
    expect(ids.documentBackVideo).toBe('med_old_back_video');
  });

  it('a photo picked from the device submits no recording for that side', async () => {
    let state = resumed();
    state = verificationReducer(state, { type: 'CLEAR_DOCUMENT_VIDEO', payload: 'back' });
    state = verificationReducer(state, { type: 'SET_DOCUMENT_BACK', payload: 'data:image/jpeg;base64,BACK' });
    const ids = await submitted(state);
    expect(ids.documentBackVideo).toBeUndefined();
  });

  it('a retake drops the side recording and its id', async () => {
    let state = verificationReducer(initialVerificationState, { type: 'SET_DOCUMENT_FRONT_VIDEO', payload: blob('take 1') });
    state = verificationReducer(state, {
      type: 'SET_MEDIA_ID',
      payload: { mediaType: 'documentFrontVideo', mediaId: 'med_take_1' },
    });
    state = verificationReducer(state, { type: 'CLEAR_DOCUMENT_FRONT' });
    expect(state.documentFrontVideoBlob).toBeNull();
    expect(state.mediaIds.documentFrontVideo).toBeUndefined();
  });

  it('a new capture makes an upload still in flight for the old one stale', () => {
    const captures = emptyRecordingCaptures();
    const take1 = renewCapture(captures, 'front');
    const back = renewCapture(captures, 'back');
    expect(isCurrentCapture(captures, 'front', take1)).toBe(true);
    renewCapture(captures, 'front'); // retaken
    expect(isCurrentCapture(captures, 'front', take1)).toBe(false);
    // Per side: retaking the front never drops the back's upload.
    expect(isCurrentCapture(captures, 'back', back)).toBe(true);
  });
});

describe('the capture step renews a side capture whenever a new one begins', () => {
  const src = readFileSync(new URL('../steps/DocumentCaptureStep.tsx', import.meta.url).pathname, 'utf8');

  it('when its recording starts', () => {
    expect(src).toMatch(
      /const token = renewCapture\(recordingTokenRef\.current, sideAtStart\);\s*dispatch\(\{ type: "CLEAR_DOCUMENT_VIDEO", payload: sideAtStart \}\);/,
    );
  });

  it('when a photo comes from the device', () => {
    expect(src).toMatch(
      /if \(source === "upload"\) \{\s*renewCapture\(recordingTokenRef\.current, phase\);\s*dispatch\(\{ type: "CLEAR_DOCUMENT_VIDEO", payload: phase \}\);/,
    );
  });

  it('when the side is retaken', () => {
    expect(src).toMatch(/const retakeFront = [\s\S]*?renewCapture\(recordingTokenRef\.current, "front"\)/);
    expect(src).toMatch(/const retakeBack = [\s\S]*?renewCapture\(recordingTokenRef\.current, "back"\)/);
  });

  it('keeps a stale recording and its upload out of the state', () => {
    const onstop = src.slice(src.indexOf('recorder.onstop = () => {'));
    expect(onstop).toMatch(/^recorder\.onstop = \(\) => \{\s*if \(!isCurrentCapture\(recordingTokenRef\.current, sideAtStart, token\)\) return;/);
    expect(src).toMatch(/\(mediaId\) => \{\s*if \(!isCurrentCapture\(recordingTokenRef\.current, sideAtStart, token\)\) return;/);
  });

  it('drops a back left from a two-sided ID when the document is one-sided', () => {
    expect(src).toMatch(/if \(!isTwoSided && \(state\.documentBackImage[^\n]*\) \{\s*dispatch\(\{ type: "CLEAR_DOCUMENT_BACK" \}\);/);
    const cleared = verificationReducer(
      { ...initialVerificationState, mediaIds: { documentBack: 'med_card_back', documentBackVideo: 'med_card_back_video' } },
      { type: 'CLEAR_DOCUMENT_BACK' },
    );
    expect(cleared.mediaIds).not.toMatchObject({ documentBack: expect.anything() });
    expect(cleared.mediaIds.documentBackVideo).toBeUndefined();
  });

  it('keeps each recording in its own chunks', () => {
    expect(src).not.toContain('docChunksRef');
    expect(src).toContain('let chunks: Blob[] = [];');
  });
});
