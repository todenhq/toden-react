import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CROPPER_STAGE, ImageCropper, cropperTitle } from './ImageCropper';

// The photo cropper, redesigned to match the React Native SDK's
// components/DocumentCropper.tsx: on a phone a full-screen editor with the scan
// screen's black stage, glass controls and layout rhythm; on a desktop the same
// stage inside the modal's panel. Pinned on the source where the wiring is a
// line nothing errors without, and on the rendered markup for the chrome.

const here = new URL('.', import.meta.url).pathname;
const read = (rel: string) => readFileSync(join(here, rel), 'utf8');
const noop = () => undefined;

describe('the immersive (phone) cropper', () => {
  const html = renderToStaticMarkup(
    <ImageCropper layout="immersive" src="data:image/png;base64,AA==" documentLabel="NIN slip" onConfirm={noop} onCancel={noop} />,
  );

  it('names the document in the title, with a plain fallback', () => {
    expect(cropperTitle('NIN slip')).toBe('Fit your NIN slip in the frame');
    expect(cropperTitle('  ')).toBe('Fit your ID in the frame');
    expect(cropperTitle()).toBe('Fit your ID in the frame');
    expect(html).toContain('Fit your NIN slip in the frame');
    expect(html).toMatch(/<h2[^>]*truncate/);
  });

  it('sits on a pure black stage, clear of the safe areas', () => {
    expect(CROPPER_STAGE).toBe('#000000');
    expect(html).toContain('background-color:#000000');
    expect(html).toContain('margin-top:calc(env(safe-area-inset-top) + 8px)');
    expect(html).toContain('margin-bottom:calc(env(safe-area-inset-bottom) + 16px)');
  });

  it('shows the help line under the photo', () => {
    expect(html).toContain('Drag the corners to the edges of your ID');
    expect(html).toContain('color:rgba(255,255,255,0.7)');
  });

  it('offers Rotate as a round glass button with a caption and a hint outside it', () => {
    expect(html).toMatch(/<button[^>]*aria-label="Rotate"[^>]*aria-describedby="([^"]+)"/);
    const id = html.match(/aria-label="Rotate"[^>]*aria-describedby="([^"]+)"/)![1];
    expect(html).toContain(`<span id="${id}" class="sr-only">Turns the photo a quarter turn clockwise.</span>`);
    expect(html).toContain('bg-[rgba(12,14,22,0.62)]');
    expect(html).toContain('width:52px;height:52px');
  });

  it('labels the primary action from the catalogue, 52 high in the brand colour', () => {
    expect(html).toMatch(/<button[^>]*aria-label="Use photo"[^>]*class="[^"]*bg-primary[^"]*"[^>]*style="height:52px/);
    expect(html).toContain('>Use photo</span>');
  });

  it('closes with a round glass button and no app bar of the old panel', () => {
    expect(html).toMatch(/<button[^>]*aria-label="Cancel"[^>]*style="width:44px;height:44px/);
    expect(html).not.toContain('Crop to ID Card');
    expect(html).not.toContain('border-border');
  });
});

describe('the inline (desktop) cropper', () => {
  it('keeps the panel, its catalogue header and its three actions', () => {
    const html = renderToStaticMarkup(<ImageCropper src="data:image/png;base64,AA==" onConfirm={noop} onCancel={noop} />);
    expect(html).toContain('Crop to ID Card');
    expect(html).toContain('border-border');
    expect(html).toContain('Cancel');
    expect(html).toContain('Rotate');
    expect(html).toContain('Use photo');
  });
});

describe('the cropper source', () => {
  const cropper = read('ImageCropper.tsx');

  it('letterboxes the photo with a margin, from the shared geometry', () => {
    expect(cropper).toContain("from '../lib/document-crop-geometry'");
    expect(cropper).toContain('insetContainRect(naturalW, naturalH, container.w, container.h)');
    expect(cropper).toContain("from './viewfinder/immersive-glass'");
    expect(cropper).toContain("from '../lib/immersive-layout'");
  });

  it('turns the shown photo smoothly, one turn at a time, and swaps only once the turned photo has loaded', () => {
    expect(cropper).toContain('const TURN_MS = 280;');
    expect(cropper).toContain('quarterTurnScale(imgRect, to)');
    expect(cropper).toContain('`rotate(90deg) scale(${scale})`');
    expect(cropper).toMatch(/duration: TURN_MS,\s*easing: EASE_OUT,\s*fill: 'forwards'/);
    expect(cropper).toMatch(/if \(turnBusy\.current \|\| rotating/);
    expect(cropper).toMatch(/onLoad=\{\(\) => \{\s*if \(swapPending\.current\) endTurn\(\);/);
    expect(cropper).toContain('later(endTurn, TURN_LOAD_TIMEOUT_MS)');
    expect(cropper).toContain('const TURN_LOAD_TIMEOUT_MS = 1500;');
    // Still made from the original each time.
    expect(cropper).toContain('next === 0 ? src : await turnedPhoto(source, next)');
  });

  it('fades the frame out and in around a turn, and the grid only while dragging', () => {
    expect(cropper).toContain('const FRAME_OUT_MS = 120;');
    expect(cropper).toContain('const FRAME_IN_MS = 150;');
    expect(cropper).toContain('const GRID_FADE_MS = 150;');
    expect(cropper).toContain('opacity: dragging ? 1 : 0');
    expect(cropper).toContain("'(prefers-reduced-motion: reduce)'");
  });

  it('ignores drags during a turn and stores the crop turned back when its box stood upright', () => {
    expect(cropper).toMatch(/if \(!crop \|\| !imgRect \|\| turnBusy\.current \|\| processing\) return;/);
    expect(cropper).toContain('turnBack ? (turnCanvasBack(canvas) ?? canvas) : canvas');
  });
});

describe('the step', () => {
  const step = read('../steps/DocumentCaptureStep.tsx');

  it('hands a phone the full-screen cropper, with the surface and the document name', () => {
    expect(step).toContain('const cropFullScreen = !!cropperSrc && !isDesktopDevice();');
    expect(step).toContain('setImmersiveCapture(immersive || cropFullScreen);');
    expect(step).toContain("layout='immersive'");
    expect(step).toMatch(/shortDocumentLabel\(state\.selectedIdType, idTypeLabel\)\s*:\s*undefined/);
  });

  it("gives both layouts the guide's shape and the turn back", () => {
    expect(step.match(/aspect=\{cropGuide\.aspect\}/g)).toHaveLength(2);
    expect(step.match(/turnBack=\{cropGuide\.turned\}/g)).toHaveLength(2);
  });
});
