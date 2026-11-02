import type { TextEntry } from '../types';

/** Who still has to verify, shown after the application is submitted. */
export const KEY_PEOPLE_AWAIT_TEXTS: TextEntry[] = [
  { key: 'keyPeople.pending.title', label: 'Loading: title', default: 'Working out who else needs to verify' },
  {
    key: 'keyPeople.pending.body',
    label: 'Loading: message',
    default: "We are checking the official register for the company's directors and owners.",
    multiline: true,
  },
  {
    key: 'keyPeople.await.allDone',
    label: 'Everyone has verified',
    default: 'Everyone on this application has completed their identity check.',
    multiline: true,
  },
  {
    key: 'keyPeople.await.intro',
    label: 'People still to verify',
    default:
      'To complete the review, the people below must verify their identity with a KYC check. We will email each person their link if you gave their email address.',
    multiline: true,
  },
  { key: 'keyPeople.await.group.ubos', label: 'Group: beneficial owners', default: 'UBOs' },
  { key: 'keyPeople.await.group.directors', label: 'Group: directors', default: 'Directors' },
  { key: 'keyPeople.await.group.signatories', label: 'Group: signatories', default: 'Signatories' },
  { key: 'keyPeople.await.group.shareholders', label: 'Group: shareholders', default: 'Shareholders' },
  { key: 'keyPeople.await.group.representatives', label: 'Group: representatives', default: 'Representatives' },
  { key: 'keyPeople.await.group.other', label: 'Group: other people', default: 'Other people' },
  { key: 'keyPeople.await.you', label: 'Marker: you', default: '(you)' },
  { key: 'keyPeople.await.company', label: 'Tag: company', default: 'Company' },
  { key: 'keyPeople.await.foundInDocuments', label: 'Note: found in the documents', default: 'Found in your company documents' },
  { key: 'keyPeople.await.roleFallback', label: 'Role: unknown', default: 'Key person' },
  { key: 'keyPeople.await.status.verified', label: 'Status: verified', default: 'Verified' },
  { key: 'keyPeople.await.status.submitted', label: 'Status: submitted', default: 'Submitted' },
  { key: 'keyPeople.await.status.kycPending', label: 'Status: KYC pending', default: 'KYC pending' },
  { key: 'keyPeople.await.status.kybPending', label: 'Status: KYB pending', default: 'KYB pending' },
  { key: 'keyPeople.await.status.notNeeded', label: 'Status: not needed', default: 'Not needed' },
  { key: 'keyPeople.await.status.failed', label: 'Status: check failed', default: 'Check failed' },
  { key: 'keyPeople.await.copyLink', label: 'Copy link button', default: 'Copy verification link' },
  { key: 'keyPeople.await.linkCopied', label: 'Copy link: copied', default: 'Link copied' },
  {
    key: 'keyPeople.await.copyPrompt',
    label: 'Copy link: manual copy prompt',
    default: "Copy {name}'s verification link:",
    placeholders: ['name'],
  },
  { key: 'keyPeople.await.linkValidity', label: 'Link validity note', default: 'Links are valid for 14 days.' },
  {
    key: 'keyPeople.await.ownershipPending',
    label: 'Shareholders still arriving from the register',
    default:
      'Shareholders from the register are still on their way. Their invite links will appear here when they arrive.',
    multiline: true,
  },
];
