// Registro dello stand, B66 (richiesta dell'utente del 18/11: «voglio puntare su qualità dei sensori, calibrazione,
// performance e precisione dei gesti»): le misure di un telefono in una partita, sommate qui e scritte una volta sola
// nella riga «partita.fine» (mai i campioni). Senza DOM e senza il gioco: lo provano i test (natpf-b66-registro.test.mjs);
// registro_registratore.js gli passa gli stati del telefono («st»), i colpi arrivati e quelli giocati dal motore.
//
// Da dove vengono i numeri (docs/b66/registro-sensori.md):
//   - sq, lc, ap nel messaggio «st» del telefono (site/js/tennis/phone-stats.js): campioni dei sensori dall'ultimo stato,
//     conti del blocco dei tocchi, stato del telefono dall'app NATPF Racchetta;
//   - i colpi come li legge il computer (swing-message.parseSwingMessage): istante del picco sull'orologio del computer
//     (at), arrivo (receivedAt), numero (seq), strada (path), margine sulla soglia, buco nel gesto.
// Nessuna misura cambia il gioco: si legge soltanto.

const fin = Number.isFinite;
const MAX = 2000;                                     // valori tenuti per una distribuzione (una partita ne ha ~100)
const r1 = v => (fin(v) ? Math.round(v*10)/10 : null), r0 = v => (fin(v) ? Math.round(v) : null);
// percentile q (0…1) di un elenco (ordinato qui)
export function percentile(v, q){
  if (!v.length) return null;
  const o = [...v].sort((a, b) => a - b);
  return o[Math.min(o.length - 1, Math.max(0, Math.ceil(q*o.length) - 1))];
}
// mediana vera (con un numero pari di valori, la media dei due di mezzo)
export const mediana = v => { if (!v.length) return null; const o = [...v].sort((a, b) => a - b), m = o.length >> 1; return o.length % 2 ? o[m] : (o[m - 1] + o[m])/2; };
const metti = (a, v) => { if (fin(v) && a.length < MAX) a.push(v); };
const numeri = (a, n) => Array.isArray(a) && a.length >= n ? a.slice(0, n).map(x => (typeof x === 'number' && fin(x) ? x : null)) : null;
// un conto che sale dall'apertura della pagina (o dell'app): somma dei passi in avanti; se torna indietro la pagina (o
// l'app) è ripartita e si riparte da lì
function contatore(){
  let prima = null, tot = 0;
  return { metti(v){ if (!fin(v)) return; if (prima != null) tot += v >= prima ? v - prima : v; prima = v; }, get tot(){ return tot; } };
}
// sotto questa durata un rapporto dei campioni non dà una frequenza credibile (ma i suoi campioni si contano)
const HZ_MIN_MS = 500;
// il colpo è stato sbloccato dal computer se il blocco finisce entro questo tempo dal comando
const SBLOCCO_PC_MS = 3000;

export class MisureTelefono {
  constructor(){
    // sensori: frequenza vera per rapporto, frequenza del telefono (media mobile, telefoni di prima), campioni, buchi
    this.hz = []; this.hzTel = []; this.n = 0; this.el = 0; this.b = 0; this.bm = 0; this.iv = null; this.sa = 0; this.sg = 0; this.bg = 0; this.colpiTel = 0;
    // collegamento: ritardo dal picco all'arrivo e alla risposta del gioco, sbalzi, colpi persi o fuori ordine, strade
    this.arr = []; this.ris = []; this.jit = 0; this.jitN = 0; this.ultimoArr = null; this.stimati = 0; this.ordine = 0; this.vie = [0, 0];
    this.seg = null; this.persi = 0; this.colpi = new Map();
    // rete e batteria (app; la batteria anche dal browser)
    this.rssi = []; this.mbps = []; this.bande = {}; this.batt = null; this.battFine = null; this.carica = null; this.temp = null; this.fissa = [0, 0]; this.spenti = contatore();
    // telefono bloccato
    this.lc = [contatore(), contatore(), contatore()]; this.bloccato = null; this.lockS = 0; this.sp = 0; this.sd = 0; this.ss = 0; this.sbloccoPc = -Infinity;
    // calibrazione: colpi prima del colpo tipico proprio e del centro della mira, scarti della cima, cambi
    this.tipN = 0; this.cen = null; this.colpiCal = 0; this.dv = []; this.segni = 0; this.mani = 0; this.ricalibra = 0; this.inizio = null;
  }
  /* ---------- stato del telefono («st», uno al secondo e a ogni cambio) ---------- */
  stato(d, now){
    if (!d || typeof d !== 'object') return;
    const sq = numeri(d.sq, 7);
    if (sq && fin(sq[0]) && sq[0] >= 0){
      const [n, el, b, bm, iv, sa, sg] = sq;
      this.n += n; if (fin(el) && el > 0) this.el += el;
      if (fin(el) && el >= HZ_MIN_MS && n > 1) metti(this.hz, n*1000/el);
      if (fin(b) && b > 0) this.b += b; if (fin(bm) && bm > this.bm) this.bm = bm; if (fin(iv) && iv > 0) this.iv = iv;
      if (fin(sa)) this.sa += sa; if (fin(sg)) this.sg += sg;
    }
    const lc = numeri(d.lc, 3); if (lc) lc.forEach((v, i) => this.lc[i].metti(v));
    // blocco dei tocchi acceso e spento (lk: com'è adesso sul telefono)
    if (d.lk === 1 && this.bloccato == null) this.bloccato = { at: now, ss: this.lc[1].tot };
    else if (d.lk === 0 && this.bloccato){
      const B = this.bloccato; this.bloccato = null; this.lockS += Math.max(0, now - B.at)/1000;
      if (this.lc[1].tot > B.ss) this.ss++; else if (now - this.sbloccoPc <= SBLOCCO_PC_MS) this.sp++; else this.sd++;
    }
    const ap = numeri(d.ap, 8);
    if (ap){
      const [rssi, ghz, mbps, batt, carica, temp, fissa, spenti] = ap;
      metti(this.rssi, rssi); metti(this.mbps, mbps); if (ghz != null) this.bande[ghz] = (this.bande[ghz] || 0) + 1;
      if (fin(batt)){ if (this.batt == null) this.batt = batt; this.battFine = batt; }
      if (carica === 0 || carica === 1) this.carica = carica;
      if (fin(temp) && (this.temp == null || temp > this.temp)) this.temp = temp;
      if (fissa === 0 || fissa === 1){ this.fissa[0]++; this.fissa[1] += fissa; }
      this.spenti.metti(spenti);
    } else if (fin(d.bt)){ if (this.batt == null) this.batt = d.bt; this.battFine = d.bt; if (d.bc === 0 || d.bc === 1) this.carica = d.bc; }
  }
  // frequenza dichiarata dal telefono (media mobile, nel suo stato): per le pagine di prima, che non mandano «sq»
  hzTelefono(v){ if (fin(v) && v > 0) metti(this.hzTel, v); }
  // il computer ha chiesto di sbloccare i tocchi (pannello dello stand, foglio della fiera)
  sbloccoDalPc(now){ this.sbloccoPc = now; }
  /* ---------- colpi ---------- */
  // un colpo arrivato dal telefono (anche scartato dopo dal gioco): ritardo, numero, strada. clockOk: orologi allineati
  // (senza, l'istante del picco è una stima del telefono e il ritardo non si misura)
  arrivato(s, { now, clockOk = false } = {}){
    if (!s || typeof s !== 'object') return;
    this.colpiTel++;
    if (fin(s.gapMs)) this.bg++;
    if (s.path === 'fast') this.vie[0]++; else if (s.path === 'reliable') this.vie[1]++;
    let arr = null;
    if (clockOk && fin(s.at) && fin(s.receivedAt)){
      arr = Math.max(0, (s.receivedAt - s.at)*1000); metti(this.arr, arr);
      if (this.ultimoArr != null){ this.jit += Math.abs(arr - this.ultimoArr); this.jitN++; }
      this.ultimoArr = arr;
    } else if (fin(s.at)) this.stimati++;
    this._numero(s.seq);
    if (Number.isInteger(s.seq)){
      this.colpi.set(s.seq, { at: s.at, arr, now, mg: fin(s.margin) ? s.margin : null, gb: fin(s.gapMs) ? s.gapMs : null, stimato: arr == null });
      if (this.colpi.size > 64) this.colpi.delete(this.colpi.keys().next().value);
    }
  }
  // un colpo scartato dal collegamento o dal gioco prima di arrivare al motore (solo il numero: non è perso)
  scartato(seq){ this._numero(seq); }
  // numeri dei colpi del telefono: tratti (uno per pagina del telefono: il numero riparte da 1), colpi mancanti, fuori ordine
  _numero(q){
    if (!Number.isInteger(q) || q < 1) return;
    const S = this.seg;
    if (S && (q < S.max - 20 || (q <= 2 && S.max > 4))){ this._chiudiTratto(); }
    const T = this.seg || (this.seg = { min: q, max: q, visti: new Set() });
    if (T.visti.has(q)) return;
    if (q < T.max) this.ordine++;
    T.visti.add(q); if (q < T.min) T.min = q; if (q > T.max) T.max = q;
  }
  _chiudiTratto(){ const S = this.seg; if (S) this.persi += Math.max(0, S.max - S.min + 1 - S.visti.size); this.seg = null; }
  // il motore ha giocato il colpo seq: [ms dal picco all'arrivo, ms dal picco alla risposta del gioco] e le misure del
  // gesto (margine, buco); null se il colpo non è di questo telefono o non è recente. B71: la confidenza del tipo di colpo
  // non viene più da qui (quella del telefono valeva sempre 0,45 in fiera): il registratore scrive quella del gioco
  giocato(seq, now){
    const C = Number.isInteger(seq) ? this.colpi.get(seq) : null;
    if (!C || now - C.now > 3000) return null;
    this.colpi.delete(seq);
    const ris = !C.stimato && fin(C.at) ? Math.max(0, now - C.at*1000) : null;
    metti(this.ris, ris);
    return { rit: C.arr != null && ris != null ? [r0(C.arr), r0(ris)] : null, mg: C.mg, gb: C.gb };
  }
  // misure di calibrazione di un colpo giocato: proprio = il colpo tipico era già quello imparato giocando; dev = scarto
  // della cima in gradi (null finché il centro della mira non c'è)
  calColpo({ proprio = null, dev = null } = {}){
    this.colpiCal++;
    if (proprio === false) this.tipN++;
    if (fin(dev)){ if (this.cen == null) this.cen = this.colpiCal - 1; metti(this.dv, dev); }
  }
  /* ---------- fine della partita ---------- */
  // oggetti per la riga «partita.fine» (tq, lat, wifi, blocco, cal) (undefined = niente da dire). cal: { tip: [inizio, fine], ref, tipo, soglia }
  // dal telefono del gioco (registratore)
  fine(now, cal = {}){
    if (this.bloccato){ this.lockS += Math.max(0, now - this.bloccato.at)/1000; this.bloccato = { at: now, ss: this.lc[1].tot }; }
    this._chiudiTratto();
    const hz = this.hz.length ? this.hz : this.hzTel, out = {};
    if (this.n || hz.length){
      out.tq = { hz: [r1(mediana(hz)), r1(percentile(hz, 0))], n: this.n || undefined, b: this.b || undefined, bm: this.b ? r0(this.bm) : undefined, bg: this.bg || undefined,
        iv: this.iv != null ? r1(this.iv) : undefined, sat: this.sa || this.sg ? [this.sa, this.sg] : undefined };
      if (!this.hz.length && this.hzTel.length) out.tq.fonte = 'telefono';                // frequenza solo dalla media mobile
    }
    if (this.colpiTel){
      const tre = v => (v.length ? [r0(percentile(v, .5)), r0(percentile(v, .9)), r0(percentile(v, .99))] : undefined);
      out.lat = { arr: tre(this.arr), ris: tre(this.ris), jit: this.jitN ? r0(this.jit/this.jitN) : undefined, n: this.colpiTel, stimati: this.stimati || undefined,
        persi: this.persi || undefined, ordine: this.ordine || undefined, vie: this.vie[0] || this.vie[1] ? this.vie : undefined };
    }
    const bande = Object.entries(this.bande).sort((a, b) => b[1] - a[1]);
    if (this.rssi.length || this.mbps.length || bande.length || this.batt != null){
      out.wifi = { rssi: this.rssi.length ? [r0(mediana(this.rssi)), r0(percentile(this.rssi, 0))] : undefined, bd: bande.length ? +bande[0][0] : undefined,
        mbps: this.mbps.length ? [r0(mediana(this.mbps)), r0(percentile(this.mbps, 0))] : undefined, bt: this.batt != null ? [r0(this.batt), r0(this.battFine)] : undefined,
        ch: this.carica ?? undefined, tc: this.temp != null ? r1(this.temp/10) : undefined, fx: this.fissa[0] ? +(this.fissa[1]/this.fissa[0]).toFixed(2) : undefined };
    }
    const [tb, ssTel, us] = this.lc.map(c => c.tot);
    if (this.lockS || tb || ssTel || us || this.sp || this.sd || this.ss){
      out.blocco = { durS: r0(this.lockS), tb: tb || undefined, ss: this.ss || ssTel || undefined, sp: this.sp || undefined, sd: this.sd || undefined, us: us || undefined, sc: this.spenti.tot || undefined };
    }
    const dvi = this.dv.length >= 4 ? [r1(mediana(this.dv.slice(0, 10))), r1(mediana(this.dv.slice(-10)))] : undefined;
    if (this.colpiCal || this.segni || this.mani || this.ricalibra || cal.tip || cal.ref){
      out.cal = { tip: cal.tip, tipN: this.colpiCal ? this.tipN : undefined, cen: this.cen ?? undefined, dvi, seg: this.segni || undefined, mano: this.mani || undefined,
        ric: this.ricalibra || undefined, ref: cal.ref, tipo: cal.tipo, soglia: cal.soglia };
    }
    return out;
  }
}

// pause della partita per il telefono (o la webcam): { motivo: [volte, secondi] }
export class Pause {
  constructor(){ this.m = {}; this.aperte = {}; }
  // chi: chiave del telefono ('' Player 1, ' (2)' Player 2); why: motivo nuovo (null = ripresa)
  // B71 (registri del 18 e 19/11, docs/b71/registro-tempo.md): la pausa aperta si confronta con la chiave salvata (motivo +
  // chi). Prima si confrontava con il motivo nudo: per il Player 2 («pagina nascosta (2)» contro «pagina nascosta») la
  // pausa si chiudeva e si riapriva a ogni controllo (uno al secondo) e le volte erano uguali ai secondi (127 × 127 s)
  cambia(chi, why, now){
    const A = this.aperte[chi], k = why ? String(why).slice(0, 40) + chi : null;
    if (A && A.why === k) return;
    if (A){ this.m[A.why][1] += Math.max(0, now - A.at)/1000; delete this.aperte[chi]; }
    if (k){ this.aperte[chi] = { why: k, at: now }; (this.m[k] || (this.m[k] = [0, 0]))[0]++; }
  }
  fine(now){
    for (const chi of Object.keys(this.aperte)) { const A = this.aperte[chi]; this.m[A.why][1] += Math.max(0, now - A.at)/1000; A.at = now; }
    const out = {}; for (const [k, v] of Object.entries(this.m)) out[k] = [v[0], Math.round(v[1]*10)/10];
    return Object.keys(out).length ? out : undefined;
  }
}
