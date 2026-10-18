// Pacchetto offline degli asset di Argon Tennis: niente internet a runtime.
// - Modelli 3D, audio (musiche Lyria e annunci TTS), texture del cielo e QR della starter app arrivano da gstatic:
//   scripts/download-assets.mjs li scarica una volta in public/assets/ (la build li copia in dist/assets/).
// - MediaPipe Hands (webcam, mano) e Pose (webcam, corpo per «segui il corpo») arrivano dai pacchetti npm
//   @mediapipe/hands e @mediapipe/pose (Apache-2.0), versioni fissate in package.json: in sviluppo e nel server LAN
//   si servono da node_modules, la build li copia in dist/assets/mediapipe/{hands,pose}/.
// Il gioco chiede sempre /assets/…; questo middleware risponde dal disco e, solo se il file manca e la rete c'è,
// lo prende da gstatic (come faceva il proxy di vite.config.ts). Se manca e la rete no: 404 e il gioco va avanti
// (modello vuoto, niente musica, cielo senza texture, webcam con optical flow).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ARGON_UPSTREAM = 'https://www.gstatic.com/aistudio/starter-apps/tennis/';
export const MEDIAPIPE_HANDS_VERSION = '0.4.1675469240';
export const MEDIAPIPE_POSE_VERSION = '0.5.1675469404';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const MEDIAPIPE_DIR = path.join(ROOT, 'node_modules/@mediapipe/hands');
// file di MediaPipe Hands che il runtime carica (hands.js li chiede con locateFile)
export const MEDIAPIPE_FILES = [
  'hands.js', 'hands_solution_packed_assets_loader.js', 'hands_solution_packed_assets.data',
  'hands_solution_simd_wasm_bin.js', 'hands_solution_simd_wasm_bin.wasm', 'hands_solution_simd_wasm_bin.data',
  'hands_solution_wasm_bin.js', 'hands_solution_wasm_bin.wasm', 'hands.binarypb',
  'hand_landmark_full.tflite', 'hand_landmark_lite.tflite',
];
// cartelle sotto /assets/ servite da questo middleware (le altre, es. i bundle di Vite, no)
// Pose: solo il modello «lite» (modelComplexity 0), non full e heavy (34 MB in meno)
export const MEDIAPIPE_POSE_FILES = [
  'pose.js', 'pose_solution_packed_assets_loader.js', 'pose_solution_packed_assets.data',
  'pose_solution_simd_wasm_bin.js', 'pose_solution_simd_wasm_bin.wasm', 'pose_solution_simd_wasm_bin.data',
  'pose_solution_wasm_bin.js', 'pose_solution_wasm_bin.wasm', 'pose_web.binarypb', 'pose_landmark_lite.tflite',
];
export const MEDIAPIPE_PACKAGES = [
  { name: 'hands', version: MEDIAPIPE_HANDS_VERSION, files: MEDIAPIPE_FILES },
  { name: 'pose', version: MEDIAPIPE_POSE_VERSION, files: MEDIAPIPE_POSE_FILES },
];
// tutti i file MediaPipe del pacchetto offline: percorso sotto /assets/ e sorgente in node_modules
export const mediapipeAssets = (root = ROOT) => MEDIAPIPE_PACKAGES.flatMap(p => p.files.map(f => ({ rel: `mediapipe/${p.name}/${f}`, src: path.join(root, 'node_modules/@mediapipe', p.name, f), pkg: p })));
export const ASSET_PREFIX = /^\/assets\/(models|audio|textures|mediapipe|qr)\//;

export const MIME = {
  '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.png': 'image/png', '.jpg': 'image/jpeg', '.wasm': 'application/wasm',
  '.json': 'application/json; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.LICENSE': 'text/plain; charset=utf-8',
};
export const mimeFor = file => MIME[path.extname(file)] || 'application/octet-stream';

const GSTATIC_URL = /https:\/\/www\.gstatic\.com\/aistudio\/starter-apps\/tennis\/([\w./-]+?\.(?:glb|mp3|png))/g;
// Asset gstatic usati dal gioco, letti dai sorgenti (così la lista non va tenuta a mano): modelli, audio, texture, QR.
export function argonAssetList(root = ROOT){
  const files = ['index.html', ...fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).map(f => `src/${f}`)];
  const found = new Set();
  for (const f of files) for (const [, rel] of fs.readFileSync(path.join(root, f), 'utf8').matchAll(GSTATIC_URL)) found.add(rel);
  return [...found].sort();
}
export const assetCategory = rel => rel.split('/')[0];
// Provenienza dichiarata nel manifest del pacchetto; MediaPipe porta la sua licenza Apache-2.0.
export const LICENSES = {
  models: 'modelli 3D del motore base',
  audio: 'audio del motore base',
  textures: 'texture del motore base',
  qr: 'QR del motore base',
  mediapipe: `@mediapipe/hands ${MEDIAPIPE_HANDS_VERSION} e @mediapipe/pose ${MEDIAPIPE_POSE_VERSION} (npm, Google): Apache-2.0`,
};

// Percorso su disco di /assets/<rel>, cercando nell'ordine nelle cartelle date; null se non c'è.
export function localAsset(rel, dirs){
  if (!rel || rel.includes('\0')) return null;
  for (const { prefix = '', dir, only } of dirs){
    if (!rel.startsWith(prefix) || (only && !only.includes(rel.slice(prefix.length)))) continue;
    const base = path.resolve(dir), file = path.resolve(base, rel.slice(prefix.length));
    if (!file.startsWith(base + path.sep)) continue;
    const stat = fs.statSync(file, { throwIfNoEntry: false });
    if (stat?.isFile()) return file;
  }
  return null;
}
export const defaultAssetDirs = (root = ROOT) => [
  ...MEDIAPIPE_PACKAGES.map(p => ({ prefix: `mediapipe/${p.name}/`, dir: path.join(root, 'node_modules/@mediapipe', p.name), only: p.files })),
  { dir: path.join(root, 'public/assets') },
];

// Middleware connect/Node: GET /assets/(models|audio|textures|mediapipe|qr)/… dal disco, poi (se upstream) da gstatic.
export function createAssetMiddleware({ dirs = defaultAssetDirs(), upstream = true, timeoutMs = 6000, fetchImpl = globalThis.fetch } = {}){
  const cache = new Map(), inFlight = new Map(), missing = new Map();
  return async (req, res, next) => {
    let url;
    try { url = new URL((req.url || '/').replace(/^\/{2,}/, '/'), 'http://localhost'); } catch { return next(); }
    if (!ASSET_PREFIX.test(url.pathname) || (req.method !== 'GET' && req.method !== 'HEAD')) return next();
    let rel;
    try { rel = decodeURIComponent(url.pathname.slice('/assets/'.length)); } catch { res.statusCode = 400; return res.end(); }
    const file = localAsset(rel, dirs);
    if (file) return sendFile(req, res, file, 'public, max-age=3600');
    // MediaPipe arriva solo da npm: se manca non si chiede a gstatic una versione diversa
    if (!upstream || rel.startsWith('mediapipe/') || (missing.get(rel) || 0) > Date.now()) return notFound(res);
    const target = ARGON_UPSTREAM + rel;
    try {
      let entry = cache.get(target);
      if (!entry){
        let pending = inFlight.get(target);
        if (!pending){
          pending = fetchImpl(target, { signal: AbortSignal.timeout(timeoutMs) })
            .then(async r => { if (!r.ok) throw new Error(`upstream ${r.status}`); const item = { type: mimeFor(rel), body: Buffer.from(await r.arrayBuffer()) }; cache.set(target, item); return item; })
            .finally(() => inFlight.delete(target));
          inFlight.set(target, pending);
        }
        entry = await pending;
      }
      res.writeHead(200, { 'Content-Type': entry.type, 'Content-Length': entry.body.length, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=86400' });
      res.end(req.method === 'HEAD' ? undefined : entry.body);
    } catch {
      // senza rete: non riprovare a ogni richiesta, il gioco continua senza quell'asset
      missing.set(rel, Date.now() + 30000);
      notFound(res);
    }
  };
}
function notFound(res){ res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }); res.end('Asset non disponibile offline: esegui npm run assets'); }

// Invio di un file con supporto a Range (gli <audio> lo chiedono per mp3 lunghi).
export function sendFile(req, res, file, cacheControl = 'no-cache', extra = {}){
  const stat = fs.statSync(file), type = mimeFor(file), range = /^bytes=(\d*)-(\d*)$/.exec(req.headers?.range || '');
  const headers = { 'Content-Type': type, 'Cache-Control': cacheControl, 'Accept-Ranges': 'bytes', 'X-Content-Type-Options': 'nosniff', ...extra };
  if (range && (range[1] || range[2])){
    let start = range[1] ? Number(range[1]) : Math.max(0, stat.size - Number(range[2])), end = range[1] && range[2] ? Number(range[2]) : stat.size - 1;
    end = Math.min(end, stat.size - 1);
    if (start > end || start >= stat.size){ res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }); return res.end(); }
    res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': end - start + 1 });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { ...headers, 'Content-Length': stat.size });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

// Stato del pacchetto offline: cosa c'è e cosa manca (per il server LAN e per i test).
export function offlineStatus(root = ROOT, dirs = defaultAssetDirs(root)){
  const wanted = [...argonAssetList(root), ...mediapipeAssets(root).map(a => a.rel)];
  const missing = wanted.filter(rel => !localAsset(rel, dirs));
  return { total: wanted.length, missing, complete: missing.length === 0 };
}

// Plugin Vite: in sviluppo e in preview serve /assets/… (disco → gstatic), nella build copia MediaPipe in dist.
export function offlineAssetsPlugin({ root = ROOT } = {}){
  let outDir = null;
  const mount = server => server.middlewares.use(createAssetMiddleware({ dirs: defaultAssetDirs(root) }));
  return {
    name: 'argon-offline-assets',
    // niente valore restituito: una funzione restituita sarebbe per Vite un post-hook, chiamato senza argomenti
    configureServer(server){ mount(server); },
    configurePreviewServer(server){ server.middlewares.use(createAssetMiddleware({ dirs: [{ dir: path.join(server.config.root, server.config.build.outDir, 'assets') }, ...defaultAssetDirs(root)] })); },
    configResolved(config){ if (config.command === 'build') outDir = path.resolve(config.root, config.build.outDir); },
    closeBundle(){
      if (!outDir || !fs.existsSync(outDir)) return;
      for (const { rel, src, pkg } of mediapipeAssets(root)){
        const dest = path.join(outDir, 'assets', rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        if (fs.existsSync(src)) fs.copyFileSync(src, dest);
        else console.warn(`[offline-assets] manca ${rel}: npm install installa @mediapipe/${pkg.name}`);
      }
    },
  };
}
