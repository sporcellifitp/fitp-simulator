// Webcam → movimento del giocatore in campo («Movimento: segui il corpo»), opzione della racchetta Webcam.
// Argon muove da solo il giocatore verso la palla (targetPos scelto da _predictBallIntercept, passi in
// _stepActorFootwork). Con «segui il corpo» MediaPipe Pose (pacchetto offline, modello lite) trova spalle e anche
// davanti alla webcam: spostarsi a destra/sinistra porta il giocatore a destra/sinistra sul campo, avvicinarsi alla
// webcam lo porta verso la rete, allontanarsi verso il fondo. Il colpo resta legato alla mano (Hands, Argon).
//
// Isolato dal motore: non si toccano _predictBallIntercept né _stepActorFootwork. Durante lo scambio, solo per il
// passo del giocatore che segue il corpo, si sostituisce per un istante il bersaglio di Argon con quello del corpo
// e poi lo si rimette: velocità, animazioni e regole restano quelle di Argon. Se il corpo esce dall'inquadratura o
// non viene rilevato per più di 0,4 s, il passo usa di nuovo il bersaglio automatico.
// P1 (host o contro la CPU) segue il proprio corpo direttamente; il P2 manda il bersaglio all'host attraverso il
// relay (/api/body, scripts/argon-relay.mjs), perché è l'host a simulare la partita.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const finite = v => typeof v === 'number' && Number.isFinite(v);

export const MOVEMENT_MODES = ['auto', 'body'];
export const MOVEMENT_STORAGE_KEY = 'natpf-argon.movement';
// Valore predefinito: automatico. Seguire il corpo chiede 2–3 m liberi davanti allo schermo, il busto intero
// nell'inquadratura e di giocare in piedi; con l'automatico di Argon la webcam serve solo alla mano e funziona anche
// da seduti o vicino al monitor. Chi ha lo spazio lo attiva dal pulsante «Movimento» o con il tasto B.
export const DEFAULT_MOVEMENT = 'auto';
export const MEDIAPIPE_POSE_LOCAL_BASE = '/assets/mediapipe/pose/';
export const MEDIAPIPE_POSE_CDN_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/';
export const BODY_FOLLOW = Object.freeze({
  rangeX: .28,          // spostamento nell'immagine (frazione della larghezza) per arrivare al corridoio laterale
  depthRatio: 1.35,     // spalle 1,35 volte più larghe (più vicini alla webcam) = massimo verso la rete
  forward: 4.5, back: 1.5,   // metri verso la rete e verso il fondo rispetto alla posizione di attesa di Argon
  holdMs: 400,          // senza corpo per più di così: si torna al movimento automatico
  calibrateMs: 700,     // la posizione di partenza (centro del campo) è la media del primo istante in cui si è visti
  sendMs: 80,           // P2 → host
});

// Landmark di MediaPipe Pose: 11/12 spalle, 23/24 anche (x, y in [0, 1], visibility). Immagine a specchio come in
// Argon: x → 1 - x, quindi destra sullo schermo = destra del giocatore.
export function bodyPoseFromLandmarks(lm, { minVisibility = .5, margin = .03 } = {}){
  if (!Array.isArray(lm) || lm.length < 25) return null;
  const vis = p => p && finite(p.x) && finite(p.y) && (p.visibility ?? 1) >= minVisibility;
  const ls = lm[11], rs = lm[12], lh = lm[23], rh = lm[24];
  if (!vis(ls) || !vis(rs)) return null;                          // senza le due spalle non si sa dove sia il corpo
  const pts = [ls, rs, ...(vis(lh) && vis(rh) ? [lh, rh] : [])];
  const x = 1 - pts.reduce((n, p) => n + p.x, 0)/pts.length;
  const width = Math.hypot(ls.x - rs.x, ls.y - rs.y);
  // corpo che esce dall'inquadratura: una spalla sul bordo
  if ([ls, rs].some(p => p.x < margin || p.x > 1 - margin) || width < .03) return null;
  return { x, width, confidence: Math.min(...pts.map(p => p.visibility ?? 1)) };
}

// Posizione del corpo nel tempo, rispetto alla posizione di partenza: lateral e depth in [-1, 1].
export class BodyFollowTracker {
  constructor({ smoothing = .4, ...options } = {}){ this.smoothing = smoothing; this.options = { ...BODY_FOLLOW, ...options }; this.reset(); }
  reset(){ this.pose = null; this.neutral = null; this.calib = []; this.lastAt = -Infinity; }
  push(pose, now = performance.now()){
    if (!pose) return;
    this.pose = this.pose && now - this.lastAt < this.options.holdMs
      ? { x: this.pose.x + (pose.x - this.pose.x)*this.smoothing, width: this.pose.width + (pose.width - this.pose.width)*this.smoothing, confidence: pose.confidence }
      : { ...pose };
    this.lastAt = now;
    if (!this.neutral){
      this.calib.push({ ...pose, t: now });
      if (now - this.calib[0].t >= this.options.calibrateMs && this.calib.length >= 3){
        const avg = k => this.calib.reduce((n, p) => n + p[k], 0)/this.calib.length;
        this.neutral = { x: avg('x'), width: avg('width') };
      }
    }
  }
  get calibrated(){ return !!this.neutral; }
  visible(now = performance.now()){ return !!this.pose && now - this.lastAt <= this.options.holdMs; }
  sample(now = performance.now()){
    if (!this.neutral || !this.visible(now)) return null;
    const o = this.options;
    return {
      lateral: clamp((this.pose.x - this.neutral.x)/o.rangeX, -1, 1),
      depth: clamp(Math.log(this.pose.width/this.neutral.width)/Math.log(o.depthRatio), -1, 1),
      confidence: this.pose.confidence,
    };
  }
}

// Bersaglio in campo per un giocatore. sideSign > 0: P1 a z positivo, guarda verso -z (la sua destra è +x).
export function courtTargetFromBody(sample, actor, { singlesX = 4.115, baselineZ = 11.89, forward = BODY_FOLLOW.forward, back = BODY_FOLLOW.back } = {}){
  if (!sample || !actor) return null;
  const side = (actor.sideSign ?? 1) > 0 ? 1 : -1;
  const x = clamp(sample.lateral*(singlesX + .5), -(singlesX + .8), singlesX + .8)*side;
  const home = baselineZ - .15;                                   // posizione di attesa di Argon nello scambio
  const depth = sample.depth >= 0 ? home - sample.depth*forward : home - sample.depth*back;
  return { x, z: clamp(depth, 3.2, 13.4)*side };
}

const readMode = () => {
  const q = new URLSearchParams(globalThis.location?.search || '').get('move');
  if (q === 'body' || q === 'corpo') return 'body';
  if (q === 'auto') return 'auto';
  try { const v = localStorage.getItem(MOVEMENT_STORAGE_KEY); if (MOVEMENT_MODES.includes(v)) return v; } catch {}
  return DEFAULT_MOVEMENT;
};
const loadScript = src => new Promise((resolve, reject) => {
  if (document.querySelector(`script[src="${src}"]`)) return resolve();
  const s = document.createElement('script'); s.src = src; s.crossOrigin = 'anonymous'; s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
});

export class NatpfBodyFollow {
  constructor(engine, { autostart = true } = {}){
    this.engine = engine;
    this.mode = readMode();
    this.tracker = new BodyFollowTracker();
    this.remote = null;               // host: bersaglio del corpo del P2 dal relay
    this.listeners = new Set();
    this.status = 'off';              // off | loading | searching | following | lost | unavailable
    this.pose = null; this._busy = false; this._lastSend = 0; this._lastVideoTime = -1;
    this._wrapEngine();
    if (autostart && typeof window !== 'undefined'){ this._timer = setInterval(() => this.tick(), 40); this._mountUi(); }
  }
  get mc(){ return this.engine.motionController; }
  get enabled(){ return this.mode === 'body'; }
  onChange(fn){ this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _changed(){ this._paint(); for (const fn of this.listeners) try { fn(this); } catch (e){ console.error(e); } }
  setMode(mode){
    if (!MOVEMENT_MODES.includes(mode) || mode === this.mode) return;
    this.mode = mode; this.tracker.reset(); this.remote = null;
    try { localStorage.setItem(MOVEMENT_STORAGE_KEY, mode); } catch {}
    this._setStatus(this.enabled ? 'loading' : 'off');
    this._changed();
  }
  toggle(){ this.setMode(this.enabled ? 'auto' : 'body'); }
  _setStatus(s){ if (s !== this.status){ this.status = s; this._changed(); } }

  /* ---------- agganci al motore (nessuna modifica alle funzioni di Argon) ---------- */
  _wrapEngine(){
    const e = this.engine;
    const step = e._stepActorFootwork?.bind(e);
    if (step){
      const saved = { x: 0, z: 0 };
      e._stepActorFootwork = (actor, dt) => {
        const target = this.targetFor(actor);
        if (!target || !actor?.targetPos) return step(actor, dt);
        saved.x = actor.targetPos.x; saved.z = actor.targetPos.z;
        actor.targetPos.x = target.x; actor.targetPos.z = target.z;
        try { return step(actor, dt); } finally { actor.targetPos.x = saved.x; actor.targetPos.z = saved.z; }
      };
    }
  }
  // host: il P2 manda il proprio bersaglio insieme allo stato della stanza (/api/match/state → body.p2)
  _hookRoomState(){
    const mc = this.mc;
    if (!mc || mc.__natpfBody) return;
    mc.__natpfBody = true;
    const prev = mc.onRoomState;
    mc.onRoomState = state => {
      const b = state?.body?.p2;
      this.remote = b && b.active && finite(b.x) && finite(b.z) ? { x: b.x, z: b.z, at: performance.now() - Math.max(0, Number(b.ageMs) || 0) } : null;
      return prev ? prev(state) : undefined;
    };
  }
  // Bersaglio da usare per questo passo, oppure null (movimento automatico di Argon).
  targetFor(actor, now = performance.now()){
    const e = this.engine;
    if (e.phase !== 'RALLY' || !actor) return null;
    if (e.playerRole !== 'p2' && this.enabled && this.mc?.webcamActive && actor === e.player){
      return courtTargetFromBody(this.tracker.sample(now), actor, this._court());
    }
    // host di una partita 1v1: il P2 segue il proprio corpo
    if (e.playerRole !== 'p2' && e.isMultiplayer && actor === e.opponent && this.remote && now - this.remote.at < 500) return { x: this.remote.x, z: this.remote.z };
    return null;
  }
  _court(){ return { singlesX: 4.115, baselineZ: 11.89 }; }

  /* ---------- MediaPipe Pose sui fotogrammi della webcam di Argon ---------- */
  async _ensurePose(){
    if (this.pose || this._loading || this.status === 'unavailable') return;
    this._loading = true;
    try {
      let base = MEDIAPIPE_POSE_LOCAL_BASE;
      if (!window.Pose) try { await loadScript(`${base}pose.js`); } catch { base = MEDIAPIPE_POSE_CDN_BASE; await loadScript(`${base}pose.js`); }
      const pose = new window.Pose({ locateFile: f => `${base}${f}` });
      pose.setOptions({ modelComplexity: 0, smoothLandmarks: true, enableSegmentation: false, minDetectionConfidence: .5, minTrackingConfidence: .5 });
      pose.onResults(r => this.onPoseResults(r));
      await pose.initialize();
      this.pose = pose; this.base = base;
      this._setStatus('searching');
    } catch (err){
      console.warn('[NATPF] MediaPipe Pose non disponibile: movimento automatico', err);
      this._setStatus('unavailable');
    } finally { this._loading = false; }
  }
  onPoseResults(r, now = performance.now()){
    this._busy = false;
    const body = bodyPoseFromLandmarks(r?.poseLandmarks);
    if (body) this.tracker.push(body, now);
  }
  tick(now = performance.now()){
    const mc = this.mc, e = this.engine;
    this._hookRoomState();
    if (!this.enabled || !mc?.webcamActive){ if (this.enabled && this.status !== 'unavailable') this._setStatus('loading'); this._paint(); return; }
    if (!this.pose){ this._ensurePose(); return; }
    const v = mc.videoElem;
    if (v && v.readyState >= 2 && !this._busy && v.currentTime !== this._lastVideoTime){
      this._lastVideoTime = v.currentTime; this._busy = true;
      this.pose.send({ image: v }).catch(() => { this._busy = false; });
    }
    this._setStatus(this.tracker.visible(now) ? (this.tracker.calibrated ? 'following' : 'searching') : this.tracker.calibrated ? 'lost' : 'searching');
    // P2: il bersaglio va all'host, che simula la partita
    if (e.playerRole === 'p2' && e.isMultiplayer && now - this._lastSend >= BODY_FOLLOW.sendMs){
      this._lastSend = now;
      const t = courtTargetFromBody(this.tracker.sample(now), e.opponent, this._court());
      const room = mc.roomId || 'default';
      fetch(`/api/body?room=${encodeURIComponent(room)}&role=p2`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room, role: 'p2', active: !!t, x: t?.x ?? 0, z: t?.z ?? 0 }) }).catch(() => {});
    }
  }

  /* ---------- pulsante «Movimento» accanto a «Vista» (tasto B) ---------- */
  _mountUi(){
    const mount = () => {
      if (this.button || !document.body) return;
      const b = document.createElement('button');
      b.type = 'button'; b.id = 'btn-natpf-movement'; b.className = 'hud-mini-btn';
      b.title = 'Movimento del giocatore con la webcam: automatico o segui il corpo (B)';
      b.innerHTML = '<span>Movimento:</span><strong data-natpf-movement-label></strong>';
      b.addEventListener('click', e => { e.stopPropagation(); this.toggle(); });
      b.addEventListener('pointerdown', e => e.stopPropagation());
      const view = document.getElementById('btn-natpf-view');
      if (view?.parentNode) view.parentNode.insertBefore(b, view.nextSibling); else return;
      this.button = b; this._paint();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
    window.addEventListener('keydown', e => {
      if (e.code !== 'KeyB' || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return;
      this.toggle();
    });
  }
  label(){
    if (!this.enabled) return 'automatico';
    return { following: 'segue il corpo', searching: 'cerco il corpo…', lost: 'corpo non visto · automatico', unavailable: 'Pose mancante · automatico', loading: this.mc?.webcamActive ? 'avvio…' : 'corpo (accendi la webcam)' }[this.status] || 'segue il corpo';
  }
  _paint(){
    if (!this.button) return;
    const webcam = this.mc?.webcamActive || this.engine.matchConfig?.inputMode === 'webcam';
    this.button.classList.toggle('hidden', !webcam);
    const l = this.button.querySelector('[data-natpf-movement-label]'), text = this.label();
    if (l && l.textContent !== text) l.textContent = text;
  }
}
