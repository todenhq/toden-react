'use client';

import React from 'react';
import { ContactCodeEntry } from './ContactCodeEntry';
import { ExpiryCountdown } from '../components/ExpiryCountdown';
import type { PhoneOtpChannel } from '../lib/contact-channels';
import { channelName } from '../components/ContactChannelPicker';
import { useText } from '../i18n';
import type { OtpInputStyle } from '../types/config';

/**
 * The code-entry half of the contact step: the digits, the countdown, and the
 * two ways out of a code that never arrived: resend, or try the other channel.
 *
 * A used-up code (`usedUp`: its attempts ran out) disables the field, paste
 * and auto-submit. The step's primary button then sends a new code, so the
 * Resend link steps aside rather than offer the same action twice.
 */
export function ContactCodePanel({
  code,
  onChange,
  onComplete,
  codeLength,
  style,
  expiresAt,
  onResend,
  otherChannel,
  disabled,
  alphanumeric,
  usedUp = false,
}: {
  code: string;
  onChange: (code: string) => void;
  onComplete: (code: string) => void;
  codeLength: number;
  style: OtpInputStyle;
  expiresAt: string | null;
  onResend: (switchTo?: PhoneOtpChannel) => void;
  /** The channel NOT currently in use, when the workflow offers a second one. */
  otherChannel: PhoneOtpChannel | null;
  disabled?: boolean;
  /** Letters as well as digits (config `alphanumericCode`). */
  alphanumeric?: boolean;
  /** The current code's attempts ran out: no entry until a new code is sent. */
  usedUp?: boolean;
}) {
  const t = useText();
  return (
    <div className="space-y-3">
      <ContactCodeEntry
        code={code}
        onChange={onChange}
        codeLength={codeLength}
        style={style}
        disabled={disabled || usedUp}
        onComplete={usedUp ? undefined : onComplete}
        alphanumeric={alphanumeric}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {expiresAt ? (
          <ExpiryCountdown expiresAt={expiresAt} expiredLabel={t('contact.code.expired')} />
        ) : (
          <span>{t('contact.code.expiresSoon')}</span>
        )}
        {!usedUp && (
          <button
            type="button"
            className="font-medium text-primary hover:underline disabled:opacity-50"
            onClick={() => onResend()}
            disabled={disabled}
          >
            {t('contact.code.resend')}
          </button>
        )}
      </div>
      {/* The single most useful escape hatch on this screen: a code that never
          arrives is usually a channel problem, not a typo. */}
      {otherChannel && (
        <button
          type="button"
          className="mx-auto block w-fit text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          onClick={() => onResend(otherChannel)}
          disabled={disabled}
        >
          {t('contact.code.otherChannel', { channel: channelName(otherChannel, t) })}
        </button>
      )}
    </div>
  );
}
