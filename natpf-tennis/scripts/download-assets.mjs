// Pacchetto offline del motore base: scarica una volta in public/assets/ modelli 3D, audio, texture e QR che il gioco usa
// (la lista si legge dai sorgenti, vedi scripts/offline-assets.mjs) e scrive public/assets/manifest.json con
// dimensioni, sha256 e licenze. MediaPipe Hands e Pose non si scaricano da qui: arrivano dai pacchetti npm (solo i file
// della versione SIMD, elencati in scripts/offline-assets.mjs).
// I file già presenti non si riscaricano. Senza rete avvisa e non blocca la build (--strict per fallire).
//   node scripts/download-assets.mjs [--strict] [--check]
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ASSET_UPSTREAM, ROOT, LICENSES, MEDIAPIPE_PACKAGES, sourceAssetList, assetCategory, mediapipeAssets } from './offline-assets.mjs';

const strict = process.argv.includes('--strict'), checkOnly = process.argv.includes('--check');
const OUT = path.join(ROOT, 'public/assets');

async function size(file){ try { const s = await fs.stat(file); return s.isFile() && s.size > 0 ? s.size : 0; } catch { return 0; } }

async function download(rel){
  const dest = path.join(OUT, rel);
  if (await size(dest)) return { rel, ok: true, cached: true };
  if (checkOnly) return { rel, ok: false, error: 'mancante' };
  try {
    const res = await fetch(ASSET_UPSTREAM + rel, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest + '.part', buffer); await fs.rename(dest + '.part', dest);
    console.log(`[assets] scaricato ${rel} (${(buffer.length/1024).toFixed(0)} kB)`);
    return { rel, ok: true };
  } catch (error){ return { rel, ok: false, error: error.cause?.code || error.message }; }
}

async function entry(file, rel, category){
  const body = await fs.readFile(file);
  return { path: rel, category, bytes: body.length, sha256: createHash('sha256').update(body).digest('hex'), license: LICENSES[category] };
}

async function main(){
  const list = sourceAssetList();
  const results = [];
  for (let i = 0; i < list.length; i += 6) results.push(...await Promise.all(list.slice(i, i + 6).map(download)));   // 6 alla volta
  const failed = results.filter(r => !r.ok);
  const files = [];
  for (const r of results.filter(r => r.ok)) files.push(await entry(path.join(OUT, r.rel), r.rel, assetCategory(r.rel)));
  const mediapipeMissing = [];
  for (const { rel, src } of mediapipeAssets()){
    try { await fs.access(src); files.push(await entry(src, rel, 'mediapipe')); } catch { mediapipeMissing.push(rel); }
  }
  const bytes = files.reduce((n, f) => n + f.bytes, 0), byCategory = {};
  for (const f of files) byCategory[f.category] = (byCategory[f.category] || 0) + f.bytes;
  if (!checkOnly){
    await fs.mkdir(OUT, { recursive: true });
    await fs.writeFile(path.join(OUT, 'manifest.json'), JSON.stringify({ generated: new Date().toISOString(), upstream: ASSET_UPSTREAM, mediapipe: MEDIAPIPE_PACKAGES.map(p => `@mediapipe/${p.name}@${p.version}`), bytes, byCategory, missing: failed.map(f => f.rel), files }, null, 1));
  }
  const mb = n => (n/1048576).toFixed(1) + ' MB';
  console.log(`[assets] pacchetto offline: ${files.length} file, ${mb(bytes)} (${Object.entries(byCategory).map(([k, v]) => `${k} ${mb(v)}`).join(', ')})`);
  if (mediapipeMissing.length) console.warn(`[assets] MediaPipe mancante (${mediapipeMissing.join(', ')}): esegui npm install. Senza Hands la webcam usa l'optical flow, senza Pose il movimento resta automatico.`);
  if (failed.length){
    console.warn(`[assets] ${failed.length} file non disponibili (${failed[0].error}): ${failed.map(f => f.rel).join(', ')}`);
    console.warn('[assets] Il gioco parte lo stesso (senza quei modelli/suoni/texture). Riprova con la rete: npm run assets');
    if (strict || checkOnly) process.exitCode = 1;
  }
}
main().catch(err => { console.error('[assets] errore:', err); process.exitCode = 1; });
