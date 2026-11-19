// Istruzioni del servizio sul grande schermo (B18, miglioramento 2 dell'audit B16). Prima lo schermo diceva solo
// «Al servizio» e l'istruzione stava sul telefono, che in fiera nessuno guarda; se chi gioca lanciava e non colpiva, la
// palla ricadeva senza un messaggio e il gioco restava fermo ad aspettare un nuovo lancio che nessuno spiegava.
// Ora, in partita, per chi serve da questo computer:
// - prima del lancio: B44 (13/11, l'utente: «Togli "Premi ↑ o W: lanci la palla", è orribile, magari metti una leggera
//   animazione per indicare di salire su») non più il riquadro «Alza il telefono: lanci la palla / Poi colpisci quando la
//   palla è in alto» (e le versioni per webcam e tastiera), ma la piccola icona del telefono che sale con la palla sopra,
//   in loop, accanto a chi batte, senza scritte (natpf_serve_hint.js, dentro la casella «Al servizio»);
// - durante il lancio, vicino al punto più alto: «Colpisci!» (come prima); B48: con il telefono, sotto, la regola della
//   direzione (SERVE_CHOICE: prima del punto più alto al centro, dopo larga), proprio quando si sceglie;
// - dopo un lancio a vuoto (la palla ricade): «Colpisci quando la palla è in alto» con «Lancio a vuoto: riprova», e si
//   rilancia (anche il telefono lo dice: natpf_phone_racket.tossMissed); l'icona torna;
// - B44: ai primi servizi di ogni GIOCATORE NUOVO (SERVE_COACH.firstServes, ognuno il suo conto; si riparte con «Nuovo
//   giocatore» e con il chiosco, newPlayer(), non più a ogni partita); dopo, solo se chi serve aspetta più di idleS senza
//   lanciare o dopo un lancio a vuoto, finché un servizio non parte. Mai quando batte la CPU.
// Restano il richiamo per nome dello stesso schermo (B20) e l'avviso del lancio automatico (B25), senza più il testo del
// lancio (lo dice l'icona).
// Leggibile sul ledwall: misure in cqh (@container natpf), testo bianco su fondo scuro pieno, bordo colorato per lo stato.
// Non nelle sfide. Nell'allenamento niente scritte (la scheda dell'esercizio ha già il suo testo), ma nell'esercizio
// «Servizio» l'icona sì, a ogni servizio: l'allenamento dice la stessa cosa del gioco.
import { autoTossNext } from './natpf_duo_rules.js';
import { NatpfServeHint } from './natpf_serve_hint.js';
import { viewport } from './natpf_screen.js';
import { SERVE_CHOICE } from './natpf_gesture_motion.js'; // B48: la regola della direzione del servizio dal telefono
export const SERVE_COACH = Object.freeze({
  firstServes: 2,      // servizi riusciti con le istruzioni piene, a ogni partita nuova
  apexBefore: .24,     // s prima del punto più alto: «Colpisci!»
  apexAfter: .32,      // s dopo il punto più alto: ancora «Colpisci!» (la battuta vale fino a ~0,4 s dopo)
  idleS: 6,            // s fermi al servizio senza lanciare: torna l'istruzione del lancio
  callS: 9,            // s fermi al servizio nello stesso schermo: richiamo per nome a tutta larghezza (B20, audit B19 punto 9)
  missS: 4,            // s in cui resta la scritta del lancio a vuoto (poi di nuovo l'istruzione del lancio)
  gravity: 9.15,        // gravità del motore nel lancio (L.GRAVITY, natpf_impact.PHYS.GRAVITY; revisione B18: era 9,81)
  fallY: 1.6,           // m: senza il segnale del motore (Player 2 sull'altro computer) lancio a vuoto se la palla era sotto
});
// B25, lancio automatico (opzione dello staff, natpf_duo_rules.js). g.auto: { left, what } secondi che mancano al lancio
// automatico ('toss') o al servizio automatico ('serve'), null se l'opzione è spenta; g.autoLive: 'toss' | 'serve' se la
// palla in aria l'ha lanciata il gioco. Negli ultimi AUTO_WARN secondi il richiamo lo annuncia (B44: senza il testo del
// lancio, che dice l'icona)
export const AUTO_WARN = 10;
const autoSub = a => (a.what === 'serve' ? `Tra ${Math.max(1, Math.ceil(a.left))} s batte il gioco` : `Tra ${Math.max(1, Math.ceil(a.left))} s la lancia il gioco`);

// Cosa mostrare (funzione pura, per i test). s: stato del coach; g: fotografia del gioco
//   g.phase, g.mine (chi serve gioca da questo computer), g.controller, g.tossT (s al punto più alto, + in salita),
//   g.idle (s fermi al servizio), g.drill (allenamento, esercizio «Servizio»). Restituisce null (niente) o
//   { state: 'toss'|'wait'|'go'|'miss', icon, big, sub }: icon = l'icona del lancio accanto a chi batte (B44); big/sub = il
//   riquadro di testo, che c'è solo quando big non è vuoto
// servizi riusciti di chi serve adesso: nello stesso schermo ognuno ha il suo conto (revisione dell'insieme B18.1: prima un
// conto solo, e il P2 che batteva nel secondo game non vedeva mai le istruzioni piene). s.served: numero (un solo
// giocatore locale, compatibile) o { player, opponent }
export function servedBy(s = {}, server = 'player'){
  const v = s.served;
  return typeof v === 'number' ? v : (v?.[server === 'opponent' ? 'opponent' : 'player'] || 0);
}
export function serveCoachView(s = {}, g = {}){
  if (!g.mine || !['SERVE_STANCE', 'SERVE_TOSS'].includes(g.phase)) return null;
  // B44: allenamento, esercizio «Servizio»: l'icona a ogni servizio (le scritte le ha la scheda dell'esercizio)
  if (g.drill) return g.phase === 'SERVE_STANCE' ? { state: 'toss', icon: true, big: '', sub: '' } : null;
  const learning = servedBy(s, g.server) < SERVE_COACH.firstServes, missed = s.missAt != null;
  if (g.phase === 'SERVE_STANCE'){
    // B25: il gioco sta per lanciare (o per battere) al posto di chi è fermo: lo dice, con il nome e i secondi che mancano
    if (g.auto && g.auto.left <= AUTO_WARN) return { state: 'toss', call: true, icon: true, big: `${g.name || 'Al servizio'}, batti tu`, sub: autoSub(g.auto) };
    if (missed && (g.now ?? 0) - s.missAt <= SERVE_COACH.missS) return { state: 'miss', icon: true, big: 'Colpisci quando la palla è in alto', sub: 'Lancio a vuoto: riprova' };
    // B20 (audit B19, punto 9): nello stesso schermo chi deve battere e resta fermo viene chiamato per nome, a tutta
    // larghezza, così l'altro e la fila capiscono chi sta aspettando il gioco (prima solo l'istruzione, senza nome, anche
    // dopo 40 s). Solo testo: nessuna voce nuova (B44: il come lo dice l'icona)
    if (g.name && (g.idle ?? 0) >= SERVE_COACH.callS) return { state: 'toss', call: true, icon: true, big: `${g.name}, batti tu`, sub: '' };
    // B44: niente riquadro, solo l'icona accanto a chi batte
    if (learning || missed || (g.idle ?? 0) >= SERVE_COACH.idleS) return { state: 'toss', icon: true, big: '', sub: '' };
    return null;
  }
  // B25: palla lanciata dal gioco. Servizio automatico: lo batte il gioco; lancio automatico: «Colpisci!» anche a chi non
  // è più ai primi servizi
  if (g.autoLive === 'serve') return { state: 'wait', call: true, big: 'Servizio automatico', sub: `Il gioco batte per ${g.name || 'chi è al servizio'}` };
  if (!learning && !missed && !g.autoLive) return null;
  const t = Number(g.tossT);
  if (!Number.isFinite(t)) return null;
  if (t <= SERVE_COACH.apexBefore && t >= -SERVE_COACH.apexAfter) return { state: 'go', big: 'Colpisci!', sub: g.autoLive ? 'Lancio automatico' : g.controller === 'phone' ? SERVE_CHOICE : '' };
  if (t > SERVE_COACH.apexBefore) return { state: 'wait', big: g.autoLive ? 'Lancio automatico' : 'Aspetta che salga…', sub: 'Colpisci quando la palla è in alto' };
  return null;
}

// Stato che segue la partita: servizi riusciti, lancio a vuoto, tempo fermo al servizio. Funzione pura: (s, g, dt) → s,
// con l'evento «missed» quando la palla del lancio è ricaduta senza battuta.
// Revisione B18: il lancio a vuoto viene dal segnale del motore (g.tossMisses, contatore di game_engine) e non da ogni
// passaggio SERVE_TOSS → SERVE_STANCE (una partita ricominciata con la palla in aria lo faceva scattare); dove il motore
// non lo dà (Player 2 sull'altro computer: g.tossMisses null) vale la palla che stava ricadendo sotto fallY. Partita
// nuova: cambia il contatore delle partite (g.match); senza contatore, il punteggio a zero arrivando da fuori dal punto
// (prima anche la seconda palla dopo un fallo a 0-0 ricominciava da capo)
const IN_POINT = new Set(['SERVE_STANCE', 'SERVE_TOSS', 'RALLY', 'POINT_OVER']);
export function serveCoachStep(s = {}, g = {}, dt = 0){
  const n = { served: { player: servedBy(s, 'player'), opponent: servedBy(s, 'opponent') }, missAt: s.missAt ?? null, idle: s.idle || 0, phase: g.phase, missed: false,
    match: g.match ?? null, tossMisses: g.tossMisses ?? null, lastY: g.phase === 'SERVE_TOSS' ? g.ballY ?? null : null, lastVy: g.phase === 'SERVE_TOSS' ? g.ballVy ?? null : null };
  const newMatch = g.match != null ? s.match != null && g.match !== s.match : g.phase === 'SERVE_STANCE' && g.fresh && !IN_POINT.has(s.phase);
  // (B44: la partita nuova toglie il lancio a vuoto, non il conto dei servizi: è per giocatore nuovo, newPlayer())
  if (newMatch) n.missAt = null;
  const fell = g.tossMisses != null ? s.tossMisses != null && g.tossMisses > s.tossMisses : s.lastVy < 0 && s.lastY != null && s.lastY < SERVE_COACH.fallY;
  if (!newMatch && s.phase === 'SERVE_TOSS' && g.phase === 'SERVE_STANCE' && g.mine && !g.drill && fell){ n.missAt = g.now ?? 0; n.missed = true; }
  // (i servizi dell'esercizio dell'allenamento non contano: l'icona dei primi servizi si vede anche in partita)
  if (s.phase === 'SERVE_TOSS' && g.phase === 'RALLY' && g.mine && !g.drill){ n.served[g.server === 'opponent' ? 'opponent' : 'player']++; n.missAt = null; }
  n.idle = g.phase === 'SERVE_STANCE' && g.mine && !g.paused ? (s.phase === 'SERVE_STANCE' ? n.idle + dt : 0) : 0;
  return n;
}

export class NatpfServeCoach {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    this.state = { served: { player: 0, opponent: 0 }, missAt: null, idle: 0, phase: null };
    this.el = typeof document !== 'undefined' ? document.getElementById('natpf-serve-coach') : null;
    this.hint = new NatpfServeHint();    // B44: l'icona del lancio accanto a chi batte
    this.shown = '';
  }
  // B44: giocatore nuovo («Nuovo giocatore», chiosco): di nuovo l'icona ai primi servizi, per tutti e due nello stesso schermo
  newPlayer(){ this.state = { ...this.state, served: { player: 0, opponent: 0 }, missAt: null, idle: 0 }; }
  // fotografia del gioco per serveCoachView/serveCoachStep
  snapshot(){
    const E = this.engine, U = this.ui || {}, sc = E.score || {}, split = !!E.natpfSplit?.active;
    const local = E.playerRole === 'p2' ? 'opponent' : 'player';
    const inMatch = !E.autoPlayMode && !U.training?.active && !U.events?.active && !U.trial?.active && !U.lobby?.visible;
    // B44: allenamento, esercizio «Servizio» (non la lezione, non la calibrazione): l'icona come in partita
    const T = U.training, drill = !E.autoPlayMode && !!T?.active && !T.cal && !T.lesson && T.drill?.id === 'serve' && !U.lobby?.visible;
    // chi serve gioca qui: nello stesso schermo tutti e due, altrimenti il lato di questo computer (la CPU non è mai locale)
    const mine = (inMatch && (split || sc.server === local)) || (drill && sc.server === local);
    const vy = E.ball?.vel?.y, guest = E.playerRole === 'p2' && !!E.isMultiplayer && !split;
    // stesso schermo: due telefoni o una webcam per due (natpf_split_ui.input); revisione B18: prima sempre «telefono»
    const controller = split ? (U.split?.webcam ? 'webcam' : 'phone') : (U.controller || 'phone');
    return { phase: E.phase, mine, drill, split, side: split ? (sc.server === 'opponent' ? 'right' : 'left') : 'center', server: sc.server,
      // nome di chi batte, solo nello stesso schermo (richiamo per nome, B20)
      name: split ? (E.natpfSplitNames?.[sc.server === 'opponent' ? 'p2' : 'p1'] || (sc.server === 'opponent' ? 'Player 2' : 'Player 1')) : '',
      controller, tossT: Number.isFinite(vy) ? vy/SERVE_COACH.gravity : null, now: E.elapsedTime || 0,
      ballY: E.ball?.pos?.y ?? null, ballVy: Number.isFinite(vy) ? vy : null,
      // segnali del motore; il computer del P2 nella sfida tra due computer non fa la fisica (riceve lo stato): null
      tossMisses: guest ? null : E.natpfTossMisses || 0, match: guest ? null : E.natpfMatchSeq || 0,
      // B25: lancio automatico (solo nello stesso schermo con l'opzione accesa): quanto manca e chi ha lanciato la palla
      auto: split && E.natpfDuo?.autoToss && E.phase === 'SERVE_STANCE' ? autoTossNext({ idle: E.phaseTimer || 0, misses: E.natpfAutoMisses || 0 }) : null,
      autoLive: split && E.phase === 'SERVE_TOSS' ? E.natpfAutoLive || null : null,
      // (B44: nella moviola la casella «Al servizio» non c'è e l'icona nemmeno)
      replay: E.cameraMode === 'REPLAY_CAM',
      paused: !!E.natpfPaused, fresh: !((sc.playerPoints || 0) + (sc.opponentPoints || 0) + (sc.playerGames || 0) + (sc.opponentGames || 0)) };
  }
  tick(dt = 1/60){
    const g = this.snapshot();
    this.state = serveCoachStep(this.state, g, dt);
    if (this.state.missed) this._tossMissed(g);
    // partita in pausa (menu della pausa, tutorial, telefono da ricollegare): niente istruzioni sopra i pannelli
    this.paint(g.paused ? null : serveCoachView(this.state, { ...g, idle: this.state.idle }), g);
  }
  // lancio a vuoto: anche il telefono di chi serve lo dice (prima niente)
  _tossMissed(g){
    const E = this.engine, ph = g.split && g.server === 'opponent' ? E.natpfPhone2 : E.natpfPhone;
    try { ph?.tossMissed?.(); } catch {}
  }
  paint(v, g = {}){
    // B44: l'icona accanto a chi batte (ogni volta: la casella «Al servizio» si sposta e quelle dello stesso schermo nascono dopo)
    this.hint?.paint(!!v?.icon && !g.replay, { split: !!g.split, server: g.server, w: viewport().w });
    const el = this.el; if (!el) return;
    // (il riquadro di testo solo quando c'è una scritta: B44)
    if (v && !v.big) v = null;
    // B72: nella lingua di chi batte (a una vista quella di chi gioca qui; nello stesso schermo quella della sua metà, anche il
    // richiamo per nome a tutta larghezza: è per lui). Solo i testi: la casella e il suo lampeggio non cambiano
    const LG = this.engine?.natpfLang, lang = LG?.at?.(g.side === 'left' || g.side === 'right' ? g.side : 'center') || 'it';
    const key = v ? `${v.state}|${v.big}|${v.sub}|${g.side}|${v.call ? 1 : 0}|${lang}` : '';
    if (key === this.shown) return;
    this.shown = key;
    el.classList.toggle('hidden', !v);
    if (!v) return;
    el.dataset.state = v.state; el.dataset.side = g.side || 'center';
    // richiamo per nome: a tutta larghezza, sotto i due tabelloni (natpf-ui.css)
    if (v.call) el.dataset.call = '1'; else delete el.dataset.call;
    const big = el.querySelector?.('[data-c="big"]'), sub = el.querySelector?.('[data-c="sub"]');
    if (big) big.textContent = LG ? LG.say(v.big, lang) : v.big;
    if (sub){ sub.textContent = LG ? LG.say(v.sub, lang) : v.sub; sub.hidden = !v.sub; }
  }
  // B72: lingua cambiata (natpf_lang.NatpfLang.refresh): la scritta in vista si riscrive al prossimo giro
  repaint(){ this.shown = null; }
}
