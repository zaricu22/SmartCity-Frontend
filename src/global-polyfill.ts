// sockjs-client (used by BuildingWebSocketService) reads the Node.js `global` object at
// module scope. It doesn't exist in the browser. Placed here (Angular's `polyfills` array)
// rather than in main.ts: polyfills.js loads as its own <script> tag before main.js, so it
// runs before ANY of main.ts's own module graph evaluates — including chunks that import
// sockjs-client eagerly rather than lazily (observed in dev-server/Vite builds). A polyfill
// written inside main.ts itself cannot guarantee this — ES modules evaluate all of a
// module's static imports before that module's own top-level statements run, regardless of
// where the statement is textually placed in the file.
(globalThis as typeof globalThis & { global?: typeof globalThis }).global ??= globalThis;
