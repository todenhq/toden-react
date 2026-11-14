# Changelog

## 4.2.0

No breaking changes: upgrade with `npm install @toden/react@4.2.0`.

**Deploy note for Toden:** the letters-and-digits code and the work-address message need the matching server release, which sends `alphanumericCode` in the workflow and the `corporate_email_required` reason. Until then the code field stays digits only and a refused address shows the existing message. The declined screen likewise needs the server release that adds `declineOnLastAttempt` and the `session_declined` refusal, and the limit on liveness attempts needs the server release that adds `maxLivenessAttempts` and `/api/kyc/liveness/failed`. Until then no failure is counted and Try Again works as before.

### Added

- **Codes with letters as well as digits.** When a workflow's email or phone verification turns on `alphanumericCode`, the code field accepts letters and digits, upper-cases them, and opens a capitalising keyboard with autocorrect off. Paste and one-time-code autofill work the same way, and the instruction asks for the "6-character code". Digits-only codes are unchanged.
- **A clear message for work-address-only workflows.** When email verification takes work addresses only (`corporateOnly`) and the person enters a free-provider address, the SDK asks for a work email instead of showing a general error.
- **A screen for a session declined after too many incorrect codes.** A workflow whose email or phone verification sets the new `declineOnLastAttempt` declines the session when a code's attempts run out, and the server then refuses the session with `409 session_declined`. The SDK now ends the flow on a declined screen ("We couldn't verify your email address" or "We couldn't verify your phone number", or "This verification has ended" when the refusal comes at the hosted link) with the server's message and one Close button, and fires `onError` once with the new `session_declined` code, the same way a cancelled session does. The "continue on your phone" screen on a computer stops waiting and shows the same declined screen when the phone's session is declined. It never shows "Something went wrong / Try again".
- **A limit on liveness attempts.** On by default: 3 failed face checks, unless the workflow sets `maxLivenessAttempts` to 1 or 2, or turns the limit off with `false`. Each failed face check is reported to the server, and the failure panel adds how many attempts are left ("1 attempt left." or "2 attempts left.") under its message, shown as a small warning: an amber pill with a warning icon. At the limit the server declines the session (`session_declined` with reason `liveness_attempts_exceeded`), and the flow ends on the declined screen ("We couldn't verify your face") with the server's message and one Close button, firing `onError` once. A camera that cannot start, a detector that cannot load and a failed upload are not counted, and if the report cannot reach the server Try Again works as before. The builder preview never reports.

### Fixed

- **A used-up code can no longer be typed into.** Once a code's last attempt is spent (`attemptsRemaining: 0`, or a later `too_many_attempts`), the code field, paste and auto-submit are disabled, the message asks for a new code, and the main button becomes "Send a new code". Sending one clears the field and turns it back on. Before, the field stayed open and every entry just failed.
- **Document recordings survive a resumed session.** The recording of each document side was held in the browser until submission, so a session finished later (a reload, or coming back the next day) submitted the photos without it. It is now uploaded as soon as it is made, with the photos, as the React Native SDK already does.
- **Code errors are easier to see.** A wrong, expired or used-up code now shows in an alert box under the field, read out by screen readers, instead of a line of small red text.
- **A wrong code clears the field**, so the next try starts empty.
- **Enter sends.** Pressing Enter in the email, phone or code field does what the main button does: sends the code, or checks it.
- **Code boxes the size of the mobile SDKs'.** The boxes share the field's width at the React Native and Flutter shape and stop at 56px wide, so a short code or a desktop screen keeps phone-sized boxes, centred.
- **No horizontal scroll bar under the code field.** The field's hidden input was wider than the boxes, to make room for a password manager's icon.
- **No Close button that does nothing.** A full-page hosted link that ends on the cancelled or declined screen has nothing to close to, so it no longer shows Close. Inside your app, Close works as before.
- **A failed face check's message is never cut off.** "Time's up. Let's try again." and Try Again now rest on the bottom edge at their full height. They were squeezed into the strip under the camera window, which on a short screen cut off the top of the panel.
- **A document side is submitted with its own recording, or none.** A recording uploaded for an earlier capture of a side could still be submitted after that side was captured again: one restored with a resumed session took the place of the new recording, and a photo chosen from the device was submitted beside it. A new capture of a side now drops the side's earlier recording, and an upload that finishes after its side was retaken is dropped. A back captured for a two-sided ID picked earlier is no longer submitted with a one-sided one.

### Changed

- **Your organisation's logo by default, and a workflow's "None" wins.** With no `appearance.logo` from your app or the workflow, the flow shows your organisation's logo from the dashboard, as `'default'` does (it showed none). An empty `appearance.logo` (`''`) means no logo, and the workflow's value wins over the logo your app sets, as its theme does.
- **The flow follows the device's light or dark setting by default.** When neither the workflow nor your app sets a theme, the flow now opens in the applicant's device setting (`system`). It used to open in whatever mode the host page was in. Set `appearance.theme` (or the workflow's theme) to `light` or `dark` to pin it.
- **The chip step's preview shows the read applicants see.** The web SDK never reads a chip, but the builder preview of the step now plays the read the way the mobile SDKs show it: "Waiting for the chip", then each step ticking off. It no longer shows a pulsing "Waiting for your document…" line, or a note about desktops and phones without NFC, which was for the organisation, not the applicant (the builder's chip panel says it now). The `nfc.deviceNote` text is gone; a value set for it is ignored. New defaults, shared with the mobile SDKs: `nfc.description` "Hold your document flat against the back of your phone until it's read.", `nfc.waiting` "Waiting for the chip", `nfc.skip` "Continue without the chip".
- **The chip step's preview opens on the explanation the phones now show** (laid out like the address-monitoring explanation: how to hold a passport or card, then Continue) before it plays the read.


## 4.1.0

No API changes: upgrade with `npm install @toden/react@4.1.0`.

**Deploy note for Toden:** `sandbox-api.toden.co` and `api.toden.co` must be serving before this release reaches integrators (both answer today). The cut-off document retake needs the server's `complete` answer on the capture check. Until that server release, it never shows.

### Fixed

- **Verification codes can be typed.** In 4.0.0 the boxed email and phone code field rejected every digit typed; only pasting worked. It now accepts typing, paste and one-time-code autofill.

### API hosts

- Each environment now has its own host, as the docs list them: `pk_test_` keys go to `https://sandbox-api.toden.co` and `pk_live_` keys to `https://api.toden.co`. Both used to go to `https://trust.myaza.app`.

### Document capture

- A redesigned full-screen camera on phones: a top row with back, the document and the side, an instruction that shows its state, and Upload, the shutter and Light along the bottom. The desktop camera uses the same controls and never lets the guide touch them.
- A document that runs off the photo asks for a retake, beside the existing face and barcode checks ("Continue anyway" stays).
- The cropper: a NIN slip gets an upright box on phones, Rotate turns the photo a quarter at a time, and on phones it opens full screen with clearer handles. Its button reads "Use photo".
- "Take a photo" opens the SDK's own camera on desktop as well as phones, for proof of address, supporting documents and the entrance photo.
- Supporting documents can be captured with the camera, in a stacked carousel, and a signature pad has Clear.

### Steps

- A redesigned consent screen: the steps as a short timed journey, calmer copy and Toden's mark.
- The country and the ID are picked on one step. Proof of address and the business country of registration share one country row, with "Registered in" as its caption.
- Proof of address: pick the kind of document and see what counts, with accepted documents in a sheet.
- Every select is a floating bottom sheet on phones, with one header style for every sheet.
- The phone field offers only the workflow's dial-code countries.
- The liveness instruction eases between prompts. The selfie is chosen from the live run, front-on.
- Smaller fixes: the money error sits under the amount, the address check button reads "Continue with automatic checks", and the retired BVN Premium is never offered.

## 4.0.0

The first release as `@toden/react`. The version moves to 4.0.0 because everyone upgrading changes their install and imports, and because two capture defaults change.

**Deploy note for Toden:** ship the matching server release first. Business documents sent one per group, address book reuse and `sessionId` on `/contact/send` need it.

### Upgrading from `@myazahq/kyc-sdk-react`

- Remove `@myazahq/kyc-sdk-react` and install `@toden/react`, then change your imports (`@toden/react` and `@toden/react/styles.css`). The API is unchanged, and the deprecated aliases from 3.8.0 still work. `@myazahq/kyc-sdk-react` receives no further releases.
- The document review screen is now off unless a workflow (or the `documentReview` prop) turns it on. Uploaded photos are still always reviewed.
- A document is captured only once all four of its corners are in view. The photo that used to be taken after 6 seconds anyway is gone.

### OTP settings from the session

- The contact step sends `sessionId` on `/contact/send`, so the server reads the code length and attempts from the workflow the attempt is pinned to, and sizes the code field from the `codeLength` it returns.

### Document review and audio

- `documentReview` (default off): `true` shows the review screen after a document scan. Uploaded photos always get the review, and so does a scan that failed to upload or that the capture check could not read.
- `livenessAudio` (default off): records sound on the liveness recording. The consent screen does not mention it. The browser asks for the microphone before the camera opens. A refusal gives a video without sound.
- `documentAudio` (default off): records sound on the document capture video. The consent screen does not mention it. The browser asks for the microphone before the camera opens. A refusal gives a video without sound. In an iframe, allow it with `allow="camera; microphone"`.

### Liveness lighting judged on the face

- The liveness step no longer tells a well-lit person to move to a brighter area because the room behind them is dark. The light check now measures the skin in the middle of the face (forehead to upper lip, inside the cheeks), so a dark wall, a dark room, hair or a beard no longer count against it. With no face in view it still judges the whole frame, so a room too dark to find a face in still gets the warning.

### Business documents, one group at a time

- The business documents step groups what the organisation asks for (legal presence, company details, ownership structure, authority to represent the business, address, financial, tax, licences and permits). The applicant uploads one document per group, one group at a time, instead of facing a slot for every document.
- The applicant never says which document they uploaded: the group lists the documents it accepts, and the server recognises which one it is from its text. Uploads are sent as `{ group, mediaId }`.
- Each accepted document shows how recent it must be ("From the last 3 months") when the workflow sets a validity window. The date is checked after submission.
- A new screen: the groups are a vertical carousel. The open group's card is in front, the next group's card is tucked behind it at the top (showing its title and what it will ask for) and the previous group's card behind it at the bottom (its file, or Skipped, with Change to reopen it); a thin edge beyond each shows there are more groups that way. Continue brings the next card down into the middle; Back brings the previous one up. The open card shows its position ("2 of 5"), the documents the group accepts with how recent each must be on its own line, and a tall upload area that is itself the control: press it to choose a file or drop one on it (there is no separate Choose or Take a photo button, so Continue is the only primary button). Once uploaded, a card shows the file with Replace and Remove. A new upload replaces the group's earlier one.
- The button reads Next on every group but the last and Continue on the last; an optional group with nothing uploaded reads Skip.
- A finished group keeps its number, with a small tick on it, so the count stays visible. A file name that is a random id (as phone cameras often give) shows as Uploaded instead.
- An optional group can be skipped. Back steps through the groups before leaving the step.
- A refused submission (`missing_documents`) names the missing groups when the server sends `missingGroups`.
- Needs the matching server release, which accepts one document per group.

### The Toden address book

- When the organisation has it on, the address flow opens with a choice: use an address the person saved with Toden (an email, a six-digit code, then a pick) or enter one. A picked address skips the map, the entrance photo and the review, and is sent as `addressBookReuse` instead of a pin.
- A flow with a presence check lists only saved addresses whose presence was confirmed in the last six months, and says why others are missing.
- If the server refuses the picked address (the code expired or the address can no longer be used), the flow returns to the address book step instead of ending on an error.
- The review step offers an unticked box to save the confirmed address to the person's own Toden address book, with the directions and the entrance photo each included only if they choose.
- Never offered on business verifications.

### Scoped business workflows

- A business workflow with the address, questionnaire or contact scope now runs that scope's own steps. It never opens the business application (company search, registry lookup, key people, documents or the applicant's own check).
- Those screens name the business: the welcome screen, its list of steps, the email and phone code steps, proof of address, the address search, pin and review, the questionnaire and the success screen. A workflow's own wording for the person's version of a text still applies to the business version.
- A business workflow with a face check scope is refused with a clear error and never opens the camera. `onError` receives `invalid_workflow`.
- A submission the server refuses with `entity_type_mismatch` (the reference names a person on a business workflow, or the reverse) is reported as `invalid_workflow` with a clear message, not as something to retry.
- Fixed: Back on a questionnaire-only workflow went to the selfie step; it now goes to the contact codes, or the welcome screen.
- The text editor list shows the business application's texts on unscoped business workflows only, and the proof of address texts on business address checks too.

### Document capture

- A document is photographed only when all four of its corners are inside the visible frame, with a little room past each one. People were lining passports up against the bottom of the screen and cutting the machine-readable zone in half, which made it harder to read.
- The saved photo keeps that room: it is cropped to the corners plus 4% of the frame on every side.
- The capture button stays disabled until the corners are in view, and the hint says what to do: place the ID inside the frame, fit all four corners inside it, or move back a little. If the device cannot run the corner detector, the button works as before.
- The timed fallback that took a photo after 6 seconds without the corners is gone.
- Fixed: the framing hint said "Move back" whenever a card was found.

## 3.8.0

The entry point is now `Verification`, and the flow carries the Toden brand. The package name is unchanged.

**Deploy note for Toden:** this version calls the verification API under `/api/v1`. Production and Sandbox both serve it.

### New names

- The entry points are `Verification`, `useVerification`, `HostedVerification` and `VerificationConfig`.
- `KYC`-prefixed names are now `Verification`-prefixed: `VerificationError`, `VerificationSubmission`, `VerificationResult`, `VerificationStep`, `VerificationAppearance`, `VerificationProvider`.
- CSS hooks follow: `verification-root` and `--verification-success`.

Every earlier name still works as a deprecated alias (`MyazaKYC`, `useMyazaKYC`, `MyazaKYCHosted`, `KYCError` and the rest). Existing code needs no change.

Error objects keep their earlier `name` strings (`KYCError`, `KYCApiError`), so code that matches on them is unaffected.

### Brand

- The flow says Toden where it said Myaza: the footer logo, the consent notice (which now links to toden.co/legal) and the default wording.
- New default colours: a neutral grey scale in place of the purple-tinted one. Colours set through `appearance` or a workflow are unchanged.
- Headings, and text at 16px and up, are set in Bricolage Grotesque. Smaller text and anything typed into a field is Geist; the SDK names that family and your page supplies it, with the system font as the fallback. An organisation's own font still replaces both.

### API address

The SDK calls the verification API under `/api/v1` (for example `/api/v1/verify`). The earlier `/api/kyc` addresses keep working on the server, so older versions of the SDK are unaffected. If you proxy or allowlist SDK traffic by path, add `/api/v1`.

### Fixes

- The dark header uses the same surface colour as the cards. It was a pale purple band.

## 3.7.0

"Continue on your phone" is now tied to the verification this device started.

**Deploy note for Myaza:** needs a server that accepts `parentSessionId` on `POST /api/kyc/session` and `config` on `POST /api/kyc/session/start`. Production has both.

### The phone continues the same verification

When someone chooses to continue on their phone, the SDK now tells the server which verification the phone belongs to. Before, the phone's session stood on its own.

What this changes for the people verifying:

- The phone walks the flow the server holds for that verification. With a workflow that is the published workflow, not the browser's copy of it.
- A retry after a dropped connection finds the phone's existing session. It no longer creates a second one.
- A business flow that verifies the applicant can now be continued on a phone from an embedded mount. The server used to refuse it.
- The phone's link expires no later than the verification it belongs to.

The SDK starts the verification before it asks for the phone's link, so the QR code can take a moment longer to appear on a slow connection. If the verification cannot be started, the QR screen shows an error with Try again.

**One thing to know:** the phone no longer receives `userData` from the mount, so a name passed as a prefill is not filled in on the phone. Your user reference (`userId`) is kept, and the result is still linked to your user.

### Leaving the QR screen is safe

"Verify on this device instead" and closing the QR screen now wait for the server to take the phone's link back. The button shows "Switching…" while it does.

- If the phone already has the link open, the SDK says so and stays on the QR screen.
- If the server does not answer, the SDK asks the person to try again. It does not carry on with two devices both able to submit.
- If the link could not be created at all, there is nothing to take back and the person can continue on this device straight away.

The same applies to "Stay on this device" in the sheet shown on a phone.

New texts you can override under `texts`: `handoff.leaving`, `handoff.leave.unresolved`, `handoff.leave.inUse.phone`, `handoff.leave.inUse.otherDevice`, `handoff.leave.serverError`, `handoff.leave.refused` and `handoff.leave.offline`. The default for `handoff.linkFailed.description` changed.

### Preview mode no longer takes keyboard focus

With `previewMode`, the dialog no longer moves focus into itself when it opens or traps it there. A page that shows the SDK beside its own form keeps the caret where the person was typing. Real flows are unchanged.

No change to your code.

## 3.6.0

A full-screen liveness camera, signing on screen, and no selfie review by default.

**Deploy note for Myaza:** drawn signatures need a server with the signature upload route. The face tracking files are tried on the server first and fall back to the public CDN when the server does not serve them.

### The liveness camera is full screen

While the liveness camera is live it now takes the whole dialog, on desktop as well as on a phone. The camera fills the dialog, sharp inside a tall window for the face and blurred around it, with the instruction above the window and "Step 1 of 3" below. Back and close are drawn over the camera, and close stays hidden under `disableClose`. A line around the window shows progress, and the face is now judged against the window rather than the whole frame.

Where the browser cannot blur, the person prefers more contrast or less transparency, or the device cannot keep up, the surround is a plain tint instead. Phones that support it give a short buzz as each step passes.

No change to your code.

### No selfie review unless you ask for one

**This changes existing integrations.** After the liveness capture the SDK used to show the selfie with Retake and Continue. It now hands straight on to the next step. A liveness selfie is evidence, not a portrait, and the capture already waits for a face that is in the window and still.

Switch the review back on with `selfieReview={true}`, or with the switch on the workflow's Presence Intelligence step. On a biometric workflow its own setting wins. A selfie that fails to upload still shows the review, which is where the retry is.

### Going back to a finished liveness step

Going back to the liveness step after the selfie is taken now shows "Selfie already taken" with the photo and Continue. There is no Retake, so the check runs once per session.

### Sign a supporting document on screen

A supporting document in a workflow can now be signed on screen. The workflow sets `capture` on the document: `upload` (the default, as before), `draw` (a signature drawn on screen) or `draw_or_upload` (either). The person signs in a box with Clear and an Expand button for more room, and "Use this signature" stays disabled until there is real ink. With `draw_or_upload` they can switch to "Upload a photo of your signature instead".

After saving, the card shows the signature with an Edit action that reopens the box with the signature in it. A session picked up later shows a mark that it was signed, not the drawing itself.

Existing workflows are unchanged: a document with no `capture` is uploaded as before. The server must be on a version that accepts drawn signatures.

### Face tracking files load from the Myaza server

The liveness step downloads its face tracking files when it opens. They came from a public CDN only, with no version pinned, so a slow CDN meant the camera never started. They are now tried in order: your own host at `<assetsBasePath>/face-mesh/` when `assetsBasePath` is set, then the Myaza server, then the CDN pinned to one version. A source that fails or times out is skipped.

If you set `assetsBasePath` only for the gesture pictures, the SDK now asks your host for `face-mesh/face_mesh.js` first and moves on when it is not there. Under a Content Security Policy, allow the Myaza server in `script-src` and `connect-src`, or the SDK falls back to the CDN.

### The flash check tells the server when each colour came on

The submission now carries the time each flash colour came on, measured from the start of the recording, so the server's own check of the recording looks in the right place. Where the browser allows it (Chrome on Android and some webcams, not Safari), exposure and white balance are held still for the sequence. No change to your code, and an older server ignores the new field.

### The hosted map gets longer to load

The SDK waited 8 seconds for the hosted map before falling back to the built-in one. It now waits 20 seconds, which a slow connection needs.

### New texts

`presence.camera.secure`, `presence.camera.stepCount`, `presence.review.captured`, `presence.review.saving`, `presence.review.doneTitle`, `presence.review.doneDescription`, the `supportingDocuments.signature.*` group, `supportingDocuments.error.signatureEmpty` and `supportingDocuments.error.signatureFailed`.

## 3.5.0

A screen for a cancelled verification, and a device ID on uploads.

**Deploy note for Myaza:** this version sends a new `X-Myaza-Device-Id` header on uploads. The server must allow that header before this version is used against it, or the browser refuses every upload.

### A screen for a cancelled verification

An organisation or Myaza support can now cancel a verification session midway. When the server says a session is cancelled (on start, on a progress save, on submission, or in the result check), the flow stops on a screen reading "This verification was cancelled", with the server's message and a Close button. There is no Try again or Go back: the session cannot continue until it is reopened from the dashboard. `onError` fires once with the new code `session_cancelled`.

A failed session start used to be ignored so the flow could carry on. A cancelled session is the one exception: the flow now stops instead of walking the person through steps the server will refuse.

On a hosted link, the screen also appears when the person reopens a link they already finished and the application was cancelled afterwards, instead of a generic error.

### Device ID on uploads

When the workflow's Device Intelligence is on, every upload now carries the same per-install device ID the submission's fingerprint carries, so the server can tell when one session's captures came from more than one device. The fingerprint also gains a small entropy block (an audio render hash and a check for a fixed list of fonts). Nothing is collected when Device Intelligence is off.

## 3.4.1

A way back after a refused submission.

### Go back after a refused submission

When the server refused a submission, the error screen offered only Close, even when its message asked the person to fix something earlier in the flow. It now also offers Go back, which returns to the step that can fix the refusal: company documents, company details, key people, supporting documents, questionnaire, proof of address, address, or the photo a refused upload names. When the refusal doesn't point at one step, Go back returns to the step before submission. Coming back to the end submits again. Refusals that going back can't fix (not enough credits, an invalid API key) still show Close alone.

The button reads "Go back". You can change it with the `result.error.goBackButton` text.

## 3.4.0

The progress bar becomes the default indicator, plus fixes on the address confirmation screens.

### The progress bar is now the default indicator

A workflow or config that doesn't choose a progress indicator now shows the thin bar on the header's bottom edge instead of the numbered step circles. To keep the circles, set `progressStyle: 'steps'` (or choose Steps in the workflow builder). Workflows that already chose a style are unchanged.

### "Edit" keeps clear of the entrance photo on the address review

On the "Confirm your address" card, the "Edit" link sat right against the entrance photo that hangs over the card. When a photo is there, "Edit" now sits under the address instead; without one it stays where it was.

### The address intro button now reads "Continue"

The button on the "Let's confirm your address" screen said "Got it, let's go". Google Play's guidance for the disclosure shown before a background location request asks for a clear accept button rather than a vague "Got it", and a reviewer can treat this screen as that disclosure. The default is now "Continue". If you set your own text for `address.intro.start`, nothing changes for you.

## 3.3.0

Passive Liveness, customisable texts, the organisation's own footer logo, silent capture and a bright screen during liveness.

These features need the Myaza server release of 2026-09-28. Against an older server the flow still completes: the new settings are simply ignored, and silent frames are refused at upload and left out.

### Passive Liveness, and a head turn in every 3D Active Motion run

`livenessMode: 'passive'` asks the person to hold still for a moment while the SDK records a short clip and takes the selfie. There are no prompts: Myaza's liveness model decides from the capture. 3D Active Motion now always includes a head turn among its prompts, and the SDK reports the prompts it ran with the submission.

### Customisable texts

A workflow can reword the main text of each screen (titles, descriptions, checklists, labels and buttons) through its `texts` setting. Errors, legal lines and anything with a value filled in keep the SDK's own wording. The older copy fields (`consent`, `success`, `questionnaire`) still take priority over `texts` for the same line. The new `@myazahq/kyc-sdk-react/texts` entry exports the catalogue (`TEXT_GROUPS`, `DEFAULT_TEXTS`, `resolveText`) for editors.

### The organisation's own footer logo

When a workflow uses custom trust branding, its logo replaces the Myaza mark in the footer, with a separate logo on dark flows when one is set. The consent notice then names Myaza Trust as the processor for the organisation, since Myaza still processes the applicant's data.

### Silent capture

When the document camera faces the person (a laptop webcam), the SDK takes up to three unposed frames of them, one per side, so a reviewer can see who was holding the ID. A phone's rear camera takes none. It is on by default; a workflow turns it off with `silentCapture: false`.

### A bright screen during liveness

While the liveness camera is on, the flow shows its light theme so the screen lights the face, then restores the theme afterwards. The flash check's baseline between colours is now black. A workflow turns this off with `livenessBrightScreen: false`.

### Liveness is reported more honestly

A flash sequence that could not be measured no longer counts as passed, and a liveness recording that fails to upload is reported with its reason instead of silently missing.

### Selfie guidance

The selfie primer asks for a bright spot with no glare and an uncovered face (glasses off), and no longer states a duration.

### Fixes

A resumed KYB application replays the committed application. The consent screen discloses supporting documents the flow may ask for. The driver's licence is drawn as an ID card again, and the Privacy Policy link text is restored.

### No presence promise in a browser flow

The success screen, the returning applicant's completed screen and the address primer no longer tell the applicant an address presence check is running. Only the mobile SDKs can report presence, so a browser flow (a hosted link or a web embed) can never collect evidence, and the server now starts no watch for one. The builder preview still shows these screens, since there the web SDK stands in for the mobile flow. In the preview, the primer now describes background monitoring unless the workflow turns it off, matching its new default.

## 3.2.1

The CommonJS build loads again, and a multi-region workflow keeps its ID types.

### The CJS build no longer resolves to zero icons

`@hugeicons/core-free-icons` declares `"type": "module"` at its root while
pointing `require` at `dist/cjs/index.js`, and ships no `package.json` marking
that directory CommonJS. Node parses its CJS entry as ESM: on Node 20 and 22 the
require throws `exports is not defined in ES module scope`, and on Node 24 it
resolves silently to an object with ZERO keys, so every icon renders as nothing.
Left external, this SDK's CJS build inherited that. It is now bundled, so the
icon path data tree-shakes to the glyphs we draw and no consumer ever requires
the broken package.

### A consumer's `idTypes` prop can no longer narrow a multi-region flow

Such a flow declares its offering inside `countries[]`, where a country pinning
nothing already means "every granted ID for that country", and leaves the
top-level list unset. The merge read that unset value as "the flow did not
define it" and kept the prop, which the config context then falls back to for any
country pinning none of its own — so a hardcoded `['bvn','nin','passport']`
reduced a 58-country flow to three Nigerian types, on every country. The prop is
now dropped at the merge, so a flow that sets its OWN top-level list still wins
and single-country flows are unchanged.

### Retake draws a circular arrow, not a rotating hand

Lucide's `RotateCcw` is a circular arrow; Hugeicons reuses the name for a hand
rotating an object, so every Retake and retry control drew a hand. The fourth
name collision in this set found by comparing path data rather than names.

## 3.2.0

### Dark mode: the card surface is not the border's colour

`--secondary` and `--border` were both `#302D53` in dark, so anything bordered
ON a card drew its edge in the card's own colour and vanished — the
supporting-documents dropzone lost its dashed outline and the divider above it
disappeared. The card now takes `#0F0C2E`, the surface the React Native and
Flutter SDKs already use against that same border, so the three agree.

### The back control draws a long arrow

Hugeicons' `MoveLeft` is a move affordance (an arrow trailing a dot) and its
longest true left arrow spans 13.5 of the 24-unit viewBox against Lucide's 20,
so the glyph is drawn locally in `components/icons/glyphs.ts` — the one
deliberate exception to drawing everything from the set.

### The fullscreen toggle draws a real expand icon

`Maximize2`/`Minimize2` resolve to pinch-gesture glyphs in this set. They now
take `Expand` and `Collapse`, the glyphs the dashboard draws.

### One icon set across the product

The SDK now draws Hugeicons Stroke Rounded, the set the dashboard already moved
to, so the product no longer renders two icon languages at two stroke weights.

Every icon comes through `src/components/icons/`, which wraps `HugeiconsIcon` at
a 1.6 stroke in `currentColor`, decorative unless the caller passes an accessible
name. Each is exported under the name Lucide gave it, so call sites keep their
intent-led names and the Flutter SDK stays in lockstep by NAME rather than by
glyph. Where the dashboard had already chosen a glyph for a name, that exact
choice is repeated rather than re-picked.

Nothing in the public API changes and an existing integration needs no code edit.

- `lucide-react` is no longer a dependency, and a guard test fails the build on
  an import of it.
- The size default stays 24, since every call site here was written against it
  and almost all size the glyph with a class, which wins either way.

## 3.1.0

### Supporting documents

A new step collects the artefacts an organisation holds **on file** — a NIN slip,
a signed mandate, a bank letter — as opposed to the identity evidence the
verification is decided on. It sits after the identity checks and before proof of
address, because the documents are resolved against the ID the person actually
verified with.

There is no catalogue. The organisation names each document it asks for, so the
SDK renders the title and guidance the workflow sent rather than captioning a key
it recognises. A document with no title is not asked for at all.

Entirely workflow-driven (`supportingDocuments` on the resolved config), so no
props change and an existing integration needs no code edit to receive it.

- One card per requested document, naming **what the document is being taken
  for**: the values the server will read off it appear as chips under the
  guidance, so a slot says more than a noun.
- Per-document **ID scoping**. A document scoped to `NG/nin` is never demanded of
  a passport holder, which is what stops the step being a dead end.
- **`alwaysAsk`** shows the slot to everyone while the scope decides only who
  must provide one, for an organisation that will take a document from anybody
  who has it.
- Where nothing is required, Continue reads **Skip**: pressing on is a deliberate
  choice to add nothing.

### Fixes

- An address flow that verifies by document alone no longer opens a map, and its
  consent notice no longer promises one it never shows.
- A flow with nothing to capture is no longer offered a phone handoff.
- Choosing to verify on this device now gives the handoff session back instead of
  leaving it open.

## 3.0.0

### Face re-authentication has one entry point (breaking)

`MyazaBiometricAuth` and its `MyazaBiometricAuthProps` type are **removed** from
the package's exports.

Face re-authentication now runs through the ordinary entry point. Mount
`<MyazaKYC/>` with a workflow whose scope is `biometric-authentication`, and the
flow parks on the real liveness step and submits to `/verify` under that scope's
marker ID type, exactly as every other scoped workflow does:

```tsx
<MyazaKYC
  apiKey={apiKey}
  workflowId="wf_…"     // a workflow scoped to biometric-authentication
  userId={userId}       // the enrolled entity's reference
  onResult={handleResult}
  onError={handleError}
/>
```

If you imported `MyazaBiometricAuth`, replace it with the mount above. Nothing
else changes: the same check runs, against the same enrolment reference, and
returns the same verdict.

**Why it went rather than being deprecated.** A second component meant two code
paths for one behaviour, and that is how the two drift — a fix or a copy change
lands in one and not the other. Keeping a deprecated shim would have preserved
exactly the duplication the change exists to remove. Nobody had integrated the
component, so an outright removal costs less than a shim nobody needs.

The `/api/kyc/biometric/*` endpoints are unaffected and remain available for
direct server-to-server integration. No SDK calls them.

### Version alignment

The web, React Native and Flutter SDKs now all carry **3.0.0** for the same
release, so a given version number means the same generation of the product on
every platform.
