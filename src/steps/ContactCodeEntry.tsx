'use client';

import React, { useState } from 'react';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Copy } from '../components/icons';
import { otpCodeFrom, otpPlaceholder, pastedCode } from '../lib/otp-code';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../components/ui/input-otp';
import { REGEXP_ONLY_DIGITS, REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import type { OtpInputStyle } from '../types/config';
import { useText } from '../i18n';

// The OTP code entry. Which field renders — a segmented shadcn OTP field or a
// plain text field — is chosen by the ORG in the workflow builder (config
// `inputStyle`), not by the end user. `codeLength` drives the segmented slots.
//
// `alphanumeric` (the workflow's `alphanumericCode`) takes letters as well as
// digits, upper-cased, on a text keyboard that capitalises and never corrects:
// autocorrect would rewrite a code into a word. Off, the field is digits only on
// a numeric keyboard, exactly as before.

/** The keyboard and filtering props for each alphabet. */
export function codeFieldProps(alphanumeric: boolean) {
  return alphanumeric
    ? ({
        inputMode: 'text',
        autoCapitalize: 'characters',
        autoCorrect: 'off',
        spellCheck: false,
        pattern: REGEXP_ONLY_DIGITS_AND_CHARS,
      } as const)
    : ({ inputMode: 'numeric', pattern: REGEXP_ONLY_DIGITS } as const);
}

interface ContactCodeEntryProps {
  code: string;
  onChange: (code: string) => void;
  codeLength: number;
  /** Config-driven field style ('segmented' default). */
  style: OtpInputStyle;
  disabled?: boolean;
  /** Fires with the full code when the last slot is filled (auto-submit). */
  onComplete?: (code: string) => void;
  /** Letters as well as digits (config `alphanumericCode`); off by default. */
  alphanumeric?: boolean;
}

export function ContactCodeEntry({
  code,
  onChange,
  codeLength,
  style,
  disabled,
  onComplete,
  alphanumeric = false,
}: ContactCodeEntryProps) {
  const t = useText();
  const [noCode, setNoCode] = useState(false);
  const apply = (next: string) => {
    setNoCode(false);
    onChange(next);
    // A disabled field (busy, or a used-up code) never submits itself.
    if (!disabled && next.length === codeLength) onComplete?.(next);
  };
  const canPaste = typeof navigator !== 'undefined' && typeof navigator.clipboard?.readText === 'function';
  const paste = async () => {
    if (disabled) return;
    const text = await navigator.clipboard.readText().catch(() => '');
    const next = pastedCode(text, codeLength, alphanumeric);
    if (next) apply(next);
    else setNoCode(true);
  };
  const { pattern, ...keyboard } = codeFieldProps(alphanumeric);
  return (
    <div className="space-y-2">
      <Label htmlFor="contact-code">{t('contact.code.label')}</Label>

      {style === 'text' ? (
        <Input
          id="contact-code"
          {...keyboard}
          autoComplete="one-time-code"
          placeholder={otpPlaceholder(codeLength, alphanumeric)}
          className="text-center text-lg font-semibold tracking-[0.4em]"
          value={code}
          onChange={(e) => apply(otpCodeFrom(e.target.value, code, codeLength, alphanumeric))}
          disabled={disabled}
        />
      ) : (
        <div className="py-1">
          <InputOTP
            id="contact-code"
            maxLength={codeLength}
            value={code}
            {...keyboard}
            // The library's own constants: a JSX string does not process escapes,
            // so "^\\d*$" written here was a literal backslash and rejected every digit typed.
            pattern={pattern}
            pasteTransformer={(text) => otpCodeFrom(text, '', codeLength, alphanumeric)}
            onChange={(next) => {
              setNoCode(false);
              onChange(alphanumeric ? next.toUpperCase() : next);
            }}
            onComplete={disabled ? undefined : onComplete}
            disabled={disabled}
            containerClassName="w-full justify-center"
            // input-otp widens its hidden input past the boxes (calc(100% +
            // badge)) to make room for a password manager's icon. A full-width
            // field then overflows the step and shows a horizontal scroll bar;
            // a one-time code has no use for a password manager anyway.
            pushPasswordManagerStrategy="none"
          >
            {/* The boxes share the field's width at the React Native and
                Flutter SDKs' shape (0.82 wide to 1 tall), so the three read
                alike. They stop at 56px wide (the same cap in all three SDKs),
                so a short code or a desktop keeps phone-sized boxes, centred. */}
            <InputOTPGroup className="w-full justify-center gap-2 sm:gap-3">
              {Array.from({ length: codeLength }, (_, i) => (
                <InputOTPSlot
                  key={i}
                  index={i}
                  className="aspect-[0.82] h-auto w-auto min-w-0 max-w-[3.5rem] flex-1 text-2xl"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
      )}
      {canPaste && (
        <div className="text-center">
          <button
            type="button"
            disabled={disabled}
            onClick={() => void paste()}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <Copy className="h-4 w-4" aria-hidden />
            {t('contact.code.paste')}
          </button>
          {noCode && (
            <p role="alert" className="text-xs text-destructive">
              {t('contact.code.pasteNone')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
