// Modalità diagnostica (Maiusc+D, Pausa → Diagnostica, oppure ?diag=1). Due parti:
//   - sessioni registrate (diag/diag_recorder.js): «Avvia registrazione», si gioca normalmente, «Ferma»; dati, video
//     della webcam e del gioco finiscono su disco a pezzi, senza limite di durata. Poi «Scarica» dà uno zip con il
//     rapporto (metriche, linea del tempo, video sincronizzati) e i dati; due sessioni si confrontano qui o con
//     scripts/diag/diag.mjs. Una sessione interrotta (pagina chiusa, browser bloccato) si recupera al riavvio;
//   - vista in diretta del telefono-racchetta: dove va il tempo tra il gesto e il colpo in gioco.
//       rilevamento   dal picco del gesto a quando il telefono decide che è un colpo (sul telefono)
//       preparazione  attesa per capire se era una preparazione (solo gesti nel verso opposto al colpo atteso)
//       consegna      dal colpo deciso a quando arriva al computer (rete + coda dei messaggi), con gli orologi allineati
//       attesa palla  dall'arrivo all'impatto in gioco (il colpo anticipato aspetta lo sweet spot: è voluto)
//       a schermo     dall'impatto al primo fotogramma disegnato dopo
// Prima la registrazione si fermava da sola dopo 60 s e teneva tutto in memoria fino al download.
import { DiagRecorder } from './diag/diag_recorder.js';
import { createDiagStore } from './diag/diag_store.js';
import { compareMetrics, compareNote, summaryLines } from './diag/diag_metrics.js';
export { summaryLines };
import { buildPackage, download } from './diag/diag_export.js';
import { DIAG_PROTOCOLS, protocolDrills, expectedFor } from './diag/diag_protocol.js';
import { writeDisplayLagMs } from './natpf_phone_racket.js';

const $ = id => document.getElementById(id);
const r1 = v => (Number.isFinite(v) ? Math.round(v) : '–');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clock = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2, '0')}`;
const when = ms => new Date(ms).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

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
    this.swings = []; this.fps = 60; this.lastFrame = null;
    this.on = new URLSearchParams(location.search).get('diag') === '1';
    this.recorder = new DiagRecorder({ engine, ui });
    this.sessions = []; this.selected = new Set(); this.summary = null; this.busy = '';
    // video del gioco spento all'inizio: è quello che pesa sulle prestazioni (vedi compareNote); si accende quando serve
    this.opts = { webcamVideo: true, gameVideo: false, phoneSamples: true };
    window.addEventListener('keydown', e => {
      if (e.shiftKey && e.code === 'KeyD'){ e.preventDefault(); e.stopImmediatePropagation(); this.toggle(); }
      else if (e.shiftKey && e.code === 'KeyM' && this.recorder.active){ e.preventDefault(); e.stopImmediatePropagation(); this.recorder.mark('segno da tastiera'); this.ui?.toast?.('Momento segnato nella registrazione'); }
    }, true);
    const phone = engine.natpfPhone;
    phone.onSwing?.((ev, s) => this._onSwing(ev, s));
    this.recorder.onChange(() => this._paintRec());
    this.recorder.notify = text => this.ui?.toast?.(text);
    this.recorder.autoStop = async () => { await this.stop(); this.ui?.toast?.('Diagnostica chiusa: spazio su disco finito. Maiusc+D per scaricare la sessione'); };
    this._frame();
    if (this.on) this._build();
    // sessioni interrotte da recuperare: si avvisa una volta all'avvio
    this._store().then(st => st.list()).then(list => { const lost = list.filter(s => !s.ended && !s.live && !s.broken); if (lost.length) this.ui?.toast?.(`Sessione diagnostica interrotta da recuperare: Maiusc+D`); }).catch(() => {});
  }
  _store(){ return this.storeP || (this.storeP = createDiagStore().then(st => { this.store = this.recorder.store = st; return st; })); }
  toggle(){ this.on ? this.close() : this.open(); }
  open(){ this.on = true; this._build(); this.el.classList.remove('hidden'); this.refresh(); this.paint(); }
  close(){ this.on = false; this.el?.classList.add('hidden'); }
  _build(){
    if (this.el) return;
    const el = this.el = document.createElement('div');
    el.className = 'natpf-diag'; el.setAttribute('aria-live', 'off');
    el.innerHTML = `<div class="diag-head"><b>Diagnostica</b><button type="button" data-diag="close" aria-label="Chiudi">×</button></div>
      <section class="diag-rec" id="natpf-diag-rec"></section>
      <section class="diag-sessions"><div class="diag-sub">Sessioni salvate</div><div id="natpf-diag-list" class="diag-list"></div><div id="natpf-diag-compare"></div></section>
      <details class="diag-live"><summary>Dettagli tecnici in diretta</summary><pre id="natpf-diag-body"></pre></details>`;
    el.addEventListener('pointerdown', e => e.stopPropagation());
    el.addEventListener('keydown', e => e.stopPropagation());
    el.addEventListener('change', e => { const o = e.target.closest('[data-opt]'); if (o) this.opts[o.dataset.opt] = o.checked; const c = e.target.closest('[data-cmp]'); if (c){ c.checked ? this.selected.add(c.dataset.cmp) : this.selected.delete(c.dataset.cmp); this._paintCompare(); } });
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-diag]'); if (!b) return;
      e.stopPropagation();
      const id = b.dataset.id;
      ({ close: () => this.close(), start: () => this.start(), stop: () => this.stop(), mark: () => this.recorder.mark('segno'), protocol: () => this.startProtocol(),
        save: () => this.save(id), del: () => this.remove(id), recover: () => this.recover(id), lag: () => this.saveLag() }[b.dataset.diag] || (() => {}))();
    });
    document.body.appendChild(el);
    const rec = this.recEl = document.createElement('button');
    rec.type = 'button'; rec.className = 'natpf-rec hidden'; rec.title = 'Registrazione diagnostica in corso (Maiusc+D)';
    rec.addEventListener('pointerdown', e => e.stopPropagation()); rec.addEventListener('click', e => { e.stopPropagation(); this.open(); });
    document.body.appendChild(rec);
  }
  async refresh(){ try { const st = await this._store(); this.sessions = await st.list(); } catch { this.sessions = []; } this._paintList(); this._paintRec(); }
  async start({ protocol = null } = {}){
    if (this.recorder.active || this.busy) return;
    this.busy = 'Avvio…'; this._paintRec();
    try {
      await this._store();
      const label = this.el?.querySelector('[data-label]')?.value || protocol?.label || '';
      await this.recorder.start({ ...this.opts, label, protocol });
      this.summary = null; this.ui?.toast?.('Registrazione avviata: gioca normalmente, poi Maiusc+D → Ferma');
    } catch (e){ this.ui?.toast?.(`Registrazione non avviata: ${e?.message || e}`); }
    this.busy = ''; this._paintRec(); this.refresh();
  }
  // ritardo dello schermo (ms): solo dopo averlo misurato; vale per i colpi del telefono
  saveLag(){
    const input = this.el?.querySelector('[data-lag]'); if (!input) return;
    const v = writeDisplayLagMs(input.value);
    if (this.engine.natpfPhone) this.engine.natpfPhone.displayLagMs = v;
    this.ui?.toast?.(v ? `Ritardo dello schermo: ${v} ms (colpi del telefono)` : 'Ritardo dello schermo azzerato');
    this._paintRec();
  }
  // prova guidata: registrazione + allenamento con i colpi richiesti; alla fine si ferma da sola e mostra il riassunto
  async startProtocol(id = 'colpi'){
    const ui = this.ui, lobby = ui?.lobby;
    if (this.recorder.active || this.busy) return;
    if (!lobby?.visible){ ui?.toast?.('La prova guidata parte dal menu principale: torna al menu e riapri la diagnostica'); return; }
    if (ui.controller === 'mouse'){ ui?.toast?.('Scegli prima la racchetta: telefono o webcam (Gioca → Racchetta)'); return; }
    await this.start({ protocol: DIAG_PROTOCOLS[id] });
    if (!this.recorder.active) return;
    const R = this.recorder;
    const run = {
      onFeed: (drill, side) => R.log('atteso', expectedFor(drill, side)),
      onEnd: ({ completed }) => { R.log('marca', { testo: completed ? 'prova guidata completata' : 'prova guidata interrotta' }); this.stop().then(() => this.open()); },
    };
    this.close();
    if (!lobby.startDiag(protocolDrills(id, { controller: ui.controller }), run)){ ui?.toast?.('Collega prima il telefono, poi riapri la prova guidata'); await this.stop(); }
  }
  async stop(){
    if (!this.recorder.active) return;
    this.busy = 'Chiusura e calcolo delle metriche…'; this._paintRec();
    try {
      const res = await this.recorder.stop();
      const m = await this.store.metrics(res.id).catch(() => null);
      this.summary = { id: res.id, metrics: m, parts: res.parts || 1 };
      await this.refresh();
    } catch (e){ this.ui?.toast?.(`Problema nel chiudere la registrazione: ${e?.message || e}`); }
    this.busy = ''; this._paintRec();
  }
  async save(id){
    if (!id || this.busy) return;
    this.busy = 'Preparo il pacchetto…'; this._paintRec();
    try { const p = await buildPackage(this.store, id); download(p.blob, p.name); }
    catch (e){ this.ui?.toast?.(`Pacchetto non creato: ${e?.message || e}`); }
    this.busy = ''; this._paintRec(); this.refresh();
  }
  async recover(id){
    this.busy = 'Recupero la sessione…'; this._paintRec();
    try { await this.store.recover(id); await this.store.metrics(id).catch(() => null); }
    catch (e){ this.ui?.toast?.(`Recupero non riuscito: ${e?.message || e}`); }
    this.busy = ''; this.refresh();
  }
  async remove(id){
    if (!id || !confirm('Eliminare questa sessione diagnostica?')) return;
    try { await this.store.remove(id); this.selected.delete(id); } catch (e){ this.ui?.toast?.(`Eliminazione non riuscita: ${e?.message || e}`); }
    this.refresh();
  }
  _paintRec(){
    const R = this.recorder, box = $('natpf-diag-rec');
    if (this.recEl){
      this.recEl.classList.toggle('hidden', !R.active);
      if (R.active) this.recEl.textContent = `● REC ${clock((performance.now() - R.t0)/1000)}`;
    }
    if (!box) return;
    if (this.busy){ box.innerHTML = `<p class="diag-note">${esc(this.busy)}</p>`; return; }
    if (R.active){
      // i pulsanti si scrivono una volta sola (riscriverli a ogni aggiornamento può far perdere un clic): poi solo il testo
      const s = (performance.now() - R.t0)/1000, c = R.counts;
      const vids = (R.videos || []).filter(v => !v.stopped).map(v => v.kind);
      const text = `● Registrazione in corso · ${clock(s)}${R.part > 1 ? ` · parte ${R.part}` : ''} · ${c.eventi} eventi · ${(c.byte/1048576).toFixed(1)} MB${c.campioni ? ` · ${c.campioni} campioni del telefono` : ''}${vids.length ? ` · video: ${vids.join(', ')}` : R.videoOff ? ' · video fermati (spazio)' : ''}`;
      let st = box.querySelector('[data-rec-status]');
      if (!st){
        box.innerHTML = `<p class="diag-live-rec" data-rec-status></p>
          <div class="diag-actions"><button type="button" data-diag="mark">Segna questo momento (Maiusc+M)</button><button type="button" class="diag-stop" data-diag="stop">■ Ferma la registrazione</button></div>`;
        st = box.querySelector('[data-rec-status]');
      }
      st.textContent = text;
      return;
    }
    const o = this.opts, sum = this.summary;
    box.innerHTML = `<p class="diag-note">Registra una sessione mentre giochi: tutti i dati tecnici e, se vuoi, il video di chi gioca (webcam del computer) e del gioco. Poi scarichi il pacchetto con il rapporto.</p>
      <div class="diag-opts"><label><input type="checkbox" data-opt="webcamVideo" ${o.webcamVideo ? 'checked' : ''}> video della webcam (chi gioca)</label><label><input type="checkbox" data-opt="gameVideo" ${o.gameVideo ? 'checked' : ''}> video del gioco (pesa sulle prestazioni)</label><label><input type="checkbox" data-opt="phoneSamples" ${o.phoneSamples ? 'checked' : ''}> campioni dei sensori del telefono</label></div>
      <div class="diag-actions"><input data-label type="text" maxlength="80" placeholder="Nota (facoltativa): cosa provi in questa sessione"><button type="button" class="diag-start" data-diag="start">● Avvia registrazione</button></div>
      <div class="diag-actions"><button type="button" data-diag="protocol">▶ Prova guidata dei colpi (dal menu, ~4 min)</button><span class="diag-note">il lanciapalle chiede dritti, rovesci, pallonetti, incrociati e lungolinea: così si misura se il gioco riconosce il colpo richiesto</span></div>
      <details class="diag-lag"><summary>Ritardo dello schermo: ${this.engine.natpfPhone?.displayLagMs || 0} ms</summary>
        <p class="diag-note">Lascia 0 se non l'hai misurato. Si misura con la prova guidata (mediana del «tempo dei colpi del telefono»: se è in ritardo di molti ms a ogni sessione, lo schermo è un sospetto) o meglio con un video a 240 fps del telefono e del televisore insieme. Vale solo per i colpi del telefono.</p>
        <div class="diag-actions"><input data-lag type="number" min="0" max="200" step="5" value="${this.engine.natpfPhone?.displayLagMs || 0}"><button type="button" data-diag="lag">Salva</button></div></details>
      ${this.store?.kind === 'memory' ? `<p class="diag-warn">Questo browser non permette di scrivere su disco: la sessione resta in memoria (massimo 300 MB) e si perde se la pagina si chiude.</p>` : ''}
      ${sum ? `<div class="diag-summary"><b>Sessione appena registrata</b>${sum.parts > 1 ? `<p class="diag-note">Registrazione lunga, salvata in ${sum.parts} parti (30 minuti o 1 GB ciascuna): il riassunto è dell'ultima, le altre si scaricano dall'elenco qui sotto.</p>` : ''}<ul>${summaryLines(sum.metrics || {}).map(l => `<li>${esc(l)}</li>`).join('')}</ul><button type="button" data-diag="save" data-id="${esc(sum.id)}">⬇ Scarica il pacchetto</button></div>` : ''}`;
  }
  _paintList(){
    const box = $('natpf-diag-list'); if (!box) return;
    if (!this.sessions.length){ box.innerHTML = '<p class="diag-note">Nessuna sessione salvata.</p>'; this._paintCompare(); return; }
    box.innerHTML = this.sessions.map(s => {
      const id = esc(s.id);
      if (s.broken) return `<div class="diag-item"><span>${id} · non leggibile</span><button type="button" data-diag="del" data-id="${id}">Elimina</button></div>`;
      const dur = s.durationS ?? (s.savedAt && s.startedAt ? (s.savedAt - s.startedAt)/1000 : null);
      const mb = Object.values(s.files || {}).reduce((a, f) => a + (f.size || 0), 0)/1048576;
      const part = s.parte > 1 || s.prossima ? ` · parte ${s.parte || 1}` : '';
      const info = `${when(s.startedAt)}${part} · ${dur != null ? clock(dur) : '–'} · ${s.controller || '–'}${s.transport ? ' (' + s.transport + ')' : ''} · ${mb.toFixed(1)} MB${s.label ? ' · ' + esc(s.label) : ''}`;
      if (!s.ended && !s.live) return `<div class="diag-item diag-lost"><span>Interrotta · ${info}</span><button type="button" data-diag="recover" data-id="${id}">Recupera</button><button type="button" data-diag="del" data-id="${id}">Elimina</button></div>`;
      if (s.live) return `<div class="diag-item"><span>In registrazione · ${info}</span></div>`;
      return `<div class="diag-item"><label><input type="checkbox" data-cmp="${id}" ${this.selected.has(s.id) ? 'checked' : ''}> confronta</label><span>${info}</span><button type="button" data-diag="save" data-id="${id}">⬇ Scarica</button><button type="button" data-diag="del" data-id="${id}">Elimina</button></div>`;
    }).join('');
    this._paintCompare();
  }
  // confronto tra due sessioni scelte: metriche principali, variazione, meglio/peggio (oltre una soglia di rumore)
  async _paintCompare(){
    const box = $('natpf-diag-compare'); if (!box) return;
    const ids = [...this.selected].filter(id => this.sessions.some(s => s.id === id && s.ended));
    if (ids.length !== 2){ box.innerHTML = ids.length ? '<p class="diag-note">Scegli una seconda sessione da confrontare.</p>' : ''; return; }
    const [a, b] = ids.map(id => this.sessions.find(s => s.id === id)).sort((x, y) => x.startedAt - y.startedAt);
    const ma = await this.store.metrics(a.id).catch(() => null), mb = await this.store.metrics(b.id).catch(() => null);
    if (!ma || !mb){ box.innerHTML = '<p class="diag-warn">Metriche non disponibili per una delle due sessioni.</p>'; return; }
    const rows = compareMetrics(ma, mb).filter(r => r.esito !== 'n.d.'), note = compareNote(ma, mb);
    box.innerHTML = `<div class="diag-sub">Confronto: ${esc(when(a.startedAt))} → ${esc(when(b.startedAt))}</div>${note ? `<p class="diag-warn">${esc(note)}</p>` : ''}<table class="diag-cmp"><tr><th>metrica</th><th>prima</th><th>dopo</th><th></th></tr>${rows.map(r => `<tr class="cmp-${r.esito}"><td>${esc(r.label)}</td><td>${r.prima}</td><td>${r.dopo}</td><td>${r.esito}</td></tr>`).join('') || '<tr><td colspan="4">Nessuna metrica in comune.</td></tr>'}</table>`;
  }
  _frame(){
    const loop = t => {
      if (this.lastFrame != null){ const dt = Math.max(1, t - this.lastFrame); this.fps += (1000/dt - this.fps)*.05; }
      this.lastFrame = t;
      // primo fotogramma dopo un impatto
      const last = this.swings[this.swings.length - 1];
      if (last && last.hitAt != null && last.frameAt == null) last.frameAt = t/1000;
      if (this.on && (!this._painted || t - this._painted > 250)){ this._painted = t; this.paint(); if (this.recorder.active) this._paintRec(); }
      if (this.recorder.active && this.recEl && (!this._recPainted || t - this._recPainted > 500)){ this._recPainted = t; this.recEl.textContent = `● REC ${clock((performance.now() - this.recorder.t0)/1000)}`; }
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
  }
  // esito del colpo del giocatore locale (dall'aptica del motore)
  onFeedback(e = {}, q = null){
    this.recorder.onFeedback(e, q);
    const last = this.swings[this.swings.length - 1];
    if (!last || last.hitAt != null || !/hit|fault|whiff/.test(e.kind || '')) return;
    if (performance.now()/1000 - last.s.receivedAt > 1.5) return;
    last.hitAt = performance.now()/1000;
    const ls = this.engine.natpfSkill?.lastShot;
    last.result = { kind: e.kind, grade: e.grade, quality: q?.label || null, landingX: ls ? +ls.landingX.toFixed(2) : null, landingZ: ls && Number.isFinite(ls.landingZ) ? +ls.landingZ.toFixed(2) : null };
  }
  paint(){
    const body = $('natpf-diag-body'); if (!body) return;
    const ph = this.engine.natpfPhone, link = ph.link, st = link?.stats?.() || { rates: {} }, R = st.rates || {};
    const rate = k => (R[k] ? `${R[k].hz} Hz (${R[k].ageMs} ms fa)` : '–');
    const L = link?.L || {};
    const lines = [
      `collegamento  ${link?.transport || '–'} · ${ph.connected ? 'collegato' : 'non collegato'}${ph.ready ? ' · pronto' : ''}${L.vis === false ? ' · pagina del telefono nascosta' : ''}${L.wake === 0 ? ' · schermo del telefono non bloccato acceso' : L.wake === -1 ? ' · blocco dello schermo non supportato' : ''}`,
      `orologi       RTT ${r1(st.rtt)} ms · gioco ${r1(this.fps)} fps · sensori del telefono ${r1(L.hz)} Hz`,
      `flussi        piatto ${rate('fo')} · binario ${rate('bin')} · giroscopio json ${rate('sm')} · grezzi ${rate('rs')}`,
      st.swings ? `copie dei colpi  prima dal percorso veloce ${st.swings.fast} · dal canale affidabile ${st.swings.reliable} · doppioni scartati ${st.swings.dup}` : '',
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
    body.textContent = lines.filter((l, i) => l || i > 3).join('\n');
  }
}
