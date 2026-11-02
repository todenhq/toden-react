'use client';

import React, { useState } from 'react';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Copy } from '../components/icons';
import { otpCodeFrom, pastedCode } from '../lib/otp-code';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../components/ui/input-otp';
import type { OtpInputStyle } from '../types/config';
import { useText } from '../i18n';

// The OTP code entry. Which field renders — a segmented shadcn OTP field or a
// plain text field — is chosen by the ORG in the workflow builder (config
// `inputStyle`), not by the end user. `codeLength` drives the segmented slots.

interface ContactCodeEntryProps {
  code: string;
  onChange: (code: string) => void;
  codeLength: number;
  /** Config-driven field style ('segmented' default). */
  style: OtpInputStyle;
  disabled?: boolean;
  /** Fires with the full code when the last slot is filled (auto-submit). */
  onComplete?: (code: string) => void;
}

export function ContactCodeEntry({ code, onChange, codeLength, style, disabled, onComplete }: ContactCodeEntryProps) {
  const t = useText();
  const [noCode, setNoCode] = useState(false);
  const apply = (next: string) => {
    setNoCode(false);
    onChange(next);
    if (next.length === codeLength) onComplete?.(next);
  };
  const canPaste = typeof navigator !== 'undefined' && typeof navigator.clipboard?.readText === 'function';
  const paste = async () => {
    const text = await navigator.clipboard.readText().catch(() => '');
    const next = pastedCode(text, codeLength);
    if (next) apply(next);
    else setNoCode(true);
  };
  return (
    <div className="space-y-2">
      <Label htmlFor="contact-code">{t('contact.code.label')}</Label>

      {style === 'text' ? (
        <Input
          id="contact-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder={'0'.repeat(codeLength)}
          className="text-center text-lg font-semibold tracking-[0.4em]"
          value={code}
          onChange={(e) => apply(otpCodeFrom(e.target.value, code, codeLength))}
          disabled={disabled}
        />
      ) : (
        <div className="flex justify-center py-1">
          <InputOTP
            id="contact-code"
            maxLength={codeLength}
            value={code}
            pattern="^\\d*$"
            pasteTransformer={(text) => otpCodeFrom(text, '', codeLength)}
            onChange={(next) => {
              setNoCode(false);
              onChange(next);
            }}
            onComplete={onComplete}
            disabled={disabled}
            containerClassName="justify-center"
          >
            <InputOTPGroup>
              {Array.from({ length: codeLength }, (_, i) => (
                <InputOTPSlot key={i} index={i} />
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
