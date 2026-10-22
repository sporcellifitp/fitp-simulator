// Pacchetti della modalità diagnostica (zip scaricati dal gioco, o cartelle estratte):
//   node scripts/diag/diag.mjs metriche sessione.zip            metriche e riassunto (ricalcolate dagli eventi)
//   node scripts/diag/diag.mjs colpi sessione.zip               un colpo del telefono per riga: tipo, mira, tempi, forma, esito
//   node scripts/diag/diag.mjs confronta prima.zip dopo.zip     variazioni delle metriche: meglio, peggio, uguale
// Codice d'uscita 2 se il confronto trova peggioramenti oltre la soglia di rumore (utile prima/dopo una modifica).
import fs from 'node:fs';
import path from 'node:path';
import { readZip } from '../../src/natpf/diag/diag_zip.js';
import { computeMetrics, compareMetrics, compareNote, summaryLines } from '../../src/natpf/diag/diag_metrics.js';

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
  // racchetta virtuale: forma del gesto (salita della testa / piano), forza letta, esito con il tempo nella finestra
  // d'impatto (−1…+1, + anticipo) e la qualità; l'esito (evento racchetta) si lega al colpo con il suo numero, il
  // risultato a schermo (colpo.gioco) per tempo
  console.log('   t (s)    #  via       lato/tipo          mira   rilev  consegna  salita/piano  forza  esito');
  const out = s.events.filter(e => e.k === 'colpo.gioco' && e.chi === 'giocatore'), rk = s.events.filter(e => e.k === 'racchetta' && e.chi === 'player');
  for (const c of s.events.filter(e => e.k === 'tel.colpo')){
    const k = rk.find(o => Number.isInteger(c.n) && o.n === c.n) || null, res = out.find(o => o.t >= c.t && o.t - c.t < 1500) || null;
    const forma = c.forma ? `${c.forma.salita}/${c.forma.piano}` : '–';
    console.log(`${(c.t/1000).toFixed(2).padStart(8)} ${String(c.n ?? '').padStart(4)}  ${(c.via || '').padEnd(8)}  ${c.scartato ? ('scartato: ' + c.scartato).padEnd(32) : `${(c.lato || '?') + '/' + (c.tipo || '?')}`.padEnd(18) + ` ${String(c.mira ?? '').padStart(6)} ${String(c.rilevamento ?? '').padStart(6)} ${String(c.consegna ?? '').padStart(9)}`}  ${forma.padStart(12)}  ${String(c.intenzione?.forza ?? '–').padStart(5)}  ${res ? `${res.esito} ${res.tempo || ''} x ${res.x ?? ''} ${res.direzione || ''}${k ? ` · finestra ${k.tempo}${k.oltre ? ` (oltre ${k.oltre})` : ''} q ${k.qualita}${k.fallito ? ' fallito' : ''}${k.rete ? ' in rete' : ''}${k.volee ? ' volée' : ''}` : ''}` : ''}`);
  }
} else if (cmd === 'confronta'){
  const A = load(a), Bs = load(b);
  const rows = compareMetrics(A.metrics, Bs.metrics), note = compareNote(A.metrics, Bs.metrics);
  if (note) console.log(`Attenzione: ${note}\n`);
  const w = Math.max(...rows.map(r => r.label.length));
  console.log(`${'metrica'.padEnd(w)}  ${'prima'.padStart(9)}  ${'dopo'.padStart(9)}  esito`);
  for (const r of rows) console.log(`${r.label.padEnd(w)}  ${String(r.prima ?? '–').padStart(9)}  ${String(r.dopo ?? '–').padStart(9)}  ${r.esito}`);
  if (rows.some(r => r.esito === 'peggio')) process.exitCode = 2;
} else usage();
