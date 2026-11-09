import { describe, expect, it } from 'vitest';
import { documentCaptureMethods, documentCaptureNeedsCamera } from '../lib/document-capture-methods';

/**
 * Mirrors the derivation in ConsentStep. This is a LEGAL notice, so it has two
 * failure modes and both matter:
 *
 *   • overclaiming — promising facial recognition on a flow with no selfie step
 *     is a false statement about what we do with someone's data;
 *   • underclaiming — recording video without saying so is the one that has
 *     actual regulatory consequences.
 *
 * The copy is therefore derived from the flow, never hardcoded.
 */
const disclosure = (config: {
  isBusiness?: boolean;
  enableSelfie?: boolean;
  enableDocumentCapture?: boolean;
  allowDocumentScan?: boolean;
  allowDocumentUpload?: boolean;
  applicantVerification?: boolean;
}) => {
  const isBusiness = config.isBusiness === true;
  const capturesFace = isBusiness
    ? config.applicantVerification === true
    : config.enableSelfie !== false;
  // Only the camera scan records the document; a photo picked from the device
  // carries no video.
  const recordsVideo =
    capturesFace || (!isBusiness && documentCaptureNeedsCamera(config));
  return { capturesFace, recordsVideo };
};

/** Mirrors the document bullet in ConsentStep's process list. */
const documentBullet = (config: { allowDocumentScan?: boolean; allowDocumentUpload?: boolean }) =>
  documentCaptureMethods(config).scan
    ? 'Scan your ID document'
    : 'Upload a photo of your ID document';

describe('what the consent notice claims', () => {
  it('names facial recognition on a normal individual flow', () => {
    expect(disclosure({})).toEqual({ capturesFace: true, recordsVideo: true });
  });

  it('does NOT claim facial recognition when the selfie step is off', () => {
    // Overclaiming: the flow never touches a face, so saying we run facial
    // recognition would be false.
    const d = disclosure({ enableSelfie: false });
    expect(d.capturesFace).toBe(false);
  });

  it('STILL discloses video when only document capture runs', () => {
    // The dangerous gap. Document capture records documentFrontVideo, so a
    // notice gated solely on the selfie would record video silently.
    expect(disclosure({ enableSelfie: false })).toEqual({
      capturesFace: false,
      recordsVideo: true,
    });
  });

  it('does NOT claim video when documents are upload only and the selfie is off', () => {
    // Overclaiming again: with the camera scan switched off the document step
    // never opens the camera, so nothing is recorded.
    expect(disclosure({ enableSelfie: false, allowDocumentScan: false })).toEqual({
      capturesFace: false,
      recordsVideo: false,
    });
  });

  it('STILL discloses video when both document methods are off, because the camera stays on', () => {
    expect(
      disclosure({ enableSelfie: false, allowDocumentScan: false, allowDocumentUpload: false }),
    ).toEqual({ capturesFace: false, recordsVideo: true });
  });

  it('names an upload, not a capture, when documents are upload only', () => {
    expect(documentBullet({})).toBe('Scan your ID document');
    expect(documentBullet({ allowDocumentUpload: false })).toBe('Scan your ID document');
    expect(documentBullet({ allowDocumentScan: false })).toBe('Upload a photo of your ID document');
  });

  it('claims nothing biometric on a plain KYB flow', () => {
    // No camera at all in the business flow without applicant verification.
    expect(disclosure({ isBusiness: true })).toEqual({
      capturesFace: false,
      recordsVideo: false,
    });
  });

  it('claims biometrics on KYB WITH applicant verification', () => {
    // The applicant runs a full individual KYC leg — face included — so the
    // business flow does become biometric here.
    expect(disclosure({ isBusiness: true, applicantVerification: true })).toEqual({
      capturesFace: true,
      recordsVideo: true,
    });
  });

  it('never claims video without also being able to justify it', () => {
    // capturesFace ⇒ recordsVideo, always. A face capture always rides a
    // recorded liveness/capture session.
    for (const cfg of [
      {},
      { enableDocumentCapture: false },
      { allowDocumentScan: false },
      { isBusiness: true, applicantVerification: true },
    ]) {
      const d = disclosure(cfg);
      if (d.capturesFace) expect(d.recordsVideo).toBe(true);
    }
  });
});
