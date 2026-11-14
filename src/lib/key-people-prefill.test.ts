import { describe, it, expect } from 'vitest';
import { prefillKeyPeople, roleFromDesignation, shouldPrefill } from './key-people-prefill';

describe('roleFromDesignation', () => {
  it('reads the register vocabulary', () => {
    expect(roleFromDesignation('DIRECTOR')).toBe('director');
    expect(roleFromDesignation('SHAREHOLDER')).toBe('shareholder');
    expect(roleFromDesignation('SECRETARY')).toBe('signatory');
  });

  it('keeps an officer it cannot classify', () => {
    // Dropping them would read as an omission by the applicant, which is the
    // one thing this list must not manufacture.
    expect(roleFromDesignation('CHIEF WIDGET OFFICER')).toBe('director');
    expect(roleFromDesignation(null)).toBe('director');
  });
});

describe('prefillKeyPeople', () => {
  it('turns officers into rows to confirm', () => {
    const rows = prefillKeyPeople(
      [
        { name: 'Jane Doe', designation: 'DIRECTOR' },
        { name: 'Bola Owner', designation: 'SHAREHOLDER' },
      ],
      'NG',
    );
    expect(rows.map((r) => [r.name, r.role])).toEqual([
      ['Jane Doe', 'director'],
      ['Bola Owner', 'shareholder'],
    ]);
    expect(rows.every((r) => r.country === 'NG')).toBe(true);
  });

  it('invents neither an email nor an ownership split', () => {
    // The register gives us neither. Filling them would put words in the
    // applicant's mouth on a form they are attesting to.
    const [row] = prefillKeyPeople([{ name: 'Jane Doe', designation: 'DIRECTOR' }], 'NG');
    expect(row.email).toBe('');
    expect(row.ownershipPct).toBe('');
  });

  it('skips a nameless entry', () => {
    expect(prefillKeyPeople([{ name: '  ', designation: 'DIRECTOR' }], 'NG')).toEqual([]);
  });
});

describe('shouldPrefill', () => {
  it('fills an untouched list', () => {
    expect(shouldPrefill([])).toBe(true);
    expect(shouldPrefill([{ name: '', role: 'director', roles: ['director'], title: '', email: '', country: '', ownershipPct: '', isCorporate: false, registrationNumber: '', owners: [] }])).toBe(true);
  });

  it('never overwrites something typed', () => {
    // A name the applicant entered is information the register did not give us.
    expect(
      shouldPrefill([{ name: 'Someone Else', role: 'director', roles: ['director'], title: '', email: '', country: '', ownershipPct: '', isCorporate: false, registrationNumber: '', owners: [] }]),
    ).toBe(false);
  });
});

describe('a register that lists one person several times', () => {
  // The real shape of a CAC record for a three-person company: each director
  // again as a shareholder, again as a person with significant control, plus
  // the agent who filed the papers and the witness to the signatures.
  const FLITSTACK = [
    { name: 'MBOTO IBI', designation: 'PRESENTER' },
    { name: 'Atambi Tony Joseph', designation: 'WITNESS' },
    { name: 'Archibong Bassey Charles', designation: 'DIRECTOR' },
    { name: 'Archibong Bassey Charles', designation: 'SHAREHOLDER' },
    { name: 'Okeke Obinna Chinedu', designation: 'DIRECTOR' },
    { name: 'Okeke Obinna Chinedu', designation: 'SHAREHOLDER' },
    { name: 'Okeke Obinna Chinedu', designation: 'PERSONS WITH SIGNIFICANT CONTROL' },
  ];

  it('offers one row per person, not one per registry entry', () => {
    // Prefilled one-for-one, the applicant was asked to confirm a board of
    // seven that had three people on it, two of whom were not parties at all.
    const rows = prefillKeyPeople(FLITSTACK, 'NG');
    expect(rows.map((r) => r.name)).toEqual([
      'Archibong Bassey Charles',
      'Okeke Obinna Chinedu',
    ]);
  });

  it('keeps the classification that asks the most of them', () => {
    const [, richard] = prefillKeyPeople(FLITSTACK, 'NG');
    expect(richard!.role).toBe('beneficial_owner');
  });

  it('drops the filing agent and the witness', () => {
    const names = prefillKeyPeople(FLITSTACK, 'NG').map((r) => r.name);
    expect(names).not.toContain('MBOTO IBI');
    expect(names).not.toContain('Atambi Tony Joseph');
  });

  it('marks a corporate shareholder as a company', () => {
    const [row] = prefillKeyPeople(
      [{ name: 'Acme Holdings Ltd', designation: 'SHAREHOLDER' }],
      'NG',
    );
    expect(row!.isCorporate).toBe(true);
    // And leaves an ordinary name alone, including one whose given name reads
    // corporate: "Trust" and "Grace" are common Nigerian first names.
    expect(prefillKeyPeople([{ name: 'Trust Chukwu', designation: 'DIRECTOR' }], 'NG')[0]!.isCorporate).toBe(
      false,
    );
  });
});

describe('siblings on one board', () => {
  it('prefills two rows for two family members, not one', () => {
    // A double-barrelled surname supplies two shared words by itself, and the
    // old rule merged the siblings into one row.
    const rows = prefillKeyPeople(
      [
        { name: 'Amara Sandbox-Parent', designation: 'SHAREHOLDER' },
        { name: 'Femi Sandbox-Parent', designation: 'DIRECTOR' },
      ],
      'NG',
    );
    expect(rows.map((r) => r.name)).toEqual(['Amara Sandbox-Parent', 'Femi Sandbox-Parent']);
  });
});

describe('an enriched officer list (newer servers)', () => {
  it('fills the split and email the register actually gave, inventing nothing', () => {
    const rows = prefillKeyPeople(
      [
        {
          name: 'Amara Sandbox-Parent',
          designation: 'DIRECTOR',
          roles: ['director', 'beneficial_owner'],
          ownershipPct: 48.42,
          email: 'amara@acme.com',
          isCorporate: false,
          registrationNumber: null,
        },
        {
          name: 'Acme Holdings Ltd',
          designation: 'SHAREHOLDER',
          roles: ['shareholder'],
          ownershipPct: 20,
          email: null,
          isCorporate: true,
          registrationNumber: 'RC0000900',
        },
      ],
      'NG',
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      name: 'Amara Sandbox-Parent',
      role: 'beneficial_owner',
      roles: ['director', 'beneficial_owner'],
      ownershipPct: '48.42',
      email: 'amara@acme.com',
      isCorporate: false,
    });
    expect(rows[1]).toMatchObject({
      isCorporate: true,
      registrationNumber: 'RC0000900',
      ownershipPct: '20',
      email: '',
    });
  });
});
