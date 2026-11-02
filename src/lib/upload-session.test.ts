import { afterEach, describe, expect, it } from 'vitest';
import { appendUploadSession, setUploadSessionId } from './upload-session';

afterEach(() => setUploadSessionId(null));

describe('upload session', () => {
  it('names the started session on every upload', () => {
    setUploadSessionId('ses_123');
    const form = new FormData();
    appendUploadSession(form);
    expect(form.get('sessionId')).toBe('ses_123');
  });

  it('names nothing before a session starts', () => {
    const form = new FormData();
    appendUploadSession(form);
    expect(form.get('sessionId')).toBeNull();
  });
});
