'use client';

import React, { useReducer, useRef, useState } from 'react';
import { CircleCheck, Loader2, Mail, Smartphone } from '../components/icons';
import { ErrorNotice } from '../components/ErrorNotice';
import { StepHeader } from '../components/StepHeader';
import { Button } from '../components/ui/button';
import { ContactChannelPicker, channelName } from '../components/ContactChannelPicker';
import { offeredPhoneChannels, type PhoneOtpChannel } from '../lib/contact-channels';
import { useText } from '../i18n';
import { ContactDestinationField } from './ContactDestinationField';
import { ContactCodePanel } from './ContactCodePanel';
import { stepAfterContactVerified } from './contact-recovery';
import { useVerificationContext } from '../context/VerificationContext';
import { useVerificationConfig } from '../context/VerificationConfigContext';
import { stepAfterContact, stepBeforeContact } from '../lib/contact-steps';
import { isBusinessFlow } from '../lib/business';
import { isScopedBusiness } from '../lib/scope';
import { businessKey } from '../i18n/business-variants';
import { describeSendError, describeCheckError } from '../lib/contact-errors';
import { defaultCountry } from '../lib/country-default';
import { sentCodeLength } from '../lib/contact-code-length';
import { sessionEndAction } from '../lib/session-cancelled';
import {
  CONTACT_PRIMARY_LABEL,
  contactCodeReducer,
  contactPrimaryAction,
  initialContactCodeState,
} from './contact-code-state';

// Contact-verification OTP step (email or phone — one component, two mounts).
// enter → send → code entry → verified → continue. The proof token is stored
// in the reducer and submitted with /verify (contact.emailToken/phoneToken).

const DEFAULT_CODE_LENGTH = 6;

export function ContactVerificationStep({ channel }: { channel: 'email' | 'phone' }) {
  const { state, dispatch } = useVerificationContext();
  const config = useVerificationConfig();
  const t = useText();
  const isEmail = channel === 'email';
  // A scoped business workflow confirms the company's contact details.
  const scopedBusiness = isScopedBusiness(config);
  const stepConfig = isEmail ? config.emailVerification : config.phoneVerification;
  const required = stepConfig?.required !== false;
  const configuredLength = Math.min(8, Math.max(4, stepConfig?.codeLength ?? DEFAULT_CODE_LENGTH));
  // What the server actually sent, which its pinned workflow decides.
  const [sentLength, setSentLength] = useState<number | null>(null);
  const codeLength = sentLength ?? configuredLength;
  const maxAttempts = stepConfig?.maxAttempts;
  // Letters as well as digits, when the org turned it on in the builder.
  const alphanumeric = stepConfig?.alphanumericCode === true;
  const alreadyVerified = isEmail ? state.contact.emailToken != null : state.contact.phoneToken != null;

  // Email: the typed address is the destination. Phone: the PhoneNumberInput
  // emits the E.164 value + validity; we send that.
  const [email, setEmail] = useState((isEmail ? state.contact.emailAddress : '') ?? '');
  const [phone, setPhone] = useState<{ e164: string; isValid: boolean }>({
    e164: state.contact.phoneNumber ?? '',
    isValid: false,
  });
  const destination = isEmail ? email.trim() : phone.e164;
  // In the builder preview, Send is always enabled so the org can reach (and
  // preview) the code-entry screen — with its two input styles + the configured
  // number of slots — in one click, without typing a real destination.
  const canSend = config.previewMode || (isEmail ? /.+@.+\..+/.test(destination) : phone.isValid);

  // Delivery channel. The org chooses what's ON OFFER; the person receiving the
  // code chooses between them — only they know whether they have WhatsApp, or
  // whether SMS is landing for them today. One offered channel = no choice to
  // make, and the picker renders nothing.
  const offeredChannels: PhoneOtpChannel[] = isEmail
    ? []
    : offeredPhoneChannels(config.phoneVerification?.channels);
  const [via, setVia] = useState<PhoneOtpChannel>(offeredChannels[0] ?? 'sms');
  const otherChannel = offeredChannels.find((c) => c !== via) ?? null;

  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  // The typed code, and whether the current code is used up (its attempts ran
  // out): the field is then disabled until a new code is sent.
  const [{ code, usedUp }, codeDispatch] = useReducer(contactCodeReducer, initialContactCodeState);
  const setCode = (next: string) => codeDispatch({ type: 'typed', code: next });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Entered via submit recovery? (The server refused this channel's proof at
  // submit — the token had expired or was already claimed — so the person was
  // walked back here.) Captured at mount: verifying clears the flag, and
  // Continue must still route back to 'submitted' afterwards.
  const expiredList = Array.isArray(state.contact.expired) ? state.contact.expired : [];
  const recovery = useRef(expiredList.includes(channel)).current;

  const advance = () =>
    dispatch({
      type: 'SET_STEP',
      payload: stepAfterContactVerified({
        recovery,
        expired: expiredList,
        channel,
        forward: stepAfterContact(
          { ...config, subjectTypeIsBusiness: isBusinessFlow(config) },
          isEmail ? 'email-verification' : 'phone-verification',
        ),
      }),
    });

  /** `switchTo` re-sends over the other channel when the first one didn't land. */
  const send = async (switchTo?: PhoneOtpChannel) => {
    const sendVia = switchTo ?? via;
    if (switchTo) setVia(switchTo);
    setBusy(true);
    setError(null);
    try {
      const res = await config.api.contactSend({
        channel,
        destination,
        codeLength: configuredLength,
        ...(state.sessionId ? { sessionId: state.sessionId } : {}),
        ...(maxAttempts != null ? { maxAttempts } : {}),
        ...(isEmail ? {} : { via: sendVia }),
      });
      setSentLength(sentCodeLength(res.codeLength, configuredLength));
      setChallengeId(res.challengeId);
      setExpiresAt(res.expiresAt ?? null);
      codeDispatch({ type: 'sent' });
    } catch (err) {
      // The session was cancelled or declined: the modal swaps to its screen.
      const ended = sessionEndAction(err, channel);
      if (ended) {
        dispatch(ended);
        return;
      }
      setError(describeSendError(err, t));
    } finally {
      setBusy(false);
    }
  };

  const check = async (submitted?: string) => {
    const value = (submitted ?? code).trim();
    if (!challengeId || usedUp || value.length < 4) return;
    setBusy(true);
    setError(null);
    try {
      // The session + country let the server charge this check as it runs
      // rather than at submit. Both are optional and validated server-side, so
      // an older SDK simply keeps the old billing moment.
      // The session lets the server bill this component on completion, which is
      // this call. Optional: without it the charge happens at submit.
      const res = await config.api.contactCheck({
        challengeId,
        code: value,
        ...(state.sessionId ? { sessionId: state.sessionId } : {}),
        ...(config.country ? { country: config.country } : {}),
      });
      dispatch({ type: 'SET_CONTACT_PROOF', payload: { channel, token: res.token, destination } });
      advance();
    } catch (err) {
      // A workflow set to decline on the last attempt declines the session
      // when this code runs out (409 session_declined): the modal swaps to the
      // declined screen, worded for this channel.
      const ended = sessionEndAction(err, channel);
      if (ended) {
        dispatch(ended);
        return;
      }
      codeDispatch({ type: 'checkFailed', error: err });
      setError(describeCheckError(err, t));
    } finally {
      setBusy(false);
    }
  };

  const Icon = isEmail ? Mail : Smartphone;
  const primary = contactPrimaryAction({ verified: alreadyVerified, codeSent: challengeId !== null, usedUp });
  const canSubmit = primary === 'continue'
    || (!busy && (primary === 'verify' ? code.trim().length >= 4 : primary === 'send' ? canSend : true));
  const onPrimary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (primary === 'continue') advance();
    else if (primary === 'verify') void check();
    else void send();
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <StepHeader
        // Back into the previous contact step or consent; none while
        // recovering from a refused submission, which returns to the end.
        onBack={recovery ? undefined : () => dispatch({ type: 'SET_STEP', payload: stepBeforeContact(config, channel) })}
        title={t(businessKey(isEmail ? 'contact.email.title' : 'contact.phone.title', scopedBusiness))}
        description={t(
          businessKey(
            `contact.${channel}.${challengeId ? (alphanumeric ? 'codeSentAlphanumeric' : 'codeSent') : 'intro'}`,
            scopedBusiness,
          ),
          { codeLength, destination, channel: channelName(via, t) },
        )}
      />

      {recovery && !alreadyVerified && (
        <div className="rounded-xl bg-secondary/15 p-4 text-sm">
          {t(`contact.${channel}.recovery`)}
        </div>
      )}

      {/* A form, so Enter in the email or phone field (or the code field)
          does what the main button says: send, verify or send a new code. */}
      <form className="space-y-6" noValidate onSubmit={onPrimary}>
        {alreadyVerified ? (
          <div className="flex items-center gap-3 rounded-xl bg-primary/5 p-4">
            <CircleCheck className="h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm font-medium">
              {t('contact.verified', {
                destination: isEmail ? state.contact.emailAddress : state.contact.phoneNumber,
              })}
            </p>
          </div>
        ) : !challengeId ? (
          <div className="space-y-4">
            <ContactDestinationField
              isEmail={isEmail}
              email={email}
              onEmailChange={setEmail}
              onPhoneChange={setPhone}
              // The APPLICANT's own number, so where they are beats which
              // register this flow checks. An org-configured default still wins:
              // that is a decision somebody made about their own customers.
              geoCountry={config.serverConfig?.geoCountry}
              defaultCountry={defaultCountry(
                config.phoneVerification?.defaultCountry,
                config.serverConfig?.geoCountry,
                config.country,
              )}
              disabled={busy}
              scopedBusiness={scopedBusiness}
              countries={config.phoneVerification?.countries}
            />
            <ContactChannelPicker offered={offeredChannels} picked={via} onPick={setVia} disabled={busy} />
          </div>
        ) : (
          <ContactCodePanel
            code={code}
            onChange={setCode}
            onComplete={(c) => check(c)}
            codeLength={codeLength}
            style={stepConfig?.inputStyle ?? 'segmented'}
            alphanumeric={alphanumeric}
            expiresAt={expiresAt}
            onResend={send}
            otherChannel={otherChannel}
            disabled={busy}
            usedUp={usedUp}
          />
        )}

        {error && <ErrorNotice>{error}</ErrorNotice>}

        <div className="space-y-3">
          {primary === 'continue' ? (
            <Button type="submit" className="w-full">
              {t(CONTACT_PRIMARY_LABEL.continue)}
            </Button>
          ) : (
            <Button
              type="submit"
              className="w-full"
              // A used-up code cannot be verified: the button sends a new one.
              disabled={!canSubmit}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t(CONTACT_PRIMARY_LABEL[primary])}
            </Button>
          )}
          {!required && !alreadyVerified && (
            <button
              type="button"
              className="mx-auto block w-fit text-sm text-muted-foreground hover:text-foreground"
              onClick={advance}
            >
              {t('contact.skip')}
            </button>
          )}
        </div>
      </form>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" />
        {t(businessKey(`contact.${channel}.footer`, scopedBusiness))}
      </p>
    </div>
  );
}
