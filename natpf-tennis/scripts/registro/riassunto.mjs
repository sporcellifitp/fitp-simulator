// Riassunto del registro dello stand (B30): legge i registri veri e produce un rapporto con le misure che servono a
// tarare il gioco (finora tutte le tarature vengono da giocatori simulati).
//   node natpf-tennis/scripts/registro/riassunto.mjs <cartella | file.jsonl | file.jsonl.gz | file.zip> [--out=cartella]
// Scrive riassunto.md e riassunto.html (da aprire con un doppio clic) in --out (di base: riassunto-registro/ nella
// cartella corrente) e stampa due righe di sintesi.
// Che cosa legge, anche mescolato nella stessa cartella:
//   - lo scarico del Worker con la chiave (registro-AAAA-MM-GG.jsonl.gz o registro-tutto.jsonl.gz: blocchi compressi
//     uno dopo l'altro, ognuno con in testa la riga {"k":"blocco",…});
//   - l'albero dello spazio Cloudflare (registro/<giorno>/<postazione>/<parte>.jsonl.gz);
//   - lo zip di «Scarica la coda» del pannello dello stand (blocchi in chiaro, stesso albero);
//   - file .jsonl in chiaro.
// Regge migliaia di partite (una riga alla volta, memoria costante: di ogni misura si tengono conti e un campione) e
// file tronchi (ultima riga a metà, gzip interrotto): quello che si legge si usa, il resto si conta e si dice.
// Lo stesso blocco trovato due volte (scaricato due volte, o in coda e nello spazio) si conta una volta sola.
// B36.0: sezione «Direzione» (quanto si gira la cima, quanto pesa il tempo, Precision «zona chiesta → dove è caduta», gli
// obiettivi dello stand E1–E5 per modello della direzione e livello; come leggerla: docs/b36/misure-b36-0.md).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { controllaRiga, eErrore, FINI, REGISTRO } from '../../src/natpf/registro/registro_formato.js';
import { readZip } from '../../src/natpf/diag/diag_zip.js';
import { sideJudge, SIDE } from '../../src/natpf/diag/diag_metrics.js';
import { PRECISION_ZONES, precisionPoints } from '../../src/natpf/natpf_arcade.js';

/* ---------- lettura: una riga alla volta ---------- */
const NEL_PERCORSO = /(?:^|[\\/])registro[\\/](\d{4}-\d{2}-\d{2})[\\/]([a-z0-9]{8})[\\/](\d{5,7}-[a-z0-9]{4})\.jsonl(?:\.gz)?$/;
const E_REGISTRO = /\.jsonl(?:\.gz)?$|\.zip$/i;
function file(dir){
  if (!fs.statSync(dir).isDirectory()) return [dir];
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1)).flatMap(e => (e.isDirectory() ? file(path.join(dir, e.name)) : E_REGISTRO.test(e.name) ? [path.join(dir, e.name)] : []));
}
// righe di un file in chiaro o gzip (anche più gzip in fila, anche interrotto)
async function* righeDi(f){
  const gz = /\.gz$/i.test(f), src = fs.createReadStream(f);
  let input = src, tronco = false;
  if (gz){
    input = src.pipe(zlib.createGunzip({ finishFlush: zlib.constants.Z_SYNC_FLUSH }));
    input.on('error', () => { tronco = true; input.destroy(); });           // gzip interrotto: si tiene quello letto
  }
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  rl.on('error', () => {});
  try { for await (const line of rl) yield line; } catch { tronco = true; }
  if (tronco) yield { tronco: true };
}
function* righeDelloZip(f){
  let z; try { z = readZip(new Uint8Array(fs.readFileSync(f)), { check: false }); } catch { yield { tronco: true }; return; }
  for (const name of [...z.keys()].sort()){
    if (!/\.jsonl(?:\.gz)?$/i.test(name)) continue;
    let testo = ''; try { const b = Buffer.from(z.get(name)); testo = (/\.gz$/i.test(name) ? zlib.gunzipSync(b, { finishFlush: zlib.constants.Z_SYNC_FLUSH }) : b).toString('utf8'); } catch { yield { tronco: true }; continue; }
    yield { nuovoFile: name };
    yield* testo.split('\n');
  }
}
// Tutte le righe dell'ingresso, in ordine: onRiga(row, { giorno, postazione }) per ogni riga buona di un blocco non
// già visto. Risponde con i conti della lettura
export async function leggiRegistro(ingresso, onRiga){
  const L = { file: 0, righe: 0, illeggibili: 0, blocchi: 0, doppioni: 0, tronchi: 0, byte: 0, incompleto: false, nonValide: 0, esempi: [] };
  const visti = new Set(); let ctx = { giorno: null, postazione: null }, salta = false;
  const blocco = (giorno, postazione, parte) => { const id = `${giorno}_${postazione}_${parte}`; salta = visti.has(id); if (salta) L.doppioni++; else { visti.add(id); L.blocchi++; } ctx = { giorno, postazione }; };
  // un file senza il nome del blocco nel percorso: finché non arriva una riga del blocco, le sue righe fanno storia a sé
  const daNome = name => { const m = NEL_PERCORSO.exec(name); if (m) blocco(m[1], m[2], m[3]); else { salta = false; ctx = { giorno: null, postazione: `file ${name}` }; } return !!m; };
  for (const f of file(ingresso)){
    L.file++;
    let nominato = daNome(f);
    for await (const line of /\.zip$/i.test(f) ? righeDelloZip(f) : righeDi(f)){
      if (typeof line !== 'string'){ if (line.tronco) L.tronchi++; if (line.nuovoFile) nominato = daNome(line.nuovoFile); continue; }
      if (!line) continue;
      L.byte += line.length + 1;
      // una riga molto più lunga di quelle del registro non è del registro: si conta e si salta senza leggerla
      // (revisione: una riga di 30 MB fermava lo strumento per minuti dentro le espressioni del controllo)
      if (line.length > 2*REGISTRO.maxRiga){ L.illeggibili++; continue; }
      let row = null; try { row = JSON.parse(line); } catch {}
      if (!row || typeof row !== 'object' || typeof row.k !== 'string'){ L.illeggibili++; continue; }
      // riga del blocco (la mette il Worker): se il blocco ha già un nome dal percorso è lo stesso, non un altro
      if (row.k === 'blocco'){ if (!nominato) blocco(row.giorno, row.postazione, row.parte); nominato = false; continue; }
      if (row.k === 'nota' && row.continua){ L.incompleto = true; continue; }
      if (salta) continue;
      const guai = controllaRiga(row);
      if (guai.length){ L.nonValide++; if (L.esempi.length < 5) L.esempi.push(`${row.k}: ${guai[0]}`); continue; }
      L.righe++;
      onRiga(row, ctx);
    }
  }
  return L;
}

/* ---------- conti ---------- */
// una misura: quante, somma, minimo, massimo e un campione (al più 4096 valori) per mediana e percentili
// B34 (decisione dell'utente del 13/11): dal B34 il servizio scrive i km/h veri della palla (m/s × 3,6), come le altre
// velocità del registro («in» dei colpi). Le versioni del gioco fino alla 2026-11-13.5 compresa scrivevano m/s × 6,8
// (1,89 volte la palla vera): qui si riportano alla scala vera, così le misure di prima e di dopo si possono sommare.
export const KMH_VECCHI_FINO_A = '2026-11-13.5';
const versioneNum = v => { const m = /^(\d{4})-(\d{2})-(\d{2})\.(\d+)$/.exec(String(v || '')); return m ? [+m[1], +m[2], +m[3], +m[4]] : null; };
export function kmhVecchi(versione){
  const a = versioneNum(versione), b = versioneNum(KMH_VECCHI_FINO_A); if (!a) return false;
  for (let i = 0; i < 4; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return true;
}
export const kmhVeri = (kmh, versione) => (Number.isFinite(kmh) && kmhVecchi(versione) ? kmh*3.6/6.8 : kmh);
export class Misura {
  constructor(){ this.n = 0; this.somma = 0; this.min = Infinity; this.max = -Infinity; this.campione = []; this._s = 2463534242; }
  metti(v){
    if (!Number.isFinite(v)) return;
    this.n++; this.somma += v; if (v < this.min) this.min = v; if (v > this.max) this.max = v;
    if (this.campione.length < 4096) this.campione.push(v);
    else { let s = this._s; s ^= s << 13; s ^= s >>> 17; s ^= s << 5; this._s = s >>> 0; const i = this._s % this.n; if (i < 4096) this.campione[i] = v; }
    this._ord = null;
  }
  get media(){ return this.n ? this.somma/this.n : null; }
  p(q){ if (!this.n) return null; const o = this._ord || (this._ord = [...this.campione].sort((a, b) => a - b)); return o[Math.min(o.length - 1, Math.floor(q*o.length))]; }
  // quota dei valori del campione che soddisfano la condizione
  quota(fn){ return this.campione.length ? this.campione.filter(fn).length/this.campione.length : null; }
}
// B36.0: coppie di valori (per la correlazione di rango), con un campione limitato come Misura
export class Coppie {
  constructor(){ this.n = 0; this.a = []; this.b = []; this._s = 88675123; }
  metti(x, y){
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    this.n++;
    if (this.a.length < 4096){ this.a.push(x); this.b.push(y); return; }
    let s = this._s; s ^= s << 13; s ^= s >>> 17; s ^= s << 5; this._s = s >>> 0; const i = this._s % this.n; if (i < 4096){ this.a[i] = x; this.b[i] = y; }
  }
  // correlazione di rango (Spearman, ranghi medi per i pari merito): 1 = l'una cresce sempre con l'altra
  get rango(){ return spearman(this.a, this.b); }
}
const ranghi = v => { const o = v.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]), r = new Array(v.length); for (let i = 0; i < o.length;){ let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++; for (let k = i; k <= j; k++) r[o[k][1]] = (i + j)/2 + 1; i = j + 1; } return r; };
export function spearman(a, b){
  if (a.length < 3 || a.length !== b.length) return null;
  const ra = ranghi(a), rb = ranghi(b), m = (a.length + 1)/2; let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < a.length; i++){ const x = ra[i] - m, y = rb[i] - m; sab += x*y; saa += x*x; sbb += y*y; }
  return saa && sbb ? sab/Math.sqrt(saa*sbb) : null;
}
// retta dei minimi quadrati y = a + b·x: pendenza, dispersione dei residui (deviazione standard) e R²
export function retta(xs, ys){
  const n = xs.length; if (n < 3) return null;
  const mx = xs.reduce((s, v) => s + v, 0)/n, my = ys.reduce((s, v) => s + v, 0)/n;
  let sxx = 0, sxy = 0, syy = 0; for (let i = 0; i < n; i++){ const dx = xs[i] - mx, dy = ys[i] - my; sxx += dx*dx; sxy += dx*dy; syy += dy*dy; }
  if (!sxx) return null;
  const b = sxy/sxx, res = Math.max(0, syy - b*sxy);
  return { n, pendenza: b, dispersione: Math.sqrt(res/Math.max(1, n - 2)), r2: syy ? 1 - res/syy : null };
}
const piu = (map, k, n = 1) => { if (k == null) return; map[k] = (map[k] || 0) + n; };
const somma = (dst, src) => { for (const [k, v] of Object.entries(src || {})) if (typeof v === 'number') piu(dst, k, v); };
const voce = (map, k, fn) => map[k] || (map[k] = fn());

export class Riassunto {
  constructor(){
    this.ctx = new Map();                  // postazione del giorno → { partita in corso, orologio, fuso }
    this.giorni = {}; this.durata = { finite: new Misura(), abbandonate: new Misura() }; this.abbandoni = {}; this.visite = { n: 0, senzaGiocare: 0, dove: {}, durata: new Misura() };
    this.partite = { n: 0, finite: 0, abbandonate: 0, senzaFine: 0, modo: {}, ctrl: {}, personaggi: {}, versioni: {}, nomeInserito: 0 };
    this.chi = {}; this.gesti = {}; this.scartati = {}; this.vuoti = {};
    this.sup = { riusciti: 0, partite: 0, no: {}, perPartita: new Misura() };
    this.rete = { colpi: 0, aRete: 0, volee: 0, cpu: {} };   // B31
    this.movimento = { colpi: 0, corsa: 0, allungo: 0, falliti: { corsa: 0, allungo: 0, fermi: 0 } };   // B32
    this.servizio = { righe: 0, voti: {}, kmh: new Misura(), ms: new Misura(), punti: 0, lanci: 0, lanciVuoti: 0, lanciAuto: 0, battutaAuto: 0, doppiFalli: 0, ace: 0, auto: 0 };
    this.tutorial = { n: 0, chiusura: {}, durata: new Misura(), tutte: 0 }; this.cal = { n: 0, finite: 0, durata: new Misura(), prove: 0, fallite: 0, passi: {}, perche: {}, ripartenze: 0 };
    // B28: calibrazione giocando (scambi di prova), a parte da quella con i gesti
    this.prova = { n: 0, finite: 0, saltate: 0, durata: new Misura(), palle: new Misura(), livelli: {}, colpi: 0, ms: new Misura() };
    this.split = { n: 0, fasce: {}, aiuto: { partite: 0, vinte: 0, punti: 0, puntiGiovane: 0 }, senzaAiuto: { partite: 0, vinteG: 0 }, campo: { aperto: null, chiuso: null }, caldo: 0, lancioAuto: 0 };
    // B42: scambi lunghi e «scambio che si scalda» (acceso di base in tutti i modi): partite con l'opzione accesa, punti
    // oltre 20 e oltre 30 colpi nelle partite con l'opzione accesa (c) e spenta (s), colpi super con la «palla calda»
    this.lunghi = { partite: 0, caldo: 0, c: { punti: 0, oltre20: 0, oltre30: 0 }, s: { punti: 0, oltre20: 0, oltre30: 0 }, superCaldi: 0 };
    this.evento = { n: 0, inizio: new Misura(), fine: new Misura(), delta: new Misura(), sale: 0, scende: 0, uguale: 0, perOrdine: [] };
    this.tel = { stati: {}, cadutePerOra: {}, strade: {}, rtt: new Misura(), rttMax: new Misura(), so: {}, browser: {}, cadutePartite: 0, dopoS: new Misura() };
    this.fps = { medi: new Misura(), peggiori: new Misura(), maxMs: new Misura(), lunghi: 0, costo: new Misura(), sotto30: 0, n: 0 };
    this.avvii = { n: 0, improvvise: 0, ricaricamenti: 0, crash: 0, schermi: {}, gpu: {}, dove: {} };
    this.errori = new Map(); this.altro = { allenamenti: 0, allenamentiFiniti: 0, minigiochi: {}, note: 0, perse: 0 };
    // B36.0: direzione dei colpi del telefono (docs/b36/misure-b36-0.md): per modello della direzione e livello, partite
    // con e senza i campi nuovi, partite a Precision (zona chiesta → dove è caduta)
    this.dir = { gruppi: {}, partite: { conCampi: 0, vecchie: 0, senzaCampi: 0 }, colpiRacchetta: 0, colpiConTempo: 0, precision: [], precisionSenzaFine: 0 };
  }
  _ctx(c){ const k = `${c.giorno || ''}|${c.postazione || ''}`; let x = this.ctx.get(k); if (!x){ x = { P: null, orologio: null, fuso: 60, ordineEvento: 0, formato: null, prec: [], postazione: c.postazione || null }; this.ctx.set(k, x); } return x; }
  // ora locale dello stand di una riga: dall'ultima riga con l'ora (avvio, partita) e dai ms trascorsi
  _quando(x, row){ if (!x.orologio) return null; return new Date(x.orologio.wall + (row.t - x.orologio.t) + x.fuso*60000); }
  aggiungi(row, c = {}){
    const x = this._ctx(c);
    if (row.ora){ const wall = Date.parse(row.ora); if (Number.isFinite(wall)) x.orologio = { wall, t: row.t }; }
    if (Number.isFinite(row.fuso)) x.fuso = row.fuso;
    const fn = this[`_${row.k.replace('.', '_')}`];
    if (fn) fn.call(this, row, x);
  }
  _avvio(r, x){ if (x) x.formato = Number.isFinite(r.v) ? r.v : null; const A = this.avvii; A.n++; if (r.prima === 'improvvisa') A.improvvise++; if (r.pagina === 'reload') A.ricaricamenti++; piu(A.dove, r.dove); if (Array.isArray(r.area)) piu(A.schermi, r.area.join(' × ')); piu(A.gpu, r.gpu === true ? `sì${r.gpuTipo ? ` · ${r.gpuTipo}` : ''}` : r.gpu === false ? 'no (disegno dal processore)' : 'non letta'); }
  _crash(){ this.avvii.crash++; }
  _nota(r){ this.altro.note++; this.altro.perse += r.perse || 0; }
  _partita(r, x){
    if (x.P) this._chiudi(x, null);                                          // la fine di quella di prima non è arrivata
    const d = this._quando(x, r), giorno = d ? d.toISOString().slice(0, 10) : 'senza data', G = voce(this.giorni, giorno, () => ({ partite: 0, finite: 0, abbandonate: 0, ore: {} }));
    G.partite++; if (d) piu(G.ore, d.getUTCHours());
    const T = this.partite; T.n++; piu(T.modo, r.modo); piu(T.ctrl, r.ctrl); piu(T.personaggi, r.personaggi); piu(T.versioni, r.versione); if (r.nomeInserito) T.nomeInserito++;
    x.P = { r, giorno, sup: 0, puntiAiuto: 0, punti: 0, dir: { g: this._dirPartita(), a: this._dirPartita() } };
    // B36.0: i campi della direzione ci sono? (un gioco nuovo, formato 2, senza «dir» = Worker non ricaricato)
    const D = this.dir.partite; if (r.dir != null) D.conCampi++; else if ((x.formato ?? 0) >= 2) D.senzaCampi++; else D.vecchie++;
    for (const t of [r.tel, r.tel2]) if (t){ piu(this.tel.strade, t.strada); piu(this.tel.so, t.so); piu(this.tel.browser, t.browser); }
    if (r.modo === 'stesso-schermo'){ const S = this.split; S.n++; if (Array.isArray(r.fasce)) piu(S.fasce, r.fasce.join(' · ')); if (r.stand?.caldo) S.caldo++; if (r.stand?.lancioAuto) S.lancioAuto++; }
    this.lunghi.partite++; if (r.stand?.caldo) this.lunghi.caldo++;
    if (Number.isFinite(r.ek)){ this.evento.n++; this.evento.inizio.metti(r.ek); const i = x.ordineEvento++; if (i < 40){ const o = this.evento.perOrdine[i] || (this.evento.perOrdine[i] = new Misura()); o.metti(r.ek); } }
  }
  _chiave(P){ const r = P.r; return r.modo === 'cpu' ? `${r.chi || '—'} · ${r.livello || '—'}` : r.modo === 'stesso-schermo' ? 'stesso schermo' : r.modo || '—'; }
  _gruppo(P){ return voce(this.chi, this._chiave(P), () => ({ partite: 0, finite: 0, vinte: 0, punti: 0, puntiVinti: 0, colpiAPunto: new Misura(), durata: new Misura(), fini: {}, finiG: {}, finiA: {} })); }
  _punto(r, x){
    const P = x.P; if (!P) return;
    const Gp = this._gruppo(P); Gp.punti++; if (r.vince === 'g') Gp.puntiVinti++; Gp.colpiAPunto.metti(r.colpi); piu(Gp.fini, r.fine); piu(r.vince === 'g' ? Gp.finiG : Gp.finiA, r.fine);
    const S = this.servizio; S.punti++; S.lanci += r.lanci || 0; S.lanciVuoti += r.lanciVuoti || 0; S.lanciAuto += r.lanciAuto || 0; S.battutaAuto += r.battutaAuto || 0;
    if (r.fine === 'servizio.rete' || r.fine === 'servizio.fuori') S.doppiFalli++; if (r.fine === 'ace') S.ace++;
    P.punti++; if (P.r.aiuto && r.vince === P.r.aiuto) P.puntiAiuto++;
    if (Number.isFinite(r.colpi)){ const Lc = this.lunghi[P.r.stand?.caldo ? 'c' : 's']; Lc.punti++; if (r.colpi > 20) Lc.oltre20++; if (r.colpi > 30) Lc.oltre30++; }
    if (P.r.modo === 'stesso-schermo'){ const k = P.r.stand?.campoAperto ? 'aperto' : 'chiuso', C = this.split.campo[k] || (this.split.campo[k] = { partite: 0, colpiAPunto: new Misura(), durataPunto: new Misura(), nonRaggiunte: 0, punti: 0 }); C.colpiAPunto.metti(r.colpi); C.durataPunto.metti(r.durS); C.punti++; if (r.fine === 'vincente' || r.fine === 'passata' || r.fine === 'ace') C.nonRaggiunte++; }
  }
  _colpo(r, x){
    this._direzione(r, x);
    if (r.amb === 'prova'){ this.prova.colpi++; this.prova.ms.metti(r.ms); return; }
    if (r.amb) return;                                                       // colpi dell'allenamento e dei minigiochi: fuori dalle misure di partita
    const g = voce(this.gesti, r.gesto || '—', () => ({ n: 0, voti: {}, ms: new Misura(), esiti: {}, forza: new Misura() }));
    g.n++; piu(g.voti, r.voto || '—'); g.ms.metti(r.ms); piu(g.esiti, r.e || 'dentro'); g.forza.metti(r.f);
    if (r.sup){ this.sup.riusciti++; if (x.P) x.P.sup++; if (r.sup === 'calda') this.lunghi.superCaldi++; } else if (r.supNo) piu(this.sup.no, r.supNo);
    // B31: gioco a rete (colpi di chi gioca entro 7 m dalla rete, volée, colpi a rete della CPU)
    const Rt = this.rete; Rt.colpi++; if (r.rete) Rt.aRete++; if (r.volee) Rt.volee++;
    if (Array.isArray(r.in) && ['volée', 'schiacciata', 'palla corta'].includes(r.in[0])) piu(Rt.cpu, r.in[0]);
    // B32: colpi in corsa e in allungo contro la CPU (mov), e quanti sono finiti in rete, fuori o deboli
    const Mv = this.movimento, mv = r.mov === 'corsa' || r.mov === 'allungo' ? r.mov : 'fermi';
    Mv.colpi++; if (mv !== 'fermi') Mv[mv]++; if (r.e) Mv.falliti[mv]++;
  }
  _servizio(r, x){ const S = this.servizio; if (r.fonte === 'senza gesto'){ S.senzaGesto = (S.senzaGesto || 0) + 1; return; } S.righe++; piu(S.voti, r.voto || '—'); S.kmh.metti(kmhVeri(r.kmh, x?.P?.r?.versione)); S.ms.metti(r.ms); if (r.auto) S.auto++; }
  _vuoto(r){ if (!r.amb) piu(this.vuoti, r.perche || '—'); }
  _chiudi(x, r){
    const P = x.P; x.P = null; if (!P) return;
    this._dirFine(P, r);
    const T = this.partite, G = this.giorni[P.giorno], Gp = this._gruppo(P); Gp.partite++;
    this.sup.partite++; this.sup.perPartita.metti(P.sup);
    if (!r){ T.senzaFine++; return; }
    const finita = r.esito === 'finita';
    if (finita){ T.finite++; G.finite++; Gp.finite++; if (r.vince === 'g') Gp.vinte++; this.durata.finite.metti(r.durS); Gp.durata.metti(r.durS); }
    else { T.abbandonate++; G.abbandonate++; this.durata.abbandonate.metti(r.durS); piu(this.abbandoni, `a metà partita · ${r.come === 'chiosco' ? 'nessuno da un po’ (chiosco)' : r.come === 'menu' ? 'ritorno al menu' : r.come || r.esito}`); }
    somma(this.scartati, r.scartati);
    if (r.fps){ const F = this.fps; F.n++; F.medi.metti(r.fps.medi); F.peggiori.metti(r.fps.peggiori); F.maxMs.metti(r.fps.maxMs); F.lunghi += r.fps.lunghi || 0; if (r.fps.medi < 30) F.sotto30++; }
    this.fps.costo.metti(r.costoMs);
    if (r.tel){ this.tel.rtt.metti(r.tel.rtt); this.tel.rttMax.metti(r.tel.rttMax); if (r.tel.cadute) this.tel.cadutePartite++; }
    if (P.r.modo === 'stesso-schermo'){
      const S = this.split, k = P.r.stand?.campoAperto ? 'aperto' : 'chiuso', C = S.campo[k] || (S.campo[k] = { partite: 0, colpiAPunto: new Misura(), durataPunto: new Misura(), nonRaggiunte: 0, punti: 0 }); C.partite++;
      if (P.r.aiuto){ S.aiuto.punti += P.punti; S.aiuto.puntiGiovane += P.puntiAiuto; if (finita){ S.aiuto.partite++; if (r.vince === P.r.aiuto) S.aiuto.vinte++; } }
      else if (finita){ S.senzaAiuto.partite++; if (r.vince === 'g') S.senzaAiuto.vinteG++; }
    }
    if (Number.isFinite(r.ek) && Number.isFinite(P.r.ek)){ const E = this.evento, d = r.ek - P.r.ek; E.fine.metti(r.ek); E.delta.metti(d); if (d > .005) E.sale++; else if (d < -.005) E.scende++; else E.uguale++; }
  }
  _partita_fine(r, x){ this._chiudi(x, r); }
  _tutorial(r){ const T = this.tutorial; T.n++; piu(T.chiusura, r.chiusura || '—'); T.durata.metti(r.durS); if (r.tutte) T.tutte++; }
  _calibrazione(r){
    if (r.tipo === 'giocando'){ const Q = this.prova; Q.n++; if (r.finita) Q.finite++; if (r.saltato) Q.saltate++; Q.durata.metti(r.durS); Q.palle.metti(r.prove); piu(Q.livelli, r.livello || (r.finita ? '—' : 'non finita')); return; }
    const C = this.cal; C.n++; if (r.finita) C.finite++; C.durata.metti(r.durS); C.prove += r.prove || 0; C.fallite += r.fallite || 0; C.ripartenze += r.ripartenze || 0; somma(C.perche, r.perche);
    for (const [k, v] of Object.entries(r.passi || {})) if (Array.isArray(v)){ const p = voce(C.passi, k, () => [0, 0]); p[0] += v[0] || 0; p[1] += v[1] || 0; } }
  _allenamento(r){ this.altro.allenamenti++; if (r.finito) this.altro.allenamentiFiniti++; somma(this.scartati, r.scartati); }
  _minigioco(r, x){
    const m = voce(this.altro.minigiochi, r.gioco || '—', () => [0, 0]); m[0]++; if (r.finito) m[1]++; somma(this.scartati, r.scartati);
    // B36.0: una partita a Precision con i suoi colpi (scritti prima della riga del minigioco)
    if (x && x.prec.length){
      if (r.gioco === 'precision' && this.dir.precision.length < 2000){ const d = this._quando(x, x.prec[0]); this.dir.precision.push({ ora: d ? d.toISOString().slice(0, 16).replace('T', ' ') : '—', postazione: x.postazione || null, dir: r.dir || 'classica', finito: !!r.finito, punti: r.punti ?? null, colpi: x.prec }); }
      x.prec = [];
    }
  }
  _visita(r){ const V = this.visite; V.n++; V.durata.metti(r.durS); somma(this.scartati, r.scartati); if (r.abbandono){ V.senzaGiocare++; piu(V.dove, r.abbandono); piu(this.abbandoni, `prima di giocare · ${r.abbandono}${r.come === 'chiosco' ? ' (chiosco)' : ''}`); } }
  _tel(r, x){ const T = this.tel; piu(T.stati, r.stato); if (r.strada) piu(T.strade, r.strada); if (r.stato === 'caduto'){ const d = this._quando(x, r); piu(T.cadutePerOra, d ? `${d.toISOString().slice(0, 10)} · ore ${String(d.getUTCHours()).padStart(2, '0')}` : 'senza ora'); } if (r.stato === 'ricollegato') T.dopoS.metti(r.dopoS); }
  _errore(r, x){ const k = `${r.msg}|${r.file}|${r.riga}`, e = this.errori.get(k) || { msg: r.msg, file: r.file, riga: r.riga, tipo: r.tipo, volte: 0, per: new Map() }; this.errori.set(k, e); e.per.set(x, Math.max(e.per.get(x) || 0, r.volte || 1)); }
  /* ---------- B36.0: direzione dei colpi ---------- */
  _dirPartita(){ return { colpi: 0, xs: [], piatti: [], dv: [], primi: 0, primi05: 0 }; }
  _dirGruppo(modello, chiave){
    return voce(this.dir.gruppi, `${modello} · ${chiave}`, () => ({ modello, chiave, colpi: 0, conDv: 0, dv: new Misura(), absDv: new Misura(), oltre45: 0, oltre60: 0, conPf: 0, sommaTempo: 0, sommaPiatto: 0,
      tempo: new Misura(), cima: new Coppie(), tempoX: new Coppie(), conRimbalzo: 0, scarto: new Misura(), nellaFinestra: 0, fuoriFinestra: 0, largo: 0, primi: 0, primi05: 0,
      partite: 0, giudicate: 0, storte: 0, durata: new Misura(), seme: new Misura() }));
  }
  // un colpo della racchetta: misure del gruppo (modello della direzione · chi gioca · livello) e della partita
  _direzione(r, x){
    if (Number.isFinite(r.ms) && !r.amb){ this.dir.colpiRacchetta++; if (Number.isFinite(r.tu)) this.dir.colpiConTempo++; }
    if (r.amb === 'minigioco' && Number.isInteger(r.zp)){ if (x.prec.length < 40) x.prec.push(r); return; }   // Precision: aspetta la riga del minigioco
    const P = x.P; if (r.amb || !P) return;
    const G = this._dirGruppo(P.r.dir || 'classica', this._chiave(P)), M = P.dir[r.chi === 'a' ? 'a' : 'g'], lato = r.chi === 'a' ? -1 : 1;
    G.colpi++; M.colpi++;
    if (Number.isFinite(r.dv)){ G.conDv++; G.dv.metti(r.dv); G.absDv.metti(Math.abs(r.dv)); if (Math.abs(r.dv) > 45) G.oltre45++; if (Math.abs(r.dv) > 60) G.oltre60++; if (M.dv.length < 20) M.dv.push(r.dv); }
    if (Number.isFinite(r.pf)){
      G.conPf++; M.piatti.push(r.pf);
      if (M.primi < 10){ M.primi++; G.primi++; if (Math.abs(r.pf) >= .5){ M.primi05++; G.primi05++; } }
      // quanto pesa il tempo nella mira di oggi: la mira totale (d) meno il piatto (pf) è la parte del tempo
      if (Number.isFinite(r.d)){ G.sommaTempo += Math.abs(r.d - r.pf); G.sommaPiatto += Math.abs(r.pf); }
    }
    if (Number.isFinite(r.tu)) G.tempo.metti(Math.abs(r.tu));
    if (Number.isFinite(r.rx)){
      const xr = lato*r.rx;                                                   // nel riferimento di chi colpisce (+ alla sua destra)
      G.conRimbalzo++; M.xs.push(xr);
      if (Number.isFinite(r.pf)) G.cima.metti(r.pf, xr);
      if (Number.isFinite(r.tu) && Number.isFinite(r.lato)) G.tempoX.metti(-r.lato*r.tu, xr);   // in anticipo l'incrociato: −lato·tempo
      if (Number.isFinite(r.x)) G.scarto.metti(Math.abs(r.rx - r.x));       // rimbalzo vero − bersaglio del motore, di lato
      if (Math.abs(xr) > 2.5) G.largo++;
      if (Number.isFinite(r.tu) && Math.abs(r.tu) <= 1){ G.nellaFinestra++; if (r.fu) G.fuoriFinestra++; }
    }
  }
  // fine di una partita: partite storte (E5, come la diagnostica: almeno il 70 % dei colpi in una metà), durata, centro
  // della mira (mediana dello scarto della cima nei primi 20 colpi: stima dell'errore del seme, mire volute comprese)
  _dirFine(P, r){
    const G = this._dirGruppo(P.r.dir || 'classica', this._chiave(P));
    G.partite++; if (r?.esito === 'finita' && Number.isFinite(r.durS)) G.durata.metti(r.durS);
    for (const M of Object.values(P.dir)){
      if (M.xs.length >= SIDE.min){ G.giudicate++; if (sideJudge(M.xs).verdetto === 'sbilanciata') G.storte++; }
      if (M.dv.length >= 10){ const s = [...M.dv].sort((a, b) => a - b), k = s.length >> 1; G.seme.metti(Math.abs(s.length % 2 ? s[k] : (s[k - 1] + s[k])/2)); }
    }
  }
  // fine della lettura: le partite rimaste aperte (registro tronco) si chiudono come «senza fine»
  fine(){ for (const x of this.ctx.values()){ if (x.P) this._chiudi(x, null); if (x.prec.length){ this.dir.precisionSenzaFine++; x.prec = []; } } for (const e of this.errori.values()) e.volte = [...e.per.values()].reduce((a, b) => a + b, 0); return this; }
}

/* ---------- rapporto ---------- */
const N = (v, d = 0) => (v == null || !Number.isFinite(v) ? '—' : (Math.abs(v) < .5*10**-d ? 0 : v).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d }));
const pc = (a, b, d = 0) => (b ? `${N(100*a/b, d)}%` : '—');
const mis = (m, d = 0, u = '') => (m.n ? `${N(m.media, d)}${u} (metà sotto ${N(m.p(.5), d)}${u}; 9 su 10 sotto ${N(m.p(.9), d)}${u})` : '—');
const elenco = (map, tot = null, max = 12) => Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, max).map(([k, v]) => [k, N(v), ...(tot ? [pc(v, tot)] : [])]);
const peso = b => (b >= 1024*1024 ? `${N(b/1024/1024, 1)} MB` : `${N(b/1024, 1)} kB`);

// R: Riassunto (dopo fine()), L: conti della lettura → sezioni: [{ titolo, testo: [..], tabelle: [{ titolo, colonne, righe }] }]
export function rapporto(R, L){
  const S = [], T = R.partite, sez = (titolo, testo = [], tabelle = []) => S.push({ titolo, testo: testo.filter(Boolean), tabelle: tabelle.filter(t => t && t.righe.length) });
  const giorni = Object.keys(R.giorni).sort();
  sez('In breve', [
    `Partite: ${N(T.n)} in ${N(giorni.length)} ${giorni.length === 1 ? 'giorno' : 'giorni'}; finite ${N(T.finite)} (${pc(T.finite, T.n)}), abbandonate ${N(T.abbandonate)} (${pc(T.abbandonate, T.n)})${T.senzaFine ? `, senza la riga di fine ${N(T.senzaFine)} (registro interrotto o blocco non arrivato)` : ''}.`,
    `Durata di una partita finita: ${mis(R.durata.finite, 0, ' s')}. Abbandonata: ${mis(R.durata.abbandonate, 0, ' s')}.`,
    `Nome inserito da chi gioca: ${pc(T.nomeInserito, T.n)} delle partite (nel registro c’è solo «sì/no», mai il nome).`,
    `Registro letto: ${N(L.file)} file, ${N(L.blocchi)} blocchi, ${N(L.righe)} righe, ${peso(L.byte)} in chiaro${T.n ? ` (${N(L.byte/1024/T.n, 2)} kB a partita)` : ''}.`,
    L.doppioni ? `Blocchi trovati due volte e contati una volta sola: ${N(L.doppioni)}.` : '', L.illeggibili ? `Righe non leggibili (a metà): ${N(L.illeggibili)}.` : '', L.tronchi ? `File interrotti (letto quello che c’era): ${N(L.tronchi)}.` : '',
    L.incompleto ? 'ATTENZIONE: uno scarico non è completo (finisce con la riga «continua»): riscaricare dalla pagina del Worker.' : '',
    L.nonValide ? `ATTENZIONE: ${N(L.nonValide)} righe con campi non previsti o vietati, lasciate fuori (es. ${L.esempi.join(' · ')}).` : 'Nessuna riga con campi non previsti o vietati.',
    R.altro.perse ? `Righe perse dal gioco e dichiarate (coda non scrivibile): ${N(R.altro.perse)}.` : '',
  ], [
    { titolo: 'Modo di gioco', colonne: ['Modo', 'Partite', 'Quota'], righe: elenco(T.modo, T.n) },
    { titolo: 'Controller', colonne: ['Controller', 'Partite', 'Quota'], righe: elenco(T.ctrl, T.n) },
    { titolo: 'Personaggi', colonne: ['Personaggi', 'Partite', 'Quota'], righe: elenco(T.personaggi, T.n) },
    { titolo: 'Versione del gioco', colonne: ['Versione', 'Partite', 'Quota'], righe: elenco(T.versioni, T.n) },
  ]);
  const ore = [...new Set(giorni.flatMap(g => Object.keys(R.giorni[g].ore).map(Number)))].sort((a, b) => a - b);
  sez('Partite per giorno e per ora', ['Ora dello stand (ora locale del PC).'], [
    { titolo: 'Per giorno', colonne: ['Giorno', 'Partite', 'Finite', 'Abbandonate', 'Abbandonate %'], righe: giorni.map(g => { const d = R.giorni[g]; return [g, N(d.partite), N(d.finite), N(d.abbandonate), pc(d.abbandonate, d.partite)]; }) },
    { titolo: 'Per ora (partite cominciate)', colonne: ['Giorno', ...ore.map(o => `${o}`)], righe: giorni.map(g => [g, ...ore.map(o => N(R.giorni[g].ore[o] || 0))]) },
  ]);
  sez('Abbandoni: dove', [`Visite: ${N(R.visite.n)}; finite senza giocare: ${N(R.visite.senzaGiocare)} (${pc(R.visite.senzaGiocare, R.visite.n)}). Durata di una visita: ${mis(R.visite.durata, 0, ' s')}.`],
    [{ colonne: ['Dove', 'Volte'], righe: elenco(R.abbandoni) }]);
  const chi = Object.keys(R.chi).sort();
  sez('Per «Chi gioca» e livello', ['Punti vinti da chi gioca (contro la CPU), colpi a punto e come finiscono i punti. Nello stesso schermo «chi gioca» è il Player 1.'], [
    { colonne: ['Chi gioca · livello', 'Partite', 'Finite', 'Vinte', 'Punti vinti', 'Colpi a punto', 'Durata'], righe: chi.map(k => { const c = R.chi[k]; return [k, N(c.partite), N(c.finite), pc(c.vinte, c.finite), pc(c.puntiVinti, c.punti, 1), c.colpiAPunto.n ? `${N(c.colpiAPunto.media, 1)} (metà sotto ${N(c.colpiAPunto.p(.5))})` : '—', c.durata.n ? `${N(c.durata.media)} s` : '—']; }) },
    { titolo: 'Come finiscono i punti (quota dei punti)', colonne: ['Chi gioca · livello', ...FINI], righe: chi.map(k => { const c = R.chi[k]; return [k, ...FINI.map(f => pc(c.fini[f] || 0, c.punti))]; }) },
    { titolo: 'Punti persi da chi gioca: per errore suo o per un colpo dell’avversario', colonne: ['Chi gioca · livello', 'Punti persi', 'Per errore (rete, fuori, servizio)', 'A vuoto', 'Palla non raggiunta'], righe: chi.map(k => { const c = R.chi[k], persi = c.punti - c.puntiVinti, err = FINI.filter(eErrore).reduce((a, f) => a + (c.finiA[f] || 0), 0); return [k, N(persi), pc(err, persi), pc(c.finiA['a vuoto'] || 0, persi), pc((c.finiA.vincente || 0) + (c.finiA.passata || 0) + (c.finiA.ace || 0), persi)]; }) },
  ]);
  const gesti = Object.keys(R.gesti).sort((a, b) => R.gesti[b].n - R.gesti[a].n), tuttiVoti = [...new Set(gesti.flatMap(g => Object.keys(R.gesti[g].voti)))].sort();
  const totColpi = gesti.reduce((a, g) => a + R.gesti[g].n, 0);
  sez('Colpi di chi gioca, per tipo', [`Colpi in partita: ${N(totColpi)}. Errore di tempo in millisecondi: positivo = in anticipo, negativo = in ritardo.`], [
    { titolo: 'Quanti, tempo, esito', colonne: ['Gesto', 'Colpi', 'Quota', 'Errore medio (ms)', 'Metà entro ± (ms)', '9 su 10 entro ± (ms)', 'In anticipo', 'Dentro', 'Rete', 'Fuori', 'Debole'],
      righe: gesti.map(g => { const c = R.gesti[g], abs = new Misura(); for (const v of c.ms.campione) abs.metti(Math.abs(v)); return [g, N(c.n), pc(c.n, totColpi), N(c.ms.media), N(abs.p(.5)), N(abs.p(.9)), c.ms.n ? `${N(100*c.ms.quota(v => v > 0))}%` : '—', pc(c.esiti.dentro || 0, c.n), pc(c.esiti.rete || 0, c.n), pc(c.esiti.fuori || 0, c.n), pc(c.esiti.debole || 0, c.n)]; }) },
    { titolo: 'Voto del tempo (quota dei colpi)', colonne: ['Gesto', ...tuttiVoti], righe: gesti.map(g => [g, ...tuttiVoti.map(v => pc(R.gesti[g].voti[v] || 0, R.gesti[g].n))]) },
    { titolo: 'Gesti scartati o non riconosciuti', colonne: ['Motivo', 'Volte'], righe: elenco(R.scartati) },
    { titolo: 'Colpi a vuoto', colonne: ['Perché', 'Volte'], righe: elenco(R.vuoti) },
  ]);
  // B31: gioco a rete
  const Rt = R.rete, cpuRete = Object.values(Rt.cpu).reduce((a, b) => a + b, 0);
  // B32: movimento
  const Mv = R.movimento, fermi = Mv.colpi - Mv.corsa - Mv.allungo;
  sez('Movimento', [`Colpi in corsa: ${N(Mv.corsa)} su ${N(Mv.colpi)} (${pc(Mv.corsa, Mv.colpi)}); in allungo: ${N(Mv.allungo)} (${pc(Mv.allungo, Mv.colpi)}). Finiti in rete, fuori o deboli: in corsa ${pc(Mv.falliti.corsa, Mv.corsa)}, in allungo ${pc(Mv.falliti.allungo, Mv.allungo)}, gli altri ${pc(Mv.falliti.fermi, fermi)}.`,
    'Colpi in corsa per la regola (forza e precisione: velocità al contatto da metà della massima). Dal B34 la scritta «in corsa» compare solo con la corsa forte (da 0,8 della massima): a schermo se ne vedono meno di quanti ne conta questa riga.']);
  sez('Gioco a rete', [`Colpi di chi gioca entro 7 m dalla rete: ${N(Rt.aRete)} su ${N(Rt.colpi)} (${pc(Rt.aRete, Rt.colpi)}); volée: ${N(Rt.volee)} (${pc(Rt.volee, Rt.colpi)}). Colpi a rete della CPU a cui chi gioca ha risposto: ${N(cpuRete)}.`],
    [{ titolo: 'Colpi a rete della CPU (volée, schiacciata, palla corta)', colonne: ['Colpo', 'Volte', 'Quota'], righe: elenco(Rt.cpu, cpuRete) }]);
  const supNo = Object.values(R.sup.no).reduce((a, b) => a + b, 0);
  sez('Colpo super', [`Riusciti: ${N(R.sup.riusciti)} in ${N(R.sup.partite)} partite (${N(R.sup.perPartita.media, 2)} a partita; partite con almeno uno: ${R.sup.perPartita.n ? `${N(100*R.sup.perPartita.quota(v => v > 0))}%` : '—'}). Gesti forti senza colpo super: ${N(supNo)}.`],
    [{ titolo: 'Perché non è scattato', colonne: ['Motivo', 'Volte', 'Quota'], righe: elenco(R.sup.no, supNo) }]);
  const sv = R.servizio;
  const Lg = R.lunghi, lg = k => `${pc(Lg[k].oltre20, Lg[k].punti)} oltre 20 colpi, ${pc(Lg[k].oltre30, Lg[k].punti)} oltre 30 (${N(Lg[k].punti)} punti)`;
  sez('Scambi lunghi', [
    `Partite con «Scambio che si scalda» acceso (dal 20° colpo colpi più forti e colpo super più facile): ${N(Lg.caldo)} su ${N(Lg.partite)}.`,
    `Punti nelle partite con lo scambio caldo acceso: ${lg('c')}; con lo scambio caldo spento: ${lg('s')}.`,
    `Colpi super con la «palla calda» (possibili solo nello scambio caldo): ${N(Lg.superCaldi)}.`,
  ]);
  sezioneDirezione(R, sez);
  sez('Servizio', [
    `Punti: ${N(sv.punti)}. Lanci: ${N(sv.lanci)} (${N(sv.punti ? sv.lanci/sv.punti : null, 2)} a punto); lanci a vuoto: ${N(sv.lanciVuoti)} (${pc(sv.lanciVuoti, sv.lanci, 1)} dei lanci).`,
    `Servizio in rete o fuori (una palla sola: vale come un doppio fallo): ${N(sv.doppiFalli)} (${pc(sv.doppiFalli, sv.punti, 1)} dei punti). Ace: ${N(sv.ace)} (${pc(sv.ace, sv.punti, 1)}).`,
    `Lancio automatico: ${N(sv.lanciAuto)} lanci fatti dal gioco, ${N(sv.battutaAuto)} battute fatte dal gioco.`,
    `Servizi di chi gioca senza il tempo del gesto (mouse, tastiera, webcam del Player 2): ${N(sv.senzaGesto || 0)}.`,
    `Servizi di chi gioca: ${N(sv.righe)}; velocità ${mis(sv.kmh, 0, ' km/h')} (km/h veri della palla: le versioni fino alla ${KMH_VECCHI_FINO_A} li scrivevano × 1,89 e qui sono già riportati); errore di tempo medio ${N(sv.ms.media)} ms.`,
  ], [{ titolo: 'Voto del servizio', colonne: ['Voto', 'Volte', 'Quota'], righe: elenco(sv.voti, sv.righe) }]);
  const tu = R.tutorial, ca = R.cal;
  sez('Tutorial e calibrazione', [
    `Tutorial: ${N(tu.n)}; visto tutto ${pc(tu.tutte, tu.n)}; durata ${mis(tu.durata, 0, ' s')}.`,
    `Calibrazioni: ${N(ca.n)}; finite ${pc(ca.finite, ca.n)}; durata ${mis(ca.durata, 0, ' s')}; gesti provati ${N(ca.prove)}, non riusciti ${N(ca.fallite)} (${pc(ca.fallite, ca.prove, 1)}); ricominciate da capo ${N(ca.ripartenze)}.`,
    `Calibrazione giocando (scambi di prova): ${N(R.prova.n)} giocatori; finite ${pc(R.prova.finite, R.prova.n)}, con «Salta ›» ${pc(R.prova.saltate, R.prova.n)}; durata ${mis(R.prova.durata, 0, ' s')}; palle ${mis(R.prova.palle, 1)}; colpi ${N(R.prova.colpi)}, errore di tempo medio ${N(R.prova.ms.media)} ms.`,
    `Allenamenti: ${N(R.altro.allenamenti)} (finiti ${pc(R.altro.allenamentiFiniti, R.altro.allenamenti)}).`,
  ], [
    { titolo: 'Come si chiude il tutorial', colonne: ['Chiusura', 'Volte', 'Quota'], righe: elenco(tu.chiusura, tu.n) },
    { titolo: 'Calibrazione giocando: quanto ha imparato il gioco', colonne: ['Livello', 'Giocatori', 'Quota'], righe: elenco(R.prova.livelli, R.prova.n) },
    { titolo: 'Calibrazione: passi', colonne: ['Gesto chiesto', 'Prove', 'Non riuscite', 'Quota'], righe: Object.entries(ca.passi).sort((a, b) => b[1][1] - a[1][1]).map(([k, v]) => [k, N(v[0]), N(v[1]), pc(v[1], v[0])]) },
    { titolo: 'Calibrazione: perché un gesto non riesce', colonne: ['Motivo', 'Volte'], righe: elenco(ca.perche) },
    { titolo: 'Minigiochi', colonne: ['Gioco', 'Cominciati', 'Finiti'], righe: Object.entries(R.altro.minigiochi).map(([k, v]) => [k, N(v[0]), N(v[1])]) },
  ]);
  const sp = R.split, ai = sp.aiuto, campo = k => { const c = sp.campo[k]; return c ? [k === 'aperto' ? 'Campo aperto: Sì' : 'Campo aperto: No', N(c.partite), N(c.colpiAPunto.media, 1), c.durataPunto.n ? `${N(c.durataPunto.media, 1)} s` : '—', pc(c.nonRaggiunte, c.punti, 1)] : null; };
  sez('Stesso schermo', [
    `Partite: ${N(sp.n)}; con «Scambio che si scalda» ${N(sp.caldo)}, con «Lancio automatico» ${N(sp.lancioAuto)}.`,
    `Aiuto al più giovane: ${N(ai.partite)} partite finite; le vince il più giovane nel ${pc(ai.vinte, ai.partite, 1)} dei casi (con i giocatori simulati: 38–42%); punti vinti dal più giovane: ${pc(ai.puntiGiovane, ai.punti, 1)}.`,
    `Senza aiuto (stessa fascia): ${N(sp.senzaAiuto.partite)} partite finite, il Player 1 ne vince il ${pc(sp.senzaAiuto.vinteG, sp.senzaAiuto.partite, 1)}.`,
  ], [
    { titolo: 'Fasce (Player 1 · Player 2)', colonne: ['Fasce', 'Partite', 'Quota'], righe: elenco(sp.fasce, sp.n) },
    { titolo: 'Campo aperto', colonne: ['', 'Partite', 'Colpi a punto', 'Durata dello scambio', 'Punti con palla non raggiunta'], righe: ['chiuso', 'aperto'].map(campo).filter(Boolean) },
  ]);
  const ev = R.evento;
  sez('Livello Evento: adattamento', [
    `Partite al livello Evento: ${N(ev.n)}. Valore a inizio partita: ${mis(ev.inizio, 3)}; a fine partita: ${mis(ev.fine, 3)}.`,
    `In una partita il valore sale ${pc(ev.sale, ev.delta.n)} delle volte, scende ${pc(ev.scende, ev.delta.n)}, resta uguale ${pc(ev.uguale, ev.delta.n)}; variazione media ${N(ev.delta.media, 3)}.`,
  ], [{ titolo: 'Percorso: valore a inizio partita, partita dopo partita (per postazione e giorno)', colonne: ['Partita n°', 'Valore medio', 'Minimo', 'Massimo', 'Quante'], righe: ev.perOrdine.map((m, i) => [i + 1, N(m.media, 3), N(m.min, 3), N(m.max, 3), N(m.n)]).filter((_, i) => i < 10 || i % 5 === 4) }]);
  const te = R.tel;
  sez('Collegamento del telefono', [
    `Cadute del collegamento: ${N(te.stati.caduto || 0)}; ricollegati: ${N(te.stati.ricollegato || 0)} (dopo ${mis(te.dopoS, 1, ' s')}); scollegati: ${N(te.stati.scollegato || 0)}. Partite con almeno una caduta: ${N(te.cadutePartite)} (${pc(te.cadutePartite, T.n, 1)}).`,
    `Ritardo stimato in partita: ${mis(te.rtt, 0, ' ms')}; il peggiore di ogni partita: ${mis(te.rttMax, 0, ' ms')}.`,
  ], [
    { titolo: 'Strada del collegamento', colonne: ['Strada', 'Volte', 'Quota'], righe: elenco(te.strade, Object.values(te.strade).reduce((a, b) => a + b, 0)) },
    { titolo: 'Cadute per ora', colonne: ['Giorno e ora', 'Cadute'], righe: Object.entries(te.cadutePerOra).sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, v]) => [k, N(v)]) },
    { titolo: 'Telefoni (a grandi linee)', colonne: ['Sistema', 'Volte'], righe: elenco(te.so) },
    { titolo: 'Browser del telefono', colonne: ['Browser', 'Volte'], righe: elenco(te.browser) },
  ]);
  const fp = R.fps, av = R.avvii;
  sez('Prestazioni', [
    `Fotogrammi al secondo medi in partita: ${mis(fp.medi, 1)}; il secondo peggiore di ogni partita: ${mis(fp.peggiori, 1)}. Partite sotto 30 di media: ${N(fp.sotto30)} (${pc(fp.sotto30, fp.n, 1)}).`,
    `Fotogramma più lungo di ogni partita: ${mis(fp.maxMs, 0, ' ms')}; fotogrammi oltre 50 ms in tutto: ${N(fp.lunghi)}.`,
    `Costo del registro sul gioco: ${mis(fp.costo, 1, ' ms')} per partita, in tutto (non per fotogramma).`,
  ], [
    { titolo: 'Area di gioco (larghezza × altezza)', colonne: ['Area', 'Avvii'], righe: elenco(av.schermi) },
    { titolo: 'Scheda grafica', colonne: ['Scheda', 'Avvii'], righe: elenco(av.gpu) },
  ]);
  const err = [...R.errori.values()].sort((a, b) => b.volte - a.volte);
  sez('Errori e riavvii', [
    `Avvii del gioco: ${N(av.n)}; dopo una chiusura improvvisa (crash, PC spento, programma chiuso a forza): ${N(av.improvvise)}; ricaricamenti della pagina: ${N(av.ricaricamenti)}; pagina del gioco chiusa di colpo (programma Windows): ${N(av.crash)}.`,
    `Errori JavaScript diversi: ${N(err.length)}.`,
  ], [{ titolo: 'Errori più frequenti', colonne: ['Volte (almeno)', 'Tipo', 'Messaggio', 'File', 'Riga'], righe: err.slice(0, 15).map(e => [N(e.volte), e.tipo || '—', e.msg || '—', e.file || '—', e.riga ?? '—']) }]);
  return S;
}
// B36.0 · sezione «Direzione» (docs/b36/misure-b36-0.md): quanto si gira la cima, quanto pesa il tempo, Precision (zona
// chiesta → dove è caduta) e gli obiettivi dello stand E1–E5 del piano (docs/b36/piano-direzionalita.md §7.6), per modello
// della direzione e livello. Con meno di DIR_MIN colpi per riga i numeri si leggono come indizi
export const DIR_MIN = 200;
const zonaX = c => PRECISION_ZONES[c.zp]?.x ?? null;
// verso la zona: segno giusto e oltre la soglia (cima: oltre la zona morta di 3°; tempo: oltre 0,1 della finestra)
const versoZona = (v, zx, soglia) => Number.isFinite(v) && Math.abs(v) > soglia && Math.sign(v) === Math.sign(zx);
export function precisionRiga(run){
  const C = run.colpi, lat = C.filter(c => Math.abs(zonaX(c) ?? 0) >= 2), rim = C.filter(c => Number.isFinite(c.rx) && Number.isFinite(c.rz));
  const conDv = lat.filter(c => Number.isFinite(c.dv)), conTu = lat.filter(c => Number.isFinite(c.tu) && Number.isFinite(c.lato));
  const giro = s => { const v = lat.filter(c => Number.isFinite(c.dv) && Math.sign(zonaX(c)) === s).map(c => c.dv); return v.length ? v.reduce((a, b) => a + b, 0)/v.length : null; };
  const dist = rim.map(c => { const z = PRECISION_ZONES[c.zp]; return Math.hypot(c.rx - z.x, c.rz - z.z); });
  const punti = rim.reduce((a, c) => a + precisionPoints({ x: c.rx, z: c.rz }, PRECISION_ZONES[c.zp], !c.fu), 0);
  return { palle: C.length, rimbalzi: rim.length, laterali: lat.length, cima: conDv.length ? conDv.filter(c => versoZona(c.dv, zonaX(c), 3)).length/conDv.length : null, nCima: conDv.length,
    tempo: conTu.length ? conTu.filter(c => versoZona(-c.lato*c.tu, zonaX(c), .1)).length/conTu.length : null, giroSx: giro(-1), giroDx: giro(1),
    distanza: dist.length ? dist.reduce((a, b) => a + b, 0)/dist.length : null, punti };
}
export function sezioneDirezione(R, sez){
  const D = R.dir, gruppi = Object.values(D.gruppi).sort((a, b) => (a.modello + a.chiave < b.modello + b.chiave ? -1 : 1)), P = D.partite, tot = P.conCampi + P.senzaCampi + P.vecchie;
  const pochi = g => (g.colpi < DIR_MIN ? ` (pochi colpi: ${N(g.colpi)} < ${DIR_MIN})` : '');
  const nome = g => `${g.modello} · ${g.chiave}`;
  const corr = v => (v == null ? '—' : N(v, 2));
  // Precision: tutte le palle insieme, per modello
  const prec = D.precision, palle = prec.flatMap(p => p.colpi.map(c => ({ ...c, modello: p.dir })));
  const fit = (pred, f) => { const v = palle.filter(c => pred(c) && Number.isFinite(f(c)) && zonaX(c) != null); return retta(v.map(zonaX), v.map(f)); };
  const testoFit = (modello) => {
    const c = fit(x => x.modello === modello, x => x.dv), t = fit(x => x.modello === modello && Number.isFinite(x.lato), x => Number.isFinite(x.tu) ? -x.lato*x.tu : NaN);
    const n = palle.filter(x => x.modello === modello).length, dv = palle.filter(x => x.modello === modello && Number.isFinite(x.dv)), o45 = dv.filter(x => Math.abs(x.dv) > 45).length;
    return `Precision con «${modello}»: ${N(n)} palle in ${N(prec.filter(p => p.dir === modello).length)} partite. Cima → zona: ${c ? `${N(c.pendenza, 1)}° per metro di zona, il giro voluto sparge ±${N(c.dispersione, 1)}° (R² ${N(c.r2, 2)}, ${N(c.n)} palle)` : '—'}. Tempo → zona: ${t ? `R² ${N(t.r2, 2)} (${N(t.n)} palle)` : '—'}. Scarti della cima oltre 45°: ${pc(o45, dv.length, 1)}.`;
  };
  const modelli = [...new Set(prec.map(p => p.dir))].sort();
  sez('Direzione (B36.0: misure, il gioco non cambia)', [
    `Partite con i campi della direzione: ${N(P.conCampi)} su ${N(tot)}${P.vecchie ? `; ${N(P.vecchie)} di versioni del gioco di prima del B36.0` : ''}. Colpi della racchetta in partita con il tempo in finestre: ${N(D.colpiConTempo)} su ${N(D.colpiRacchetta)}.`,
    P.senzaCampi ? `ATTENZIONE: ${N(P.senzaCampi)} partite di un gioco con il formato delle righe 2 senza i campi della direzione: il Worker del registro non è stato ricaricato e li ha tolti (docs/b36/misure-b36-0.md, «Ricaricare il Worker»).` : '',
    'Cima: scarto in gradi dal proprio colpo abituale (+ a destra). Tempo: unità della finestra (+ anticipo). Rimbalzo: dove la palla tocca terra davvero, nel riferimento di chi colpisce (+ alla sua destra). Gruppi: modello della direzione · chi gioca · livello.',
    ...modelli.map(testoFit),
    prec.length ? 'Precision, come leggere: nella prova dello stand ognuno fa due partite «come ti viene» e poi due «gira la cima verso la zona», in quest’ordine; le righe qui sotto sono in ordine di tempo. «Cima verso la zona»: palle delle zone laterali con la cima girata dalla parte della zona (oltre 3°). Il cancello della B36.0: giro voluto entro ±15° su almeno 100 palle di 3 persone, nei blocchi «gira la cima» almeno 8 palle su 10 verso la zona, scarti oltre 45° al più il 5%.' : 'Nessuna partita a Precision con i campi della direzione.',
    D.precisionSenzaFine ? `Colpi di Precision senza la riga di fine del minigioco (registro tronco): ${N(D.precisionSenzaFine)} partite, lasciate fuori.` : '',
  ], [
    { titolo: 'Quanto si gira la cima (colpi del telefono con lo scarto)', colonne: ['Gruppo', 'Colpi', 'Con lo scarto', 'Mediana (°)', 'Metà entro ±°', '9 su 10 entro ±°', 'Dispersione (°)', 'Oltre 45°', 'Oltre 60°'],
      righe: gruppi.map(g => [nome(g) + pochi(g), N(g.colpi), pc(g.conDv, g.colpi), N(g.dv.p(.5), 1), N(g.absDv.p(.5), 1), N(g.absDv.p(.9), 1), g.dv.n > 1 ? N(Math.sqrt(g.dv.campione.reduce((a, v) => a + (v - g.dv.media)**2, 0)/(g.dv.campione.length - 1)), 1) : '—', pc(g.oltre45, g.conDv, 1), pc(g.oltre60, g.conDv, 1)]) },
    { titolo: 'Tempo e cima: chi decide dove va la palla', colonne: ['Gruppo', 'Peso del tempo nella mira', '|Tempo| (metà sotto)', 'Cima → rimbalzo (rango)', 'Tempo → rimbalzo (rango)', 'Con il rimbalzo', 'Rimbalzo − bersaglio di lato (95% entro, m)'],
      righe: gruppi.map(g => [nome(g), g.sommaTempo + g.sommaPiatto ? pc(g.sommaTempo, g.sommaTempo + g.sommaPiatto) : '—', N(g.tempo.p(.5), 2), corr(g.cima.rango), corr(g.tempoX.rango), pc(g.conRimbalzo, g.colpi), N(g.scarto.p(.95), 2)]) },
    { titolo: 'Obiettivi dello stand (piano B36 §7.6; almeno 200 colpi per riga)', colonne: ['Gruppo', 'E1 cima conta (≥ 0,8 con «nuova»)', 'E2 oltre 2,5 m (Evento: non sotto «classica»)', 'E3 fuori con il tempo nella finestra (≤ 3% a Bambini ed Evento)', 'E4 primi 10 colpi con |piatto| ≥ 0,5 (≥ 30%)', 'E5 partite storte (≤ 10%)', 'Durata della partita (media)'],
      righe: gruppi.map(g => [nome(g) + pochi(g), corr(g.cima.rango), pc(g.largo, g.conRimbalzo, 1), pc(g.fuoriFinestra, g.nellaFinestra, 1), pc(g.primi05, g.primi, 1), g.giudicate ? `${pc(g.storte, g.giudicate, 1)} (${N(g.giudicate)} partite)` : '—', g.durata.n ? `${N(g.durata.media)} s` : '—']) },
    { titolo: 'Centro della mira per partita: |mediana dello scarto| nei primi 20 colpi (stima dell’errore del seme, mire volute comprese)', colonne: ['Gruppo', 'Partite', 'Metà sotto (°)', '9 su 10 sotto (°)'],
      righe: gruppi.filter(g => g.seme.n).map(g => [nome(g), N(g.seme.n), N(g.seme.p(.5), 1), N(g.seme.p(.9), 1)]) },
    { titolo: 'Precision: una riga per partita, in ordine di tempo', colonne: ['Ora', 'Modello', 'Palle', 'Con il rimbalzo', 'Cima verso la zona', 'Tempo verso la zona', 'Giro medio zone a sinistra / a destra (°)', 'Distanza dal centro della zona (m)', 'Punti col rimbalzo vero', 'Punti del gioco'],
      righe: prec.map(p => { const x = precisionRiga(p); return [p.ora, p.dir, N(x.palle), N(x.rimbalzi), x.cima == null ? '—' : `${pc(x.cima*x.nCima, x.nCima)} di ${N(x.nCima)}`, x.tempo == null ? '—' : pc(x.tempo, 1), `${N(x.giroSx, 1)} / ${N(x.giroDx, 1)}`, N(x.distanza, 2), N(x.punti), p.punti == null ? '—' : N(p.punti)]; }) },
    { titolo: 'Precision: zona chiesta → dove è caduta (tutte le partite)', colonne: ['Zona', 'Centro x, z (m)', 'Palle', 'Caduta media x, z (m)', 'Distanza media (m)', 'Nella zona'],
      righe: PRECISION_ZONES.map((z, i) => { const v = palle.filter(c => c.zp === i && Number.isFinite(c.rx) && Number.isFinite(c.rz)), m = k => v.reduce((a, c) => a + c[k], 0)/Math.max(1, v.length), d = v.map(c => Math.hypot(c.rx - z.x, c.rz - z.z));
        return [`${i + 1} · ${z.label}`, `${N(z.x, 1)}, ${N(z.z, 1)}`, N(palle.filter(c => c.zp === i).length), v.length ? `${N(m('rx'), 2)}, ${N(m('rz'), 2)}` : '—', d.length ? N(d.reduce((a, b) => a + b, 0)/d.length, 2) : '—', pc(d.filter(x => x <= z.r).length, d.length)]; }).filter((_, i) => palle.some(c => c.zp === i)) },
  ]);
}
const md = v => String(v).replace(/\|/g, '\\|').replace(/\n/g, ' ');
export function inMarkdown(sezioni, { titolo = 'Registro dello stand · riassunto', quando = null } = {}){
  const out = [`# ${titolo}`, '', ...(quando ? [`Fatto il ${quando}.`, ''] : [])];
  for (const s of sezioni){
    out.push(`## ${s.titolo}`, '');
    for (const t of s.testo) out.push(t, '');
    for (const t of s.tabelle){ if (t.titolo) out.push(`**${t.titolo}**`, ''); out.push(`| ${t.colonne.map(md).join(' | ')} |`, `|${t.colonne.map(() => ' --- ').join('|')}|`, ...t.righe.map(r => `| ${r.map(md).join(' | ')} |`), ''); }
  }
  return out.join('\n');
}
const h = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export function inHtml(sezioni, { titolo = 'Registro dello stand · riassunto', quando = null } = {}){
  const corpo = sezioni.map(s => `<section><h2>${h(s.titolo)}</h2>${s.testo.map(t => `<p>${h(t)}</p>`).join('')}${s.tabelle.map(t => `${t.titolo ? `<h3>${h(t.titolo)}</h3>` : ''}<div class="t"><table><thead><tr>${t.colonne.map(c => `<th>${h(c)}</th>`).join('')}</tr></thead><tbody>${t.righe.map(r => `<tr>${r.map(c => `<td>${h(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`).join('')}</section>`).join('\n');
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(titolo)}</title><style>
:root{color-scheme:light dark}body{margin:0;font:16px/1.5 system-ui,sans-serif;background:#f6f7fb;color:#151a2d}main{max-width:1100px;margin:0 auto;padding:24px 16px 60px}
h1{font-size:28px;margin:0 0 4px}h2{font-size:21px;margin:34px 0 8px;padding-top:14px;border-top:2px solid #d5d9ea}h3{font-size:16px;margin:18px 0 6px}p{margin:6px 0}.dim{color:#5c6585}
.t{overflow-x:auto}table{border-collapse:collapse;margin:4px 0 10px;font-size:14.5px}th,td{padding:5px 10px;border-bottom:1px solid #d5d9ea;text-align:right;white-space:nowrap}th:first-child,td:first-child{text-align:left;white-space:normal}th{background:#e9ecf6}
@media (prefers-color-scheme:dark){body{background:#0b1020;color:#eef1fa}h2{border-color:#2a3358}th,td{border-color:#2a3358}th{background:#161d3a}.dim{color:#9aa6c8}}
</style></head><body><main><h1>${h(titolo)}</h1>${quando ? `<p class="dim">Fatto il ${h(quando)}.</p>` : ''}
${corpo}
</main></body></html>
`;
}

// Tutto insieme: legge, conta, scrive i due file. Risponde con { R, L, sezioni, md, html, file: { md, html } }
export async function riassumi(ingresso, { out = null, quando = new Date().toISOString().slice(0, 16).replace('T', ' ') } = {}){
  if (!ingresso || !fs.existsSync(ingresso)) throw new Error(`non trovo ${ingresso || '(niente)'}`);
  const R = new Riassunto(), L = await leggiRegistro(ingresso, (row, ctx) => R.aggiungi(row, ctx));
  R.fine();
  const sezioni = rapporto(R, L), testo = inMarkdown(sezioni, { quando }), pagina = inHtml(sezioni, { quando });
  let scritti = null;
  if (out){ fs.mkdirSync(out, { recursive: true }); scritti = { md: path.join(out, 'riassunto.md'), html: path.join(out, 'riassunto.html') }; fs.writeFileSync(scritti.md, testo); fs.writeFileSync(scritti.html, pagina); }
  return { R, L, sezioni, md: testo, html: pagina, file: scritti };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)){
  const args = process.argv.slice(2), ingresso = args.find(a => !a.startsWith('--')), out = (args.find(a => a.startsWith('--out=')) || '').slice(6) || 'riassunto-registro';
  if (!ingresso){ console.error('Uso: node natpf-tennis/scripts/registro/riassunto.mjs <cartella | file.jsonl | file.jsonl.gz | file.zip> [--out=cartella]'); process.exit(1); }
  try {
    const r = await riassumi(ingresso, { out });
    console.log(r.sezioni[0].testo.slice(0, 4).join('\n'));
    console.log(`\nRapporto: ${path.resolve(r.file.md)}\n          ${path.resolve(r.file.html)}  (da aprire con un doppio clic)`);
  } catch (e){ console.error(`Errore: ${e.message}`); process.exit(1); }
}
