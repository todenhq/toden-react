import type { TextGroup } from '../types';
import { GENERAL_ERROR_TEXTS } from './general-errors';

/** The modal's chrome and banners, the screens around the flow, and the general error messages. */
export const GENERAL_TEXTS: TextGroup = {
  id: 'general',
  title: 'Header and Messages',
  entries: [
    { key: 'general.hosted.loading', label: 'Hosted page: loading', default: 'Loading your verification…' },
    { key: 'general.sandboxBanner.sandbox', label: 'Sandbox banner: label', default: 'Sandbox' },
    {
      key: 'general.sandboxBanner.sandboxNote',
      label: 'Sandbox banner: note',
      default: 'Test data only, no real checks run',
    },
    { key: 'general.sandboxBanner.development', label: 'Development banner: label', default: 'Development' },
    {
      key: 'general.sandboxBanner.developmentNote',
      label: 'Development banner: note',
      default: 'Test environment, results are not live',
    },
    { key: 'general.configError.title', label: 'Unable to start: title', default: 'Unable to start verification' },
    {
      key: 'general.configError.description',
      label: 'Unable to start: description',
      default: 'Unable to start verification. Please try again.',
    },
    {
      key: 'general.configError.unsupportedScope',
      label: 'Unable to start: business face check',
      default:
        'This verification is set up as a face check for a business, which is not supported. Contact the organisation that sent it.',
    },
    { key: 'general.sessionCancelled.title', label: 'Cancelled session: title', default: 'This verification was cancelled' },
    {
      key: 'general.sessionCancelled.description',
      label: 'Cancelled session: description',
      default:
        'This verification was cancelled. Contact the organisation that sent it if you think this is a mistake.',
    },
    { key: 'general.errorBoundary.title', label: 'Unexpected error: title', default: 'Something went wrong' },
    {
      key: 'general.errorBoundary.description',
      label: 'Unexpected error: description',
      default: 'An unexpected error occurred. Please try again.',
    },
    { key: 'general.errorBoundary.tryAgainButton', label: 'Unexpected error: try again button', default: 'Try Again' },
    {
      key: 'general.codeExpiry.countdown',
      label: 'Code expiry countdown',
      default: 'The code expires in {time}',
      placeholders: ['time'],
    },
    {
      key: 'general.codeExpiry.expired',
      label: 'Code expired',
      default: 'The code has expired. Request a new one.',
    },
    ...GENERAL_ERROR_TEXTS,
    { key: 'general.attribution.label', label: 'Footer: attribution label', default: 'Protected by' },
  ],
};
