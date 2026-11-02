// One go at the microphone for the document clip. A plain function so the
// awkward part, a grant landing after the camera has already closed, is tested.

type Media = { getUserMedia?: MediaDevices['getUserMedia'] } | undefined;

/**
 * Ask for the microphone and report the answer once: the stream, or null when
 * refused or unavailable. The returned function ends the session: it stops the
 * stream, and a grant that arrives afterwards is stopped on arrival, so the
 * browser's recording indicator never outlives the camera.
 */
export function openMicrophoneSession(
  media: Media,
  onSettled: (stream: MediaStream | null) => void,
): () => void {
  let closed = false;
  let live: MediaStream | null = null;
  const stop = (stream: MediaStream | null) => stream?.getTracks().forEach((track) => track.stop());
  const finish = (stream: MediaStream | null) => {
    if (closed) return stop(stream);
    live = stream;
    onSettled(stream);
  };
  if (media?.getUserMedia) {
    media.getUserMedia({ audio: true, video: false }).then(finish, () => finish(null));
  } else {
    finish(null);
  }
  return () => {
    closed = true;
    stop(live);
    live = null;
  };
}
