import { afterEach, describe, expect, it, vi } from 'vitest';
import { createVerificationApi } from './api';
import { withPreviewMocks } from './preview-mock';
import { sessionDeclinedFrom } from '../lib/session-declined';

afterEach(() => {
  vi.unstubAllGlobals();
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('livenessFailed', () => {
  it('reports one failure with the session and country', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ limited: true, attemptsLeft: 2 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await createVerificationApi('https://core.example.test', 'pk_test_example').livenessFailed({
      sessionId: 'session-1',
      country: 'NG',
    });
    expect(result).toEqual({ limited: true, attemptsLeft: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://core.example.test/api/v1/liveness/failed');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ sessionId: 'session-1', country: 'NG' });
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer pk_test_example');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('maps no limit and the race answer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json({ limited: false })).mockResolvedValueOnce(json({ limited: true, attemptsLeft: 0 })));
    const api = createVerificationApi('https://core.example.test', 'hs_synthetic');
    await expect(api.livenessFailed({})).resolves.toEqual({ limited: false });
    await expect(api.livenessFailed({})).resolves.toEqual({ limited: true, attemptsLeft: 0 });
  });

  it('surfaces the decline at the limit like the contact calls do', async () => {
    const message = 'Your verification was declined after too many failed face checks.';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({
      error: 'session_declined',
      reasonCode: 'liveness_attempts_exceeded',
      message,
    }, 409)));
    const err = await createVerificationApi('https://core.example.test', 'pk_test_example')
      .livenessFailed({ sessionId: 'session-1' })
      .catch((e: unknown) => e);
    expect(err).toMatchObject({ statusCode: 409, code: 'session_declined' });
    expect(sessionDeclinedFrom(err)).toEqual({ message, reasonCode: 'liveness_attempts_exceeded', channel: null });
  });

  it('rejects on a network error, for the step to ignore', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const err = await createVerificationApi('https://core.example.test', 'pk_test_example').livenessFailed({}).catch((e: unknown) => e);
    expect(sessionDeclinedFrom(err)).toBeNull();
  });

  it('never calls the server in the builder preview', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const api = withPreviewMocks(createVerificationApi('https://core.example.test', 'pk_test_example'));
    await expect(api.livenessFailed({ sessionId: 'preview_session' })).resolves.toEqual({ limited: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
