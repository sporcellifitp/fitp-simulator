// Diagnostica del telefono-racchetta (Maiusc+D, oppure ?diag=1): misura separatamente dove va il tempo tra il gesto e
// il colpo in gioco e com'è il flusso dei dati, in LAN e via internet. Non cambia il gioco.
//   rilevamento   dal picco del gesto a quando il telefono decide che è un colpo (sul telefono)
//   preparazione  attesa per capire se era una preparazione (solo gesti nel verso opposto al colpo atteso)
//   consegna      dal colpo deciso a quando arriva al computer (rete + coda dei messaggi), con gli orologi allineati
//   attesa palla  dall'arrivo all'impatto in gioco (il colpo anticipato aspetta lo sweet spot: è voluto)
//   a schermo     dall'impatto al primo fotogramma disegnato dopo
// «Registra» salva fino a 60 s di campioni grezzi del telefono (uguali in LAN e via internet), colpi ed esiti in un file
// JSON (scripts/audit/replay-recording.mjs lo rianalizza).
const $ = id => document.getElementById(id);
const r1 = v => (Number.isFinite(v) ? Math.round(v) : '–');
export const DIAG_MAX_RECORD_MS = 60000;

// tempi di un colpo dal messaggio del telefono (s in secondi sull'orologio del computer, ms dal telefono)
export function swingTimeline(s, { hitAt = null, frameAt = null } = {}){
  const detect = Number.isFinite(s.detectMs) ? s.detectMs : null, hold = Number.isFinite(s.holdMs) ? s.holdMs : 0;
  const total = Number.isFinite(s.receivedAt) && Number.isFinite(s.at) ? (s.receivedAt - s.at)*1000 : null;
  const delivery = total != null && detect != null ? Math.max(0, total - detect - hold) : null;
  const ball = Number.isFinite(hitAt) && Number.isFinite(s.receivedAt) ? (hitAt - s.receivedAt)*1000 : null;
  const screen = Number.isFinite(frameAt) && Number.isFinite(hitAt) ? (frameAt - hitAt)*1000 : null;
  return { detect, hold, delivery, total, ball, screen };
}

export class NatpfDiag {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    this.swings = []; this.recording = null; this.fps = 60; this.lastFrame = null;
    this.on = new URLSearchParams(location.search).get('diag') === '1';
    window.addEventListener('keydown', e => { if (e.shiftKey && e.code === 'KeyD'){ e.preventDefault(); e.stopImmediatePropagation(); this.toggle(); } }, true);
    const phone = engine.natpfPhone;
    phone.onSwing?.((ev, s) => this._onSwing(ev, s));
    phone.onRaw?.(k => this.recording && this.recording.raw.length < 20000 && this.recording.raw.push(k));
    this._frame();
    if (this.on) this._build();
  }
  toggle(){ this.on = !this.on; if (this.on) this._build(); this.el?.classList.toggle('hidden', !this.on); }
  _build(){
    if (this.el) return;
    const el = this.el = document.createElement('div');
    el.className = 'natpf-diag'; el.setAttribute('aria-live', 'off');
    el.innerHTML = '<div class="diag-head"><b>Diagnostica racchetta</b><button type="button" data-diag="rec">Registra</button><button type="button" data-diag="close">×</button></div><pre id="natpf-diag-body"></pre>';
    el.addEventListener('pointerdown', e => e.stopPropagation());
    el.addEventListener('click', e => { const b = e.target.closest('[data-diag]'); if (!b) return; e.stopPropagation(); if (b.dataset.diag === 'close') this.toggle(); else this.toggleRecording(); });
    document.body.appendChild(el);
  }
  _frame(){
    const loop = t => {
      if (this.lastFrame != null){ const dt = Math.max(1, t - this.lastFrame); this.fps += (1000/dt - this.fps)*.05; }
      this.lastFrame = t;
      // primo fotogramma dopo un impatto
      const last = this.swings[this.swings.length - 1];
      if (last && last.hitAt != null && last.frameAt == null) last.frameAt = t/1000;
      if (this.on && (!this._painted || t - this._painted > 250)){ this._painted = t; this.paint(); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  // stato della partita quando arriva il colpo: spiega i colpi senza esito (palla lontana, punto finito, già colpita)
  engineState(){
    const e = this.engine, b = e.ball, me = e.playerRole === 'p2' ? e.opponent : e.player;
    const r2 = v => (Number.isFinite(v) ? +v.toFixed(2) : null);
    return { phase: e.phase || null, inPlay: !!b?.inPlay, lastHitter: b?.lastHitter || null, role: e.playerRole || null,
      ball: b?.pos ? [r2(b.pos.x), r2(b.pos.y), r2(b.pos.z)] : null, velZ: r2(b?.vel?.z),
      dist: b?.pos && me?.pos ? r2(Math.hypot(b.pos.x - me.pos.x, b.pos.z - me.pos.z)) : null, server: e.score?.server || null };
  }
  _onSwing(ev, s){
    const rec = { s: { ...s }, ev: { side: ev.side, shotType: ev.shotType, speed: ev.speed, natpf: ev.natpf, ...(ev.ignored ? { ignored: ev.ignored } : {}) }, game: this.engineState(), hitAt: null, frameAt: null, result: null };
    this.swings.push(rec); if (this.swings.length > 8) this.swings.shift();
    this.recording?.swings.push(rec);
  }
  // esito del colpo del giocatore locale (dall'aptica del motore)
  onFeedback(e = {}, q = null){
    const last = this.swings[this.swings.length - 1];
    if (!last || last.hitAt != null || !/hit|fault|whiff/.test(e.kind || '')) return;
    if (performance.now()/1000 - last.s.receivedAt > 1.5) return;
    last.hitAt = performance.now()/1000;
    const ls = this.engine.natpfSkill?.lastShot;
    last.result = { kind: e.kind, grade: e.grade, quality: q?.label || null, landingX: ls ? +ls.landingX.toFixed(2) : null, landingZ: ls && Number.isFinite(ls.landingZ) ? +ls.landingZ.toFixed(2) : null };
  }
  toggleRecording(){
    const link = this.engine.natpfPhone.link;
    if (!this.recording){
      this.recording = { startedAt: new Date().toISOString(), transport: link?.transport || null, raw: [], swings: [], stats: [] };
      this.engine.natpfPhone.diagStream = true; link?.send({ t: 'cfg', prep: 1, mo: 1, diag: 1 });
      this._recTimer = setInterval(() => { this.recording?.stats.push({ at: performance.now(), ...(link?.stats?.() || {}), hz: link?.L?.hz ?? null, fps: Math.round(this.fps) }); }, 1000);
      this._recStop = setTimeout(() => this.recording && this.toggleRecording(), DIAG_MAX_RECORD_MS);
    } else {
      clearInterval(this._recTimer); clearTimeout(this._recStop);
      this.engine.natpfPhone.diagStream = false; link?.send({ t: 'cfg', prep: 1, mo: 1, diag: 0 });
      const data = { ...this.recording, endedAt: new Date().toISOString(), profile: { hand: this.engine.natpfPhone.hand, liftBaseline: this.engine.natpfPhone.liftBaseline, liftNow: this.engine.natpfPhone.liftModel?.value, phone: this.engine.natpfPhone.profile || null } };
      this.recording = null;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
      a.download = `natpf-registrazione-${data.transport || 'telefono'}-${Date.now()}.json`;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }
    this.paint();
  }
  paint(){
    const body = $('natpf-diag-body'); if (!body) return;
    const ph = this.engine.natpfPhone, link = ph.link, st = link?.stats?.() || { rates: {} }, R = st.rates || {};
    const rate = k => (R[k] ? `${R[k].hz} Hz (${R[k].ageMs} ms fa)` : '–');
    const lines = [
      `collegamento  ${link?.transport || '–'} · ${ph.connected ? 'collegato' : 'non collegato'}${ph.ready ? ' · pronto' : ''}`,
      `orologi       RTT ${r1(st.rtt)} ms · gioco ${r1(this.fps)} fps · sensori del telefono ${r1(link?.L?.hz)} Hz`,
      `flussi        piatto ${rate('fo')} · binario ${rate('bin')} · giroscopio json ${rate('sm')} · grezzi ${rate('rs')}`,
      this.recording ? `REGISTRAZIONE  ${this.recording.raw.length} campioni · ${this.recording.swings.length} colpi` : '',
      '',
      'colpo  lato/tipo         mira         rilev  prep  consegna  totale  attesa palla  schermo  esito',
    ];
    for (const r of [...this.swings].reverse()){
      const t = swingTimeline(r.s, r), n = r.ev.natpf || {};
      lines.push(`${String(r.s.seq ?? '').padStart(4)}  ${(`${r.ev.side || '–'}/${n.shot || r.ev.shotType}`).padEnd(17)} ${(`${(n.wrist ?? 0).toFixed(2)} ${n.aimSource || ''}`).padEnd(12)} ${String(r1(t.detect)).padStart(5)} ${String(r1(t.hold)).padStart(5)} ${String(r1(t.delivery)).padStart(9)} ${String(r1(t.total)).padStart(7)} ${String(r1(t.ball)).padStart(13)} ${String(r1(t.screen)).padStart(8)}  ${r.result ? `${r.result.quality || r.result.kind} x ${r.result.landingX}` : ''}`);
      if (r.ev.ignored) lines.push(`       scartato: ${r.ev.ignored}`);
      else if (!r.result && /SERVE/.test(r.game?.phase || '') && r.game.server === 'player') lines.push('       servizio (lancio o colpo)');
      else if (!r.result && r.game) lines.push(`       senza esito · ${r.game.phase} · palla ${r.game.inPlay ? 'in gioco' : 'ferma'}${r.game.lastHitter ? ` (ultimo: ${r.game.lastHitter})` : ''}${r.game.dist != null ? ` a ${r.game.dist} m` : ''}`);
      if (n.why?.length) lines.push(`       perché: ${n.why.join(' · ')}${r.s.vert ? ` · verticale ${r.s.vert}` : ''}`);
      // segnali della classificazione: V (piatto + mano), spostamento verticale della mano, rotazione del piatto T,
      // confidenza (0 al limite della soglia, 1 lontano); il tipo è deciso al picco, prima del follow-through
      if (Number.isFinite(n.v)) lines.push(`       segnali: V ${n.v.toFixed(2)} · mano ${Number.isFinite(n.move) ? n.move.toFixed(2) : '–'} · piatto T ${Number.isFinite(n.head) ? n.head.toFixed(2) : '–'} · confidenza ${Number.isFinite(n.conf) ? n.conf.toFixed(2) : '–'}`);
    }
    body.textContent = lines.join('\n');
    const rec = this.el?.querySelector('[data-diag="rec"]'); if (rec) rec.textContent = this.recording ? 'Ferma e scarica' : 'Registra';
  }
}
