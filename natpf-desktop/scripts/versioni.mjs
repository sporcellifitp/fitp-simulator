// B55 (16/11/2026): windows/versioni.json, l'elenco delle versioni pubblicate su R2 con file, dimensione e sha256, che il
// programma usa per riscaricare la versione di prima («Torna alla versione di prima» nelle Opzioni del gioco).
// Unisce: l'elenco già sul bucket (se c'è), le versioni pubblicate prima del B55 (versioni-pubblicate.json) e quella nuova
// (latest.json appena scritto); tiene solo gli installer che sono ancora sul bucket (--sul-bucket, uno per riga), dal più nuovo.
//   node scripts/versioni.mjs --latest=latest.json [--remoto=versioni-remoto.json] --seme=../versioni-pubblicate.json
//                             --sul-bucket=elenco.txt --out=versioni.json
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { validateManifest, compareBuilds } from '../src/aggiornamenti.mjs';

const ok = v => { try { validateManifest({ ...v, version: undefined }, 'https://x.invalid'); return true; } catch { return false; } };
const pick = v => ({ build: v.build, file: v.file, size: v.size, sha256: String(v.sha256).toLowerCase(), ...(v.published ? { published: v.published } : {}) });
export function mergeVersions({ latest = null, remote = [], seed = [], onBucket = null } = {}){
  const by = new Map();
  // prima il seme e l'elenco del bucket, poi la versione nuova (vince sugli altri per la stessa build)
  for (const v of [...seed, ...remote, ...(latest ? [latest] : [])]) if (ok(v)) by.set(v.build, pick(v));
  let list = [...by.values()];
  if (onBucket) list = list.filter(v => onBucket.includes(v.file));
  return { versioni: list.sort((a, b) => compareBuilds(b.build, a.build)) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href){
  const arg = Object.fromEntries(process.argv.slice(2).map(a => { const i = a.indexOf('='); return [a.slice(2, i), a.slice(i + 1)]; }));
  const read = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
  const latest = read(arg.latest), remote = read(arg.remoto)?.versioni || [], seed = read(arg.seme)?.versioni || [];
  const onBucket = arg['sul-bucket'] ? fs.readFileSync(arg['sul-bucket'], 'utf8').split(/\s+/).filter(Boolean) : null;
  if (!latest){ console.error('manca --latest'); process.exit(1); }
  const out = mergeVersions({ latest, remote, seed, onBucket });
  fs.writeFileSync(arg.out || 'versioni.json', JSON.stringify(out, null, 1));
  console.log(`versioni.json: ${out.versioni.map(v => v.build).join(', ')}`);
}
