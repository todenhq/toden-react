import { defineConfig } from 'tsup';

export default defineConfig({
  // `texts` is the catalogue alone (no React), for editors that list the texts.
  entry: { index: 'src/index.ts', texts: 'src/i18n/texts-entry.ts' },
  outDir: 'dist',
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
  // Bundled rather than left as a runtime dependency. It is a tiny, zero-dep
  // encoder, and inlining it means a consumer does not have to install anything
  // to render a QR — the SDK is a drop-in component library, so every extra
  // install step is a support ticket waiting to happen.
  // `@hugeicons/core-free-icons` is bundled for a harder reason than size: it
  // declares `"type": "module"` at its root while pointing `require` at
  // `dist/cjs/index.js`, and ships NO `package.json` marking that directory
  // CommonJS. Node therefore parses its CJS entry as ESM — on Node 20/22 the
  // require throws `exports is not defined in ES module scope`, and on Node 24
  // it silently resolves to an object with ZERO keys, so every icon renders as
  // nothing. Left external, the CJS build of this SDK inherits that. Inlined,
  // the icon path data is plain arrays that tree-shake to the ones we draw and
  // no consumer ever requires the broken package.
  noExternal: ['qrcode-generator', '@hugeicons/core-free-icons'],
  banner: { js: '"use client";' },
  esbuildOptions(options) {
    // The compiled Tailwind sheet (src/generated/styles.css.txt, built BEFORE
    // tsup by the build/dev scripts) is bundled as a raw string for the
    // SdkFrame shadow roots — the SDK styles itself without a global
    // stylesheet import. `.txt`, NOT `.css`: tsup's own CSS pipeline
    // intercepts `.css` imports ahead of this loader map and emits an empty
    // module (`var styles_default = {}`), silently unstyling the shadow roots.
    options.loader = { ...options.loader, '.txt': 'text' };
  },
  // dist/styles.css is a copy of the pre-built sheet, refreshed per build.
  // `clean: true` wipes dist/ on each (re)build, so if the CSS isn't tied to
  // the tsup run it silently disappears and consumers hit "Can't resolve
  // .../styles.css". This hook runs after each successful build, including in
  // watch mode.
  onSuccess: 'cp ./src/generated/styles.css.txt ./dist/styles.css',
});
