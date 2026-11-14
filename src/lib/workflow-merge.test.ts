import { describe, expect, it } from 'vitest';
import { mergeWorkflowConfig, overlayApplicantWorkflow } from './workflow-merge';

describe('mergeWorkflowConfig', () => {
  it('flow config wins over overlapping props', () => {
    const merged = mergeWorkflowConfig(
      { country: 'GH', idTypes: ['ghana-card'], enableLiveness: false },
      { country: 'NG', idTypes: ['bvn', 'nin'], enableLiveness: true, apiKey: 'pk_test_x' },
    );
    expect(merged.country).toBe('GH');
    expect(merged.idTypes).toEqual(['ghana-card']);
    expect(merged.enableLiveness).toBe(false);
  });

  // A multi-region flow declares its ID offering inside countries[], where a
  // country pinning nothing already means "every granted ID for that country".
  // Keeping the consumer's prop there narrows every country the flow offers.
  it('a multi-region flow drops the consumer idTypes prop', () => {
    const merged = mergeWorkflowConfig(
      { countries: [{ country: 'NG' }, { country: 'GH' }] } as never,
      { country: 'NG', idTypes: ['bvn', 'nin', 'passport'], apiKey: 'pk_test_x' },
    );
    expect(merged.idTypes).toBeUndefined();
  });

  it("a flow's own top-level idTypes still wins on a multi-region flow", () => {
    const merged = mergeWorkflowConfig(
      { countries: [{ country: 'NG' }], idTypes: ['passport'] } as never,
      { country: 'NG', idTypes: ['bvn', 'nin', 'passport'], apiKey: 'pk_test_x' },
    );
    expect(merged.idTypes).toEqual(['passport']);
  });

  it('a single-country flow keeps the consumer idTypes prop, as before', () => {
    const merged = mergeWorkflowConfig(
      { country: 'NG' } as never,
      { country: 'NG', idTypes: ['bvn', 'nin', 'passport'], apiKey: 'pk_test_x' },
    );
    expect(merged.idTypes).toEqual(['bvn', 'nin', 'passport']);
  });

  it('a flow can disable deviceHandoff (now flow-controlled); prop wins when the flow omits it', () => {
    // Flow turns it off → flow wins over a consumer prop that left it on.
    const off = mergeWorkflowConfig(
      { country: 'NG', deviceHandoff: false },
      { country: 'NG', deviceHandoff: true, apiKey: 'pk_test_x' },
    );
    expect(off.deviceHandoff).toBe(false);
    // Flow omits it → the consumer prop survives (undefined flow values skip).
    const kept = mergeWorkflowConfig(
      { country: 'NG' },
      { country: 'NG', deviceHandoff: false, apiKey: 'pk_test_x' },
    );
    expect(kept.deviceHandoff).toBe(false);
  });

  it('props fill keys the flow does not define', () => {
    const merged = mergeWorkflowConfig(
      { country: 'NG' },
      { country: 'NG', assetsBasePath: '/my-assets', enableSelfie: false, apiKey: 'pk_test_x' },
    );
    expect(merged.assetsBasePath).toBe('/my-assets');
    expect(merged.enableSelfie).toBe(false);
  });

  it('never touches runtime keys (apiKey, userId, userData, metadata, callbacks)', () => {
    const onSubmit = () => undefined;
    const props: Record<string, unknown> = {
      country: 'NG',
      apiKey: 'pk_test_x',
      userId: 'usr_1',
      userData: { firstName: 'Jane' },
      metadata: { plan: 'gold' },
      onSubmit,
      deviceHandoff: false,
      defaultOpen: true,
    };
    const merged = mergeWorkflowConfig({ country: 'KE', disableClose: true }, props);
    expect(merged.apiKey).toBe('pk_test_x');
    expect(merged.userId).toBe('usr_1');
    expect(merged.userData).toEqual({ firstName: 'Jane' });
    expect(merged.metadata).toEqual({ plan: 'gold' });
    expect(merged.onSubmit).toBe(onSubmit);
    expect(merged.deviceHandoff).toBe(false);
    expect(merged.defaultOpen).toBe(true);
    expect(merged.disableClose).toBe(true);
  });

  it('biometric merges per field too, so a flow switching the review on keeps a host\'s hidden Done', () => {
    const merged = mergeWorkflowConfig(
      { country: 'NG', scope: 'biometric-authentication', biometric: { selfieReview: true } },
      { country: 'NG', apiKey: 'pk', biometric: { doneButton: false } },
    );
    expect(merged.biometric).toEqual({ selfieReview: true, doneButton: false });
  });

  it('appearance merges shallowly with flow fields winning per-field', () => {
    const merged = mergeWorkflowConfig(
      { country: 'NG', appearance: { primaryColor: '#111111', theme: 'dark' } },
      { country: 'NG', apiKey: 'pk', appearance: { primaryColor: '#999999', logo: '/logo.svg' } },
    );
    expect(merged.appearance).toEqual({
      primaryColor: '#111111',
      theme: 'dark',
      logo: '/logo.svg',
    });
  });

  it('business (KYB) flows merge subjectType + business and fall back country to the registry country', () => {
    const props: Record<string, unknown> = { apiKey: 'pk_test_x' };
    const merged = mergeWorkflowConfig(
      { subjectType: 'business', business: { country: 'US', products: ['business'] } },
      props,
    );
    expect(merged.subjectType).toBe('business');
    expect(merged.business).toEqual({ country: 'US', products: ['business'] });
    expect(merged.country).toBe('US'); // no top-level country on business workflows
  });

  it('a flow-defined false still overrides a prop true (explicit beats default)', () => {
    const merged = mergeWorkflowConfig(
      { country: 'NG', enableDocumentCapture: false, showThemeToggle: false },
      { country: 'NG', apiKey: 'pk', enableDocumentCapture: true, showThemeToggle: true },
    );
    expect(merged.enableDocumentCapture).toBe(false);
    expect(merged.showThemeToggle).toBe(false);
  });

  it('allowDocumentScan is flow-controlled, on the mount and on a mapped applicant leg', () => {
    // A workflow that makes document capture upload only must not be undone by
    // a consumer prop, or the camera would open on a flow built without it.
    const merged = mergeWorkflowConfig(
      { country: 'NG', allowDocumentScan: false },
      { country: 'NG', apiKey: 'pk', allowDocumentScan: true },
    );
    expect(merged.allowDocumentScan).toBe(false);
    const leg = overlayApplicantWorkflow(
      { id: 'wf_applicant', config: { country: 'NG', allowDocumentScan: false } },
      { country: 'NG', allowDocumentScan: true },
    );
    expect(leg.allowDocumentScan).toBe(false);
  });

  it('maxLivenessAttempts reaches the config from the workflow, on the mount and on a mapped applicant leg', () => {
    const props: { country: string; apiKey: string; maxLivenessAttempts?: number } = { country: 'NG', apiKey: 'pk' };
    expect(mergeWorkflowConfig({ country: 'NG', livenessMode: 'flash', maxLivenessAttempts: 2 }, props).maxLivenessAttempts).toBe(2);
    // A workflow without the setting leaves no limit.
    expect(mergeWorkflowConfig({ country: 'NG' }, props).maxLivenessAttempts).toBeUndefined();
    const leg = overlayApplicantWorkflow(
      { id: 'wf_applicant', config: { country: 'NG', maxLivenessAttempts: 3 } },
      { country: 'NG' } as { country: string; maxLivenessAttempts?: number },
    );
    expect(leg.maxLivenessAttempts).toBe(3);
  });
});
