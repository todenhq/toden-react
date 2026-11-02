'use client';

import React, { useEffect, useState } from 'react';
import { Check, ScanLine, UserRound } from '../components/icons';
import { useText } from '../i18n';

/** How often the status line moves on to the next thing being looked for. */
const STAGE_MS = 3500;
/** After this long, say that long documents take longer. */
const SLOW_MS = 20_000;

const STAGES = ['keyPeople.reading.stage1', 'keyPeople.reading.stage2', 'keyPeople.reading.stage3'] as const;

/**
 * The key-people step while the company's documents are read for the people
 * they name (lib/document-people.ts). It fills the step, so the person waiting
 * sees what is happening and why: a page being read, each person it names
 * lifted off the page into a list beside it, and a line saying what is being
 * looked for. When it finishes with people found, it says how many before the
 * list appears. It gives way on its own if the read runs long
 * (use-reading-screen.ts), so nobody is held here. Mirrors the React Native
 * and Flutter SDKs' reading screens.
 */
export function KeyPeopleReadingScreen({ found }: { /** People found, once the read has finished; null while reading. */ found: number | null }) {
  const t = useText();
  const [stage, setStage] = useState(0);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (found != null) return;
    const tick = setInterval(() => setStage((s) => (s + 1) % STAGES.length), STAGE_MS);
    const later = setTimeout(() => setSlow(true), SLOW_MS);
    return () => {
      clearInterval(tick);
      clearTimeout(later);
    };
  }, [found]);

  const done = found != null;
  const status = done
    ? t(found === 1 ? 'keyPeople.reading.foundOne' : 'keyPeople.reading.foundMany', { count: found })
    : t(STAGES[stage]!);

  return (
    <div
      aria-busy={!done}
      className="flex min-h-[26rem] flex-col items-center justify-center gap-7 py-4 text-center animate-fade-in"
    >
      <PeopleLiftedOffThePage found={found} />

      <div className="max-w-sm space-y-2">
        <h3 className="font-heading text-xl font-semibold text-foreground">{t('keyPeople.reading.title')}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{t('keyPeople.reading.description')}</p>
      </div>

      <div
        role="status"
        aria-live="polite"
        className="flex min-h-[2.5rem] items-center gap-2.5 rounded-full border border-border bg-muted/40 px-4 py-2 text-sm font-medium text-foreground"
      >
        {done ? (
          <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        ) : (
          <ScanLine className="h-4 w-4 shrink-0 animate-pulse text-primary motion-reduce:animate-none" aria-hidden />
        )}
        <span key={status} className="animate-fade-in">
          {status}
        </span>
      </div>

      {!done && slow && (
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground animate-fade-in">{t('keyPeople.reading.slow')}</p>
      )}
    </div>
  );
}

/**
 * The rows on the page that name a person, each with when the beam reaches it
 * (a share of the 3.6s sweep, globals.css) and the card it becomes. The card
 * sits level with its row, so lifting off is a slide to the right.
 */
const PEOPLE = [
  { top: '4.25rem', delay: '1.33s', name: '62%', role: '38%' },
  { top: '7.5rem', delay: '2.09s', name: '74%', role: '46%' },
  { top: '10.75rem', delay: '2.84s', name: '56%', role: '32%' },
];

/** Plain text lines, between and around the people's rows. */
const FILLER = ['2.25rem', '3rem', '5.75rem', '6.5rem', '9rem', '9.75rem', '12.25rem'];

/**
 * A page being read: a beam sweeps down it, and as it reaches each person the
 * line lights up and a card for them lifts off the page into the stack beside
 * it. Finished, the cards settle with a tick, one per person found (up to
 * three). Decorative: the words beside it carry the meaning, so it is hidden
 * from screen readers. Under reduced motion it holds still with the people
 * shown (globals.css).
 */
function PeopleLiftedOffThePage({ found }: { found: number | null }) {
  const done = found != null;
  const shown = done ? PEOPLE.slice(0, Math.max(1, Math.min(found, PEOPLE.length))) : PEOPLE;
  return (
    <div aria-hidden className="relative h-56 w-72">
      <div className="absolute inset-x-8 inset-y-6 rounded-full bg-primary/10 blur-2xl" />

      <div className="absolute left-2 top-2 h-52 w-36 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
        <div className="mx-4 mt-4 h-2.5 w-1/2 rounded-full bg-primary/35" />
        {FILLER.map((top, i) => (
          <span
            key={top}
            className="absolute left-4 h-1.5 rounded-full bg-muted-foreground/20"
            style={{ top, width: `${[70, 86, 64, 80, 58, 76, 66][i]}%` }}
          />
        ))}
        {PEOPLE.map((p) => (
          <div key={p.top} className="absolute inset-x-2.5" style={{ top: `calc(${p.top} - 0.45rem)` }}>
            <span
              className={`absolute inset-0 h-5 rounded-md bg-primary/15 ${done ? '' : 'animate-doc-row'}`}
              style={{ animationDelay: p.delay }}
            />
            <div className="relative flex h-5 items-center gap-1.5 px-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary/50" />
              <span className="h-1.5 rounded-full bg-primary/55" style={{ width: p.name }} />
            </div>
          </div>
        ))}
        {!done && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-10 animate-doc-scan">
            <div
              className="h-full"
              style={{
                background:
                  'linear-gradient(to bottom, transparent, color-mix(in srgb, var(--color-primary) 22%, transparent), transparent)',
              }}
            />
            <div className="absolute inset-x-0 top-1/2 h-0.5 bg-primary/70" />
          </div>
        )}
      </div>

      {shown.map((p) => (
        <div
          key={p.top}
          className={`absolute left-28 flex h-12 w-40 items-center gap-2.5 rounded-xl border border-border bg-background px-2.5 shadow-lg ${done ? 'animate-fade-in' : 'animate-doc-lift'}`}
          style={{ top: `calc(${p.top} - 1.15rem)`, animationDelay: done ? undefined : p.delay }}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            {done ? <Check className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="h-2 rounded-full bg-foreground/70" style={{ width: p.name }} />
            <span className="h-1.5 rounded-full bg-primary/40" style={{ width: p.role }} />
          </span>
        </div>
      ))}
    </div>
  );
}
