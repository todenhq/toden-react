import type { TextGroup } from '../types';
import { UPLOAD_HINT } from '../../lib/upload-limits';

export const PROOF_OF_ADDRESS_TEXTS: TextGroup = {
  id: 'proofOfAddress',
  title: 'Proof of Address',
  entries: [
    { key: 'proofOfAddress.title', label: 'Title', default: 'Proof of address' },
    {
      key: 'proofOfAddress.description',
      label: 'Description',
      default: 'Upload a document that shows your name and home address, issued within the last {days} days.',
      placeholders: ['days'],
      multiline: true,
    },
    {
      key: 'proofOfAddress.description.noName',
      label: 'Description (name not needed)',
      default: 'Upload a document that shows your home address, issued within the last {days} days.',
      placeholders: ['days'],
      multiline: true,
    },
    {
      key: 'proofOfAddress.description.business',
      label: 'Description (business)',
      default:
        "Upload a document that shows your business's name and address, issued within the last {days} days.",
      placeholders: ['days'],
      multiline: true,
    },
    {
      key: 'proofOfAddress.description.noName.business',
      label: 'Description (business, name not needed)',
      default: "Upload a document that shows your business's address, issued within the last {days} days.",
      placeholders: ['days'],
      multiline: true,
    },
    { key: 'proofOfAddress.country.label', label: 'Country label', default: 'Country' },
    { key: 'proofOfAddress.country.placeholder', label: 'Country placeholder', default: 'Select country' },
    { key: 'proofOfAddress.country.search', label: 'Country search placeholder', default: 'Search countries…' },
    { key: 'proofOfAddress.country.yourLocation', label: 'Country: your location tag', default: 'Your location' },
    { key: 'proofOfAddress.country.noMatches', label: 'Country: no matches', default: 'No countries match.' },
    { key: 'proofOfAddress.documentType', label: 'Document type label', default: 'Document type' },
    { key: 'proofOfAddress.kind.utilityBill', label: 'Kind: utility bill', default: 'Utility bill' },
    { key: 'proofOfAddress.kind.bankStatement', label: 'Kind: bank statement', default: 'Bank statement' },
    { key: 'proofOfAddress.kind.tenancyAgreement', label: 'Kind: tenancy agreement', default: 'Tenancy agreement' },
    {
      key: 'proofOfAddress.kind.governmentDocument',
      label: 'Kind: government document',
      default: 'Government-issued document',
    },
    {
      key: 'proofOfAddress.kind.other',
      label: 'Kind: other document',
      default: 'Other document',
      configPath: ['proofOfAddress', 'otherLabel'],
    },
    { key: 'proofOfAddress.upload.utilityBill', label: 'Upload: utility bill', default: 'Upload your utility bill' },
    {
      key: 'proofOfAddress.upload.bankStatement',
      label: 'Upload: bank statement',
      default: 'Upload your bank statement',
    },
    {
      key: 'proofOfAddress.upload.tenancyAgreement',
      label: 'Upload: tenancy agreement',
      default: 'Upload your tenancy agreement',
    },
    {
      key: 'proofOfAddress.upload.governmentDocument',
      label: 'Upload: government document',
      default: 'Upload your government-issued document',
    },
    { key: 'proofOfAddress.upload.other', label: 'Upload: other document', default: 'Upload your other document' },
    {
      key: 'proofOfAddress.upload.custom',
      label: 'Upload: your named document',
      default: 'Upload your {document}',
      placeholders: ['document'],
    },
    { key: 'proofOfAddress.uploading', label: 'Uploading', default: 'Uploading…' },
    {
      key: 'proofOfAddress.uploadHint',
      label: 'Upload hint',
      default: UPLOAD_HINT,
    },
    { key: 'proofOfAddress.uploaded', label: 'Document uploaded', default: 'Document uploaded' },
    {
      key: 'proofOfAddress.error.fileType',
      label: 'Error: wrong file type',
      default: 'Please upload a PDF, JPG or PNG file.',
    },
    { key: 'proofOfAddress.error.pdfTooLarge', label: 'Error: PDF too large', default: 'PDF is too large (max 15 MB).' },
    {
      key: 'proofOfAddress.error.imageTooLarge',
      label: 'Error: image too large',
      default: 'Image is too large (max 5 MB).',
    },
    {
      key: 'proofOfAddress.error.uploadFailed',
      label: 'Error: upload failed',
      default: 'Upload failed. Please check your connection and try again.',
    },
  ],
};
