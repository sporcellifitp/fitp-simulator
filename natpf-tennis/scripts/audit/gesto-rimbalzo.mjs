// Due misure da raccogliere con persone vere (B18, tappa 1 punto 12 dell'audit B16) da uno o più pacchetti della
// diagnostica: quanto varia il gesto da un colpo all'altro (decide la soglia del tagliato e il rischio di schiacciate non
// volute) e quando le persone colpiscono rispetto al rimbalzo. Stesso calcolo del pannello e del rapporto della
// diagnostica (src/natpf/diag/diag_gesture.js). Guida per lo staff: docs/b18/misure-con-persone.md
//
//   node scripts/audit/gesto-rimbalzo.mjs <pacchetto.zip | cartella estratta> [altri…] [--json=uscita.json]
//
// Per registrazione (le parti di una registrazione lunga, stesso «gruppo», si leggono insieme) e in fondo il totale di
// tutti i pacchetti. Ogni pacchetto dovrebbe essere di una persona sola (una registrazione per visitatore): la variazione
// del gesto è di una persona, non di un gruppo. Lo zip è quello scaricato dal gioco («stored»): se è stato compresso di
// nuovo, estrarlo e passare la cartella.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readZip } from '../../src/natpf/diag/diag_zip.js';
import { gestureMeasures, gestureMeasureLines, SPREAD } from '../../src/natpf/diag/diag_gesture.js';

const text = b => (b ? new TextDecoder().decode(b) : '');
const lines = b => text(b).split('\n').filter(Boolean).flatMap(l => { try { return [JSON.parse(l)]; } catch { return []; } });
export function openPackage(p){
  let get;
  if (fs.statSync(p).isDirectory()) get = name => { const f = path.join(p, name); return fs.existsSync(f) ? new Uint8Array(fs.readFileSync(f)) : null; };
  else {
    let z;
    try { z = readZip(new Uint8Array(fs.readFileSync(p))); }
    catch (e){ throw new Error(`${p}: ${e.message} (zip compresso di nuovo? estrailo e passa la cartella)`); }
    get = name => z.get(name) || null;
  }
  const meta = JSON.parse(text(get('sessione.json')) || '{}'), events = lines(get('eventi.jsonl'));
  if (!events.length) throw new Error(`${p}: nessun evento (eventi.jsonl mancante o vuoto)`);
  return { file: p, meta, events };
}
export function groupPackages(pkgs){
  const groups = new Map();
  for (const k of pkgs){ const g = k.meta.gruppo || k.meta.id || k.file; (groups.get(g) || groups.set(g, []).get(g)).push(k); }
  return [...groups.values()].map(list => {
    list.sort((a, b) => (a.meta.parte || 1) - (b.meta.parte || 1));
    return { meta: list[0].meta, files: list.map(k => k.file), parts: list.map(k => k.meta.parte || 1), events: list.flatMap(k => k.events) };
  });
}
// riassunto di più registrazioni: per la variazione la mediana tra le persone (e quante variano molto), per il rimbalzo
// tutte le palle insieme
export function totals(results){
  const persone = results.flatMap(r => Object.values(r.misure?.variazione || {}).filter(v => v.n >= SPREAD.minShots).map(v => v.salitaScarto)).filter(Number.isFinite).sort((a, b) => a - b);
  const all = results.flatMap(r => r.palle || []);
  const med = a => (a.length ? a[Math.floor(a.length/2)] : null);
  return { gruppiLato: persone.length, salitaScartoMediana: med(persone), oltreSoglia: persone.filter(x => x > SPREAD.relative).length,
    palle: all.length, dalRimbalzoMsMediana: med(all.map(x => x.dalRimbalzoMs).filter(Number.isFinite).sort((a, b) => a - b)),
    primaDellImpattoMsMediana: med(all.map(x => x.primaDellImpattoMs).filter(Number.isFinite).sort((a, b) => a - b)) };
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href){
  const args = process.argv.slice(2);
  const files = args.filter(a => !a.startsWith('--'));
  const out = (args.find(a => a.startsWith('--json=')) || '').slice(7) || null;
  if (!files.length){
    console.error('Uso: node scripts/audit/gesto-rimbalzo.mjs <pacchetto.zip | cartella estratta> [altri…] [--json=uscita.json]');
    process.exit(1);
  }
  const { bounceToGesture } = await import('../../src/natpf/diag/diag_gesture.js');
  const pkgs = [];
  for (const f of files){
    try { pkgs.push(openPackage(f)); }
    catch (e){ console.error(`Saltato: ${e.message}`); process.exitCode = 1; }
  }
  const results = [];
  for (const r of groupPackages(pkgs)){
    const misure = gestureMeasures(r.events), palle = bounceToGesture(r.events);
    console.log(`\n== ${r.meta.id || r.files[0]} · ${r.meta.inizio || '?'} · versione ${r.meta.build || '?'}${r.parts.length > 1 ? ` · parti ${r.parts.join(', ')}` : ''}`);
    const L = gestureMeasureLines(misure);
    if (!L.length) console.log('   nessun colpo del telefono con la forma del gesto (telefono di prima o webcam)');
    for (const l of L) console.log(`   ${l}`);
    results.push({ file: r.files, id: r.meta.id || null, inizio: r.meta.inizio || null, build: r.meta.build || null, misure, palle });
  }
  const T = totals(results);
  console.log(`\n== In tutto (${results.length} registrazion${results.length === 1 ? 'e' : 'i'}): variazione della salita mediana ±${T.salitaScartoMediana ?? '–'} su ${T.gruppiLato} lati con almeno ${SPREAD.minShots} colpi normali · oltre ${SPREAD.relative}: ${T.oltreSoglia}${T.gruppiLato && T.oltreSoglia/T.gruppiLato > .2 ? ' (più di uno su cinque: valutare la soglia del tagliato relativa al proprio gesto)' : ''}`);
  console.log(`   dal rimbalzo al gesto: mediana ${T.dalRimbalzoMsMediana ?? '–'} ms su ${T.palle} palle · gesto prima dell'impatto previsto: mediana ${T.primaDellImpattoMsMediana ?? '–'} ms (+ = in anticipo)`);
  if (out){ fs.writeFileSync(out, JSON.stringify({ registrazioni: results, totale: T }, null, 2)); console.log(`\nScritto ${out}`); }
}
