import type { TextGroup } from '../types';

export const NFC_TEXTS: TextGroup = {
  id: 'nfc',
  title: 'Chip reading',
  entries: [
    { key: 'nfc.title', label: 'Title', default: 'Scan your document’s chip' },
    {
      key: 'nfc.description',
      label: 'Description',
      default: 'Hold your document flat against the back of your phone until it’s read.',
      multiline: true,
    },
    { key: 'nfc.waiting', label: 'Waiting status', default: 'Waiting for the chip' },
    { key: 'nfc.skip', label: 'Skip button', default: 'Continue without the chip' },
  ],
};
