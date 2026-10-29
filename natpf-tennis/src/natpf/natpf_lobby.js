// Menu di NATPF Simulator, con il percorso di un gioco da console (dopo l'intro, natpf_intro.js):
//   menu principale ─ Gioca ─────────→ modalità (contro la CPU · sfida un amico) → racchetta (smartphone o webcam,
//                   │                   (stesso schermo: modalità → i due telefoni → partita, natpf_split_ui.js)
//                   │                   mano) → collega (QR e tre passi sul telefono, o la webcam) → riscaldamento in
//                   │                   campo (calibrazione + lanciapalle, natpf_training.js, saltabile) → partita
//                   │                   (livello o invito dell'amico, durata, visuale) → «Gioca»: passaggio al campo
//                   ├ Sfide ─────────→ sfida → nickname → racchetta → collega → (calibrazione) → sfida in campo →
//                   │                   risultato con la posizione in classifica (natpf_events.js)
//                   ├ Classifica del giorno
//                   ├ Allenamento ───→ racchetta → collega → campo d'allenamento → di nuovo al menu con il risultato
//                   ├ Come si gioca → guida con le clip (natpf_onboarding.js)
//                   └ Opzioni ───────→ mano, visuale, musica, voce, colpi imparati, intro
// Un pulsante grande per pagina, «Indietro» sempre visibile, frecce + Invio + Esc come con un joypad.
// Appena il telefono ha i sensori attivi si entra in campo da soli; con la webcam appena si vede la mano.
// Dietro il menu gira una dimostrazione: nessun gesto la trasforma in partita (natpf_ui.js, _gateInput).
// Pausa, «Torna al menu» e il «Menu» della schermata finale riportano al menu principale.
// Easter egg: digitando «natpf» nel menu compaiono mouse e tastiera (modalità prova per il computer).
import { FORMAT_KEY } from './match_format.js';
import { CHALLENGES, challengeById, validNickname } from './natpf_events.js';
import { MEDAL_LABEL, nextMedal, medalCount } from './natpf_arcade.js';
// icone dei minigiochi (natpf_arcade.MODES[].icon)
const ARCADE_ICONS = {
  target: '<svg class="tile-icon" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="17"/><circle cx="24" cy="24" r="10"/><circle cx="24" cy="24" r="3"/><path d="M36 12l6-6M38 6h4v4"/></svg>',
  zone: '<svg class="tile-icon" viewBox="0 0 48 48" aria-hidden="true"><path d="M6 40 14 8h20l8 32z"/><path d="M10 26h28M24 8v32"/><circle cx="31" cy="33" r="4"/></svg>',
  chain: '<svg class="tile-icon" viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="18" width="16" height="12" rx="6"/><rect x="27" y="18" width="16" height="12" rx="6"/><path d="M17 24h14"/></svg>',
  heart: '<svg class="tile-icon" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 40S7 29 7 17a8 8 0 0 1 17-4 8 8 0 0 1 17 4c0 12-17 23-17 23z"/></svg>',
  radar: '<svg class="tile-icon" viewBox="0 0 48 48" aria-hidden="true"><path d="M8 34a17 17 0 1 1 32 0"/><path d="M24 34l9-13"/><circle cx="24" cy="34" r="3"/></svg>',
};
import { warmupDrills } from './natpf_training.js';
import { hostLobbyStatus, roomCode, joinUrl } from './natpf_versus.js';
import { p2pRequested } from './natpf_p2p.js';
const $ = id => document.getElementById(id);
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const LOBBY_STEPS = ['menu', 'mode', 'options', 'challenges', 'ranking', 'result', 'controller', 'connect', 'warmup', 'match'];
export const MODES = ['cpu', 'friend', 'training', 'challenge', 'split'];
// tappe mostrate nella barra di avanzamento, per modalità
export function progressSteps(mode){
  if (mode === 'challenge') return [['challenges', 'Sfida'], ['controller', 'Racchetta'], ['connect', 'Collega'], ['warmup', 'In campo']];
  if (mode === 'split') return [['mode', 'Modalità'], ['connect', 'Telefoni'], ['match', 'Partita']];
  return mode === 'training' ? [['controller', 'Racchetta'], ['connect', 'Collega'], ['warmup', 'Allenamento']]
    : [['mode', 'Modalità'], ['controller', 'Racchetta'], ['connect', 'Collega'], ['warmup', 'Riscaldamento'], ['match', 'Partita']];
}
// tappa precedente («Indietro» ed Esc)
export function previousStep(step, mode){
  if (['mode', 'options', 'challenges', 'ranking', 'result'].includes(step)) return 'menu';
  if (step === 'controller') return mode === 'training' ? 'menu' : mode === 'challenge' ? 'challenges' : 'mode';
  if (step === 'connect') return mode === 'split' ? 'mode' : 'controller';
  if (step === 'match') return 'connect';
  return null;
}
export const EGG_WORD = 'natpf';
// sfida un amico: la barra dell'invito resta in vista in questi passi dell'host; la stanza che non nasce entro 20 s è
// un errore (con «Riprova»). Senza server, dopo un ricaricamento, l'id della stanza può restare occupato per qualche
// secondo (natpf_p2p.createHostRoom riprova per ~13 s)
export const INVITE_STEPS = ['controller', 'connect', 'match'];
export const ROOM_WAIT_MS = 20000;
// Il controller è pronto per entrare in campo? (funzione pura, per i test)
//   telefono: collegato e con i sensori attivi (la calibrazione si fa in campo, nel riscaldamento)
//   stesso schermo: i due telefoni pronti (calibrati o con il profilo semplice)
export function stepReady(step, { controller, phoneLinked, webcamActive, mode = null, splitReady = false }){
  if (step === 'connect' && mode === 'split') return !!splitReady;
  if (step === 'connect') return controller === 'phone' ? !!phoneLinked : controller === 'webcam' ? !!webcamActive : true;
  return true;
}
// Si entra in campo da soli quando il controller è pronto (telefono con i sensori attivi, webcam che vede la mano)
export function autoAdvance(step, { controller, phoneLinked, handSeen, mode = null, splitReady = false }){
  if (mode === 'split') return step === 'connect' && !!splitReady;
  return step === 'connect' && (controller === 'phone' ? !!phoneLinked : controller === 'webcam' ? !!handSeen : false);
}
// Ogni visitatore riparte dal menu principale (dopo l'intro)
export const initialStep = () => 'menu';
// Voce più vicina nella direzione della freccia (rettangoli come getBoundingClientRect), null se non ce n'è una.
// Su/giù: prima la distanza in verticale, poi lo scarto di lato; destra/sinistra: solo nella stessa riga.
export function nearestTile(tiles, from, code, rect = el => el.getBoundingClientRect()){
  const a = rect(from), ax = a.left + a.width/2, ay = a.top + a.height/2, vertical = code === 'ArrowUp' || code === 'ArrowDown';
  let best = null, bd = Infinity;
  for (const t of tiles){
    if (t === from) continue;
    const b = rect(t), dx = b.left + b.width/2 - ax, dy = b.top + b.height/2 - ay;
    const ok = code === 'ArrowUp' ? dy < -4 : code === 'ArrowDown' ? dy > 4 : code === 'ArrowLeft' ? dx < -4 && Math.abs(dy) < a.height/2 : dx > 4 && Math.abs(dy) < a.height/2;
    if (!ok) continue;
    const dist = vertical ? Math.abs(dy) + 2*Math.abs(dx) : Math.abs(dx);
    if (dist < bd){ bd = dist; best = t; }
  }
  return best;
}
// Riconosce la parola dell'easter egg tra i tasti digitati
export function eggTyped(buffer, key){ const next = (buffer + String(key || '').toLowerCase()).slice(-EGG_WORD.length); return { buffer: next, hit: next === EGG_WORD }; }

export class NatpfLobby {
  constructor(engine, ui, onboarding){
    this.engine = engine; this.ui = ui; this.onboarding = onboarding;
    this.el = $('title-modal');
    this.eggBuffer = '';
    this.trainingDone = false;
    this.mode = 'cpu';
    this.autoFrom = null;            // tappa da cui si è già entrati in campo da soli (una volta sola)
    this.step = initialStep();
    this.el.addEventListener('click', e => {
      const m = e.target.closest('[data-menu]'); if (m){ e.stopPropagation(); this.menu(m.dataset.menu); return; }
      const t = e.target.closest('[data-mode]'); if (t){ e.stopPropagation(); this.setMode(t.dataset.mode); setTimeout(() => this.go(this.mode === 'split' ? 'connect' : 'controller'), 160); return; }
      const o = e.target.closest('[data-option]'); if (o){ e.stopPropagation(); this.option(o.dataset.option); return; }
      const sc = e.target.closest('[data-natpf-screen]'); if (sc){ e.stopPropagation(); this.ui.screen?.set(sc.dataset.natpfScreen); this.paint(); return; }
      const f = e.target.closest('[data-natpf-format]'); if (f){ e.stopPropagation(); this.setFormat(f.dataset.natpfFormat); return; }
      const ch = e.target.closest('[data-challenge]'); if (ch){ e.stopPropagation(); this.pickChallenge(ch.dataset.challenge); return; }
      const tab = e.target.closest('[data-ranking]'); if (tab){ e.stopPropagation(); this.rankingTab = tab.dataset.ranking; this._paintRanking(); return; }
      const r = e.target.closest('[data-result]'); if (r){ e.stopPropagation(); this._resultAction(r.dataset.result); return; }
      // scegliere la racchetta è già andare avanti
      const c = e.target.closest('[data-natpf-controller]'); if (c && this.step === 'controller') setTimeout(() => this.go('connect'), 160);
    });
    $('lobby-next').addEventListener('click', e => { e.stopPropagation(); this.next(); });
    $('lobby-back').addEventListener('click', e => { e.stopPropagation(); this.back(); });
    $('lobby-warmup').addEventListener('click', e => { e.stopPropagation(); this.go('warmup'); });
    $('lobby-help').addEventListener('click', e => { e.stopPropagation(); this.onboarding.open(); });
    $('setup-cam-go').addEventListener('click', async e => { e.stopPropagation(); await this.ui.startWebcam(); this.paint(); });
    $('connect-other')?.addEventListener('click', e => { e.stopPropagation(); this.ui.selectController(this.ui.controller === 'phone' ? 'webcam' : 'phone', { open: false }); this.go('connect'); });
    // «Ti hanno invitato?»: il codice della stanza scritto a mano porta alla pagina del Player 2 (senza aspettare il link)
    $('join-form')?.addEventListener('submit', e => { e.preventDefault(); e.stopPropagation(); this.joinWithCode($('join-code')?.value); });
    this.el.addEventListener('pointerdown', e => e.stopPropagation());
    // menu principale: sotto le voci la descrizione di quella scelta (frecce, mouse o tocco)
    // a sinistra la voce evidenziata in grande (titolo e descrizione), come nei menu delle console
    const describe = e => {
      const m = e.target?.closest?.('[data-menu]'), d = $('menu-desc'), t = $('lobby-t-menu');
      if (m && d && m.dataset.desc && d.textContent !== m.dataset.desc) d.textContent = m.dataset.desc;
      if (m && t && m.dataset.title && t.textContent !== m.dataset.title) t.textContent = m.dataset.title;
    };
    this.el.addEventListener('focusin', describe); this.el.addEventListener('pointerover', describe);
    // tastiera del menu prima di quella del motore (che con Spazio/Invio/frecce colpirebbe)
    window.addEventListener('keydown', e => this._key(e), true);
    // il «Menu» della schermata finale riapre la lobby: si torna al menu principale
    $('btn-return-title')?.addEventListener('click', () => this.ui.backToMenu());
    // formato della partita (1v1 o 2v2): vale da «Gioca»; il riscaldamento è sempre in singolare
    let fmt = 'singles'; try { fmt = localStorage.getItem(FORMAT_KEY) || 'singles'; } catch {}
    this.setFormat(fmt);
    $('btn-start-match')?.addEventListener('click', () => this.engine.setMatchFormat?.(this.mode === 'split' ? 'singles' : this.format), true);
    // partite brevi: in fiera si gioca un game
    document.querySelector('#match-length-group [data-games="1"]')?.click();
    this.go(this.step);
    setInterval(() => this.visible && this.paint(), 300);   // stato di telefono e webcam
  }
  get visible(){ return this.el.style.display !== 'none' && !this.el.classList.contains('hidden'); }
  state(){
    const p = this.ui.phone, L = p.state, mc = this.engine.motionController;
    return {
      mode: this.mode, splitReady: this.mode === 'split' && !!this.ui.split?.bothReady(),
      controller: this.ui.controller,
      phoneConnected: p.connected, phoneReady: p.ready,
      phoneLinked: p.connected && (L.phone === 'cal' || L.phone === 'ready'),
      webcamActive: !!mc?.webcamActive,
      // mano vista dal modello o un colpo visto dal movimento (webcam_motion.js)
      handSeen: !!mc?.webcamActive && (performance.now() - (mc.latestHandSeenAt || -1e9) < 600 || performance.now() - (mc.webcamMotionAt ?? -1e9) < 1500),
    };
  }
  /* ---------- menu principale, modalità, opzioni ---------- */
  menu(item){
    if (item === 'play'){ this.go('mode'); return; }
    if (item === 'challenges'){ this.go('challenges'); return; }
    if (item === 'ranking'){ this.go('ranking'); return; }
    if (item === 'training'){ this.setMode('training'); this.go('controller'); return; }
    if (item === 'guide'){ this.onboarding.open(); return; }
    if (item === 'options') this.go('options');
  }
  setMode(mode){
    if (!MODES.includes(mode)) return;
    if (mode === 'friend' && this.mode !== 'friend') this.roomAskedAt = performance.now();
    this.mode = mode; this.el.dataset.flow = mode;
    for (const t of this.el.querySelectorAll('[data-mode]')){ const on = t.dataset.mode === mode; t.classList.toggle('selected', on); t.setAttribute('aria-checked', String(on)); }
    // la scelta della modalità decide gli avversari della pagina «Partita»: CPU (facile, esperta o Leggenda) o 1v1 con invito
    const diff = this.engine.hud?.selectedDifficulty, versus = mode === 'friend' || mode === 'split';
    if (versus && diff !== '1v1') document.querySelector('#difficulty-mode-group [data-difficulty="1v1"]')?.click();
    // stesso schermo: due telefoni sullo stesso computer (niente stanza in rete); lasciandolo la sessione split finisce
    if (mode === 'split'){ this.ui.selectController?.('phone', { open: false }); this.ui.split?.prepare(); }
    else this.ui.split?.end();
    // sfida un amico: la stanza nasce subito (così l'amico può entrare mentre si prepara la racchetta); scegliendo
    // un'altra modalità la stanza si chiude e il Player 2 lo sa (prima restava aperta e i suoi colpi dirottavano la
    // partita contro la CPU)
    if (mode === 'friend' && diff === '1v1' && !this.engine.versus?.active && this.engine.playerRole !== 'p2') this.engine.createMultiplayerRoom?.();
    if (mode !== 'friend'){ this.engine.endVersus?.(); this.ui.inviteUrl = null; const box = $('natpf-invite'); if (box){ box.innerHTML = ''; box.dataset.pending = ''; } }
    // lasciando «Sfida un amico» (anche per allenamento o sfide) si torna alla CPU: prima allenamento e sfide ripristinavano
    // alla fine il 1v1 senza stanza
    if (!versus && diff === '1v1') document.querySelector('#difficulty-mode-group [data-difficulty="casual"]')?.click();
    for (const b of document.querySelectorAll('#difficulty-mode-group [data-difficulty]')) show(b, versus ? b.dataset.difficulty === '1v1' : b.dataset.difficulty !== '1v1');
    // stesso schermo: solo singolare (una metà per giocatore)
    for (const b of this.el.querySelectorAll('[data-natpf-format="doubles"]')) show(b, mode !== 'split');
    // la tessera del 1v1 nella pagina «Partita» dice quale 1v1: su due computer o sullo stesso schermo
    const tile = document.querySelector('#difficulty-mode-group [data-difficulty="1v1"]');
    if (tile){
      const n = tile.querySelector('.tile-name'), d = tile.querySelector('.tile-desc');
      if (n) n.textContent = mode === 'split' ? 'Stesso schermo' : 'Sfida un amico';
      if (d) d.textContent = mode === 'split' ? '1v1 su un computer, due telefoni' : '1v1 su due computer';
    }
    this.paint();
  }
  /* ---------- sfide, nickname, classifica ---------- */
  pickChallenge(id){
    if (!challengeById(id)) return;
    this.challenge = id; this.setMode('challenge');
    // solo il nickname: chiesto una volta per visitatore (il chiosco lo dimentica quando lo stand torna libero)
    this.askNickname(() => this.go('controller'));
  }
  askNickname(then){
    const ev = this.ui.events, box = $('natpf-nick'), input = $('nick-input'), warn = $('nick-warn');
    if (ev.nickname){ then(); return; }
    this._nickThen = then; input.value = ''; show(warn, false); show(box); setTimeout(() => input.focus(), 50);
    if (!this._nickBound){
      this._nickBound = true;
      box.addEventListener('pointerdown', e => e.stopPropagation());
      box.addEventListener('keydown', e => e.stopPropagation());
      $('nick-cancel').addEventListener('click', e => { e.stopPropagation(); show(box, false); });
      $('nick-form').addEventListener('submit', e => {
        e.preventDefault(); e.stopPropagation();
        const v = validNickname(input.value);
        if (!v.ok){ warn.textContent = v.why; show(warn); return; }
        this.ui.events.nickname = v.nick; show(box, false); const t = this._nickThen; this._nickThen = null; t?.();
      });
    }
  }
  // Minigiochi: in testa livello, esperienza e medaglie raccolte; per ogni gioco icona, regole, medaglia migliore,
  // record personale, prossima medaglia e record del giorno
  _paintChallenges(){
    const box = $('challenge-tiles'); if (!box) return;
    const ev = this.ui.events;
    if (!box.dataset.built){
      box.dataset.built = '1';
      box.innerHTML = CHALLENGES.map(c => `<button type="button" class="lobby-tile mode-tile arcade-tile" data-challenge="${c.id}" role="radio">${ARCADE_ICONS[c.icon] || ''}<span class="tile-medal" data-medal-of="${c.id}"></span><span class="tile-name">${c.label}</span><span class="tile-desc">${c.short}</span><ul class="mode-facts">${c.facts.map(f => `<li>${f}</li>`).join('')}</ul><span class="tile-record" data-record="${c.id}"></span><span class="tile-best" data-best="${c.id}"></span></button>`).join('');
    }
    for (const c of CHALLENGES){
      const rec = ev.record?.(c.id), medal = box.querySelector(`[data-medal-of="${c.id}"]`), recEl = box.querySelector(`[data-record="${c.id}"]`), best = box.querySelector(`[data-best="${c.id}"]`);
      if (medal){ medal.dataset.medal = rec?.medal || ''; medal.textContent = rec?.medal ? MEDAL_LABEL[rec.medal] : ''; }
      const nx = nextMedal(c.id, rec?.best ?? 0);
      if (recEl) recEl.textContent = rec?.best != null ? `Record personale ${rec.best} ${c.unit}${nx ? ` · ${MEDAL_LABEL[nx.medal]} a ${nx.need}` : ' · tutte le medaglie'}` : `Bronzo a ${c.medals[0]} ${c.unit}`;
      const top = ev.top(c.id, 1)[0];
      if (best) best.textContent = top ? `Oggi: ${top.score} ${c.unit} · ${top.nick}` : 'Nessun record oggi: il primo è tuo';
    }
    const L = ev.level || { level: 1, into: 0, next: 500 }, mc = medalCount(ev.records || {});
    const head = $('arcade-progress');
    if (head) head.innerHTML = `<span class="ap-level"><b>Livello ${L.level}</b><i style="--p:${Math.round(100*L.into/L.next)}%"></i><small>${L.into}/${L.next} XP</small></span><span class="ap-medals"><i data-medal="gold">${mc.gold}</i><i data-medal="silver">${mc.silver}</i><i data-medal="bronze">${mc.bronze}</i></span>`;
    const note = $('challenge-nick-note'); if (note) note.textContent = ev.nickname ? `Giochi come ${ev.nickname}` : 'Prima del minigioco ti chiediamo solo un nickname per la classifica.';
  }
  _paintRanking(){
    const tabs = $('ranking-tabs'), list = $('ranking-list'); if (!tabs || !list) return;
    this.rankingTab = challengeById(this.rankingTab) ? this.rankingTab : CHALLENGES[0].id;
    tabs.innerHTML = CHALLENGES.map(c => `<button type="button" class="seg-btn ${c.id === this.rankingTab ? 'selected' : ''}" data-ranking="${c.id}" role="tab">${c.label}</button>`).join('');
    const c = challengeById(this.rankingTab), top = this.ui.events.top(c.id, 10);
    list.innerHTML = top.length ? top.map((e, i) => `<li><b>${i + 1}</b><span>${esc(e.nick)}</span><em>${e.score} ${c.unit}</em></li>`).join('') : '<li class="empty">Ancora nessun risultato oggi</li>';
  }
  showResult(r){
    this.lastResult = r; this.rankingTab = r.id;
    this.go('result');
    $('result-kicker').textContent = r.label;
    $('lobby-t-result').textContent = r.medal ? `${MEDAL_LABEL[r.medal]}, ${r.nick}!` : `Bravo, ${r.nick}!`;
    const medal = $('result-medal');
    if (medal){ medal.dataset.medal = r.medal || ''; medal.innerHTML = r.medal ? `<b>${MEDAL_LABEL[r.medal]}</b>` : ''; show(medal, !!r.medal); }
    $('result-score').innerHTML = `${r.score}<small>${r.unit}</small>`;
    const badges = [r.isRecord && r.prevBest != null ? '<span class="rb rb-record">Nuovo record personale</span>' : r.best != null ? `<span class="rb">Record personale ${r.best} ${r.unit}</span>` : '',
      r.xp ? `<span class="rb rb-xp">+${r.xp} XP · livello ${r.level?.level ?? 1}</span>` : '', ...(r.stats || []).map(x => `<span class="rb">${esc(x)}</span>`)].filter(Boolean);
    const b = $('result-badges'); if (b) b.innerHTML = badges.join('');
    $('result-rank').textContent = `${r.rank}° posto su ${r.total} di oggi`;
    const c = challengeById(r.id);
    $('result-top').innerHTML = this.ui.events.top(r.id, 5).map((e, i) => `<li class="${i + 1 === r.rank ? 'me' : ''}"><b>${i + 1}</b><span>${esc(e.nick)}</span><em>${e.score} ${c.unit}</em></li>`).join('');
  }
  _resultAction(a){
    if (a === 'again'){ this.setMode('challenge'); this.startWarmup(); return; }
    if (a === 'ranking'){ this.go('ranking'); return; }
    this.go('menu');
  }
  setFormat(id){
    this.format = id === 'doubles' ? 'doubles' : 'singles';
    try { localStorage.setItem(FORMAT_KEY, this.format); } catch {}
    for (const b of this.el.querySelectorAll('[data-natpf-format]')){ const on = b.dataset.natpfFormat === this.format; b.classList.toggle('selected', on); b.setAttribute('aria-checked', String(on)); }
    const opp = $('setup-opponent-label');
    if (opp) opp.textContent = this.mode === 'split' ? 'Player 2 · stesso schermo' : this.mode === 'friend' ? (this.format === 'doubles' ? 'Amico + CPU' : 'Amico') : this.format === 'doubles' ? '2 CPU' : 'CPU';
    const you = this.el.querySelector('.you-tag'); if (you) you.textContent = this.mode === 'split' ? 'Player 1' : this.format === 'doubles' ? 'Tu + CPU' : 'Tu';
  }
  option(name){
    const click = id => $(id)?.click();
    if (name === 'music') click('btn-audio-toggle');
    if (name === 'voice') click('btn-voice-toggle');
    if (name === 'specials'){ this.ui.phone.resetSpecials?.(); this.ui.toast('Pallonetto e palla corta: si reimparano nel prossimo allenamento'); }
    if (name === 'intro'){ this.ui.intro?.play('full'); return; }
    this.paint();
  }
  _paintOptions(){
    const audio = this.engine.audioEngine;
    this.ui.syncVolumes?.();
    const set = (k, on) => { const b = this.el.querySelector(`[data-option="${k}"] b`); if (b) b.textContent = on ? 'Sì' : 'No'; };
    set('music', audio ? !audio.muted : true);
    set('voice', audio?.voice ? !!audio.voice.enabled : true);
    // schermo: con un'area dall'indirizzo (?area=) nessuna scelta è accesa (vale l'indirizzo)
    const scr = this.ui.screen, cur = scr?.area ? null : scr?.preset;
    for (const b of this.el.querySelectorAll('[data-natpf-screen]')){ const on = b.dataset.natpfScreen === cur; b.classList.toggle('selected', on); b.setAttribute('aria-checked', String(on)); }
  }
  go(step){
    if (!LOBBY_STEPS.includes(step)) return;
    if (step === 'warmup'){ if (this.mode === 'split') step = 'match'; else { this.startWarmup(); return; } }
    if (step !== 'ranking') document.documentElement.classList.remove('ranking-full');
    if (step === 'menu' && this.step !== 'menu' && (this.mode === 'training' || this.mode === 'challenge')) this.mode = 'cpu';
    this.step = step; this.el.dataset.step = step; this.el.dataset.flow = this.mode;
    for (const p of this.el.querySelectorAll('[data-page]')) p.classList.toggle('on', p.dataset.page === step);
    if (step !== 'menu') show($('lobby-menu-result'), false);
    if (step === 'challenges') this._paintChallenges();
    if (step === 'ranking') this._paintRanking();
    if (step === 'match'){ this.setMode(this.mode === 'training' ? 'cpu' : this.mode); this.setFormat(this.format); }
    if (step === 'connect'){
      // si entra in campo da soli solo quando il controller diventa pronto mentre si è qui (non tornando indietro)
      this.autoFrom = autoAdvance('connect', this.state()) ? 'connect' : null;
      if (this.mode === 'split') this.ui.split?.prepare();
      else if (this.ui.controller === 'phone') this.ui.phone.start().catch(err => this.ui._warn(`Collegamento non disponibile (${err.message}).`));
      if (this.ui.controller === 'webcam' && !this.engine.motionController?.webcamActive) this.ui.startWebcam().then(() => this.paint());
    }
    this.paint();
    requestAnimationFrame(() => (this._tiles().find(t => t.classList.contains('selected')) || this._tiles()[0] || this._primary())?.focus({ preventScroll: true }));
  }
  _primary(){ return this.step === 'match' ? $('btn-start-match') : $('lobby-next'); }
  paint(){
    const st = this.state(), steps = progressSteps(this.mode), k = steps.findIndex(([id]) => id === this.step);
    const bar = $('lobby-progress');
    if (bar){
      const key = this.mode + ':' + this.step;
      if (bar.dataset.key !== key){ bar.dataset.key = key; bar.innerHTML = steps.map(([id, label], i) => `<li class="${i === k ? 'on' : i < k ? 'done' : ''}"><b>${i + 1}</b><span>${label}</span></li>`).join(''); }
    }
    const menu = this.step === 'menu', match = this.step === 'match', pick = ['mode', 'options', 'challenges', 'ranking', 'result'].includes(this.step);
    show($('lobby-back'), !menu && this.step !== 'result');
    show($('lobby-next'), !menu && !match && !pick);
    show($('btn-start-match'), match);
    show($('lobby-warmup'), match && this.mode !== 'split');
    // tasti come su una console: nel menu le frecce scelgono, nelle altre pagine Invio va avanti
    const keys = this.el.querySelector('.lobby-keys'), kt = menu ? '↑ ↓ ← → scegli · Invio conferma · H come si gioca' : 'Invio avanti · Esc indietro';
    if (keys && keys.textContent !== kt) keys.textContent = kt;
    const next = $('lobby-next');
    next.disabled = !stepReady(this.step, st);
    const split = this.mode === 'split';
    next.textContent = this.step === 'connect' ? (split ? 'Alla partita ›' : this.mode === 'training' ? 'Al campo d’allenamento ›' : 'In campo ›') : 'Avanti ›';
    // collega: pannello del controller scelto (stesso schermo: i due telefoni)
    for (const p of this.el.querySelectorAll('[data-setup]')) show(p, p.dataset.setup === (split ? 'split' : st.controller));
    const other = $('connect-other');
    if (other){ show(other, st.controller !== 'mouse' && !split); other.textContent = st.controller === 'phone' ? 'Non hai il telefono a portata? Usa la webcam' : 'Preferisci il telefono? Usa lo smartphone'; }
    $('lobby-t-connect').textContent = split ? 'Collega i due telefoni' : st.controller === 'phone' ? 'Collega il telefono' : st.controller === 'webcam' ? 'Accendi la webcam' : 'Mouse e tastiera';
    $('lobby-t-match').textContent = split ? 'Stesso schermo' : this.mode === 'friend' ? 'Sfida un amico' : 'Pronto per la partita';
    if (this.step === 'connect' && split) this.ui.split?.paint();
    else if (this.step === 'connect' && st.controller === 'phone') this.ui.paintConnect();
    if (this.step === 'options') this._paintOptions();
    this.ui.paintWebcamSetup?.();
    this._paintInvite();
    const note = $('lobby-match-note');
    if (note) note.textContent = split ? (st.splitReady ? 'Player 1 a sinistra, Player 2 a destra. Ognuno guarda la sua metà.' : 'Un telefono non è pronto: torna a «Telefoni».') : st.controller === 'phone' && !st.phoneReady ? 'Il telefono va ricollegato: premendo «Gioca» compare il QR.' : '';
    // telefono con i sensori attivi o mano vista dalla webcam: si entra in campo da soli, ma non con la guida aperta (prima
    // il riscaldamento partiva sotto la guida e il suo «Prova» lo faceva ripartire come allenamento)
    if (this.visible && autoAdvance(this.step, st) && this.autoFrom !== this.step && !this.onboarding.isOpen){
      this.autoFrom = this.step;
      setTimeout(() => { if (this.visible && this.step === 'connect' && !this.onboarding.isOpen) this.go(split ? 'match' : 'warmup'); else this.autoFrom = null; }, 700);
    }
  }
  // Sfida un amico (host): la barra dell'invito (codice, link, stato del Player 2) resta in vista dalla racchetta alla
  // partita, così il link parte subito e l'amico entra mentre ci si prepara. Finché la stanza non c'è, «Creo la
  // stanza…»; dopo ROOM_WAIT_MS l'errore con «Riprova»
  _paintInvite(){
    const box = $('natpf-invite'); if (!box) return;
    const on = this.mode === 'friend' && this.engine.playerRole !== 'p2' && INVITE_STEPS.includes(this.step);
    show(box, on);
    if (!on || (this.ui.inviteUrl && this.ui.versus?.hostActive)) return;
    const failed = performance.now() - (this.roomAskedAt || 0) > ROOM_WAIT_MS, key = failed ? 'failed' : 'wait';
    if (box.dataset.pending === key) return;
    box.dataset.pending = key;
    const line = hostLobbyStatus('waiting', { roomId: '', failed });
    box.innerHTML = `<p class="versus-state" data-versus-state data-state="${line.state}">${line.text}</p>${failed ? '<button type="button" class="nt-pill-btn" data-room-retry>Riprova</button>' : ''}`;
    box.querySelector('[data-room-retry]')?.addEventListener('click', ev => { ev.stopPropagation(); this.roomAskedAt = performance.now(); box.dataset.pending = ''; this.engine.createMultiplayerRoom?.(); this.paint(); });
  }
  // Player 2 con il codice (dettato a voce, scritto su un foglio): stessa pagina con stanza e ruolo. Con il server (LAN,
  // npm run dev) la stanza la tiene il server; sul sito pubblicato ci si collega al computer dell'host (net=p2p)
  async joinWithCode(text){
    const warn = $('join-warn'), code = roomCode(text);
    if (!code){ if (warn){ warn.textContent = 'Il codice è AT- e quattro lettere o cifre, come AT-K3ZQ'; show(warn); } return null; }
    show(warn, false);
    let p2p = p2pRequested(location.search) || this.engine.natpfP2p?.mode === 'host';
    if (!p2p){
      try { const r = await fetch(`/api/match/state?room=${encodeURIComponent(code)}&role=p2`, { cache: 'no-store' }); p2p = !/json/i.test(r.headers?.get?.('content-type') || ''); }
      catch { p2p = true; }
    }
    const url = joinUrl(code, { pathname: location.pathname, search: location.search, p2p });
    location.href = url;
    return url;
  }
  next(){
    if (!stepReady(this.step, this.state())) return;
    if (this.step === 'mode') return this.go('controller');
    if (this.step === 'controller') return this.go('connect');
    if (this.step === 'connect') return this.go(this.mode === 'split' ? 'match' : 'warmup');
    if (this.step === 'match') $('btn-start-match').click();
  }
  back(){ const p = previousStep(this.step, this.mode); if (p) this.go(p); }
  _tiles(){
    const page = `[data-page="${this.step}"]`;
    return [...this.el.querySelectorAll(`${page} .lobby-tile, ${page} .menu-item, ${page} .seg-btn, ${page} [data-result]`)].filter(t => !t.classList.contains('hidden') && t.offsetParent !== null);
  }
  _key(e){
    if (this.ui.intro?.active) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;     // scorciatoie (pannello dell'addetto, browser): non sono del menu
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (this.onboarding.isOpen){ if (this.onboarding.key(e)) e.preventDefault(); e.stopImmediatePropagation(); return; }
    const sheetOpen = [...document.querySelectorAll('.natpf-sheet-backdrop')].some(m => !m.classList.contains('hidden'));
    // in campo: Esc apre e chiude la pausa
    if (!this.visible){
      if (e.code === 'Escape' && this.ui.pause){ e.preventDefault(); e.stopImmediatePropagation(); this.ui.pause.toggle(); }
      return;
    }
    if (sheetOpen) return;
    if (e.code === 'Tab') return;
    e.stopImmediatePropagation();
    if (e.key && e.key.length === 1){ const r = eggTyped(this.eggBuffer, e.key); this.eggBuffer = r.buffer; if (r.hit){ this.ui.toggleTestInput(); this.eggBuffer = ''; return; } }
    const tiles = this._tiles(), i = tiles.indexOf(document.activeElement);
    // frecce: si sposta il fuoco (come un joypad) verso la voce più vicina in quella direzione (nel menu principale le
    // tre voci di servizio stanno in fila), altrimenti alla successiva/precedente; nella pagina «Partita» le tessere
    // si scelgono subito
    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.code) && tiles.length){
      e.preventDefault();
      const d = e.code === 'ArrowRight' || e.code === 'ArrowDown' ? 1 : -1;
      const near = i >= 0 ? nearestTile(tiles, tiles[i], e.code) : null;
      // menu principale: destra/sinistra solo dentro la riga (in fondo alla riga si resta lì)
      const t = near || (this.step === 'menu' && i >= 0 && (e.code === 'ArrowLeft' || e.code === 'ArrowRight') ? tiles[i] : tiles[(i < 0 ? 0 : i + d + tiles.length) % tiles.length]);
      t.focus(); if (this.step === 'match' && t.classList.contains('lobby-tile')) t.click();
    } else if (e.code === 'Enter'){
      e.preventDefault();
      if (i >= 0 && ['menu', 'mode', 'controller', 'options', 'challenges', 'ranking', 'result'].includes(this.step)) tiles[i].click(); else this.next();
    }
    else if (e.code === 'Escape' || e.code === 'Backspace'){ e.preventDefault(); this.back(); }
    else if (e.code === 'KeyH'){ this.onboarding.open(); }
  }
  /* ---------- riscaldamento e allenamento in campo ---------- */
  startWarmup(){
    const ui = this.ui;
    // telefono non ancora collegato: prima il collegamento
    if (ui.controller === 'phone' && !this.state().phoneLinked){ this.go('connect'); return; }
    this.step = 'warmup'; this.el.dataset.step = 'warmup';
    // sfida: con il telefono non ancora calibrato prima solo la calibrazione in campo, poi la sfida
    if (this.mode === 'challenge'){
      if (ui.controller === 'phone' && !ui.phone.ready) ui.training.start({ calOnly: true });
      else ui.events.start(this.challenge);
      return;
    }
    // Allenamento dal menu: tutorial completo, sempre con la lezione su presa e posizione. Riscaldamento prima della
    // partita: solo dritto, rovescio e servizio, senza lezione (la presa è già nella pagina «Collega»: in fiera si gioca)
    const full = this.mode === 'training';
    if (full) ui.training.introSeen = {};
    ui.training.start({ drills: full ? null : warmupDrills(ui.controller), intro: full });
  }
  // prova guidata della modalità diagnostica: come l'allenamento, con esercizi che dicono quale colpo serve (riferimento
  // delle metriche). Con il telefono non collegato si va prima al collegamento
  startDiag(drills, run){
    const ui = this.ui;
    this.setMode('training');
    if (ui.controller === 'phone' && !this.state().phoneLinked){ this.go('connect'); return false; }
    this.step = 'warmup'; this.el.dataset.step = 'warmup';
    ui.training.start({ drills, diag: run });
    // niente servizio iniziale: il lanciapalle parte subito (con il telefono da calibrare, dopo la calibrazione)
    if (!ui.training.cal){ ui.training._idle(); ui.training.wait = 1.2; }
    return true;
  }
  // compatibilità: l'onboarding propone ancora «Prova» → allenamento
  startPractice(){ this.setMode('training'); this.go(this.ui.controller === 'phone' && !this.state().phoneLinked ? 'connect' : 'warmup'); }
  onTrainingEnd({ completed, skipped, calibrated, stats }){
    // calibrazione prima di una sfida (anche saltata: modalità semplice) → la sfida
    if (this.mode === 'challenge'){ this.ui.events.start(this.challenge); return; }
    if (completed) this.trainingDone = true;
    const text = skipped ? `<b>${this.mode === 'training' ? 'Allenamento interrotto' : 'Riscaldamento saltato'}</b><span>${this.ui.phone.simple ? 'Senza calibrazione: il gesto vale lo stesso, la forza non è tarata sul tuo colpo.' : 'Lo puoi rifare quando vuoi.'}</span>`
      : `<b>${completed ? (this.mode === 'training' ? 'Allenamento completato ✓' : 'Riscaldamento completato ✓') : 'Interrotto'}</b><span>${stats.shots} colpi · ${stats.perfect} perfetti${stats.out ? ` · ${stats.out} fuori` : ''}</span>`;
    // allenamento dal menu: si torna al menu con il risultato; riscaldamento prima della partita: si va alla partita
    if (this.mode === 'training'){
      this.go('menu');
      const r = $('lobby-menu-result'); r.innerHTML = text; show(r);
    } else {
      this.go('match');
      const r = $('lobby-practice-result'); r.innerHTML = text; show(r);
    }
    this.paint();
  }
  tick(){}
  feedback(){}
}
