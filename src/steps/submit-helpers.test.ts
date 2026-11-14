import { describe, expect, it, vi } from 'vitest';
import { uploadCaptureVideos } from './submit-helpers';

// A document recording is uploaded when it is made, so a session resumed later
// (no blob in memory any more) still submits it. The submit uses that id and
// never uploads the recording a second time.
describe('uploadCaptureVideos', () => {
  const api = () => ({ upload: vi.fn(async (_b: Blob, type: string) => `new_${type}`) });

  it('uses a recording uploaded at capture, with no blob in memory after a resume', async () => {
    const a = api();
    const ids = await uploadCaptureVideos(a as never, { documentFrontVideoBlob: null, documentBackVideoBlob: null, livenessVideoBlob: null }, { documentFrontVideo: 'med_front' });
    expect(ids.documentFrontVideo).toBe('med_front');
    expect(a.upload).not.toHaveBeenCalled();
  });

  it('never uploads a recording twice, and still uploads one that was not', async () => {
    const a = api();
    const blob = new Blob(['x'], { type: 'video/webm' });
    const ids = await uploadCaptureVideos(a as never, { documentFrontVideoBlob: blob, documentBackVideoBlob: blob, livenessVideoBlob: null }, { documentFrontVideo: 'med_front' });
    expect(ids).toMatchObject({ documentFrontVideo: 'med_front', documentBackVideo: 'new_document_back_video' });
    expect(a.upload).toHaveBeenCalledTimes(1);
  });
});
