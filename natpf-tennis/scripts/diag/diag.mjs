// Pacchetti della modalità diagnostica (zip scaricati dal gioco, o cartelle estratte):
//   node scripts/diag/diag.mjs metriche sessione.zip            metriche e riassunto (ricalcolate dagli eventi)
//   node scripts/diag/diag.mjs colpi sessione.zip               un colpo del telefono per riga: tipo, mira, tempi, esito
//   node scripts/diag/diag.mjs confronta prima.zip dopo.zip     variazioni delle metriche: meglio, peggio, uguale
// Codice d'uscita 2 se il confronto trova peggioramenti oltre la soglia di rumore (utile prima/dopo una modifica).
import fs from 'node:fs';
import path from 'node:path';
import { readZip } from '../../src/natpf/diag/diag_zip.js';
import { computeMetrics, compareMetrics, summaryLines } from '../../src/natpf/diag/diag_metrics.js';

const [, , cmd, a, b] = process.argv;
const usage = () => { console.error('Uso: node scripts/diag/diag.mjs metriche|colpi <pacchetto.zip|cartella>  ·  confronta <prima> <dopo>'); process.exit(1); };
function open(p){
  if (!p) usage();
  if (fs.statSync(p).isDirectory()) return name => { const f = path.join(p, name); return fs.existsSync(f) ? new Uint8Array(fs.readFileSync(f)) : null; };
  const z = readZip(new Uint8Array(fs.readFileSync(p)));
  return name => z.get(name) || null;
}
const text = b => (b ? new TextDecoder().decode(b) : '');
const lines = b => text(b).split('\n').filter(Boolean).flatMap(l => { try { return [JSON.parse(l)]; } catch { return []; } });
function load(p){
  const get = open(p), meta = JSON.parse(text(get('sessione.json')) || '{}');
  const events = lines(get('eventi.jsonl')), raw = lines(get('telefono-sensori.jsonl'));
  return { meta, events, raw, metrics: computeMetrics(events, { raw, meta }) };
}
if (cmd === 'metriche'){
  const s = load(a);
  console.log(summaryLines(s.metrics).join('\n'));
  console.log('\n' + JSON.stringify(s.metrics, null, 1));
} else if (cmd === 'colpi'){
  const s = load(a);
  console.log('   t (s)    #  via       lato/tipo          mira   rilev  consegna  esito');
  const out = s.events.filter(e => e.k === 'colpo.gioco' && e.chi === 'giocatore');
  for (const c of s.events.filter(e => e.k === 'tel.colpo')){
    const res = out.find(o => o.t >= c.t && o.t - c.t < 1500);
    console.log(`${(c.t/1000).toFixed(2).padStart(8)} ${String(c.n ?? '').padStart(4)}  ${(c.via || '').padEnd(8)}  ${c.scartato ? ('scartato: ' + c.scartato).padEnd(32) : `${(c.lato || '?') + '/' + (c.tipo || '?')}`.padEnd(18) + ` ${String(c.mira ?? '').padStart(6)} ${String(c.rilevamento ?? '').padStart(6)} ${String(c.consegna ?? '').padStart(9)}`}  ${res ? `${res.esito} ${res.tempo || ''} x ${res.x ?? ''} ${res.direzione || ''}` : ''}`);
  }
} else if (cmd === 'confronta'){
  const A = load(a), Bs = load(b);
  const rows = compareMetrics(A.metrics, Bs.metrics);
  const w = Math.max(...rows.map(r => r.label.length));
  console.log(`${'metrica'.padEnd(w)}  ${'prima'.padStart(9)}  ${'dopo'.padStart(9)}  esito`);
  for (const r of rows) console.log(`${r.label.padEnd(w)}  ${String(r.prima ?? '–').padStart(9)}  ${String(r.dopo ?? '–').padStart(9)}  ${r.esito}`);
  if (rows.some(r => r.esito === 'peggio')) process.exitCode = 2;
} else usage();
