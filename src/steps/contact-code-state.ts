import { codeIsUsedUp, isWrongCode } from '../lib/contact-errors';

// The code field's state in the contact step: what is typed, and whether the
// current code is used up (its attempts ran out). A used-up code disables the
// field, paste and auto-submit, and turns the primary button into "Send a new
// code" until a new code is sent (lib/contact-errors.ts codeIsUsedUp).

export interface ContactCodeState {
  code: string;
  usedUp: boolean;
}

export type ContactCodeEvent =
  | { type: 'typed'; code: string }
  | { type: 'checkFailed'; error: unknown }
  | { type: 'sent' };

export const initialContactCodeState: ContactCodeState = { code: '', usedUp: false };

export function contactCodeReducer(state: ContactCodeState, event: ContactCodeEvent): ContactCodeState {
  switch (event.type) {
    case 'typed':
      // The field is disabled once used up; a stray change cannot refill it.
      return state.usedUp ? state : { ...state, code: event.code };
    case 'checkFailed':
      // A wrong code empties the field for the next try; a network failure
      // keeps it so the same code can be sent again.
      return {
        code: isWrongCode(event.error) ? '' : state.code,
        usedUp: state.usedUp || codeIsUsedUp(event.error),
      };
    case 'sent':
      // A new code: an empty, enabled field.
      return initialContactCodeState;
  }
}

/** What the step's primary button does. */
export type ContactPrimaryAction = 'continue' | 'send' | 'verify' | 'sendNew';

export function contactPrimaryAction(opts: {
  verified: boolean;
  codeSent: boolean;
  usedUp: boolean;
}): ContactPrimaryAction {
  if (opts.verified) return 'continue';
  if (!opts.codeSent) return 'send';
  return opts.usedUp ? 'sendNew' : 'verify';
}

/** The catalogue key for the primary button's label. */
export const CONTACT_PRIMARY_LABEL: Record<ContactPrimaryAction, string> = {
  continue: 'common.continue',
  send: 'contact.sendCode',
  verify: 'contact.verifyCode',
  sendNew: 'contact.code.sendNew',
};
