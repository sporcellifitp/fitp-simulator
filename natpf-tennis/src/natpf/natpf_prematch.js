// Conto alla rovescia grande prima della partita (B47; richiesta dell'utente del 14/11: «tra il momento degli scambi della
// calibrazione e del match, prevedi un countdown grosso centrale che dice "Preparati, la partita sta per cominciare"»).
// Ovunque parta una partita con il telefono, contro la CPU e nello stesso schermo con i due telefoni: dopo gli scambi di
// prova, dopo «Gioca», dopo «Sono pronto» dei telefoni (prende il posto del conto piccolo della B41.6, natpf_ready_go.js),
// dopo la rivincita. Al centro dello schermo intero (nello stesso schermo uno solo, non uno per metà), grande:
// «Preparati» · «La partita sta per cominciare» · 3 · 2 · 1 (3 s) e chi batte. I telefoni lo ripetono con il messaggio del
// conto dello stesso schermo («ev count»: «Si gioca tra 3», poi «Si gioca!»). Intanto la partita resta ferma al primo
// servizio (natpf_ui._syncPause); a zero la scritta e la voce «Start» di sempre (game_engine.natpfStartCall) e si gioca.
// Vale solo all'inizio della partita: non torna a «Riprendi» dopo una pausa. Se intanto si apre la pausa, il pannello
// dello stand o la partita si ferma per il telefono, il conto aspetta e riprende da dove era (non riparte da 3).
// Non nella sfida tra due computer (l'altro computer aspetta la stessa partita), non con la webcam, il mouse o la
// tastiera, non nelle partite dimostrative.
// B59 (richiesta dell'utente del 16/11: «quando c'è la sessione di calibrazione con scambi di palla ci sia un countdown come
// quando parte il vero match, con una scritta centrale grossa dove al posto di "Si gioca" compaia "Allenati un po'" con
// quella transizione centrale. Poi le persone fanno scambi, si allenano, e poi comincia il match»): lo stesso conto, in
// versione «allenamento» (beginTrial), prima degli scambi di prova del B28 (natpf_trial.js): «Preparati» · «Prima qualche
// scambio di prova» · 3 · 2 · 1, poi al centro la scritta grande «Allenati un po'!» con la stessa transizione di «Si gioca»
// (stile style-start) e la voce «Go!»; i telefoni dicono «Allenamento tra 3…» e «Allenati un po'!». Poi gli scambi di prova
// e, dopo, la partita con il suo conto di sempre. Non con «Ricalibra» a partita in corso (si rigioca subito il punto).
// Funzioni pure in cima (test/natpf-b47-conto.test.mjs, test/natpf-b59-conto-prova.test.mjs), poi il controllore.
import { OPPONENT_REF } from './natpf_who.js';
const $ = id => (typeof document !== 'undefined' ? document.getElementById(id) : null);
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);

// B68: durata della scritta «Start» dopo il conto (prima 2,6 s con chi batte, 1,8 s senza): chi batte è già nel conto
export const START_AFTER_COUNT_MS = sub => (sub ? 2000 : 1300);
export const PREMATCH = Object.freeze({ ms: 3000, kicker: 'Preparati', title: 'La partita sta per cominciare' });
// B59: conto prima degli scambi di prova (stessa durata e stesso riquadro)
export const TRIAL_COUNT = Object.freeze({ kicker: 'Preparati', title: 'Prima qualche scambio di prova', go: "Allenati un po'!",
  line: 'Palle facili dal lanciapalle: colpiscile, il gioco impara il tuo colpo', lineSplit: 'Palleggiate tra voi: il gioco impara i vostri colpi' });
// testi del riquadro per il tipo di conto (funzione pura): 'match' (B47) o 'trial' (B59)
export function prematchTexts(kind = 'match', { split = false } = {}){
  if (kind === 'trial') return { kicker: TRIAL_COUNT.kicker, title: TRIAL_COUNT.title, line: split ? TRIAL_COUNT.lineSplit : TRIAL_COUNT.line };
  return { kicker: PREMATCH.kicker, title: PREMATCH.title, line: null };
}

// La partita che parte adesso ha il conto? (funzione pura) controller: racchetta del gioco; split: stesso schermo; webcam:
// webcam per due; versus: sfida tra due computer (chi invita o il Player 2); autoPlay: partita dimostrativa
export function prematchDue({ controller = '', split = false, webcam = false, versus = false, autoPlay = false } = {}){
  if (versus || autoPlay) return false;
  if (split) return !webcam;
  return controller === 'phone';
}
// secondi che restano da mostrare (3, 2, 1) dopo `elapsed` ms di conto; 0 = finito
export function prematchLeft(elapsed = 0, ms = PREMATCH.ms){
  const rem = ms - Math.max(0, +elapsed || 0);
  return rem <= 0 ? 0 : Math.ceil(rem/1000);
}
// riga sotto il numero: chi batte (funzione pura). names: { player, opponent } nello stesso schermo (null contro la CPU);
// fixed: battuta «Sempre lo stesso» (natpf_battuta.js)
// B68: drawn = chi batte è uscito dal sorteggio (stesso schermo): lo dice il conto, la scritta «Start» dopo non lo ripete
export function prematchServeLine({ names = null, server = 'player', fixed = false, drawn = false } = {}){
  const opp = server === 'opponent';
  if (names){
    const who = String((opp ? names.opponent : names.player) || (opp ? 'Player 2' : 'Player 1'));
    const what = fixed ? 'atte sempre' : 'atte per primo';
    return drawn ? `Sorteggio: b${what} ${who}` : `B${what} ${who}`;
  }
  // B72: «l'avversario» (prima «Batte sempre la CPU», «Batte per prima la CPU»)
  if (opp) return fixed ? `Batte sempre ${OPPONENT_REF.who}` : `Batte per primo ${OPPONENT_REF.who}`;
  return fixed ? 'Batti sempre tu: lancia la palla e colpisci' : 'Batti tu: lancia la palla e colpisci';
}

export class NatpfPrematch {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    this.active = false; this.elapsed = 0; this.left = 0; this._last = 0; this._timer = null; this._held = false; this.kind = 'match'; this.onDone = null;
    this.el = $('natpf-prematch');
    // (un clic sul riquadro non arriva al campo: niente colpi o lanci con il mouse durante il conto)
    this.el?.addEventListener?.('pointerdown', e => e.stopPropagation());
  }
  get isOpen(){ return this.active; }
  // la partita che parte adesso lo vuole? (game_engine.startNewMatch lo chiede prima di preparare il primo servizio)
  due(){
    const E = this.engine, ui = this.ui, L = ui.lobby;
    return prematchDue({ controller: ui.controller, split: !!E.natpfSplit?.active, webcam: !!ui.split?.webcam,
      versus: E.playerRole === 'p2' || L?.mode === 'friend' || !!ui.versus?.hostActive, autoPlay: !!E.autoPlayMode });
  }
  // telefoni che giocano questa partita (per l'annuncio sul telefono)
  _phones(){ const E = this.engine; return E.natpfSplit?.active ? [this.ui.phone, E.natpfPhone2] : [this.ui.phone]; }
  _announce(m){ const extra = this.kind === 'trial' ? { trial: 1 } : {}; for (const p of this._phones()) if (p?.connected) p.link?.send?.({ t: 'ev', k: 'count', ...m, ...extra }); }
  // altre cose che fermano la partita (pausa, fogli dello staff, telefono caduto, guida, pannello del telefono): il conto
  // aspetta senza ripartire da capo
  _blocked(){
    const ui = this.ui, E = this.engine;
    return !!(ui.pause?.isOpen || ui.staffOpen?.() || ui.phoneHold || ui.webcamHold || ui.split?.hold || ui.onboarding?.isOpen || E.natpfVersusWait || (ui.modal && !ui.modal.classList.contains('hidden')));
  }
  // parte il conto (la partita è già pronta al primo servizio, ferma finché il conto è in vista)
  begin({ kind = 'match', onDone = null } = {}){
    this._stop();
    const E = this.engine;
    this.kind = kind === 'trial' ? 'trial' : 'match'; this.onDone = typeof onDone === 'function' ? onDone : null;
    this.active = true; this.elapsed = 0; this.left = 0; this._held = false; this._last = performance.now();
    // (inquadratura del servizio subito: con la partita ferma la telecamera non si muove da sola)
    try { if (E.player && E.ball) E._snapCameraImmediate?.(); E.natpfBackdropDirty = true; } catch {}
    this._paint();
    this._timer = setInterval(() => this.tick(), 100);
    this.ui.diag?.recorder?.log?.(this.kind === 'trial' ? 'prova.conto' : 'partita.conto', { stato: 'partito' });
    this.ui._syncPause?.();
    this.tick();
    return true;
  }
  tick(now = performance.now()){
    if (!this.active) return;
    const dt = Math.max(0, now - this._last); this._last = now;
    const held = this._blocked();
    if (held !== this._held){
      this._held = held;
      if (held) this._announce({ stop: 1, soft: 1, txt: 'Partita ferma sul computer: il conto riprende dopo.' });
      else this.left = 0;            // (si riannuncia il numero di adesso)
      this._paint();
    }
    if (held) return;
    this.elapsed += dt;
    const left = prematchLeft(this.elapsed);
    if (left <= 0){ this._end(true); return; }
    if (left !== this.left){ this.left = left; this._announce({ n: left }); this._paint(); }
  }
  // B59: conto prima degli scambi di prova; onDone: gli scambi partono (natpf_trial.js)
  beginTrial({ onDone = null } = {}){ return this.begin({ kind: 'trial', onDone }); }
  // fine del conto: run = si gioca (scritta e voce «Start» di sempre); senza run (menu, chiosco) si chiude e basta
  // B59: per il conto degli scambi di prova la scritta grande è «Allenati un po'!» (stessa transizione) e partono gli scambi
  _end(run){
    this._stop();
    const kind = this.kind, done = this.onDone;
    this.active = false; this.left = 0; this.onDone = null;
    this._paint();
    this.ui._syncPause?.();
    if (!run) return;
    this._announce({ n: 0 });
    this.kind = 'match';
    if (kind === 'trial'){
      this.ui.diag?.recorder?.log?.('prova.conto', { stato: 'allenati' });
      const E = this.engine;
      try { E.audioEngine?.cue?.('go'); E.hud?.showCenterBanner?.(TRIAL_COUNT.go, { style: 'style-start', durationMs: 1800, persistent: false }); } catch (e){ console.error(e); }
      try { done?.(); } catch (e){ console.error(e); }
      return;
    }
    this.ui.diag?.recorder?.log?.('partita.conto', { stato: 'si gioca' });
    try { this.engine.natpfStartCall?.(); } catch (e){ console.error(e); }
  }
  _stop(){ if (this._timer != null){ clearInterval(this._timer); this._timer = null; } }
  // ritorno al menu, chiosco, partita chiusa: il conto sparisce senza far partire niente
  cancel(){ if (this.active){ this._end(false); this.kind = 'match'; } }
  // B59: gli scambi di prova si chiudono (o si saltano) durante il loro conto: il conto sparisce senza scritta
  cancelTrial(){ if (this.active && this.kind === 'trial') this.cancel(); }
  _paint(){
    const el = this.el; if (!el) return;
    const on = this.active && !this._held;
    show(el, on);
    if (!on) return;
    const set = (sel, t) => { const n = el.querySelector?.(sel); if (n && n.textContent !== t) n.textContent = t; return n; };
    const E = this.engine, split = !!E.natpfSplit?.active, nm = E.natpfSplitNames || {}, T = prematchTexts(this.kind, { split });
    if (el.dataset && el.dataset.kind !== this.kind) el.dataset.kind = this.kind;
    set('[data-prematch="kicker"]', T.kicker);
    set('[data-prematch="title"]', T.title);
    set('[data-prematch="serve"]', T.line || prematchServeLine({ names: split ? { player: nm.p1, opponent: nm.p2 } : null, server: E.score?.server, fixed: !!E.score?.fixed, drawn: !!E.natpfStartDrawn }));
    const num = el.querySelector?.('[data-prematch="num"]'), n = String(this.left || prematchLeft(this.elapsed));
    // ogni secondo il numero «batte» (classe tick rimessa da capo), come il conto dello stesso schermo
    if (num && num.textContent !== n){ num.textContent = n; num.classList?.remove?.('tick'); void num.offsetWidth; num.classList?.add?.('tick'); }
  }
}
