// Riscaldamento in campo: calibrazione del telefono e allenamento sono la stessa cosa. Si gioca sul campo d'allenamento
// (la stessa arena a porte chiuse, natpf_arena.setPractice). In campo c'è solo il giocatore, dall'altra parte un
// lanciapalle (l'avversario non si vede e non risponde). Si guarda il computer: le istruzioni stanno in basso al centro,
// sotto il giocatore, grandi; il telefono è il controller e ripete la stessa cosa in piccolo. Con lo smartphone:
//   1 «fermo»: telefono fermo in verticale per un attimo, anche con il tremolio della mano (il telefono misura come lo
//     si tiene);
//   2 due gesti, un dritto e un rovescio: il giocatore resta fermo al centro della riga di fondo e la palla
//     aspetta, ferma all'altezza della racchetta, dal lato del gesto chiesto; al gesto riconosciuto il giocatore la
//     colpisce. Il computer mostra sempre il passo in cui si trova il telefono (natpf_cal_view.js), mai un suo percorso;
//   3 la calibrazione si conferma da sola; poi palle vere: dritto, rovescio, pallonetto, palla corta, servizio e angoli
//     (qui il giocatore corre da solo verso la palla, come in partita: si pensa solo al colpo).
// Con webcam e mouse si parte dal punto 3. «Salta» chiude in qualsiasi momento: con il telefono non ancora calibrato si
// gioca in modalità semplice, con il gioco completo (verso, tipo di colpo e forza dal gesto: mancano solo il colpo
// tipico e il piatto abituale, che il gioco impara dai colpi). Non conta per il punteggio.
import * as THREE from 'three';
import { calSide, calPrompt, CAL_VIEW_EMPTY } from './natpf_cal_view.js';
import { gripSvg, GRIP } from '@natpf/tennis/grip-art.js';
import { getGestureDemo } from './natpf_gesture_demo.js';
import { GESTURES } from './natpf_gesture_motion.js';
import { PHOTOS, lessonPhotos } from './natpf_media.js';
import { NatpfTutorial } from './natpf_tutorial.js';
export { calSide };

// Esercizi del tutorial, in ordine progressivo: i colpi di base, il servizio, la direzione, la rete, il tocco, la
// potenza. demo: animazione 3D del gesto (natpf_gesture_motion.GESTURES, verificata con il rilevatore vero).
export const DRILLS = Object.freeze([
  { id: 'forehand', label: 'Dritto', need: 2, cue: 'forehand', demo: 'forehand', hint: { phone: 'Ruota attorno a te in orizzontale, dall’esterno verso il corpo, quando la palla arriva alla racchetta', webcam: 'Swing quando la palla arriva alla racchetta', mouse: 'Spazio quando la palla arriva' } },
  { id: 'backhand', label: 'Rovescio', need: 2, cue: 'backhand', demo: 'backhand', hint: { phone: 'Palla sull’altro lato: stessa rotazione orizzontale, nel verso opposto', webcam: 'Swing verso l’altro lato', mouse: 'Spazio o trascina verso l’altro lato' } },
  { id: 'serve', label: 'Servizio', need: 1, demo: 'serve', hint: { phone: 'Alza il telefono per lanciare la palla, poi colpisci dall’alto quando è in cima', webcam: 'Alza la mano per lanciare, poi swing in alto', mouse: '↑ o W per lanciare, poi Spazio' } },
  { id: 'cross', label: 'Incrociato', need: 1, direction: 'cross', feed: 'forehand', demo: 'cross', hint: { phone: 'Gira il display verso il centro e colpisci un attimo prima del solito: la palla va oltre il centro', webcam: 'Colpisci prima: manda la palla nell’altra metà del campo', mouse: 'Mira nell’altra metà del campo, oltre il centro' } },
  { id: 'line', label: 'Lungolinea', need: 1, direction: 'line', feed: 'forehand', demo: 'line', hint: { phone: 'Gira il display verso l’esterno e colpisci un attimo dopo il solito: la palla corre lungo il tuo lato', webcam: 'Colpisci un attimo dopo: manda la palla lungo il tuo lato', mouse: 'Mira lungo il lato da cui colpisci' } },
  // volée: il giocatore aspetta a rete, la palla si prende al volo (il motore lo decide dalla posizione, natpf_impact)
  { id: 'volley', label: 'Volée', need: 1, volley: true, feed: 'forehand', demo: 'volley', maxTries: 4, hint: { phone: 'Sei a rete: gesto corto e compatto, palla al volo prima del rimbalzo', webcam: 'Sei a rete: swing corto, palla al volo', mouse: 'Sei a rete: Spazio prima che la palla rimbalzi' } },
  // colpi speciali (solo smartphone): il gioco impara il TUO pallonetto e la TUA palla corta (soglie personali,
  // natpf_gestures.learnSpecials). Si passa avanti anche senza riuscirci, dopo 4 tentativi.
  { id: 'lob', label: 'Pallonetto', need: 1, shot: 'lob', phoneOnly: true, maxTries: 4, demo: 'lob', hint: { phone: 'Gesto in verticale dal basso verso l’alto: la mano sale davvero' } },
  { id: 'drop', label: 'Palla corta', need: 1, shot: 'drop', phoneOnly: true, maxTries: 4, demo: 'drop', hint: { phone: 'Dall’alto verso il basso, lento e morbido, come una carezza' } },
  { id: 'slice', label: 'Tagliato', need: 1, shot: 'slice', phoneOnly: true, learn: false, maxTries: 4, demo: 'slice', hint: { phone: 'Dall’alto verso il basso, deciso: più ampio e veloce della palla corta' } },
  { id: 'smash', label: 'Schiacciata', need: 1, shot: 'smash', phoneOnly: true, learn: false, maxTries: 4, demo: 'smash', hint: { phone: 'Arriva una palla alta: braccio in alto, poi giù deciso prima del rimbalzo' } },
  { id: 'flat', label: 'Colpo piatto', need: 1, shot: 'flat', phoneOnly: true, learn: false, maxTries: 4, feed: 'forehand', demo: 'flat', hint: { phone: 'Come il dritto ma più veloce, in orizzontale, senza alzare la mano' } },
]);
// Riscaldamento prima della partita: solo i colpi di base (il tutorial completo è «Allenamento» nel menu)
export const WARMUP_IDS = Object.freeze(['forehand', 'backhand', 'serve']);
export const warmupDrills = controller => drillsFor(controller).filter(d => WARMUP_IDS.includes(d.id));
// Lezione prima degli esercizi: presa, orientamento e mano, posizione di partenza (con l'animazione 3D)
export const LESSON = Object.freeze([
  { id: 'grip', demo: 'grip', title: GRIP.name, text: GRIP.ui.lessonGrip },
  { id: 'hand', demo: 'ready', title: 'Orientamento e mano', text: GRIP.ui.lessonHand, hand: true },
  { id: 'ready', demo: 'ready', title: 'Posizione di partenza', text: 'In piedi a 1,5–2 m dallo schermo, al centro. Braccio rilassato davanti a te. Calibrazione e partita si fanno con questa stessa presa.' },
]);
export const WEBCAM_LESSON = Object.freeze([
  { id: 'ready', title: 'Posizione di partenza', text: 'In piedi tra 1 e 4 m dalla webcam, al centro dell’inquadratura. La mano che colpisce deve restare sempre visibile: vicino alla webcam fai swing più corti.' },
]);
const SHOT_NAME = Object.freeze({ topspin: 'Topspin', flat: 'Piatto', lob: 'Pallonetto', drop: 'Palla corta', slice: 'Tagliato', smash: 'Schiacciata' });
const SIDE_NAME = Object.freeze({ forehand: 'Dritto', backhand: 'Rovescio' });
// Feedback immediato sul gesto appena riconosciuto dal telefono (prima dell'esito della palla): cosa ha letto il gioco,
// se è il gesto chiesto dall'esercizio e, se no, che cosa cambiare. Funzione pura: natpf è ev.natpf del telefono.
export function liveFeedback(drill, natpf, { side = null, hand = 'right' } = {}){
  if (!drill || !natpf) return null;
  const shot = natpf.shot, normal = shot === 'topspin' || shot === 'flat';
  const sideName = SIDE_NAME[side] || null, shotName = SHOT_NAME[shot] || 'Colpo';
  const recognized = normal && sideName ? `${sideName} ${shot === 'flat' ? 'piatto' : 'in topspin'}` : sideName && shot !== 'smash' ? `${shotName} di ${sideName.toLowerCase()}` : shotName;
  const power = Number.isFinite(natpf.power) ? Math.max(0, Math.min(1, natpf.power)) : null, aim = Number.isFinite(natpf.wrist) ? natpf.wrist : null;
  const out = (ok, tip = '') => ({ ok, recognized, tip, power, aim });
  const rtl = (want) => ((want === 'forehand') !== (hand === 'left') ? 'da destra verso sinistra' : 'da sinistra verso destra');
  if (drill.id === 'serve') return out(true, 'Gesto riconosciuto: colpisci quando la palla è in cima');
  if (drill.shot){
    if (shot === drill.shot) return out(true);
    const tips = {
      lob: ['drop', 'slice', 'smash'].includes(shot) ? 'Verso sbagliato: dal basso verso l’alto' : 'Era orizzontale: porta il telefono dal basso verso l’alto, in verticale',
      drop: shot === 'slice' ? 'Troppo veloce: più lento e morbido' : shot === 'lob' ? 'Verso sbagliato: dall’alto verso il basso' : 'Dall’alto verso il basso, lento e corto',
      slice: shot === 'drop' ? 'Più deciso: il tagliato non è lento' : shot === 'lob' ? 'Verso sbagliato: dall’alto verso il basso' : 'Dall’alto verso il basso, con decisione',
      smash: shot === 'slice' ? 'Aspetta la palla alta sopra la testa, poi giù deciso' : 'Braccio in alto, poi dall’alto verso il basso',
      flat: shot === 'topspin' ? 'Più veloce, e senza alzare la mano' : 'Gesto orizzontale e veloce, come un dritto deciso',
    };
    return out(false, tips[drill.shot] || '');
  }
  const want = drill.id === 'backhand' ? 'backhand' : 'forehand';
  if (!normal) return out(false, `Il gioco ha letto un ${shotName.toLowerCase()}: tieni il gesto orizzontale`);
  if (side && side !== want) return out(false, `Era un ${sideName.toLowerCase()}: per il ${SIDE_NAME[want].toLowerCase()} il telefono va ${rtl(want)}`);
  if (drill.direction && aim != null){
    // lato del contatto nel riferimento del giocatore: il dritto del destro colpisce a destra (+1)
    const contact = (want === 'forehand') !== (hand === 'left') ? 1 : -1, toward = aim*contact;
    if (drill.direction === 'cross') return toward < -.25 ? out(true, 'Display girato verso il centro') : out(false, 'Gira di più il display verso il centro del campo');
    return toward > .25 ? out(true, 'Display girato verso l’esterno') : out(false, 'Gira di più il display verso l’esterno, lungo il tuo lato');
  }
  return out(true);
}
// Calibrazione dentro il riscaldamento (solo smartphone)
export const CAL_STAGE = Object.freeze({ id: 'cal', label: 'Calibrazione' });
// posizione del giocatore (centro della riga di fondo) e della palla che aspetta il gesto: di lato quanto il braccio
// con la racchetta, poco davanti, all'altezza del fianco. flight: s di volo della palla colpita prima della successiva;
// seen: s di volo che si vedono comunque, anche con il telefono già pronto al gesto dopo.
// ahead: la palla ferma appena oltre il punto d'impatto (0,35 m davanti, natpf_impact.js): il colpo del gesto accettato
// parte nello stesso istante, come prima della finestra d'impatto (a 0,45 m partiva al fotogramma dopo, e la verifica
// della calibrazione arrivava prima: l'ultimo gesto restava senza colpo)
// volée: posizione d'attesa a rete (m dalla rete, lato del giocatore)
export const VOLLEY_Z = 3.3;
export const CAL_SPOT = Object.freeze({ z: 11.4, reach: 1.05, ahead: .34, height: .95, flight: .9, seen: .3 });
// Gesto della calibrazione → colpo: «L» è il gesto da destra a sinistra, il dritto di un destro (il rovescio di un mancino)
export function calCoach(want, hand = 'right'){
  const side = calSide(want, hand);
  return { side, title: side === 'forehand' ? 'Dritto' : 'Rovescio', arrow: want === 'L' ? '←' : '→', move: want === 'L' ? 'verso sinistra' : 'verso destra' };
}
// verso del gesto del colpo sul telefono (freccia) per un lato: il dritto del destro va da destra a sinistra
export const sideWant = (side, hand = 'right') => ((side === 'forehand') !== (hand === 'left') ? 'L' : 'R');
// avanzamento di un esercizio (funzione pura, per i test)
export const drillsFor = controller => DRILLS.filter(d => !d.phoneOnly || controller === 'phone');
// Messaggio dopo un pallonetto o una palla corta non riconosciuti. learn: esito dell'apprendimento del gesto appena fatto
// ({ kind, learned, distinct }, NatpfPhoneRacket.learnSpecial). Prima diceva «Ho imparato il tuo gesto» dal secondo
// tentativo anche quando il gioco non imparava niente (telefoni con la forma del colpo)
export function specialHint(shot, learn = null){
  const mine = learn?.kind === shot && learn.learned;
  if (mine && learn.distinct) return 'Ho imparato il tuo gesto: rifallo uguale';
  if (mine) return shot === 'lob' ? 'Sembra il tuo colpo normale: la mano sale di più, dal basso verso l’alto' : 'Sembra il tuo colpo normale: più lento e corto, dall’alto verso il basso';
  return shot === 'lob' ? 'Più dal basso verso l’alto' : 'Più lento, dall’alto verso il basso';
}
export function trainingDirection({ x, hitX = 0, contact = 1 } = {}){
  if (!Number.isFinite(x) || !Number.isFinite(hitX) || Math.abs(x) < 1.25) return null;
  const from = Math.abs(hitX) >= .6 ? Math.sign(hitX) : Math.sign(contact) || 1;
  if (x*from < 0) return Math.abs(x - hitX) >= 2 ? 'cross' : null;
  return Math.abs(x - hitX) <= 2.6 ? 'line' : null;
}
export function drillAfterShot(drill, progress, { side, inCourt, shot = null, direction = null, volley = false }){
  // prova guidata della diagnostica: ogni palla giocata è un campione (il giudizio lo fanno le metriche, con il video)
  if (drill.diag) return { ...progress, tries: progress.tries + 1, done: progress.done + 1, ok: true };
  // colpi speciali: conta il colpo riconosciuto, anche se finisce fuori (si impara il gesto, non la mira)
  if (drill.shot) return { ...progress, tries: progress.tries + 1, done: progress.done + (shot === drill.shot ? 1 : 0), ok: shot === drill.shot, wrongShot: shot !== drill.shot };
  if (!inCourt) return { ...progress, tries: progress.tries + 1, ok: false };
  // volée: conta solo la palla presa al volo (prima del rimbalzo)
  if (drill.volley) return { ...progress, tries: progress.tries + 1, done: progress.done + (volley ? 1 : 0), ok: !!volley, notVolley: !volley };
  if (drill.direction){
    const ok = direction === drill.direction;
    return { ...progress, tries: progress.tries + 1, done: progress.done + (ok ? 1 : 0), ok, wrongDirection: !ok };
  }
  const sideOk = drill.id === 'forehand' ? side === 'forehand' : drill.id === 'backhand' ? side === 'backhand' : true;
  return { ...progress, tries: progress.tries + 1, done: progress.done + (sideOk ? 1 : 0), ok: sideOk, wrongSide: !sideOk };
}

export class NatpfTraining {
  constructor(engine, ui){
    this.engine = engine; this.ui = ui;
    this.active = false;
    this.coach = document.getElementById('natpf-coach');
    document.getElementById('coach-exit')?.addEventListener('click', e => { e.stopPropagation(); this.skip(); });
    document.getElementById('coach-simple')?.addEventListener('click', e => { e.stopPropagation(); this.simpleMode(); });
    this.coach?.addEventListener('pointerdown', e => e.stopPropagation());
    // lezione iniziale: avanti / indietro / mano, anche da tastiera (Invio, frecce)
    this.coach?.addEventListener('click', e => {
      const b = e.target?.closest?.('[data-lesson]'); if (!b) return;
      e.stopPropagation(); this.lessonAction(b.dataset.lesson);
    });
    if (typeof window !== 'undefined') window.addEventListener('keydown', e => {
      if (!this.active || !this.lesson) return;
      const a = e.code === 'Enter' || e.code === 'ArrowRight' ? 'next' : e.code === 'ArrowLeft' || e.code === 'Backspace' ? 'back' : null;
      if (!a) return;
      e.preventDefault(); e.stopImmediatePropagation(); this.lessonAction(a);
    }, true);
    this.introSeen = {};
    // tutorial prima della calibrazione (richiesta del 04/11): modale grande, si chiude dal telefono («Tutto chiaro, ho
    // capito»); una volta per sessione e per giocatore (tutorialSeen), «Rivedi i gesti» sempre disponibile
    this.tutorialSeen = {}; this.tutorialOpen = false;
    this.tutorial = typeof document !== 'undefined' ? new NatpfTutorial(document.getElementById('natpf-tutorial'), { demo: () => getGestureDemo() }) : null;
    ui.phone?.onTutorial?.(() => this._tutorialDone('phone'));
    document.getElementById('coach-review')?.addEventListener('click', e => { e.stopPropagation(); this.reviewGestures(); });
    if (typeof window !== 'undefined') window.addEventListener('keydown', e => {
      if (!this.tutorial?.open || e.code !== 'Escape') return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (this.tutorialOpen) this._tutorialDone('skip'); else this.tutorial.close('review');
    }, true);
    // durante il riscaldamento i punti non contano: il motore chiede un punto, qui si passa alla palla successiva
    const award = engine._awardPoint.bind(engine);
    engine._awardPoint = (winner, why = '') => this.active ? this._ballOver(winner, why) : award(winner, why);
    ui.phone?.onCal?.(e => this._onCal(e));
    // colpi del telefono: negli esercizi dei colpi speciali ogni tentativo è un esempio del gesto di chi gioca, e non un
    // colpo normale (il telefono-racchetta non ne impara i riferimenti del colpo normale, natpf_phone_racket.teachesNormal)
    ui.phone?.onSwing?.(ev => this._onPhoneSwing(ev));
    // (anche nella prova guidata della diagnostica, che i prototipi non li impara: learn false)
    if (ui.phone) ui.phone.expectSpecial = () => (this.active && !this.cal && ['lob', 'drop'].includes(this.drill?.shot) ? this.drill.shot : null);
  }
  get drill(){ return (this.drills || DRILLS)[this.idx]; }
  get view(){ return this.ui.phone?.calView || CAL_VIEW_EMPTY; }
  _onPhoneSwing(ev){
    if (!this.active || this.cal || !ev?.natpf || ev.ignored) return;
    this.lastShot = ev.natpf.shot;
    const d = this.drill;
    // il gesto fatto a richiesta è un esempio del proprio colpo speciale: { kind, learned, distinct } (learnSpecial)
    if (d?.shot && d.learn !== false) this.lastLearn = { kind: d.shot, ...(this.ui.phone.learnSpecial?.(d.shot, ev.natpf) || {}) };
    // feedback immediato dal tracking: cosa ha letto il gioco e, se non è il gesto chiesto, cosa cambiare
    const fb = liveFeedback(d, ev.natpf, { side: ev.side ?? ev.natpf.side ?? null, hand: this.ui.hand?.hand || 'right' });
    if (fb){ this.live = { ...fb, until: performance.now() + 2600 }; this.paint(); }
  }
  get phoneCal(){ return this.ui.controller === 'phone' && !this.ui.phone.ready; }
  // calOnly: solo la calibrazione del telefono in campo (prima di una sfida), poi si torna a chi l'ha chiesta
  // drills/diag: esercizi su misura e richiami della prova guidata della diagnostica (onFeed a ogni palla, onEnd)
  // guest: calibrazione del Player 2 di una sfida tra due computer: alla fine si torna alla stanza (natpf_versus_ui.js)
  // intro: lezione su presa, orientamento, mano e posizione prima della calibrazione e degli esercizi (dal menu)
  start({ calOnly = false, drills = null, diag = null, guest = false, intro = false } = {}){
    this.calOnly = calOnly; this.guest = guest;
    const ctrl = this.ui.controller, steps = ctrl === 'phone' ? LESSON : ctrl === 'webcam' ? WEBCAM_LESSON : [];
    // con il telefono la lezione (presa, mano, posizione) è la modale del tutorial, in tutti i percorsi; resta per la webcam
    const wantTutorial = ctrl === 'phone' && !diag && !guest && !this.tutorialSeen.p1;
    this.lesson = !wantTutorial && ctrl !== 'phone' && intro && !guest && !diag && !calOnly && steps.length && !this.introSeen[ctrl] ? { steps, idx: 0 } : null;
    this.live = null;
    const E = this.engine;
    this.drills = calOnly ? [] : drills || drillsFor(this.ui.controller);
    this.diagRun = diag;
    this.active = true; this.idx = 0; this.progress = { done: 0, tries: 0 }; this.stats = { shots: 0, perfect: 0, out: 0 }; this.wait = 0; this.message = null; this.flash = null;
    this.cal = this.phoneCal ? { ballFor: -1, hitFor: -1, flightT: 0, fails: 0 } : null;
    this.withCal = !!this.cal;
    this.prevDifficulty = E.hud.selectedDifficulty || E.matchConfig.difficulty;
    this.prevFormat = E.matchFormat?.id || null;
    E._applyDifficultyTuning('casual'); E.isMultiplayer = false;
    E.setMatchFormat?.('singles');                 // il riscaldamento è sempre in singolare (niente compagni in campo)
    E.hud.hideTitleModal(); E.hud.hideCenterBanner();
    E.autoPlayMode = false; E.userHasInteracted = true; E.persistentStateLock = false;
    if (this.ui.controller === 'webcam' && E.motionController && !E.motionController.webcamActive) E.motionController.enableWebcam();
    Object.assign(E.score, { playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0, server: 'player', deuceSide: true }); E._syncScoreboardHUD();
    this._hideOpponent(true);
    // musica del tutorial (solo nell'Allenamento dal menu; il riscaldamento prima della partita resta com'era)
    if (!guest && !diag && drills == null && !calOnly) E.audioEngine?.setMusicContext?.('training');
    this.tutorialOpen = false;
    if (wantTutorial) this._openTutorial();
    else if (this.lesson){ this._idle(); this._centerPlayer(); }
    else this._begin();
    if (!this.tutorialOpen) E.hud.showCenterBanner(this.lesson ? 'Allenamento' : this.cal ? 'Calibrazione' : 'Riscaldamento', { style: 'style-start', subText: this.lesson ? 'Prima, come si tiene il telefono' : this.cal ? 'Il gioco impara i tuoi due gesti' : 'Solo tu e il lanciapalle', durationMs: 1300 });
    this.coach?.classList.remove('hidden');
    this.paint();
  }
  // modale del tutorial: il telefono aspetta «Tutto chiaro, ho capito» prima di calibrare (natpf_phone_racket.waitTutorial)
  _openTutorial(){
    this.tutorialOpen = true; this._idle(); this._centerPlayer();
    this.ui.phone.waitTutorial?.(true);
    this.tutorial?.openFor({ mode: 'phone', player: '', hand: this.ui.hand?.hand || 'right' });
  }
  // chiusa dal telefono (o con Esc da chi gestisce la postazione, o da un telefono con la pagina di prima che ha già
  // cominciato a calibrare): si segna vista per questa sessione e si va alla calibrazione o agli esercizi
  _tutorialDone(reason = 'phone'){
    if (!this.tutorialOpen) return;
    this.tutorialOpen = false; this.tutorialSeen.p1 = true;
    this.ui.phone.waitTutorial?.(false);
    this.tutorial?.close(reason);
    if (!this.active) return;
    this._begin();
    this.engine.hud.showCenterBanner(this.cal ? 'Calibrazione' : 'Si comincia', { style: 'style-start', subText: this.cal ? 'Tieni fermo il telefono, poi i due gesti' : 'Solo tu e il lanciapalle', durationMs: 1300 });
    this.paint();
  }
  // «Rivedi i gesti»: la stessa modale, da chiudere sul computer (la calibrazione o l'esercizio restano dove sono)
  reviewGestures(){
    if (!this.tutorial || this.tutorialOpen) return;
    this.tutorial.openFor({ mode: 'review', hand: this.ui.hand?.hand || 'right' });
  }
  // dopo la lezione (o subito): calibrazione del telefono o primo esercizio
  _begin(){
    const E = this.engine;
    if (this.cal){
      // calibrazione: niente servizio e niente corse, il giocatore aspetta fermo al centro
      this._idle(); this._centerPlayer();
      // telefono senza una calibrazione in corso (mai partita, finita o già alla verifica): si ricomincia. Se è già ai
      // gesti (succede: il telefono parte appena si attivano i sensori, prima di entrare in campo) si continua da lì
      const step = this.ui.phone.cal?.step;
      if (!step || ['done', 'review', 'free'].includes(step) || this.view.stage === 'off') this.ui.phone.recalibrate();
    } else E._setupPointServe({ showBanner: false });
  }
  lessonAction(a){
    const L = this.lesson; if (!this.active || !L) return;
    if (a === 'right' || a === 'left'){ this.ui.hand?.set?.(a); this.ui.paintTiles?.(); this.paint(); return; }
    if (a === 'back'){ L.idx = Math.max(0, L.idx - 1); this.paint(); return; }
    if (a === 'next' && L.idx < L.steps.length - 1){ L.idx++; this.paint(); return; }
    if (a === 'next' || a === 'skip'){
      this.introSeen[this.ui.controller] = true; this.lesson = null;
      this._begin();
      this.engine.hud.showCenterBanner(this.cal ? 'Calibrazione' : 'Si comincia', { style: 'style-start', subText: this.cal ? 'Tieni fermo il telefono, poi i due gesti' : 'Guarda il gesto in alto a destra', durationMs: 1300 });
      this.paint();
    }
  }
  _hideOpponent(on){
    const o = this.engine.opponent;
    if (o?.root) o.root.visible = !on;
    if (o?.shadowBlob) o.shadowBlob.visible = !on;
    this.ui.machine?.show(on);
    document.body.classList.toggle('natpf-training', on);
    // campo d'allenamento: tribune vuote e luci di lavoro (natpf_arena.js)
    this.engine.natpfArena?.setPractice?.(on);
  }
  // giocatore fermo in attesa (nessun servizio, nessuna palla): il motore non deve far partire il punto successivo
  _idle(){
    const E = this.engine;
    E.phase = 'POINT_OVER'; E.phaseTimer = 0; E.ball.inPlay = false; E.cameraMode = 'RALLY_CAM'; E.natpfTimeScale = 1;
    E.ball.pos.set(0, -5, 0); E.ball.vel.set(0, 0, 0); E.ballTrail?.clear?.();
    E.pendingUserSwing = E.pendingP2Swing = E.pendingServeSwing = null;
  }
  _centerPlayer(){
    const p = this.engine.player;
    p.pos.set(0, 0, CAL_SPOT.z); p.targetPos.copy(p.pos); p.vel?.set?.(0, 0, 0);
  }
  /* ---------- calibrazione in campo ---------- */
  _onCal(e){
    // telefono con la pagina di prima (non conosce il tutorial): ha cominciato a calibrare da solo, si chiude la modale
    if (this.active && this.tutorialOpen && !this.ui.phone.tutSupported && e.kind === 'step') this._tutorialDone('phone');
    if (!this.active || this.lesson || this.tutorialOpen) return;       // durante lezione e tutorial la calibrazione non è ancora partita
    if (!this.cal){ if (e.kind !== 'done' && this._phoneRecalibrating()) this._recal(); else return; }
    const c = this.cal, v = this.view, hand = this.ui.hand?.hand;
    this._calTick(0);                                      // palla del passo attuale subito, senza aspettare il fotogramma
    if (!this.cal) return;                                 // (telefono già pronto: si è passati agli esercizi)
    if (e.kind === 'attempt' && e.ok){
      this.flash = { text: `${calCoach(e.want || v.want, hand).title} riconosciuto ✓`, ok: true, until: performance.now() + 900 };
      this._hitCal(e.idx ?? v.idx, e.want || v.want);
    }
    // gesto non valido: il perché resta scritto finché non si rifà (calPrompt), qui solo il lampo «Riprova»
    if (e.kind === 'attempt' && !e.ok) this.flash = { text: calPrompt(v, hand).sub, ok: false, until: performance.now() + 1100 };
    if (e.kind === 'ready' && this.flash?.ok) this.flash = null;   // gesto dopo pronto: «Ora» subito, come sul telefono
    if (e.kind === 'review'){
      if (e.pass) this.ui.phone.confirm();
      else {
        c.fails++;
        // (annullato se nel frattempo si ricalibra o si esce: prima scattava lo stesso e il telefono saltava il passo
        // «fermo», con i sensori non tarati)
        clearTimeout(this.retryT);
        if (c.fails < 2) this.retryT = setTimeout(() => this.active && this.cal && this.view.stage === 'review' && this.ui.phone.retry(), 1600);
      }
    }
    // agli esercizi dopo il colpo dell'ultimo gesto, se aspetta ancora la palla (ci pensa _calTick)
    if (e.kind === 'done'){ if (!this._calStriking()) this._startDrills(); else this.paint(); return; }
    this.paint();
  }
  ballLive(){ const E = this.engine; return E.phase === 'RALLY' && E.ball.inPlay; }
  // palla del gesto chiesto: ferma all'altezza della racchetta, dal lato del colpo; il giocatore resta al centro
  _presentBall(v){
    const E = this.engine, c = this.cal, p = E.player, hand = this.ui.hand?.hand;
    const toRight = (calSide(v.want, hand) === 'forehand') !== (hand === 'left');      // P1 guarda verso −z: la sua destra è +x
    this._centerPlayer();
    const x = p.pos.x + (toRight ? 1 : -1)*CAL_SPOT.reach, z = p.pos.z - CAL_SPOT.ahead;
    E.ballTrail?.clear?.(); E.swingVfx?.clearAllTrails?.();
    E.ball.pos.set(x, CAL_SPOT.height, z); E.ball.vel.set(0, 0, 2); E.ball.spin?.set?.(0, 0, 0);
    E.ball.targetLanding?.set?.(x, 0, p.pos.z);
    Object.assign(E.ball, { inPlay: true, lastHitter: 'opponent', bounceCountOnCurrentSide: 1, rallyStrokeCount: 1, shotType: 'TOPSPIN', isPowerShot: false });
    E.pendingUserSwing = null;
    E.phase = 'RALLY'; E.phaseTimer = 0; E.cameraMode = 'RALLY_CAM';
    E.natpfTimeScale = 0;                           // tutto fermo finché non arriva il gesto
    c.ballFor = v.idx; c.flightT = 0;
  }
  // gesto riconosciuto dal telefono: il giocatore colpisce la palla di quel gesto, dal lato di quel gesto
  _hitCal(idx, want){
    const c = this.cal, E = this.engine;
    if (!c || c.ballFor !== idx || c.hitFor === idx || !this.ballLive() || E.ball.lastHitter !== 'opponent') return;
    c.hitFor = idx; c.flightT = 0; E.natpfTimeScale = 1; E.player.swingCooldown = 0;
    E.motionController?._emitSwing({ source: 'natpf-warmup', side: calSide(want, this.ui.hand?.hand), shotType: 'topspin', speed: 1.15, dirX: 0, role: E.playerRole });
  }
  // colpo del gesto riconosciuto che aspetta la palla al punto d'impatto (finestra d'impatto del motore): la palla è
  // già presa. Il telefono manda il gesto dopo (o la verifica, poi la fine) subito dopo il tentativo: prima la palla
  // veniva sostituita o tolta prima del colpo, e nel riscaldamento il giocatore non colpiva più nessuna palla
  _calStriking(){
    const E = this.engine, c = this.cal;
    return !!c && c.hitFor === c.ballFor && !!E.pendingUserSwing && this.ballLive() && E.ball.lastHitter !== 'player';
  }
  _calTick(dt){
    const E = this.engine, c = this.cal, v = this.view, p = E.player;
    const striking = this._calStriking();
    // telefono già pronto (fine della calibrazione, o pagina ricaricata con il profilo salvato): si va agli esercizi
    // invece di restare sull'ultimo gesto, dopo il colpo dell'ultimo gesto (finché la calibrazione è aperta non conta
    // come colpo dell'esercizio)
    if (this.ui.phone?.ready){ if (!striking) this._startDrills(); return; }
    p.targetPos.copy(p.pos);                                                      // il giocatore non corre mai da solo
    const flying = this.ballLive() && E.ball.lastHitter === 'player';
    if (flying) c.flightT += dt;
    if (v.stage === 'gesture'){
      // nuova palla per il gesto nuovo appena la palla colpita è passata, subito se non ce n'è una in volo, e comunque
      // prima che il telefono accetti il gesto (il tentativo arriva sempre dopo «ready», sullo stesso canale ordinato).
      // Non mentre il colpo del gesto prima aspetta la palla, e la palla colpita vola almeno CAL_SPOT.seen: «ready»
      // arriva insieme al tentativo se la mano era già ferma, e la palla colpita spariva nello stesso fotogramma. Il
      // colpo si chiude in 0,2 s (al massimo alla scadenza dello swing), il tentativo dopo arriva almeno 0,6 s dopo
      if (c.ballFor !== v.idx && !striking && (!flying || c.flightT >= (v.ready ? CAL_SPOT.seen : CAL_SPOT.flight))) this._presentBall(v);
    } else if (!flying && !striking && E.ball.inPlay) this._idle();                // fermo, verifica, fine: niente palla
    if (!this.ballLive() && E.phase === 'POINT_OVER') E.phaseTimer = 0;            // niente servizio automatico
  }
  // telefono che ricomincia a calibrare a esercizi già iniziati, senza il pannello del telefono aperto (Ricalibra e
  // pannello chiuso, pagina del telefono ricaricata): si torna alla calibrazione in campo e poi all'esercizio di prima.
  // Prima gli eventi erano ignorati, nessuno confermava la verifica e i colpi venivano scartati («Palla persa» senza fine)
  _phoneRecalibrating(){
    const P = this.ui.phone;
    return this.ui.controller === 'phone' && !!P?.connected && !P.ready && P.state?.phone === 'cal' && !!this.ui.modal?.classList.contains('hidden');
  }
  _recal(){
    this.cal = { ballFor: -1, hitFor: -1, flightT: 0, fails: 0, resume: this.idx };
    this.withCal = true; this.wait = 0; this.flash = null; this.message = null;
    this._idle(); this._centerPlayer();
    // verifica già superata mentre il pannello era aperto: si conferma subito
    const P = this.ui.phone;
    if (P.cal?.review?.pass && (P.cal.step === 'review' || P.cal.step === 'free')) P.confirm();
  }
  _startDrills(){
    if (this.calOnly){ this.stop({ completed: true, calibrated: true }); return; }
    const E = this.engine, resume = this.cal?.resume ?? 0;
    this.cal = null; this.idx = resume; this.progress = { done: 0, tries: 0 };
    this.message = null; this.flash = { text: 'Racchetta pronta ✓', until: performance.now() + 1400 };
    E.hud.showCenterBanner('Racchetta pronta', { style: 'style-start', subText: 'Ora le palle vere', durationMs: 1300 });
    this._idle(); this.wait = 1.4;
    this.paint();
  }
  // il telefono non riesce a distinguere i gesti (o chi gioca non vuole calibrare): profilo semplice
  simpleMode(){
    if (!this.active) return;
    this.ui.phone.skipCalibration();
    this.message = 'Senza calibrazione: il gesto vale lo stesso, la forza non è tarata sul tuo colpo';
    if (this.cal) this.cal.fails = 0;
  }
  /* ---------- palle ---------- */
  // colpo del giocatore locale (dall'aptica, già con l'esito dell'anello)
  onShot(q){
    if (!this.active || !q || this.cal) return;
    const E = this.engine, d = this.drill;
    if (!d) return;
    this.stats.shots++; if (q.color === 'green') this.stats.perfect++; if (q.label === 'Fuori') this.stats.out++;
    const side = E.player.swingType === 'backhand' ? 'backhand' : E.player.swingType === 'smash' ? 'smash' : 'forehand';
    // il servizio si conta qui; gli altri esercizi quando la palla è giocabile (anche fuori conta come tentativo)
    const before = this.progress.done;
    const mirror = E.playerRole === 'p2' ? -1 : 1, record = E.natpfLastRacket;
    const racket = record && Math.abs(E.elapsedTime - record.at) < .1 ? record : null;
    const direction = trainingDirection({ x: E.ball.targetLanding?.x*mirror, hitX: racket?.hitX ?? E.ball.pos.x*mirror,
      contact: racket?.contact ?? (side === 'backhand' ? -1 : 1)*(this.ui.hand?.hand === 'left' ? -1 : 1) });
    const appliedShot = racket?.out?.shot?.toLowerCase() || this.lastShot;
    this.progress = drillAfterShot(d, this.progress, { side: d.id === 'serve' ? 'serve' : side,
      inCourt: q.color !== 'red' && !['Fuori', 'Mancata', 'In rete'].includes(q.label), shot: appliedShot, direction, volley: !!racket?.volley });
    this.lastShot = null;
    const ok = this.progress.done > before;
    this.message = d.shot ? (ok ? `${d.label} ✓` : ['lob', 'drop'].includes(d.shot) ? specialHint(d.shot, this.lastLearn) : d.hint.phone)
      : ok ? `${d.label} ✓` : this.progress.wrongDirection ? (d.direction === 'cross' ? 'Serve un incrociato: mira nell’altra metà, oltre il centro' : 'Serve un lungolinea: mira lungo il lato da cui colpisci')
      : this.progress.notVolley ? 'La palla ha rimbalzato: colpiscila prima, al volo'
      : this.progress.wrongSide ? (d.id === 'forehand' ? 'Era un rovescio: la palla va sul dritto' : 'Era un dritto: la palla va sul rovescio') : q.label === 'Fuori' ? 'Fuori: meno angolo o meno forza' : q.label;
    this.flash = { text: this.message, ok, until: performance.now() + 1200 };
    this.paint();
  }
  // colpo molto fuori tempo (il motore lo gioca in difesa): conta come tentativo
  onMistime(early){
    if (!this.active || this.cal) return;
    this.progress = { ...this.progress, tries: this.progress.tries + 1 };
    this.message = early ? 'Troppo presto: aspetta che la palla arrivi vicino' : 'Troppo tardi: colpisci un attimo prima';
    this.flash = { text: this.message, ok: false, until: performance.now() + 1200 };
    this.paint();
  }
  _ballOver(winner, why){
    const E = this.engine;
    E.phase = 'POINT_OVER'; E.phaseTimer = 0; E.ball.inPlay = false; E.natpfTimeScale = 1;
    E.pendingUserSwing = E.pendingP2Swing = E.pendingServeSwing = null;
    if (this.cal){ this.paint(); return; }                       // calibrazione: la palla del gesto dopo la mette _calTick
    if (winner !== 'player' && E.ball.lastHitter === 'opponent'){ this.progress = { ...this.progress, tries: this.progress.tries + 1 }; this.message = 'Palla persa: colpisci quando arriva alla racchetta'; this.flash = { text: this.message, ok: false, until: performance.now() + 1200 }; }
    if (this.drill && (this.progress.done >= this.drill.need || (this.drill.maxTries && this.progress.tries >= this.drill.maxTries))){ this.idx++; this.progress = { done: 0, tries: 0 }; if (this.idx < this.drills.length){ this.message = null; this.flash = { text: `Bravo! Ora: ${this.drill.label}`, ok: true, until: performance.now() + 1400 }; } }
    this.wait = 1.1;
    this.paint();
  }
  _next(){
    const E = this.engine;
    if (this.cal) return;
    if (this.ballLive() && E.ball.lastHitter === 'opponent') return;     // c'è già una palla in arrivo
    if (this.idx >= this.drills.length) return this.stop({ completed: true });
    if (this.drill.id === 'serve'){ E.score.server = 'player'; E._setupPointServe({ showBanner: false }); return; }
    // volée: si lancia solo quando il giocatore è arrivato a rete
    if (this.drill.volley && Math.abs(E.player.pos.z - VOLLEY_Z) > .6){ this.wait = .25; return; }
    if (this.drill.feed) return this._feed(this.drill.feed === 'random' ? (Math.random() < .5 ? 'forehand' : 'backhand') : this.drill.feed);
    // pallonetto e palla corta: sul dritto, il colpo più comodo
    this._feed(this.drill.id === 'backhand' ? 'backhand' : this.drill.id === 'forehand' || this.drill.shot ? 'forehand' : Math.random() < .5 ? 'forehand' : 'backhand');
  }
  // lanciapalle: palla dal fondo avversario verso il dritto o il rovescio del giocatore locale (destro o mancino)
  // profile: profilo di lancio del lanciapalle (natpf_ball_machine.FEED_PROFILES), dai minigiochi; depth: z del rimbalzo
  _feed(side, { profile = null, depth = null } = {}){
    const E = this.engine, p = E.player, lefty = this.ui.hand?.hand === 'left';
    const toRight = (side === 'forehand') !== lefty;            // P1 guarda verso -z: la sua destra è +x
    const x = THREE.MathUtils.clamp(p.pos.x + (toRight ? 1.3 : -1.3) + (Math.random() - .5)*.6, -3.4, 3.4);
    const high = this.drill?.shot === 'smash' || profile?.id === 'lob';
    const z = Number.isFinite(depth) ? depth : profile?.id === 'short' ? 4.6 + Math.random()*1.2 : 8.4 + Math.random()*1.4;
    const target = new THREE.Vector3(x, 0, z);
    // la palla esce dalla bocca del lanciapalle 3D (prima nasceva dal nulla oltre la rete)
    const machine = this.ui.machine;
    const start = machine ? machine.fire(target, { profile: profile || (high ? { id: 'lob' } : null) }) : new THREE.Vector3((Math.random() - .5)*2, 1.05, -11.6);
    E.ballTrail?.clear(); E.swingVfx?.clearAllTrails?.();
    E.ball.pos.copy(start);
    const flight = high ? 1.9 : profile?.flight ?? 1.15, spin = high ? 5 : profile?.spin ?? 10;
    E._launchBallToTarget(start, target, flight, { topspin: spin, sidespin: 0, allowNetFault: false });
    Object.assign(E.ball, { inPlay: true, lastHitter: 'opponent', bounceCountOnCurrentSide: 0, rallyStrokeCount: 1, shotType: high ? 'MOON' : 'TOPSPIN', isPowerShot: false });
    E.phase = 'RALLY'; E.phaseTimer = 0; E.cameraMode = 'RALLY_CAM';
    // come in partita: piano d'intercetto sulla traiettoria vera (finestra d'impatto e movimento, natpf_impact.js)
    E._natpfPlanPlayer ? E._natpfPlanPlayer() : E._predictBallIntercept(p);
    if (!machine) E.audioEngine?.playRacketHit?.('topspin', 'good');
    this.fedSide = side;
    this.diagRun?.onFeed?.(this.drill, side);
  }
  tick(dt){
    if (!this.active) return;
    const E = this.engine, o = E.opponent;
    // il lanciapalle non corre e non risponde: l'avversario resta fuori dal campo
    if (o){ o.pos.set(0, 0, -40); o.targetPos.copy(o.pos); }
    this.ui.machine?.tick(dt);
    if (this.lesson || this.tutorialOpen){ this.paint(); return; }
    // volée: il giocatore aspetta a rete tra una palla e l'altra
    if (!this.cal && this.drill?.volley && !this.ballLive()) this.engine.player.targetPos.set(0, 0, VOLLEY_Z);
    if (!this.cal && this._phoneRecalibrating()) this._recal();
    if (this.cal) this._calTick(dt);
    if (this.wait > 0){ this.wait -= dt; if (this.wait <= 0) this._next(); }
    this.paint();
  }
  // «Salta»: con il telefono non calibrato si passa alla modalità semplice
  skip(){
    if (!this.active) return;
    if (this.ui.controller === 'phone' && !this.ui.phone.ready) this.ui.phone.skipCalibration();
    this.stop({ completed: false, skipped: true });
  }
  // silent: chiusa da una sfida che parte subito dopo (niente menu né risultato)
  stop({ completed, skipped = false, calibrated = false, silent = false }){
    if (!this.active) return;
    const E = this.engine;
    if (this.tutorialOpen){ this.tutorialOpen = false; this.ui.phone.waitTutorial?.(false); this.tutorial?.close('skip'); }
    this.active = false; this.cal = null; this.lesson = null; this.live = null; E.natpfTimeScale = 1; clearTimeout(this.retryT);
    if (this.demoOn){ getGestureDemo().stop(); this.demoOn = false; }
    if (E.audioEngine?.musicContext === 'training') E.audioEngine.musicContext = null;
    this.coach?.classList.add('hidden'); this._hideOpponent(false);
    E.opponent.pos.set(-1.35, 0, -11.89); E.opponent.targetPos.copy(E.opponent.pos);
    E._applyDifficultyTuning(this.prevDifficulty || 'casual');
    Object.assign(E.score, { playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0, server: 'player', deuceSide: true });
    E._syncScoreboardHUD(); E.hud.hideCenterBanner();
    // Player 2: niente dimostrazione né menu, si torna al pannello della stanza ad aspettare la partita dell'host
    if (this.guest){
      this.guest = false;
      if (this.prevFormat) E.setMatchFormat?.(this.prevFormat);
      this.ui.versus?.calDone({ completed, skipped, calibrated });
      this.ui._syncPause?.();
      return;
    }
    E._setupMidRallyShowcase({}); E.autoPlayMode = true; E.userHasInteracted = false;
    // formato della partita scelto prima del riscaldamento (sempre in singolare) e pausa ricalcolata: prima il gioco
    // poteva restare in pausa dopo il reset del chiosco
    if (this.prevFormat) E.setMatchFormat?.(this.prevFormat);
    this.ui._syncPause?.();
    const run = this.diagRun; this.diagRun = null; run?.onEnd?.({ completed, skipped });
    if (silent) return;
    E.hud.showTitleModal();
    this.ui.flow?.onTrainingEnd({ completed, skipped, calibrated, stats: this.stats });
  }
  // Pannello in campo: tappe in alto, in basso al centro il gesto da fare (titolo grande, freccia, stato) e l'esito
  paint(){
    if (!this.active || !this.coach) return;
    const $ = sel => this.coach.querySelector(sel);
    const c = this.ui.controller, hand = this.ui.hand?.hand || 'right', now = performance.now();
    const stages = this.withCal ? [CAL_STAGE, ...this.drills] : this.drills;
    const cur = this.cal ? 0 : stages.indexOf(this.drill);
    const list = $('#coach-stages'), key = stages.map(x => x.id).join() + cur;
    if (list && list.dataset.key !== key){ list.dataset.key = key; list.innerHTML = stages.map((x, i) => `<li class="${i < cur ? 'done' : i === cur ? 'on' : ''}">${x.label}</li>`).join(''); }
    show($('#coach-simple'), !!this.cal && this.cal.fails >= 1);
    show($('#coach-review'), this.ui.controller === 'phone' && !this.lesson && !this.tutorialOpen);
    // lezione iniziale: pannello a sinistra con l'animazione grande, il campo resta libero
    const L = this.lesson;
    if (this.coach.dataset.mode !== (L ? 'lesson' : 'drill')) this.coach.dataset.mode = L ? 'lesson' : 'drill';
    show($('#coach-lesson'), !!L);
    if (L) this._paintLesson($, hand);
    const flash = this.flash && now < this.flash.until ? this.flash : null;
    const mode = this.ui.flow?.mode === 'training' ? 'Allenamento' : 'Riscaldamento';
    const P = this.ui.phone, lost = c === 'phone' && P && (!P.connected || (P.state?.phone && !['cal', 'ready'].includes(P.state.phone)));
    const grip = $('#coach-grip'), showGrip = c === 'phone' && !!this.cal && this.view.stage === 'still' && !lost;
    // foto reale della presa (base nel palmo, cima in avanti); la figura disegnata resta se la foto non si carica
    if (grip && showGrip && grip.dataset.hand !== hand){
      grip.innerHTML = `<img class="coach-grip-photo${hand === 'left' ? ' mirror' : ''}" src="${PHOTOS.grip.src}" alt="${PHOTOS.grip.alt}" />`;
      if (grip.firstChild) grip.firstChild.onerror = () => { grip.innerHTML = gripSvg({ compact: true, hand, cls: 'coach-grip-art' }); };
      grip.dataset.hand = hand;
    }
    show(grip, showGrip);
    let view;
    // telefono scollegato o senza sensori (pagina ricaricata, schermo spento): prima il pannello restava su «Ora»
    if (lost) view = { kicker: mode, title: 'Telefono scollegato', sub: !P.connected ? 'Riapri la pagina sul telefono: si ricollega da solo e si riparte da qui' : 'Sul telefono tocca «Attiva i sensori»', state: 'retry', dir: null, count: '' };
    else if (this.cal){
      const v = this.view, pr = calPrompt(v, hand);
      const count = v.stage === 'gesture' ? `Gesto ${Math.min(v.idx + 1, v.total)} di ${v.total}` : v.stage === 'still' ? 'Prima di iniziare' : '';
      view = { kicker: mode, title: pr.title, sub: flash ? flash.text : (this.message && v.stage !== 'gesture' ? this.message : pr.sub), state: flash ? (flash.ok ? 'ok' : 'retry') : pr.state, dir: pr.dir, count, dots: v.stage === 'gesture' ? Array.from({ length: v.total }, (_, i) => i < v.idx ? 'done' : i === v.idx ? 'on' : '') : null };
    } else {
      const d = this.drill, ctrl = c in (d?.hint || {}) ? c : 'phone';
      if (!d) view = { kicker: mode, title: 'Completato ✓', sub: '', state: 'ok', dir: null, count: '' };
      else {
        const hot = isHot(this.engine);
        view = { kicker: `${mode} · ${this.idx + 1} di ${this.drills.length}`, title: d.label, sub: flash ? flash.text : d.hint[ctrl], state: flash ? (flash.ok ? 'ok' : 'retry') : hot ? 'go' : 'wait',
          dir: c === 'phone' && d.cue ? sideWant(d.cue, hand) : null, count: `${Math.min(this.progress.done, d.need)} di ${d.need}`, dots: Array.from({ length: d.need }, (_, i) => i < this.progress.done ? 'done' : '') };
      }
    }
    const k = $('#coach-kicker'); if (k && k.textContent !== view.kicker) k.textContent = view.kicker;
    const t = $('#coach-text'); if (t && t.textContent !== view.title) t.textContent = view.title;
    const s = $('#coach-sub'); if (s && s.textContent !== view.sub) s.textContent = view.sub;
    const n = $('#coach-count'); if (n && n.textContent !== view.count) n.textContent = view.count;
    const main = $('#coach-main'); if (main && main.dataset.state !== view.state) main.dataset.state = view.state;
    const cue = $('#coach-cue'); if (cue){ const dir = view.dir || ''; if (cue.dataset.dir !== dir) cue.dataset.dir = dir; }
    const dots = $('#coach-dots'), dk = (view.dots || []).join();
    if (dots && dots.dataset.key !== dk){ dots.dataset.key = dk; dots.innerHTML = (view.dots || []).map(x => `<i class="${x}"></i>`).join(''); }
    const badge = $('#coach-badge'), bt = { go: 'Ora!', wait: 'Aspetta', retry: 'Riprova', ok: '✓' }[view.state] || '';
    if (badge && badge.textContent !== bt) badge.textContent = bt;
    this._paintLive($, now);
    this._paintDemo($, lost, hand);
  }
  _paintLesson($, hand){
    const L = this.lesson, st = L.steps[L.idx], last = L.idx === L.steps.length - 1;
    const set = (sel, v) => { const el = $(sel); if (el && el.textContent !== v) el.textContent = v; };
    set('#coach-lesson-step', `Passo ${L.idx + 1} di ${L.steps.length}`);
    set('#coach-lesson-title', st.title); set('#coach-lesson-text', st.text);
    set('#coach-lesson-next', last ? (this.cal ? 'Calibra ›' : 'Inizia ›') : 'Avanti ›');
    const back = $('#coach-lesson-back'); if (back) back.disabled = L.idx === 0;
    show($('#coach-lesson-hand'), !!st.hand);
    for (const h of ['right', 'left']){ const b = $(`#coach-hand-${h}`); if (b){ b.classList.toggle('selected', hand === h); b.setAttribute('aria-pressed', String(hand === h)); } }
    const dots = $('#coach-lesson-dots'), dk = `${L.idx}/${L.steps.length}`;
    if (dots && dots.dataset.key !== dk){ dots.dataset.key = dk; dots.innerHTML = L.steps.map((_, i) => `<i class="${i < L.idx ? 'done' : i === L.idx ? 'on' : ''}"></i>`).join(''); }
  }
  // riga del feedback in tempo reale (gesto letto dal telefono): riconosciuto, giusto o da migliorare, forza
  _paintLive($, now){
    const box = $('#coach-live'); if (!box) return;
    const L = this.live && now < this.live.until && !this.cal && !this.lesson ? this.live : null;
    const key = L ? `${L.recognized}|${L.ok}|${L.tip}|${L.power}` : '';
    if (box.dataset.key === key) return;
    box.dataset.key = key; show(box, !!L);
    if (!L) return;
    const bars = L.power == null ? '' : `<span class="live-power" aria-label="Forza ${Math.round(L.power*100)}%">${[.25, .5, .75, .95].map(t => `<i class="${L.power >= t ? 'on' : ''}"></i>`).join('')}</span>`;
    box.dataset.ok = L.ok ? 'yes' : 'no';
    box.innerHTML = `<span class="live-mark" aria-hidden="true">${L.ok ? '✓' : '!'}</span><span class="live-text"><b>${L.recognized}</b>${L.tip ? `<small>${L.tip}</small>` : ''}</span>${bars}`;
  }
  // gesto da guardare: nella lezione le foto reali (presa, bordo verso lo schermo, posizione), negli esercizi e nella
  // calibrazione l'animazione 3D verificata con il rilevatore vero (natpf_gesture_demo.js). Grande nella lezione, piccola
  // in alto a destra durante gli esercizi (solo smartphone: con la webcam si colpisce senza telefono in mano). Un solo
  // canvas WebGL che si sposta tra i due riquadri; per i mancini le foto sono specchiate. Le clip video generate dei
  // colpi sono state tolte il 28/10 su richiesta dell'utente (pose e oggetto in mano non credibili).
  _paintDemo($, lost, hand){
    if (this.tutorial?.open) return;           // l'animazione 3D (una sola) ce l'ha la modale del tutorial
    const phone = this.ui.controller === 'phone';
    const step = this.lesson?.steps[this.lesson.idx];
    let id = null;
    // nella lezione l'immagine c'è anche con il telefono non ancora collegato (si spiega come tenerlo)
    if (phone && step) id = step.demo || null;
    else if (phone && !lost){
      // in calibrazione niente riquadro «Guarda e ripeti» (richiesta del 04/11: i gesti sono nella modale del tutorial e
      // le istruzioni restano in basso a sinistra); negli esercizi dell'Allenamento resta
      if (!this.cal && !this.tutorialOpen) id = this.drill?.demo || null;
    }
    const photos = phone && step ? lessonPhotos(step.id) : null;
    const card = $('#coach-demo'), big = $('#coach-lesson-demo'), media = $('#coach-lesson-media');
    show(card, !!id && !step); show(big, !!id && !!step && !photos); show(media, !!photos);
    if (photos){
      const key = `${step.id}|${hand}`;
      if (media && media.dataset.key !== key){
        media.dataset.key = key;
        const m = hand === 'left' ? ' mirror' : '';
        media.innerHTML = `<img class="lesson-photo${m}" src="${photos.main.src}" alt="${photos.main.alt}" />`
          + (photos.no ? `<figcaption class="lesson-no"><img src="${photos.no.src}" alt="${photos.no.alt}" /><b>Così no</b></figcaption>` : '');
      }
    }
    const demo = id && !photos ? getGestureDemo() : null;
    if (!demo){ this.demoOn && getGestureDemo().stop(); this.demoOn = false; return; }
    const g = GESTURES[id];
    demo.mount(step ? big : $('#coach-demo-stage'));
    if (demo.available) demo.setSize(step ? 300 : 200, step ? 300 : 200);
    demo.play(id, { hand, speed: g.still ? 1 : step ? .6 : .5 });
    this.demoOn = true;
    const key = `${id}|${hand}`, title = $('#coach-demo-title'), cues = $('#coach-demo-cues');
    if (card && card.dataset.key !== key){
      card.dataset.key = key;
      if (title) title.textContent = g.label;
      if (cues) cues.innerHTML = g.cues.map(c => `<li>${c}</li>`).join('');
      card.classList.toggle('no-webgl', !demo.available);
    }
  }
}
const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
// palla in arrivo vicina alla racchetta: è il momento del colpo
const isHot = E => E.phase === 'RALLY' && E.ball.inPlay && E.ball.lastHitter === 'opponent' && E.ball.vel.z > .1 && (E.player.pos.z - E.ball.pos.z)/E.ball.vel.z < .4;
