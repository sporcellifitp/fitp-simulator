// Registro dello stand (B30): il registratore. Raccoglie da solo, per tutta la giornata, i fatti di gioco (partite,
// punti, colpi, servizi, tutorial, calibrazioni, collegamento dei telefoni, prestazioni, errori) e li passa a blocchi
// alla coda sul disco (registro_coda.js), da cui partono per lo spazio Cloudflare dell'utente (registro_invio.js).
// Formato, limiti e riservatezza: registro_formato.js; cosa c'è in ogni riga: docs/b30/registro-dello-stand.md.
//   - Sempre acceso di base (decisione dell'utente del 12/11); lo staff lo spegne dal pannello dello stand.
//   - Leggero: agganci sugli stessi punti del motore della modalità diagnostica (diag/diag_recorder.js), installati una
//     volta; a registro spento costano un confronto. Niente palla a ogni fotogramma, niente campioni dei sensori, niente
//     video: una riga per punto, una per colpo. In partita un conto dei fotogrammi (pochi numeri per fotogramma); fuori
//     dalla partita solo un controllo al secondo. Il costo sul thread del gioco si misura da solo (costo.ms).
//   - Mai sincrono: le righe restano in memoria e ogni 45 s (e a fine partita) diventano un blocco, che va nella coda
//     e poi al Worker per conto suo. Se la coda non si può scrivere o la rete non c'è il gioco non se ne accorge (righe
//     perse contate, nessun avviso a schermo, nessuna attesa).
//   - Niente dati di chi gioca: i campi sono scelti qui a mano e ogni riga passa da pulisci() (solo i campi previsti)
//     con TUTTI i nomi scritti nella giornata (soprannome, nomi dello stesso schermo, anche quelli di prima di «Nuovo
//     giocatore» o del chiosco: tenuti solo in memoria, mai su disco), che nei testi liberi diventano «[nome]».
// La modalità diagnostica resta com'era: i suoi agganci avvolgono questi (o viceversa) senza cambiarne il risultato.
// Senza DOM: lo provano i test con un motore finto (natpf_registro.js lo collega al gioco e al pannello dello stand).
// B36.0 (misurare prima la direzione dei colpi, docs/b36/misure-b36-0.md): la riga «colpo» della racchetta aspetta il
// primo rimbalzo vero della palla (dove cade davvero e se è fuori per l'arbitro del motore) e solo allora si scrive; se il
// rimbalzo non arriva (palla presa al volo, in rete, punto finito, menu) si scrive senza. Solo lettura: il gioco non cambia.
import { REGISTRO, giornoDi, leggiGiornata, scriviGiornata, registroAcceso, scriviScelta, idBlocco, dispositivo, strada, gpuVera, gpuNome, finePunto, pulisci, testoRiga, r } from './registro_formato.js';
import { whoOfLevel } from '../natpf_who.js';
import { eventoK } from '../natpf_evento.js';
import { getCast } from '../natpf_personaggi.js';
import { readFairMode } from '../natpf_fair_format.js';
import { readAimLevel } from '../natpf_aim_level.js';
import { NATPF_BUILD } from '@natpf/tennis/version.js';
import { dirModelOf, usedNewRule } from '../natpf_direction.js';

const prova = (fn, no = null) => { try { return fn(); } catch { return no; } };
const NOMI_BASE = new Set(['player 1', 'player 2', 'ospite', '']);
const voto = g => { const s = String(g || '').split('•')[0].trim().toLowerCase(); return s ? s.slice(0, 24) : null; };
const CTRL = { phone: 'telefono', webcam: 'webcam', mouse: 'mouse' };
const base = f => String(f || '').slice(0, 2000).replace(/[?#].*$/, '').split(/[\\/]/).pop().slice(0, 60) || null;
const MAX_NOMI = 300;                                    // nomi della giornata tenuti in memoria (i più vecchi escono)

// B31: nomi dei colpi a rete della CPU nel registro (campo «in» del colpo di chi gioca)
const CPU_NET = Object.freeze({ volley: 'volée', smash: 'schiacciata', drop: 'palla corta' });
// B36.0: la palla è fuori al primo rimbalzo come la chiama il motore (game_engine.js, primo rimbalzo: |x| oltre la riga
// laterale del singolare 4,115 m + 0,22 di tolleranza, |z| oltre la riga di fondo 11,89 m + 0,28; e fuori anche se rimbalza
// nella metà di chi l'ha colpita). Un test controlla che i numeri siano quelli del motore
export const LINEE = Object.freeze({ x: 4.115 + .22, z: 11.89 + .28 });
// colpo rimasto in attesa del rimbalzo oltre questo tempo: si scrive senza (il volo più lungo, un pallonetto, dura meno di 3 s)
const ATTESA_RIMBALZO_MS = 6000;
export class RegistroStand {
  constructor({ engine, ui = null, coda, invio = null, storage = globalThis.localStorage, now = () => performance.now(), wallNow = () => Date.now(), programma = false, win = null, raf = null, timers = true, area = null } = {}){
    this.engine = engine; this.ui = ui; this.coda = coda; this.invio = invio; this.storage = storage; this.now = now; this.wallNow = wallNow; this.programma = !!programma; this.win = win; this.area = area;
    this.raf = raf || (typeof requestAnimationFrame === 'function' ? cb => requestAnimationFrame(cb) : null);
    this.t0 = now(); this.buf = []; this.on = false;
    // conti: righe fatte, righe messe in coda, righe perse (coda che non si scrive, troppe righe in memoria), blocchi
    this.conti = { righe: 0, scritte: 0, perse: 0, blocchi: 0 }; this._perseDette = 0; this.ultimoProblema = null;
    this.costo = { ms: 0, max: 0 };                      // ms spesi dal registro sul thread del gioco (agganci e scritture)
    this.partita = null; this.visita = null; this.cal = {}; this.tut = new Map(); this.tel = {}; this.scarti = {}; this.err = new Map();
    this.att = null; this.mini = null; this._chiosco = -Infinity; this._telefoni = new Set(); this._nomi = new Set();
    this._aperto = null;                                 // B36.0: il colpo della racchetta che aspetta il suo primo rimbalzo
    this._installa();
    if (timers && typeof setInterval === 'function'){
      this._secT = setInterval(() => this.secondo(), 1000); this._flushT = setInterval(() => { this.blocco(); }, REGISTRO.bloccoMs);
      this._secT?.unref?.(); this._flushT?.unref?.();
    }
    this.accendi(registroAcceso({ storage }), { salva: false, motivo: 'avvio' });
  }
  get t(){ return Math.max(0, Math.round(this.now() - this.t0)); }
  get chiosco(){ return !!this.ui?.kiosk?.enabled; }
  // nomi scritti da chi gioca: quelli di adesso e quelli già visti nella giornata (revisione: dopo «Nuovo giocatore» il
  // nome di prima non c'è più nel gioco, ma può ancora comparire in un errore). Solo in memoria, mai su disco
  nomi(){
    const E = this.engine;
    for (const n of [prova(() => this.ui?.events?.nickname), E?.natpfSplitNames?.p1, E?.natpfSplitNames?.p2]){
      const v = String(n || '').trim().slice(0, 60); if (!v || NOMI_BASE.has(v.toLowerCase()) || this._nomi.has(v)) continue;
      this._nomi.add(v); if (this._nomi.size > MAX_NOMI) this._nomi.delete(this._nomi.values().next().value);
    }
    return [...this._nomi];
  }
  /* ---------- acceso, spento ---------- */
  // salva: la scelta dello staff resta salvata (pannello dello stand); di base il registro è sempre acceso
  accendi(on, { salva = true, motivo = 'acceso' } = {}){
    on = !!on;
    if (salva) scriviScelta(on, this.storage);
    if (on === this.on) return on;
    if (on){ this.on = true; this._avvio(motivo); }
    else { this.chiudi('spento'); this.on = false; }
    return on;
  }
  // La giornata resta quella di quando è cominciata finché non la cambia _cambioGiorno() (controllo al secondo, o una
  // partita nuova): una partita a cavallo della mezzanotte resta tutta nella giornata in cui è cominciata (revisione)
  _giornata(){
    if (!this.giornata) this.giornata = leggiGiornata(giornoDi(new Date(this.wallNow())), this.storage);
    return this.giornata;
  }
  // giorno nuovo a gioco acceso (stand aperto oltre la mezzanotte), senza partita in corso: le righe in memoria partono
  // con la giornata vecchia, poi giornata nuova con la sua riga «avvio»; gli errori si ricontano da zero, i nomi visti
  // si dimenticano
  _cambioGiorno(){
    if (!this.giornata || this.partita || giornoDi(new Date(this.wallNow())) === this.giornata.giorno) return false;
    this.blocco(); this.giornata = null; this.err = new Map(); this._nomi.clear();
    if (this.on) this._avvio('giorno nuovo');
    return true;
  }
  _salvaGiornata(extra = {}){ const G = this._giornata(); G.aperta = { pulita: false, partita: this.partita?.n || 0, ...extra }; scriviGiornata(G, this.storage); }
  _avvio(motivo){
    const G = this._giornata(), prima = G.aperta, w = this.win, s = w?.screen, nav = prova(() => w.performance.getEntriesByType('navigation')[0]?.type) || null;
    const area = prova(() => this.area?.()) || (w ? { w: w.innerWidth, h: w.innerHeight } : null);
    const gpu = prova(() => this._gpu());
    this._riga('avvio', {
      v: REGISTRO.versione, ora: new Date(this.wallNow()).toISOString(), fuso: -new Date(this.wallNow()).getTimezoneOffset(), g: G.g, versione: NATPF_BUILD, dove: this.programma ? 'programma' : 'browser', motivo,
      schermo: s ? [s.width, s.height] : null, area: area ? [Math.round(area.w), Math.round(area.h)] : null, dpr: r(w?.devicePixelRatio, 2), cpu: prova(() => w.navigator.hardwareConcurrency) || null,
      gpu: gpu ? gpuVera(gpu) : null, gpuTipo: gpuNome(gpu), pagina: nav, chiosco: this.chiosco,
      // la volta prima la pagina si è chiusa da sola (pulita) o di colpo (crash, PC spento, programma chiuso a forza)?
      prima: prima ? (prima.pulita ? 'pulita' : 'improvvisa') : null, ...(prima && !prima.pulita && prima.partita ? { primaInPartita: prima.partita } : {}),
    });
    this._salvaGiornata();
  }
  // nome della scheda grafica dal contesto WebGL del gioco (nessun contesto in più)
  _gpu(){
    const gl = this.engine.renderer?.getContext?.(); if (!gl) return null;
    const ext = gl.getExtension?.('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter?.(gl.RENDERER) ?? null;
  }
  // pagina che si chiude (o si ricarica): partita in corso chiusa come interrotta, segno di chiusura pulita
  chiudi(motivo = 'chiusura'){
    if (!this.on) return;
    this._chiudiColpo();
    this._chiudiTutto(motivo); this._riga('chiusura', { motivo });
    const G = this._giornata(); G.aperta = { pulita: true, partita: 0 }; scriviGiornata(G, this.storage);
    this.blocco({ chiusura: motivo === 'chiusura' });
  }
  _chiudiTutto(come){
    if (this.partita) this._finePartita(this.engine.phase === 'MATCH_OVER' ? 'finita' : 'interrotta', come);
    for (const chi of Object.keys(this.cal)) this._fineCal(chi, false);
    for (const [T, s] of this.tut) this._fineTutorial(T, s, come);
    if (this.att) this._fineAllenamento({ completed: false }, come);
    if (this.prv) this._fineProva(false);
    if (this.mini) this._fineMinigioco(false);
    if (this.visita) this._fineVisita(come);
  }

  /* ---------- righe ---------- */
  // la riga com'è adesso (tempo, partita in corso), prima di pulirla
  _fai(k, data = {}){ return { k, t: this.t, ...(this.partita && data.n === undefined && k !== 'avvio' ? { n: this.partita.n } : {}), ...data }; }
  _riga(k, data = {}){
    if (!this.on) return;
    if (this._aperto) this._forseChiudi();                                   // B36.0: il colpo già risolto va prima di questa riga
    this._scrivi(this._fai(k, data));
  }
  _scrivi(raw){
    if (!this.on) return;
    if (this.buf.length >= 4000){ this.conti.perse++; return; }               // coda ferma da molto: non si accumula senza fine
    const row = pulisci(raw, { nomi: this.nomi() });
    const line = row && testoRiga(row); if (!line) return;
    this.buf.push(line); this.conti.righe++;
  }
  // Le righe in memoria diventano un blocco: identificativo (giorno, postazione, parte), coda sul disco, poi l'invio.
  // Senza aspettare e senza errori fuori di qui: se la coda non si scrive le righe sono perse e contate (il blocco
  // dopo comincia con una riga «nota» che lo dice). chiusura: la pagina si chiude, il blocco parte anche con sendBeacon
  async blocco({ chiusura = false } = {}){
    if (this._aperto) this._forseChiudi();                                   // un colpo con la palla ancora in volo resta per il blocco dopo
    if (!this.buf.length){ this.invio?.tic(); return; }
    const a = this.now(), G = this._giornata(), righe = this.buf; this.buf = [];
    if (this.conti.perse > this._perseDette){
      const nota = testoRiga({ k: 'nota', t: this.t, perse: this.conti.perse - this._perseDette }); this._perseDette = this.conti.perse; if (nota) righe.unshift(nota);
    }
    const blocchi = []; let cur = [], size = 0;
    for (const l of righe){ if (size + l.length + 1 > REGISTRO.maxBlocco/4 && cur.length){ blocchi.push(cur); cur = []; size = 0; } cur.push(l); size += l.length + 1; }
    if (cur.length) blocchi.push(cur);
    const pronti = blocchi.map(b => { G.b = (G.b || 0) + 1; return { id: idBlocco(G.giorno, G.g, G.b), testo: b.join('\n') + '\n', righe: b.length }; });
    scriviGiornata(G, this.storage);
    if (chiusura) for (const b of pronti) this.invio?.allaChiusura(b.id, b.testo);
    this._costo(a);
    for (const b of pronti){
      let res = null; try { res = await this.coda.metti(b.id, b.testo); } catch { res = null; }
      this.conti.blocchi++;
      if (res?.ok){ this.conti.scritte += b.righe; this.ultimoProblema = null; if (this.invio) this.invio.daInviare = true; }
      else { this.conti.perse += b.righe; this.ultimoProblema = res?.perche || 'coda non scrivibile'; }
    }
    try { await this.invio?.invia(); } catch {}
  }
  // per il pannello dello stand
  stato(){ const G = this._giornata(); return { acceso: this.on, giorno: G.giorno, partite: G.n, inMemoria: this.buf.length, ...this.conti, problema: this.ultimoProblema, costoMs: this.costo.ms, costoMax: this.costo.max }; }
  _costo(a){ const d = this.now() - a; this.costo.ms += d; if (d > this.costo.max) this.costo.max = d; }
  _scarto(perche){ if (!this.on) return; const k = String(perche || 'altro').slice(0, 60); this.scarti[k] = (this.scarti[k] || 0) + 1; }
  _prendiScarti(){ const s = this.scarti; this.scarti = {}; return Object.keys(s).length ? { scartati: s } : {}; }

  /* ---------- agganci (una volta sola) ---------- */
  _installa(){
    const E = this.engine, R = this, ui = this.ui;
    const wrap = (obj, name, fn) => { const orig = obj?.[name]; if (typeof orig !== 'function') return; obj[name] = function(...a){ return R.on ? fn.call(this, orig.bind(this), ...a) : orig.apply(this, a); }; };
    const dopo = (obj, name, fn) => wrap(obj, name, function(orig, ...a){ const out = orig(...a); const t = R.now(); try { fn.call(this, out, ...a); } catch {} R._costo(t); return out; });
    dopo(E, 'startNewMatch', () => R._partita());
    wrap(E, '_awardPoint', function(orig, winner, why = ''){
      R._chiudiColpo();                                                      // B36.0: il colpo di prima (rimbalzo o no) prima del punto
      const b = E.ball, prima = R.partita ? { colpi: b?.rallyStrokeCount || 0, ultimo: b?.lastHitter || null, vuoto: E.natpfLastWhiff?.side || null, batte: E.score?.server || null, pt: (E.score?.playerPoints || 0) + (E.score?.opponentPoints || 0), game: (E.score?.playerGames || 0) + (E.score?.opponentGames || 0), over: E.phase === 'MATCH_OVER' } : null;
      const out = orig(winner, why);
      const t = R.now(); try { if (prima) R._punto(winner, why, prima); } catch {} R._costo(t);
      return out;
    });
    // il colpo, con la palla che arrivava (velocità e altezza prese prima che il colpo la cambi)
    // (a[0]: il gesto che arriva al motore, con natpf.aimDev: lo scarto della cima in gradi, B36.0)
    wrap(E, '_natpfRacketShot', function(orig, ...a){
      const b = E.ball, v = b?.vel, pre = v && b?.pos ? [Math.hypot(v.x || 0, v.y || 0, v.z || 0)*3.6, b.pos.y] : null, out = orig(...a);
      const t = R.now(); try { if (out) R._colpo(out, pre, a[0]); } catch {} R._costo(t);
      return out;
    });
    // B36.0: primo rimbalzo vero della palla dell'ultimo colpo della racchetta (l'anello del rimbalzo: lo chiama il motore a
    // ogni rimbalzo, con il punto dove la palla tocca terra, prima di decidere se è fuori)
    dopo(E, '_spawnBounceRing', (_o, x, z) => R._rimbalzo(x, z));
    dopo(E, '_startServeToss', (_o, _a, auto) => { const P = R.partita; if (P){ P.lanci++; if (auto) P.lanciAuto++; if (auto === 'serve') P.battuteAuto++; } });
    wrap(E, '_executeServeHit', function(orig, actor, ...rest){
      const before = E.natpfLastServe, giaInGioco = !!E.ball?.inPlay, out = orig(actor, ...rest);
      const t = R.now(); try { R._servizio(actor, before, !giaInGioco && !!E.ball?.inPlay); } catch {} R._costo(t);
      return out;
    });
    const vuoto = perche => function(orig, ps = {}){ const t = R.now(); try { R._vuoto(ps, perche); } catch {} R._costo(t); return orig(ps); };
    wrap(E, '_natpfEarlyWhiff', vuoto(null)); wrap(E, '_natpfWeakDropped', vuoto('debole'));
    // allenamento (tutorial completo, riscaldamento, calibrazione in campo) e minigiochi
    if (ui?.training){
      dopo(ui.training, 'start', (_o, opts = {}) => R._allenamento(opts));
      wrap(ui.training, 'stop', function(orig, o = {}){ const era = !!this.active; const out = orig(o); if (era && R.att) R._fineAllenamento(o, 'fine'); return out; });
    }
    if (ui?.events){
      dopo(ui.events, 'start', (_o, gioco) => { if (ui.events.active) R._minigioco(gioco); });
      wrap(ui.events, 'finish', function(orig, ...a){ const A = this.active, punti = A && !A.over ? A.score : null; const out = orig(...a); if (punti != null && R.mini) R._fineMinigioco(true, punti); return out; });
      wrap(ui.events, 'abort', function(orig, ...a){ const era = !!this.active; const out = orig(...a); if (era && R.mini) R._fineMinigioco(false); return out; });
    }
    // B28: calibrazione giocando («Scambi di prova», natpf_trial.js), di base prima della prima partita: una riga
    // «calibrazione» con tipo «giocando» (palle tirate, dritti e rovesci imparati, livello, saltata con «Salta ›»)
    if (ui?.trial){
      dopo(ui.trial, 'start', function(){ if (this.S && R.prv?.S !== this.S) R.prv = { S: this.S, t0: R.now(), saltato: false }; });
      dopo(ui.trial, 'skip', function(){ if (R.prv?.S === this.S) R.prv.saltato = true; });
      wrap(ui.trial, '_close', function(orig, run){ const S = this.S, out = orig(run); const t = R.now(); try { if (S && R.prv?.S === S) R._fineProva(!!run); } catch {} R._costo(t); return out; });
    }
    // tutorial (modale prima della calibrazione; nello stesso schermo una per metà)
    for (const [chi, T, meta] of [['g', ui?.training?.tutorial, false], ['g', ui?.split?.tut?.p1, true], ['a', ui?.split?.tut?.p2, true]]){
      if (!T) continue;
      dopo(T, 'openFor', function(_o, o = {}){ if (this.open){ R._tutorial(this, chi, o); const s = R.tut.get(this); if (s) s.meta = meta; } });
      wrap(T, 'close', function(orig, reason = 'phone'){ const s = this.open ? R.tut.get(this) : null, stato = this.state; const out = orig(reason); if (s) R._fineTutorial(this, s, reason, stato); return out; });
    }
    // il chiosco che riparte (nessuno da un po'): la visita e la partita in corso finiscono «per inattività»
    wrap(ui?.kiosk, 'reset', function(orig, ...a){ R._chiosco = R.now(); return orig(...a); });
    this._telefono(E.natpfPhone, 'g');
    // errori JavaScript e promesse rifiutate: messaggio e riga, senza dati di chi gioca
    const w = this.win;
    if (w?.addEventListener){
      w.addEventListener('error', e => { if (R.on) try { R._errore('errore', String(e?.message || e?.error?.message || '').slice(0, 1000), e?.filename, e?.lineno, e?.colno); } catch {} });
      // (testi tagliati prima di ogni espressione: un errore enorme non deve fermare il gioco)
      w.addEventListener('unhandledrejection', e => { if (R.on) try { const x = e?.reason, m = /(?:\(|\s|@)([^()\s@]+?):(\d+):(\d+)\)?\s*$/m.exec((String(x?.stack || '').slice(0, 4000).split('\n').find(l => /:\d+:\d+/.test(l)) || '').slice(0, 400)); R._errore('promessa', String(x?.message || prova(() => String(x), 'errore')).slice(0, 1000), m?.[1], +m?.[2] || null, +m?.[3] || null); } catch {} });
      w.addEventListener('pagehide', () => { try { R.chiudi('chiusura'); } catch {} });
    }
  }
  _telefono(ph, chi){
    if (!ph || this._telefoni.has(ph)) return; this._telefoni.add(ph);
    const R = this;
    this.tel[chi] = { ph, stato: ph.connected ? 'on' : 'off', visto: !!ph.connected, cadutoAt: null, daScrivere: null };
    ph.onChange?.(() => { if (R.on) R._telCambio(chi); });
    ph.onCal?.(e => { if (R.on){ const t = R.now(); try { R._cal(chi, e || {}); } catch {} R._costo(t); } });
    ph.onSwing?.((ev) => { if (R.on && ev?.ignored) R._scarto(ev.ignored); });
    ph.onDropped?.(why => R._scarto(why));
    ph.onDiag?.((kind, d) => { if (kind === 'scartato') R._scarto(`telefono: ${d?.why || 'gesto scartato'}`); });
  }

  /* ---------- partita ---------- */
  _lato(who){ return who === 'player' ? 'g' : who === 'opponent' ? 'a' : null; }
  _modo(){ const E = this.engine; return E.natpfSplit?.active ? 'stesso-schermo' : (E.isMultiplayer || E.versus?.active || this.ui?.versus?.hostActive) ? 'due-computer' : 'cpu'; }
  _evento(){ const E = this.engine; return E.matchConfig?.difficulty === 'evento' && !E.isMultiplayer && !E.versus?.active && !E.natpfSplit?.active; }
  _infoTel(chi){
    const ph = this.tel[chi]?.ph; if (!ph?.connected) return null;
    const L = ph.link, d = dispositivo(ph.device?.ua);
    return { strada: strada(L?.route, L?.transport), rtt: r(ph.state?.rtt, 0), ...(d || {}) };
  }
  _partita(){
    const E = this.engine, ui = this.ui;
    if (E.autoPlayMode) return;                                               // la partita dimostrativa dietro il menu non conta
    if (this.partita) this._finePartita(E.phase === 'MATCH_OVER' ? 'finita' : 'abbandonata', 'partita nuova');
    this._cambioGiorno();
    const G = this._giornata(); G.n += 1;
    const modo = this._modo(), split = modo === 'stesso-schermo', duo = E.natpfDuo || null, liv = E.matchConfig?.difficulty || null;
    const ctrl = split ? (ui?.split?.webcam ? 'webcam' : 'telefono') : CTRL[ui?.controller] || ui?.controller || null;
    const nomi = E.natpfSplitNames || {}, conNome = v => !!String(v || '').trim() && !NOMI_BASE.has(String(v).trim().toLowerCase());
    this.partita = { n: G.n, ctrl, t0: this.now(), punti: 0, vinti: 0, colpi: 0, colpiA: 0, p: 1, puntoAt: this.now(), inGiocoAt: null, lanci: 0, lanciAuto: 0, battuteAuto: 0, vuoti0: E.natpfTossMisses || 0,
      totLanci: 0, totVuoti: 0, pg: 0, og: 0, cadute: 0, riprese: 0, rttS: 0, rttN: 0, rttMax: 0, errori: 0, pauseS: 0, costo0: this.costo.ms,
      f: { n: 0, ms: 0, max: 0, lunghi: 0, peggiore: Infinity, sec0: null, secN: 0, last: null } };
    this._riga('partita', {
      n: G.n, ora: new Date(this.wallNow()).toISOString(), g: G.g, versione: NATPF_BUILD, modo,
      // contro la CPU: «Chi gioca» (Bambino · Ragazzo · Adulto) quando il livello viene da lì, e il livello
      ...(modo === 'cpu' ? { chi: whoOfLevel(liv), livello: liv } : {}), ruolo: E.playerRole === 'p2' ? 'p2' : undefined,
      formato: E.matchFormat?.id || null, game: E.matchConfig?.gamesToWin ?? null, fiera: !!E.score?.fair, batte: this._lato(E.score?.server),
      personaggi: prova(() => getCast()), ctrl, mano: ui?.hand?.hand || E.natpfPhone?.hand || null, ...(split || modo === 'due-computer' ? { mano2: E.natpfP2Hand || E.natpfPhone2?.hand || null } : {}),
      segnale: !!ui?.cue?.enabled, nomeInserito: split ? conNome(nomi.p1) : !!prova(() => ui?.events?.nickname), ...(split ? { nomeInserito2: conNome(nomi.p2) } : {}),
      // opzioni dello stand accese per questa partita (B42: lo «scambio che si scalda» vale in tutti i modi, acceso di base)
      stand: { chiosco: this.chiosco, fiera: prova(() => readFairMode()), mira: prova(() => readAimLevel()), caldo: !!E.natpfHot, ...(split ? { lancioAuto: !!duo?.autoToss, campoAperto: !!duo?.open } : {}) },
      // B36.0: modello della direzione dei colpi della partita (natpf_direction.js; oggi sempre «classica»)
      dir: dirModelOf(E),
      // stesso schermo: fasce dei due giocatori e chi riceve l'aiuto (il più giovane)
      ...(split ? { fasce: [E.natpfSplitBands?.p1 || 'adulto', E.natpfSplitBands?.p2 || 'adulto'], aiuto: duo?.help?.p1 ? 'g' : duo?.help?.p2 ? 'a' : null } : {}),
      ...(this._evento() ? { ek: r(eventoK(), 3) } : {}),
      ...(ctrl === 'telefono' ? { tel: this._infoTel('g'), ...(split ? { tel2: this._infoTel('a') } : {}) } : {}),
    });
    if (this.visita) this.visita.partite++;
    this._salvaGiornata();
    this._fotogrammi();
  }
  // conto dei fotogrammi in partita: fps medi, secondo peggiore, fotogramma più lungo, fotogrammi oltre 50 ms. A gioco
  // fermo (pausa, pagina nascosta) non conta
  _fotogrammi(){
    if (!this.raf || this._rafOn) return; this._rafOn = true;
    const loop = t => {
      const P = this.partita;
      if (!P || !this.on){ this._rafOn = false; return; }
      const f = P.f, dt = f.last == null ? null : t - f.last; f.last = t;
      if (dt != null && dt < 1000 && !this.engine.natpfPaused){
        f.n++; f.ms += dt; if (dt > f.max) f.max = dt; if (dt > 50) f.lunghi++;
        if (f.sec0 == null){ f.sec0 = t; f.secN = 0; } else { f.secN++; if (t - f.sec0 >= 1000){ const fps = f.secN*1000/(t - f.sec0); if (fps < f.peggiore) f.peggiore = fps; f.sec0 = t; f.secN = 0; } }
      } else f.sec0 = null;
      this.raf(loop);
    };
    this.raf(loop);
  }
  _punto(winner, why, prima){
    const E = this.engine, P = this.partita, S = E.score || {};
    // fine partita già segnata, o punto non contato (computer del Player 2 nella sfida tra due computer): niente riga
    const tot = (S.playerPoints || 0) + (S.opponentPoints || 0), game = (S.playerGames || 0) + (S.opponentGames || 0);
    if (prima.over || (tot === prima.pt && game === prima.game)) return;
    const perde = winner === 'player' ? 'opponent' : 'player', now = this.now(), vuoti = Math.max(0, (E.natpfTossMisses || 0) - P.vuoti0);
    const fine = finePunto({ motivo: why, colpi: prima.colpi, vuoto: prima.vuoto === perde });
    this._riga('punto', {
      p: P.p, batte: this._lato(prima.batte), vince: this._lato(winner), fine, ultimo: this._lato(prima.ultimo), colpi: prima.colpi,
      durS: P.inGiocoAt != null ? r((now - P.inGiocoAt)/1000, 1) : null, attesaS: r(((P.inGiocoAt ?? now) - P.puntoAt)/1000, 1),
      pt: [S.playerPoints || 0, S.opponentPoints || 0, S.playerGames || 0, S.opponentGames || 0],
      lanci: P.lanci || undefined, lanciVuoti: vuoti || undefined, lanciAuto: P.lanciAuto || undefined, battutaAuto: P.battuteAuto || undefined,
      ...(this._evento() ? { ek: r(eventoK(), 3) } : {}),
    });
    P.punti++; if (winner === 'player') P.vinti++; P.totLanci += P.lanci; P.totVuoti += vuoti;
    P.pg = S.playerGames || 0; P.og = S.opponentGames || 0;
    P.p++; P.puntoAt = now; P.inGiocoAt = null; P.lanci = 0; P.lanciAuto = 0; P.battuteAuto = 0; P.vuoti0 = E.natpfTossMisses || 0;
    if (E.phase === 'MATCH_OVER') this._finePartita('finita', 'fine');
  }
  _finePartita(esito, come){
    const P = this.partita, E = this.engine; if (!P) return;
    this._chiudiColpo();
    const f = P.f, kiosk = this.now() - this._chiosco < 3000;
    this._riga('partita.fine', {
      esito, ...(esito !== 'finita' ? { dove: 'a metà partita', come: kiosk ? 'chiosco' : come } : {}),
      vince: esito === 'finita' ? (P.pg > P.og ? 'g' : P.og > P.pg ? 'a' : null) : null, game: [P.pg, P.og], punti: P.punti, puntiVinti: P.vinti, colpi: P.colpi, ...(P.colpiA ? { colpi2: P.colpiA } : {}),
      durS: r((this.now() - P.t0)/1000, 0), lanci: P.totLanci + P.lanci || undefined, lanciVuoti: P.totVuoti + Math.max(0, (E.natpfTossMisses || 0) - P.vuoti0) || undefined,
      ...(this._evento() ? { ek: r(eventoK(), 3) } : {}),
      fps: f.n > 30 ? { medi: r(1000*f.n/f.ms, 1), peggiori: Number.isFinite(f.peggiore) ? r(f.peggiore, 1) : null, maxMs: r(f.max, 0), lunghi: f.lunghi, n: f.n } : null,
      tel: P.cadute || P.riprese || P.rttN ? { cadute: P.cadute || undefined, riprese: P.riprese || undefined, rtt: P.rttN ? r(P.rttS/P.rttN, 0) : null, rttMax: P.rttN ? r(P.rttMax, 0) : null } : undefined,
      errori: P.errori || undefined, ...this._prendiScarti(),
      // quanto è costato il registro in questa partita: ms sul thread del gioco (agganci e righe), in tutto
      costoMs: r(this.costo.ms - P.costo0, 1),
    });
    this.partita = null;
    this._salvaGiornata();
    this.blocco();
  }

  /* ---------- colpi ---------- */
  // colpi negli scambi di prova (anche a partita in corso, con «Ricalibra»): amb «prova», fuori dai conti della partita
  _ambiente(){ return this.ui?.trial?.active ? 'prova' : this.ui?.training?.active ? 'allenamento' : this.ui?.events?.active ? 'minigioco' : undefined; }
  // pre: [velocità in km/h, altezza in m] della palla che arrivava; ev: il gesto arrivato al motore (natpf.aimDev)
  _colpo(out, pre = null, ev = null){
    const E = this.engine, L = E.natpfLastRacket; if (!L) return;
    const I = L.intent || {}, O = L.out || {}, forza = Number.isFinite(I.typePower) ? I.typePower : I.power;
    const prv = !!this.ui?.trial?.active, P = prv ? null : this.partita, amb = P ? undefined : this._ambiente();
    if (!P && !amb) return;                                                   // colpi fuori da partita, allenamento e minigiochi: niente
    const g = L.who === 'p2' ? 'a' : 'g';
    if (P){ if (g === 'g') P.colpi++; else P.colpiA++; }
    // B36.0: zona chiesta da Precision (natpf_arcade.PRECISION_ZONES, 0–9) e scarto della cima in gradi
    const A = this.ui?.events?.active, zp = amb === 'minigioco' && A?.id === 'precision' && Number.isInteger(A.zoneIdx) ? A.zoneIdx : null, dev = ev?.natpf?.aimDev;
    // Righe compatte (lo spazio dell'utente non è infinito): niente campi ripetuti a ogni colpo. Il punto è quello
    // della riga «punto» che segue; chi: solo se è l'avversario umano ('a'); e: solo se non è «dentro»; fonte: solo se
    // non è il controller scritto nella riga della partita
    // B36.0: la riga aspetta il primo rimbalzo vero (rx, rz, fu: _rimbalzo) e si scrive allora, o quando la palla non può
    // più rimbalzare (_forseChiudi); il tempo (t) e la partita (n) restano quelli del colpo
    this._apri(this._fai('colpo', {
      // voluto: solo se il gesto è davvero diverso (revisione: 'TOPSPIN' contro 'topspin' finiva in tutti i colpi)
      ...(P ? {} : { amb }), chi: g === 'a' ? 'a' : undefined, gesto: O.shot || I.shot || null, ...(I.shot && O.shot && String(I.shot).toLowerCase() !== String(O.shot).toLowerCase() ? { voluto: I.shot } : {}),
      // la palla della CPU che arrivava: tipo di colpo (solo Leggenda: gli altri livelli non lo scelgono così),
      // velocità in km/h, altezza in m (serve a capire se i ritardi e le palle non prese dipendono dalla palla)
      // B31: e i colpi a rete della CPU, a tutti i livelli: «volée», «schiacciata», «palla corta» (natpfCpuShot)
      ...(P && pre && this._modo() === 'cpu' ? { in: [CPU_NET[E.natpfCpuShot?.kind] || (E.matchConfig?.difficulty === 'leggenda' ? E.natpfLegend?.lastPick?.kind || null : null), r(pre[0], 0), r(pre[1], 2)] } : {}),
      // errore di tempo in ms (+ anticipo, − ritardo) e voto; forza 0…1; direzione −1…+1 tra le righe
      ms: r(1000*L.timing, 0), voto: voto(O.grade), f: r(I.power, 2), d: r(O.aim, 2),
      e: O.weak ? 'debole' : O.failed ? (O.netFault ? 'rete' : 'fuori') : undefined, x: r(out.E, 1), z: r(out.N, 1),
      // colpo super: la palla che lo ha permesso, o perché non è scattato (solo con un gesto forte)
      ...(L.super ? { sup: String(L.super) } : forza >= .8 && Array.isArray(L.superWhy) && L.superWhy[0] ? { supNo: String(L.superWhy[0]) } : {}),
      // B31: rete 1 = colpo giocato entro 7 m dalla rete (chi gioca è salito a rete o ci è stato portato)
      // B32: mov = come si è arrivati sulla palla contro la CPU: 'corsa' (colpo in corsa) o 'allungo' (natpf_movement.moveTag)
      volee: L.volley || undefined, rete: Math.abs((L.who === 'p2' ? E.opponent : E.player)?.pos?.z ?? 99) < 7 ? 1 : undefined, mov: L.move || undefined, lato: L.contact ?? undefined, fonte: L.source === 'webcam' && P?.ctrl !== 'webcam' ? 'webcam' : undefined, causa: L.cause || undefined, aiutato: O.assisted || undefined,
      // B36.0 · direzione del colpo. pf: piatto letto dalla cima (−1…+1; solo i telefoni con la forma del colpo, non le
      // intenzioni ricostruite di webcam, mouse e telefoni vecchi); dv: scarto della cima dal proprio colpo abituale in
      // gradi (nullo finché il centro della mira non c'è); tu: tempo in unità della finestra della direzione (+ anticipo);
      // nr: colpo giocato con la regola nuova (natpf_direction.js: oggi mai); zp: zona chiesta da Precision
      ...(!I.derived && Number.isFinite(I.face) ? { pf: r(I.face, 2) } : {}), ...(Number.isFinite(dev) ? { dv: r(dev, 1) } : {}), ...(Number.isFinite(O.t) ? { tu: r(O.t, 2) } : {}),
      ...(usedNewRule(O) ? { nr: 1 } : {}), ...(zp != null ? { zp } : {}),
    }), L.who === 'p2' ? 'opponent' : 'player');
  }
  /* ---------- B36.0: il colpo aspetta il suo primo rimbalzo ---------- */
  // chi: chi ha colpito per il motore ('player' o 'opponent', come ball.lastHitter)
  _apri(row, chi){ this._chiudiColpo(); this._aperto = { row, chi, at: this.now() }; }
  _chiudiColpo(){ const A = this._aperto; if (!A) return; this._aperto = null; this._scrivi(A.row); }
  // la palla del colpo non può più rimbalzare per la prima volta (punto finito, palla ripresa, già rimbalzata): si scrive
  _forseChiudi(){
    const A = this._aperto, b = this.engine.ball;
    if (A && (!b || !b.inPlay || b.lastHitter !== A.chi || (b.bounceCountOnCurrentSide || 0) > 0)) this._chiudiColpo();
  }
  // anello del rimbalzo (x, z: dove la palla tocca terra): il primo rimbalzo della palla del colpo aperto (il motore
  // conta il rimbalzo subito dopo l'anello) dà rx, rz e, se è fuori per l'arbitro del motore, fu
  _rimbalzo(x, z){
    const A = this._aperto, b = this.engine.ball;
    if (!A || !b || b.lastHitter !== A.chi || (b.bounceCountOnCurrentSide || 0) > 0 || !Number.isFinite(x) || !Number.isFinite(z)) return;
    const suaMeta = A.chi === 'player' ? z > 0 : z <= 0;
    A.row.rx = r(x, 2); A.row.rz = r(z, 2);
    if (suaMeta || Math.abs(x) > LINEE.x || Math.abs(z) > LINEE.z) A.row.fu = 1;
    this._chiudiColpo();
  }
  // colpo con mouse e tastiera (modalità prova): dall'esito a schermo, senza racchetta virtuale
  onFeedback(e = {}){
    if (!this.on || this.ui?.controller !== 'mouse' || !/hit|fault/.test(e.kind || '')) return;
    const P = this.partita, amb = P ? undefined : this._ambiente(); if (!P && !amb) return;
    if (P) P.colpi++;
    this._riga('colpo', { ...(P ? {} : { amb }), gesto: e.shotType ? String(e.shotType).toLowerCase() : null, voto: voto(e.grade), e: /fault/.test(e.kind) ? 'fuori' : undefined });
  }
  // battuto: la palla è partita adesso (con la palla troppo bassa il motore non batte)
  _servizio(actor, before, battuto = true){
    const E = this.engine, P = this.partita, S = E.natpfLastServe;
    if (P && E.ball?.inPlay) P.inGiocoAt = this.now();
    if (!P) return;
    const umano = actor === E.player || E.isMultiplayer || E.versus?.active || E.natpfSplit?.active;
    if (!umano) return;
    // servizio senza il tempo del gesto (mouse, tastiera, webcam del Player 2…): il motore non dà tipo né voto, si
    // segna solo che c'è stato (i tentativi del servizio)
    if (!S || S === before){ if (battuto) this._riga('servizio', { chi: actor === E.player ? undefined : 'a', fonte: 'senza gesto' }); return; }
    this._riga('servizio', { chi: actor === E.player ? undefined : 'a', tipo: S.kind || null, q: r(S.q, 2), ms: r(1000*S.tau, 0), kmh: S.kmh ?? null, voto: voto(S.grade), ...(E.natpfAutoLive === 'serve' ? { auto: true } : {}) });
  }
  _vuoto(ps, perche){
    const E = this.engine, P = this.ui?.trial?.active ? null : this.partita, amb = P ? undefined : this._ambiente(); if (!P && !amb) return;
    const a = ps?.actor && (ps.actor === E.opponent || ps.actor === E.opponentPartner);
    this._riga('vuoto', { ...(P ? {} : { amb }), chi: a ? 'a' : undefined, perche: perche || ps?.natpfWhy || 'presto', ms: r(1000*ps?.lead, 0), f: r(ps?.strength, 0) });
  }

  /* ---------- tutorial, calibrazione, allenamento, minigiochi ---------- */
  _tutorial(T, chi, o){
    if (o.mode === 'review') return;                                          // «Rivedi i gesti»: non è il tutorial di un visitatore nuovo
    this.tut.set(T, { chi, t0: this.now(), serie: T.set || o.set || null, schede: T.cards?.length ?? null, da: T.state?.visited?.size || 0 });
  }
  _fineTutorial(T, s, reason, stato = T.state){
    this.tut.delete(T);
    const viste = stato?.visited?.size ?? null;
    // nello stesso schermo il tutorial si chiude sempre come «dal telefono», anche lasciando la pagina o con il telefono
    // caduto (natpf_split_ui._tutClose): lì è finito solo con tutte le schede viste (revisione)
    const finito = reason === 'phone' && (!s.meta || !!stato?.all);
    this._riga('tutorial', { chi: s.chi, serie: s.serie, schede: s.schede, viste, tutte: !!stato?.all, durS: r((this.now() - s.t0)/1000, 1),
      // finito: chiuso dal telefono con «Tutto chiaro» (o dalla X accesa); saltato: Esc sul computer; altro: chiosco, menu
      chiusura: finito ? 'finito' : reason === 'skip' ? 'saltato' : reason === 'phone' ? 'altro' : String(reason || 'altro') });
  }
  _cal(chi, e){
    let C = this.cal[chi];
    const inizio = e.kind === 'step' && e.step === 'still';
    if (!C){
      if (e.kind === 'done' || e.kind === 'idle' || e.kind === 'selection') return;
      C = this.cal[chi] = { t0: this.now(), prove: 0, fallite: 0, perche: {}, passi: {}, ripartenze: 0, revisioni: 0, revisioniNo: 0 };
    } else if (inizio && C.prove) C.ripartenze++;
    if (e.kind === 'attempt'){
      C.prove++; const passo = String(e.want || e.step || e.shot || 'gesto').slice(0, 24), S = C.passi[passo] || (C.passi[passo] = [0, 0]); S[0]++;
      if (!e.ok){ C.fallite++; S[1]++; const w = String(e.why || 'non riuscito').slice(0, 40); C.perche[w] = (C.perche[w] || 0) + 1; }
    }
    if (e.kind === 'review'){ C.revisioni++; if (!e.pass) C.revisioniNo++; }
    if (e.kind === 'done') this._fineCal(chi, true, !!e.profile?.simple);
  }
  _fineCal(chi, finita, semplice = false){
    const C = this.cal[chi]; if (!C) return; delete this.cal[chi];
    // profilo automatico senza nessun gesto chiesto (calibrazione di base «Giocando», ogni collegamento del telefono):
    // non è una calibrazione fatta da qualcuno, niente riga (revisione: gonfiava le calibrazioni «finite in 0 s»)
    if (!C.prove && semplice) return;
    // passi: per ogni gesto chiesto [prove, fallite]; perche: motivi dei gesti non riusciti
    this._riga('calibrazione', { chi, finita, durS: r((this.now() - C.t0)/1000, 1), prove: C.prove, fallite: C.fallite, passi: C.passi, perche: Object.keys(C.perche).length ? C.perche : undefined,
      ripartenze: C.ripartenze || undefined, revisioni: C.revisioni || undefined, revisioniNo: C.revisioniNo || undefined, semplice: semplice || undefined });
    if (finita && this.visita) this.visita.fatti++;
  }
  _fineProva(finita){
    const V = this.prv; if (!V) return; this.prv = null;
    this._chiudiColpo();
    const S = V.S, durS = r((this.now() - V.t0)/1000, 1);
    for (const id of Object.keys(S.players || {})){
      const res = S.result?.[id] || null, n = res?.n || {}, dr = n.forehand | 0, rv = n.backhand | 0;
      // prove: palle tirate a quel giocatore; passi: gesti imparati per lato [quanti, 0]; livello: quanto ha imparato
      this._riga('calibrazione', { chi: id === 'p2' ? 'a' : 'g', tipo: 'giocando', finita: finita && !!res, saltato: V.saltato || undefined, durS, prove: S.players[id]?.balls ?? null,
        colpi: dr + rv, passi: res ? { dritto: [dr, 0], rovescio: [rv, 0] } : undefined, livello: res?.level ? String(res.level).slice(0, 16) : undefined });
    }
    if (finita && this.visita) this.visita.fatti++;
  }
  _allenamento(o){
    if (!this.ui?.training?.active) return;
    if (this.att) this._fineAllenamento({ completed: false }, 'ripartito');
    if (this.partita) this._finePartita('abbandonata', 'menu');
    const T = this.ui.training;
    this.att = { t0: this.now(), tipo: o.diag ? 'prova guidata' : o.intro ? 'tutorial completo' : o.calOnly ? 'calibrazione' : o.drills ? 'riscaldamento' : 'allenamento', cal: !!T.cal };
  }
  _fineAllenamento(o = {}, come){
    const A = this.att; if (!A) return; this.att = null;
    this._chiudiColpo();
    const st = this.ui?.training?.stats || {};
    this._riga('allenamento', { tipo: A.tipo, finito: !!o.completed, saltato: o.skipped || undefined, durS: r((this.now() - A.t0)/1000, 1), colpi: st.shots || undefined, perfetti: st.perfect || undefined, come: come === 'fine' ? undefined : come, ...this._prendiScarti() });
    if (o.completed && this.visita) this.visita.fatti++;
  }
  _minigioco(gioco){ if (this.mini) this._fineMinigioco(false); if (this.partita) this._finePartita('abbandonata', 'menu'); this.mini = { t0: this.now(), gioco: String(gioco || '').slice(0, 24) }; }
  _fineMinigioco(finito, punti = null){
    const M = this.mini; if (!M) return; this.mini = null;
    this._chiudiColpo();
    // dir (B36.0): modello della direzione dei colpi del minigioco (Precision con «Classica» o con «Nuova»)
    this._riga('minigioco', { gioco: M.gioco, finito, punti: finito ? punti : undefined, durS: r((this.now() - M.t0)/1000, 1), dir: dirModelOf(this.engine), ...this._prendiScarti() });
    if (finito && this.visita) this.visita.fatti++;
  }

  /* ---------- collegamento dei telefoni ---------- */
  _telCambio(chi){
    const T = this.tel[chi]; if (!T) return;
    const ph = T.ph, st = ph.connected ? 'on' : ph.state?.state === 'lost' ? 'caduto' : 'off';
    if (st === T.stato) return;
    const prima = T.stato, now = this.now(); T.stato = st;
    if (st === 'on'){
      // la strada e il tipo di telefono arrivano un attimo dopo il collegamento: la riga si scrive al controllo dopo
      T.daScrivere = { at: now, stato: prima === 'caduto' ? 'ricollegato' : 'collegato', dopoS: prima === 'caduto' && T.cadutoAt != null ? r((now - T.cadutoAt)/1000, 1) : undefined };
      if (prima === 'caduto' && this.partita) this.partita.riprese++;
      T.visto = true;
    } else if (prima === 'on'){
      T.daScrivere = null;
      if (st === 'caduto'){ T.cadutoAt = now; if (this.partita) this.partita.cadute++; }
      this._riga('tel', { chi, stato: st === 'caduto' ? 'caduto' : 'scollegato', ...(this.partita ? { inPartita: true } : {}) });
      if (st === 'off') this._fineCal(chi, false);
    } else if (st === 'caduto') T.cadutoAt = T.cadutoAt ?? now;
  }
  _telRiga(chi){
    const T = this.tel[chi], D = T?.daScrivere; if (!D) return; T.daScrivere = null;
    this._riga('tel', { chi, stato: D.stato, dopoS: D.dopoS, ...(this._infoTel(chi) || {}), ...(this.partita ? { inPartita: true } : {}) });
  }

  /* ---------- errori ---------- */
  _errore(tipo, msg, file, riga, col){
    const key = `${String(msg).slice(0, 120)}|${base(file)}|${riga}`;
    let e = this.err.get(key);
    if (this.partita) this.partita.errori++;
    if (!e){
      if (this.err.size >= REGISTRO.maxErrori) return;
      e = { volte: 0 }; this.err.set(key, e);
    }
    e.volte++;
    // la prima volta, poi a 10, 100, 1000 ripetizioni: lo stesso errore non riempie il registro
    if (e.volte === 1 || e.volte === 10 || e.volte === 100 || e.volte === 1000) this._riga('errore', { tipo, msg: String(msg || 'errore senza testo').slice(0, 1000), file: base(file), riga: Number.isFinite(riga) ? riga : null, col: Number.isFinite(col) ? col : null, volte: e.volte });
  }

  /* ---------- controllo al secondo: dove si trova chi gioca, partita abbandonata, telefoni ---------- */
  _posto(){
    const ui = this.ui, L = ui?.lobby, T = ui?.training;
    if (this.partita) return 'partita';
    if (ui?.events?.active) return 'minigioco';
    if (this.tut.size || T?.tutorialOpen) return 'tutorial';
    if (ui?.trial?.active) return 'calibrazione';
    if (T?.active) return T.cal || this.cal.g ? 'calibrazione' : T.lesson ? 'tutorial' : 'allenamento';
    if (this.cal.g || this.cal.a) return 'calibrazione';
    if (L?.visible) return L.step === 'menu' ? 'menu' : `menu.${L.step}`;
    return this.engine.phase === 'MATCH_OVER' ? 'fine partita' : 'altro';
  }
  secondo(){
    if (!this.on) return;
    const a = this.now(), E = this.engine, P = this.partita;
    if (this._aperto && a - this._aperto.at > ATTESA_RIMBALZO_MS) this._chiudiColpo();
    // giorno nuovo a gioco acceso (stand aperto oltre la mezzanotte), a partita finita: giornata nuova
    this._cambioGiorno();
    if (P){
      // partita chiusa senza un punto (ritorno al menu, chiosco) o finita sul computer del Player 2
      if (E.phase === 'MATCH_OVER') this._finePartita('finita', 'fine');
      else if (E.autoPlayMode) this._finePartita('abbandonata', 'menu');
      else if (E.natpfPaused) P.pauseS++;
      for (const chi of ['g', 'a']){ const v = this.tel[chi]?.ph?.connected ? this.tel[chi].ph.state?.rtt : null; if (Number.isFinite(v)){ P.rttS += v; P.rttN++; if (v > P.rttMax) P.rttMax = v; } }
    }
    if (E.natpfPhone2) this._telefono(E.natpfPhone2, 'a');
    for (const chi of Object.keys(this.tel)){ this._telCambio(chi); if (this.tel[chi].daScrivere && this.now() - this.tel[chi].daScrivere.at >= 900) this._telRiga(chi); }
    // visita: da quando qualcuno lascia il menu principale a quando ci si torna
    const posto = this._posto();
    if (!this.visita && posto !== 'menu' && posto !== 'altro') this.visita = { t0: this.now(), posti: {}, partite: this.partita ? 1 : 0, fatti: 0, ultimo: posto };
    if (this.visita){
      if (posto === 'menu') this._fineVisita('menu');
      else { const V = this.visita, k = posto.startsWith('menu.') ? 'menu' : posto; V.posti[k] = (V.posti[k] || 0) + 1; V.ultimo = posto; }
    }
    this.invio?.tic();
    this._costo(a);
  }
  _fineVisita(come){
    const V = this.visita; if (!V) return; this.visita = null;
    for (const chi of Object.keys(this.cal)) this._fineCal(chi, false);
    const kiosk = this.now() - this._chiosco < 3000;
    // abbandono: nessuna partita, nessun allenamento o minigioco finito. dove: l'ultimo posto (menu · tutorial · calibrazione…)
    const u = V.ultimo || 'menu', dove = u.startsWith('menu') ? 'menu' : u;
    this._riga('visita', { durS: r((this.now() - V.t0)/1000, 0), partite: V.partite, posti: V.posti,
      ...(V.partite || V.fatti ? {} : { abbandono: dove, ...(u.startsWith('menu.') ? { pagina: u.slice(5) } : {}) }), come: kiosk ? 'chiosco' : come, ...this._prendiScarti() });
  }
}
