// Lato delle palle per partita da uno o più pacchetti della diagnostica (B16 · decisione (d) dell'utente sulla mira più
// sensibile: «ok ma come lo misuro?»). Per chi gioca con il telefono (P1 e, nel 1v1, P2), partita per partita: metà
// sinistra · metà destra del campo (nel suo riferimento) con il verdetto («equilibrata» / «sbilanciata a destra», soglia
// 70 % su almeno 20 colpi), il dettaglio oltre 1 m a sinistra · al centro · oltre 1 m a destra, le palle angolate (oltre
// 2,5 m dal centro), |mediana x| per blocchi di 20 colpi e |piatto mediano| («riferimento storto: ricalibrare» oltre 0,20).
// In fondo il totale di tutti i pacchetti, separato per sensibilità della mira (alta 17°, media 20°, bassa 23°), e il
// confronto del guadagno (palle angolate) tra le sensibilità, con l'errore del caso. Stesso calcolo del pannello della
// diagnostica e del rapporto (src/natpf/diag/diag_metrics.js: sideBalance, sideTotals, gainCompare, sideLines).
// Il verdetto e il piatto scoprono una calibrazione sbagliata; per confrontare le sensibilità servono le palle angolate e
// molte partite (circa 80 per sensibilità tra alta e media): docs/GUIDA_MISURA_MIRA.md §6.
//
//   node scripts/audit/lato-palle.mjs <pacchetto.zip | cartella estratta> [altri…] [--json=uscita.json]
//
// Le parti di una registrazione lunga (stesso «gruppo» in sessione.json) si leggono insieme, nell'ordine: una partita a
// cavallo di due parti conta una volta. Lo zip è quello scaricato dal gioco («stored», senza compressione): se è stato
// compresso di nuovo, estrarlo e passare la cartella. Guida per lo staff: docs/GUIDA_MISURA_MIRA.md
import fs from 'node:fs';
import path from 'node:path';
import { readZip } from '../../src/natpf/diag/diag_zip.js';
import { sideBalance, sideLines, sideTotals, gainCompare, gainLines, sensLabel, aimName, SIDE } from '../../src/natpf/diag/diag_metrics.js';

const args = process.argv.slice(2);
const files = args.filter(a => !a.startsWith('--'));
const out = (args.find(a => a.startsWith('--json=')) || '').slice(7) || null;
if (!files.length){
  console.error('Uso: node scripts/audit/lato-palle.mjs <pacchetto.zip | cartella estratta> [altri…] [--json=uscita.json]');
  process.exit(1);
}
const text = b => (b ? new TextDecoder().decode(b) : '');
const lines = b => text(b).split('\n').filter(Boolean).flatMap(l => { try { return [JSON.parse(l)]; } catch { return []; } });
function openPackage(p){
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
// pacchetti → registrazioni (le parti dello stesso gruppo insieme, in ordine)
function groupPackages(pkgs){
  const groups = new Map();
  for (const k of pkgs){ const g = k.meta.gruppo || k.meta.id || k.file; (groups.get(g) || groups.set(g, []).get(g)).push(k); }
  return [...groups.values()].map(list => {
    list.sort((a, b) => (a.meta.parte || 1) - (b.meta.parte || 1));
    return { meta: list[0].meta, files: list.map(k => k.file), parts: list.map(k => k.meta.parte || 1), events: list.flatMap(k => k.events) };
  });
}

const pkgs = [];
for (const f of files){
  try { pkgs.push(openPackage(f)); }
  catch (e){ console.error(`Saltato: ${e.message}`); process.exitCode = 1; }
}
const regs = groupPackages(pkgs), all = [], matches = [];
for (const r of regs){
  const lp = sideBalance(r.events, { meta: r.meta }), g = r.meta.gioco || {};
  const head = `${r.meta.id || r.files[0]} · ${r.meta.inizio || '?'} · versione ${r.meta.build || '?'}${r.parts.length > 1 ? ` · parti ${r.parts.join(', ')}` : ''}${g.miraPiena ? ` · sensibilità della mira all'inizio ${g.mira || aimName(g.miraPiena) || ''} (${g.miraPiena}°)` : ' · sensibilità della mira non registrata (pacchetto di prima del B16)'}`;
  console.log(`\n== ${head}`);
  if (!lp.partite.length) console.log('   nessun colpo del telefono in partita (allenamento, minigiochi e webcam non contano)');
  for (const l of sideLines(lp, { prefix: '' })) console.log(`   ${l}`);
  matches.push(...lp.partite);
  all.push({ file: r.files, id: r.meta.id || null, inizio: r.meta.inizio || null, build: r.meta.build || null, mira: g.mira || null, miraPiena: g.miraPiena ?? null, latoPalle: lp });
}
// totale di tutte le registrazioni insieme (le palle angolate si mediano sulle partite di tutti i pacchetti)
const T = sideTotals(matches), confronti = gainCompare(T.perMiraPiena);
const pct = (a, b) => (b ? Math.round(100*a/b) : 0), fmt = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '–');
console.log(`\n== In tutto (${regs.length} registrazion${regs.length === 1 ? 'e' : 'i'}, ${pkgs.length} pacchett${pkgs.length === 1 ? 'o' : 'i'}): ${T.sbilanciate} sbilanciat${T.sbilanciate === 1 ? 'a' : 'e'} su ${T.giudicate} partit${T.giudicate === 1 ? 'a giudicata' : 'e giudicate'} (per giocatore, almeno ${SIDE.min} colpi)${T.giudicate ? ` = ${pct(T.sbilanciate, T.giudicate)} %` : ''}${T.storti ? ` · riferimento storto in ${T.storti}` : ''}`);
for (const [k, v] of Object.entries(T.perMiraPiena).sort()){
  const name = aimName(k), over = v.giudicate >= 5 && v.sbilanciate/v.giudicate > SIDE.alert, a = v.angolate;
  // più di una su cinque: prima la calibrazione; una mira meno sensibile ne toglie solo un poco (guida §6)
  const next = { alta: '«media»', media: '«bassa»' }[name];
  const verdict = v.giudicate < 5 ? ' · poche partite: giocane almeno 5 prima di guardare il verdetto'
    : over ? ` · più di una su cinque: ricalibra chi ha le partite sbilanciate e rifai la misura${next ? `; se restano, la mira ${next} (pannello dello stand) ne toglie solo un poco` : ''} (guida §6)`
    : ' · una su cinque o meno: la calibrazione va bene';
  console.log(`   ${sensLabel(k)}: ${v.sbilanciate} sbilanciat${v.sbilanciate === 1 ? 'a' : 'e'} su ${v.giudicate} = ${pct(v.sbilanciate, v.giudicate)} %${v.storti ? ` · riferimento storto in ${v.storti}: ricalibra quelle persone` : ''}${verdict}${a ? ` · palle angolate (oltre ${fmt(SIDE.wide)} m) ${fmt(a.mediaPercento)} % in media su ${a.partite} partit${a.partite === 1 ? 'a' : 'e'}${Number.isFinite(a.devPunti) ? ` (±${fmt(a.devPunti)} punti da una partita all'altra)` : ''}${v.storti ? ', senza quelle con il riferimento storto' : ''}` : ''}`);
}
for (const l of gainLines(T.perMiraPiena)) console.log(`   ${l}`);
const named = Object.keys(T.perMiraPiena).filter(aimName);
if (named.length > 1 && !confronti.length) console.log(`   confronto del guadagno: servono almeno ${SIDE.minGain} partite giudicate per sensibilità (e per vedere una differenza di 3 punti, come tra alta e media nel banco, circa 80: guida §6)`);
if (out) fs.writeFileSync(out, JSON.stringify({ soglia: { quotaPercento: 100*SIDE.share, colpiMinimi: SIDE.min, centroM: SIDE.center, bloccoColpi: SIDE.block, angolateM: SIDE.wide, piattoStorto: SIDE.storto }, registrazioni: all, totale: T, confronti }, null, 1));
