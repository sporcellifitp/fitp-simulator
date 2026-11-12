// Scambi di prova (B28, 12/11/2026): la calibrazione si fa giocando. Richiesta dell'utente allo stand: «si parte con qualche
// scambio, il software deve capire bene destra e sinistra, velocità ed i parametri necessari, e poi dopo circa 10-15 secondi
// di scambi, parte il match vero».
//
// Con l'opzione dello stand «Calibrazione: Giocando» (di base, natpf_trial_learn.js) e il telefono come racchetta, «Gioca»
// non fa partire subito la partita: prima circa dieci secondi di palle facili di cui il gioco conosce il lato, alternate sul
// dritto e sul rovescio; il telefono riparte dal profilo semplice (chi gioca non eredita niente da chi c'era prima) e da
// ogni colpo il gioco impara verso, forza, salita e centro della mira (NatpfPhoneRacket.beginTrial / trialBall / endTrial).
// Poi «Si comincia!» e la partita vera parte da 0-0 con le sue regole (sorteggio, formato in fiera…): il «Gioca» di prima,
// senza altri tocchi né sul computer né sul telefono.
// B35 (collaudo dell'utente del 13/11: «le impostazioni del match non ho avuto modo di inserirle prima perché appena fatti
// gli scambi di calibrazione è partita subito la partita»): contro la CPU gli scambi di prova si fanno PRIMA della pagina
// «Pronto per la partita» (dopo «Collega» e il tutorial corto, o dopo «Gioca ancora»), come già per chi invita nella sfida
// tra due computer: alla fine «Pronto per la partita» e la pagina con «Chi gioca», «Personaggi» e «Altre impostazioni»;
// la partita parte solo con «Gioca» (natpf_lobby._pageTrial, opzione toPage qui). Nello stesso schermo resta com'era (dopo
// il conto alla rovescia, poi la partita), e «Ricalibra» a partita in corso rifà gli scambi e rigioca il punto.
//   - Contro la CPU, minigiochi, sfida tra due computer: chi gioca qui e il lanciapalle (l'avversario non si vede).
//   - Stesso schermo, due telefoni: un palleggio assistito con una palla sola. Ogni colpo (di chiunque, comunque tirato) è
//     rimandato dal gioco sul lato giusto dell'altro, facile; una palla persa riparte per l'altro. Tutti e due imparano
//     insieme, ognuno nella sua metà.
// Fine (trialDone): TRIAL.perSide colpi imparati per lato (per tutti e due nello stesso schermo), oppure TRIAL.maxBalls palle
// a testa, oppure TRIAL.maxS secondi dalla prima palla. Chi non colpisce mai non resta fermo: allo scadere la partita parte
// con il profilo semplice e il gioco impara dai primi colpi veri, come con «Salta».
// I colpi di prova non contano: nessun punto (il punto del motore diventa «palla finita»), nessuna scritta dell'esito, niente
// statistiche né minigiochi, e nella diagnostica sono marcati come allenamento (colpo.prova, allenamento: true), fuori dal
// «lato delle palle».
import * as THREE from 'three';
import { TRIAL, trialSide, trialDone, readCalMode } from './natpf_trial_learn.js';

const $ = id => (typeof document !== 'undefined' ? document.getElementById(id) : null);
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// posizione di partenza di chi gioca (m dalla rete), palla: di lato quanto basta per un colpo comodo, profondità e volo
// (rally: volo nello stesso schermo, un poco più svelto: ognuno dei due aspetta la palla dell'altro, e in 14 s devono
// arrivare quattro palle a testa)
export const TRIAL_FEED = Object.freeze({ z: 11.4, side: 1.3, jitter: .5, depth: 8.6, depthJitter: 1, flight: 1.15, rally: 1, spin: 10, pass: 1.4 });

// profilo fatto con i gesti (non semplice e non imparato dagli scambi di prova): chi l'ha chiesto apposta lo tiene
export const gestureProfile = p => !!p?.profile && !p.profile.simple && !p.profile.trial;
// … e vale per chi gioca adesso (NatpfPhoneRacket.keepsGesture: con «Giocando» solo se la calibrazione con i gesti è
// stata fatta apposta dopo l'ultima partita, per la partita che segue; un oggetto senza quel campo: basta il profilo)
export const keepsGesture = p => (p && 'keepsGesture' in p ? !!p.keepsGesture : gestureProfile(p));
// Gli scambi di prova si fanno adesso? (funzione pura) mode: opzione dello stand; phones: i telefoni di chi gioca (uno, o
// due nello stesso schermo); webcamDuo: stesso schermo con una webcam per due (niente telefoni: niente scambi di prova)
export function trialDue({ mode = readCalMode(), controller = 'phone', split = false, webcamDuo = false, phones = [] } = {}){
  if (mode !== 'play') return false;
  // (pronto, o lo sarà tra un attimo: il profilo semplice è già stato chiesto, NatpfPhoneRacket.soonReady)
  const ok = p => !!(p?.soonReady ?? p?.ready);
  if (split) return !webcamDuo && phones.length === 2 && phones.every(ok) && phones.some(p => !keepsGesture(p));
  return controller === 'phone' && ok(phones[0]) && !keepsGesture(phones[0]);
}
// testi della scritta grande (funzioni pure)
export const TRIAL_TEXT = Object.freeze({ kicker: 'Scambi di prova', title: 'Colpisci la palla', sub: 'Il gioco impara il tuo colpo · poi si comincia da 0-0', go: 'Si comincia!',
  // B35: scambi di prova prima della pagina «Pronto per la partita» (contro la CPU, chi invita nella sfida tra due computer)
  subPage: 'Il gioco impara il tuo colpo · poi scegli la partita', goPage: 'Pronto per la partita' });
// B35: riga della pagina «Pronto per la partita» appena finiti gli scambi di prova (levels: livelli imparati)
export function trialPageNote(levels = []){ return `${trialOutro(levels)} · scegli la partita e premi «Gioca»`; }
// (levels: 'full' | 'ok' | 'partial' | 'none' di chi ha imparato, 'gesti' di chi ha tenuto la calibrazione con i gesti:
// per lui non c'è niente da imparare e conta come fatto. B28.1: prima con uno dei due calibrato con i gesti la scritta
// diceva «Il gioco impara dai tuoi primi colpi» anche se l'altro aveva imparato tutto)
export function trialOutro(levels = []){
  const learners = levels.filter(l => l !== 'gesti');
  if (levels.length > 0 && !learners.length) return 'Calibrazione con i gesti ✓';
  const good = learners.length > 0 && learners.every(l => l === 'full' || l === 'ok');
  return good ? 'Colpo imparato ✓' : 'Il gioco impara dai tuoi primi colpi';
}
// colpi per lato da mostrare alla fine per un giocatore (r: esito di NatpfPhoneRacket.endTrial): chi ha tenuto i gesti ha
// i puntini pieni, come durante gli scambi di prova
export const outroCounts = r => (r?.keep || r?.level === 'gesti' ? { forehand: TRIAL.perSide, backhand: TRIAL.perSide } : r?.n || null);
// puntini dell'avanzamento di un giocatore: TRIAL.perSide per lato; pieni quelli imparati
export function trialDots(counts = null){
  const f = Math.min(TRIAL.perSide, counts?.forehand || 0), b = Math.min(TRIAL.perSide, counts?.backhand || 0);
  return [...Array.from({ length: TRIAL.perSide }, (_, i) => (i < f ? 'on' : '')), ...Array.from({ length: TRIAL.perSide }, (_, i) => (i < b ? 'on' : ''))];
}

export class NatpfTrial {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui; this.S = null;
    this.el = $('natpf-trial');
    this.el?.addEventListener?.('pointerdown', e => e.stopPropagation());
    $('trial-skip')?.addEventListener?.('click', e => { e.stopPropagation(); this.skip(); });
    this._nextBound = new WeakSet();
    // durante gli scambi di prova i punti non contano: il motore chiede un punto, qui la palla è solo finita
    const award = engine._awardPoint.bind(engine);
    engine._awardPoint = (winner, why = '') => (this.S ? this._ballOver() : award(winner, why));
  }
  get active(){ return !!this.S; }
  // telefoni di chi gioca: p1, e p2 nello stesso schermo
  _phone(id){ return id === 'p2' ? this.engine.natpfPhone2 : this.ui.phone; }
  _actor(id){ return id === 'p2' ? this.engine.opponent : this.engine.player; }
  _mine(id){ return id === 'p2' ? 'opponent' : 'player'; }
  _name(id){ return this.S?.split ? this.ui.split?.name?.(id) || (id === 'p2' ? 'Player 2' : 'Player 1') : ''; }
  // «Salta ›» anche dal telefono (pagine dal B28): la partita parte subito con quello che il gioco ha imparato
  _bindNext(phone){ if (phone?.onNext && !this._nextBound.has(phone)){ this._nextBound.add(phone); phone.onNext(() => { if (this.S) this.skip(); }); } }
  // Si fanno? (opzione dello stand, racchetta, telefoni pronti)
  due({ split = !!this.engine.natpfSplit?.active } = {}){
    return trialDue({ controller: this.ui.controller, split, webcamDuo: !!this.ui.split?.webcam, phones: split ? [this._phone('p1'), this._phone('p2')] : [this._phone('p1')] });
  }
  // then: cosa fare alla fine (far partire la partita, il minigioco…); split: stesso schermo (la sessione è già aperta)
  // resume: a partita in corso («Ricalibra»): il punteggio resta com'è; force: anche chi ha un profilo fatto con i gesti
  // reimpara dagli scambi di prova (l'ha chiesto apposta)
  // cancel: cosa fare se si chiudono prima della fine (menu, chiosco): chi li ha aperti rimette a posto il suo stato
  // toPage (B35): alla fine si torna alla pagina «Pronto per la partita» (non parte la partita): cambiano solo le scritte
  start({ then = null, cancel = null, split = !!this.engine.natpfSplit?.active, resume = false, force = false, toPage = false } = {}){
    if (this.S) return false;
    const E = this.engine, ids = split ? ['p1', 'p2'] : ['p1'];
    this.S = { split, then, cancel, resume, toPage: !!toPage, phase: 'intro', wait: TRIAL.intro, t: 0, started: false, turn: 'p1', receiver: null, dead: false, flash: null,
      players: Object.fromEntries(ids.map(id => [id, { balls: 0, hits: 0 }])),
      prev: { difficulty: E.hud?.selectedDifficulty || E.matchConfig?.difficulty, format: E.matchFormat?.id || null, multi: !!E.isMultiplayer } };
    // come il riscaldamento: niente menu, niente dimostrazione, punteggio a zero
    if (!split){ E._applyDifficultyTuning?.('casual'); E.isMultiplayer = false; E.setMatchFormat?.('singles'); }
    E.hud?.hideTitleModal?.(); E.hud?.hideCenterBanner?.(); E.hud?.hideVictoryModal?.();
    E.autoPlayMode = false; E.userHasInteracted = true; E.persistentStateLock = false;
    if (E.score && !resume) Object.assign(E.score, { playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0, server: 'player', deuceSide: true });
    E._syncScoreboardHUD?.();
    this._stage(true);
    this._idle();
    for (const id of ids){ const a = this._actor(id), z = id === 'p2' ? -TRIAL_FEED.z : TRIAL_FEED.z; if (a?.pos){ a.pos.set(0, 0, z); a.targetPos?.copy?.(a.pos); a.vel?.set?.(0, 0, 0); } this._phone(id)?.beginTrial?.(force ? { keep: false } : {}); this._bindNext(this._phone(id)); this._phone(id)?.offerNext?.('Salta ›'); }
    this.ui.diag?.recorder?.log?.('prova.inizio', { stessoSchermo: split });
    this.paint(); this.ui._syncPause?.();
    return true;
  }
  // campo degli scambi di prova: contro la CPU l'avversario non si vede e c'è il lanciapalle; il tabellone è nascosto
  _stage(on){
    const E = this.engine, split = !!this.S?.split;
    if (!split){
      const o = E.opponent;
      if (o?.root) o.root.visible = !on;
      if (o?.shadowBlob) o.shadowBlob.visible = !on;
      this.ui.machine?.show?.(on);
    }
    if (typeof document !== 'undefined'){ document.body.classList.toggle('natpf-training', on); document.body.classList.toggle('natpf-trial-on', on); }
    show(this.el, on);
  }
  _idle(){
    const E = this.engine;
    E.phase = 'POINT_OVER'; E.phaseTimer = 0; E.ball.inPlay = false; E.cameraMode = 'RALLY_CAM'; E.natpfTimeScale = 1;
    E.ball.pos.set(0, -5, 0); E.ball.vel.set(0, 0, 0); E.ballTrail?.clear?.();
    E.pendingUserSwing = E.pendingP2Swing = E.pendingServeSwing = null;
  }
  // il motore ha chiuso il «punto» (palla fuori, due rimbalzi, non presa): la palla è finita, nessun punto
  _ballOver(){
    const E = this.engine;
    E.phase = 'POINT_OVER'; E.phaseTimer = 0; E.ball.inPlay = false; E.natpfTimeScale = 1;
    E.pendingUserSwing = E.pendingP2Swing = E.pendingServeSwing = null;
    if (this.S) this.S.dead = true;
  }
  counts(id){ return this._phone(id)?.trialCounts?.() || { forehand: 0, backhand: 0, total: 0 }; }
  _done(id){ return trialDone({ balls: this.S.players[id].balls, counts: this.counts(id), t: this.S.t }); }
  _allDone(){ return Object.keys(this.S.players).every(id => !!this._done(id)); }
  // Palla verso il giocatore id, sul lato side del suo colpo. Contro la CPU esce dal lanciapalle; nello stesso schermo
  // parte dal punto in cui è la palla (rimando assistito del colpo dell'altro) o, se non c'è, dal fondo dell'altro
  _send(id, { from = null } = {}){
    const E = this.engine, S = this.S, P = S.players[id], me = this._actor(id), phone = this._phone(id);
    const side = trialSide(P.balls, this.counts(id)), lefty = phone?.hand === 'left', sgn = id === 'p2' ? -1 : 1;
    // chi gioca da z > 0 guarda verso −z: la sua destra è +x; il Player 2 è allo specchio
    const right = (side === 'forehand') !== lefty;
    const x = clamp(me.pos.x + sgn*(right ? 1 : -1)*TRIAL_FEED.side + (Math.random() - .5)*TRIAL_FEED.jitter, -3.3, 3.3);
    const target = new THREE.Vector3(x, 0, sgn*(TRIAL_FEED.depth + Math.random()*TRIAL_FEED.depthJitter));
    let start = from ? from.clone() : null;
    if (!start && !S.split && this.ui.machine?.fire) start = this.ui.machine.fire(target, {});
    if (!start) start = new THREE.Vector3((Math.random() - .5)*1.5, 1.05, -sgn*11.6);
    if (!from){ E.ballTrail?.clear?.(); E.swingVfx?.clearAllTrails?.(); }
    E.ball.pos.copy(start);
    E._launchBallToTarget(start, target, S.split ? TRIAL_FEED.rally : TRIAL_FEED.flight, { topspin: TRIAL_FEED.spin, sidespin: 0, allowNetFault: false });
    Object.assign(E.ball, { inPlay: true, lastHitter: id === 'p2' ? 'player' : 'opponent', bounceCountOnCurrentSide: 0, rallyStrokeCount: 1, natpfFeed: true, shotType: 'TOPSPIN', isPowerShot: false, natpfNetFault: false });
    E.pendingUserSwing = E.pendingP2Swing = null;
    E.phase = 'RALLY'; E.phaseTimer = 0; E.cameraMode = 'RALLY_CAM';
    // come in partita: piano d'intercetto sulla traiettoria vera (finestra d'impatto e movimento, natpf_impact.js)
    if (id === 'p2') E._natpfPlanOpponent?.(E.opponent); else if (E._natpfPlanPlayer) E._natpfPlanPlayer(); else E._predictBallIntercept?.(me);
    phone?.trialBall?.(right ? 1 : -1);
    S.receiver = id; S.dead = false; S.phase = 'ball'; S.started = true; S.side = side;
    this.ui.diag?.recorder?.log?.('prova.palla', { chi: id, lato: side, numero: P.balls + 1 });
  }
  _other(id){ return this.S.split ? (id === 'p1' ? 'p2' : 'p1') : 'p1'; }
  // la palla è passata oltre chi doveva colpirla (di TRIAL_FEED.pass m): persa, senza aspettare i due rimbalzi
  _passed(id){
    const b = this.engine.ball, me = this._actor(id);
    return !!b?.inPlay && (id === 'p2' ? b.pos.z < me.pos.z - TRIAL_FEED.pass : b.pos.z > me.pos.z + TRIAL_FEED.pass);
  }
  tick(dt){
    const S = this.S; if (!S) return;
    const E = this.engine;
    if (!S.split){
      // il lanciapalle non corre e non risponde: l'avversario resta fuori dal campo
      const o = E.opponent; if (o?.pos){ o.pos.set(0, 0, -40); o.targetPos?.copy?.(o.pos); }
      this.ui.machine?.tick?.(dt);
    }
    if (E.phase === 'POINT_OVER') E.phaseTimer = 0;                 // niente servizio preparato dal motore
    if (S.started) S.t += dt;
    if (S.phase === 'outro'){ S.wait -= dt; if (S.wait <= 0) this._finish(); this.paint(); return; }
    // tetto di tempo e di palle: si chiude appena la palla in gioco è finita (o subito, se nessuno la sta per colpire)
    if (S.phase === 'ball'){
      const id = S.receiver, hit = E.ball.lastHitter === this._mine(id) && !S.dead;
      if (hit) this._onHit(id);
      else if (S.dead || this._passed(id)) this._onMiss(id);
    } else {
      S.wait -= dt;
      // (la prima palla aspetta che i telefoni abbiano il profilo da capo: con la rete lenta arriva un attimo dopo)
      const waiting = !S.started && Object.keys(S.players).some(id => this._phone(id)?.resetting);
      if (S.wait <= 0 && !waiting){ if (this._allDone()) this._outro(); else this._send(S.turn, {}); }
    }
    if (S.phase !== 'outro' && S.t >= TRIAL.maxS + 2) this._outro();   // sicurezza: mai fermi
    this.paint();
  }
  _onHit(id){
    const S = this.S, E = this.engine, P = S.players[id];
    P.balls++; P.hits++; this._phone(id)?.trialIdle?.();
    S.flash = { id, text: 'Colpo letto ✓', until: performance.now() + 900 };
    this._recenter(id);
    if (this._allDone()){ S.phase = 'gap'; S.wait = S.split ? .35 : .5; S.turn = id; return; }
    if (S.split){
      // rimando assistito: il colpo va comunque sul lato giusto dell'altro (chi ha già finito continua a palleggiare)
      const to = this._other(id);
      this._send(to, { from: E.ball.pos });
      return;
    }
    S.phase = 'gap'; S.wait = TRIAL.gap; S.turn = 'p1';
  }
  _onMiss(id){
    const S = this.S, P = S.players[id];
    P.balls++; this._phone(id)?.trialIdle?.();
    this._idle(); this._recenter(id);
    S.phase = 'gap'; S.wait = TRIAL.miss; S.turn = this._other(id);
  }
  // contro la CPU chi gioca torna verso il centro tra una palla e l'altra (dopo una palla rincorsa resterebbe di lato)
  _recenter(id){ const a = this._actor(id); if (!this.S.split && a?.targetPos?.set) a.targetPos.set(0, 0, TRIAL_FEED.z); }
  // «Salta ›» (computer) o «Avanti» dal telefono: la partita parte subito con quello che si è imparato
  skip(){ if (this.S && this.S.phase !== 'outro'){ this.ui.diag?.recorder?.log?.('prova.salta', {}); this._outro({ quick: true }); } }
  _outro({ quick = false } = {}){
    const S = this.S, E = this.engine;
    this._idle();
    // fine dell'apprendimento: il profilo imparato vale da qui (anche per la scritta dell'esito)
    S.result = Object.fromEntries(Object.keys(S.players).map(id => [id, this._phone(id)?.endTrial?.() || null]));
    const levels = Object.values(S.result).map(r => r?.level || 'none');
    S.phase = 'outro'; S.wait = quick ? .35 : TRIAL.outro; S.outro = trialOutro(levels);
    this.ui.diag?.recorder?.log?.('prova.fine', { secondi: +S.t.toFixed(1), ...Object.fromEntries(Object.entries(S.result).map(([id, r]) => [id, r ? { livello: r.level, dritti: r.n.forehand, rovesci: r.n.backhand, verso: r.sign, riferimento: r.ref, palle: S.players[id].balls } : null])) });
    E.audioEngine?.playUiConfirm?.();
  }
  // chiude gli scambi di prova e rimette il campo com'era; run: la partita (o quello che segue) parte
  _close(run){
    const S = this.S; if (!S) return;
    const E = this.engine;
    // (chiusi prima della fine: il telefono tiene quello che ha imparato fin lì)
    for (const id of Object.keys(S.players)){ if (this._phone(id)?.trialOn) this._phone(id).endTrial(); this._phone(id)?.offerNext?.(null); }
    this._stage(false);
    this.S = null;
    if (!S.split){
      const o = E.opponent; if (o?.pos){ o.pos.set(-1.35, 0, -11.89); o.targetPos?.copy?.(o.pos); }
      E._applyDifficultyTuning?.(S.prev.difficulty || 'casual'); E.isMultiplayer = S.prev.multi;
      if (S.prev.format) E.setMatchFormat?.(S.prev.format);
    }
    E.natpfTimeScale = 1; this.paint(); this.ui._syncPause?.();
    if (run) try { S.then?.(S.result || null); } catch (e){ console.error(e); }
  }
  _finish(){ this._close(true); }
  // ritorno al menu, chiosco: niente partita
  // (cancel: la sfida tra due computer rimette il ruolo del Player 2, come faceva la calibrazione con i gesti interrotta)
  abort(){ const S = this.S; if (S){ this._idle(); this._close(false); try { S.cancel?.(); } catch (e){ console.error(e); } } }
  paint(){
    const el = this.el, S = this.S; if (!el) return;
    if (!S){ show(el, false); return; }
    const $q = sel => el.querySelector?.(sel), set = (sel, t) => { const n = $q(sel); if (n && n.textContent !== t) n.textContent = t; };
    const outro = S.phase === 'outro', state = outro ? 'go' : S.started ? 'play' : 'intro';
    if (el.dataset.state !== state) el.dataset.state = state;
    if (el.dataset.split !== String(!!S.split)) el.dataset.split = String(!!S.split);
    set('[data-trial="kicker"]', TRIAL_TEXT.kicker);
    set('[data-trial="title"]', outro ? (S.toPage ? TRIAL_TEXT.goPage : TRIAL_TEXT.go) : TRIAL_TEXT.title);
    const now = performance.now(), flash = S.flash && now < S.flash.until && !outro ? S.flash : null;
    set('[data-trial="sub"]', outro ? S.outro || '' : flash && !S.split ? flash.text : S.toPage ? TRIAL_TEXT.subPage : TRIAL_TEXT.sub);
    // avanzamento: per ogni giocatore due puntini per il dritto e due per il rovescio (pieni quelli imparati)
    const rows = $q('[data-trial="rows"]');
    if (rows){
      const ids = Object.keys(S.players);
      const data = ids.map(id => { const c = outro && S.result?.[id] ? outroCounts(S.result[id]) : this.counts(id); return { id, name: this._name(id), dots: trialDots(c) }; });
      const key = data.map(d => `${d.id}:${d.name}:${d.dots.join('')}`).join('|');
      if (rows.dataset.key !== key){
        rows.dataset.key = key;
        const dots = (d, k, label) => `<span class="trial-side"><em>${label}</em>${d.dots.slice(k, k + TRIAL.perSide).map(x => `<i class="${x}"></i>`).join('')}</span>`;
        rows.innerHTML = data.map(d => `<div class="trial-row" data-trial-player="${d.id}">${d.name ? `<b>${String(d.name).replace(/[&<>"]/g, '')}</b>` : ''}${dots(d, 0, 'Dritto')}${dots(d, TRIAL.perSide, 'Rovescio')}</div>`).join('');
      }
    }
    show($q('#trial-skip') || $('trial-skip'), !outro);
  }
}
