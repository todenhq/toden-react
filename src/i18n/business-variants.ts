/**
 * The texts a SCOPED business workflow shows in place of a person's
 * (lib/scope.ts isScopedBusiness), each mapped to the text it stands in for.
 *
 * They are not customisable on their own (the editor's list is capped), so an
 * org's own words for the base text apply here too: a workflow that rewrote
 * "Verify your email" keeps its wording on a business, and only a workflow
 * that left it alone reads the business default. The existing `.business`
 * texts of the KYB application are separate and unaffected.
 *
 * Mirrored by the React Native SDK (src/i18n/business-variants.ts) and the
 * Flutter SDK (lib/src/i18n/business_variants.dart): keep the three in step.
 */
export const BUSINESS_VARIANT_BASES: Readonly<Record<string, string>> = {
  'welcome.title.address.business': 'welcome.title.address',
  'welcome.title.questionnaire.business': 'welcome.title.questionnaire',
  'welcome.title.contact.business': 'welcome.title.contact',
  'welcome.description.address.business': 'welcome.description.address',
  'welcome.description.questionnaire.business': 'welcome.description.questionnaire',
  'welcome.description.contact.business': 'welcome.description.contact',
  'welcome.process.addressPin.business': 'welcome.process.addressPin',
  'welcome.process.addressDetails.business': 'welcome.process.addressDetails',
  'welcome.process.contactScope.business': 'welcome.process.contactScope',
  'welcome.process.proofOfAddress.business': 'welcome.process.proofOfAddress',
  'welcome.process.questions.business': 'welcome.process.questions',
  'contact.email.title.business': 'contact.email.title',
  'contact.email.intro.business': 'contact.email.intro',
  'contact.email.label.business': 'contact.email.label',
  'contact.email.footer.business': 'contact.email.footer',
  'contact.phone.title.business': 'contact.phone.title',
  'contact.phone.intro.business': 'contact.phone.intro',
  'contact.phone.label.business': 'contact.phone.label',
  'questionnaire.title.business': 'questionnaire.title',
  'questionnaire.description.business': 'questionnaire.description',
  'proofOfAddress.description.business': 'proofOfAddress.description',
  'proofOfAddress.description.noName.business': 'proofOfAddress.description.noName',
  'result.success.description.address.business': 'result.success.description.address',
  'result.success.description.questionnaire.business': 'result.success.description.questionnaire',
  'result.success.description.contact.business': 'result.success.description.contact',
  'result.completed.approved.description.address.business': 'result.completed.approved.description.address',
  'result.completed.approved.description.questionnaire.business': 'result.completed.approved.description.questionnaire',
  'result.completed.approved.description.contact.business': 'result.completed.approved.description.contact',
  'result.completed.declined.description.address.business': 'result.completed.declined.description.address',
  'result.completed.declined.description.questionnaire.business': 'result.completed.declined.description.questionnaire',
  'result.completed.declined.description.contact.business': 'result.completed.declined.description.contact',
};

/** The key itself, or its business variant on a scoped business workflow. */
export function businessKey(key: string, scopedBusiness: boolean | undefined): string {
  const variant = `${key}.business`;
  return scopedBusiness && variant in BUSINESS_VARIANT_BASES ? variant : key;
}
