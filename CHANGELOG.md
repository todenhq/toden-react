# Changelog

## 4.4.1

No breaking changes. No server release needed.

### Fixed

- **Hosted verification links open again.** In 4.4.0, every hosted link (the page a person opens from a verification link or the "continue on your phone" QR code) failed right after loading with "Something went wrong". The part of the flow that restores a person's saved progress now reads the workflow's settings from inside the flow, where they are available. Embedded `<Verification />` was not affected.

## 4.4.0

No breaking changes.

**Deploy note for Toden:** two things here need the matching Toden server release. The country following a person to their phone is kept on the session by the server; until then the phone opens on the workflow's own country. The voice chosen for each person comes from what the server says about each voice; until then a workflow with a voice speaks with it, and one without speaks with the device's voice, as before.

### Added

- **`country` chooses among a multi-country workflow's countries, and `lockCountry` removes the picker.** On a workflow that offers several countries, the `country` you pass is now the one the country picker opens on, listed first, ahead of the workflow's own country and the visitor's location. Add `lockCountry` and the person is not asked at all. A country the workflow does not offer is ignored, and on a single-country workflow nothing changes.
- **The country follows the person.** A phone that continues the session from the QR code opens on the same country, locked if it was locked. A hosted link can name one with `?country=GH`, and `&lockCountry=1` removes the picker.
- **A Toden voice by default, from the person's own country.** The liveness prompts are now spoken by a Toden voice unless the workflow names the device's own (`voiceGuidance.voice: 'device'`): a voice from the country of the document being verified (a Nigerian hears a Nigerian voice, a Kenyan a Kenyan one), else a neighbouring country's (a Tanzanian hears a Kenyan voice; Toden's own short list), else the workflow's `voice`, else an American voice. `localVoice` chooses how: `'any'` (the default), `'female'`, `'male'`, or `'off'` to skip the person's country and its neighbours; `localVoiceNeighbours: false` skips neighbours only. One voice is chosen per person (by `userId` when you pass one) and kept for the session.

### Changed

- **The device's voice is no longer the default.** A workflow or app that names no voice used to speak with the device's voice; it now speaks with a Toden voice as above. Set `voiceGuidance: { voice: 'device' }` to keep the device's voice. A prompt with no Toden clip (a workflow's own wording, a language other than English) is still said by the device's voice.
- **A document cut off by its photo must be taken again.** When the capture check says the document runs off the photo, the review offers only the retake. "Continue anyway" is still offered for a face or a barcode that could not be read. The verification fails a cut-off document, so continuing only spent the attempt.
- **Sharper document photos.** The document camera asks for 2560 by 1440 on a capable phone (1920 by 1080 otherwise), and the photo is compressed once, at JPEG 0.95, up to 2600 pixels on its longer side. A card's barcode keeps its bars, so it can be read from the photo.
- **The photo waits for its recording.** No photo of a document side is taken until that side's recording has run 2.2 seconds: the automatic photo is held while the card stays found, and the shutter waits out the remainder. The back's recording now starts with the turn-over. A shorter recording could not be checked against its photo.
- **Bigger country rows.** A country in the picker is a 40 pixel flag in a 72 pixel row (it was 32 in 64), easier to pick with a thumb.
- **The sample of a Nigerian voter's card and driver's licence matches the card.** The voter's card back shows its two barcodes at the top and its front shows none; the Nigerian licence back shows its short barcode at the top right with the large block under it. Other countries' licences keep the general sample.

### Fixed

- **A resumed session cannot bring back a country the flow no longer offers.** A session saved on one country and reopened with another locked used to open on the saved one. It now starts again on the country the flow offers.

## 4.3.0

**Deploy note for Toden:** Toden voices need the matching Core release, which serves the voice manifest and clips (`/api/kyc/assets/voices/…`) and lets an organisation pick a voice in the workflow builder. Until then, and while the `voice_guidance.voices.enabled` switch is off, the manifest answers 404 and every prompt is spoken by the device voice as before.

### Added

- **Core picks the head directions.** With head directions, each liveness attempt asks Core which directions to ask for and in what order (`POST /api/v1/liveness/directions`, a fresh plan per attempt), asks exactly those, and names the plan in the liveness claim, which Core checks when the verification is processed. The first instruction waits a moment for the plan; without one (an older Core, or no answer in time) the SDK picks its own as before, and Core records that no plan was named.
- **Head directions for the liveness camera** (`livenessGestureSet: 'directions'`). The camera asks for head movements from turn left, turn right, look up and look down: three unless the workflow sets two or four (`livenessDirectionCount`), always with at least one head turn, picked and ordered for the session. Each direction is said, written and shown: the gesture face turns that way, and the line round the window is cut into four sides, of which the one to turn to lights up in amber and thicker, and turns green when it is done. The sides still to do are a quiet white line, and a soft shadow keeps the line readable over a pale wall or a dark room. The amber can be changed with the CSS variable `--verification-attention`. When they are all done the line closes into one green ring. Going the wrong way never fails the check. The classic gestures (nod, turn, blink, smile) stay available as `'classic'`, which is also what a workflow without the setting asks for. New workflows start on head directions in the workflow builder.
- **A pause before the first gesture.** Once the face is in place the camera says "Hold still" for a moment before asking for anything, and prompts that follow one another are now a breath apart.

- **Toden voices for the liveness prompts.** A workflow can now pick one of Toden's own voices for the spoken liveness instructions (`voiceGuidance.voice`, for example `'lyra'`), and your app can set one with the `voiceGuidance` prop. When the liveness step opens, the SDK fetches that voice's recorded clips from the Toden server in the background and plays them in place of the device's speech engine. Nothing waits on them: a prompt whose clip has not loaded, a language with no clips, a workflow's own wording, or any clip that fails to load or play is spoken by the device voice, exactly as before. The clips come from the server the SDK already talks to and play through Web Audio, so a site with a Content Security Policy needs no new directive. Without a voice nothing is fetched. The `voiceGuidance` prop now overrides the workflow's setting key by key: `{ voice: 'rory' }` keeps the workflow's `enabled` and `language`, and `voiceGuidance={false}` turns guidance off for your app whatever the workflow says. Before, the workflow's setting replaced the prop.

### Fixed

- **The liveness step loads on a slow connection.** Each source of the face tracking files had 25 seconds to download about 5 MB and start. Below about 2 Mbps that was not enough: the step gave up on the Toden server while the files were still arriving, downloaded them all again from the public CDN alongside the abandoned downloads, missed its 25 seconds too, and showed "Failed to load liveness detection". A source is now given up only when it fails: it does not answer within 15 seconds, the start fails, it answers one of the files with an error, or nothing has finished for two minutes. A source that is only slow is waited for, and its files are downloaded once.
- **The selfie review looks as the camera did, with the face in the window.** After the liveness camera took the selfie, the "Selfie captured" screen spread the tightly cut photo over the whole camera area, so on a desktop the face was enlarged past the window. The review now shows the camera picture the selfie was taken from, as the camera showed it and under the same light blur, with the face moved to the middle of the window. If the face was held so close that it would spill over the window, the picture is made smaller until it fits. The photo that is uploaded has not changed.
- **The face window grows with a full-screen desktop camera.** The window for the face stopped at 330 pixels wide on a desktop, which suits the modal. With the camera filling a large screen, the picture was drawn much larger while the window stayed the same, so people had to move well back from the screen to fit their face in it. The window now grows with the screen: about 455 wide on a 1440 by 900 screen and about 660 on a 2056 by 1204 one. The modal and phones are unchanged.

### Changed

- **No step count on screen during head directions.** The four-sided line already shows how far along the check is, so "Step 1 of 3" under the camera is now for screen readers only, which do not see the line. The classic gestures keep the count on screen.
- **"Good. Now flip your card over to scan the back."** The turn-over line starts "Good." to match what is said after each gesture. A workflow that sets its own `uploadDocument.flipBanner` keeps it.
- **A passed gesture is said "Good." in place of "Great!".** Said after every gesture, "Great!" sounded over-excited; "Good." is calm and shorter. The same word on web, React Native and Flutter, and in every Toden voice. A workflow that sets its own `presence.challenge.passed` text keeps it.
- **A face icon acts out each liveness gesture.** The cartoon picture that acted out each gesture above the camera window is gone. In its place a face icon, in the manner of a phone's face unlock, pops up in the window, acts out the gesture being asked for once (turn, nod, blink or smile), and goes, quicker than it came, so the person has the window to themselves. It comes back only if they stop responding (nothing done with their face for 5 seconds), and stays away while they are asked to move into place, for the flash and the hold-still check, and once the gesture lands. The instruction above the window still says each gesture in words. It is a picture only: hidden from screen readers, and a single pose when the device asks for less motion. It never touches the camera picture, so the recording, the selfie and the flash check are unchanged. A workflow can turn it off with the new `livenessGestureGuide` setting (the builder's "Show each gesture" switch); the `livenessGestureGuide` prop does the same. It is drawn in white lines, as the line round the camera's window is.
- **The screen before the liveness camera shows what is coming.** In place of its face icon and the tinted box round it, the "Let's confirm you're really here" screen now shows a small copy of the camera's window, standing on the page by itself, with a cartoon person in it. They come in once and settle, then turn, nod, blink and smile in a loop, while the line round the window fills green one part per gesture. Each gesture ends as it does in the camera, with a light green cover over the window and a tick that pops up at once; when the four parts have joined, it starts again. A passive check shows them holding still while the line closes. It is a picture only: hidden from screen readers, and still when the device asks for less motion. The sentence under the title is gone, since the picture now says it; a workflow that has written its own sentence there (`primer.selfie.body`, `primer.selfie.bodyPassive`) still has it shown. The person is painted in shades of the workflow's own colour, skin, hair and clothes alike, so they have no skin colour and stand for anyone. The character is "Toon Head" by Johan Melin, used under CC BY 4.0, with short hair of our own.
- **The builder preview's liveness heading names no method.** The preview stood in for the camera with "Confirm you're present" and "Real users complete gesture challenges and a selfie here", which was wrong for the flash and passive checks. It now shows the real step's own heading ("Face check" and its description, or the workflow's own wording for them), and a passive check's own intro screen.
- **The screen before the document scan shows a scan.** In place of its icon, the document screen's tinted box now shows the document the person chose within the camera's frame marks, drawn with the same sample the camera's guide shows: a line of light reads it, a light green cover and a tick say it worked, and a document with two sides turns over to its back, which is read the same way. A passport page, or any one-sided document, is read again after a rest. It is a picture only: hidden from screen readers, and still when the device asks for less motion.
- **The document step names the document, and says "Passport".** The screen before the document camera no longer repeats a title and a sentence under its picture ("You're about to scan your ID" and "We'll photograph your document…"): the step's heading above already names the document and says what to do. A workflow that has written its own title or sentence there still has it shown. The checklist names the document ("Have your Passport with you") and says the scan "Takes a few seconds", not "about a minute". The three texts take a `{document}` placeholder, so a workflow's own words for them can name it too. A passport is called "Passport" throughout the step, in its heading ("Capture Your Passport"), the "Required" badge and the camera's hints, not "International Passport".
- **The builder preview's document heading is the real step's.** "Scan your document" and "Real users capture the front (and back) of their ID here" are replaced by the heading the document step really opens with (for example "Scan Front of Your National ID" and its line), or the workflow's own wording for it.
- **The face check's list starts with what to take off.** "Put your face in the circle" is gone from the list before the liveness camera: the picture above it shows the window, and the camera says so when the face is not in it. The other three lines are unchanged. A workflow's own words for that line (`primer.selfie.checklist1`) are no longer shown on the web.
- **A one-sided document is scanned, in the same words as the others.** The heading for a passport or a one-sided card read "Capture Your Passport" and "Photograph your Passport. Position it within the frame and hold steady." It now reads like the two-sided ones: "Scan Your Passport" and "Place your Passport within the frame." Only the defaults change (`uploadDocument.title.capture`, `uploadDocument.description.capture`): a workflow's own words are kept.
- **No "I've turned it over" button.** After the front of a two-sided card is captured, the prompt that turns the sample card over no longer has a button to skip its wait: it moves on to the back by itself, after the same wait as before.
- **The card turns over in the camera's frame, and the camera keeps running.** After the front of a two-sided card was taken, the camera switched off, a separate, smaller sample card turned over in a layout of its own with the frame gone, and the camera started again behind a spinner for the back. The camera now stays on from the front to the back, and the sample already in the frame turns over where it stands, at the same size and with the frame around it, under the instruction to turn the card. The back's sample then stays in the frame for the back scan and fades as the front's does. The header already names the back, so nothing moves when the back scan starts.
- **"Liveness Check" is now "Face check".** The title of the liveness step uses a word people know. Only the default changes (`presence.title`): a workflow that sets its own title keeps it.
- **No gesture picture files.** The SDK no longer ships the `gifs/` folder (about 1.8 MB) or loads a picture per gesture. `assetsBasePath` now only points at your own copy of the face tracking files (`<assetsBasePath>/face-mesh/`); if you set it only for the gesture pictures you can remove it, and the copied `gifs/` folder on your host is no longer read.
- **Plainer liveness instructions, the same on every Toden SDK.** The prompts drop "Kindly", use UK spelling, and now read and sound the same on web, React Native and Flutter, which lets a Toden voice clip match them. Only the defaults change: a workflow's own wording is still shown, and spoken by the device voice.
  - "Kindly position your face in the circle" is now "Position your face in the circle"
  - "Kindly move closer" is now "Move closer"
  - "Kindly move further away" is now "Move further away"
  - "Kindly center your face" is now "Centre your face"
  - "Kindly look straight at the camera" is now "Look straight at the camera"
  - "Kindly hold still" is now "Hold still"
  - "Kindly come back to position" is now "Move back into position"
  - "Too bright, reduce glare" is now "Too bright. Reduce the glare"
  - "Kindly nod your head" is now "Nod your head"
  - "Kindly turn your head" is now "Turn your head"
  - "Kindly blink your eyes" is now "Blink your eyes"
  - "Kindly smile" is now "Smile"
  - "Hold still" before the screen flash is now "Hold still. The screen will flash briefly"
  - "Kindly move away from bright light and hold still" (the flash retry) is now "Move away from bright light and hold still"
  - "Kindly hold still..." at the final capture is now "Hold still…"
  - "Time's up. Let's try again." is now "Time's up. Please try again."
- **Spoken prompts take turns.** A prompt is no longer cut off when the next one comes: the new one waits until the one being said has finished, then a short pause, and only the newest waiting prompt is said, so guidance that changed twice meanwhile does not fall behind. Cut-off prompts ran into each other ("Hold sti- Turn your head") and could be heard as one garbled instruction. The SDK also unlocks audio on the person's first tap anywhere on the page, so a Toden voice plays even when the flow reaches the camera without the liveness step's own Start button.
- **A better device voice.** When no Toden voice plays, the SDK now picks the more natural-sounding voices the browser offers in the language (Edge's "Natural" and "Online" voices, Chrome's Google voices, Apple's "Premium" and "Enhanced" ones) ahead of the default local voice, and speaks at a natural pitch rather than slightly raised.

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
