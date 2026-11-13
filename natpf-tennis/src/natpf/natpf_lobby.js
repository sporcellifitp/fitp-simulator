// Menu di NATPF Simulator, con il percorso di un gioco da console (dopo l'intro, natpf_intro.js):
//   menu principale ─ Gioca ─────────→ modalità (contro la CPU · sfida un amico) → racchetta (smartphone o webcam,
//                   │                   (stesso schermo: modalità → i due telefoni → partita, natpf_split_ui.js)
//                   │                   mano) → collega (QR e tre passi sul telefono, o la webcam) → in campo il tutorial
//                   │                   corto e la calibrazione del telefono (natpf_training.js; con la webcam o il
//                   │                   telefono già calibrato niente) → partita (livello in vista; formato, durata, chi
//                   │                   batte e visuale sotto «Altre impostazioni», B15) → «Gioca»: passaggio al campo.
//                   │                   Il riscaldamento (lanciapalle: dritto, rovescio, servizio) è facoltativo dal B16
//                   │                   (decisione dell'utente dell'08/11 sera): «Riscaldati prima» nella pagina «Partita»
//                   ├ Sfide ─────────→ sfida → nickname → racchetta → collega → (calibrazione) → sfida in campo →
//                   │                   risultato con la posizione in classifica (natpf_events.js)
//                   ├ Classifica del giorno
//                   ├ Allenamento ───→ racchetta → collega → campo d'allenamento → di nuovo al menu con il risultato
//                   ├ (Come si gioca: in alto a destra in ogni pagina e tasto H → guida, natpf_onboarding.js)
//                   └ Opzioni ───────→ mano, visuale, musica, voce, colpi imparati, intro
// Un pulsante grande per pagina, «Indietro» sempre visibile, frecce + Invio + Esc come con un joypad.
// Appena il telefono ha i sensori attivi si entra in campo da soli; con la webcam appena si vede la mano.
// Dietro il menu gira una dimostrazione: nessun gesto la trasforma in partita (natpf_ui.js, _gateInput).
// Pausa, «Torna al menu» e il «Menu» della schermata finale riportano al menu principale.
// Easter egg: digitando «natpf» nel menu compaiono mouse e tastiera (modalità prova per il computer).
import { FORMAT_KEY, SERVE_KEY, SPLIT_SERVE_KEY, serveChoice, splitServeChoice } from './match_format.js';
import { readFairFormat, FAIR_MAX_GAMES_LABEL } from './natpf_fair_format.js';
import { CHALLENGES, challengeById, pickableChallenge, validNickname } from './natpf_events.js';
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
import { tutorialSetFor } from './natpf_tutorial.js';
import { hostLobbyStatus, roomCode, joinUrl } from './natpf_versus.js';
import { p2pRequested } from './natpf_p2p.js';
import { screenSummary } from './natpf_screen.js';
import { waitingText } from './natpf_ready.js';
import { readBallTrail, writeBallTrail, trailToast } from './natpf_ball_glow.js';
import { forehandVideoEnabled, setForehandVideo, writeForehandVideo, forehandVideoToast } from './natpf_forehand_video.js';   // B23 (prova)
import { WHO_LEVEL, WHO_DEFAULT, baseLevel, urlLevel, isCpuLevel, whoOfLevel, levelSummary, whoNote } from './natpf_who.js'; // B18.2 gruppo 3: «Chi gioca»
import { eventoRestart } from './natpf_skill.js';
import { readCue, writeCue, cueToast } from './natpf_timing_cue.js';
import { getCast, setCast, castToast } from './natpf_personaggi.js';
const $ = id => document.getElementById(id);
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const LOBBY_STEPS = ['menu', 'mode', 'options', 'challenges', 'ranking', 'result', 'controller', 'connect', 'warmup', 'match'];
export const MODES = ['cpu', 'friend', 'training', 'challenge', 'split'];
// tappe mostrate nella barra di avanzamento, per modalità (e racchetta: la calibrazione c'è solo con il telefono)
// (B28: con la calibrazione «Giocando» o «Nessuna», autoSimple, la tappa «Calibrazione» non c'è: in campo prima della
// partita si va solo per il tutorial corto, e gli scambi di prova partono con «Gioca»)
export function progressSteps(mode, { controller = 'phone', autoSimple = false } = {}){
  if (mode === 'challenge') return [['challenges', 'Sfida'], ['controller', 'Racchetta'], ['connect', 'Collega'], ['warmup', 'In campo']];
  if (mode === 'split') return [['mode', 'Modalità'], ['connect', 'Racchette'], ['match', 'Partita']];
  if (mode === 'training') return [['controller', 'Racchetta'], ['connect', 'Collega'], ['warmup', 'Allenamento']];
  // (in campo prima della partita dal B16 solo il tutorial corto e la calibrazione del telefono: il riscaldamento è
  // facoltativo; con mouse e tastiera o la webcam dalla pagina «Collega» subito la pagina «Partita», revisione del B16)
  return controller === 'phone' && !autoSimple ? [['mode', 'Modalità'], ['controller', 'Racchetta'], ['connect', 'Collega'], ['warmup', 'Calibrazione'], ['match', 'Partita']]
    : [['mode', 'Modalità'], ['controller', 'Racchetta'], ['connect', 'Collega'], ['match', 'Partita']];
}
// Dove porta la pagina «Collega» («Avanti», Invio, o da sola con il controller pronto), dal B16: 'match' la pagina
// «Partita» (mouse e tastiera, webcam, telefono già calibrato e con il tutorial corto già visto); 'court' in campo
// (calibrazione e tutorial corto, riscaldamento chiesto con «Riscaldati prima», sfida, allenamento)
// B28: autoSimple = il telefono non calibra con i gesti (opzione dello stand «Giocando» o «Nessuna»): è pronto da solo, in
// campo prima della partita si va solo per il tutorial corto; gli scambi di prova partono poi con «Gioca». trial: nella
// sfida tra due computer gli scambi di prova si fanno adesso, in campo (alla partenza l'altro computer aspetta)
export function connectTarget({ mode, controller, phoneReady = false, tutorialDue = false, wantWarmup = false, autoSimple = false, trial = false }){
  if (mode === 'split') return 'match';
  if (mode === 'training' || mode === 'challenge' || wantWarmup) return 'court';
  if (controller !== 'phone') return 'match';
  if (mode === 'friend' && trial) return 'court';
  return (!phoneReady && !autoSimple) || tutorialDue ? 'court' : 'match';
}
// Il pulsante della pagina «Collega» dice dove porta (revisione del B16: con mouse, webcam o telefono già pronto diceva
// «In campo ›» e portava alla pagina «Partita»)
export function connectNextLabel(s){
  if (s.mode === 'split') return 'Impostazioni partita ›';
  if (s.mode === 'training') return 'Al campo d’allenamento ›';
  return connectTarget(s) === 'match' ? 'Alla partita ›' : 'In campo ›';
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
// Si entra in campo da soli quando il controller è pronto (telefono con i sensori attivi, webcam che vede la mano).
// Stesso schermo: niente salto (B9, 05/11). Prima, con i due telefoni pronti, la lobby passava muta a «Partita» dopo
// 0,7 s, dove serviva comunque «Gioca»; ora nella pagina «Collega» parte il conto alla rovescia e poi si gioca
// (natpf_split_ui._tickStart)
export function autoAdvance(step, { controller, phoneLinked, handSeen, mode = null, splitReady = false }){
  if (mode === 'split') return false;
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
// Pagina «Partita»: riassunto delle impostazioni chiuse sotto «Altre impostazioni» (B15): durata, formato (non nello stesso
// schermo, che è solo singolare) e visuale
// fair: formato in fiera acceso dal pannello dello stand (B18, natpf_fair_format.js), detto nel riassunto
// level (B18.2 gruppo 3): nome del livello quando non viene da «Chi gioca» (CPU Esperta, CPU Leggenda), detto per primo
export function matchSummary({ games = 1, format = 'singles', view = 'third', split = false, fair = false, level = null } = {}){
  const n = parseInt(games, 10) || 1;
  return [split ? null : level, n > 1 ? `Al meglio di ${n}` : '1 game', fair ? 'formato fiera' : null, split ? null : format === 'doubles' ? 'doppio' : 'singolare', view === 'first' ? '1ª persona' : '3ª persona'].filter(Boolean).join(' · ');
}
// B18 (revisione R4): durata della partita quando il formato in fiera si accende o si spegne (funzione pura). Acceso con
// «Al meglio di 5» scelto: si passa al 3 e ci si ricorda del 5; spento con il 3 ancora scelto: si torna al 5. Se nel
// frattempo qualcuno ha scelto un'altra durata, la sua scelta vale e il 5 si dimentica
export function fairLengthStep({ fair = false, selected = null, fiveBeforeFair = false } = {}){
  const sel = String(selected ?? '');
  if (fair) return sel === '5' ? { click: '3', fiveBeforeFair: true } : { click: null, fiveBeforeFair: !!fiveBeforeFair && sel === '3' };
  return fiveBeforeFair && sel === '3' ? { click: '5', fiveBeforeFair: false } : { click: null, fiveBeforeFair: false };
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
      const tr = e.target.closest('[data-natpf-trail]'); if (tr){ e.stopPropagation(); this.setBallTrail(tr.dataset.natpfTrail === '1'); return; }
      const dv = e.target.closest('[data-natpf-dritto]'); if (dv){ e.stopPropagation(); this.setForehandVideo(dv.dataset.natpfDritto === '1'); return; }
      const ca = e.target.closest('[data-natpf-cast]'); if (ca){ e.stopPropagation(); this.setCast(ca.dataset.natpfCast); return; }
      // stessa scelta dalla pagina «Pronto per la partita» (richiesta dell'utente del 12/11: decidere i personaggi a ogni partita)
      const mc = e.target.closest('[data-match-cast]'); if (mc){ e.stopPropagation(); this.setCast(mc.dataset.matchCast); return; }
      const sc = e.target.closest('[data-natpf-screen]'); if (sc){ e.stopPropagation(); this.ui.screen?.set(sc.dataset.natpfScreen); this.paint(); return; }
      // schermo intero all'avvio (Opzioni → Schermo): «Schermo intero» (al primo tasto) o «Finestra»
      const fp = e.target.closest('[data-natpf-fs]'); if (fp){ e.stopPropagation(); if (this.ui.screen?.fullscreen) this.ui.screen.fullscreen.pref = fp.dataset.natpfFs; this.paint(); return; }
      const f = e.target.closest('[data-natpf-format]'); if (f){ e.stopPropagation(); this.setFormat(f.dataset.natpfFormat); return; }
      const sv = e.target.closest('[data-natpf-serve]'); if (sv){ e.stopPropagation(); this.setServe(sv.dataset.natpfServe); return; }
      const ch = e.target.closest('[data-challenge]'); if (ch){ e.stopPropagation(); this.pickChallenge(ch.dataset.challenge); return; }
      const tab = e.target.closest('[data-ranking]'); if (tab){ e.stopPropagation(); this.rankingTab = tab.dataset.ranking; this._paintRanking(); return; }
      const r = e.target.closest('[data-result]'); if (r){ e.stopPropagation(); this._resultAction(r.dataset.result); return; }
      // B18.2 gruppo 3: «Chi gioca» (le tessere della pagina «Partita»; la selezione la fa l'HUD del motore, che ascolta le
      // stesse tessere), «Livello della CPU» in «Altre impostazioni» e il segnale del momento giusto nelle Opzioni
      const who = e.target.closest('#difficulty-mode-group [data-difficulty]'); if (who && who.dataset.difficulty !== '1v1'){ this.pickWho(who.dataset.difficulty); return; }
      const lv = e.target.closest('[data-natpf-level]'); if (lv){ e.stopPropagation(); this.setLevel(lv.dataset.natpfLevel); return; }
      const cue = e.target.closest('[data-natpf-cue]'); if (cue){ e.stopPropagation(); this.setCue(cue.dataset.natpfCue); return; }
      // pagina «Partita»: «Altre impostazioni» apre e chiude formato, durata, chi batte e visuale
      const more = e.target.closest('[data-match-more]'); if (more){
        e.stopPropagation(); this.matchMore = !this.matchMore; this.paint();
        // aperte su uno schermo basso (1366×657, 1024×600) l'ultima riga restava sotto la barra in basso senza che si
        // vedesse che c'era (verifica dell'integrazione B15): la pagina scorre fino a mostrarla
        if (this.matchMore) requestAnimationFrame(() => { const last = $('match-more')?.lastElementChild; if (last?.scrollIntoView) last.scrollIntoView({ block: 'nearest' }); });
        return;
      }
      // scegliere la racchetta è già andare avanti
      const c = e.target.closest('[data-natpf-controller]'); if (c && this.step === 'controller') setTimeout(() => this.go('connect'), 160);
    });
    $('lobby-next').addEventListener('click', e => { e.stopPropagation(); this.next(); });
    $('lobby-back').addEventListener('click', e => { e.stopPropagation(); this.back(); });
    // «Riscaldati prima» (pagina «Partita», B16): il riscaldamento con il lanciapalle, facoltativo
    $('lobby-warmup').addEventListener('click', e => { e.stopPropagation(); this.warmupFirst(); });
    $('lobby-help').addEventListener('click', e => { e.stopPropagation(); this.onboarding.open(); });
    // il pulsante dello schermo intero in alto (#lobby-fullscreen) lo collega natpf_screen.js
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
    // chi batte per primo (match_format.firstServer): si ricorda tra una partita e l'altra
    // (B20: nello stesso schermo una scelta a parte, di base il sorteggio: _loadServe, anche a ogni cambio di modalità)
    this._loadServe();
    // B18.2 gruppo 3: «Chi gioca». Valore di base: Adulto (livello Evento), o il livello chiesto dall'indirizzo
    const search = globalThis.location?.search || '';
    this.base = baseLevel(search); this.cpuLevel = this.base;
    if (!urlLevel(search) && this.engine.hud?.selectedDifficulty === 'casual') this.engine.hud._setDifficultySelection?.(this.base, { notify: true });
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
      // B28: niente gesti (profilo semplice automatico) e scambi di prova da fare adesso (sfida tra due computer)
      autoSimple: !!p.autoSimple, trial: this.mode === 'friend' && !this.trialPlayed && !!this.ui.trial?.due?.({ split: false }),
      // sensori attivi: calibrazione, pronto, o tutorial sul telefono ('tut': sensori attivi in attesa di «ho capito»)
      phoneLinked: p.connected && (L.phone === 'cal' || L.phone === 'ready' || L.phone === 'tut'),
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
    // (la voce «Guida» del menu non c'è più dal B15: la guida si apre con «Come si gioca» in alto o con H)
    if (item === 'options') this.go('options');
  }
  setMode(mode){
    if (!MODES.includes(mode)) return;
    if (mode === 'friend' && this.mode !== 'friend') this.roomAskedAt = performance.now();
    this.mode = mode; this.el.dataset.flow = mode;
    this._loadServe();
    for (const t of this.el.querySelectorAll('[data-mode]')){ const on = t.dataset.mode === mode; t.classList.toggle('selected', on); t.setAttribute('aria-checked', String(on)); }
    // la scelta della modalità decide gli avversari della pagina «Partita»: CPU (facile, esperta o Leggenda) o 1v1 con invito
    const diff = this.engine.hud?.selectedDifficulty, versus = mode === 'friend' || mode === 'split';
    if (versus && diff !== '1v1') document.querySelector('#difficulty-mode-group [data-difficulty="1v1"]')?.click();
    // stesso schermo: due telefoni sullo stesso computer (niente stanza in rete); lasciandolo la sessione split finisce
    // (con due telefoni o con una webcam per due: la scelta della pagina «Collega», natpf_split_ui.applyInput)
    if (mode === 'split'){ this.ui.split?.prepare(); this.ui.split?.applyInput?.(); }
    else { this.ui.split?.end(); this.engine.motionController?.setWebcamDuo?.(false); }
    // sfida un amico: la stanza nasce subito (così l'amico può entrare mentre si prepara la racchetta); scegliendo
    // un'altra modalità la stanza si chiude e il Player 2 lo sa (prima restava aperta e i suoi colpi dirottavano la
    // partita contro la CPU)
    if (mode === 'friend' && diff === '1v1' && !this.engine.versus?.active && this.engine.playerRole !== 'p2') this.engine.createMultiplayerRoom?.();
    if (mode !== 'friend'){ this.engine.endVersus?.(); this.ui.inviteUrl = null; const box = $('natpf-invite'); if (box){ box.innerHTML = ''; box.dataset.pending = ''; } }
    // lasciando «Sfida un amico» (anche per allenamento o sfide) si torna alla CPU: prima allenamento e sfide ripristinavano
    // alla fine il 1v1 senza stanza
    // (B18.2 gruppo 3: al livello scelto prima con «Chi gioca» o in «Altre impostazioni»; senza l'HUD vero la tessera di sempre)
    if (!versus && diff === '1v1'){ if (this.engine.hud?._setDifficultySelection) this._applyLevel(this.cpuLevel || this.base); else document.querySelector('#difficulty-mode-group [data-difficulty="casual"]')?.click(); }
    for (const b of document.querySelectorAll('#difficulty-mode-group [data-difficulty]')) show(b, versus ? b.dataset.difficulty === '1v1' : b.dataset.difficulty !== '1v1');
    // stesso schermo: solo singolare (una metà per giocatore)
    for (const b of this.el.querySelectorAll('[data-natpf-format="doubles"]')) show(b, mode !== 'split');
    // la tessera del 1v1 nella pagina «Partita» dice quale 1v1: su due computer o sullo stesso schermo
    const tile = document.querySelector('#difficulty-mode-group [data-difficulty="1v1"]');
    if (tile){
      const n = tile.querySelector('.tile-name'), d = tile.querySelector('.tile-desc');
      if (n) n.textContent = mode === 'split' ? 'Stesso schermo' : 'Sfida un amico';
      if (d) d.textContent = mode === 'split' ? 'Uno contro uno sullo stesso computer' : 'Uno contro uno su due computer';
    }
    this.paint();
  }
  /* ---------- sfide, nickname, classifica ---------- */
  pickChallenge(id){
    // solo i minigiochi visibili (natpf_arcade.HIDDEN_MODES: Radar e Survival nascosti dal 30/10)
    if (!pickableChallenge(id)) return;
    this.challenge = id; this.setMode('challenge');
    // solo il nickname: chiesto una volta per visitatore (il chiosco lo dimentica quando lo stand torna libero)
    this.askNickname(() => this.go('controller'));
  }
  // newPlayer («Nuovo giocatore», natpf_new_player.js, B18): il passo del nome di chi arriva, con la mano; il nome serve
  // anche alla schermata finale («Vince Marco!»). «Salta» va avanti senza nome (in classifica «Ospite»)
  askNickname(then, { newPlayer = false } = {}){
    const ev = this.ui.events, box = $('natpf-nick'), input = $('nick-input'), warn = $('nick-warn');
    if (ev.nickname && !newPlayer){ then(); return; }
    const text = (id, t) => { const el = $(id); if (el && el.textContent !== t) el.textContent = t; };
    text('nick-kicker', newPlayer ? 'Nuovo giocatore' : 'Classifica del giorno');
    text('nick-title', newPlayer ? 'Come ti chiami?' : 'Il tuo nickname');
    text('nick-desc', newPlayer ? 'Il nome va sulla schermata finale e nella classifica del giorno. Niente email, niente dati personali.' : 'Solo per la classifica: niente email, niente dati personali.');
    text('nick-cancel', newPlayer ? 'Salta' : 'Indietro');
    show($('nick-hand'), newPlayer);
    this._nickThen = then; this._nickSkip = newPlayer ? then : null; input.value = ''; show(warn, false); show(box); setTimeout(() => input.focus(), 50);
    if (!this._nickBound){
      this._nickBound = true;
      box.addEventListener('pointerdown', e => e.stopPropagation());
      box.addEventListener('keydown', e => e.stopPropagation());
      $('nick-cancel').addEventListener('click', e => { e.stopPropagation(); show(box, false); const skip = this._nickSkip; this._nickThen = this._nickSkip = null; skip?.(); });
      $('nick-form').addEventListener('submit', e => {
        e.preventDefault(); e.stopPropagation();
        const v = validNickname(input.value);
        if (!v.ok){ warn.textContent = v.why; show(warn); return; }
        this.ui.events.nickname = v.nick; show(box, false); const t = this._nickThen; this._nickThen = this._nickSkip = null; t?.();
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
    const note = $('challenge-nick-note'); if (note) note.textContent = ev.nickname ? `Giochi come ${ev.nickname}` : 'Serve solo un nickname per la classifica.';
  }
  _paintRanking(){
    const tabs = $('ranking-tabs'), list = $('ranking-list'); if (!tabs || !list) return;
    this.rankingTab = pickableChallenge(this.rankingTab) ? this.rankingTab : CHALLENGES[0].id;
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
    if (a === 'again'){ this.setMode('challenge'); this.startWarmup({ again: true }); return; }
    if (a === 'ranking'){ this.go('ranking'); return; }
    // «Nuovo giocatore» (B18): chi arriva gioca lo stesso minigioco dopo nome, tutorial corto e calibrazione
    if (a === 'new'){ this.ui.newPlayer?.(); return; }
    this.go('menu');
  }
  setFormat(id){
    this.format = id === 'doubles' ? 'doubles' : 'singles';
    try { localStorage.setItem(FORMAT_KEY, this.format); } catch {}
    for (const b of this.el.querySelectorAll('[data-natpf-format]')){ const on = b.dataset.natpfFormat === this.format; b.classList.toggle('selected', on); b.setAttribute('aria-checked', String(on)); }
    const opp = $('setup-opponent-label');
    if (opp) opp.textContent = this.mode === 'split' ? 'Player 2 · stesso schermo' : this.mode === 'friend' ? (this.format === 'doubles' ? 'Amico + CPU' : 'Amico') : this.format === 'doubles' ? '2 CPU' : 'CPU';
    const you = this.el.querySelector('.you-tag'); if (you) you.textContent = this.mode === 'split' ? 'Player 1' : this.format === 'doubles' ? 'Tu + CPU' : 'Tu';
    this._paintServe();
  }
  // chi batte per primo: chi gioca qui, l'avversario o sorteggio (lo usa engine.startNewMatch)
  // B20: lo stesso schermo ha la sua scelta salvata (match_format.SPLIT_SERVE_KEY), di base «Sorteggio»; le altre partite
  // la loro, di base chi gioca qui
  setServe(id){
    this.serve = serveChoice(id);
    this.engine.natpfServeFirst = this.serve;
    try { localStorage.setItem(this.mode === 'split' ? SPLIT_SERVE_KEY : SERVE_KEY, this.serve); } catch {}
    this._paintServe();
  }
  // scelta salvata per la modalità di adesso (all'avvio e a ogni cambio di modalità), senza riscriverla
  _loadServe(){
    const split = this.mode === 'split';
    let v = null; try { v = localStorage.getItem(split ? SPLIT_SERVE_KEY : SERVE_KEY); } catch {}
    this.serve = split ? splitServeChoice(v) : serveChoice(v);
    this.engine.natpfServeFirst = this.serve;
    this._paintServe();
  }
  _paintServe(){
    // stesso schermo: i nomi scritti nella pagina «Collega» (prima restavano Player 1 / Player 2)
    const split = this.engine.natpfSplitNames || {};
    const names = { player: this.mode === 'split' ? split.p1 || 'Player 1' : this.format === 'doubles' ? 'Voi' : 'Tu',
      opponent: this.mode === 'split' ? split.p2 || 'Player 2' : this.mode === 'friend' ? 'Amico' : 'CPU', random: 'Sorteggio' };
    for (const b of this.el.querySelectorAll('[data-natpf-serve]')){
      const on = b.dataset.natpfServe === this.serve;
      b.classList.toggle('selected', on); b.setAttribute('aria-checked', String(on)); b.setAttribute('role', 'radio');
      b.textContent = names[b.dataset.natpfServe] || b.textContent;
    }
  }
  option(name){
    const click = id => $(id)?.click();
    if (name === 'music') click('btn-audio-toggle');
    if (name === 'voice') click('btn-voice-toggle');
    if (name === 'specials'){ this.ui.phone.resetSpecials?.(); this.ui.toast('Pallonetto e palla corta: si reimparano nel prossimo allenamento'); }
    if (name === 'intro'){ this.ui.intro?.play('full'); return; }
    // calibrazione dello schermo (natpf_calibra.js): riquadro sopra tutto, i tasti li prende lui
    if (name === 'calibra'){ this.ui.calibra?.open(); return; }
    this.paint();
  }
  // scia luminosa della palla (natpf_ball_glow.js, B22): vale subito e resta salvata
  /* ---------- B18.2 gruppo 3: chi gioca, livello della CPU, segnale del momento giusto ---------- */
  // il livello della CPU passa dall'HUD del motore (selezione delle tessere, scritta «CPU …», taratura del motore)
  _applyLevel(level){
    if (!isCpuLevel(level)) return;
    this.cpuLevel = level;
    this.engine.hud?._setDifficultySelection?.(level, { notify: true });
  }
  // una tessera di «Chi gioca» (l'HUD ha già selezionato il livello): il livello Evento riparte dal valore di base
  pickWho(level){ if (isCpuLevel(level)) this.cpuLevel = level; eventoRestart(this.engine); this.paint(); }
  // «Altre impostazioni» → «Livello della CPU»
  setLevel(level){ this._applyLevel(level); eventoRestart(this.engine); this.paint(); }
  // «Nuovo giocatore» e chiosco: la scelta torna al valore di base (Adulto, o il livello dell'indirizzo) e il livello
  // Evento riparte. Nello stesso schermo e nella sfida tra due computer il livello resta 1v1: vale quando si torna alla CPU
  resetWho(){
    if (this.engine.hud?.selectedDifficulty === '1v1') this.cpuLevel = this.base; else this._applyLevel(this.base);
    eventoRestart(this.engine);
  }
  // Opzioni → «Segnale del momento giusto: Di base · Sì · No» (natpf_timing_cue.js)
  setCue(pref){
    const p = this.ui.cue ? this.ui.cue.setPref(pref) : writeCue(pref);
    this.ui.toast?.(cueToast(p, this.engine.hud?.selectedDifficulty)); this.paint();
  }
  setBallTrail(on){
    writeBallTrail(on); this.engine.natpfBallGlow?.setEnabled(on);
    this.ui.toast?.(trailToast(on)); this.paint();
  }
  // B23 (prova): dritto con le movenze del trailer (natpf_forehand_video.js); vale subito e resta salvato
  setForehandVideo(on){
    writeForehandVideo(on); setForehandVideo(on);
    this.ui.toast?.(forehandVideoToast(on)); this.paint();
  }
  // personaggi in campo (natpf_personaggi.js, B24): «Classici» o «Lob & Drop»; vale subito e resta salvata
  setCast(value){
    const cast = setCast(value);
    this.engine.natpfBackdropDirty = true;        // lo sfondo fermo del menu si ridisegna con i personaggi scelti
    this.ui.onScore?.(this.engine.score, this.engine.matchConfig?.gamesToWin);   // linguette del tabellone del colore dei personaggi
    this.ui.toast?.(castToast(cast)); this.paint();
  }
  _paintOptions(){
    const audio = this.engine.audioEngine;
    const cast = getCast();
    for (const b of this.el.querySelectorAll('[data-natpf-cast]')){ const on = b.dataset.natpfCast === cast; b.classList.toggle('selected', on); b.setAttribute('aria-checked', String(on)); }
    for (const b of this.el.querySelectorAll('[data-natpf-dritto]')){ const on = (b.dataset.natpfDritto === '1') === forehandVideoEnabled(); b.classList.toggle('selected', on); b.setAttribute('aria-checked', String(on)); }
    const trail = this.engine.natpfBallGlow ? !!this.engine.natpfBallGlow.enabled : readBallTrail();
    for (const b of this.el.querySelectorAll('[data-natpf-trail]')){ const on = (b.dataset.natpfTrail === '1') === trail; b.classList.toggle('selected', on); b.setAttribute('aria-checked', String(on)); }
    const cue = this.ui.cue ? this.ui.cue.pref : readCue();
    for (const b of this.el.querySelectorAll('[data-natpf-cue]')){ const on = b.dataset.natpfCue === cue; b.classList.toggle('selected', on); b.setAttribute('aria-checked', String(on)); }
    this.ui.syncVolumes?.();
    const set = (k, on) => { const b = this.el.querySelector(`[data-option="${k}"] b`); if (b) b.textContent = on ? 'Sì' : 'No'; };
    set('music', audio ? !audio.muted : true);
    set('voice', audio?.voice ? !!audio.voice.enabled : true);
    // schermo: con un'area dall'indirizzo (?area=) nessuna scelta è accesa (vale l'indirizzo)
    const scr = this.ui.screen, cur = scr?.area ? null : scr?.preset;
    for (const b of this.el.querySelectorAll('[data-natpf-screen]')){ const on = b.dataset.natpfScreen === cur; b.classList.toggle('selected', on); b.setAttribute('aria-checked', String(on)); }
    // calibrazione salvata (bordi tolti o formato 16:9, 16:10, 4:3): riassunto sotto la riga
    const sum = $('screen-cal-sum'), st = scr?.calibrated ? screenSummary(scr) : '';
    if (sum && sum.textContent !== st) sum.textContent = st;
    scr?.paintFullscreen?.();
  }
  go(step){
    if (!LOBBY_STEPS.includes(step)) return;
    // calibrazione dello schermo aperta e il menu cambia pagina (chiosco che torna al menu, classifica dal pannello
    // dell'addetto): si annulla come con Esc. Prima restava aperta sopra il menu, con l'area non salvata, e prendeva i tasti
    if (this.ui.calibra?.isOpen) this.ui.calibra.cancel();
    if (step === 'warmup'){ if (this.mode === 'split') step = 'match'; else { this.startWarmup(); return; } }
    if (step !== 'ranking') document.documentElement.classList.remove('ranking-full');
    if (step === 'menu' && this.step !== 'menu' && (this.mode === 'training' || this.mode === 'challenge')) this.mode = 'cpu';
    // pagina nuova dall'inizio (prima restava lo scorrimento della pagina di prima)
    if (this.step !== step){ const st = this.el.querySelector?.('.lobby-stage'); if (st) st.scrollTop = 0; }
    // from: la pagina da cui si arriva, pageN: numero della visita (natpf_split_ui: tornando con «‹ Indietro» da «Partita»
    // il conto non riparte da solo)
    if (this.step !== step){ this.from = this.step; this.pageN = (this.pageN || 0) + 1; }
    // «Altre impostazioni» chiuse a ogni visita della pagina «Partita» (chi arriva vede solo il livello e «Gioca»)
    if (this.step !== step && step === 'match') this.matchMore = false;
    // «Riscaldati prima» con il telefono caduto porta a «Collega» e resta chiesto finché si entra in campo: lasciando la
    // pagina senza entrare in campo (o tornando al menu) non vale più. Prima restava chiesto e partiva alla partita dopo,
    // magari del visitatore successivo (revisione del B16)
    if (this.step === 'connect' && step !== 'connect'){ this.releaseTutorial(); this.wantWarmup = false; }
    // al menu principale: visitatore nuovo, niente riscaldamento chiesto né già fatto; il telefono che aspettava il tutorial
    // per chi non è entrato in campo («Nuovo giocatore» e poi «Menu») non aspetta più
    if (step === 'menu'){ this.wantWarmup = false; this.warmupDone = false; this.trialPlayed = false; this.ui.trialSkipOnce = false; this.releaseTutorial(); }
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
      else if (this.ui.controller === 'phone'){ this.ui.phone.start().catch(err => this.ui._warn(`Collegamento non disponibile (${err.message}).`)); this._prearmTutorial(); }
      if (this.ui.controller === 'webcam' && !this.engine.motionController?.webcamActive) this.ui.startWebcam().then(() => this.paint());
    }
    this.paint();
    // fuoco sulla scelta fatta o sulla prima voce; nella pagina «Partita» senza tessere (amico, stesso schermo) su «Gioca»,
    // non su «Altre impostazioni» (Invio lì le aprirebbe invece di giocare)
    requestAnimationFrame(() => { const tiles = this._tiles(); (tiles.find(t => t.classList.contains('selected')) || (step === 'match' ? null : tiles[0]) || this._primary())?.focus({ preventScroll: true }); });
  }
  _primary(){ return this.step === 'match' ? $('btn-start-match') : $('lobby-next'); }
  // Tutorial da vedere (Allenamento, partita contro la CPU, sfida: dopo «Collega» si entra in campo e la modale del tutorial
  // si apre, natpf_training.start): il telefono aspetta il tutorial già nella pagina «Collega», così dopo «Attiva i
  // sensori» passa subito al tutorial. Prima calibrava per ~0,76 s («Preparati») finché la lobby non entrava in campo e il
  // tutorial non lo fermava (revisione B9 del 06/11, minore f). Si toglie lasciando la pagina senza entrare in campo
  // (releaseTutorial) o se in campo il tutorial non si apre (natpf_training.start: diagnostica)
  // B16: tutorial corto prima della partita, completo nell'Allenamento (visto il corto, l'Allenamento mostra quelle che mancano)
  _prearmTutorial(){
    const P = this.ui.phone, seen = P?.tutorialSeenFor ? P.tutorialSeenFor(tutorialSetFor(this.mode)) : !!P?.tutorialSeen;
    if (!['training', 'cpu', 'challenge'].includes(this.mode) || !P || seen || P.tutWait) return;
    this.tutPrearm = true; P.waitTutorial?.(true);
  }
  releaseTutorial(){
    if (!this.tutPrearm) return;
    this.tutPrearm = false;
    if (!this.ui.training?.tutorialOpen) this.ui.phone?.waitTutorial?.(false);
  }
  paint(){
    const st = this.state(), steps = progressSteps(this.mode, st), k = steps.findIndex(([id]) => id === this.step);
    const bar = $('lobby-progress');
    if (bar){
      const key = this.mode + ':' + this.step + ':' + steps.length;
      if (bar.dataset.key !== key){ bar.dataset.key = key; bar.innerHTML = steps.map(([id, label], i) => `<li class="${i === k ? 'on' : i < k ? 'done' : ''}"><b>${i + 1}</b><span>${label}</span></li>`).join(''); }
    }
    const menu = this.step === 'menu', match = this.step === 'match', pick = ['mode', 'options', 'challenges', 'ranking', 'result'].includes(this.step);
    show($('lobby-back'), !menu && this.step !== 'result');
    show($('lobby-next'), !menu && !match && !pick);
    show($('btn-start-match'), match);
    show($('lobby-warmup'), match && this.mode !== 'split');
    // riscaldamento già fatto da questo giocatore (dalla pagina «Partita»): lo si rifà, non ci si riscalda «prima»
    const wb = $('lobby-warmup'), wt = this.warmupDone ? 'Rifai il riscaldamento' : 'Riscaldati prima';
    if (wb && wb.textContent !== wt) wb.textContent = wt;
    // tasti come su una console: nel menu le frecce scelgono, nelle altre pagine Invio va avanti
    const keys = this.el.querySelector('.lobby-keys'), kt = menu ? '↑ ↓ ← → scegli · Invio conferma · H come si gioca · F schermo intero' : 'Invio avanti · Esc indietro · F schermo intero';
    if (keys && keys.textContent !== kt) keys.textContent = kt;
    const next = $('lobby-next');
    next.disabled = !stepReady(this.step, st);
    const split = this.mode === 'split';
    // il pulsante della pagina «Collega» dice dove porta (connectNextLabel): in campo (calibrazione, riscaldamento chiesto,
    // sfida, allenamento) o alla pagina «Partita»; stesso schermo: si gioca da soli (conto alla rovescia), porta alle impostazioni
    const nt = this.step === 'connect' ? connectNextLabel({ ...st, tutorialDue: this._tutorialDue(), wantWarmup: !!this.wantWarmup }) : 'Avanti ›';
    if (next.textContent !== nt) next.textContent = nt;
    // collega: pannello del controller scelto (stesso schermo: i due telefoni)
    for (const p of this.el.querySelectorAll('[data-setup]')) show(p, p.dataset.setup === (split ? 'split' : st.controller));
    const other = $('connect-other');
    if (other){ show(other, st.controller !== 'mouse' && !split); other.textContent = st.controller === 'phone' ? 'Senza telefono? Usa la webcam' : 'Hai il telefono? Usalo come racchetta'; }
    $('lobby-t-connect').textContent = split ? (this.ui.split?.webcam ? 'Una webcam per due' : 'Collega i due telefoni') : st.controller === 'phone' ? 'Collega il telefono' : st.controller === 'webcam' ? 'Accendi la webcam' : 'Mouse e tastiera';
    $('lobby-t-match').textContent = split ? 'Stesso schermo' : this.mode === 'friend' ? 'Sfida un amico' : 'Pronto per la partita';
    if (this.step === 'connect' && split) this.ui.split?.paint();
    else if (this.step === 'connect' && st.controller === 'phone') this.ui.paintConnect();
    if (this.step === 'options') this._paintOptions();
    if (match) this._paintMatchMore(split);
    // personaggi di questa partita: la riga della pagina «Pronto per la partita» mostra la scelta in uso (natpf_personaggi.js)
    if (match){ const cast = getCast(); for (const b of this.el.querySelectorAll('[data-match-cast]') || []){ const on = b.dataset.matchCast === cast; b.classList.toggle('selected', on); b.setAttribute('aria-checked', String(on)); } }
    // aggiornamento del programma Windows: avviso sotto la pagina (solo nel menu principale) e Opzioni
    this.ui.updates?.paint();
    this.ui.paintWebcamSetup?.();
    this._paintInvite();
    // stesso schermo, pagina «Partita»: le schede dei due giocatori dal vivo e «Gioca» grigio e spento finché non sono
    // pronti tutti e due (prima giallo e attivo anche con un telefono caduto: rimandava a «Racchette» solo al clic)
    const gate = split && match ? this.ui.split?.paintMatch?.() : null;
    const sb = $('btn-start-match');
    if (sb && split){ const wait = match && !st.splitReady; if (sb.disabled !== wait) sb.disabled = wait; sb.classList.toggle('is-wait', wait); }
    else if (sb && this.mode !== 'friend' && sb.classList.contains('is-wait')){ sb.classList.remove('is-wait'); sb.disabled = false; }
    // fuori dalla modalità amico «Gioca» torna «Gioca» (verifica dell'integrazione B15: dopo «Sfida un amico» e poi «Contro la
    // CPU» il pulsante era attivo ma diceva ancora «In attesa del Player 2…»: la barra dell'invito non lo ridipingeva più)
    if (sb && this.mode !== 'friend' && sb.dataset.label && sb.textContent !== sb.dataset.label) sb.textContent = sb.dataset.label;
    const note = $('lobby-match-note');
    const names = this.engine.natpfSplitNames || {}, n1 = names.p1 || 'Player 1', n2 = names.p2 || 'Player 2';
    // (B28: con la calibrazione «Giocando» si dice che la partita comincia con gli scambi di prova)
    const trialNote = !split && this.mode !== 'friend' && this.ui.trial?.due?.({ split: false }) ? 'Si comincia con qualche scambio di prova: il gioco impara il tuo colpo, poi la partita da 0-0.' : split && st.splitReady && this.ui.trial?.due?.({ split: true }) ? ' Si comincia con qualche scambio di prova.' : '';
    if (note) note.textContent = split ? (st.splitReady ? `${n1} a sinistra, ${n2} a destra. Ognuno guarda la sua metà.${trialNote}` : `${gate?.waiting?.length ? waitingText(gate.waiting) + ': ' : ''}${this.ui.split?.webcam ? 'la webcam deve vedere tutti e due' : 'servono i due telefoni pronti'}, torna a «Racchette».`) : st.controller === 'phone' && !st.phoneReady && !this.ui.phone.soonReady ? 'Telefono da ricollegare: con «Gioca» compare il QR.' : trialNote;
    // telefono con i sensori attivi o mano vista dalla webcam: si entra in campo da soli, ma non con la guida aperta (prima
    // il riscaldamento partiva sotto la guida e il suo «Prova» lo faceva ripartire come allenamento)
    if (this.visible && autoAdvance(this.step, st) && this.autoFrom !== this.step && !this.onboarding.isOpen){
      this.autoFrom = this.step;
      setTimeout(() => { if (this.visible && this.step === 'connect' && !this.onboarding.isOpen) this.go(split ? 'match' : 'warmup'); else this.autoFrom = null; }, 700);
    }
  }
  // «Altre impostazioni» della pagina «Partita»: aperte o chiuse, e il riassunto di che cosa c'è dentro
  _paintMatchMore(split){
    const btn = $('match-more-btn'), box = $('match-more'), sum = $('match-more-sum');
    const open = !!this.matchMore;
    show(box, open);
    if (btn && btn.getAttribute('aria-expanded') !== String(open)) btn.setAttribute('aria-expanded', String(open));
    // B18: con il formato in fiera la partita più lunga è al meglio di 3 (natpf_fair_format.fairGamesToWin): «Al meglio
    // di 5» sparisce e, se era scelto, si passa a «Al meglio di 3»; spento, il 5 ricompare e, se era stato lo staff a
    // sceglierlo e nessuno ha cambiato durata nel frattempo, torna selezionato (revisione R4: prima la scelta si perdeva)
    // (B20: di base il formato in fiera vale solo nello stesso schermo: si chiede per la modalità di questa pagina)
    const fair = readFairFormat({ split: !!split }), five = document.querySelector('#match-length-group [data-games="5"]');
    if (five){
      if (five.classList.contains('hidden') !== fair){ five.classList.toggle('hidden', fair); five.title = fair ? FAIR_MAX_GAMES_LABEL : ''; }
      const sel = document.querySelector('#match-length-group .selected')?.dataset?.games;
      const step = fairLengthStep({ fair, selected: sel, fiveBeforeFair: this._fiveBeforeFair });
      this._fiveBeforeFair = step.fiveBeforeFair;
      if (step.click) document.querySelector(`#match-length-group [data-games="${step.click}"]`)?.click();
    }
    const games = document.querySelector('#match-length-group .selected')?.dataset?.games;
    const view = this.el.querySelector('[data-page="match"] [data-natpf-view].selected')?.dataset?.natpfView;
    // B18.2 gruppo 3: «Chi gioca» e «Livello della CPU» solo contro la CPU; il livello che non viene da «Chi gioca» è
    // detto sotto le tessere e nel riassunto
    const versus = split || this.mode === 'friend', diff = this.engine.hud?.selectedDifficulty;
    show($('who-label'), !versus); show($('level-row'), !versus);
    for (const b of this.el.querySelectorAll('[data-natpf-level]')){ const on = b.dataset.natpfLevel === diff; b.classList.toggle('selected', on); b.setAttribute('aria-checked', String(on)); }
    const wn = $('who-note'), wt = versus ? '' : whoNote(diff);
    // (revisione: con «Altre impostazioni» aperte la riga non si mostra: lì il livello scelto si vede già, e la riga in più
    // allungava la pagina e tagliava a metà l'ultima riga sopra «Gioca»)
    if (wn){ if (wn.textContent !== wt) wn.textContent = wt; show(wn, !!wt && !this.matchMore); }
    const t = matchSummary({ games, format: this.format, view, split, fair, level: versus ? null : levelSummary(diff) });
    if (sum && sum.textContent !== t) sum.textContent = t;
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
    // stesso schermo con un giocatore non pronto: «Gioca» è spento; Invio riporta alle schede dei telefoni
    if (this.step === 'match' && this.mode === 'split' && !this.state().splitReady){ this.ui.toast?.(this.ui.split?.webcam ? 'La webcam deve vedere le mani di tutti e due: torna a «Racchette»' : 'Servono i due telefoni pronti: torna a «Racchette»'); this.go('connect'); return; }
    if (this.step === 'match') $('btn-start-match').click();
  }
  // Esc durante il conto alla rovescia dello stesso schermo: lo ferma («Aspetta»), non cambia pagina
  back(){
    if (this.mode === 'split' && this.step === 'connect' && this.ui.split?.countdownRunning){ this.ui.split.holdCountdown(); return; }
    const p = previousStep(this.step, this.mode); if (p) this.go(p);
  }
  _tiles(){
    const page = `[data-page="${this.step}"]`;
    // più i pulsanti dell'avviso di aggiornamento (natpf_updates.js), in fondo: frecce e Invio arrivano anche lì
    return [...this.el.querySelectorAll(`${page} .lobby-tile, ${page} .menu-item, ${page} [data-match-more], ${page} .seg-btn, ${page} [data-result]`), ...(this.ui.updates?.noticeButtons?.() || [])].filter(t => !t.classList.contains('hidden') && t.offsetParent !== null);
  }
  _key(e){
    if (this.ui.intro?.active) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;     // scorciatoie (pannello dell'addetto, browser): non sono del menu
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (this.onboarding.isOpen){ if (this.onboarding.key(e)) e.preventDefault(); e.stopImmediatePropagation(); return; }
    // calibrazione dello schermo aperta: frecce, Tab, numeri, Invio ed Esc sono suoi (F11 e gli altri tasti del browser no)
    if (this.ui.calibra?.isOpen){ if (this.ui.calibra.key(e)) e.preventDefault(); e.stopImmediatePropagation(); return; }
    // stesso schermo, tutorial aperto in una metà della pagina «Collega»: A/D e ← → sfogliano le schede (natpf_split_ui)
    if (this.visible && this.step === 'connect' && this.ui.split?.key?.(e)){ e.preventDefault(); e.stopImmediatePropagation(); return; }
    const sheetOpen = [...document.querySelectorAll('.natpf-sheet-backdrop')].some(m => !m.classList.contains('hidden'));
    // in campo: Esc apre e chiude la pausa (Esc tenuto premuto ripete il tasto: si usa solo il primo, così uscendo dallo
    // schermo intero del browser la pausa non si apre e chiude di continuo); F schermo intero
    if (!this.visible){
      if (e.code === 'Escape' && this.ui.pause){ e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) this.ui.pause.toggle(); }
      else if (e.code === 'KeyF' && !e.repeat && !e.shiftKey && this.ui.screen?.fullscreen){ e.preventDefault(); e.stopImmediatePropagation(); this.ui.screen.fullscreen.toggle(); }
      return;
    }
    if (sheetOpen) return;
    if (e.code === 'Tab') return;
    e.stopImmediatePropagation();
    if (e.key && e.key.length === 1){ const r = eggTyped(this.eggBuffer, e.key); this.eggBuffer = r.buffer; if (r.hit){ this.ui.toggleTestInput(); this.eggBuffer = ''; return; } }
    // F: schermo intero sì/no (dopo l'easter egg, che finisce con la «f»)
    if (e.code === 'KeyF' && !e.shiftKey){ e.preventDefault(); if (!e.repeat) this.ui.screen?.fullscreen?.toggle(); return; }
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
      if (i >= 0 && ['menu', 'mode', 'controller', 'options', 'challenges', 'ranking', 'result'].includes(this.step)) tiles[i].click();
      // pagina «Partita»: Invio su «Altre impostazioni» le apre o le chiude; altrove si gioca
      else if (i >= 0 && this.step === 'match' && tiles[i].matches('[data-match-more]')) tiles[i].click();
      else this.next();
    }
    // Esc tenuto premuto (per uscire dallo schermo intero del browser) ripete il tasto: indietro di una pagina sola
    else if (e.code === 'Escape' || e.code === 'Backspace'){ e.preventDefault(); if (!(e.repeat && e.code === 'Escape')) this.back(); }
    else if (e.code === 'KeyH'){ this.onboarding.open(); }
  }
  /* ---------- riscaldamento e allenamento in campo ---------- */
  // Dalla pagina «Collega» (da soli quando il telefono ha i sensori attivi, o con il pulsante «In campo ›» / «Alla partita ›»,
  // che dice dove si va: connectTarget).
  // Partita (contro la CPU, sfida un amico) dal B16, decisione dell'utente dell'08/11 sera («riscaldamento facoltativo»):
  // con il telefono da calibrare il tutorial corto e la calibrazione in campo, poi la pagina «Partita» con «Gioca» e
  // «Riscaldati prima»; con il telefono già calibrato, la webcam o mouse e tastiera subito la pagina «Partita». Prima dopo
  // la calibrazione partiva il riscaldamento (2 dritti, 2 rovesci, un servizio), che quasi tutti saltavano con «Salta».
  // Il riscaldamento insegnava al gioco il colpo tipico prima della partita: senza, i primi colpi della partita si
  // leggono con la mediana dei colpi già fatti (natpf_phone_racket.powerRefs, banco scripts/audit/riscaldamento.mjs).
  // warmup: true per il riscaldamento vero («Riscaldati prima»)
  startWarmup({ warmup = false, again = false } = {}){
    const ui = this.ui;
    // telefono non ancora collegato: prima il collegamento (il riscaldamento chiesto resta chiesto)
    if (ui.controller === 'phone' && !this.state().phoneLinked){ if (warmup) this.wantWarmup = true; this.go('connect'); return; }
    warmup = warmup || !!this.wantWarmup; this.wantWarmup = false;
    // B28: con la calibrazione «Giocando» o «Nessuna» il telefono non fa i gesti (profilo semplice automatico): in campo
    // prima della partita o della sfida si va solo per il tutorial corto, se è da vedere
    const P = ui.phone, court = ui.controller === 'phone' && ((!P.ready && !P.autoSimple) || this._tutorialDue());
    // sfida: con il telefono non ancora calibrato prima solo la calibrazione in campo, poi la sfida (con «Giocando» prima
    // gli scambi di prova; non con «Gioca ancora» del risultato: again, è la stessa persona)
    if (this.mode === 'challenge'){
      this.step = 'warmup'; this.el.dataset.step = 'warmup';
      if (court && !again) ui.training.start({ calOnly: true });
      else { this.releaseTutorial(); this._startChallenge({ trial: !again }); }
      return;
    }
    // Allenamento dal menu: tutorial completo, sempre con la lezione su presa e posizione
    const full = this.mode === 'training';
    if (full){ this.step = 'warmup'; this.el.dataset.step = 'warmup'; ui.training.introSeen = {}; ui.training.start({ intro: true }); return; }
    // «Riscaldati prima»: solo dritto, rovescio e servizio (con il telefono da calibrare, prima la calibrazione)
    if (warmup){ this.step = 'warmup'; this.el.dataset.step = 'warmup'; ui.training.start({ drills: warmupDrills(ui.controller) }); return; }
    // partita: telefono da calibrare (o pronto ma con il tutorial corto da vedere: visitatore nuovo con lo stesso telefono)
    // → in campo il tutorial e la calibrazione, poi «Partita»
    // (la stessa scelta di connectTarget, che dà il nome al pulsante della pagina «Collega»)
    if (court){ this.step = 'warmup'; this.el.dataset.step = 'warmup'; ui.training.start({ calOnly: true }); return; }
    this.releaseTutorial();
    if (this._friendTrial()) return;
    this.go('match');
  }
  // B28, minigioco: prima gli scambi di prova (calibrazione «Giocando», telefono), poi il minigioco
  _startChallenge({ trial = true } = {}){
    const ui = this.ui, go = () => ui.events.start(this.challenge);
    if (trial && ui.trial?.due?.({ split: false })) ui.trial.start({ split: false, then: go }); else go();
  }
  // B28, sfida tra due computer (chi invita): gli scambi di prova in campo dopo «Collega», una volta, poi la pagina
  // «Partita» (alla partenza l'altro computer aspetta: lì non si possono fare). true se sono partiti
  _friendTrial(){
    const ui = this.ui;
    if (this.mode !== 'friend' || this.trialPlayed || !ui.trial?.due?.({ split: false })) return false;
    this.trialPlayed = true; this.step = 'warmup'; this.el.dataset.step = 'warmup';
    ui.trial.start({ split: false, then: () => { this.engine.hud.showTitleModal(); this.engine._setupMidRallyShowcase?.({}); this.engine.autoPlayMode = true; this.engine.userHasInteracted = false; this.go('match'); ui._syncPause?.(); } });
    return true;
  }
  // tutorial corto ancora da vedere con questo telefono (prima della partita: natpf_training lo apre in campo)
  _tutorialDue(){ const P = this.ui.phone; return P?.tutorialSeenFor ? !P.tutorialSeenFor('short') : !P?.tutorialSeen; }
  // «Riscaldati prima» nella pagina «Partita»
  warmupFirst(){ show($('lobby-practice-result'), false); this.startWarmup({ warmup: true }); }
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
    // calibrazione prima di una sfida (anche saltata: modalità semplice) → la sfida (B28: con «Giocando» prima gli scambi di prova)
    if (this.mode === 'challenge'){ this._startChallenge(); return; }
    if (completed) this.trainingDone = true;
    // riscaldamento finito (non la sola calibrazione): il pulsante della pagina «Partita» diventa «Rifai il riscaldamento»
    if (completed && this.mode !== 'training' && !this.ui.training?.calOnly && this.ui.training?.drills?.length) this.warmupDone = true;
    const simple = 'Senza calibrazione: si gioca lo stesso, la forza non è tarata.';
    // solo la calibrazione prima della partita (B16): racchetta pronta, o saltata (modalità semplice)
    const text = calibrated && !stats.shots ? '<b>Racchetta pronta ✓</b>'
      : skipped && this.mode !== 'training' && !this.ui.training?.drills?.length ? `<b>Calibrazione saltata</b><span>${simple}</span>`
      : skipped ? `<b>${this.mode === 'training' ? 'Allenamento interrotto' : 'Riscaldamento saltato'}</b><span>${this.ui.phone.simple ? simple : 'Lo puoi rifare quando vuoi.'}</span>`
      : `<b>${completed ? (this.mode === 'training' ? 'Allenamento completato ✓' : 'Riscaldamento completato ✓') : 'Interrotto'}</b><span>${stats.shots} colpi · ${stats.perfect} perfetti${stats.out ? ` · ${stats.out} fuori` : ''}</span>`;
    // allenamento dal menu: si torna al menu con il risultato; riscaldamento prima della partita: si va alla partita
    if (this.mode === 'training'){
      this.go('menu');
      const r = $('lobby-menu-result'); r.innerHTML = text; show(r);
    } else {
      // B28, sfida tra due computer: dopo il tutorial in campo gli scambi di prova, poi la pagina «Partita»
      if (!skipped && this._friendTrial()) return;
      this.go('match');
      const r = $('lobby-practice-result'); r.innerHTML = text; show(r);
    }
    this.paint();
  }
  tick(){}
  feedback(){}
}
