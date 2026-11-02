// The attempt session every `POST /upload` names, so the server can count how
// many times a document was uploaded in one attempt (the "exceeded attempts"
// rule on proof of address and company documents).
//
// The API client is built before the session starts, so Verification writes
// the session here when /session/start answers and the upload reads it: the
// same module-state pattern as the device id (upload-device-id.ts). A hosted
// page needs none of this: its bearer already names the session.

let current: string | null = null;

export function setUploadSessionId(id: string | null): void {
  current = id && id.length <= 64 ? id : null;
}

/** Appends the session to an upload form, when there is one. */
export function appendUploadSession(form: FormData): void {
  if (current) form.append('sessionId', current);
}
