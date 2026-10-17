// Risoluzione dei moduli per i test con Node, come in vite.config.ts: «@natpf/…» → ../site/js/…,
// «three» sempre dall'installazione di natpf-argon (anche quando lo importa un modulo di ../site).
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
