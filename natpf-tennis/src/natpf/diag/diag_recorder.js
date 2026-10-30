// Registratore della modalità diagnostica: durante una sessione raccoglie tutto quello che serve per capire cosa è
// successo tra il gesto e la risposta del gioco, senza toccare il gioco.
//   - Un solo orologio: performance.now() del computer, in ms dall'inizio della sessione (t). Il telefono ha il suo:
//     ogni suo istante viene portato su questo con lo scarto stimato dal collegamento, e gli scambi dell'orologio
//     (tel.orologio) restano nel registro per ricalcolarlo dopo (deriva compresa). Inizio anche in ora del giorno.
//   - Eventi in JSON Lines (eventi.jsonl), campioni grezzi del telefono a parte (telefono-sensori.jsonl), video della
//     webcam e del gioco (MediaRecorder): tutto scritto a pezzi su disco dal worker (diag_store.js), ogni 0,5 s.
//     In memoria resta solo l'ultimo mezzo secondo: le sessioni lunghe non rallentano e non riempiono la RAM.
//   - Agganci leggeri installati una volta: se non si registra costano un confronto.
//   - Rotazione: una registrazione lunga continua da sola in una parte nuova ogni 30 minuti o oltre 1 GB (stesso
//     orologio, parti collegate tra loro), così ogni parte resta un pacchetto completo da scaricare e da analizzare.
//   - Spazio: ogni 10 s si controlla lo spazio libero del browser; sotto 200 MB si fermano i video (in 10 s ne scrivono al
//     massimo ~4 MB), sotto 50 MB anche i campioni del telefono, sotto 20 MB la registrazione si chiude da sola, prima
//     che le scritture falliscano. Niente si cancella da solo.
// Tipi di evento (k): fase, palla, rimbalzo, punto, tentativo, colpo.gioco, racchetta, piano, servizio, vuoto, input,
// tel.colpo, tel.cal, tel.stato, tel.orologio, tel.link, tel.scartato, tel.prep, tel.dispositivo, webcam.frame, webcam.evento,
// webcam.camera, webcam.ritmo, webcam.carico, webcam.stato, webcam.modello, webcam.riapertura, webcam.pausa, webcam.ripresa, tel.pausa, tel.ripresa,
// prestazioni, video, video.frame, sfida.collegamento, tel.strada, tel2.strada, sfida.strada,
// atteso, marca, avviso.
import { latencyShift, eventLatency, swingTiming } from '../natpf_skill.js';
import { shotDirection } from './diag_metrics.js';
import { NATPF_BUILD } from '@natpf/tennis/version.js';

export const DIAG_VERSION = 1;
const FLUSH_MS = 500, BACKLOG_LIMIT = 24*1024*1024, BALL_PHASES = new Set(['SERVE_TOSS', 'RALLY', 'POINT_OVER']);
const MB = 1024*1024;
export const ROTATE_MS = 30*60*1000, ROTATE_BYTES = 1024*MB;
export const FREE_VIDEO = 200*MB, FREE_RAW = 50*MB, FREE_STOP = 20*MB;
const enc = new TextEncoder();
const r = (v, d = 2) => (Number.isFinite(v) ? +v.toFixed(d) : null);
const vec = (v, d = 2) => (v ? [r(v.x, d), r(v.y, d), r(v.z, d)] : null);
const pick = (o, keys) => { const out = {}; for (const k of keys) if (o?.[k] !== undefined && (typeof o[k] !== 'object' || o[k] === null)) out[k] = o[k]; return out; };
export const newSessionId = (d = new Date()) => `${d.toISOString().replace(/[-:]/g, '').replace(/\..*/, '').replace('T', '-')}-${Math.random().toString(36).slice(2, 6)}`;
export function pickVideoMime(MR = globalThis.MediaRecorder){
  if (!MR?.isTypeSupported) return null;
  return ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(m => MR.isTypeSupported(m)) || null;
}

export class DiagRecorder {
  constructor({ engine, ui = null, store = null, now = () => performance.now(), wallNow = () => Date.now() } = {}){
    this.engine = engine; this.ui = ui; this.store = store; this.now = now; this.wallNow = wallNow;
    this.active = false; this.id = null; this.events = []; this.rawBuf = []; this.listeners = new Set();
    this.counts = { eventi: 0, campioni: 0, byte: 0, persi: 0 };
    this._installed = false;
    // regolabili (prove): durata e dimensione di una parte, intervallo del controllo dello spazio; autoStop: chi chiude
    // la registrazione quando lo spazio finisce (il pannello, per mostrare il riassunto); notify: avvisi per chi gioca
    this.rotateMs = ROTATE_MS; this.rotateBytes = ROTATE_BYTES; this.spaceEveryMs = 10000; this.autoStop = null; this.notify = null;
    this._videoGen = 0;
  }
  onChange(fn){ this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _changed(){ for (const fn of this.listeners) try { fn(this); } catch (e){ console.error(e); } }
  get t(){ return +(this.now() - this.t0).toFixed(1); }
  // un evento: { t, k, …campi }. Solo dati semplici (numeri, stringhe, array brevi)
  log(k, data = {}){ if (!this.active) return; this.events.push({ t: this.t, k, ...data }); this.counts.eventi++; }
  warn(codice, testo, extra = {}){
    if (!this.active) return;
    const last = this._warned?.[codice];
    if (last != null && this.now() - last < 10000) return;                        // lo stesso avviso al massimo ogni 10 s
    (this._warned ||= {})[codice] = this.now();
    this.log('avviso', { codice, testo, ...extra });
  }
  mark(testo = 'segno'){ this.log('marca', { testo: String(testo).slice(0, 120) }); this._changed(); }

  /* ---------- sessione ---------- */
  async start({ webcamVideo = true, gameVideo = true, phoneSamples = true, label = '', protocol = null } = {}){
    if (this.active) return this.id;
    if (!this.store) throw new Error('magazzino non pronto');
    this._install();
    const E = this.engine, ph = E.natpfPhone, ui = this.ui;
    this.id = newSessionId(new Date(this.wallNow())); this.t0 = this.now(); this.startedWall = this.wallNow();
    this.events = []; this.rawBuf = []; this.counts = { eventi: 0, campioni: 0, byte: 0, persi: 0 }; this._warned = {};
    // reg: ms al secondo spesi dal registratore sul thread del gioco (serializzazione, campioni della palla): il suo costo
    this.videos = []; this.perf = { frames: [], upd: [], ren: [], last: null, longTasks: 0, reg: 0, flushMax: 0, at: this.now() };
    this.lastPhase = null; this.lastHitter = null; this.lastInputSide = null; this.lastStato = null;
    // parti: la prima ha lo stesso id del gruppo; videoOff: video fermati per lo spazio (non ripartono nelle parti dopo)
    this.part = 1; this.partT0 = this.t0; this._countsAtPart = { ...this.counts }; this._spaceAt = -Infinity; this.freeMB = null; this.videoOff = null;
    const controller = ui?.controller || null, transport = ph?.link?.transport || null;
    this.meta = {
      id: this.id, versione: DIAG_VERSION, build: NATPF_BUILD, startedAt: this.startedWall, inizio: new Date(this.startedWall).toISOString(), label: String(label || '').slice(0, 80),
      controller, transport, protocol: protocol?.id || null,
      origineMs: typeof performance !== 'undefined' ? performance.timeOrigin + this.t0 : null,
      browser: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      schermo: typeof screen !== 'undefined' ? { w: screen.width, h: screen.height, dpr: globalThis.devicePixelRatio || 1 } : null,
      cpu: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || null : null,
      gpu: this._gpu(),
      gioco: { difficolta: E.matchConfig?.difficulty || null, mano: ui?.hand?.hand || null, presa: ph?.grip || null, formato: E.matchFormat?.id || null, ritardoSchermoMs: ph?.displayLagMs ?? 0 },
      store: this.store.kind, parte: 1, gruppo: this.id,
    };
    await this.store.open(this.id, this.meta);
    this.active = true;
    this.log('sessione', { ...this.meta, gpu: undefined });
    // telefono: campioni grezzi (il telefono li manda solo se la diagnostica li chiede)
    this.phoneSamples = !!phoneSamples;
    if (ph && phoneSamples){ ph.diagStream = true; ph.link?.send({ t: 'cfg', prep: 1, mo: 1, diag: 1 }); }
    this._phoneStato(true);
    if (ph?.profile) this.log('tel.profilo', { profilo: ph.profile, mano: ph.hand || null, liftBaseline: ph.liftBaseline ?? null });
    if (ph?.device) this.log('tel.dispositivo', ph.device);
    if (E.natpfP2p?.active) this._p2p(E.natpfP2p);
    // strade già scelte prima dell'inizio della registrazione (poi solo i cambi)
    if (E.natpfP2p?.route) this.log('sfida.strada', this._route(E.natpfP2p.route, { modo: E.natpfP2p.mode || null }));
    if (ph?.link?.route) this.log('tel.strada', this._route(ph.link.route));
    if (E.natpfPhone2?.link?.route) this.log('tel2.strada', this._route(E.natpfPhone2.link.route));
    // webcam già accesa: camera chiesta e ottenuta, livello del modello delle mani (motion_controls.webcamInfo)
    const mc0 = E.motionController;
    if (mc0?.webcamActive && mc0.webcamInfo) this.log('webcam.camera', { ...mc0.webcamInfo, livello: mc0._wcLevel?.().id ?? mc0.webcamInfo.livello });
    // scrittura a pezzi e misure al secondo
    this._flushT = setInterval(() => this.flush(), FLUSH_MS);
    this._secT = setInterval(() => this._second(), 1000);
    this._loop();
    if (webcamVideo) await this._startCamera().catch(e => this.warn('video-webcam', `video della webcam non registrato: ${e?.message || e}`));
    if (gameVideo) this._startGameVideo();
    this._changed();
    return this.id;
  }
  async stop(){
    if (!this.active || this._stopping) return null;
    this._stopping = true;
    try {
      await this._rotation?.catch(() => {});               // una parte nuova in apertura finisce prima
      const E = this.engine, ph = E.natpfPhone;
      for (const v of this.videos) v.stop();
      await Promise.all(this.videos.map(v => v.done.catch(() => {})));
      this._videoGen++;
      this._second();
      this.log('sessione.fine', { durataS: r((this.now() - this.partT0)/1000, 1), parte: this.part, durataTotaleS: r((this.now() - this.t0)/1000, 1), conteggi: this._partCounts() });
      clearInterval(this._flushT); clearInterval(this._secT); cancelAnimationFrame(this._raf);
      if (this._ownCamera){ for (const tr of this._ownCamera.getTracks()) tr.stop(); this._ownCamera = null; }
      if (this._ownVideo){ this._ownVideo.remove(); this._ownVideo = null; }
      if (ph && this.phoneSamples){ ph.diagStream = false; ph.link?.send({ t: 'cfg', prep: 1, mo: 1, diag: 0 }); }
      await this.flush(true);
      this.active = false;
      const meta = await this.store.close(this.id, { durationS: r((this.now() - this.partT0)/1000, 1), endedAt: this.wallNow(), counts: this._partCounts(), videos: this.videos.map(v => v.info) });
      const id = this.id; this._changed();
      return { id, meta, parts: this.part, gruppo: this.meta.gruppo };
    } finally { this._stopping = false; }
  }
  _partCounts(){ const c = {}; for (const k of Object.keys(this.counts)) c[k] = this.counts[k] - (this._countsAtPart?.[k] || 0); return c; }
  _partBytes(){ return this.counts.byte - (this._countsAtPart?.byte || 0) + this.videos.reduce((a, v) => a + (v.info.byte || 0), 0); }
  // parte nuova: la registrazione continua senza buchi. Video fermati con gli ultimi pezzi scritti, eventi fino a qui
  // nella parte che si chiude, poi stessa registrazione con un id nuovo (gli eventi arrivati nel frattempo restano in
  // memoria e finiscono nella parte nuova) e video ripartiti sullo stesso flusso della webcam
  _rotate(){ return this._rotation || (this._rotation = this._doRotate().finally(() => { this._rotation = null; })); }
  async _doRotate(){
    if (!this.active || this._stopping) return;
    const prev = this.id, kinds = this.videos.filter(v => !v.stopped).map(v => v.kind);
    for (const v of this.videos) v.stop();
    await Promise.all(this.videos.map(v => v.done.catch(() => {})));
    this._videoGen++;
    const next = newSessionId(new Date(this.wallNow())), cut = this.now(), tCut = r(cut - this.t0, 1);
    // fine di questa parte e inizio della prossima allo stesso istante
    this.log('sessione.fine', { t: tCut, durataS: r((cut - this.partT0)/1000, 1), parte: this.part, prossima: next, conteggi: this._partCounts() });
    const closing = { durationS: r((cut - this.partT0)/1000, 1), endedAt: this.wallNow(), counts: this._partCounts(), videos: this.videos.map(v => v.info), prossima: next };
    this._cutting = true;                                   // il salvataggio periodico aspetta la parte nuova
    try {
      await this.flush(true);
      await this.store.close(prev, closing);
      this.id = next; this.part++; this.partT0 = cut; this._countsAtPart = { ...this.counts }; this.videos = [];
      this.meta = { ...this.meta, id: next, parte: this.part, precedente: prev, startedAt: this.wallNow(), inizio: new Date(this.wallNow()).toISOString(), tInizioMs: r(cut - this.t0, 1) };
      await this.store.open(next, this.meta);
      this.events.unshift({ t: tCut, k: 'sessione', ...this.meta, gpu: undefined }); this.counts.eventi++;
    } finally { this._cutting = false; }
    if (this.videoOff || this._stopping) return;
    if (kinds.includes('webcam')) await this._startCamera().catch(e => this.warn('video-webcam', `video della webcam non ripartito: ${e?.message || e}`));
    if (kinds.includes('gioco')) this._startGameVideo();
    this._changed();
  }
  // spazio libero del browser (non c'è nel magazzino in memoria, che ha il suo limite)
  async _checkSpace(){
    if (this.store?.kind !== 'disk') return;
    const est = await globalThis.navigator?.storage?.estimate?.().catch(() => null);
    if (!this.active || !Number.isFinite(est?.quota) || !Number.isFinite(est?.usage)) return;
    const free = est.quota - est.usage, mb = this.freeMB = Math.round(free/MB);
    if (free < FREE_STOP){ this.warn('spazio', `spazio su disco finito (${mb} MB liberi): registrazione chiusa`, { liberoMB: mb }); await (this.autoStop ? this.autoStop() : this.stop()); return; }
    if (free < FREE_RAW && this.phoneSamples){
      const ph = this.engine.natpfPhone;
      this.phoneSamples = false; if (ph){ ph.diagStream = false; ph.link?.send({ t: 'cfg', prep: 1, mo: 1, diag: 0 }); }
      this.warn('spazio-campioni', `spazio su disco quasi finito (${mb} MB liberi): fermati anche i campioni del telefono`, { liberoMB: mb });
      this.notify?.('Diagnostica: spazio su disco quasi finito, fermati i campioni del telefono');
    }
    if (free < FREE_VIDEO && !this.videoOff && this.videos.some(v => !v.stopped)){
      this.videoOff = 'spazio'; this._videoGen++;
      for (const v of this.videos) v.stop();
      this.warn('spazio-video', `spazio su disco quasi finito (${mb} MB liberi): video fermati, il registro continua`, { liberoMB: mb });
      this.notify?.('Diagnostica: spazio su disco quasi finito, video fermati (il registro continua)');
    }
  }
  // scrittura a pezzi: righe JSON, cedute al worker. Se il disco resta indietro (coda oltre 24 MB) si saltano i
  // campioni grezzi del telefono di questo giro, e lo si annota
  async flush(final = false){
    if (!this.store || !this.id || (this._cutting && !final)) return;
    const ev = this.events, raw = this.rawBuf;
    this.events = []; this.rawBuf = [];
    const jobs = [];
    if (ev.length) jobs.push(this._write('eventi.jsonl', ev));
    if (raw.length){
      if (!final && this.store.backlog > BACKLOG_LIMIT){ this.counts.persi += raw.length; this.warn('coda', 'il disco resta indietro: saltati campioni del telefono', { persi: raw.length }); }
      else jobs.push(this._write('telefono-sensori.jsonl', raw));
    }
    await Promise.all(jobs).catch(e => { this.warn('scrittura', `scrittura su disco non riuscita: ${e?.message || e}`); });
  }
  _write(name, rows){
    const a = this.now();
    let s = ''; for (const o of rows) s += JSON.stringify(o) + '\n';
    const b = enc.encode(s); this.counts.byte += b.byteLength;
    if (this.perf){ const d = this.now() - a; this.perf.reg += d; this.perf.flushMax = Math.max(this.perf.flushMax || 0, d); }
    return this.store.append(this.id, name, b.buffer);
  }

  /* ---------- agganci (una volta sola) ---------- */
  _install(){
    if (this._installed) return; this._installed = true;
    const E = this.engine, R = this;
    // motore: durata di aggiornamento e disegno, palla, fase, chi ha colpito
    const upd = E.update.bind(E);
    E.update = function(dt){ if (!R.active) return upd(dt); const a = R.now(); const out = upd(dt), b = R.now(); R.perf.upd.push(b - a); R._afterUpdate(); R.perf.reg += R.now() - b; return out; };
    const ren = E.render.bind(E);
    E.render = function(...a){ if (!R.active) return ren(...a); const s = R.now(); const out = ren(...a); R.perf.ren.push(R.now() - s); return out; };
    const wrap = (name, fn) => { const orig = E[name]; if (typeof orig !== 'function') return; E[name] = function(...a){ return R.active ? fn.call(this, orig.bind(this), ...a) : orig.apply(this, a); }; };
    wrap('_spawnBounceRing', function(orig, x, z){ R.log('rimbalzo', { x: r(x), z: r(z), da: E.ball?.lastHitter || null, n: E.ball?.bounceCountOnCurrentSide ?? null }); return orig(x, z); });
    wrap('_awardPoint', function(orig, winner, why = ''){
      const out = orig(winner, why);
      R.log('punto', { vince: winner, motivo: String(why || ''), punteggio: [E.score?.playerPoints, E.score?.opponentPoints, E.score?.playerGames, E.score?.opponentGames], allenamento: !!R.ui?.training?.active, sfida: !!R.ui?.events?.active });
      return out;
    });
    // tentativo di colpo del giocatore: distanza palla–giocatore lungo il campo al momento dello swing (prima della
    // correzione della latenza), correzione applicata, velocità della palla; l'esito arriva con colpo.gioco
    // tauMs (solo telefono): tempo del colpo rispetto all'impatto ideale come lo calcola il motore (positivo = anticipo,
    // negativo = ritardo); è anche quello che sposta la direzione della palla (natpf_skill.swingLandingX)
    wrap('_attemptPlayerRallyStrike', function(orig, e = {}, t){
      const b = E.ball, p = E.player;
      const info = b && p ? { dz: r(b.pos.z - p.pos.z), dx: r(b.pos.x - p.pos.x), y: r(b.pos.y), vz: r(b.vel.z), shift: r(latencyShift(e, b.vel.z), 3), lat: r(e?.natpf?.latency, 3), fonte: e?.source || null } : {};
      if (b && p && !t && e?.natpf?.aim === 'swing' && !e.timing){
        const g = (b.pos.z - p.pos.z) - latencyShift(e, b.vel.z);
        info.tauMs = r(1000*(e.sweetSpotAssisted ? (+e.natpfLead || 0) + eventLatency(e) : swingTiming(g, b.vel.z)), 1);
        info.assistito = !!e.sweetSpotAssisted;
      }
      const out = orig(e, t);
      R.log('tentativo', { ...info, colpito: !!out, auto: !!t });
      return out;
    });
    // racchetta virtuale (docs/NATPF_RACCHETTA_VIRTUALE.md): esito deterministico del colpo (intenzione, tempo, qualità,
    // dove va e perché), piano d'intercetto (rimbalzo, volée, schiacciata al volo, palla lasciata andare, corsa),
    // servizio dal gesto e colpi a vuoto con il motivo
    wrap('_natpfRacketShot', function(orig, ...a){
      const out = orig(...a), L = E.natpfLastRacket, I = L?.intent || {}, O = L?.out || {};
      // n: numero del colpo del telefono (lega l'esito al gesto, evento tel.colpo); tempo: posizione nella finestra
      // della direzione, −1…+1 (+ anticipo: incrociato, − ritardo: lungolinea), oltre ±1 l'eccesso. È l'unico esito
      // registrato della racchetta (prima anche un campo racchetta in colpo.gioco, solo per chi gioca qui)
      if (out && L) R.log('racchetta', { chi: L.who || null, n: L.seq ?? null, voluto: I.shot || null, colpo: O.shot || null, forza: r(I.power, 3), profondita: r(I.depth, 3), piatto: r(I.face, 3), ricavato: !!I.derived,
        tempoMs: r(1000*L.timing, 1), tempo: r(O.t, 3), oltre: r(O.excess, 3), qualita: r(O.q, 3), assistito: !!O.assisted, fallito: !!O.failed, rete: !!O.netFault,
        // a rete con il tempo perfetto: palla debole invece dell'errore; pressione degli scambi lunghi; causa del colpo
        // debole o fallito («in corsa», «in allungo», «palla veloce», «senza preparazione», «scambio lungo»)
        debole: !!O.weak, pressione: r(L.pressure, 3), causa: L.cause || null,
        x: r(out.E), z: r(out.N), volee: !!L.volley, lato: L.contact ?? null, voto: O.grade || null,
        // colpo super potente: la palla che lo ha permesso (alta, lenta, corta, schiacciata), o perché no (gesti forti)
        super: L.super || null, ...(!L.super && I.power >= .8 && Array.isArray(L.superWhy) ? { superNo: L.superWhy[0] } : {}),
        // direzione calcolata: mira (−1…+1 tra le righe, 0 il punto neutro), punto neutro e posizione della palla
        // all'impatto (riferimento di chi colpisce), assistenza (0…1); traiettoria: volo (s), altezza sulla rete, effetto
        mira: r(O.aim, 3), neutro: r(O.x0), palla: r(L.hitX), aiuto: r(O.assist, 2), volo: r(L.flight, 3), rete_m: r(O.clear, 2), effetto: r(O.topspin, 1) });
      return out;
    });
    // tc: secondi da adesso all'impatto previsto (prima si chiamava t e copriva l'istante dell'evento)
    const plan = (who, P) => P && P.at === E.elapsedTime && R.log('piano', { chi: who, tipo: P.kind || null, contatto: P.contact ? [r(P.contact.x), r(P.contact.y), r(P.contact.z)] : null, tc: r(P.t, 3), corsa: r(P.stretch, 3) });
    wrap('_natpfPlanPlayer', function(orig, ...a){ const out = orig(...a); if (!E.isDoubles) plan('giocatore', E.natpfPlan); return out; });
    wrap('_natpfPlanOpponent', function(orig, ...a){ const out = orig(...a); if (E.isMultiplayer && !E.isDoubles) plan('p2', E.natpfPlanP2); return out; });
    wrap('_executeServeHit', function(orig, a, ...rest){
      const before = E.natpfLastServe, out = orig(a, ...rest), S = E.natpfLastServe;
      if (S && S !== before) R.log('servizio', { chi: a === E.player ? 'giocatore' : E.isMultiplayer ? 'p2' : 'cpu', tipo: S.kind || null, qualita: r(S.q, 3), ritmo: r(S.pace, 3), tauMs: r(1000*S.tau, 1), x: r(S.x), profondita: r(S.depth), kmh: S.kmh ?? null, voto: S.grade || null });
      return out;
    });
    wrap('_natpfEarlyWhiff', function(orig, ps = {}){
      R.log('vuoto', { perche: ps.natpfWhy || 'presto', anticipoMs: r(1000*ps.lead, 1), forza: r(ps.strength, 0) });
      return orig(ps);
    });
    // gesto debole in anticipo che non ha colpito (natpf_impact.WEAK): nessuno swing a schermo, solo qui
    wrap('_natpfWeakDropped', function(orig, ps = {}){
      R.log('vuoto', { perche: 'debole', anticipoMs: r(1000*ps.lead, 1), forza: r(ps.strength, 0), n: ps.evt?.natpf?.seq ?? null });
      return orig(ps);
    });
    const mc = E.motionController;
    if (mc?.on){
      const inp = tipo => s => {
        R.lastInputSide = s?.side || R.lastInputSide;
        R.log('input', { tipo, fonte: s?.source || null, lato: s?.side || null, colpo: s?.shotType || null, speed: r(s?.speed), dirX: r(s?.dirX), dirY: r(s?.dirY), ruolo: s?.role || null });
      };
      mc.on('swing', inp('swing')); mc.on('toss', inp('toss'));
    }
    // webcam: aggancio del tracciamento (motion_controls.onTrack), se il controller lo offre
    if (mc){
      const prev = mc.onTrack;
      mc.onTrack = d => { prev?.(d); if (R.active) R._webcam(d); };
    }
    const ph = E.natpfPhone;
    if (ph){
      ph.onSwing?.((ev, s) => R.active && R._phoneSwing(ev, s));
      ph.onDropped?.((why, s) => R.active && R._phoneSwing({ ignored: why, natpf: {} }, s));
      ph.onRaw?.(k => R.active && R.phoneSamples && R._phoneRaw(k));
      ph.onCal?.(e => {
        if (!R.active) return;
        R.log('tel.cal', pick(e, ['kind', 'step', 'idx', 'globalIdx', 'ok', 'why', 'want', 'dir', 'pass', 'stage', 'lift', 'strength', 'shot']));
        // profilo della calibrazione: serve a rianalizzare i campioni grezzi con il rilevatore (replay-recording.mjs)
        if (e.kind === 'done' && e.profile) R.log('tel.profilo', { profilo: e.profile, mano: ph.hand || null });
      });
      ph.onChange?.(() => R.active && R._phoneStato());
      ph.onDiag?.((kind, d) => R.active && R._phoneDiag(kind, d));
    }
    // sfida un amico senza server (natpf_p2p.js): stato del collegamento tra i due computer e, se il canale diretto non
    // si apre, perché (stato ICE e candidati di questo computer)
    E.natpfP2p?.onStatus?.(s => R.active && R._p2p(s));
    // strada scelta tra i due computer (tipi dei candidati, protocollo, TURN nostro o no): all'apertura e a ogni cambio
    E.natpfP2p?.onRoute?.(r => R.active && R.log('sfida.strada', R._route(r, { modo: r.modo || E.natpfP2p.mode || null })));
    if (typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes?.includes('longtask')){
      try { new PerformanceObserver(list => { if (R.active) R.perf.longTasks += list.getEntries().length; }).observe({ type: 'longtask', buffered: false }); } catch {}
    }
  }
  // il collegamento del telefono nasce dopo: i suoi eventi si agganciano quando c'è
  _hookLink(){
    const link = this.engine.natpfPhone?.link;
    if (!link || link === this._link) return;
    this._link = link;
    link.on?.('clock', c => this.active && this.log('tel.orologio', { d: r(c.d - this.t0, 1), p: r(c.p, 1), r: r(c.r - this.t0, 1) }));
    // strada del collegamento con il telefono (link.js, ice-route.js): passa da un TURN? quale, con che protocollo
    link.on?.('route', rt => this.active && this.log('tel.strada', this._route(rt)));
    link.on?.('state', st => {
      if (!this.active) return;
      const visibile = st.vis == null ? null : st.vis !== 0, schermo = st.wk == null ? null : st.wk === 1 ? 'acceso' : st.wk === -1 ? 'non supportato' : 'non garantito';
      if (visibile === false) this.warn('telefono-nascosto', 'la pagina del telefono è andata in secondo piano (schermo spento o altra app)');
      if (schermo && schermo !== 'acceso') this.warn('schermo-telefono', `blocco dello schermo del telefono ${schermo}: lo schermo può spegnersi`);
      const key = `${visibile}|${schermo}|${st.s}`;
      if (key !== this._stKey){ this._stKey = key; this._phoneStato(true, { visibile, schermo }); }
    });
  }

  /* ---------- sorgenti ---------- */
  // strada del collegamento (ice-route.js, routeSummary): locale e remoto host | srflx | prflx | relay, protocollo,
  // relay (udp, tcp, tls verso il TURN), rtt in ms, server del candidato locale, nostro (TURN di Cloudflare)
  _route(rt, extra = {}){ return { ...pick(rt, ['locale', 'remoto', 'protocollo', 'relay', 'rtt', 'server', 'nostro', 'turn']), ...extra }; }
  _p2p(s){ this.log('sfida.collegamento', { modo: s.mode || null, stato: s.status || null, errore: s.error || null, bloccati: s.blocked || 0, dettaglio: s.detail || null, stanza: s.roomId || null }); }
  _phoneStato(force = false, extra = {}){
    const ph = this.engine.natpfPhone, L = ph?.link?.L || ph?.state || {};
    this._hookLink();
    const s = { collegamento: L.state || 'off', telefono: L.phone || null, rtt: L.rtt ?? null, hz: L.hz ?? null, presa: L.grip || null, ...extra };
    const key = JSON.stringify([s.collegamento, s.telefono, s.presa, extra.visibile, extra.schermo]);
    if (!force && key === this.lastStato) return;
    this.lastStato = key; this.log('tel.stato', s);
  }
  // kind: 'tel.colpo' (telefono di chi gioca qui) o 'tel2.colpo' (secondo telefono, Player 2 dello stesso schermo)
  _phoneSwing(ev, s, kind = 'tel.colpo'){
    const n = ev?.natpf || {}, t0s = this.t0/1000;
    const total = Number.isFinite(s?.receivedAt) && Number.isFinite(s?.at) ? (s.receivedAt - s.at)*1000 : null;
    const det = Number.isFinite(s?.detectMs) ? s.detectMs : null, hold = Number.isFinite(s?.holdMs) ? s.holdMs : 0;
    this.log(kind, {
      n: s?.seq ?? null, via: s?.path || null, scartato: ev?.ignored || null,
      lato: ev?.side || null, tipo: n.shot || null, perche: Array.isArray(n.why) ? n.why.join(' · ').slice(0, 160) : null,
      mira: r(n.wrist, 3), fonteMira: n.aimSource || null, scarto: r(n.aimDev, 1), conf: r(n.conf), v: r(n.v, 3), move: r(n.move, 3), head: r(n.head, 3),
      picco: Number.isFinite(s?.at) ? r(s.at*1000 - t0s*1000, 1) : null, arrivo: Number.isFinite(s?.receivedAt) ? r(s.receivedAt*1000 - this.t0, 1) : null,
      rilevamento: det, attesa: hold, totale: r(total, 1), consegna: total != null && det != null ? r(Math.max(0, total - det - hold), 1) : null,
      hz: s?.sampleHz ?? null, potenza: r(s?.power), lift: r(s?.lift, 3), dir: s?.dir ?? null, heading: r(s?.heading, 1),
      piatto: s?.face ? [r(s.face.yaw, 1), r(s.face.pitch, 1), r(s.face.roll, 1)] : null,
      // racchetta virtuale: velocità al picco (°/s), ampiezza (gradi), forma del gesto misurata dal telefono
      // (stroke-shape.js) e intenzione letta dal computer (natpf_stroke_intent.js); null con i telefoni di prima
      pk: s?.peak ?? null, ampiezza: r(s?.angle, 1),
      forma: s?.shape ? { piano: r(s.shape.plane, 3), salita: r(s.shape.rise, 3), polso: r(s.shape.roll, 3), manico: r(s.shape.tilt, 3), testa: r(s.shape.head, 2), mano: r(s.shape.hand, 2) } : null,
      intenzione: n.intent ? { tipo: n.intent.shot, conf: r(n.intent.conf), forza: r(n.intent.power, 3), portata: r(n.intent.reach, 3), profondita: r(n.intent.depth, 3), piatto: r(n.intent.face, 3), abituale: r(n.intent.riseRef, 3) } : null,
    });
    if (ev?.side && kind === 'tel.colpo') this.lastInputSide = ev.side;
  }
  // Secondo telefono (Player 2 dello stesso schermo): colpi e, ogni secondo, stato e collegamento (prima non si registrava
  // niente: diagnostica del 29/10, partita ferma 16 s per il P2 senza una riga che dicesse perché)
  _phone2(){
    const E = this.engine, p2 = E.natpfPhone2;
    if (!p2) return;
    if (p2 !== this._p2Hooked){
      this._p2Hooked = p2; this._p2Logged = null;
      p2.onSwing?.((ev, s) => this.active && this._phoneSwing(ev, s, 'tel2.colpo'));
      // anche telefono e browser, calibrazione, profilo e gesti scartati del P2 (diagnostica 191023: iPhone come P2 con
      // dritto e rovescio invertiti e nessuna riga che dicesse quale telefono fosse né come era calibrato)
      p2.onCal?.(e => {
        if (!this.active) return;
        this.log('tel2.cal', pick(e, ['kind', 'step', 'idx', 'globalIdx', 'ok', 'why', 'want', 'dir', 'pass', 'stage', 'lift', 'strength', 'shot']));
        if (e.kind === 'done' && e.profile) this.log('tel2.profilo', { profilo: e.profile, mano: p2.hand || null });
      });
      p2.onDiag?.((kind, d) => this.active && this._phoneDiag(kind, d, 'tel2'));
    }
    // strada del collegamento del secondo telefono (il suo link nasce quando si apre il QR)
    if (p2.link && p2.link !== this._p2RouteLink){
      this._p2RouteLink = p2.link;
      p2.link.on?.('route', rt => this.active && this.log('tel2.strada', this._route(rt)));
    }
    // profilo e dispositivo già noti all'inizio della registrazione (una volta per telefono)
    if (this._p2Logged !== p2.link && (p2.profile || p2.device)){
      this._p2Logged = p2.link;
      if (p2.profile) this.log('tel2.profilo', { profilo: p2.profile, mano: p2.hand || null });
      if (p2.device) this.log('tel2.dispositivo', p2.device);
    }
    if (!p2.link || (!E.natpfSplit?.active && !p2.connected)) return;
    const L = p2.state || {}, st = p2.link.stats?.() || {}, R8 = Object.entries(st.rates || {});
    this.log('tel2.link', { collegamento: L.state || 'off', telefono: L.phone || null, visibile: L.vis ?? null, sensoriTelefonoMs: L.sensorAge ?? null, segnaleMs: Number.isFinite(L.beatAt) ? Math.round(performance.now() - L.beatAt) : null,
      rtt: r(st.rtt, 1), hz: Object.fromEntries(R8.map(([k, v]) => [k, v.hz])), gap: Object.fromEntries(R8.filter(([, v]) => v.gap != null).map(([k, v]) => [k, v.gap])) });
  }
  // dal telefono: gesto scartato sul telefono con il motivo (rientro, debole, corto, verso, in rientro, orientamento,
  // fase …), preparazione, segno toccato sul telefono, telefono e browser. picco: istante del gesto sull'orologio del
  // registro (ms), come in tel.colpo
  _phoneDiag(kind, d = {}, who = 'tel'){
    const picco = Number.isFinite(d.at) ? r(d.at*1000 - this.t0, 1) : null;
    if (kind === 'scartato') this.log(`${who}.scartato`, { perche: d.why || null, pk: d.peak ?? null, ampiezza: d.angle ?? null, dir: d.dir ?? null, picco });
    else if (kind === 'prep') this.log(`${who}.prep`, { dir: d.dir ?? null, pk: d.peak ?? null, ampiezza: d.angle ?? null, picco });
    else if (kind === 'segno'){ this.mark(d.text || 'segno dal telefono'); this.notify?.('Momento segnato dal telefono'); }
    else if (kind === 'dispositivo') this.log(`${who}.dispositivo`, d);
  }
  _phoneRaw(k){
    this.rawBuf.push({ t: r(this.now() - this.t0, 1), k: r(k.t, 1), q: k.q ?? null, r: k.rot || null, a: k.acc || null, g: k.accG || null, via: k.path || null });
    this.counts.campioni++;
  }
  _webcam(d){
    if (!d) return;
    // camera chiesta e ottenuta (all'accensione), misure al secondo, cambi del livello del modello delle mani
    if (d.kind === 'camera') return this.log('webcam.camera', { chiesto: d.chiesto ?? null, ottenuto: d.ottenuto ?? null, nome: d.nome ?? null, livello: d.livello ?? null, fisso: !!d.fisso, richiamiFotogrammi: d.richiamiFotogrammi ?? null });
    if (d.kind === 'ritmo'){ const { kind, ...rest } = d; return this.log('webcam.ritmo', rest); }
    // cambio di livello: deciso dalla misura, poi applicato al primo invio senza un punto in gioco (applicato)
    if (d.kind === 'carico') return this.log('webcam.carico', { da: d.from ?? null, a: d.to ?? null, p50: d.p50 ?? null, perche: d.reason || null, ...(d.applied ? { applicato: true } : {}) });
    // recupero automatico della webcam (webcam_argon_track.js): modello delle mani sbloccato o ricaricato, camera riaperta
    if (d.kind === 'modello') return this.log('webcam.modello', { stato: d.stato || null, blocchi: d.blocchi ?? null });
    if (d.kind === 'riapertura') return this.log('webcam.riapertura', { motivo: d.motivo || null, stato: d.stato || null, ...(d.errore ? { errore: d.errore } : {}) });
    // stato della mano: valida, degradata, persa, ripresa, movimento (ms: durata dello stato finito)
    if (d.kind === 'stato') return this.log('webcam.stato', { da: d.from ?? null, a: d.to ?? null, ms: d.ms ?? null });
    // movimento (colpi della webcam dal movimento): ct dell'attraversamento della soglia
    if (d.kind && d.kind !== 'frame') this.log('webcam.evento', { tipo: d.kind, ...pick(d, ['type', 'side', 'shotType', 'source', 'speed', 'dirX', 'dirY', 'reason', 'hands']), ...(d.source === 'motion' && Number.isFinite(d.captureT) ? { ct: r(d.captureT - this.t0, 1) } : {}) });
    else if (d.source === 'motion') this.log('webcam.frame', { ct: Number.isFinite(d.captureT) ? r(d.captureT - this.t0, 1) : null, source: 'motion', energia: r(d.energy*1000, 2), soglia: r(d.thr*1000, 2), x: r(d.x, 3), y: r(d.y, 3), fase: d.phase || null });
    else this.log('webcam.frame', { ct: Number.isFinite(d.captureT) ? r(d.captureT - this.t0, 1) : null, source: d.source || null, hands: d.hands ?? null, chosen: d.chosen ?? null, reason: d.reason || null, x: r(d.x, 3), y: r(d.y, 3), inferMs: r(d.inferMs, 1) });
  }
  // dopo ogni aggiornamento del motore: fase, palla (solo in gioco) e chi l'ha colpita
  _afterUpdate(){
    const E = this.engine, b = E.ball;
    if (E.phase !== this.lastPhase){ this.log('fase', { da: this.lastPhase, a: E.phase }); this.lastPhase = E.phase; }
    if (!b?.pos) return;
    if (b.inPlay || BALL_PHASES.has(E.phase)) this.log('palla', { p: vec(b.pos), v: vec(b.vel, 1), in: !!b.inPlay, da: b.lastHitter || null });
    if (b.lastHitter !== this.lastHitter){
      const who = b.lastHitter;
      if (who && who !== 'player') this.log('colpo.gioco', { chi: who === 'opponent' ? 'cpu' : who, x: r(b.pos.x), z: r(b.pos.z), y: r(b.pos.y), tipo: b.shotType || null, verso: vec(b.targetLanding) });
      this.lastHitter = who;
    }
  }
  // esito di un colpo del giocatore locale (dall'interfaccia: natpf_ui.feedback → diagnostica)
  onFeedback(e = {}, q = null){
    if (!this.active) return;
    const ls = this.engine.natpfSkill?.lastShot, hand = this.ui?.hand?.hand || 'right';
    const side = /back/i.test(this.lastInputSide || '') ? 'backhand' : /fore/i.test(this.lastInputSide || '') ? 'forehand' : null;
    const contactSide = side ? ((side === 'forehand') === (hand !== 'left') ? 1 : -1) : null;
    const hit = e.kind === 'hit';
    // l'esito della racchetta virtuale (tempo, qualità, assistenza) è nell'evento «racchetta», registrato dal motore
    this.log('colpo.gioco', { chi: 'giocatore', esito: e.kind || null, tempo: e.grade || null, qualita: q?.label || null, kmh: e.speedKmh ?? null, tipo: e.shotType || null,
      x: hit && ls ? r(ls.landingX) : null, z: hit && ls ? r(ls.landingZ) : null, lato: side, direzione: hit && ls ? shotDirection(ls.landingX, contactSide) : null });
  }
  // misure al secondo: fotogrammi, aggiornamento, disegno, memoria; stato del collegamento del telefono
  _second(){
    if (!this.active) return;
    const P = this.perf, now = this.now(), dt = Math.max(1, now - P.at);
    const fr = P.frames, q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p*s.length))] : null; };
    const heap = globalThis.performance?.memory?.usedJSHeapSize;
    // doppi: fotogrammi oltre 25 ms (a 60 Hz uno saltato: scatto visibile); lunghi: oltre 50 ms
    this.log('prestazioni', { fps: r(fr.length*1000/dt, 1), n: fr.length, p50: r(q(fr, .5), 1), p95: r(q(fr, .95), 1), max: r(fr.length ? Math.max(...fr) : null, 1), doppi: fr.filter(x => x > 25).length, lunghi: fr.filter(x => x > 50).length,
      upd95: r(q(P.upd, .95), 2), ren95: r(q(P.ren, .95), 2), heapMB: Number.isFinite(heap) ? r(heap/1048576, 1) : null, compiti: P.longTasks, coda: this.store?.backlog ? r(this.store.backlog/1048576, 1) : 0,
      regMs: r(P.reg*1000/dt, 2), regMax: r(P.flushMax, 2), ...(this.freeMB != null ? { liberoMB: this.freeMB } : {}) });
    P.frames = []; P.upd = []; P.ren = []; P.longTasks = 0; P.reg = 0; P.flushMax = 0; P.at = now;
    const link = this.engine.natpfPhone?.link;
    // hz: messaggi arrivati nell'ultimo secondo per tipo; gap: buco più lungo tra due arrivi (ms, compreso il silenzio
    // fino a ora); grappoli: arrivi a meno di 3 ms dal precedente (rete che consegna a pacchi)
    if (link?.stats && this.engine.natpfPhone?.connected){
      const st = link.stats(), R8 = Object.entries(st.rates || {});
      this.log('tel.link', { copie: st.swings || null, rtt: r(st.rtt, 1), hz: Object.fromEntries(R8.map(([k, v]) => [k, v.hz])), gap: Object.fromEntries(R8.filter(([, v]) => v.gap != null).map(([k, v]) => [k, v.gap])), grappoli: Object.fromEntries(R8.filter(([, v]) => v.bunch).map(([k, v]) => [k, v.bunch])) });
    }
    this._phoneStato();
    this._phone2();
    this._changed();
    if (this._rotation || this._stopping) return;
    if (now - this.partT0 >= this.rotateMs || this._partBytes() >= this.rotateBytes){ this._rotate().catch(e => this.warn('parte', `parte nuova non riuscita: ${e?.message || e}`)); return; }
    if (now - this._spaceAt >= this.spaceEveryMs){ this._spaceAt = now; this._checkSpace().catch(() => {}); }
  }
  _loop(){
    const tick = ts => {
      if (!this.active) return;
      if (this.perf.last != null) this.perf.frames.push(ts - this.perf.last);
      this.perf.last = ts;
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }
  _gpu(){
    try {
      const gl = this.engine.renderer?.getContext?.(), ext = gl?.getExtension?.('WEBGL_debug_renderer_info');
      return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)).slice(0, 120) : null;
    } catch { return null; }
  }

  /* ---------- video ---------- */
  // webcam: lo stesso flusso del controller se la webcam è già accesa, altrimenti una richiesta apposta (permesso)
  async _startCamera(){
    const mc = this.engine.motionController;
    let stream = mc?.webcamActive && mc.videoElem?.srcObject, video = mc?.videoElem;
    if (!stream && this._ownCamera?.active){ stream = this._ownCamera; video = this._ownVideo; }   // parte nuova: stessa webcam
    if (!stream){
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('webcam non disponibile');
      stream = this._ownCamera = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } }, audio: false });
      // nella pagina ma invisibile: un video fuori dal documento il browser lo aggiorna di rado (istanti dei fotogrammi)
      video = this._ownVideo = document.createElement('video'); video.muted = true; video.playsInline = true; video.srcObject = stream;
      video.style.cssText = 'position:fixed;left:0;bottom:0;width:2px;height:2px;opacity:0;pointer-events:none';
      document.body.appendChild(video); await video.play().catch(() => {});
    }
    this._record('webcam', stream, 1_000_000);
    // istante di cattura di ogni fotogramma (stesso orologio del registro): allinea il video al registro
    if (video?.requestVideoFrameCallback){
      const gen = this._videoGen;
      const cb = (now, md) => {
        if (!this.active || gen !== this._videoGen) return;
        this.log('video.frame', { file: 'webcam', mt: r(md.mediaTime, 3), ct: Number.isFinite(md.captureTime) ? r(md.captureTime - this.t0, 1) : null, pt: r(now - this.t0, 1), n: md.presentedFrames ?? null });
        video.requestVideoFrameCallback(cb);
      };
      video.requestVideoFrameCallback(cb);
    }
  }
  _startGameVideo(){
    const c = this.engine.renderer?.domElement;
    if (!c?.captureStream) return this.warn('video-gioco', 'video del gioco non disponibile in questo browser');
    try { this._record('gioco', c.captureStream(30), 2_000_000, { ownTracks: true }); }
    catch (e){ this.warn('video-gioco', `video del gioco non registrato: ${e?.message || e}`); }
  }
  // ownTracks: flusso creato per questo video (cattura della tela), da chiudere con lui
  _record(kind, stream, bps, { ownTracks = false } = {}){
    const mime = pickVideoMime();
    if (!mime) throw new Error('registrazione video non supportata');
    const name = `video-${kind}.${mime.includes('mp4') ? 'mp4' : 'webm'}`;
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bps });
    const track = stream.getVideoTracks?.()[0], set = track?.getSettings?.() || {};
    const v = { kind, info: { file: name, mime, w: set.width ?? null, h: set.height ?? null, fps: set.frameRate ?? null, byte: 0 }, chain: Promise.resolve() };
    const sid = this.id;                                     // la parte a cui appartiene (anche per gli ultimi pezzi)
    let startT = null, resolveDone;
    v.done = new Promise(res => { resolveDone = res; });
    rec.onstart = () => { startT = this.now(); this.log('video', { file: name, stato: 'inizio', mime, w: v.info.w, h: v.info.h, fps: v.info.fps }); };
    rec.ondataavailable = e => {
      if (!e.data?.size) return;
      const blob = e.data;
      v.chain = v.chain.then(async () => { const buf = await blob.arrayBuffer(); v.info.byte += buf.byteLength; await this.store.append(sid, name, buf); })
        .catch(err => this.warn('video-' + kind, `video ${kind}: scrittura non riuscita (${err?.message || err})`));
    };
    rec.onstop = () => {
      if (ownTracks) for (const tr of stream.getTracks()) tr.stop();
      v.chain.then(() => { this.log('video', { file: name, stato: 'fine', durataS: r((this.now() - (startT ?? this.now()))/1000, 1), byte: v.info.byte }); resolveDone(); });
    };
    rec.onerror = e => this.warn('video-' + kind, `video ${kind}: errore del registratore (${e?.error?.name || 'sconosciuto'})`);
    v.stop = () => { v.stopped = true; try { if (rec.state !== 'inactive') rec.stop(); else resolveDone(); } catch { resolveDone(); } };
    rec.start(1000);
    this.videos.push(v);
  }
}
