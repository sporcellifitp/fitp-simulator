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
// Tipi di evento (k): fase, palla, rimbalzo, punto, tentativo, colpo.gioco, input, tel.colpo, tel.cal, tel.stato,
// tel.orologio, tel.link, webcam.frame, webcam.evento, prestazioni, video, video.frame, atteso, marca, avviso.
import { latencyShift, eventLatency, swingTiming } from '../natpf_skill.js';
import { shotDirection } from './diag_metrics.js';

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
      id: this.id, versione: DIAG_VERSION, startedAt: this.startedWall, inizio: new Date(this.startedWall).toISOString(), label: String(label || '').slice(0, 80),
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
    }
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
  _phoneStato(force = false, extra = {}){
    const ph = this.engine.natpfPhone, L = ph?.link?.L || ph?.state || {};
    this._hookLink();
    const s = { collegamento: L.state || 'off', telefono: L.phone || null, rtt: L.rtt ?? null, hz: L.hz ?? null, presa: L.grip || null, ...extra };
    const key = JSON.stringify([s.collegamento, s.telefono, s.presa, extra.visibile, extra.schermo]);
    if (!force && key === this.lastStato) return;
    this.lastStato = key; this.log('tel.stato', s);
  }
  _phoneSwing(ev, s){
    const n = ev?.natpf || {}, t0s = this.t0/1000;
    const total = Number.isFinite(s?.receivedAt) && Number.isFinite(s?.at) ? (s.receivedAt - s.at)*1000 : null;
    const det = Number.isFinite(s?.detectMs) ? s.detectMs : null, hold = Number.isFinite(s?.holdMs) ? s.holdMs : 0;
    this.log('tel.colpo', {
      n: s?.seq ?? null, via: s?.path || null, scartato: ev?.ignored || null,
      lato: ev?.side || null, tipo: n.shot || null, perche: Array.isArray(n.why) ? n.why.join(' · ').slice(0, 160) : null,
      mira: r(n.wrist, 3), fonteMira: n.aimSource || null, scarto: r(n.aimDev, 1), conf: r(n.conf), v: r(n.v, 3), move: r(n.move, 3), head: r(n.head, 3),
      picco: Number.isFinite(s?.at) ? r(s.at*1000 - t0s*1000, 1) : null, arrivo: Number.isFinite(s?.receivedAt) ? r(s.receivedAt*1000 - this.t0, 1) : null,
      rilevamento: det, attesa: hold, totale: r(total, 1), consegna: total != null && det != null ? r(Math.max(0, total - det - hold), 1) : null,
      hz: s?.sampleHz ?? null, potenza: r(s?.power), lift: r(s?.lift, 3), dir: s?.dir ?? null, heading: r(s?.heading, 1),
      piatto: s?.face ? [r(s.face.yaw, 1), r(s.face.pitch, 1), r(s.face.roll, 1)] : null,
      // racchetta virtuale: velocità al picco (°/s), ampiezza (gradi), forma del gesto misurata dal telefono
      // (stroke-shape.js) e intenzione letta dal computer (natpf_stroke_intent.js); null con i telefoni di prima
      pk: s?.peak ?? null, ampiezza: s?.angle ?? null,
      forma: s?.shape ? { piano: r(s.shape.plane, 3), salita: r(s.shape.rise, 3), polso: r(s.shape.roll, 3), manico: r(s.shape.tilt, 3), testa: r(s.shape.head, 2), mano: r(s.shape.hand, 2) } : null,
      intenzione: n.intent ? { tipo: n.intent.shot, conf: r(n.intent.conf), forza: r(n.intent.power, 3), portata: r(n.intent.reach, 3), profondita: r(n.intent.depth, 3), piatto: r(n.intent.face, 3) } : null,
    });
    if (ev?.side) this.lastInputSide = ev.side;
  }
  _phoneRaw(k){
    this.rawBuf.push({ t: r(this.now() - this.t0, 1), k: r(k.t, 1), q: k.q ?? null, r: k.rot || null, a: k.acc || null, g: k.accG || null, via: k.path || null });
    this.counts.campioni++;
  }
  _webcam(d){
    if (!d) return;
    if (d.kind && d.kind !== 'frame') this.log('webcam.evento', { tipo: d.kind, ...pick(d, ['type', 'side', 'shotType', 'source', 'speed', 'dirX', 'dirY', 'reason', 'hands']) });
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
    // esito deterministico della racchetta virtuale (natpf_stroke_outcome.js, natpfLastRacket del motore), solo se
    // nuovo e di chi gioca qui. tempo: posizione nella finestra d'impatto, −1…+1 (+ anticipo: incrociato, − ritardo:
    // lungolinea), oltre ±1 l'eccesso; x e prof nel riferimento di chi colpisce (x a destra, prof dalla rete)
    const lr = this.engine.natpfLastRacket, mine = lr && lr.who === (this.engine.playerRole === 'p2' ? 'p2' : 'player') && lr.at !== this._racketAt;
    if (mine) this._racketAt = lr.at;
    const o = mine ? lr.out || {} : null;
    const racchetta = mine && (hit || e.kind === 'fault') ? { n: lr.seq ?? null, tempo: r(o.t, 3), eccesso: r(o.excess, 3), q: r(o.q, 3), qualita: r(lr.quality, 3), assistito: !!o.assisted,
      fallito: !!o.failed, rete: !!o.netFault, tipo: o.shot || null, x: r(o.x), prof: r(o.depth), volee: !!lr.volley, contatto: lr.contact ?? null } : null;
    this.log('colpo.gioco', { chi: 'giocatore', esito: e.kind || null, tempo: e.grade || null, qualita: q?.label || null, kmh: e.speedKmh ?? null, tipo: e.shotType || null,
      x: hit && ls ? r(ls.landingX) : null, z: hit && ls ? r(ls.landingZ) : null, lato: side, direzione: hit && ls ? shotDirection(ls.landingX, contactSide) : null, racchetta });
  }
  // misure al secondo: fotogrammi, aggiornamento, disegno, memoria; stato del collegamento del telefono
  _second(){
    if (!this.active) return;
    const P = this.perf, now = this.now(), dt = Math.max(1, now - P.at);
    const fr = P.frames, q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p*s.length))] : null; };
    const heap = globalThis.performance?.memory?.usedJSHeapSize;
    this.log('prestazioni', { fps: r(fr.length*1000/dt, 1), p50: r(q(fr, .5), 1), p95: r(q(fr, .95), 1), max: r(fr.length ? Math.max(...fr) : null, 1), lunghi: fr.filter(x => x > 50).length,
      upd95: r(q(P.upd, .95), 2), ren95: r(q(P.ren, .95), 2), heapMB: Number.isFinite(heap) ? r(heap/1048576, 1) : null, compiti: P.longTasks, coda: this.store?.backlog ? r(this.store.backlog/1048576, 1) : 0,
      regMs: r(P.reg*1000/dt, 2), regMax: r(P.flushMax, 2), ...(this.freeMB != null ? { liberoMB: this.freeMB } : {}) });
    P.frames = []; P.upd = []; P.ren = []; P.longTasks = 0; P.reg = 0; P.flushMax = 0; P.at = now;
    const link = this.engine.natpfPhone?.link;
    if (link?.stats && this.engine.natpfPhone?.connected){ const st = link.stats(); this.log('tel.link', { copie: st.swings || null, rtt: r(st.rtt, 1), hz: Object.fromEntries(Object.entries(st.rates || {}).map(([k, v]) => [k, v.hz])) }); }
    this._phoneStato();
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
