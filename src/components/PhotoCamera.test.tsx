import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { PhotoOverlay, type PhotoOverlayProps } from './viewfinder/PhotoOverlay';
import { TopBar } from './viewfinder/ImmersiveControls';
import {
  PHOTO_COPY,
  PHOTO_JPEG_QUALITY,
  PHOTO_SHUTTER,
  captureStill,
  encodeStill,
  handlePhotoCameraKey,
  photoCameraExits,
  photoFileName,
  photoHint,
  stillFile,
  type StillEnvironment,
} from '../lib/photo-mode';

// "Take a photo" inside the SDK (components/PhotoCamera.tsx): the document
// camera's look without the scan. Pinned on the rendered overlay, the pure
// decisions in lib/photo-mode.ts, and the source where the wiring is a line
// nothing errors without.

const src = join(new URL('.', import.meta.url).pathname, '..');
const read = (rel: string) => readFileSync(join(src, rel), 'utf8');
const noop = () => undefined;

function overlay(over: Partial<PhotoOverlayProps> = {}) {
  return renderToStaticMarkup(
    <PhotoOverlay
      layout="immersive"
      title="Proof of address"
      hint={PHOTO_COPY.fitDocument}
      onCapture={noop}
      onBack={noop}
      onClose={noop}
      onUpload={noop}
      hasTorch={false}
      torch={false}
      onToggleTorch={noop}
      primaryColor="#5645F5"
      {...over}
    />,
  );
}

describe('the photo camera has no scanning', () => {
  for (const layout of ['immersive', 'inline'] as const) {
    describe(layout, () => {
      const html = overlay({ layout });

      it('draws no guide, sample document or scan frame', () => {
        expect(html).not.toContain('<canvas');
        expect(html).not.toContain('<svg viewBox');
        expect(html).not.toMatch(/FRONT|BACK|Front|Back of/);
      });

      it('keeps the shutter enabled, with a camera glyph and its own name', () => {
        const shutter = html.match(/<button[^>]*aria-label="Take photo"[^>]*>/)?.[0];
        expect(shutter).toBeDefined();
        expect(shutter).not.toContain('disabled');
        expect(shutter).not.toContain('aria-disabled');
        expect(shutter).not.toContain('cursor-not-allowed');
        expect(html).not.toContain('Capture document');
        expect(PHOTO_SHUTTER).toEqual({ busy: false, progress: 0, blockedReason: null });
      });

      it('names what is photographed and shows the instruction as a neutral pill', () => {
        expect(html).toContain('>Proof of address</span>');
        expect(html).toContain('Fit the whole document in view');
        expect(html).toContain('color="rgba(255,255,255,0.7)"');
      });

      it('offers Upload with the existing label and a hint outside it', () => {
        expect(html).toMatch(/<button[^>]*aria-label="Upload a photo instead"[^>]*aria-describedby="([^"]+)"/);
        const id = html.match(/aria-label="Upload a photo instead"[^>]*aria-describedby="([^"]+)"/)![1];
        expect(html).toContain(`<span id="${id}" class="sr-only">Choose a photo instead of using the camera.</span>`);
      });

      it('has back on the left and the flow close on the right, and no X when close is off', () => {
        expect(html).toContain('aria-label="Go back"');
        expect(html).toContain('aria-label="Close"');
        expect(overlay({ layout, onClose: null })).not.toContain('aria-label="Close"');
      });

      it('shows no pill without an instruction, and the torch only when the camera has one', () => {
        expect(overlay({ layout, hint: null })).not.toContain('role="status"');
        expect(html).not.toContain('Turn on the torch');
        expect(overlay({ layout, hasTorch: true })).toContain('aria-label="Turn on the torch"');
      });

      it('leaves Upload out when the caller does', () => {
        expect(overlay({ layout, onUpload: null })).not.toContain('Upload a photo instead');
      });
    });
  }

  it('takes only a trimmed instruction', () => {
    expect(photoHint('  ')).toBeNull();
    expect(photoHint(undefined)).toBeNull();
    expect(photoHint(' Fit it ')).toBe('Fit it');
  });
});

describe('the ways out', () => {
  it('back only closes the camera', () => {
    const dismiss = vi.fn();
    const flowClose = vi.fn();
    photoCameraExits({ dismiss, flowClose }).back();
    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(flowClose).not.toHaveBeenCalled();
  });

  it('close calls the flow close', () => {
    const dismiss = vi.fn();
    const flowClose = vi.fn();
    photoCameraExits({ dismiss, flowClose }).close!();
    expect(flowClose).toHaveBeenCalledTimes(1);
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('has no close when the flow close is disabled', () => {
    expect(photoCameraExits({ dismiss: noop, flowClose: null }).close).toBeNull();
  });

  it('the close is the one the modal header X calls, null when it cannot close', () => {
    expect(read('components/VerificationModal.tsx')).toContain(
      '<ImmersiveCloseContext.Provider value={dismissBlocked ? null : onClose}>',
    );
    expect(read('components/PhotoCamera.tsx')).toContain('const flowClose = useImmersiveClose();');
  });

  it('Esc is back, and is kept from the dialog', () => {
    const back = vi.fn();
    const event = { key: 'Escape', preventDefault: vi.fn(), stopPropagation: vi.fn() };
    expect(handlePhotoCameraKey(event, back)).toBe(true);
    expect(back).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalled();
    const other = { key: 'Enter', preventDefault: vi.fn(), stopPropagation: vi.fn() };
    expect(handlePhotoCameraKey(other, back)).toBe(false);
    expect(back).toHaveBeenCalledTimes(1);
    // On the window's capture phase, so it runs before the dialog's own Esc.
    expect(read('components/PhotoCamera.tsx')).toContain("window.addEventListener('keydown', onKey, true)");
  });
});

/** A canvas that records what was drawn and answers a blob of `size` bytes. */
function fakeEnv(opts: { size?: (w: number, h: number) => number; ImageCapture?: StillEnvironment['ImageCapture'] } = {}) {
  const canvases: { width: number; height: number; drawn: unknown[]; type?: string; quality?: number }[] = [];
  const env: StillEnvironment = {
    ImageCapture: opts.ImageCapture,
    decode: async () => ({ width: 4000, height: 3000, close: noop }),
    createCanvas: (width, height) => {
      const record = { width, height, drawn: [] as unknown[], type: undefined as string | undefined, quality: undefined as number | undefined };
      canvases.push(record);
      return {
        width,
        height,
        getContext: () => ({ drawImage: (source: unknown) => void record.drawn.push(source) }),
        toBlob: (cb, type, quality) => {
          record.type = type;
          record.quality = quality;
          cb(new Blob([new Uint8Array(opts.size ? opts.size(width, height) : 10)], { type }));
        },
      };
    },
  };
  return { env, canvases };
}

describe('the still', () => {
  const video = { videoWidth: 1920, videoHeight: 1080 };

  it('falls back to the video frame at its native resolution when ImageCapture is missing', async () => {
    const { env, canvases } = fakeEnv();
    const blob = await captureStill(video, {} as MediaStreamTrack, env);
    expect(canvases).toHaveLength(1);
    expect(canvases[0]).toMatchObject({ width: 1920, height: 1080, type: 'image/jpeg', quality: 0.9 });
    expect(canvases[0]!.drawn[0]).toBe(video);
    expect(blob.type).toBe('image/jpeg');
    expect(PHOTO_JPEG_QUALITY).toBe(0.9);
  });

  it('uses ImageCapture.takePhoto where there is one', async () => {
    const takePhoto = vi.fn(async () => new Blob(['x'], { type: 'image/jpeg' }));
    const { env, canvases } = fakeEnv({
      ImageCapture: class {
        takePhoto = takePhoto;
      } as unknown as StillEnvironment['ImageCapture'],
    });
    await captureStill(video, { readyState: 'live' } as MediaStreamTrack, env);
    expect(takePhoto).toHaveBeenCalled();
    expect(canvases[0]).toMatchObject({ width: 4000, height: 3000, type: 'image/jpeg', quality: 0.9 });
  });

  it('falls back to the frame when takePhoto fails', async () => {
    const { env, canvases } = fakeEnv({
      ImageCapture: class {
        takePhoto = async () => {
          throw new Error('refused');
        };
      } as unknown as StillEnvironment['ImageCapture'],
    });
    await captureStill(video, { readyState: 'live' } as MediaStreamTrack, env);
    expect(canvases[0]).toMatchObject({ width: 1920, height: 1080 });
    expect(canvases[0]!.drawn[0]).toBe(video);
  });

  it('only shrinks a photo the upload cap would refuse', async () => {
    const { env, canvases } = fakeEnv({ size: (w, h) => Math.round((w * h) / 2) });
    const blob = await encodeStill(env, video, 4000, 3000, 2_000_000);
    expect(canvases[0]).toMatchObject({ width: 4000, height: 3000 });
    expect(canvases.length).toBeGreaterThan(1);
    expect(blob.size).toBeLessThanOrEqual(2_000_000);
  });

  it('is handed over as a JPEG File with a sensible name', () => {
    const file = stillFile(new Blob(['x']), photoFileName('Proof of Address'), 1);
    expect(file).toBeInstanceOf(File);
    expect(file.type).toBe('image/jpeg');
    expect(file.name).toBe('proof-of-address.jpg');
    expect(photoFileName('Bank statement (3 months)')).toBe('bank-statement-3-months.jpg');
    expect(photoFileName('')).toBe('photo.jpg');
  });
});

describe('the camera itself', () => {
  const camera = read('components/PhotoCamera.tsx');

  it('reuses the scan stream, torch and permission handling', () => {
    expect(camera).toContain("facingMode: 'environment'");
    expect(camera).toContain('useTorch(camera.stream)');
    expect(camera).toContain('useCameraPrimer()');
    expect(camera).toContain("t('uploadDocument.camera.denied')");
    expect(camera).toContain("t('uploadDocument.camera.uploadInstead')");
  });

  it('goes full screen on a phone and inline on a desktop', () => {
    expect(camera).toContain('setImmersiveCapture(true)');
    expect(camera).toContain("layout={desktop ? 'inline' : 'immersive'}");
    expect(camera).toContain("aspectRatio: '16/10'");
  });

  it('takes focus as it opens, and the hook gives it back to the trigger', () => {
    expect(camera).toContain('rootRef.current?.focus(');
    const hook = read('hooks/usePhotoCamera.ts');
    expect(hook).toContain('triggerRef.current = active instanceof HTMLElement ? active : null;');
    expect(hook).toContain('trigger.focus(');
  });
});

describe('the scan is unchanged', () => {
  it('still shows the side badge and no close in its top bar', () => {
    const html = renderToStaticMarkup(
      <TopBar onBack={noop} documentLabel="Passport" side="front" primaryColor="#5645F5" />,
    );
    expect(html).not.toContain('aria-label="Close"');
    expect(html).toContain('aria-label="Go back"');
  });

  it('passes no photo-mode options to its overlays', () => {
    for (const rel of ['components/viewfinder/ImmersiveOverlay.tsx', 'components/viewfinder/InlineOverlay.tsx']) {
      const code = read(rel);
      expect({ rel, close: code.includes('onClose') }).toEqual({ rel, close: false });
      expect({ rel, icon: code.includes('shutterIcon') }).toEqual({ rel, icon: false });
    }
    const bar = read('components/viewfinder/ImmersiveBottomBar.tsx');
    expect(bar).toContain('icon: ShutterIcon = ScanLine');
    expect(bar).toContain("label = 'Capture document'");
  });
});

/** Every non-test source file under src, relative to it. */
function sources(): string[] {
  return readdirSync(src, { recursive: true }).filter(
    (rel) =>
      /\.tsx?$/.test(rel) &&
      !/\.test\.tsx?$/.test(rel) &&
      !rel.split(/[\\/]/).some((part) => part === 'node_modules' || part === 'generated'),
  );
}

describe('the wiring', () => {
  it('leaves no capture= file input for "take a photo"', () => {
    // A file input carrying `capture` (any value), not a component's own prop.
    const offenders = sources().filter((rel) => {
      const code = read(rel);
      return /<input\b[^>]*\bcapture=/.test(code) || /capture="(environment|user)"/.test(code);
    });
    expect(sources()).toContain('steps/use-poa-upload.tsx');
    expect(offenders).toEqual([]);
  });

  it('renders the SDK camera on each step that takes a photo', () => {
    for (const rel of [
      'steps/use-poa-upload.tsx',
      'steps/SupportingDocumentsStep.tsx',
      'steps/address/AddressEntranceStep.tsx',
    ]) {
      expect({ rel, camera: read(rel).includes('<PhotoCamera') }).toEqual({ rel, camera: true });
    }
  });

  it('opens the camera from each "take a photo" control', () => {
    expect(read('steps/use-poa-upload.tsx')).toContain('takePhoto: () => camera.show(null)');
    expect(read('steps/ProofOfAddressStep.tsx')).toContain("cameraOpen && 'hidden'");
    expect(read('steps/SupportingDocumentCard.tsx')).toContain('const choose = () => (camera ? onTakePhoto() : inputRef.current?.click());');
    expect(read('steps/SupportingDocumentsStep.tsx')).toContain('onTakePhoto={() => camera.show(slot.key)}');
    const entrance = read('components/AddressPhotoUpload.tsx');
    expect(entrance.match(/onClick=\{onTakePhoto\}/g)).toHaveLength(2);
  });

  it('keeps Upload a file as it was', () => {
    expect(read('steps/use-poa-upload.tsx')).toContain('<input ref={fileInput} type="file" accept={ACCEPTED_MIMES.join(\',\')}');
  });
});
