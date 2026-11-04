// MediaPipe Hands e Pose: da dove prendere ogni file che la soluzione chiede (locateFile di hands.js e pose.js).
// B8 (04/11): il pacchetto offline (scripts/offline-assets.mjs) porta solo il motore WebAssembly SIMD, per stare sotto
// i 25 MB dello zip Cloudflare. hands.js e pose.js provano SIMD e chiedono o *_solution_simd_wasm_bin.(js|wasm) o
// *_solution_wasm_bin.(js|wasm), mai tutti e due; SIMD c'è in Chrome ed Edge dalla 91 e in Electron 45 (Chromium 156).
// Su un browser senza SIMD, se la base è quella locale, i due file senza SIMD vengono dal CDN fissato alla stessa
// versione del pacchetto npm: con internet la mano e il corpo funzionano lo stesso; senza internet il file non arriva
// e si ripiega come prima (optical flow per la mano, movimento automatico per il corpo). Tutto il resto (modelli,
// dati, caricatori, motore SIMD) resta sulla base scelta, locale o CDN.
export const MEDIAPIPE_NO_SIMD_FILE = /_solution_wasm_bin\.(js|wasm)$/;

// Indirizzo di un file: base + nome, salvo i file senza SIMD con la base locale, che vanno sul CDN.
export function mediapipeFileUrl(file, { base, localBase, cdnBase }){
  const name = String(file);
  return `${base === localBase && cdnBase && MEDIAPIPE_NO_SIMD_FILE.test(name) ? cdnBase : base}${name}`;
}
// locateFile da passare a new Hands({ … }) e new Pose({ … })
export const mediapipeLocator = bases => file => mediapipeFileUrl(file, bases);
