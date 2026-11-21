// The compiled Tailwind sheet (src/generated/styles.css.txt, built before
// tsup runs) is bundled as a raw string — it is what the style-isolation
// boundary injects into its shadow roots, so the SDK styles itself without
// the host app importing ./styles.css. `.txt` because tsup's own CSS pipeline
// would swallow a `.css` import and emit an empty module.
declare module '*.txt' {
  const text: string;
  export default text;
}
