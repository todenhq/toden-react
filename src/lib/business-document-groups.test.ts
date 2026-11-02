import { describe, expect, it } from 'vitest';
import {
  BUSINESS_DOCUMENT_GROUP_OF,
  BUSINESS_DOCUMENT_GROUP_ORDER,
  businessDocumentGroups,
  canLeaveGroup,
  firstOpenGroupIndex,
  withGroupUpload,
  businessDocumentsPayload,
} from './business-document-groups';
import type { WorkflowBusinessConfig } from '../types/business';

// One document per group. These vectors are copied into the React Native and
// Flutter SDK tests and mirror kyc-core's business-document-groups.test.ts.

const business = (types: Array<{ key: string; required?: boolean; label?: string }>) =>
  ({ country: 'NG', documents: { enabled: true, types } }) as unknown as WorkflowBusinessConfig;

describe('businessDocumentGroups', () => {
  it('groups the ticked documents in group order, keeping the workflow order inside a group', () => {
    const groups = businessDocumentGroups(business([
      { key: 'annual_return' },
      { key: 'registry_extract', required: true },
      { key: 'incorporation_certificate' },
      { key: 'memart' },
    ]));
    expect(groups.map((g) => g.key)).toEqual(['legal_presence', 'company_details']);
    expect(groups[0]!.types.map((t) => t.key)).toEqual(['registry_extract', 'incorporation_certificate']);
    expect(groups[0]!.title).toBe('Legal presence');
    expect(groups[0]!.required).toBe(true);
    expect(groups[1]!.required).toBe(false);
  });

  it('titles the other group with the name the organisation wrote', () => {
    const [other] = businessDocumentGroups(business([{ key: 'other', label: 'Council tax letter' }]));
    expect(other!.title).toBe('Council tax letter');
  });

  it('defaults to a required certificate of incorporation, and nothing when documents are off', () => {
    const groups = businessDocumentGroups({ country: 'NG', documents: { enabled: true } } as unknown as WorkflowBusinessConfig);
    expect(groups.map((g) => [g.key, g.required, g.types.map((t) => t.key)])).toEqual([
      ['legal_presence', true, ['incorporation_certificate']],
    ]);
    expect(businessDocumentGroups({ country: 'NG' } as unknown as WorkflowBusinessConfig)).toEqual([]);
  });

  it('puts every catalogue document in a known group', () => {
    for (const group of Object.values(BUSINESS_DOCUMENT_GROUP_OF)) {
      expect(BUSINESS_DOCUMENT_GROUP_ORDER).toContain(group);
    }
  });
});

describe('moving through the groups', () => {
  const groups = businessDocumentGroups(business([
    { key: 'incorporation_certificate', required: true },
    { key: 'registry_extract' },
    { key: 'memart' },
  ]));
  const [legal, details] = groups;

  it('holds one document per group: a second upload replaces the first', () => {
    const one = withGroupUpload(legal!, [], { type: 'incorporation_certificate', mediaId: 'm1' });
    const two = withGroupUpload(legal!, one, { type: 'registry_extract', mediaId: 'm2' });
    expect(two).toEqual([{ type: 'registry_extract', mediaId: 'm2' }]);
  });

  it('replaces a group upload made without a chosen type', () => {
    const one = withGroupUpload(legal!, [], { type: 'incorporation_certificate', group: 'legal_presence', mediaId: 'm1' });
    expect(withGroupUpload(legal!, one, { type: 'incorporation_certificate', group: 'legal_presence', mediaId: 'm2' }))
      .toEqual([{ type: 'incorporation_certificate', group: 'legal_presence', mediaId: 'm2' }]);
  });

  it('sends a group upload by its group, and an older one by its type', () => {
    expect(businessDocumentsPayload([
      { type: 'incorporation_certificate', group: 'legal_presence', mediaId: 'm1' },
      { type: 'memart', mediaId: 'm2' },
    ])).toEqual([{ group: 'legal_presence', mediaId: 'm1' }, { type: 'memart', mediaId: 'm2' }]);
  });

  it('lets an optional group be skipped and holds a required one until it has a document', () => {
    expect(canLeaveGroup(legal!, [])).toBe(false);
    expect(canLeaveGroup(legal!, [{ type: 'registry_extract' }])).toBe(true);
    expect(canLeaveGroup(details!, [])).toBe(true);
  });

  it('opens on the first group with nothing uploaded, else the last group', () => {
    expect(firstOpenGroupIndex(groups, [])).toBe(0);
    expect(firstOpenGroupIndex(groups, [{ type: 'incorporation_certificate' }])).toBe(1);
    expect(firstOpenGroupIndex(groups, [{ type: 'incorporation_certificate' }, { type: 'memart' }])).toBe(1);
  });
});
