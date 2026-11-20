// Risoluzione dei moduli per i test con Node, come in vite.config.ts: «@natpf/…» → ../site/js/…,
// «three» sempre dall'installazione di natpf-tennis (anche quando lo importa un modulo di ../site).
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_JS = path.resolve(ROOT, '../site/js');

export async function resolve(specifier, context, next){
  if (specifier.startsWith('@natpf/')) return next(pathToFileURL(path.join(SITE_JS, specifier.slice('@natpf/'.length))).href, context);
  // come l'alias di vite.config.ts: serve all'audit, che carica il motore vero senza browser
  if (specifier.endsWith('assets/vendor/GLTFLoader.js')) return next('three/examples/jsm/loaders/GLTFLoader.js', { ...context, parentURL: pathToFileURL(path.join(ROOT, 'package.json')).href });
  if (specifier === 'three') return next(specifier, { ...context, parentURL: pathToFileURL(path.join(ROOT, 'package.json')).href });
  return next(specifier, context);
}

// B36.1 (docs/b73/direzione-b36-1.md): prova del traguardo C. Con NATPF_DIREZIONE=nuova tutti i test e i banchi (che
// caricano il gioco con --import ./test/register.mjs) girano con «Nuova» come valore di base della direzione dei colpi, senza
// toccare il codice del gioco: «NATPF_DIREZIONE=nuova npm test», «NATPF_DIREZIONE=nuova npm run audit:legend». Senza la
// variabile niente cambia. Al traguardo C l'accensione cambierà solo questo valore di base (natpf_direction.DIR_DEFAULT)
const DIREZIONE = process.env.NATPF_DIREZIONE;
const DIR_DEFAULT = "export const DIR_DEFAULT = 'classica';";
export async function load(url, context, next){
  const r = await next(url, context);
  if (DIREZIONE !== 'nuova' || !url.endsWith('/src/natpf/natpf_direction.js')) return r;
  const src = String(r.source);
  if (!src.includes(DIR_DEFAULT)) throw new Error('NATPF_DIREZIONE: valore di base della direzione non trovato in natpf_direction.js');
  return { ...r, source: src.replace(DIR_DEFAULT, "export const DIR_DEFAULT = 'nuova';") };
}
