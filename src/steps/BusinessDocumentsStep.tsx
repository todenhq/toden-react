'use client';

import React, { useState } from 'react';
import { StepHeader } from '../components/StepHeader';
import { Button } from '../components/ui/button';
import { useVerificationContext } from '../context/VerificationContext';
import { useVerificationConfig } from '../context/VerificationConfigContext';
import { nextBusinessStep, prevBusinessStep } from '../lib/business-application';
import {
  businessDocumentGroups,
  canLeaveGroup,
  firstOpenGroupIndex,
  groupUpload,
} from '../lib/business-document-groups';
import { useText } from '../i18n';
import { GroupStack } from './business-documents/GroupStack';
import { useGroupUpload } from './business-documents/use-group-upload';

/**
 * Business-documents step, one GROUP at a time: the documents an organisation
 * ticks in one group are alternatives, so the applicant uploads one per group
 * and never says which it is (the server recognises it). The groups are a
 * vertical stack: the previous group above (press it to change it), the open
 * group's card, then the next group below. Continue moves the stack on, and
 * the last group moves on through the flow. An
 * optional group can be skipped. Back walks the groups before leaving the step.
 */
export function BusinessDocumentsStep() {
  const { dispatch } = useVerificationContext();
  const config = useVerificationConfig();
  const t = useText();
  const groups = businessDocumentGroups(config.business, t);
  const docs = useGroupUpload();
  const [active, setActive] = useState(() => firstOpenGroupIndex(groups, docs.uploads));

  const index = Math.min(active, Math.max(groups.length - 1, 0));
  const group = groups[index];
  const hasUpload = group ? groupUpload(group, docs.uploads) !== null : true;
  const canContinue = group ? canLeaveGroup(group, docs.uploads) : true;

  const open = (next: number) => {
    docs.clearError();
    setActive(next);
  };

  const handleContinue = () => {
    if (!canContinue) return;
    if (index < groups.length - 1) {
      open(index + 1);
      return;
    }
    const next = nextBusinessStep('business-documents', config);
    dispatch(next === 'submitted' ? { type: 'SUBMIT_VERIFICATION' } : { type: 'SET_STEP', payload: next });
  };

  const handleBack = () => {
    if (index > 0) open(index - 1);
    else dispatch({ type: 'SET_STEP', payload: prevBusinessStep('business-documents', config) });
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <StepHeader
        title={t('business.documents.title')}
        description={t('business.documents.description')}
        onBack={handleBack}
      />

      {group && <GroupStack groups={groups} active={index} docs={docs} onOpen={open} />}

      <Button
        onClick={handleContinue}
        disabled={!canContinue || docs.uploading !== null}
        variant={!hasUpload && canContinue ? 'outline' : 'default'}
        className="w-full"
      >
        {!hasUpload && canContinue
          ? t('business.documents.skip')
          : index < groups.length - 1
            ? t('business.documents.next')
            : t('common.continue')}
      </Button>
    </div>
  );
}
