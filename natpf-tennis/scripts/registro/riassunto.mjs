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
// B75: sezione «Confronto: assi del giroscopio × direzione dei colpi» (i quattro gruppi assi oggi/corretti × direzione
// classica/nuova, e per telefono; come leggerla e cosa serve per decidere: docs/b75/confronto-registro.md).
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
// versione a dopo b? (data e numero come interi: «.10» viene dopo «.3»); false se a non è una versione
const dopo = (a, b) => { const x = versioneNum(a), y = versioneNum(b); if (!x || !y) return false; for (let i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };
// B71 (revisione): «cf» dei colpi è la confidenza del gioco solo nelle versioni dopo la 2026-11-18.3; fino a quella era
// quella del telefono (0,45 fissa in fiera): le due non si sommano (la media e la quota sotto 0,2 sarebbero false)
export const CF_TELEFONO_FINO_A = '2026-11-18.3';
export const cfDelGioco = versione => dopo(versione, CF_TELEFONO_FINO_A);
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

// B66: colpo «al limite» = picco del gesto meno di 1,2 volte la soglia che ha superato
export const B66_LIMITE = 1.2;
// B71 (registri del 18 e 19/11, docs/b71/registro-tempo.md): «cf» è la confidenza del tipo di colpo del gioco
// (natpf_stroke_intent: margine 0…1 dalla soglia più vicina, 0,5 il colpo normale). Sotto 0,2 il colpo è vicino al confine
// con un altro tipo: un gesto appena diverso sarebbe stato un altro colpo. Prima (fino alla 2026-11-18.3) era quella del
// telefono, sempre 0,45 in fiera, e la soglia era 0,5: la colonna diceva 100 % e non voleva dire niente
export const CF_INCERTA = .2;
// voto «Perfetto» di un colpo: il registro scrive il voto del motore in minuscolo ('perfect', 'early', 'very early'…);
// si accetta anche quello italiano (registri finti e prove di prima). Prima si confrontava solo 'perfetto': 0 % sempre
export const perfetto = v => /^(perfect|perfetto)\b/i.test(String(v || '').trim());
// B71: consumo della batteria per telefono e per giorno: solo i tratti senza ricarica, almeno mezz'ora in tutto
export const BATTERIA_MIN_ORE = .5;
const nuovoB66 = () => ({
  partite: { n: 0, conMisure: 0, senzaMisure: 0 }, versioni: { pagina: {}, app: {} },
  sensori: { n: 0, hz: new Misura(), hzMin: new Misura(), sotto50: 0, soloMedia: 0, campioni: 0, buchi: 0, buchiPartita: new Misura(), bucoMax: new Misura(), colpiBuco: 0, intervallo: {}, saturi: 0, satAcc: 0, satGiro: 0, perTel: {} },
  gesto: { conBuco: 0 }, gesti: {}, limite: { 'al limite': { n: 0, ms: new Misura(), deboli: 0, sbagliati: 0 }, pieni: { n: 0, ms: new Misura(), deboli: 0, sbagliati: 0 } },
  perOrdine: [0, 1, 2, 3].map(() => ({ n: 0, ms: new Misura(), perfetti: 0, sbagliati: 0 })),
  arr: new Misura(), ris: new Misura(), strade: {}, ritardoTempo: [0, 1, 2, 3].map(() => ({ n: 0, ms: new Misura(), ritardo: 0 })),
  coll: { n: 0, colpi: 0, stimati: 0, persi: 0, ordine: 0, jit: new Misura(), arrP90: new Misura(), veloce: 0, affidabile: 0 }, perSegnale: {}, pause: {}, partiteConPausa: 0,
  // (B71: letture della batteria per telefono e giorno, chiave «giorno · postazione · giocatore»: [{ t0, t1, b0, b1, ch }];
  // batterie: le righe della tabella, da _b66Batterie a fine lettura; consumo: un valore per telefono e giorno)
  wifi: { n: 0, rssi: new Misura(), rssiMin: new Misura(), deboli: 0, bande: {}, mbps: new Misura(), mbpsMin: new Misura(), batt: new Misura(), consumo: new Misura(), inCarica: 0, temp: new Misura(), calde: 0, conFissa: 0, sempreFissa: 0,
    letture: {}, batterie: [] },
  blocco: { n: 0, durS: new Misura(), tocchi: 0, tocchiPartita: new Misura(), ss: 0, sp: 0, sd: 0, us: 0, sc: 0, conUscite: 0 },
  cal: { n: 0, tipo: {}, tipN: new Misura(), cen: new Misura(), deriva: new Misura(), tipico: new Misura(), dvi: new Misura(), conSegno: 0, conMano: 0, conRic: 0, refCambiato: 0, soglie: {} },
  // B71: ritardo dello schermo salvato (displayLagMs della riga «partita», ms) → partite
  schermo: {},
  // B71 (revisione): partite con il telefono di un gioco con formato 4, con e senza i campi del B71 (displayLagMs c'è sempre
  // nelle partite con il telefono: se manca, il Worker del registro non è stato ricaricato); lato del colpo per origine (ls),
  // confidenza del verso (vc) e, dai telefoni, sorgente dei sensori (sr), ritorni al browser (rp), ritardo del browser (lg);
  // colpi con la confidenza del telefono (registri fino alla 2026-11-18.3), contati a parte
  b71: { conCampi: 0, senzaCampi: 0, ls: {}, vc: { n: 0, bassa: 0 }, sr: {}, rp: {}, lg: new Misura(), cfTelefono: 0 },
});
// B71: verso del gesto incerto sotto questa confidenza (natpf_phone_racket.VERSE_FAIR.conf)
export const VC_INCERTA = .35;

// B75 (docs/b75/confronto-registro.md): confronto assi del giroscopio (B74: «oggi» o «corretti») × direzione dei colpi (B73:
// «classica» o «nuova»), partita per partita; con «corretti» anche per telefono (Android riordinato, iPhone come oggi)
export const CONFRONTO_GRUPPI = Object.freeze(['oggi · classica', 'oggi · nuova', 'corretti · classica', 'corretti · nuova']);
// sotto queste soglie un gruppo ha «pochi dati» (i colpi come la sezione «Direzione», DIR_MIN; le partite come il criterio
// della B36.8: almeno 20 partite)
export const CONFRONTO_MIN = Object.freeze({ partite: 20, colpi: 200 });
// revisione del B75 (U1): da 20 a 99 partite per gruppo contano solo differenze grandi (10 punti o più); le soglie di 2–5
// punti del documento (§4.2, §4.4) valgono da 100 partite per gruppo (docs/b75/confronto-registro.md §4.1 punto 4)
export const CONFRONTO_FINE = Object.freeze({ partite: 100 });
// revisione del B75 (U2): sotto queste soglie le tabelle di dettaglio dicono «pochi dati»: colpi per telefono (§4.1), partite
// per livello (criterio 6 del §4.2), palle e visite di Precision (B36.8: 100 palle di almeno 3 persone), giocatori della
// calibrazione giocando. Da 50 giocatori in su la tabella dice la differenza più piccola che conta (caso peggiore, una quota
// del 50 %: 2·√(2·0,25/n) = √(2/n)), «—» da 5 punti in giù (la tolleranza del criterio 4)
export const CONFRONTO_DETTAGLIO = Object.freeze({ colpiTelefono: 200, partiteLivello: 20, palle: 100, visite: 3, giocatori: 50, puntiCal: 5 });
// cima «girata»: |piatto| da 0,5 (come l'obiettivo E4 del piano B36 §7.6)
export const CIMA_GIRATA = .5;
// tipi di colpo nel registro: il gioco scrive i nomi del motore (TOPSPIN, FLAT…), i registri finti di prima quelli italiani
export const TIPI_COLPO = Object.freeze(['topspin', 'piatto', 'tagliato', 'pallonetto', 'palla corta', 'schiacciata']);
const TIPO_DI = { topspin: 'topspin', flat: 'piatto', piatto: 'piatto', slice: 'tagliato', tagliato: 'tagliato', lob: 'pallonetto', pallonetto: 'pallonetto', drop: 'palla corta', 'palla corta': 'palla corta', smash: 'schiacciata', schiacciata: 'schiacciata' };
export const tipoColpo = g => TIPO_DI[String(g || '').trim().toLowerCase()] || 'altri';
// livello della calibrazione giocando (natpf_trial: none, partial, ok, full); i registri finti di prima l'avevano in italiano
export const LIVELLI_CAL = Object.freeze(['none', 'partial', 'ok', 'full']);
const LIVELLO_CAL_DI = { none: 'none', partial: 'partial', ok: 'ok', full: 'full', nessuno: 'none', parziale: 'partial', pieno: 'full' };
const livelloCal = r => LIVELLO_CAL_DI[String(r.livello || '').toLowerCase()] || (r.livello ? 'altro' : 'senza livello');
// telefono di un colpo: con «corretti» quello che ha detto il telefono (tel.assi), altrimenti il sistema (tel.so)
export function telefonoCfr(t, assi){
  if (assi === 'corretti') return t?.assi === 'corretti' ? 'Android riordinato' : t?.assi === 'oggi' ? 'iPhone e altri, come oggi' : 'senza risposta (pagina di prima)';
  const so = String(t?.so || ''); return /android/i.test(so) ? 'Android' : /iphone|ipad|ios/i.test(so) ? 'iPhone' : 'altro o non noto';
}
const nuovoCfrGruppo = () => ({ partite: 0, finite: 0, durata: new Misura(), telefoni: 0, colpi: 0,
  conDv: 0, dv: new Misura(), absDv: new Misura(), oltre45: 0, oltre60: 0, seme: new Misura(),
  conPl: 0, opposti: 0, aiutati: 0, ls: {}, vc: new Misura(), vcBassa: 0, vg: {}, tipi: {},
  voti: { perfetti: 0, anticipo: 0, ritardo: 0, altri: 0 }, ms: new Misura(), absMs: new Misura(), deboli: 0, sbagliati: 0, vuoti: 0,
  conPf: 0, nr: 0, sommaTempo: 0, sommaPiatto: 0, cima: new Coppie(), tempoX: new Coppie(), conRimbalzo: 0, girata: 0, girataGiusta: 0, largo: 0, nellaFinestra: 0, fuoriFinestra: 0,
  primi: 0, primi05: 0, giudicate: 0, storte: 0, cal: {}, giorni: {} });
// (revisione U3: durata e punti delle partite finite, anche per lo stesso schermo)
const nuovoCfrLivello = () => ({ partite: 0, finite: 0, vinte: 0, punti: 0, vinti: 0, conRimbalzo: 0, largo: 0, nellaFinestra: 0, fuoriFinestra: 0, durata: new Misura(), puntiFinite: 0 });
// (revisione N1: p2Corretti, partite del computer del P2 della sfida con «Corretti»; p2Remoti, colpi, colpi a vuoto e
// calibrazioni giocando del P2 della sfida nelle partite dell'host, fuori dai gruppi; nVisite, visite con Precision, U2)
const nuovoConfronto = () => ({ gruppi: {}, telefoni: {}, livelli: {}, precision: {},
  partite: { formato5: 0, vecchie: 0, conAssi: 0, assiNonNoti: 0, dirNonNota: 0, p2: 0, p2Corretti: 0, senzaTelefono: 0 }, calSenzaPartita: 0, precisionSenzaPartita: 0,
  p2Remoti: { colpi: 0, vuoti: 0, cal: 0 }, nVisite: 0 });
const mediana = v => { const s = [...v].sort((a, b) => a - b), k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k])/2; };
// un colpo del telefono nelle misure di un gruppo (o di un telefono di un gruppo)
function cfrColpo(S, r){
  S.colpi++;
  if (Number.isFinite(r.dv)){ S.conDv++; S.dv.metti(r.dv); S.absDv.metti(Math.abs(r.dv)); if (Math.abs(r.dv) > 45) S.oltre45++; if (Math.abs(r.dv) > 60) S.oltre60++; }
  if ((r.pl === 1 || r.pl === -1) && (r.lato === 1 || r.lato === -1)){ S.conPl++; if (r.pl !== r.lato) S.opposti++; }
  if (r.aiutato) S.aiutati++;
  if (typeof r.ls === 'string') piu(S.ls, r.ls);
  if (Number.isFinite(r.vc)){ S.vc.metti(r.vc); if (r.vc < VC_INCERTA) S.vcBassa++; }
  if (r.vg === -1 || r.vg === 0 || r.vg === 1) piu(S.vg, String(r.vg));
  piu(S.tipi, tipoColpo(r.gesto));
  const v = String(r.voto || '').toLowerCase();
  if (perfetto(v)) S.voti.perfetti++; else if (/early|anticipo/.test(v)) S.voti.anticipo++; else if (/late|ritardo/.test(v)) S.voti.ritardo++; else S.voti.altri++;
  if (Number.isFinite(r.ms)){ S.ms.metti(r.ms); S.absMs.metti(Math.abs(r.ms)); }
  if (r.e === 'debole') S.deboli++; else if (r.e === 'rete' || r.e === 'fuori') S.sbagliati++;
  if (r.nr === 1) S.nr++;
  if (Number.isFinite(r.pf)){ S.conPf++; if (Number.isFinite(r.d)){ S.sommaTempo += Math.abs(r.d - r.pf); S.sommaPiatto += Math.abs(r.pf); } }
  if (Number.isFinite(r.rx)){
    const xr = (r.chi === 'a' ? -1 : 1)*r.rx;                                // nel riferimento di chi colpisce (+ alla sua destra)
    S.conRimbalzo++; if (Math.abs(xr) > 2.5) S.largo++;
    if (Number.isFinite(r.pf)){ S.cima.metti(r.pf, xr); if (Math.abs(r.pf) >= CIMA_GIRATA){ S.girata++; if (Math.sign(xr) === Math.sign(r.pf)) S.girataGiusta++; } }
    if (Number.isFinite(r.tu) && Number.isFinite(r.lato)) S.tempoX.metti(-r.lato*r.tu, xr);
    if (Number.isFinite(r.tu) && Math.abs(r.tu) <= 1){ S.nellaFinestra++; if (r.fu) S.fuoriFinestra++; }
  }
}

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
    // B60: km/h dei colpi in partita (dalla 2026-11-17.1) e colpo più forte di ogni giocatore in ogni partita (colpi e
    // servizi, come «km/h, il tuo colpo più forte» della fine partita e il trofeo Razzo)
    this.velocita = { colpi: new Misura(), maxPartita: new Misura(), conColpi: 0 };
    // 17/11: dritto o rovescio dalla parte opposta alla palla (pl: la palla, lato: la parte del corpo del colpo); serie: 3
    // di fila dello stesso giocatore nella stessa partita (verso del telefono girato, più che un colpo voluto)
    this.parte = { g: { n: 0, opposti: 0 }, a: { n: 0, opposti: 0 }, partite: 0, conSerie: 0 };
    this.tutorial = { n: 0, chiusura: {}, durata: new Misura(), tutte: 0 }; this.cal = { n: 0, finite: 0, durata: new Misura(), prove: 0, fallite: 0, passi: {}, perche: {}, ripartenze: 0 };
    // B28: calibrazione giocando (scambi di prova), a parte da quella con i gesti
    this.prova = { n: 0, finite: 0, saltate: 0, durata: new Misura(), palle: new Misura(), livelli: {}, colpi: 0, ms: new Misura() };
    this.split = { n: 0, fasce: {}, aiuto: { partite: 0, vinte: 0, punti: 0, puntiGiovane: 0 }, senzaAiuto: { partite: 0, vinteG: 0 }, campo: { aperto: null, chiuso: null }, caldo: 0, lancioAuto: 0 };
    // B42: scambi lunghi e «scambio che si scalda» (acceso di base in tutti i modi): partite con l'opzione accesa, punti
    // oltre 20 e oltre 30 colpi nelle partite con l'opzione accesa (c) e spenta (s), colpi super con la «palla calda»
    this.lunghi = { partite: 0, caldo: 0, c: { punti: 0, oltre20: 0, oltre30: 0 }, s: { punti: 0, oltre20: 0, oltre30: 0 }, superCaldi: 0 };
    this.evento = { n: 0, inizio: new Misura(), fine: new Misura(), delta: new Misura(), sale: 0, scende: 0, uguale: 0, perOrdine: [] };
    // B74: partite con «Assi del giroscopio: Corretti (prova)» e, per telefono, cosa ha fatto il telefono
    this.assi = { partite: 0, tel: {} };
    this.tel = { stati: {}, cadutePerOra: {}, strade: {}, rtt: new Misura(), rttMax: new Misura(), so: {}, browser: {}, cadutePartite: 0, dopoS: new Misura(),
      // B46: cambi di mano (mano · causa) e del segno del verso (causa · segno), con quanti in partita
      mano: {}, segno: {}, manoInPartita: 0, segnoInPartita: 0,
      // B45.1: perché cadono (motivo · chi se n'è accorto), dove si era, motivo chiarito al ritorno; righe di prima: «chiosco»
      perche: {}, dove: {}, ritorno: {} };
    this.fps = { medi: new Misura(), peggiori: new Misura(), maxMs: new Misura(), lunghi: 0, costo: new Misura(), sotto30: 0, n: 0 };
    this.avvii = { n: 0, improvvise: 0, ricaricamenti: 0, crash: 0, schermi: {}, gpu: {}, dove: {} };
    this.errori = new Map(); this.altro = { allenamenti: 0, allenamentiFiniti: 0, minigiochi: {}, note: 0, perse: 0 };
    // B36.0: direzione dei colpi del telefono (docs/b36/misure-b36-0.md): per modello della direzione e livello, partite
    // con e senza i campi nuovi, partite a Precision (zona chiesta → dove è caduta)
    this.dir = { gruppi: {}, partite: { conCampi: 0, vecchie: 0, senzaCampi: 0 }, partiteP2: 0, colpiRacchetta: 0, colpiConTempo: 0, precision: [], precisionSenzaFine: 0 };
    // B66 (docs/b66/registro-sensori.md): sensori, calibrazione, precisione dei gesti, collegamento, rete e blocco del telefono
    this.b66 = nuovoB66();
    // B75: confronto assi del giroscopio × direzione dei colpi (docs/b75/confronto-registro.md)
    this.cfr = nuovoConfronto();
  }
  // (B75: assi, ultimo stato degli assi della postazione, per le partite a Precision; cfrCal e cfrPrec, calibrazioni giocando
  // e partite a Precision arrivate prima di una partita, che aspettano la partita dopo; visitaCfr, numero della visita in
  // corso con Precision, per contare le visite di Precision senza identificativi: revisione U2)
  _ctx(c){ const k = `${c.giorno || ''}|${c.postazione || ''}`; let x = this.ctx.get(k); if (!x){ x = { P: null, orologio: null, fuso: 60, ordineEvento: 0, formato: null, prec: [], postazione: c.postazione || null, assi: null, cfrCal: [], cfrPrec: [], visitaCfr: null }; this.ctx.set(k, x); } return x; }
  // ora locale dello stand di una riga: dall'ultima riga con l'ora (avvio, partita) e dai ms trascorsi
  _quando(x, row){ if (!x.orologio) return null; return new Date(x.orologio.wall + (row.t - x.orologio.t) + x.fuso*60000); }
  aggiungi(row, c = {}){
    const x = this._ctx(c);
    if (row.ora){ const wall = Date.parse(row.ora); if (Number.isFinite(wall)) x.orologio = { wall, t: row.t }; }
    if (Number.isFinite(row.fuso)) x.fuso = row.fuso;
    const fn = this[`_${row.k.replace('.', '_')}`];
    if (fn) fn.call(this, row, x);
  }
  _avvio(r, x){ if (x){ x.formato = Number.isFinite(r.v) ? r.v : null; x.visitaCfr = null; } const A = this.avvii; A.n++; if (r.prima === 'improvvisa') A.improvvise++; if (r.pagina === 'reload') A.ricaricamenti++; piu(A.dove, r.dove); if (Array.isArray(r.area)) piu(A.schermi, r.area.join(' × ')); piu(A.gpu, r.gpu === true ? `sì${r.gpuTipo ? ` · ${r.gpuTipo}` : ''}` : r.gpu === false ? 'no (disegno dal processore)' : 'non letta'); }
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
    // B74: assi del giroscopio (stand.assi con l'interruttore acceso; tel.assi come li usa il telefono, docs/b74/assi-giroscopio.md)
    if (r.stand?.assi === 'corretti'){ const A = this.assi; A.partite++; for (const t of [r.tel, r.tel2]) if (t) piu(A.tel, t.assi === 'corretti' ? 'riordinati (Android)' : t.assi === 'oggi' ? 'come oggi (iPhone e altri)' : 'senza risposta (pagina di prima)'); }
    this._cfrPartita(r, x);
    this._b66Partita(r, x);
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
    this._cfrPunto(r, x);
  }
  _colpo(r, x){
    this._cfrColpo(r, x);
    this._direzione(r, x);
    this._b66Colpo(r, x);
    if (r.amb === 'prova'){ this.prova.colpi++; this.prova.ms.metti(r.ms); return; }
    if (r.amb) return;                                                       // colpi dell'allenamento e dei minigiochi: fuori dalle misure di partita
    if (Number.isFinite(r.kmh)){ this.velocita.colpi.metti(r.kmh); this._kmhMax(x, r.chi === 'a' ? 'a' : 'g', r.kmh, true); }
    if ((r.pl === 1 || r.pl === -1) && (r.lato === 1 || r.lato === -1)){
      const k = r.chi === 'a' ? 'a' : 'g', S = this.parte[k], opp = r.pl !== r.lato; S.n++; if (opp) S.opposti++;
      if (x?.P){ const f = x.P.parteFila || (x.P.parteFila = { g: 0, a: 0 }); f[k] = opp ? f[k] + 1 : 0; x.P.parteConPl = true; if (f[k] >= 3) x.P.parteSerie = true; }
    }
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
  // B60: colpo più forte del giocatore k ('g' chi gioca, 'a' l'avversario umano) nella partita aperta
  _kmhMax(x, k, kmh, colpo = false){ const P = x?.P; if (!P || !Number.isFinite(kmh)) return; P.kmh = P.kmh || {}; P.kmh[k] = Math.max(P.kmh[k] || 0, kmh); if (colpo) P.kmhColpi = true; }
  _servizio(r, x){ const S = this.servizio; if (r.fonte === 'senza gesto'){ S.senzaGesto = (S.senzaGesto || 0) + 1; return; } S.righe++; piu(S.voti, r.voto || '—'); S.kmh.metti(kmhVeri(r.kmh, x?.P?.r?.versione)); this._kmhMax(x, r.chi === 'a' ? 'a' : 'g', kmhVeri(r.kmh, x?.P?.r?.versione)); S.ms.metti(r.ms); if (r.auto) S.auto++; }
  _vuoto(r, x){ if (!r.amb) piu(this.vuoti, r.perche || '—'); this._cfrVuoto(r, x); }
  _chiudi(x, r){
    const P = x.P; x.P = null; if (!P) return;
    this._dirFine(P, r);
    this._b66Fine(P, r, x);
    this._cfrFine(P, r);
    const T = this.partite, G = this.giorni[P.giorno], Gp = this._gruppo(P); Gp.partite++;
    this.sup.partite++; this.sup.perPartita.metti(P.sup);
    // B60: solo le partite con i km/h dei colpi (prima solo i servizi: il massimo sarebbe sbagliato)
    if (P.kmhColpi && P.kmh){ this.velocita.conColpi++; for (const v of Object.values(P.kmh)) this.velocita.maxPartita.metti(v); }
    if (P.parteConPl){ this.parte.partite++; if (P.parteSerie) this.parte.conSerie++; }
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
  _calibrazione(r, x){
    if (r.tipo === 'giocando'){ const Q = this.prova; Q.n++; if (r.finita) Q.finite++; if (r.saltato) Q.saltate++; Q.durata.metti(r.durS); Q.palle.metti(r.prove); piu(Q.livelli, r.livello || (r.finita ? '—' : 'non finita')); this._cfrCalibrazione(r, x); return; }
    const C = this.cal; C.n++; if (r.finita) C.finite++; C.durata.metti(r.durS); C.prove += r.prove || 0; C.fallite += r.fallite || 0; C.ripartenze += r.ripartenze || 0; somma(C.perche, r.perche);
    for (const [k, v] of Object.entries(r.passi || {})) if (Array.isArray(v)){ const p = voce(C.passi, k, () => [0, 0]); p[0] += v[0] || 0; p[1] += v[1] || 0; } }
  _allenamento(r){ this.altro.allenamenti++; if (r.finito) this.altro.allenamentiFiniti++; somma(this.scartati, r.scartati); }
  _minigioco(r, x){
    const m = voce(this.altro.minigiochi, r.gioco || '—', () => [0, 0]); m[0]++; if (r.finito) m[1]++; somma(this.scartati, r.scartati);
    // B36.0: una partita a Precision con i suoi colpi (scritti prima della riga del minigioco)
    if (x && x.prec.length){
      if (r.gioco === 'precision'){
        const d = this._quando(x, x.prec[0]), run = { ora: d ? d.toISOString().slice(0, 16).replace('T', ' ') : '—', postazione: x.postazione || null, dir: r.dir || 'classica', finito: !!r.finito, punti: r.punti ?? null, colpi: x.prec };
        if (this.dir.precision.length < 2000) this.dir.precision.push(run);
        // B75: nel confronto, con gli assi dell'ultima partita della postazione (la riga del minigioco non li ha)
        this._cfrPrecisione(run, r, x);
      }
      x.prec = [];
    }
  }
  _visita(r, x){ if (x) x.visitaCfr = null; const V = this.visite; V.n++; V.durata.metti(r.durS); somma(this.scartati, r.scartati); if (r.abbandono){ V.senzaGiocare++; piu(V.dove, r.abbandono); piu(this.abbandoni, `prima di giocare · ${r.abbandono}${r.come === 'chiosco' ? ' (chiosco)' : ''}`); } }
  _tel(r, x){
    const T = this.tel;
    // B46: righe con un motivo (cambio di mano o del segno del verso del telefono), contate a parte
    if (r.motivo === 'mano'){ piu(T.mano, `${r.mano === 'left' ? 'sinistra' : 'destra'} · ${r.causa || '?'}${r.ruolo === 'p2' ? ' (Player 2)' : ''}`); if (r.inPartita) T.manoInPartita++; return; }
    if (r.motivo === 'segno'){ piu(T.segno, `${r.causa || '?'} · ${r.stato === -1 ? '−1' : '+1'}${r.ruolo === 'p2' ? ' (Player 2)' : ''}`); if (r.inPartita) T.segnoInPartita++; return; }
    // B45.1: motivo della caduta e chi se n'è accorto (righe dalla 2026-11-14.4; prima della B45.1 le righe «scollegato» insieme a
    // una visita finita con il chiosco erano il chiosco che scollegava il telefono col QR)
    if (r.stato === 'caduto'){ piu(T.perche, `${r.motivo || '(senza motivo: versione di prima)'}${r.causa ? ` · ${r.causa}` : ''}${r.fonte === 'telefono' ? ' (solo dal telefono)' : ''}`); if (r.dove) piu(T.dove, r.dove); }
    if ((r.stato === 'ricollegato' || r.stato === 'collegato') && r.motivo) piu(T.ritorno, `${r.motivo}${r.causa ? ` · ${r.causa}` : ''}`);
    if (r.stato === 'collegato' || r.stato === 'ricollegato') this._b66Versioni(r, x);
    piu(T.stati, r.stato); if (r.strada) piu(T.strade, r.strada); if (r.stato === 'caduto'){ const d = this._quando(x, r); piu(T.cadutePerOra, d ? `${d.toISOString().slice(0, 10)} · ore ${String(d.getUTCHours()).padStart(2, '0')}` : 'senza ora'); } if (r.stato === 'ricollegato') T.dopoS.metti(r.dopoS); }
  _errore(r, x){ const k = `${r.msg}|${r.file}|${r.riga}`, e = this.errori.get(k) || { msg: r.msg, file: r.file, riga: r.riga, tipo: r.tipo, volte: 0, per: new Map() }; this.errori.set(k, e); e.per.set(x, Math.max(e.per.get(x) || 0, r.volte || 1)); }
  /* ---------- B66: sensori, calibrazione, precisione, collegamento, rete, blocco ---------- */
  _b66Versioni(t, x){
    if (!t) return; const V = this.b66.versioni, nuovo = (x?.formato ?? 0) >= 3;
    if (t.pv) piu(V.pagina, `${t.pv} (diversa dal PC)`); else if (nuovo) piu(V.pagina, 'come il PC');
    if (t.app) piu(V.app, `app ${t.app}`); else if (nuovo) piu(V.app, 'browser (senza app)');
  }
  _b66Partita(r, x){
    for (const t of [r.tel, r.tel2]) this._b66Versioni(t, x);
    // B71 (revisione: la modalità fiera è stand.modo, non «fiera», che è il formato della partita in fiera)
    if (Number.isFinite(r.displayLagMs)) piu(this.b66.schermo, `${N(r.displayLagMs)} ms${r.stand?.modo === 'fiera' ? ' · modalità fiera (non sommato all’anticipo)' : ''}`);
    if (r.ctrl === 'telefono' && (x?.formato ?? 0) >= 4 && (!r.versione || cfDelGioco(r.versione))){ if (Number.isFinite(r.displayLagMs)) this.b66.b71.conCampi++; else this.b66.b71.senzaCampi++; }
    x.P.b66 = { colpiN: { g: 0, a: 0 } };
  }
  _b66Colpo(r, x){
    const B = this.b66, P = x?.P; if (r.amb || !P) return;
    const k = r.chi === 'a' ? 'a' : 'g', i = P.b66 ? ++P.b66.colpiN[k] : null, g = voce(B.gesti, r.gesto || '—', () => ({ n: 0, cf: new Misura(), cfBassa: 0, mg: new Misura(), limite: 0, conMg: 0, conPl: 0, opposti: 0 }));
    g.n++;
    if (Number.isFinite(r.cf)){ if (cfDelGioco(P.r.versione)){ g.cf.metti(r.cf); if (r.cf < CF_INCERTA) g.cfBassa++; } else B.b71.cfTelefono++; }
    if (typeof r.ls === 'string') piu(B.b71.ls, r.ls);
    if (Number.isFinite(r.vc)){ B.b71.vc.n++; if (r.vc < VC_INCERTA) B.b71.vc.bassa++; }
    if (Number.isFinite(r.mg)){ g.conMg++; g.mg.metti(r.mg); if (r.mg < B66_LIMITE) g.limite++; const L = B.limite[r.mg < B66_LIMITE ? 'al limite' : 'pieni']; L.n++; L.ms.metti(Math.abs(r.ms)); if (r.e === 'debole') L.deboli++; if (r.e === 'rete' || r.e === 'fuori') L.sbagliati++; }
    if ((r.pl === 1 || r.pl === -1) && (r.lato === 1 || r.lato === -1)){ g.conPl++; if (r.pl !== r.lato) g.opposti++; }
    if (Number.isFinite(r.gb)) B.gesto.conBuco++;
    if (Number.isFinite(r.ms) && i != null){ const f = B.perOrdine[i <= 5 ? 0 : i <= 10 ? 1 : i <= 20 ? 2 : 3]; f.n++; f.ms.metti(Math.abs(r.ms)); if (perfetto(r.voto)) f.perfetti++; if (r.e === 'rete' || r.e === 'fuori') f.sbagliati++; }
    if (Array.isArray(r.rit) && r.rit.length === 2){
      const [a, ri] = r.rit, strada = (r.chi === 'a' ? P.r.tel2 : P.r.tel)?.strada || '—', S = voce(B.strade, strada, () => ({ arr: new Misura(), ris: new Misura() }));
      B.arr.metti(a); B.ris.metti(ri); S.arr.metti(a); S.ris.metti(ri);
      if (Number.isFinite(r.ms)){ const f = B.ritardoTempo[a < 60 ? 0 : a < 100 ? 1 : a < 200 ? 2 : 3]; f.n++; f.ms.metti(r.ms); if (r.ms < 0) f.ritardo++; }
    }
  }
  _b66Fine(P, r, x){
    const B = this.b66;
    if (!r) return;
    const conB66 = ['tq', 'lat', 'wifi', 'blocco', 'cal', 'pause'].some(k => r[k] != null);
    if (P.r.ctrl === 'telefono' && (x?.formato ?? 0) >= 3){ if (conB66) B.partite.conMisure++; else B.partite.senzaMisure++; }
    if (!conB66) return;
    B.partite.n++;
    const tel = k => (k === 'a' ? P.r.tel2 : P.r.tel) || {}, chi = k => `${tel(k).so || '—'} · ${tel(k).browser || '—'}`;
    for (const [k, t] of Object.entries(r.tq || {})){
      const S = B.sensori, G = voce(S.perTel, chi(k), () => ({ n: 0, hz: new Misura(), hzMin: new Misura(), buchi: new Misura(), sotto50: 0 }));
      S.n++; G.n++;
      if (Array.isArray(t.hz)){ S.hz.metti(t.hz[0]); S.hzMin.metti(t.hz[1]); G.hz.metti(t.hz[0]); G.hzMin.metti(t.hz[1]); if (t.hz[1] < 50){ S.sotto50++; G.sotto50++; } }
      if (t.fonte === 'telefono') S.soloMedia++;
      S.campioni += t.n || 0; S.buchi += t.b || 0; S.buchiPartita.metti(t.b || 0); G.buchi.metti(t.b || 0); if (t.bm) S.bucoMax.metti(t.bm); S.colpiBuco += t.bg || 0;
      if (Number.isFinite(t.iv)) piu(S.intervallo, `${N(t.iv, 1)} ms`);
      if (Array.isArray(t.sat) && (t.sat[0] || t.sat[1])){ S.saturi++; S.satAcc += t.sat[0] || 0; S.satGiro += t.sat[1] || 0; }
      if (typeof t.sr === 'string') piu(B.b71.sr, t.sr); if (typeof t.rp === 'string') piu(B.b71.rp, t.rp); if (Number.isFinite(t.lg)) B.b71.lg.metti(t.lg);
    }
    for (const [k, l] of Object.entries(r.lat || {})){
      const C = B.coll; C.n++; C.colpi += l.n || 0; C.stimati += l.stimati || 0; C.persi += l.persi || 0; C.ordine += l.ordine || 0;
      if (Number.isFinite(l.jit)) C.jit.metti(l.jit); if (Array.isArray(l.arr)) C.arrP90.metti(l.arr[1]);
      if (Array.isArray(l.vie)){ C.veloce += l.vie[0] || 0; C.affidabile += l.vie[1] || 0; }
      // (B71: «segnale non letto» quando l'app c'è ma il segnale no: l'app 1.0.4 lo butta via su Android 10 e successivi,
      // MainActivity.java; «senza app» solo quando l'app non c'è davvero)
      const w = r.wifi?.[k], rs = Array.isArray(w?.rssi) ? w.rssi[0] : null, app = !!w && (w.fx != null || w.tc != null || w.bd != null || w.mbps != null) || !!tel(k).app;
      const fascia = rs == null ? (app ? 'segnale non letto (app)' : 'senza app') : rs >= -60 ? 'da −60 dBm in su (forte)' : rs >= -70 ? 'da −70 a −61 dBm' : rs >= -80 ? 'da −80 a −71 dBm' : 'sotto −80 dBm (debole)';
      const F = voce(B.perSegnale, fascia, () => ({ n: 0, arrP90: new Misura(), persi: 0, colpi: 0, pauseS: 0 })); F.n++; F.colpi += l.n || 0; F.persi += l.persi || 0; if (Array.isArray(l.arr)) F.arrP90.metti(l.arr[1]);
      if (k === 'g') F.pauseS += Object.entries(r.pause || {}).filter(([m]) => !m.endsWith(')')).reduce((a, [, v]) => a + (v[1] || 0), 0);
    }
    for (const [m, v] of Object.entries(r.pause || {})) if (Array.isArray(v)){ const Q = voce(B.pause, m, () => [0, 0]); Q[0] += v[0] || 0; Q[1] += v[1] || 0; }
    if (r.pause) B.partiteConPausa++;
    // B71: consumo della batteria per telefono e per giorno (prima per partita: 60 s a passi dell'1 % davano quasi sempre 0)
    const d = this._quando(x, r), t1 = d ? d.getTime() : r.t;
    for (const [k, w] of Object.entries(r.wifi || {})) if (Array.isArray(w?.bt) && Number.isFinite(w.bt[0]) && Number.isFinite(w.bt[1]) && Number.isFinite(t1))
      voce(B.wifi.letture, `${P.giorno} · ${P.r.g || x?.postazione || '—'} · ${k === 'a' ? 'Player 2' : 'Player 1'}`, () => []).push({ t0: t1 - 1000*Math.max(0, +r.durS || 0), t1, b0: w.bt[0], b1: w.bt[1], ch: w.ch });
    for (const w of Object.values(r.wifi || {})){
      const W = B.wifi; W.n++;
      if (Array.isArray(w.rssi)){ W.rssi.metti(w.rssi[0]); W.rssiMin.metti(w.rssi[1]); if (w.rssi[1] < -75) W.deboli++; }
      if (w.bd != null) piu(W.bande, `${String(w.bd).replace('.', ',')} GHz`);
      if (Array.isArray(w.mbps)){ W.mbps.metti(w.mbps[0]); W.mbpsMin.metti(w.mbps[1]); }
      if (Array.isArray(w.bt) && Number.isFinite(w.bt[0]) && Number.isFinite(w.bt[1])) W.batt.metti(w.bt[1]);
      if (w.ch === 1) W.inCarica++; if (Number.isFinite(w.tc)){ W.temp.metti(w.tc); if (w.tc >= 40) W.calde++; }
      if (Number.isFinite(w.fx)){ W.conFissa++; if (w.fx >= 1) W.sempreFissa++; }
    }
    for (const b of Object.values(r.blocco || {})){
      const L = B.blocco; L.n++; L.durS.metti(b.durS || 0); L.tocchi += b.tb || 0; L.tocchiPartita.metti(b.tb || 0); L.ss += b.ss || 0; L.sp += b.sp || 0; L.sd += b.sd || 0; L.us += b.us || 0; L.sc += b.sc || 0;
      if (b.us) L.conUscite++;
    }
    for (const c of Object.values(r.cal || {})){
      const K = B.cal; K.n++; piu(K.tipo, c.tipo || '—');
      if (Number.isFinite(c.tipN)) K.tipN.metti(c.tipN); if (Number.isFinite(c.cen)) K.cen.metti(c.cen);
      if (Array.isArray(c.tip) && Number.isFinite(c.tip[0]) && Number.isFinite(c.tip[1]) && c.tip[0] > 0) K.deriva.metti(100*(c.tip[1] - c.tip[0])/c.tip[0]);
      if (Array.isArray(c.tip) && Number.isFinite(c.tip[1])) K.tipico.metti(c.tip[1]);
      if (Array.isArray(c.dvi) && Number.isFinite(c.dvi[0]) && Number.isFinite(c.dvi[1])) K.dvi.metti(Math.abs(c.dvi[1] - c.dvi[0]));
      if (c.seg) K.conSegno++; if (c.mano) K.conMano++; if (c.ric) K.conRic++;
      if (Array.isArray(c.ref) && Number.isFinite(c.ref[0]) && Number.isFinite(c.ref[1]) && c.ref[0] !== c.ref[1]) K.refCambiato++;
      if (Array.isArray(c.soglia)) piu(K.soglie, `on ${c.soglia[0]} · picco ${c.soglia[1]} °/s`);
    }
  }
  /* ---------- B75: confronto assi del giroscopio × direzione dei colpi ---------- */
  // una partita: il suo gruppo (assi · direzione) e, per chi gioca e il Player 2, il telefono. Assi «non noti» e direzione
  // «non nota» quando il Worker non ricaricato ha tolto i campi (si vede da displayLagMs e da dir che mancano nei giochi nuovi)
  _cfrPartita(r, x){
    const C = this.cfr, Pt = C.partite, f = x.formato ?? 0;
    const assi = r.stand?.assi === 'corretti' ? 'corretti' : f >= 5 && r.ctrl === 'telefono' && !Number.isFinite(r.displayLagMs) ? 'non noti' : 'oggi';
    x.assi = assi;
    // computer del P2 della sfida: fuori (le sue righe «colpo» sono la previsione locale del colpo, B73 §7.2). Revisione N1:
    // i colpi del P2 restano fuori anche dalla partita dell'host (_cfrRemoto): gli assi del suo telefono li decide il suo
    // computer (natpf_gyro_axes legge la voce di quel computer), e li scrive solo questa riga
    if (r.ruolo === 'p2'){ Pt.p2++; if (assi === 'corretti') Pt.p2Corretti++; return; }
    if (r.ctrl && r.ctrl !== 'telefono'){ Pt.senzaTelefono++; return; }
    const dir = r.dir === 'classica' || r.dir === 'nuova' ? r.dir : r.dir != null ? String(r.dir).slice(0, 20) : f >= 2 ? 'non nota' : 'classica';
    if (f >= 5) Pt.formato5++; else Pt.vecchie++;
    if (assi === 'corretti') Pt.conAssi++; else if (assi === 'non noti') Pt.assiNonNoti++;
    if (dir === 'non nota') Pt.dirNonNota++;
    const key = `${assi} · ${dir}`, G = voce(C.gruppi, key, nuovoCfrGruppo); G.partite++; piu(G.giorni, x.P.giorno);
    const L = r.modo === 'cpu' || r.modo === 'stesso-schermo' ? voce(C.livelli, `${key} · ${r.modo === 'cpu' ? r.livello || '—' : 'stesso schermo'}`, nuovoCfrLivello) : null; if (L) L.partite++;
    x.P.cfr = { key, assi, dir, L, tel: {}, dv: { g: [], a: [] }, xs: { g: [], a: [] }, primi: { g: 0, a: 0 } };
    this._cfrTel(x.P, 'g'); if (r.tel2) this._cfrTel(x.P, 'a');
    for (const c of x.cfrCal.splice(0)) this._cfrCal(c, x.P);                  // calibrazioni giocando fatte prima della partita
    for (const p of x.cfrPrec.splice(0)) this._cfrPrec(p, assi);                // Precision prima della prima partita della postazione
  }
  // il telefono di un giocatore della partita ('g' chi gioca, 'a' il Player 2): la prima volta si conta tra i telefoni
  _cfrTel(P, k){ const Q = P.cfr; if (!Q.tel[k]){ Q.tel[k] = telefonoCfr(k === 'a' ? P.r.tel2 : P.r.tel, Q.assi); voce(this.cfr.telefoni, `${Q.key} · ${Q.tel[k]}`, nuovoCfrGruppo).telefoni++; } return Q.tel[k]; }
  _cfrMisure(P, k){ const Q = P.cfr; return [this.cfr.gruppi[Q.key], voce(this.cfr.telefoni, `${Q.key} · ${this._cfrTel(P, k)}`, nuovoCfrGruppo)]; }
  // revisione N1: il Player 2 della sfida tra due computer ('a' di una partita «due-computer» dell'host) gioca con gli assi del
  // suo computer, che la riga dell'host non dice: i suoi colpi, colpi a vuoto e calibrazioni giocando si contano a parte
  _cfrRemoto(P, k, campo){ if (k !== 'a' || P.r.modo !== 'due-computer') return false; this.cfr.p2Remoti[campo]++; return true; }
  // un colpo del telefono in partita (non allenamento, minigiochi, scambi di prova)
  _cfrColpo(r, x){
    const P = x?.P, Q = P?.cfr; if (r.amb || !Q) return;
    const k = r.chi === 'a' ? 'a' : 'g';
    if (this._cfrRemoto(P, k, 'colpi')) return;
    for (const S of this._cfrMisure(P, k)) cfrColpo(S, r);
    if (Number.isFinite(r.dv) && Q.dv[k].length < 20) Q.dv[k].push(r.dv);
    if (Number.isFinite(r.pf) && Q.primi[k] < 10){ Q.primi[k]++; const pieno = Math.abs(r.pf) >= CIMA_GIRATA; for (const S of this._cfrMisure(P, k)){ S.primi++; if (pieno) S.primi05++; } }
    if (Number.isFinite(r.rx)){
      const xr = (k === 'a' ? -1 : 1)*r.rx; Q.xs[k].push(xr);
      const L = Q.L; if (L){ L.conRimbalzo++; if (Math.abs(xr) > 2.5) L.largo++; if (Number.isFinite(r.tu) && Math.abs(r.tu) <= 1){ L.nellaFinestra++; if (r.fu) L.fuoriFinestra++; } }
    }
  }
  _cfrVuoto(r, x){ const P = x?.P, k = r.chi === 'a' ? 'a' : 'g'; if (r.amb || !P?.cfr || this._cfrRemoto(P, k, 'vuoti')) return; for (const S of this._cfrMisure(P, k)) S.vuoti++; }
  // contro l'avversario (CPU): punti vinti da chi gioca
  _cfrPunto(r, x){ const L = x?.P?.cfr?.L; if (!L || x.P.r.modo !== 'cpu') return; L.punti++; if (r.vince === 'g') L.vinti++; }
  _cfrFine(P, r){
    const Q = P.cfr; if (!Q) return;
    const G = this.cfr.gruppi[Q.key];
    if (r?.esito === 'finita'){ G.finite++; if (Number.isFinite(r.durS)) G.durata.metti(r.durS); if (Q.L){ Q.L.finite++; Q.L.durata.metti(r.durS); Q.L.puntiFinite += P.punti || 0; if (P.r.modo === 'cpu' && r.vince === 'g') Q.L.vinte++; } }
    for (const k of ['g', 'a']){
      if (!Q.tel[k]) continue;
      const S = this._cfrMisure(P, k);
      // centro della mira per partita (come la sezione «Direzione»: |mediana dello scarto| nei primi 20 colpi, almeno 10)
      if (Q.dv[k].length >= 10){ const m = Math.abs(mediana(Q.dv[k])); for (const s of S) s.seme.metti(m); }
      // partita storta (E5): almeno il 70 % dei colpi in una metà, come la diagnostica
      if (Q.xs[k].length >= SIDE.min){ const storta = sideJudge(Q.xs[k]).verdetto === 'sbilanciata'; for (const s of S){ s.giudicate++; if (storta) s.storte++; } }
    }
  }
  // calibrazione giocando: della partita in corso (in fiera gli scambi di prova sono dentro la partita) o, se arriva prima,
  // della partita dopo sulla stessa postazione
  _cfrCalibrazione(r, x){ if (!x) return; if (x.P){ if (x.P.cfr) this._cfrCal(r, x.P); return; } if (x.cfrCal.length < 4) x.cfrCal.push(r); else this.cfr.calSenzaPartita++; }
  _cfrCal(r, P){ const k = r.chi === 'a' ? 'a' : 'g'; if (this._cfrRemoto(P, k, 'cal')) return; const liv = livelloCal(r); for (const S of this._cfrMisure(P, k)) piu(S.cal, liv); }
  // una partita a Precision: assi dell'ultima partita della postazione (o della prima dopo), direzione della riga del minigioco
  _cfrPrecisione(run, r, x){
    run.dirCfr = r.dir === 'classica' || r.dir === 'nuova' ? r.dir : r.dir != null ? String(r.dir).slice(0, 20) : (x.formato ?? 0) >= 2 ? 'non nota' : 'classica';
    // (revisione U2: la visita della partita a Precision, un numero e basta: le partite della stessa visita sono della stessa
    // persona o compagnia; una visita finisce con la riga «visita» o con un avvio del gioco)
    if (x.visitaCfr == null) x.visitaCfr = ++this.cfr.nVisite; run.visitaCfr = x.visitaCfr;
    if (x.assi) this._cfrPrec(run, x.assi); else if (x.cfrPrec.length < 40) x.cfrPrec.push(run); else this._cfrPrec(run, 'non noti');
  }
  _cfrPrec(run, assi){
    const p = precisionRiga(run), S = voce(this.cfr.precision, `${assi} · ${run.dirCfr}`, () => ({ partite: 0, palle: 0, rimbalzi: 0, punti: new Misura(), puntiVeri: new Misura(), cima: 0, nCima: 0, distanza: 0, nellaZona: 0, visite: new Set() }));
    S.partite++; if (run.visitaCfr != null) S.visite.add(run.visitaCfr); S.palle += p.palle; S.rimbalzi += p.rimbalzi; if (run.punti != null) S.punti.metti(run.punti); S.puntiVeri.metti(p.punti);
    if (p.cima != null){ S.cima += Math.round(p.cima*p.nCima); S.nCima += p.nCima; }
    if (p.distanza != null) S.distanza += p.distanza*p.rimbalzi;
    for (const c of run.colpi){ const z = PRECISION_ZONES[c.zp]; if (z && Number.isFinite(c.rx) && Number.isFinite(c.rz) && Math.hypot(c.rx - z.x, c.rz - z.z) <= z.r) S.nellaZona++; }
  }
  // fine della lettura: calibrazioni senza una partita dopo, Precision senza nessuna partita della postazione
  _cfrChiudi(){ for (const x of this.ctx.values()){ this.cfr.calSenzaPartita += x.cfrCal.length; x.cfrCal = []; this.cfr.precisionSenzaPartita += x.cfrPrec.length; for (const p of x.cfrPrec) this._cfrPrec(p, 'non noti'); x.cfrPrec = []; } }
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
    // revisione del B73: le partite del computer del P2 della sfida non entrano nei gruppi: i colpi del P2 li scrive già il
    // registro dell'host (chi 'a', con la direzione dell'host), qui sarebbero contati due volte
    if (P.r.ruolo === 'p2') return;
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
    if (P.r.ruolo === 'p2'){ this.dir.partiteP2++; return; }                // (come in _direzione: le ha già l'host)
    const G = this._dirGruppo(P.r.dir || 'classica', this._chiave(P));
    G.partite++; if (r?.esito === 'finita' && Number.isFinite(r.durS)) G.durata.metti(r.durS);
    for (const M of Object.values(P.dir)){
      if (M.xs.length >= SIDE.min){ G.giudicate++; if (sideJudge(M.xs).verdetto === 'sbilanciata') G.storte++; }
      if (M.dv.length >= 10){ const s = [...M.dv].sort((a, b) => a - b), k = s.length >> 1; G.seme.metti(Math.abs(s.length % 2 ? s[k] : (s[k - 1] + s[k])/2)); }
    }
  }
  // fine della lettura: le partite rimaste aperte (registro tronco) si chiudono come «senza fine»
  fine(){ for (const x of this.ctx.values()){ if (x.P) this._chiudi(x, null); if (x.prec.length){ this.dir.precisionSenzaFine++; x.prec = []; } } for (const e of this.errori.values()) e.volte = [...e.per.values()].reduce((a, b) => a + b, 0); this._b66Batterie(); this._cfrChiudi(); return this; }
  // B71: consumo della batteria per telefono e per giorno. Le letture (inizio e fine di ogni partita) in ordine di tempo; fra
  // due letture di fila: se la batteria sale di più di un punto è una ricarica (il tratto non conta), se sale di un punto è
  // il rumore della lettura (non conta), se a fine tratto il telefono era in carica non conta; altrimenti punti scesi e ore.
  // Consumo = punti scesi / ore, con almeno BATTERIA_MIN_ORE ore in tutto
  _b66Batterie(){
    const W = this.b66.wifi; W.consumo = new Misura(); W.batterie = [];
    for (const [chi, L] of Object.entries(W.letture).sort()){
      const o = [...L].sort((a, b) => a.t0 - b.t0), pt = o.flatMap(p => [{ t: p.t0, b: p.b0, ch: null }, { t: p.t1, b: p.b1, ch: p.ch }]);
      let giu = 0, ms = 0, ricariche = 0;
      for (let i = 1; i < pt.length; i++){
        const a = pt[i - 1], b = pt[i], dt = b.t - a.t;
        if (!(dt > 0)) continue;
        if (b.b > a.b + 1){ ricariche++; continue; }
        if (b.b > a.b || b.ch === 1) continue;
        giu += a.b - b.b; ms += dt;
      }
      const ore = ms/3600000, consumo = ore >= BATTERIA_MIN_ORE ? giu/ore : null;
      if (consumo != null) W.consumo.metti(consumo);
      W.batterie.push({ chi, partite: o.length, da: o[0].b0, a: o[o.length - 1].b1, ore, consumo, ricariche });
    }
    return W.batterie;
  }
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
  sezioneConfronto(R, sez);
  sez('Servizio', [
    `Punti: ${N(sv.punti)}. Lanci: ${N(sv.lanci)} (${N(sv.punti ? sv.lanci/sv.punti : null, 2)} a punto); lanci a vuoto: ${N(sv.lanciVuoti)} (${pc(sv.lanciVuoti, sv.lanci, 1)} dei lanci).`,
    `Servizio in rete o fuori (una palla sola: vale come un doppio fallo): ${N(sv.doppiFalli)} (${pc(sv.doppiFalli, sv.punti, 1)} dei punti). Ace: ${N(sv.ace)} (${pc(sv.ace, sv.punti, 1)}).`,
    `Lancio automatico: ${N(sv.lanciAuto)} lanci fatti dal gioco, ${N(sv.battutaAuto)} battute fatte dal gioco.`,
    `Servizi di chi gioca senza il tempo del gesto (mouse, tastiera, webcam del Player 2): ${N(sv.senzaGesto || 0)}.`,
    `Servizi di chi gioca: ${N(sv.righe)}; velocità ${mis(sv.kmh, 0, ' km/h')} (km/h veri della palla: le versioni fino alla ${KMH_VECCHI_FINO_A} li scrivevano × 1,89 e qui sono già riportati); errore di tempo medio ${N(sv.ms.media)} ms.`,
  ], [{ titolo: 'Voto del servizio', colonne: ['Voto', 'Volte', 'Quota'], righe: elenco(sv.voti, sv.righe) }]);
  const ve = R.velocita;
  sez('Velocità dei colpi (B60, trofeo Razzo)', ve.colpi.n ? [
    `Colpi in partita con i km/h: ${N(ve.colpi.n)}; velocità ${mis(ve.colpi, 0, ' km/h')}.`,
    `Colpo più forte di ogni giocatore in ogni partita (colpi e servizi; ${N(ve.conColpi)} partite): ${mis(ve.maxPartita, 0, ' km/h')}; 1 su 4 sopra ${N(ve.maxPartita.p(.75), 0)} km/h. Per le soglie del Razzo (bronzo, argento, oro) si guardano la metà, i tre quarti e i 9 su 10.`,
  ] : ['Nessun colpo con i km/h: il registro è di una versione prima della 2026-11-17.1 (i km/h dei colpi in partita ci sono da allora).']);
  const pa = R.parte, paN = pa.g.n + pa.a.n;
  sez('Dritto e rovescio dalla parte della palla (17/11)', paN ? [
    `Colpi in partita con la palla di lato (oltre 0,3 m dal corpo): ${N(paN)}; giocati dalla parte opposta alla palla (rovescio con la palla a destra di un destro, dritto con la palla a sinistra): ${N(pa.g.opposti + pa.a.opposti)} (${pc(pa.g.opposti + pa.a.opposti, paN, 1)}).`,
    `Chi gioca qui (Player 1 o contro la CPU): ${N(pa.g.opposti)} su ${N(pa.g.n)} (${pc(pa.g.opposti, pa.g.n, 1)}); Player 2 dello stesso schermo o del computer: ${N(pa.a.opposti)} su ${N(pa.a.n)} (${pc(pa.a.opposti, pa.a.n, 1)}).`,
    `Partite con almeno 3 colpi di fila dalla parte opposta dello stesso giocatore (verso del telefono girato, più che un colpo voluto): ${N(pa.conSerie)} su ${N(pa.partite)}. Da guardare insieme alle tabelle «Mano cambiata» e «Segno del verso del telefono cambiato».`,
  ] : ['Nessun colpo con il lato della palla: il registro è di una versione prima della 2026-11-17.2.']);
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
    // B45.1 «telefono che non si scollega»: perché cade (visto dal computer), dove si era, motivo chiarito dal telefono al ritorno
    { titolo: 'Perché cadono (motivo · chi se n\'è accorto)', colonne: ['Motivo', 'Cadute'], righe: elenco(te.perche) },
    { titolo: 'Dove si era alla caduta', colonne: ['Posto', 'Cadute'], righe: elenco(te.dove) },
    { titolo: 'Motivo chiarito al ritorno (racconto del telefono)', colonne: ['Motivo', 'Volte'], righe: elenco(te.ritorno) },
    { titolo: 'Telefoni (a grandi linee)', colonne: ['Sistema', 'Volte'], righe: elenco(te.so) },
    { titolo: 'Browser del telefono', colonne: ['Browser', 'Volte'], righe: elenco(te.browser) },
    // B46 «dritto e rovescio al sicuro»: perché dritto e rovescio possono uscire scambiati (mano sinistra, segno girato)
    { titolo: `Mano cambiata (in partita: ${N(te.manoInPartita)})`, colonne: ['Mano · da chi', 'Volte'], righe: elenco(te.mano) },
    { titolo: `Segno del verso del telefono cambiato (in partita: ${N(te.segnoInPartita)})`, colonne: ['Causa · segno nuovo', 'Volte'], righe: elenco(te.segno) },
  ]);
  sezioniB66(R, sez);
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
// B66 · sei sezioni (docs/b66/registro-sensori.md): sensori del telefono, stabilità della calibrazione, precisione dei
// gesti, distribuzione del ritardo, rete del telefono dall'app, telefono bloccato. Senza le misure (registri prima della
// 2026-11-18.1, o Worker non ricaricato) le sezioni lo dicono in una riga
// B71 (revisione): da dove viene il lato dei colpi in partita e quanti hanno il verso incerto
function lsTesto(T){
  const tot = Object.values(T.ls).reduce((a, v) => a + v, 0);
  if (!tot && !T.vc.n) return '';
  const nome = { g: 'dal gesto', a: 'dal verso atteso dalla palla', p: 'dalla posizione della palla' };
  return `Lato dei colpi (B71): ${['g', 'a', 'p'].filter(k => T.ls[k]).map(k => `${nome[k]} ${N(T.ls[k])} (${pc(T.ls[k], tot, 1)})`).join(' · ') || '—'}${T.vc.n ? `; verso del gesto incerto (confidenza sotto ${N(VC_INCERTA, 2)}): ${N(T.vc.bassa)} su ${N(T.vc.n)} (${pc(T.vc.bassa, T.vc.n, 1)})` : ''}.`;
}
export function sezioniB66(R, sez){
  const B = R.b66, Pt = B.partite;
  const avviso = [Pt.senzaMisure ? `ATTENZIONE: ${N(Pt.senzaMisure)} partite con il telefono di un gioco nuovo (formato 3 o più) senza le misure del B66: il Worker del registro non è stato ricaricato (docs/b66/registro-sensori.md, «Ricaricare il Worker»).` : '',
    // B71 (revisione): stessa rete di sicurezza per i campi del B71 (verso del gesto, ritardo dello schermo, sensori dell'app).
    // B74 (revisione, S2): si contano i giochi con formato 4 o più e la pagina del Worker da caricare dice il formato di
    // adesso (REGISTRO.versione, uguale al FORMATO del Worker: registro-worker.test.mjs), non più un «4» fisso
    B.b71.senzaCampi ? `ATTENZIONE: ${N(B.b71.senzaCampi)} partite con il telefono di un gioco con formato 4 o più senza displayLagMs: il Worker del registro non è stato ricaricato e ha tolto i campi del B71 e, dal formato 5, il campo \`assi\` del B74 (docs/GUIDA_REGISTRO_CLOUDFLARE.md §I: dopo il Deploy la pagina del Worker dice «Formato delle righe: ${REGISTRO.versione}»).` : ''].filter(Boolean).join(' ');
  const T71 = B.b71, srTesto = Object.keys(T71.sr).length ? `Sensori in partita (B71, app NATPF Racchetta 1.0.5): ${elenco(T71.sr).map(([k, v]) => `${{ n: 'app', b: 'browser', nb: 'app e browser' }[k] || k} ${v}`).join(' · ')}${Object.keys(T71.rp).length ? `; ritorni al browser per motivo (g gravità, r rotazione, f sensori dell'app fermi, p ponte): ${elenco(T71.rp).map(([k, v]) => `${k} ${v}`).join(' · ')}` : ''}${T71.lg.n ? `; ritardo dei campioni del browser su quelli dell'app (prova all'avvio) ${mis(T71.lg, 0, ' ms')}` : ''}.` : '';
  const vuoto = 'Nessuna partita con le misure del B66: il registro è di una versione prima della 2026-11-18.1' + (Pt.senzaMisure ? ' o il Worker non è stato ricaricato.' : '.');
  const S = B.sensori, totColpiTel = B.coll.colpi;
  // B74: l'interruttore dello staff «Assi del giroscopio» (docs/b74/assi-giroscopio.md), solo se è stato acceso
  const AX = R.assi, assiTesto = AX?.partite ? `Assi del giroscopio «Corretti (prova)» (B74): ${N(AX.partite)} partite; telefoni: ${elenco(AX.tel).map(([k, v]) => `${k} ${v}`).join(' · ') || 'nessuno'}.` : '';
  sez('Sensori del telefono', S.n ? [
    avviso, assiTesto,
    `Telefoni in partita con le misure: ${N(S.n)}. Frequenza vera dei sensori (campioni contati sul telefono): mediana di ogni partita ${mis(S.hz, 1, ' Hz')}; la più bassa di ogni partita ${mis(S.hzMin, 1, ' Hz')}. Partite con un tratto sotto 50 Hz: ${N(S.sotto50)} (${pc(S.sotto50, S.n, 1)}).${S.soloMedia ? ` Di ${N(S.soloMedia)} telefoni (pagina di prima) solo la frequenza dichiarata dal telefono (media mobile).` : ''}`,
    `Buchi nei campioni (intervallo oltre 2 volte il periodo del telefono): ${N(S.buchi)} su ${N(S.campioni)} campioni; a partita ${mis(S.buchiPartita, 1)}; il più lungo di ogni partita ${mis(S.bucoMax, 0, ' ms')}.`,
    `Colpi con un buco nei campioni durante il gesto: ${N(S.colpiBuco)} su ${N(totColpiTel)} colpi arrivati (${pc(S.colpiBuco, totColpiTel, 1)}); righe «colpo» con il buco: ${N(B.gesto.conBuco)}.`,
    `Saturazione (lo stesso valore grande ripetuto: il sensore arriva al suo massimo): partite con campioni saturi ${N(S.saturi)} (${pc(S.saturi, S.n, 1)}); campioni saturi dell'accelerazione ${N(S.satAcc)}, della rotazione ${N(S.satGiro)}.`,
    srTesto,
  ] : [avviso, vuoto, assiTesto], S.n ? [
    { titolo: 'Per telefono e browser (dalla riga della partita)', colonne: ['Telefono · browser', 'Partite', 'Frequenza (mediana, Hz)', 'La più bassa (metà sotto, Hz)', 'Sotto 50 Hz', 'Buchi a partita'],
      righe: Object.entries(S.perTel).sort((a, b) => b[1].n - a[1].n).slice(0, 15).map(([k, G]) => [k, N(G.n), N(G.hz.p(.5), 1), N(G.hzMin.p(.5), 1), pc(G.sotto50, G.n), N(G.buchi.media, 1)]) },
    { titolo: 'Intervallo dei sensori dichiarato dal browser', colonne: ['Intervallo', 'Telefoni'], righe: elenco(S.intervallo) },
    { titolo: 'Versione della pagina del telefono (rispetto a quella del PC)', colonne: ['Pagina', 'Collegamenti e partite'], righe: elenco(B.versioni.pagina) },
    { titolo: 'App NATPF Racchetta', colonne: ['App', 'Collegamenti e partite'], righe: elenco(B.versioni.app) },
  ] : []);
  const K = B.cal, ord = ['colpi 1–5', 'colpi 6–10', 'colpi 11–20', 'dal 21°'];
  sez('Calibrazione: stabilità', [
    K.n ? `Telefoni in partita con le misure: ${N(K.n)}. Colpi prima che il colpo tipico sia quello imparato giocando (prima vale la calibrazione): ${mis(K.tipN, 1)}; colpi prima del centro della mira: ${mis(K.cen, 1)}.` : vuoto,
    K.n ? `Quanto cambia il colpo tipico in una partita (fine rispetto all'inizio): ${mis(K.deriva, 0, '%')}; colpo tipico a fine partita ${mis(K.tipico, 0, ' °/s')}. Scarto della cima, mediana dei primi 10 colpi contro gli ultimi 10: differenza ${mis(K.dvi, 1, '°')}.` : '',
    K.n ? `In partita: segno del verso cambiato in ${N(K.conSegno)} (${pc(K.conSegno, K.n, 1)}), mano cambiata in ${N(K.conMano)}, calibrazione rifatta in ${N(K.conRic)} (${pc(K.conRic, K.n, 1)}), riferimento della calibrazione cambiato in ${N(K.refCambiato)}. Il perché di ogni cambio di segno è nella sezione «Collegamento del telefono»; gesti di calibrazione ripetuti e perché in «Tutorial e calibrazione».` : '',
    'Errore di tempo per numero di colpo nella partita (tutti i registri: misura già presente, qui per vedere quanti colpi servono prima che i colpi diventino stabili).',
  ], [
    { titolo: 'Profilo del telefono in partita', colonne: ['Profilo', 'Telefoni', 'Quota'], righe: elenco(K.tipo, K.n) },
    { titolo: 'Soglie del profilo (inizio del gesto · picco minimo)', colonne: ['Soglie', 'Telefoni'], righe: elenco(K.soglie, null, 8) },
    { titolo: 'Errore di tempo per numero di colpo nella partita', colonne: ['Colpi', 'Quanti', '|Errore| (metà entro, ms)', '|Errore| (9 su 10 entro, ms)', 'Perfetti', 'Rete o fuori'],
      righe: B.perOrdine.map((f, i) => (f.n ? [ord[i], N(f.n), N(f.ms.p(.5)), N(f.ms.p(.9)), pc(f.perfetti, f.n, 1), pc(f.sbagliati, f.n, 1)] : null)).filter(Boolean) },
  ]);
  const gesti = Object.entries(B.gesti).filter(([, g]) => g.cf.n || g.conMg || g.conPl).sort((a, b) => b[1].n - a[1].n), L = B.limite;
  sez('Precisione dei gesti', gesti.length ? [
    `Per tipo di colpo (colpi del telefono in partita): confidenza del tipo di colpo (0–1, del gioco: margine dalla soglia più vicina, 0,5 il colpo normale; sotto ${N(CF_INCERTA, 1)} il colpo è vicino al confine con un altro tipo; fino alla 2026-11-18.3 era quella del telefono, sempre 0,45 in fiera), margine del picco sulla soglia (sotto ${N(B66_LIMITE, 1)} = colpo «al limite», quasi scartato), colpi giocati dalla parte opposta alla palla (dritto con la palla a sinistra di un destro e viceversa: dritto e rovescio probabilmente scambiati).`,
    L['al limite'].n + L.pieni.n ? `Colpi al limite: ${N(L['al limite'].n)} su ${N(L['al limite'].n + L.pieni.n)} (${pc(L['al limite'].n, L['al limite'].n + L.pieni.n, 1)}).` : '',
    T71.cfTelefono ? `Colpi con la confidenza del telefono (registri fino alla ${CF_TELEFONO_FINO_A}): ${N(T71.cfTelefono)}, fuori dalla colonna della confidenza.` : '',
    lsTesto(T71),
  ] : [vuoto], [
    { titolo: 'Per tipo di colpo', colonne: ['Gesto', 'Colpi', 'Confidenza (media)', `Confidenza sotto ${N(CF_INCERTA, 1)}`, 'Margine (mediana)', 'Al limite', 'Dalla parte opposta alla palla'],
      righe: gesti.map(([k, g]) => [k, N(g.n), N(g.cf.media, 2), pc(g.cfBassa, g.cf.n, 1), N(g.mg.p(.5), 2), pc(g.limite, g.conMg, 1), g.conPl ? `${pc(g.opposti, g.conPl, 1)} (${N(g.conPl)})` : '—']) },
    { titolo: 'Colpi al limite contro colpi pieni', colonne: ['', 'Colpi', '|Errore di tempo| (metà entro, ms)', 'Deboli', 'Rete o fuori'],
      righe: Object.entries(L).filter(([, v]) => v.n).map(([k, v]) => [k, N(v.n), N(v.ms.p(.5)), pc(v.deboli, v.n, 1), pc(v.sbagliati, v.n, 1)]) },
  ]);
  const C = B.coll, fasce = ['sotto 60 ms', '60–99 ms', '100–199 ms', 'da 200 ms'], pauseTot = Object.values(B.pause).reduce((a, v) => a + v[0], 0);
  const tre = m => (m.n ? `${N(m.p(.5))} · ${N(m.p(.9))} · ${N(m.p(.99))} ms` : '—');
  sez('Collegamento: distribuzione', C.n || B.arr.n ? [
    `Dal picco del gesto all'arrivo sul PC (orologi allineati; comprende il riconoscimento sul telefono), metà · 9 su 10 · 99 su 100: ${tre(B.arr)}. Dal picco alla risposta del gioco (il motore gioca il colpo; se il colpo arriva prima della palla comprende l'attesa della palla): ${tre(B.ris)}.`,
    `Sbalzo del ritardo da un colpo al successivo (media di ogni partita): ${mis(C.jit, 0, ' ms')}; il 9 su 10 dell'arrivo di ogni partita: ${mis(C.arrP90, 0, ' ms')}.`,
    `Colpi arrivati: ${N(C.colpi)}; persi (numero mancante, nessuna delle quattro copie arrivata) ${N(C.persi)} (${pc(C.persi, C.colpi + C.persi, 2)}); fuori ordine ${N(C.ordine)}; senza orologi allineati (ritardo non misurato) ${N(C.stimati)}. Prima copia arrivata dalla strada veloce: ${pc(C.veloce, C.veloce + C.affidabile, 1)}.`,
    `Pause della partita per il telefono: ${N(pauseTot)} in ${N(B.partiteConPausa)} partite (${pc(B.partiteConPausa, Pt.n, 1)} delle partite con le misure).`,
    Object.keys(B.schermo).length ? `Ritardo dello schermo salvato (prova del B50; dalla versione dopo la 2026-11-18.3): ${Object.entries(B.schermo).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} in ${N(v)} partite`).join('; ')}. In fiera non si somma alla correzione dell’anticipo (B71).` : '',
  ] : [avviso, vuoto], [
    { titolo: 'Per strada del collegamento (righe «colpo»)', colonne: ['Strada', 'Colpi', 'Arrivo: metà · 9 su 10 · 99 su 100', 'Risposta: metà · 9 su 10 · 99 su 100'], righe: Object.entries(B.strade).map(([k, v]) => [k, N(v.arr.n), tre(v.arr), tre(v.ris)]) },
    { titolo: 'Ritardo e tempo del colpo', colonne: ['Arrivo dal picco', 'Colpi', 'Errore di tempo medio (ms, + anticipo)', 'In ritardo'], righe: B.ritardoTempo.map((f, i) => (f.n ? [fasce[i], N(f.n), N(f.ms.media), pc(f.ritardo, f.n, 1)] : null)).filter(Boolean) },
    { titolo: 'Pause per il telefono («(2)»: Player 2 dello stesso schermo; fino alla 2026-11-18.3 le volte del Player 2 erano una al secondo, i secondi sono giusti)', colonne: ['Motivo', 'Volte', 'Secondi in tutto', 'Secondi a pausa'], righe: Object.entries(B.pause).sort((a, b) => b[1][0] - a[1][0]).map(([k, v]) => [k, N(v[0]), N(v[1], 1), N(v[0] ? v[1]/v[0] : null, 1)]) },
  ]);
  const W = B.wifi;
  sez('Rete del telefono (app)', W.n ? [
    `Telefoni in partita con l'app NATPF Racchetta (o la batteria dal browser): ${N(W.n)}. Segnale Wi-Fi, mediana di ogni partita ${mis(W.rssi, 0, ' dBm')}; il più basso di ogni partita ${mis(W.rssiMin, 0, ' dBm')}; partite con il segnale sotto −75 dBm: ${N(W.deboli)} (${pc(W.deboli, W.n, 1)}).`,
    `Velocità del collegamento Wi-Fi: ${mis(W.mbps, 0, ' Mbps')}; la più bassa di ogni partita ${mis(W.mbpsMin, 0, ' Mbps')}.`,
    `Batteria a fine partita ${mis(W.batt, 0, '%')}; in carica a fine partita ${N(W.inCarica)} (${pc(W.inCarica, W.n, 1)}). Temperatura della batteria (la più alta di ogni partita) ${mis(W.temp, 1, ' °C')}; da 40 °C: ${N(W.calde)}.`,
    `Consumo della batteria per telefono e per giorno (tratti senza ricarica, almeno ${N(BATTERIA_MIN_ORE, 1)} ore; una partita sola dura un minuto e la batteria si legge a passi dell’1 %): ${mis(W.consumo, 1, ' punti % all’ora')}.`,
    `«Fissa app» attiva per tutta la partita: ${N(W.sempreFissa)} su ${N(W.conFissa)} (${pc(W.sempreFissa, W.conFissa, 1)}).`,
    'Del telefono si registrano solo numeri: mai il nome della rete, indirizzi o identificativi.',
  ] : [vuoto + ' Le misure della rete ci sono solo con l’app NATPF Racchetta 1.0.4 o successiva.'], [
    { titolo: 'Banda della Wi-Fi', colonne: ['Banda', 'Telefoni', 'Quota'], righe: elenco(W.bande, W.n) },
    { titolo: 'Batteria per telefono e per giorno', colonne: ['Giorno · postazione · giocatore', 'Partite', 'Batteria (prima → ultima)', 'Ore senza ricarica', 'Consumo (punti % all’ora)', 'Ricariche viste'],
      righe: W.batterie.map(b => [b.chi, N(b.partite), `${N(b.da)} → ${N(b.a)}%`, N(b.ore, 1), N(b.consumo, 1), N(b.ricariche)]) },
    { titolo: 'Segnale e collegamento', colonne: ['Segnale (mediana della partita)', 'Telefoni', 'Arrivo 9 su 10 (mediana, ms)', 'Colpi persi', 'Secondi di pausa (Player 1)'],
      righe: Object.entries(B.perSegnale).sort().map(([k, F]) => [k, N(F.n), N(F.arrP90.p(.5)), `${N(F.persi)} su ${N(F.colpi + F.persi)}`, N(F.pauseS, 1)]) },
  ]);
  const Lb = B.blocco;
  sez('Telefono bloccato', Lb.n ? [
    `Telefoni bloccati in partita (B51): ${N(Lb.n)}; tempo bloccato ${mis(Lb.durS, 0, ' s')}. Tocchi fermati dal blocco: ${N(Lb.tocchi)} (a partita ${mis(Lb.tocchiPartita, 1)}).`,
    `Sblocchi: dallo staff sul telefono (due dita 3 s) ${N(Lb.ss)}, dal PC ${N(Lb.sp)}, finiti da soli (fine del gioco, avviso o velo da toccare) ${N(Lb.sd)}.`,
    `Pagina del telefono nascosta durante il blocco (schermo spento o un'altra app): ${N(Lb.us)} volte in ${N(Lb.conUscite)} partite; schermi spenti (dall'app): ${N(Lb.sc)}.`,
  ] : [vuoto]);
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
    P.senzaCampi ? `ATTENZIONE: ${N(P.senzaCampi)} partite di un gioco con il formato delle righe 2 o più senza i campi della direzione: il Worker del registro non è stato ricaricato e li ha tolti (docs/b36/misure-b36-0.md, «Ricaricare il Worker»).` : '',
    'Cima: scarto in gradi dal proprio colpo abituale (+ a destra). Tempo: unità della finestra (+ anticipo). Rimbalzo: dove la palla tocca terra davvero, nel riferimento di chi colpisce (+ alla sua destra). Gruppi: modello della direzione · chi gioca · livello.',
    D.partiteP2 ? `Partite del computer del Player 2 nelle sfide tra due computer: ${N(D.partiteP2)}, fuori dai gruppi (i colpi del Player 2 sono già nella partita dell'host, con la sua direzione).` : '',
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
// B75 · sezione «Confronto: assi del giroscopio × direzione dei colpi» (docs/b75/confronto-registro.md): i quattro gruppi
// (assi oggi/corretti × direzione classica/nuova) uno accanto all'altro, sempre tutti e quattro (anche vuoti), poi gli
// eventuali gruppi con i campi tolti dal Worker; con «corretti» anche per telefono (Android riordinato, iPhone come oggi)
export function sezioneConfronto(R, sez){
  const C = R.cfr, Pt = C.partite, P2r = C.p2Remoti, D = CONFRONTO_DETTAGLIO, vuoto = nuovoCfrGruppo();
  const extra = Object.keys(C.gruppi).filter(k => !CONFRONTO_GRUPPI.includes(k)).sort(), chiavi = [...CONFRONTO_GRUPPI, ...extra], G = k => C.gruppi[k] || vuoto;
  const pochi = g => g.partite < CONFRONTO_MIN.partite || g.colpi < CONFRONTO_MIN.colpi;
  // (revisione U1: da 20 a 99 partite i dati bastano solo per differenze grandi)
  const grandi = g => g.partite && !pochi(g) && g.partite < CONFRONTO_FINE.partite;
  const avviso = g => (!g.partite ? 'nessuna partita' : pochi(g) ? `pochi dati (servono ${CONFRONTO_MIN.partite} partite e ${CONFRONTO_MIN.colpi} colpi)` : grandi(g) ? `bastano solo per differenze di 10 punti o più (per 2–5 punti servono ${CONFRONTO_FINE.partite} partite)` : '—');
  const corr = v => (v == null ? '—' : N(v, 2)), pcq = (a, b) => (b ? pc(a, b, 1) : '—');
  const tot = o => Object.values(o).reduce((a, v) => a + v, 0);
  const pochiElenco = chiavi.filter(k => G(k).partite && pochi(G(k))).map(k => `${k} (${N(G(k).partite)} partite, ${N(G(k).colpi)} colpi)`);
  const grandiElenco = chiavi.filter(k => grandi(G(k))).map(k => `${k} (${N(G(k).partite)} partite)`);
  const vuoti = CONFRONTO_GRUPPI.filter(k => !G(k).partite);
  // (revisione U5: giorni delle partite di ogni gruppo; più di uno = giornate mescolate)
  const giorni = {}; for (const k of chiavi) somma(giorni, G(k).giorni);
  const elencoGiorni = o => Object.keys(o).sort().map(d => `${d} (${N(o[d])})`).join(' · ') || '—';
  // (revisione U2: avvisi delle tabelle di dettaglio)
  const pocheVoci = (n, min, cosa) => (n < min ? `pochi dati (servono ${N(min)} ${cosa})` : '—');
  const avvisoCal = n => { if (n < D.giocatori) return `pochi dati (servono ${N(D.giocatori)} giocatori)`; const d = Math.ceil(100*Math.sqrt(2/n) - 1e-9); return d <= D.puntiCal ? '—' : `conta solo una differenza di ${N(d)} punti o più`; };
  const avvisoPrec = p => (p.palle < D.palle || p.visite.size < D.visite ? `pochi dati (servono ${N(D.palle)} palle di almeno ${N(D.visite)} visite)` : '—');
  // (revisione U3: per livello, in ordine di gruppo; con due livelli o più contro l'avversario anche tutti insieme)
  const TUTTI = 'tutti i livelli contro l’avversario';
  const livRiga = (k, L, cpu, dur) => [k, N(L.partite), N(L.finite), cpu ? pcq(L.vinte, L.finite) : '—', cpu ? pcq(L.vinti, L.punti) : '—', pcq(L.largo, L.conRimbalzo), pcq(L.fuoriFinestra, L.nellaFinestra),
    dur.n ? `${N(dur.somma/dur.n)} s` : '—', L.finite ? N(L.puntiFinite/L.finite, 1) : '—', pocheVoci(L.partite, D.partiteLivello, 'partite')];
  const livRighe = chiavi.flatMap(k => {
    const mie = Object.keys(C.livelli).filter(x => x.startsWith(`${k} · `)).sort(), ss = x => x.endsWith(' · stesso schermo'), cpu = mie.filter(x => !ss(x));
    const righe = cpu.map(x => livRiga(x, C.livelli[x], true, C.livelli[x].durata));
    if (cpu.length >= 2){
      const T = nuovoCfrLivello(), dur = { n: 0, somma: 0 };
      for (const x of cpu){ const L = C.livelli[x]; for (const c of Object.keys(T)) if (typeof T[c] === 'number') T[c] += L[c]; dur.n += L.durata.n; dur.somma += L.durata.somma; }
      righe.push(livRiga(`${k} · ${TUTTI}`, T, true, dur));
    }
    return righe.concat(mie.filter(ss).map(x => livRiga(x, C.livelli[x], false, C.livelli[x].durata)));
  });
  const base = C.gruppi['oggi · classica'], quota = (g, t) => (g.colpi ? 100*(g.tipi[t] || 0)/g.colpi : null);
  const scartoTipi = k => {
    const g = G(k); if (k === 'oggi · classica' || !g.colpi || !base?.colpi) return '—';
    const d = [...TIPI_COLPO, 'altri'].map(t => [t, quota(g, t) - quota(base, t)]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
    return `${d[0]} ${d[1] > 0 ? '+' : d[1] < 0 ? '−' : ''}${N(Math.abs(d[1]), 1)} punti`;
  };
  // per telefono: le righe in ordine di gruppo e poi di telefono
  const telefoni = Object.keys(C.telefoni).sort((a, b) => { const ga = chiavi.findIndex(k => a.startsWith(`${k} · `)), gb = chiavi.findIndex(k => b.startsWith(`${k} · `)); return ga - gb || (a < b ? -1 : 1); });
  const nuove = chiavi.filter(k => k.endsWith(' · nuova') && G(k).partite);
  const prec = chiavi.filter(k => C.precision[k]).concat(Object.keys(C.precision).filter(k => !chiavi.includes(k)).sort());
  sez('Confronto: assi del giroscopio × direzione dei colpi (B75)', [
    'Quattro gruppi, partita per partita: assi del giroscopio «oggi» (voce dello stand spenta, di base) o «corretti» («Assi del giroscopio: Corretti · prova», B74) × direzione dei colpi «classica» (di base) o «nuova» (B73). Colpi del telefono in partita di chi gioca e del Player 2 dello stesso schermo; niente allenamento, minigiochi (Precision a parte) e scambi di prova; niente colpi del Player 2 della sfida tra due computer, né dalla partita dell’host né da quella del suo computer (gli assi del suo telefono li decide il suo computer, non l’host). Con «corretti» i telefoni Android riordinano la rotazione, gli iPhone restano come oggi: la tabella «Per telefono» li tiene separati. Come leggerla e cosa serve per decidere: docs/b75/confronto-registro.md.',
    `Gruppi: ${chiavi.filter(k => CONFRONTO_GRUPPI.includes(k) || G(k).partite).map(k => `${k} ${G(k).partite ? `${N(G(k).partite)} partite, ${N(G(k).colpi)} colpi` : 'nessuna partita'}`).join(' · ')}.`,
    Pt.assiNonNoti ? `ATTENZIONE: ${N(Pt.assiNonNoti)} partite con il telefono di un gioco con il formato delle righe 5 o più senza displayLagMs: il Worker del registro non è stato ricaricato e ha tolto anche \`assi\`. Non si sa se avevano «Corretti»: sono nel gruppo «non noti», fuori dai quattro (docs/GUIDA_REGISTRO_CLOUDFLARE.md §I: dopo il Deploy la pagina del Worker dice «Formato delle righe: ${REGISTRO.versione}»).` : '',
    Pt.dirNonNota ? `ATTENZIONE: ${N(Pt.dirNonNota)} partite di un gioco con il formato delle righe 2 o più senza \`dir\`: il Worker del registro non è stato ricaricato e ha tolto il modello della direzione. Non si sa se avevano «Nuova»: sono nel gruppo «non nota», fuori dai quattro.` : '',
    Pt.formato5 && !Pt.conAssi ? (Pt.p2Corretti ? `Nessuna partita con «Corretti» nel confronto: la voce era accesa solo sul computer del Player 2 della sfida (${N(Pt.p2Corretti)} partite), i cui colpi restano fuori. Il Worker ha tenuto \`assi\`: è al formato 5.`
      : 'Nessuna partita con «Corretti»: o la voce dello stand era spenta, o il Worker è fermo al formato 4 (lascia displayLagMs e toglie solo `assi`: il riassunto non può accorgersene). Prima della prova controllare che la pagina del Worker dica «Formato delle righe: 5».') : '',
    Object.keys(giorni).length > 1 ? `Più giornate nello stesso confronto: ${Object.keys(giorni).sort().map(d => `${d} (${N(giorni[d])} partite)`).join(', ')}. I gruppi possono mescolare giornate diverse (visitatori, versioni del gioco, postazioni): per decidere usare solo il file del giorno della prova (docs/b75/confronto-registro.md §4.1 punto 3).` : '',
    Pt.vecchie ? `Partite di versioni del gioco prima del B74 (formato delle righe sotto 5, senza la voce degli assi): ${N(Pt.vecchie)}, contate con gli assi «oggi».` : '',
    Pt.p2 ? `Partite del computer del Player 2 della sfida: ${N(Pt.p2)}${Pt.p2Corretti ? ` (${N(Pt.p2Corretti)} con «Corretti»)` : ''}, fuori dal confronto.` : '',
    P2r.colpi + P2r.vuoti + P2r.cal ? `Colpi del Player 2 della sfida tra due computer: ${N(P2r.colpi)}${(a => (a.length ? ` (più ${a.join(' e ')})` : ''))([P2r.vuoti ? `${N(P2r.vuoti)} colpi a vuoto` : '', P2r.cal ? `${N(P2r.cal)} calibrazioni giocando` : ''].filter(Boolean))}, fuori dal confronto: gli assi del suo telefono li decide il suo computer, non quello dell’host.` : '',
    Pt.senzaTelefono ? `Partite senza il telefono (mouse, tastiera, webcam): ${N(Pt.senzaTelefono)}, fuori dal confronto.` : '',
    vuoti.length ? `Nessuna partita in: ${vuoti.join(', ')}.` : '',
    pochiElenco.length ? `Pochi dati (meno di ${CONFRONTO_MIN.partite} partite o di ${CONFRONTO_MIN.colpi} colpi: i numeri sono indizi, non bastano per decidere): ${pochiElenco.join(', ')}.` : '',
    grandiElenco.length ? `Differenze piccole non decidibili (da ${CONFRONTO_MIN.partite} a ${CONFRONTO_FINE.partite - 1} partite: contano solo differenze di 10 punti o più; le soglie di 2–5 punti del documento, §4.2 e §4.4, valgono da ${CONFRONTO_FINE.partite} partite per gruppo, sotto il risultato è «non decidibile: continuare la prova»): ${grandiElenco.join(', ')}.` : '',
    ...nuove.map(k => { const g = G(k); return `Con «${k}» la palla va dalla parte della cima? Cima → rimbalzo ${corr(g.cima.rango)} (obiettivo E1: almeno 0,80), tempo → rimbalzo ${corr(g.tempoX.rango)}; con la cima girata (|piatto| da ${N(CIMA_GIRATA, 1)}) la palla cade dalla sua parte in ${pcq(g.girataGiusta, g.girata)} dei colpi (${N(g.girata)}). Colpi giocati con la regola nuova: ${N(g.nr)} su ${N(g.conPf)} colpi con la forma.`; }),
    C.calSenzaPartita ? `Calibrazioni giocando senza una partita dopo (fuori dal confronto): ${N(C.calSenzaPartita)}.` : '',
    C.precisionSenzaPartita ? `Partite a Precision senza nessuna partita della postazione (assi non noti): ${N(C.precisionSenzaPartita)}.` : '',
  ], [
    { titolo: 'Gruppi', colonne: ['Assi · direzione', 'Partite', 'Finite', 'Durata (media)', 'Colpi del telefono', 'Colpi con la regola nuova', 'Avviso', 'Giorni (partite)'],
      righe: chiavi.filter(k => CONFRONTO_GRUPPI.includes(k) || G(k).partite).map(k => { const g = G(k); return [k, N(g.partite), N(g.finite), g.durata.n ? `${N(g.durata.media)} s` : '—', N(g.colpi), g.conPf ? `${N(g.nr)} su ${N(g.conPf)} (${pc(g.nr, g.conPf)})` : '—', avviso(g), elencoGiorni(g.giorni)]; }) },
    { titolo: 'Cima rispetto al colpo abituale (scarto in gradi, + a destra)', colonne: ['Assi · direzione', 'Con lo scarto', 'Mediana (°)', '|Scarto|: metà entro ±°', '9 su 10 entro ±°', 'Oltre 45°', 'Oltre 60°', 'Centro della mira di ogni giocatore in ogni partita: metà sotto · 9 su 10 sotto (°)'],
      righe: chiavi.filter(k => G(k).colpi).map(k => { const g = G(k); return [k, `${N(g.conDv)} (${pc(g.conDv, g.colpi)})`, N(g.dv.p(.5), 1), N(g.absDv.p(.5), 1), N(g.absDv.p(.9), 1), pcq(g.oltre45, g.conDv), pcq(g.oltre60, g.conDv), g.seme.n ? `${N(g.seme.p(.5), 1)} · ${N(g.seme.p(.9), 1)} (${N(g.seme.n)} giocatori)` : '—']; }) },
    { titolo: 'Lato del colpo rispetto alla palla e verso del gesto', colonne: ['Assi · direzione', 'Colpi con la palla di lato', 'Dalla parte opposta alla palla', 'Aiutati', 'Lato: dal gesto · dal verso atteso · dalla posizione', `Verso incerto (sotto ${N(VC_INCERTA, 2)})`, 'Confidenza del verso (mediana)', 'Verso grezzo −1 · 0 · +1'],
      righe: chiavi.filter(k => G(k).colpi).map(k => { const g = G(k), nl = tot(g.ls), nv = tot(g.vg); return [k, N(g.conPl), pcq(g.opposti, g.conPl), pc(g.aiutati, g.colpi, 1), nl ? ['g', 'a', 'p'].map(c => pc(g.ls[c] || 0, nl)).join(' · ') : '—', pcq(g.vcBassa, g.vc.n), N(g.vc.p(.5), 2), nv ? ['-1', '0', '1'].map(c => pc(g.vg[c] || 0, nv)).join(' · ') : '—']; }) },
    { titolo: 'Tipi di colpo (quota dei colpi)', colonne: ['Assi · direzione', ...TIPI_COLPO, 'altri', 'Scarto più grande da «oggi · classica»'],
      righe: chiavi.filter(k => G(k).colpi).map(k => { const g = G(k); return [k, ...[...TIPI_COLPO, 'altri'].map(t => pc(g.tipi[t] || 0, g.colpi, 1)), scartoTipi(k)]; }) },
    { titolo: 'Tempo del colpo, colpi deboli e a vuoto', colonne: ['Assi · direzione', 'Perfetto', 'In anticipo', 'In ritardo', 'Errore di tempo mediano (ms, + anticipo)', '|Errore|: metà entro (ms)', 'Deboli', 'Rete o fuori', 'Colpi a vuoto (ogni 100 colpi)'],
      righe: chiavi.filter(k => G(k).colpi).map(k => { const g = G(k); return [k, pc(g.voti.perfetti, g.colpi, 1), pc(g.voti.anticipo, g.colpi, 1), pc(g.voti.ritardo, g.colpi, 1), N(g.ms.p(.5)), N(g.absMs.p(.5)), pc(g.deboli, g.colpi, 1), pc(g.sbagliati, g.colpi, 1), `${N(100*g.vuoti/g.colpi, 1)} (${N(g.vuoti)})`]; }) },
    { titolo: 'Calibrazione giocando: quanto ha imparato il gioco (giocatori)', colonne: ['Assi · direzione', 'Giocatori', ...LIVELLI_CAL, 'altro o senza livello', 'Avviso'],
      righe: chiavi.filter(k => tot(G(k).cal)).map(k => { const g = G(k), n = tot(g.cal); return [k, N(n), ...LIVELLI_CAL.map(l => pc(g.cal[l] || 0, n, 1)), pc(n - LIVELLI_CAL.reduce((a, l) => a + (g.cal[l] || 0), 0), n, 1), avvisoCal(n)]; }) },
    { titolo: 'Contro l’avversario, per livello (e lo stesso schermo): partite, punti e gli obiettivi E2 ed E3 del piano B36', colonne: ['Assi · direzione · livello', 'Partite', 'Finite', 'Vinte da chi gioca', 'Punti vinti da chi gioca', 'E2 oltre 2,5 m', 'E3 fuori con il tempo nella finestra', 'Durata (media)', 'Punti a partita (finite)', 'Avviso'],
      righe: livRighe },
    { titolo: 'Dove va la palla: cima e tempo, obiettivi dello stand (piano B36 §7.6)', colonne: ['Assi · direzione', 'Colpi con il rimbalzo', 'E1 cima → rimbalzo (rango; ≥ 0,80 con «nuova»)', 'Tempo → rimbalzo (rango)', `Cima girata: palla dalla sua parte`, 'Peso del tempo nella mira', 'E2 oltre 2,5 m', 'E3 fuori con il tempo nella finestra (≤ 3%)', 'E4 primi 10 colpi con |piatto| ≥ 0,5 (≥ 30%)', 'E5 partite storte, per giocatore (≤ 10%)'],
      righe: chiavi.filter(k => G(k).colpi).map(k => { const g = G(k); return [k, N(g.conRimbalzo), corr(g.cima.rango), corr(g.tempoX.rango), g.girata ? `${pc(g.girataGiusta, g.girata, 1)} di ${N(g.girata)}` : '—', g.sommaTempo + g.sommaPiatto ? pc(g.sommaTempo, g.sommaTempo + g.sommaPiatto) : '—', pcq(g.largo, g.conRimbalzo), pcq(g.fuoriFinestra, g.nellaFinestra), pcq(g.primi05, g.primi), g.giudicate ? `${pc(g.storte, g.giudicate, 1)} (${N(g.giudicate)} giocatori giudicati)` : '—']; }) },
    { titolo: 'Precision (assi dell’ultima partita della postazione, direzione della partita a Precision)', colonne: ['Assi · direzione', 'Partite', 'Palle', 'Punti del gioco (media)', 'Punti col rimbalzo vero (media)', 'Cima verso la zona', 'Distanza dal centro della zona (m)', 'Nella zona', 'Visite (circa le persone)', 'Avviso'],
      righe: prec.map(k => { const p = C.precision[k]; return [k, N(p.partite), N(p.palle), N(p.punti.media), N(p.puntiVeri.media), p.nCima ? `${pc(p.cima, p.nCima)} di ${N(p.nCima)}` : '—', p.rimbalzi ? N(p.distanza/p.rimbalzi, 2) : '—', p.rimbalzi ? `${pc(p.nellaZona, p.rimbalzi)} di ${N(p.rimbalzi)}` : '—', N(p.visite.size), avvisoPrec(p)]; }) },
    { titolo: 'Per telefono (con «corretti»: Android riordinato, iPhone e altri come oggi)', colonne: ['Assi · direzione · telefono', 'Telefoni in partita', 'Colpi', '|Scarto|: metà entro ±°', 'Oltre 45°', 'Dalla parte opposta alla palla', 'Verso incerto', 'Lato dal gesto', 'Perfetto', 'Pallonetti · tagliati', 'Cima → rimbalzo (rango)', 'Calibrazione ok o full', 'Avviso'],
      righe: telefoni.map(k => { const g = C.telefoni[k], nc = tot(g.cal), nl = tot(g.ls); return [k, N(g.telefoni), N(g.colpi), N(g.absDv.p(.5), 1), pcq(g.oltre45, g.conDv), pcq(g.opposti, g.conPl), pcq(g.vcBassa, g.vc.n), nl ? pc(g.ls.g || 0, nl, 1) : '—', pcq(g.voti.perfetti, g.colpi), g.colpi ? `${pc(g.tipi.pallonetto || 0, g.colpi, 1)} · ${pc(g.tipi.tagliato || 0, g.colpi, 1)}` : '—', corr(g.cima.rango), nc ? pc((g.cal.ok || 0) + (g.cal.full || 0), nc) : '—', pocheVoci(g.colpi, D.colpiTelefono, 'colpi')]; }) },
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
