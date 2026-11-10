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
  gravity: 9.81,
});
const TOSS = { phone: 'Alza il telefono: lanci la palla', webcam: 'Alza la mano: lanci la palla', mouse: 'Premi ↑ o W: lanci la palla' };

// Testo da mostrare (funzione pura, per i test). s: stato del coach; g: fotografia del gioco
//   g.phase, g.mine (chi serve gioca da questo computer), g.controller, g.tossT (s al punto più alto, + in salita),
//   g.idle (s fermi al servizio). Restituisce null (niente) o { state: 'toss'|'wait'|'go'|'miss', big, sub }
export function serveCoachView(s = {}, g = {}){
  if (!g.mine || !['SERVE_STANCE', 'SERVE_TOSS'].includes(g.phase)) return null;
  const learning = (s.served || 0) < SERVE_COACH.firstServes, missed = s.missAt != null, toss = TOSS[g.controller] || TOSS.phone;
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
// con l'evento «missed» quando la palla del lancio è ricaduta senza battuta
export function serveCoachStep(s = {}, g = {}, dt = 0){
  const n = { served: s.served || 0, missAt: s.missAt ?? null, idle: s.idle || 0, phase: g.phase, missed: false };
  // partita nuova (punteggio a zero al servizio): si ricomincia con le istruzioni piene
  if (g.phase === 'SERVE_STANCE' && g.fresh && s.phase !== 'SERVE_STANCE'){ n.served = 0; n.missAt = null; }
  if (s.phase === 'SERVE_TOSS' && g.phase === 'SERVE_STANCE' && g.mine){ n.missAt = g.now ?? 0; n.missed = true; }
  if (s.phase === 'SERVE_TOSS' && g.phase === 'RALLY' && g.mine){ n.served++; n.missAt = null; }
  n.idle = g.phase === 'SERVE_STANCE' && g.mine && !g.paused ? (s.phase === 'SERVE_STANCE' ? n.idle + dt : 0) : 0;
  return n;
}

export class NatpfServeCoach {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    this.state = { served: 0, missAt: null, idle: 0, phase: null };
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
    const vy = E.ball?.vel?.y;
    return { phase: E.phase, mine, split, side: split ? (sc.server === 'opponent' ? 'right' : 'left') : 'center', server: sc.server,
      controller: split ? 'phone' : (U.controller || 'phone'), tossT: Number.isFinite(vy) ? vy/SERVE_COACH.gravity : null, now: E.elapsedTime || 0,
      paused: !!E.natpfPaused, fresh: !((sc.playerPoints || 0) + (sc.opponentPoints || 0) + (sc.playerGames || 0) + (sc.opponentGames || 0)) };
  }
  tick(dt = 1/60){
    const g = this.snapshot();
    this.state = serveCoachStep(this.state, g, dt);
    if (this.state.missed) this._tossMissed(g);
    this.paint(serveCoachView(this.state, { ...g, idle: this.state.idle }), g);
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
