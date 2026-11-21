import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  captureRejectedDetail,
  journeyClientFrom,
  journeyUpload,
  networkDetail,
  startJourneyLifecycle,
  uploadDetail,
} from './journey';
import {
  BOUNCE_MS,
  EVENT_REPEAT_MS,
  MAX_EVENTS,
  getStepLog,
  onJourneyUrgent,
  recordJourneyEvent,
  recordStep,
  resetStepLog,
  setJourneyClient,
  type JourneyEventCode,
} from './step-log';
import { livenessFailureDetail } from '../hooks/useLiveness';
import { urgentProgress } from '../hooks/useSessionProgress';
import { createVerificationApi } from '../services/api';
import type { VerificationState } from '../context/types';

// Drop-off insights on the web: what got in the way, on the step log, by
// closed code only (the shared contract with kyc-core and the mobile SDKs).

const at = (ms: number) => new Date(Date.UTC(2026, 10, 20, 9, 0, 0) + ms);

beforeEach(() => {
  resetStepLog();
  setJourneyClient(null);
});

describe('recordJourneyEvent', () => {
  it('records the code on the step the applicant is on, with a closed detail', () => {
    recordStep('liveness');
    recordJourneyEvent('liveness_failed', 'no_face', at(0));
    expect(getStepLog()?.events).toEqual([{ code: 'liveness_failed', step: 'liveness', at: at(0).toISOString(), detail: 'no_face' }]);
  });

  it('never carries free text as a detail', () => {
    recordStep('document-capture');
    recordJourneyEvent('error_shown', 'Card 4111 declined', at(0));
    recordJourneyEvent('error_shown', 'upload_failed', at(5000));
    expect(getStepLog()?.events?.map((e) => e.detail)).toEqual(['other', 'upload_failed']);
  });

  it('keeps an identical event inside two seconds once, and the same code on another step or later apart', () => {
    recordStep('liveness');
    recordJourneyEvent('camera_denied', undefined, at(0));
    recordJourneyEvent('camera_denied', undefined, at(EVENT_REPEAT_MS - 1));
    recordJourneyEvent('camera_denied', undefined, at(EVENT_REPEAT_MS + 1));
    recordStep('document-capture');
    recordJourneyEvent('camera_denied', undefined, at(EVENT_REPEAT_MS + 2));
    expect(getStepLog()?.events?.map((e) => e.step)).toEqual(['liveness', 'liveness', 'document-capture']);
  });

  it('drops a background-and-back shorter than a second (a permission sheet), and keeps a real one', () => {
    recordStep('liveness');
    recordJourneyEvent('app_backgrounded', undefined, at(0));
    recordJourneyEvent('app_foregrounded', undefined, at(BOUNCE_MS - 1));
    expect(getStepLog()?.events ?? []).toEqual([]);
    recordJourneyEvent('app_backgrounded', undefined, at(10_000));
    recordJourneyEvent('app_foregrounded', undefined, at(30_000));
    expect(getStepLog()?.events?.map((e) => e.code)).toEqual(['app_backgrounded', 'app_foregrounded']);
  });

  it('keeps the latest events past the cap', () => {
    recordStep('liveness');
    for (let i = 0; i < MAX_EVENTS + 5; i += 1) recordJourneyEvent('liveness_failed', 'no_face', at(i * 3000));
    const events = getStepLog()!.events!;
    expect(events).toHaveLength(MAX_EVENTS);
    expect(events.at(-1)!.at).toBe(at((MAX_EVENTS + 4) * 3000).toISOString());
  });

  it('carries the client on the log and clears the events per session', () => {
    setJourneyClient({ sdk: 'web', version: '4.2.0', platform: 'web', browser: 'Chrome' });
    recordStep('consent');
    recordJourneyEvent('flow_closed', undefined, at(0));
    expect(getStepLog()).toMatchObject({ client: { sdk: 'web', browser: 'Chrome' }, events: [{ code: 'flow_closed' }] });
    resetStepLog();
    expect(getStepLog()).toBeNull();
  });
});

describe('saving progress at once', () => {
  const asked: JourneyEventCode[] = [];
  let stop: () => void;
  beforeEach(() => {
    asked.length = 0;
    stop = onJourneyUrgent((code) => asked.push(code));
  });
  afterEach(() => stop());

  it('asks after a refused camera, a failed upload, Close and the page hidden', () => {
    recordStep('liveness');
    recordJourneyEvent('camera_denied', undefined, at(0));
    recordJourneyEvent('upload_failed', 'selfie', at(3000));
    recordJourneyEvent('app_backgrounded', undefined, at(6000));
    recordJourneyEvent('flow_closed', undefined, at(9000));
    recordJourneyEvent('app_foregrounded', undefined, at(12_000));
    recordJourneyEvent('code_resent', 'email', at(15_000));
    expect(asked).toEqual(['camera_denied', 'upload_failed', 'app_backgrounded', 'flow_closed']);
  });

  it('asks after a failed attempt only from the second one on', () => {
    recordStep('liveness');
    recordJourneyEvent('liveness_failed', 'no_face', at(0));
    expect(asked).toEqual([]);
    recordJourneyEvent('liveness_failed', 'timeout', at(3000));
    recordJourneyEvent('capture_rejected', 'cut_off', at(6000));
    expect(asked).toEqual(['liveness_failed']);
  });
});

describe('the client block', () => {
  it('names the browser and form factor, and trims the OS version, with no identifiers', () => {
    expect(
      journeyClientFrom({ os: { name: 'iOS', version: '18.2.1' }, browser: { name: 'Chrome iOS' }, device: { type: 'mobile' }, userAgent: 'x' }),
    ).toEqual({ sdk: 'web', version: expect.any(String), platform: 'web', os: 'iOS', osVersion: '18.2', browser: 'Chrome', formFactor: 'phone' });
    expect(journeyClientFrom({ browser: { name: 'Chrome' }, userAgent: 'Mozilla/5.0 SamsungBrowser/26.0 Chrome/122' }).browser).toBe('Samsung Internet');
    expect(journeyClientFrom({ os: { name: 'Unknown' }, browser: { name: 'Opera' } })).toEqual({
      sdk: 'web',
      version: expect.any(String),
      platform: 'web',
      browser: 'Other',
    });
  });
});

describe('the closed details', () => {
  it('names an upload by kind', () => {
    expect(uploadDetail('document_back')).toBe('document');
    expect(uploadDetail('liveness_video')).toBe('video');
    expect(uploadDetail('proof_of_address')).toBe('proof_of_address');
    expect(uploadDetail('address_photo')).toBe('other');
  });

  it('names a failed liveness attempt, a missed head movement apart from any other timeout', () => {
    expect(livenessFailureDetail('timeout', 'turnLeft')).toBe('turn_not_seen');
    expect(livenessFailureDetail('timeout', 'blink')).toBe('timeout');
    expect(livenessFailureDetail('face_lost', undefined)).toBe('no_face');
    expect(livenessFailureDetail('face_swap', undefined)).toBe('face_changed');
    expect(livenessFailureDetail('load_error', undefined)).toBeNull();
  });

  it('names a photo sent back and a network failure', () => {
    expect(captureRejectedDetail('not_complete')).toBe('cut_off');
    expect(captureRejectedDetail('no_barcode')).toBe('other');
    expect(networkDetail(Object.assign(new Error('x'), { name: 'AbortError' }), true)).toBe('timeout');
    expect(networkDetail(new TypeError('Failed to fetch'), false)).toBe('offline');
    expect(networkDetail(new TypeError('Failed to fetch'), true)).toBe('other');
  });
});

describe('journeyUpload', () => {
  it('records a failed upload once, after the retries round it, and rethrows', async () => {
    recordStep('document-capture');
    await expect(journeyUpload('document_front', () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(journeyUpload('selfie', () => Promise.resolve('med_1'))).resolves.toBe('med_1');
    expect(getStepLog()?.events?.map((e) => [e.code, e.detail])).toEqual([['upload_failed', 'document']]);
  });
});

describe('the API client', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('saves progress with keepalive when asked and small enough, and records a request that never arrived', async () => {
    const calls: RequestInit[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      calls.push(init);
      return new Response('{"saved":true}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));
    const api = createVerificationApi('https://core.test', 'pk_test');
    await api.saveProgress('hs_1', { step: 'liveness' }, { keepalive: true });
    await api.saveProgress('hs_1', { step: 'liveness', data: { big: 'x'.repeat(70 * 1024) } }, { keepalive: true });
    await api.saveProgress('hs_1', { step: 'liveness' });
    expect(calls.map((c) => c.keepalive === true)).toEqual([true, false, false]);

    recordStep('liveness');
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(api.saveProgress('hs_1', { step: 'liveness' })).rejects.toThrow('Failed to fetch');
    expect(getStepLog()?.events?.map((e) => e.code)).toEqual(['network_error']);
  });
});

describe('startJourneyLifecycle', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('records the page hidden and back, and saves once back online after a network failure', () => {
    const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' as 'visible' | 'hidden' });
    const win = new EventTarget();
    vi.stubGlobal('document', doc);
    vi.stubGlobal('window', win);
    const asked: JourneyEventCode[] = [];
    const unsubscribe = onJourneyUrgent((code) => asked.push(code));
    const stop = startJourneyLifecycle();
    recordStep('document-capture');

    doc.visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(getStepLog()?.events?.map((e) => e.code)).toEqual(['app_backgrounded']);
    expect(asked).toEqual(['app_backgrounded']);

    win.dispatchEvent(new Event('online'));
    expect(asked).toEqual(['app_backgrounded']);
    recordJourneyEvent('network_error', 'offline');
    win.dispatchEvent(new Event('online'));
    expect(asked).toEqual(['app_backgrounded', 'network_error']);

    stop();
    unsubscribe();
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(getStepLog()?.events).toHaveLength(2);
  });
});

describe('urgentProgress', () => {
  const state = (over: Partial<VerificationState>) =>
    ({
      sessionId: 'hs_1',
      sessionCancelled: null,
      sessionDeclined: null,
      currentStep: 'consent',
      openingStep: 'consent',
      mediaIds: {},
      multiIdSlotIndex: 0,
      multiIdSlots: [],
      supportingDocuments: [],
      idNumber: '',
      selectedCountry: null,
      selectedIdType: null,
      ...over,
    }) as unknown as VerificationState;

  it('saves Close on the opening screen, but nothing else before the applicant has begun', () => {
    expect(urgentProgress(state({}), 'flow_closed')?.sessionId).toBe('hs_1');
    expect(urgentProgress(state({}), 'app_backgrounded')).toBeNull();
    expect(urgentProgress(state({ currentStep: 'liveness' }), 'app_backgrounded')?.payload.step).toBe('liveness');
  });

  it('never saves without a session, or once it is submitted, cancelled or declined', () => {
    expect(urgentProgress(state({ sessionId: null }), 'flow_closed')).toBeNull();
    expect(urgentProgress(state({ currentStep: 'submitted' }), 'flow_closed')).toBeNull();
    expect(urgentProgress(state({ sessionCancelled: { message: null } as never }), 'flow_closed')).toBeNull();
  });
});
