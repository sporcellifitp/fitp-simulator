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
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { controllaRiga, eErrore, FINI, REGISTRO } from '../../src/natpf/registro/registro_formato.js';
import { readZip } from '../../src/natpf/diag/diag_zip.js';

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
    this.evento = { n: 0, inizio: new Misura(), fine: new Misura(), delta: new Misura(), sale: 0, scende: 0, uguale: 0, perOrdine: [] };
    this.tel = { stati: {}, cadutePerOra: {}, strade: {}, rtt: new Misura(), rttMax: new Misura(), so: {}, browser: {}, cadutePartite: 0, dopoS: new Misura() };
    this.fps = { medi: new Misura(), peggiori: new Misura(), maxMs: new Misura(), lunghi: 0, costo: new Misura(), sotto30: 0, n: 0 };
    this.avvii = { n: 0, improvvise: 0, ricaricamenti: 0, crash: 0, schermi: {}, gpu: {}, dove: {} };
    this.errori = new Map(); this.altro = { allenamenti: 0, allenamentiFiniti: 0, minigiochi: {}, note: 0, perse: 0 };
  }
  _ctx(c){ const k = `${c.giorno || ''}|${c.postazione || ''}`; let x = this.ctx.get(k); if (!x){ x = { P: null, orologio: null, fuso: 60, ordineEvento: 0 }; this.ctx.set(k, x); } return x; }
  // ora locale dello stand di una riga: dall'ultima riga con l'ora (avvio, partita) e dai ms trascorsi
  _quando(x, row){ if (!x.orologio) return null; return new Date(x.orologio.wall + (row.t - x.orologio.t) + x.fuso*60000); }
  aggiungi(row, c = {}){
    const x = this._ctx(c);
    if (row.ora){ const wall = Date.parse(row.ora); if (Number.isFinite(wall)) x.orologio = { wall, t: row.t }; }
    if (Number.isFinite(row.fuso)) x.fuso = row.fuso;
    const fn = this[`_${row.k.replace('.', '_')}`];
    if (fn) fn.call(this, row, x);
  }
  _avvio(r){ const A = this.avvii; A.n++; if (r.prima === 'improvvisa') A.improvvise++; if (r.pagina === 'reload') A.ricaricamenti++; piu(A.dove, r.dove); if (Array.isArray(r.area)) piu(A.schermi, r.area.join(' × ')); piu(A.gpu, r.gpu === true ? `sì${r.gpuTipo ? ` · ${r.gpuTipo}` : ''}` : r.gpu === false ? 'no (disegno dal processore)' : 'non letta'); }
  _crash(){ this.avvii.crash++; }
  _nota(r){ this.altro.note++; this.altro.perse += r.perse || 0; }
  _partita(r, x){
    if (x.P) this._chiudi(x, null);                                          // la fine di quella di prima non è arrivata
    const d = this._quando(x, r), giorno = d ? d.toISOString().slice(0, 10) : 'senza data', G = voce(this.giorni, giorno, () => ({ partite: 0, finite: 0, abbandonate: 0, ore: {} }));
    G.partite++; if (d) piu(G.ore, d.getUTCHours());
    const T = this.partite; T.n++; piu(T.modo, r.modo); piu(T.ctrl, r.ctrl); piu(T.personaggi, r.personaggi); piu(T.versioni, r.versione); if (r.nomeInserito) T.nomeInserito++;
    x.P = { r, giorno, sup: 0, puntiAiuto: 0, punti: 0 };
    for (const t of [r.tel, r.tel2]) if (t){ piu(this.tel.strade, t.strada); piu(this.tel.so, t.so); piu(this.tel.browser, t.browser); }
    if (r.modo === 'stesso-schermo'){ const S = this.split; S.n++; if (Array.isArray(r.fasce)) piu(S.fasce, r.fasce.join(' · ')); if (r.stand?.caldo) S.caldo++; if (r.stand?.lancioAuto) S.lancioAuto++; }
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
    if (P.r.modo === 'stesso-schermo'){ const k = P.r.stand?.campoAperto ? 'aperto' : 'chiuso', C = this.split.campo[k] || (this.split.campo[k] = { partite: 0, colpiAPunto: new Misura(), durataPunto: new Misura(), nonRaggiunte: 0, punti: 0 }); C.colpiAPunto.metti(r.colpi); C.durataPunto.metti(r.durS); C.punti++; if (r.fine === 'vincente' || r.fine === 'passata' || r.fine === 'ace') C.nonRaggiunte++; }
  }
  _colpo(r, x){
    if (r.amb === 'prova'){ this.prova.colpi++; this.prova.ms.metti(r.ms); return; }
    if (r.amb) return;                                                       // colpi dell'allenamento e dei minigiochi: fuori dalle misure di partita
    const g = voce(this.gesti, r.gesto || '—', () => ({ n: 0, voti: {}, ms: new Misura(), esiti: {}, forza: new Misura() }));
    g.n++; piu(g.voti, r.voto || '—'); g.ms.metti(r.ms); piu(g.esiti, r.e || 'dentro'); g.forza.metti(r.f);
    if (r.sup){ this.sup.riusciti++; if (x.P) x.P.sup++; } else if (r.supNo) piu(this.sup.no, r.supNo);
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
  _minigioco(r){ const m = voce(this.altro.minigiochi, r.gioco || '—', () => [0, 0]); m[0]++; if (r.finito) m[1]++; somma(this.scartati, r.scartati); }
  _visita(r){ const V = this.visite; V.n++; V.durata.metti(r.durS); somma(this.scartati, r.scartati); if (r.abbandono){ V.senzaGiocare++; piu(V.dove, r.abbandono); piu(this.abbandoni, `prima di giocare · ${r.abbandono}${r.come === 'chiosco' ? ' (chiosco)' : ''}`); } }
  _tel(r, x){ const T = this.tel; piu(T.stati, r.stato); if (r.strada) piu(T.strade, r.strada); if (r.stato === 'caduto'){ const d = this._quando(x, r); piu(T.cadutePerOra, d ? `${d.toISOString().slice(0, 10)} · ore ${String(d.getUTCHours()).padStart(2, '0')}` : 'senza ora'); } if (r.stato === 'ricollegato') T.dopoS.metti(r.dopoS); }
  _errore(r, x){ const k = `${r.msg}|${r.file}|${r.riga}`, e = this.errori.get(k) || { msg: r.msg, file: r.file, riga: r.riga, tipo: r.tipo, volte: 0, per: new Map() }; this.errori.set(k, e); e.per.set(x, Math.max(e.per.get(x) || 0, r.volte || 1)); }
  // fine della lettura: le partite rimaste aperte (registro tronco) si chiudono come «senza fine»
  fine(){ for (const x of this.ctx.values()) if (x.P) this._chiudi(x, null); for (const e of this.errori.values()) e.volte = [...e.per.values()].reduce((a, b) => a + b, 0); return this; }
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
