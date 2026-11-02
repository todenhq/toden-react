'use client';

import { useEffect, useState } from 'react';
import { openMicrophoneSession } from '../lib/document-microphone';

// The microphone for a workflow that records sound on the document clip.
//
// Asked for BEFORE the camera opens, which is why the step holds the camera on
// `settled`: a MediaRecorder cannot gain a track once it has started, and the
// recording starts the moment the camera stream arrives. It is its own request
// rather than `audio: true` on the camera's, because that request fails whole
// and a refused microphone must cost the sound, never the camera.

export interface DocumentMicrophone {
  /** Live while the camera may run. Null when refused or unavailable. */
  stream: MediaStream | null;
  /** The answer is in, either way. */
  settled: boolean;
}

const NOT_ASKED: DocumentMicrophone = { stream: null, settled: false };

export function useDocumentMicrophone(wanted: boolean): DocumentMicrophone {
  const [microphone, setMicrophone] = useState(NOT_ASKED);

  useEffect(() => {
    if (!wanted) return;
    const media = typeof navigator === 'undefined' ? undefined : navigator.mediaDevices;
    const close = openMicrophoneSession(media, (stream) => setMicrophone({ stream, settled: true }));
    return () => {
      close();
      setMicrophone(NOT_ASKED);
    };
  }, [wanted]);

  return microphone;
}
