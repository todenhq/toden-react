import { describe, expect, it } from 'vitest';
import { mergeWorkflowConfig } from './workflow-merge';

/**
 * `userData` is what makes the submitted name comparable against the name read off
 * the document. Two things must hold for that comparison to ever happen, and both
 * were doubted during a live debugging session:
 *
 *   1. a `workflowId` mount must not lose the prop, and
 *   2. an empty string must not count as a submitted name.
 *
 * The confusion was real: a PVC and a passport both came back with `dataMatch: null`,
 * and the example app looked like it was passing names because it always spread a
 * `userData` object — one built from blank inputs.
 */

describe('userData survives a workflow mount', () => {
  it('is not overwritten by a resolved flow config', () => {
    // Flows are SHARED TEMPLATES, so WorkflowConfigSchema deliberately excludes
    // userData (it is per-visitor PII). The prop is therefore the only source, and
    // the merge must leave it alone — if `userData` ever joins WORKFLOW_KEYS, a
    // workflow mount silently stops comparing names.
    const merged = mergeWorkflowConfig(
      { country: 'NG', idTypes: ['pvc'], enableSelfie: true } as never,
      { country: 'GH', userData: { firstName: 'Benedict', lastName: 'Okeke' } },
    );
    expect(merged.userData).toEqual({ firstName: 'Benedict', lastName: 'Okeke' });
    expect(merged.country).toBe('NG'); // the flow still wins on keys it owns
  });
});

describe('empty names are absent, not submitted', () => {
  // Mirrors the derivation in SubmittedStep.tsx.
  const derive = (props?: { firstName?: string; lastName?: string }, typed?: { firstName?: string; lastName?: string }) => {
    const firstName = props?.firstName || typed?.firstName || undefined;
    const lastName = props?.lastName || typed?.lastName || undefined;
    return firstName || lastName ? { firstName, lastName } : undefined;
  };

  it('sends nothing when the fields are blank', () => {
    // Submitting `firstName: ''` would compare the document against an empty
    // string. Absent is the honest representation, and it is why dataMatch was null.
    expect(derive({ firstName: '', lastName: '' })).toBeUndefined();
    expect(derive()).toBeUndefined();
  });

  it('sends what it has when only one field is filled', () => {
    expect(derive({ firstName: 'Benedict', lastName: '' })).toEqual({
      firstName: 'Benedict',
      lastName: undefined,
    });
  });

  it('prefers the consumer prop over a value typed in the flow', () => {
    // Document IDs have no typing step, so the prop is usually the only source —
    // but for number-only IDs both exist and the integrator's value wins.
    expect(derive({ firstName: 'Prop' }, { firstName: 'Typed' })?.firstName).toBe('Prop');
  });
});
