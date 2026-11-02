'use client';

// The registration number and the registered name. Shared by the first screen
// of the business step (when the number IS the question: search off, refused or
// "enter the number") and by the second, where the register's answer is
// confirmed. Split from BusinessDetailsStep (200-line rule).
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useText } from '../i18n';

export function BusinessNumberFields({
  isTin,
  number,
  numberValid,
  formatError,
  tip,
  placeholder,
  name,
  showName,
  nameRequired,
  onNumber,
  onName,
}: {
  isTin: boolean;
  number: string;
  numberValid: boolean;
  /** The country's format error, shown in place of the generic one. */
  formatError: string | null;
  tip: string | null;
  placeholder: string;
  name: string;
  showName: boolean;
  nameRequired: boolean;
  onNumber: (value: string) => void;
  onName: (value: string) => void;
}) {
  const t = useText();
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="registrationNumber">
          {t(isTin ? 'business.details.tinLabel' : 'business.details.registrationNumberLabel')}
        </Label>
        <Input
          id="registrationNumber"
          placeholder={placeholder}
          value={number}
          onChange={(e) => onNumber(e.target.value)}
          className={number && !numberValid ? 'border-destructive' : ''}
        />
        {number !== '' && !numberValid ? (
          <p className="text-sm text-destructive">
            {formatError ??
              t(isTin ? 'business.details.invalidTin' : 'business.details.invalidRegistrationNumber')}
          </p>
        ) : (
          tip && <p className="text-xs text-muted-foreground">{tip}</p>
        )}
      </div>

      {showName && (
        <div className="space-y-2">
          <Label htmlFor="registrationName">
            {t('business.details.nameLabel')}
            {!nameRequired && <span className="text-muted-foreground"> {t('business.optional')}</span>}
          </Label>
          <Input
            id="registrationName"
            placeholder={t('business.details.namePlaceholder')}
            value={name}
            onChange={(e) => onName(e.target.value)}
          />
        </div>
      )}
    </>
  );
}
