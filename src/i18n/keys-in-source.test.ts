import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_TEXTS } from './catalogue';

/**
 * Every text key the screens ask for must exist in the catalogue. A missing one
 * does not fail anything at runtime: the SDK shows the raw key instead, which is
 * how "welcome.legal.privacyLink" once reached the consent screen as the link.
 */
const SRC = new URL('..', import.meta.url).pathname;

/** Source files outside the catalogue itself, tests excluded. */
function sourceFiles(): string[] {
  return readdirSync(SRC, { recursive: true })
    .filter((rel) => /\.(ts|tsx)$/.test(rel) && !/\.test\.tsx?$/.test(rel) && !rel.startsWith('i18n/'))
    .map((rel) => join(SRC, rel));
}

/** Workflow config paths that share a group's name; they are not texts. */
const CONFIG_PATHS = new Set([
  'business.country',
  'keyPeople.collect',
  'keyPeople.invite.channel',
  'keyPeople.ownershipThreshold',
  'keyPeople.removedFromRegistry',
  'keyPeople.roles',
  'proofOfAddress.capture',
  'proofOfAddress.countries',
]);

/** A key, or a prefix the code completes (`result.faceCheck.checking` + `.title`). */
const known = (literal: string) =>
  literal in DEFAULT_TEXTS ||
  CONFIG_PATHS.has(literal) ||
  Object.keys(DEFAULT_TEXTS).some((key) => key.startsWith(`${literal}.`));

const GROUPS = [...new Set(Object.keys(DEFAULT_TEXTS).map((key) => key.split('.')[0]))];
const KEY_LITERAL = new RegExp(`['"\`]((?:${GROUPS.join('|')})(?:\\.[A-Za-z0-9]+)+)['"\`]`, 'g');

describe('text keys used by the screens', () => {
  it('would catch a missing key', () => {
    expect([..."t('welcome.legal.privacyLink')".matchAll(KEY_LITERAL)].map((m) => m[1])).toEqual([
      'welcome.legal.privacyLink',
    ]);
  });

  it('all exist in the catalogue', () => {
    const missing: string[] = [];
    for (const file of sourceFiles()) {
      const source = readFileSync(file, 'utf8');
      // Any quoted `group.part` literal whose group is a catalogue group: keys
      // handed to t() directly and keys kept in lookup maps alike.
      for (const match of source.matchAll(KEY_LITERAL)) {
        if (!known(match[1])) missing.push(`${match[1]} (${file.slice(SRC.length)})`);
      }
    }
    expect(missing).toEqual([]);
  });
});
