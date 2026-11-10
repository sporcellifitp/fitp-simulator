// Istruzioni del servizio sul grande schermo (B18, miglioramento 2 dell'audit B16). Prima lo schermo diceva solo
// «Al servizio» e l'istruzione stava sul telefono, che in fiera nessuno guarda; se chi gioca lanciava e non colpiva, la
// palla ricadeva senza un messaggio e il gioco restava fermo ad aspettare un nuovo lancio che nessuno spiegava.
// Ora, in partita, per chi serve da questo computer:
// - prima del lancio: «Alza il telefono: lanci la palla» (webcam: «Alza la mano…», prova con la tastiera: «Premi ↑…»);
// - durante il lancio, vicino al punto più alto: «Colpisci!»;
// - dopo un lancio a vuoto (la palla ricade): «Colpisci quando la palla è in alto», e si rilancia (anche il telefono lo
//   dice: natpf_phone_racket.tossMissed);
// - nei primi servizi della partita (SERVE_COACH.firstServes) sempre; dopo, solo se chi serve aspetta più di idleS senza
//   lanciare o dopo un lancio a vuoto, finché un servizio non parte.
// Leggibile sul ledwall: misure in cqh (@container natpf), testo bianco su fondo scuro pieno, bordo colorato per lo stato.
// Non nell'allenamento (la scheda dell'esercizio ha già il suo testo) né nelle sfide.
export const SERVE_COACH = Object.freeze({
  firstServes: 2,      // servizi riusciti con le istruzioni piene, a ogni partita nuova
  apexBefore: .24,     // s prima del punto più alto: «Colpisci!»
  apexAfter: .32,      // s dopo il punto più alto: ancora «Colpisci!» (la battuta vale fino a ~0,4 s dopo)
  idleS: 6,            // s fermi al servizio senza lanciare: torna l'istruzione del lancio
  missS: 4,            // s in cui resta la scritta del lancio a vuoto (poi di nuovo l'istruzione del lancio)
  gravity: 9.15,        // gravità del motore nel lancio (L.GRAVITY, natpf_impact.PHYS.GRAVITY; revisione B18: era 9,81)
  fallY: 1.6,           // m: senza il segnale del motore (Player 2 sull'altro computer) lancio a vuoto se la palla era sotto
});
const TOSS = { phone: 'Alza il telefono: lanci la palla', webcam: 'Alza la mano: lanci la palla', mouse: 'Premi ↑ o W: lanci la palla' };

// Testo da mostrare (funzione pura, per i test). s: stato del coach; g: fotografia del gioco
//   g.phase, g.mine (chi serve gioca da questo computer), g.controller, g.tossT (s al punto più alto, + in salita),
//   g.idle (s fermi al servizio). Restituisce null (niente) o { state: 'toss'|'wait'|'go'|'miss', big, sub }
// servizi riusciti di chi serve adesso: nello stesso schermo ognuno ha il suo conto (revisione dell'insieme B18.1: prima un
// conto solo, e il P2 che batteva nel secondo game non vedeva mai le istruzioni piene). s.served: numero (un solo
// giocatore locale, compatibile) o { player, opponent }
export function servedBy(s = {}, server = 'player'){
  const v = s.served;
  return typeof v === 'number' ? v : (v?.[server === 'opponent' ? 'opponent' : 'player'] || 0);
}
export function serveCoachView(s = {}, g = {}){
  if (!g.mine || !['SERVE_STANCE', 'SERVE_TOSS'].includes(g.phase)) return null;
  const learning = servedBy(s, g.server) < SERVE_COACH.firstServes, missed = s.missAt != null, toss = TOSS[g.controller] || TOSS.phone;
  if (g.phase === 'SERVE_STANCE'){
    if (missed && (g.now ?? 0) - s.missAt <= SERVE_COACH.missS) return { state: 'miss', big: 'Colpisci quando la palla è in alto', sub: `Lancio a vuoto: riprova. ${toss}` };
    if (learning || missed || (g.idle ?? 0) >= SERVE_COACH.idleS) return { state: 'toss', big: toss, sub: 'Poi colpisci quando la palla è in alto' };
    return null;
  }
  if (!learning && !missed) return null;
  const t = Number(g.tossT);
  if (!Number.isFinite(t)) return null;
  if (t <= SERVE_COACH.apexBefore && t >= -SERVE_COACH.apexAfter) return { state: 'go', big: 'Colpisci!', sub: '' };
  if (t > SERVE_COACH.apexBefore) return { state: 'wait', big: 'Aspetta che salga…', sub: 'Colpisci quando la palla è in alto' };
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
  if (newMatch || (s.phase == null && g.phase === 'SERVE_STANCE')){ n.served = { player: 0, opponent: 0 }; n.missAt = null; }
  const fell = g.tossMisses != null ? s.tossMisses != null && g.tossMisses > s.tossMisses : s.lastVy < 0 && s.lastY != null && s.lastY < SERVE_COACH.fallY;
  if (!newMatch && s.phase === 'SERVE_TOSS' && g.phase === 'SERVE_STANCE' && g.mine && fell){ n.missAt = g.now ?? 0; n.missed = true; }
  if (s.phase === 'SERVE_TOSS' && g.phase === 'RALLY' && g.mine){ n.served[g.server === 'opponent' ? 'opponent' : 'player']++; n.missAt = null; }
  n.idle = g.phase === 'SERVE_STANCE' && g.mine && !g.paused ? (s.phase === 'SERVE_STANCE' ? n.idle + dt : 0) : 0;
  return n;
}

export class NatpfServeCoach {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    this.state = { served: { player: 0, opponent: 0 }, missAt: null, idle: 0, phase: null };
    this.el = typeof document !== 'undefined' ? document.getElementById('natpf-serve-coach') : null;
    this.shown = '';
  }
  // fotografia del gioco per serveCoachView/serveCoachStep
  snapshot(){
    const E = this.engine, U = this.ui || {}, sc = E.score || {}, split = !!E.natpfSplit?.active;
    const local = E.playerRole === 'p2' ? 'opponent' : 'player';
    const inMatch = !E.autoPlayMode && !U.training?.active && !U.events?.active && !U.lobby?.visible;
    // chi serve gioca qui: nello stesso schermo tutti e due, altrimenti il lato di questo computer (la CPU non è mai locale)
    const mine = inMatch && (split || sc.server === local);
    const vy = E.ball?.vel?.y, guest = E.playerRole === 'p2' && !!E.isMultiplayer && !split;
    // stesso schermo: due telefoni o una webcam per due (natpf_split_ui.input); revisione B18: prima sempre «telefono»
    const controller = split ? (U.split?.webcam ? 'webcam' : 'phone') : (U.controller || 'phone');
    return { phase: E.phase, mine, split, side: split ? (sc.server === 'opponent' ? 'right' : 'left') : 'center', server: sc.server,
      controller, tossT: Number.isFinite(vy) ? vy/SERVE_COACH.gravity : null, now: E.elapsedTime || 0,
      ballY: E.ball?.pos?.y ?? null, ballVy: Number.isFinite(vy) ? vy : null,
      // segnali del motore; il computer del P2 nella sfida tra due computer non fa la fisica (riceve lo stato): null
      tossMisses: guest ? null : E.natpfTossMisses || 0, match: guest ? null : E.natpfMatchSeq || 0,
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
    const el = this.el; if (!el) return;
    const key = v ? `${v.state}|${v.big}|${v.sub}|${g.side}` : '';
    if (key === this.shown) return;
    this.shown = key;
    el.classList.toggle('hidden', !v);
    if (!v) return;
    el.dataset.state = v.state; el.dataset.side = g.side || 'center';
    const big = el.querySelector?.('[data-c="big"]'), sub = el.querySelector?.('[data-c="sub"]');
    if (big) big.textContent = v.big;
    if (sub){ sub.textContent = v.sub; sub.hidden = !v.sub; }
  }
}
