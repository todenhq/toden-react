'use client';

import React from 'react';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { PhoneNumberInput } from '../components/PhoneNumberInput';
import { useText } from '../i18n';
import { businessKey } from '../i18n/business-variants';

/**
 * The "where should we send it" field on the contact-verification step: a plain
 * email input, or the dial-code phone input that emits E.164 plus validity.
 *
 * Split out of ContactVerificationStep so the step itself stays inside the
 * 200-line rule once the delivery-channel picker joined it.
 */
export function ContactDestinationField({
  isEmail,
  email,
  onEmailChange,
  onPhoneChange,
  defaultCountry,
  geoCountry,
  disabled,
  scopedBusiness,
}: {
  isEmail: boolean;
  email: string;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: { e164: string; isValid: boolean }) => void;
  defaultCountry?: string;
  /** The visitor's IP country, pinned and tagged at the top of the picker. */
  geoCountry?: string | null;
  disabled?: boolean;
  /** A scoped business workflow: the field asks for the company's contact. */
  scopedBusiness?: boolean;
}) {
  const t = useText();
  if (isEmail) {
    return (
      <div className="space-y-2">
        <Label htmlFor="contact-destination">{t(businessKey('contact.email.label', scopedBusiness))}</Label>
        <Input
          id="contact-destination"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t('contact.email.placeholder')}
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{t(businessKey('contact.phone.label', scopedBusiness))}</Label>
      <PhoneNumberInput
        defaultCountry={defaultCountry}
        geoCountry={geoCountry}
        disabled={disabled}
        onChange={onPhoneChange}
      />
    </div>
  );
}
