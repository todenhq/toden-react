import type { TextEntry } from '../types';

/** Guidance under the registration number field, per country. */
export const BUSINESS_REGISTRATION_TEXTS: TextEntry[] = [
  { key: 'business.registration.placeholderNigeria', label: 'Placeholder: Nigeria', default: 'e.g. RC0000000' },
  {
    key: 'business.registration.placeholderExample',
    label: 'Placeholder: with an example',
    default: 'e.g. {example}',
    placeholders: ['example'],
  },
  {
    key: 'business.registration.placeholderGeneric',
    label: 'Placeholder: other countries',
    default: 'Enter your registration number',
  },
  {
    key: 'business.registration.tipTin',
    label: 'Tip: TIN',
    default: 'Your tax identification number as issued by the tax authority, e.g. 01234567-0001.',
    multiline: true,
  },
  {
    key: 'business.registration.tipNigeria',
    label: 'Tip: Nigeria',
    default:
      'Prefix your registration number with RC for private companies limited by shares, BN for business names, IT for incorporated trustees, LP for limited partnerships or LLP for limited liability partnerships, with no space or character between the prefix and the number, e.g. RC0000000.',
    multiline: true,
  },
  {
    key: 'business.registration.errorNigeria',
    label: 'Error: Nigeria format',
    default: 'Start with RC, BN, IT, LP or LLP followed by the number, no spaces, e.g. RC0000000.',
    multiline: true,
  },
  {
    key: 'business.registration.tipGhana',
    label: 'Tip: Ghana',
    default:
      'Your registration number from the Office of the Registrar of Companies: CS for a company, BN for a business name or PL for a public company, followed by the digits, e.g. CS043840225.',
    multiline: true,
  },
  {
    key: 'business.registration.tipKenya',
    label: 'Tip: Kenya',
    default:
      'Your registration number as it appears on your certificate of incorporation, e.g. PVT-JZUA6Z663.',
    multiline: true,
  },
  {
    key: 'business.registration.tipSouthAfrica',
    label: 'Tip: South Africa',
    default:
      'Your CIPC registration number is printed as 2011/333333/23 on your documents; enter it without the slashes, e.g. 201133333323.',
    multiline: true,
  },
  {
    key: 'business.registration.tipGeneric',
    label: 'Tip: other countries',
    default:
      'Your official company registration number, exactly as issued by the business registry in {country}.',
    multiline: true,
    placeholders: ['country'],
  },
];
