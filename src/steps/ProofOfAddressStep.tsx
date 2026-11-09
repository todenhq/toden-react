'use client';

import React from 'react';
import { PoaAcceptedDocuments } from './PoaAcceptedDocuments';
import { poaKindLabel } from './ProofOfAddressParts';
import { PoaRequirements } from './PoaRequirements';
import { PoaUploadActions } from './PoaUploadActions';
import { PoaUploadedCard } from './PoaUploadedCard';
import { usePoaUpload } from './use-poa-upload';
import { StepHeader } from '../components/StepHeader';
import { AddressCountryControl } from './address/AddressCountryControl';
import { Button } from '../components/ui/button';
import { useVerificationContext } from '../context/VerificationContext';
import { useVerificationConfig } from '../context/VerificationConfigContext';
import { poaNamePolicy, poaOfferedKinds, stepAfterProofOfAddress } from '../lib/post-capture';
import { poaCountryOf, poaOfferedCountries } from '../lib/poa-country-gate';
import { lastContactStep } from '../lib/contact-steps';
import { hasSupportingDocumentsStep, verifiedIdsFromState } from '../lib/supporting-documents';
import type { AnyCountry, PoaDocumentType } from '../types/config';
import { useText } from '../i18n';
import { businessKey } from '../i18n/business-variants';
import { isScopedBusiness } from '../lib/scope';
import { poaKindDays } from '../lib/poa-subtypes';
import { cn } from '../lib/utils';

/**
 * Proof of Address: the applicant says which country the document is from,
 * picks its kind, sees what it must show, and takes a photo or uploads a file.
 * The server reads it asynchronously, recognises which document within the
 * kind it is, and checks the name, address and date. The SDK only collects it.
 */
export function ProofOfAddressStep() {
  const { state, dispatch } = useVerificationContext();
  const config = useVerificationConfig();
  const t = useText();
  const scoped = config.scope === 'address';
  const offeredCountries = poaOfferedCountries(config.proofOfAddress?.countries);
  // Where the document is from, on every scope; Continue holds while null.
  // Outside the address scope it starts from the ID's country and the
  // applicant can change it. See lib/poa-country-gate.ts.
  const poaCountry = poaCountryOf({
    scope: config.scope ?? null,
    selectedCountry: state.selectedCountry,
    poaCountry: state.poaCountry,
    idCountry: state.selectedCountry ?? config.country ?? null,
    offered: offeredCountries,
  });
  // Per-country overrides (the builder matrix's row cells) narrow the offer.
  const offeredTypes = poaOfferedKinds(config.proofOfAddress, poaCountry);
  // A kind picked before the country changed may not be offered there.
  const selectedType =
    state.poaDocumentType && offeredTypes.includes(state.poaDocumentType) ? state.poaDocumentType : offeredTypes[0]!;
  // The org can rename the 'other' kind in the workflow builder (e.g. "Council
  // tax letter"); fall back to the generic label when unset.
  const otherLabel = config.proofOfAddress?.otherLabel?.trim() || null;
  const labelFor = (type: PoaDocumentType) => poaKindLabel(type, otherLabel, t);
  const maxAgeDays = config.proofOfAddress?.maxAgeDays ?? 90;
  // Ask for what the server will check: where the name is not required on
  // this kind here (a Nigerian utility bill names the meter, not the tenant),
  // asking for it sends people hunting for a document they do not have.
  const nameNeeded = poaNamePolicy(config.proofOfAddress, poaCountry, selectedType) !== 'off';
  const uploaded = Boolean(state.mediaIds.proofOfAddress);
  const business = isScopedBusiness(config);
  const kindDays = poaKindDays(config.proofOfAddress, selectedType);
  const { inputs, cameraView, cameraOpen, uploading, error, pickedFile, pickFile, takePhoto, upload, clear } =
    usePoaUpload(selectedType);

  const handleBack = () => {
    // Supporting documents now sit ahead of this step, so Back lands there
    // when the flow asked for any — never past them onto the capture screen.
    const hasSupporting =
      config.scope !== 'address' &&
      hasSupportingDocumentsStep(config.supportingDocuments, verifiedIdsFromState(state, config));
    const backTo = hasSupporting
      ? 'supporting-documents'
      : config.scope === 'address'
        ? lastContactStep(config)
        : config.enableSelfie !== false
        ? 'liveness'
        : state.selectedIdType &&
            config.getIdTypeDefinition(state.selectedIdType)?.requiresDocumentCapture === false
          ? 'id-input'
          : 'document-capture';
    dispatch({ type: 'SET_STEP', payload: backTo });
  };

  const handleContinue = () => {
    // Pinned for the submission, which sends it as the document's country.
    if (poaCountry) dispatch({ type: 'SET_POA_COUNTRY', payload: poaCountry });
    const next = stepAfterProofOfAddress(config);
    dispatch(next === 'submitted' ? { type: 'SUBMIT_VERIFICATION' } : { type: 'SET_STEP', payload: next });
  };

  return (
    <>
    {/* "Take a photo": the SDK's own camera. The step stays mounted, hidden. */}
    {cameraView}
    <div className={cn('space-y-5 animate-slide-up', cameraOpen && 'hidden')}>
      <StepHeader
        title={t('proofOfAddress.title')}
        description={t(
          businessKey(nameNeeded ? 'proofOfAddress.description' : 'proofOfAddress.description.noName', business),
          { days: kindDays || maxAgeDays },
        )}
        onBack={handleBack}
      />

      {/* Every scope: where the document is from. On the address scope it is
          the flow's declared country; elsewhere the document's own. */}
      <AddressCountryControl
        value={poaCountry}
        label={t(businessKey('proofOfAddress.country.residence', business))}
        onPick={(code) =>
          dispatch(scoped ? { type: 'SET_COUNTRY', payload: code as AnyCountry } : { type: 'SET_POA_COUNTRY', payload: code })
        }
      />

      {offeredTypes.length > 1 && (
        <PoaAcceptedDocuments
          kinds={offeredTypes}
          value={selectedType}
          disabled={uploading || uploaded}
          onChange={(type) =>
            dispatch({ type: 'SET_POA_DOCUMENT', payload: { documentType: type, fileName: state.poaFileName ?? '' } })
          }
          poa={config.proofOfAddress}
          labelFor={labelFor}
          otherLabel={otherLabel}
        />
      )}

      <PoaRequirements
        kinds={offeredTypes}
        selected={selectedType}
        poa={config.proofOfAddress}
        labelFor={labelFor}
        otherLabel={otherLabel}
      />

      {inputs}
      {uploaded && !uploading ? (
        <PoaUploadedCard
          pickedFile={pickedFile}
          fileName={state.poaFileName}
          typeLabel={labelFor(selectedType)}
          country={poaCountry}
          onReplace={pickFile}
          onRemove={clear}
        />
      ) : (
        <PoaUploadActions capture={config.proofOfAddress?.capture} uploading={uploading} onCamera={takePhoto} onFile={pickFile} onDropFile={upload} />
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Continue arrives with the document: before it, the tiles are the action. */}
      {uploaded && (
        <Button
          onClick={handleContinue}
          disabled={!uploaded || uploading || !poaCountry}
          className="w-full h-12 rounded-xl text-base font-medium"
        >
          {t('common.continue')}
        </Button>
      )}
    </div>
    </>
  );
}
