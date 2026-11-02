import { documentCaptureNeedsCamera } from './document-capture-methods';

// Does this flow have a step a PHONE is actually better at, so the desktop
// should offer "continue on your phone"?
//
// It is not a cosmetic question. Showing the gate MINTS a child session and
// transfers the budget to it, and the desktop cannot write again until that
// child is cancelled. Offering the handoff on a flow with nothing to hand off
// therefore does not merely waste a screen: it can strand the person on the
// device they are actually using.
//
// The old predicate was `enableLiveness !== false || documentCaptureNeedsCamera`,
// which is right for a full identity flow and wrong for every SCOPED one:
// `enableLiveness` is simply absent on a scoped config, so `!== false` is true
// and the gate fired on flows with no camera step whatsoever. A
// proof-of-address-only address flow is the clearest case (pick a file, done),
// and questionnaire and contact scopes are entirely typed.
export interface HandoffCaptureConfig {
  scope?: string | null;
  subjectType?: string | null;
  enableLiveness?: boolean;
  enableDocumentCapture?: boolean;
  allowDocumentScan?: boolean;
  allowDocumentUpload?: boolean;
  addressCollection?: { enabled?: boolean } | null;
  business?: {
    applicant?: { verification?: boolean } | null;
    documents?: { enabled?: boolean } | null;
  } | null;
}

export function handoffCaptureNeeded(config: HandoffCaptureConfig): boolean {
  // A scope decides first, whoever the workflow is about: a scoped business
  // workflow runs its scope's own steps, never the KYB application below.
  if (config.scope && config.subjectType === 'business') {
    // Never the camera: a business has no face, and a biometric scope on a
    // business is a configuration the flow refuses (lib/scope.ts).
    return config.scope === 'address' && config.addressCollection?.enabled === true;
  }
  // KYB: the applicant's own in-flow KYC, or company documents to photograph.
  // A bare registry lookup is all typed and gains nothing from a phone.
  if (config.subjectType === 'business') {
    return (
      config.business?.applicant?.verification === true ||
      config.business?.documents?.enabled === true
    );
  }
  if (config.scope) {
    switch (config.scope) {
      // The capture IS the flow.
      case 'biometric-authentication':
      case 'biometric-enrollment':
        return true;
      // Only when it collects a pin: that step wants the phone's own location
      // and its entrance photo wants its camera. Verifying by document alone
      // is a file pick, which the desktop does perfectly well.
      case 'address':
        return config.addressCollection?.enabled === true;
      // Typed, start to finish.
      default:
        return false;
    }
  }
  return config.enableLiveness !== false || documentCaptureNeedsCamera(config);
}
