// node:fs / node:path are declared in node-builtins.d.ts (no @types/node here).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BUSINESS_SEARCH_REFUSALS,
  businessSearchQuery,
  businessSearchRefusal,
  nameSearchOffered,
  businessPickView,
} from './business-search';
import { BUSINESS_DOCUMENT_LABELS, businessDocumentLabel } from './business-labels';
import { VerificationApiError } from '../services/api';

const SRC = join(new URL('..', import.meta.url).pathname);
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');

describe('business search request', () => {
  it('sends the attempt session, the same id the register check sends', () => {
    const qs = new URLSearchParams(
      businessSearchQuery({ country: 'GH', query: 'Acme', limit: 50, sessionId: 'sess_1' }),
    );
    expect(qs.get('sessionId')).toBe('sess_1');
    expect(qs.get('country')).toBe('GH');
    expect(qs.get('query')).toBe('Acme');
    expect(qs.get('limit')).toBe('50');
  });

  it('leaves the session out when there is none', () => {
    const qs = new URLSearchParams(businessSearchQuery({ country: 'NG', query: 'Acme', sessionId: null }));
    expect(qs.has('sessionId')).toBe(false);
  });

  it('is what the API client and the search component send', () => {
    expect(read('services/api.ts')).toContain('/business/search?${businessSearchQuery(params)}');
    expect(read('components/BusinessSearch.tsx')).toMatch(/businessSearch\(\{[\s\S]*sessionId,[\s\S]*\}\)/);
    expect(read('steps/BusinessDetailsStep.tsx')).toContain('sessionId={state.sessionId}');
  });
});

describe('business search refusals', () => {
  const err = (code: string, message?: string) =>
    new VerificationApiError(message ?? 'x', 400, code, message ? { error: code, message } : { error: code });

  it('moves the applicant to number entry on every refusal, with the server message', () => {
    for (const code of [
      'business_search_disabled',
      'session_required',
      'insufficient_credits',
      'search_limit_reached',
      'pricing_not_configured',
    ]) {
      expect(BUSINESS_SEARCH_REFUSALS).toContain(code);
      expect(businessSearchRefusal(err(code, 'Enter the registration number.'))).toEqual({
        code,
        message: 'Enter the registration number.',
      });
    }
  });

  it('keeps the search for an outage or a throttle, which can be retried', () => {
    expect(businessSearchRefusal(err('search_unavailable'))).toBeNull();
    expect(businessSearchRefusal(err('search_rate_limited'))).toBeNull();
    expect(businessSearchRefusal(new Error('network'))).toBeNull();
    expect(businessSearchRefusal(null)).toBeNull();
  });

  it('has no message when the server sent none', () => {
    expect(businessSearchRefusal(err('session_required'))).toEqual({ code: 'session_required', message: null });
  });

  it('is acted on by the search component and the details step', () => {
    expect(read('components/BusinessSearch.tsx')).toContain('onRefused(refusal.message)');
    expect(read('steps/BusinessDetailsStep.tsx')).toMatch(/onRefused=\{[\s\S]*setSearchRefused\(/);
  });
});

describe('workflow switch for search by name', () => {
  it('is on unless the workflow switched it off', () => {
    expect(nameSearchOffered(undefined)).toBe(true);
    expect(nameSearchOffered({})).toBe(true);
    expect(nameSearchOffered({ nameSearch: true })).toBe(true);
    expect(nameSearchOffered({ nameSearch: false })).toBe(false);
  });

  it('opens the details step on number entry and never mounts the search when off', () => {
    const step = read('steps/BusinessDetailsStep.tsx');
    // Read on every render, so a preview whose switch changes while the step
    // is on screen still shows the number box; the first screen stays the
    // question, and Continue fills the second from the register.
    expect(step).toContain('const view = businessPickView({');
    expect(step).toMatch(/phase === 'pick' && view\.numberEntry/);
    expect(step).not.toMatch(/useState<'pick' \| 'details'>\(\(\) =>/);
    expect(step).toMatch(/\{searchOn && \(\s*<div[\s\S]*<BusinessSearch/);
  });
});

describe('business document labels', () => {
  const NEW_KEYS: Record<string, string> = {
    business_registration: 'Business registration certificate',
    good_standing_certificate: 'Certificate of good standing',
    registry_extract: 'Official company extract or profile from the registrar',
    annual_return: 'Latest annual return',
    register_of_directors: 'Register of directors',
    shareholder_register: 'Register of shareholders',
    share_certificate: 'Share certificate',
    ubo_declaration: 'Beneficial ownership declaration',
    power_of_attorney: 'Power of attorney',
    authorization_letter: 'Letter of authorisation',
    financial_statements: 'Financial statements or audited accounts',
  };

  it('labels every key the server catalogue may send', () => {
    for (const [key, label] of Object.entries(NEW_KEYS)) {
      expect(businessDocumentLabel(key as keyof typeof BUSINESS_DOCUMENT_LABELS)).toBe(label);
    }
    expect(Object.keys(BUSINESS_DOCUMENT_LABELS)).toHaveLength(18);
  });

  it('matches the server wording for the relabelled keys', () => {
    expect(BUSINESS_DOCUMENT_LABELS.memart).toBe('Memorandum and articles / company constitution');
    expect(BUSINESS_DOCUMENT_LABELS.tax_document).toBe('Tax registration or clearance certificate');
    expect(BUSINESS_DOCUMENT_LABELS.regulatory_license).toBe('Regulatory licence or permit');
  });
});

describe('the first screen of the business step', () => {
  const view = (o: Partial<Parameters<typeof businessPickView>[0]>) =>
    businessPickView({ searchOffered: true, refused: false, manualEntry: false, picked: false, ...o });

  it('asks for the registration number when search is off, refused or skipped', () => {
    for (const o of [{ searchOffered: false }, { refused: true }, { manualEntry: true }]) {
      expect(view(o)).toEqual({ numberEntry: true, search: false, card: false });
      // A typed number stays in the box: it is the question, not a picked company.
      expect(view({ ...o, picked: true })).toEqual({ numberEntry: true, search: false, card: false });
    }
  });

  it('shows the search, then the card once a company is named', () => {
    expect(view({})).toEqual({ numberEntry: false, search: true, card: false });
    expect(view({ picked: true })).toEqual({ numberEntry: false, search: false, card: true });
  });
});
