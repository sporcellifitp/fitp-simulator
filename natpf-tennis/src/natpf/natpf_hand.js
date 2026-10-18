// Mano del giocatore (destra o mancino) e mano libera in prima persona.
// - Mancino: il personaggio locale è specchiato (racchetta nella sinistra, anche in terza persona) e dritto/rovescio
//   si scambiano per webcam e mouse; il telefono NATPF conosce già la mano dalla calibrazione.
// - Prima persona: la mano libera (sinistra per un destro, destra per un mancino) si vede solo al proprio servizio,
//   per il lancio di palla; nel resto del gioco resta solo la mano con la racchetta.
export const HAND_KEY = 'natpf-tennis.hand';
export const normalizeHand = h => (h === 'left' ? 'left' : 'right');
export function readHand(){ try { return normalizeHand(localStorage.getItem(HAND_KEY)); } catch { return 'right'; } }
export function writeHand(h){ try { localStorage.setItem(HAND_KEY, normalizeHand(h)); } catch {} }

const swap = s => (s === 'forehand' ? 'backhand' : s === 'backhand' ? 'forehand' : s);
// Lato del colpo per un mancino. Il motore ragiona da destro: un gesto o una palla «da rovescio» per un destro
// è «da dritto» per un mancino. Il telefono NATPF manda già il lato giusto.
export function leftySide(evt = {}, { ballX = 0, actorX = 0, facingNegativeZ = true } = {}){
  if (evt.source === 'natpf-phone' && evt.side) return evt.side;
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
    // al servizio la palla sta nella mano libera: per un mancino dall'altra parte del corpo
    const mirrorBall = actor => { if (this.hand === 'left' && actor === engine.localActor) engine.ball.pos.x = 2*actor.pos.x - engine.ball.pos.x; };
    const setup = engine._setupPointServe?.bind(engine), toss = engine._startServeToss?.bind(engine);
    if (setup) engine._setupPointServe = (o) => { const r = setup(o); const s = engine.score.server === 'player' ? engine.player : engine.opponent; mirrorBall(s); return r; };
    if (toss) engine._startServeToss = (actor) => { const r = toss(actor); mirrorBall(actor); return r; };
    const mc = engine.motionController;
    const emit = mc?._emitSwing?.bind(mc);
    if (emit) mc._emitSwing = (e = {}) => {
      if (this.hand !== 'left' || e.type === 'toss' || ['SERVE_STANCE', 'SERVE_TOSS'].includes(engine.phase)) return emit(e);
      const a = engine.localActor;
      return emit({ ...e, side: leftySide(e, { ballX: engine.ball?.pos?.x || 0, actorX: a?.pos?.x || 0, facingNegativeZ: engine.playerRole !== 'p2' }) });
    };
  }
  set(h){ this.hand = normalizeHand(h); writeHand(this.hand); if (this.engine.natpfPhone) this.engine.natpfPhone.hand = this.hand; this.apply(); }
  // specchia il personaggio locale (una sola volta per cambio)
  apply(){
    const a = this.engine.localActor; if (!a?.root) return;
    const want = this.hand === 'left' ? -1 : 1;
    if (this.mirrored !== a || Math.sign(a.root.scale.x) !== want){ a.root.scale.x = Math.abs(a.root.scale.x || 1)*want; this.mirrored = a; }
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
