'use client';

import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { specimenSource, type DocumentSpecimenSubject } from './DocumentGhost';

// "Now turn it over": the sample document turning from its front to its back,
// in the place the camera will be. Mirrors the React Native and Flutter prompts.

const FLIP_DELAY_MS = 700;
const FLIP_MS = 800;

export function TurnOverPrompt({
  message,
  doneLabel,
  aspect,
  accent,
  subject,
  onDone,
}: {
  message: string;
  /** The button for someone quicker. Left off when the wait is short. */
  doneLabel: string | null;
  aspect: number;
  accent: string;
  subject: DocumentSpecimenSubject;
  onDone: () => void;
}) {
  const [turned, setTurned] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTurned(true), FLIP_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  const face = (rotate: number) => ({
    transform: `rotateY(${rotate}deg)`,
    backfaceVisibility: 'hidden' as const,
    transition: `transform ${FLIP_MS}ms cubic-bezier(0.65, 0, 0.35, 1)`,
  });

  return (
    <div role="status" className="flex flex-col items-center gap-4 animate-fade-in">
      <div
        className="relative w-full max-w-sm"
        style={{ aspectRatio: `${aspect}`, perspective: '900px' }}
        aria-hidden="true"
      >
        <img
          src={specimenSource(subject, 'front', aspect, accent)}
          alt=""
          className="absolute inset-0 h-full w-full motion-reduce:transition-none"
          style={face(turned ? 180 : 0)}
        />
        <img
          src={specimenSource(subject, 'back', aspect, accent)}
          alt=""
          className="absolute inset-0 h-full w-full motion-reduce:transition-none"
          style={face(turned ? 0 : -180)}
        />
      </div>
      <p className="text-center text-sm font-medium text-foreground">{message}</p>
      {doneLabel && <Button onClick={onDone}>{doneLabel}</Button>}
    </div>
  );
}
