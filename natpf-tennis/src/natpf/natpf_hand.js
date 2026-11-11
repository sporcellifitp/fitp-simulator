// Mano del giocatore (destra o mancino) e mano libera in prima persona.
// - Mancino: il personaggio locale è specchiato (racchetta nella sinistra, anche in terza persona) e dritto/rovescio
//   si scambiano per webcam e mouse; il telefono la riceve dal gioco (una sola impostazione, vedi natpfPhone.setHand).
// - Prima persona: la mano libera (sinistra per un destro, destra per un mancino) si vede solo al proprio servizio,
//   per il lancio di palla; nel resto del gioco resta solo la mano con la racchetta.
import { webcamGate } from './natpf_impact.js';
export const HAND_KEY = 'natpf-tennis.hand';
export const normalizeHand = h => (h === 'left' ? 'left' : 'right');
export function readHand(){ try { return normalizeHand(localStorage.getItem(HAND_KEY)); } catch { return 'right'; } }
export function writeHand(h){ try { localStorage.setItem(HAND_KEY, normalizeHand(h)); } catch {} }
// mano del Player 2 dello split screen (secondo telefono sullo stesso computer), salvata a parte
export const P2_HAND_KEY = 'natpf-tennis.hand.p2';
export function readP2Hand(){ try { return normalizeHand(localStorage.getItem(P2_HAND_KEY)); } catch { return 'right'; } }
export function writeP2Hand(h){ try { localStorage.setItem(P2_HAND_KEY, normalizeHand(h)); } catch {} }

const swap = s => (s === 'forehand' ? 'backhand' : s === 'backhand' ? 'forehand' : s);
// Lato del colpo per un mancino. Il motore ragiona da destro: un gesto o una palla «da rovescio» per un destro
// è «da dritto» per un mancino. Il telefono NATPF manda già il lato giusto.
export function leftySide(evt = {}, { ballX = 0, actorX = 0, facingNegativeZ = true } = {}){
  // il telefono NATPF e la webcam dal movimento (lato dalla palla, già con la mano di chi gioca) mandano il lato giusto
  if ((evt.source === 'natpf-phone' || evt.handedSide) && evt.side) return evt.side;
  const dirX = Number(evt.dirX || 0);
  const right = evt.side || (dirX > .12 ? 'backhand' : dirX < -.12 ? 'forehand' : null);
  if (right && right !== 'overhead') return swap(right);
  if (right === 'overhead') return right;
  // nessuna indicazione: dalla posizione della palla (sinistra del giocatore = dritto del mancino)
  const ballOnLeft = facingNegativeZ ? ballX < actorX - .05 : ballX > actorX + .05;
  return ballOnLeft ? 'forehand' : 'backhand';
}
// serve con la mano libera in vista?
export const isLocalServing = engine => ['SERVE_STANCE', 'SERVE_TOSS'].includes(engine.phase) && engine.score?.server === (engine.playerRole === 'p2' ? 'opponent' : 'player');

export class NatpfHand {
  constructor(engine){
    this.engine = engine;
    this.hand = readHand();
    this.mirrored = null;
    this.offHidden = null;
    // al servizio la palla sta nella mano libera: per un mancino dall'altra parte del corpo. La mano è quella di chi
    // batte: il personaggio locale ha questa, l'altro giocatore (Player 2 dello stesso schermo o del 1v1 visto
    // dall'host) quella messa da mirrorRemote (B15: prima il P2 mancino lanciava con la mano della racchetta)
    const mirrorBall = actor => { if (actor && this.handOf(actor) === 'left') engine.ball.pos.x = 2*actor.pos.x - engine.ball.pos.x; };
    const setup = engine._setupPointServe?.bind(engine), toss = engine._startServeToss?.bind(engine);
    if (setup) engine._setupPointServe = (o) => { const r = setup(o); const s = engine.score.server === 'player' ? engine.player : engine.opponent; mirrorBall(s); return r; };
    // (gli altri argomenti passano: B25, il lancio automatico dice al motore che la palla la lancia il gioco)
    if (toss) engine._startServeToss = (actor, ...more) => { const r = toss(actor, ...more); mirrorBall(actor); return r; };
    const mc = engine.motionController;
    // webcam: la mano che impugna (per scegliere quale seguire) e il lancio di palla solo quando il gioco lo accetta
    // (al proprio servizio): nello scambio la mano che sale di scatto segue le regole dei colpi, non diventa un pallonetto
    if (mc){
      mc.handPreference = this.hand; mc.canToss = () => engine.phase === 'TITLE' || (engine.phase === 'SERVE_STANCE' && isLocalServing(engine));
      // cambio del modello delle mani (ricaricarlo ferma il gioco per un attimo): non con un punto in gioco
      mc.canReload = () => engine.phase !== 'RALLY' && engine.phase !== 'SERVE_TOSS';
      // colpi dal movimento (webcam_motion.js): quando un movimento può essere un colpo e da che lato; in partita il
      // modello delle mani non gira
      mc.webcamGate = () => webcamGate(engine, this.hand);
      mc.webcamInPlay = () => !engine.autoPlayMode && ['SERVE_STANCE', 'SERVE_TOSS', 'RALLY', 'POINT_OVER'].includes(engine.phase);
    }
    const emit = mc?._emitSwing?.bind(mc);
    if (emit) mc._emitSwing = (e0 = {}) => {
      // la mano viaggia con il colpo: il colpo del Player 2 arriva all'host con la mano di chi gioca (1v1 tra due computer)
      const e = e0.hand ? e0 : { ...e0, hand: this.hand };
      if (this.hand !== 'left' || e.type === 'toss' || ['SERVE_STANCE', 'SERVE_TOSS'].includes(engine.phase)) return emit(e);
      const a = engine.localActor;
      return emit({ ...e, side: leftySide(e, { ballX: engine.ball?.pos?.x || 0, actorX: a?.pos?.x || 0, facingNegativeZ: engine.playerRole !== 'p2' }) });
    };
  }
  // una sola mano per tutto il gioco: personaggio, telefono (che la riceve e la mostra) e webcam
  set(h){
    this.hand = normalizeHand(h); writeHand(this.hand);
    const phone = this.engine.natpfPhone;
    if (phone){ if (phone.setHand) phone.setHand(this.hand); else phone.hand = this.hand; }
    const mc = this.engine.motionController;
    if (mc){
      if (mc.handPreference !== this.hand){ mc._resetHandTracking?.(); mc.handTracker?.reset?.(); }
      mc.handPreference = this.hand;
    }
    this.apply();
  }
  // mano di un personaggio: il locale ha quella del gioco, l'altro quella ricevuta (mirrorRemote), destro se non si sa
  handOf(actor){ return actor === this.engine.localActor ? this.hand : normalizeHand(actor?.natpfHand); }
  // specchia il personaggio locale (una sola volta per cambio)
  apply(){
    const a = this.engine.localActor; if (!a?.root) return;
    a.natpfHand = this.hand;   // la mano sul personaggio: la racchetta animata (racket_kinematics) sceglie il lato con questa
    const want = this.hand === 'left' ? -1 : 1;
    if (this.mirrored !== a || Math.sign(a.root.scale.x) !== want){ a.root.scale.x = Math.abs(a.root.scale.x || 1)*want; this.mirrored = a; }
  }
  // personaggio dell'altro giocatore (Player 2 visto dall'host): specchiato se è mancino
  mirrorRemote(actor, hand){
    if (!actor?.root || actor === this.engine.localActor) return;
    actor.natpfHand = normalizeHand(hand);
    const want = normalizeHand(hand) === 'left' ? -1 : 1;
    if (Math.sign(actor.root.scale.x) !== want) actor.root.scale.x = Math.abs(actor.root.scale.x || 1)*want;
  }
  // ogni fotogramma: mano libera visibile solo al servizio, in prima persona
  update(firstPersonActor){
    this.apply();
    const hide = !!firstPersonActor && !isLocalServing(this.engine);
    if (hide === this.offHidden && firstPersonActor === this._fp) return;
    for (const a of [this._fp, firstPersonActor]){
      if (!a) continue;
      const off = [a.parts?.handL, a.natpfLimbs?.arms?.[1]?.fore?.group].filter(Boolean);
      const h = a === firstPersonActor && hide;
      for (const o of off) o.visible = !h;
    }
    this.offHidden = hide; this._fp = firstPersonActor;
  }
}
