// Racchetta fuori dalla testa (B24, revisione del 12/11). Le pose della racchetta sono pensate per la testa piccola del
// tennista: con una testa grande (Lob e Drop, e i modelli 3D che verranno) il telaio le entra dentro, soprattutto nella
// posa d'attesa dello scambio, dove resta a lungo. Qui, in un punto solo, la racchetta si scosta dalla testa SOLO quanto
// serve e solo quando la attraversa; la mano resta sul manico e il braccio la segue.
//
// È solo disegno: si sposta `actor.racketMesh` dentro il suo perno (`racketPivot`, che il motore riscrive a ogni passo e
// che qui non si tocca). Il gioco non legge mai la posizione della racchetta nel mondo per decidere un colpo (lo fanno
// solo le scie, il lampo del colpo e le scene dimostrative): fisica, esiti e impronte dei punti restano quelli di prima.
//
// Tre regole, perché il movimento resti morbido e il colpo resti dov'era:
//   · lo scostamento insegue il suo bersaglio a velocità limitata (PUSH_RATE in andata, RELEASE_RATE al ritorno): nelle
//     pose tenute la racchetta esce del tutto in pochi fotogrammi; nei passaggi veloci di un colpo (pochi fotogrammi,
//     come capita anche al tennista) si scosta solo in parte, senza scatti;
//   · non va oltre maxShift(forma): se la racchetta passa per il centro della testa non la si porta lontano dal corpo;
//   · con la palla in arrivo vicino alle corde (NEAR_BALL) lo scostamento si spegne: all'impatto le corde sono dove le
//     mette il motore, come con il tennista.
//
// COME SI RIUSA (anche per un modello con lo scheletro): a ogni fotogramma, dopo le animazioni e prima del disegno,
//   keepRacketClear(actor, forma, dt, palla, nodoTesta, nodoMano)
//   · forma: un ellissoide { rx, ry, rz, cx, cy, cz } nel sistema del nodo della testa (centro e semiassi di ciò che la
//     racchetta non deve attraversare), oppure una lista di ellissoidi (il primo è la testa, gli altri accessori:
//     cappello, orecchie…); null = nessuna testa grande: la racchetta torna subito al suo posto;
//   · dt: secondi dall'ultimo fotogramma; senza (o con un salto di tempo) lo scostamento va subito al bersaglio: così
//     si usa per le scene ferme e per le prove;
//   · palla: { pos, vel } nel mondo (facoltativa);
//   · nodoTesta: l'oggetto che porta la testa (di base actor.parts.head; per un modello con lo scheletro l'osso della
//     testa); nodoMano: l'oggetto della mano che tiene la racchetta (di base quello del rig del motore).
// Per misurare una testa nuova basta il riquadro del suo nodo: semiassi = metà di larghezza, altezza e profondità.
// Lo stato è un vettore per attore (actor.natpfRacketShift); niente allocazioni per fotogramma: una trentina di punti e
// due matrici inverse per ogni attore con la testa grande, niente per gli altri.
import * as THREE from 'three';

// Telaio della racchetta nel suo sistema (natpf_character.racketParts): ellisse con il centro a y 0,545
export const RACKET_FRAME = Object.freeze({ cy: 0.545, rx: 0.172, ry: 0.215 });
// Punti da tenere fuori: 24 sul telaio, il cuore delle corde, 6 a metà del piatto (una testa tonda può sporgere tra le
// corde senza toccare il telaio), 3 tra la gola e il manico sopra la mano
const FRAME_N = 24, CENTER = FRAME_N;
const PTS = (() => {
  const p = [];
  for (let i = 0; i < FRAME_N; i++){ const t = i/FRAME_N*Math.PI*2; p.push(RACKET_FRAME.rx*Math.cos(t), RACKET_FRAME.cy + RACKET_FRAME.ry*Math.sin(t), 0); }
  p.push(0, RACKET_FRAME.cy, 0);
  for (let i = 0; i < 6; i++){ const t = i/6*Math.PI*2; p.push(RACKET_FRAME.rx*0.5*Math.cos(t), RACKET_FRAME.cy + RACKET_FRAME.ry*0.5*Math.sin(t), 0); }
  p.push(0, 0.33, 0, 0, 0.25, 0, 0, 0.17, 0);
  return new Float32Array(p);
})();
const N = PTS.length/3;
// margine intorno alla testa (unità del nodo della testa): spessore del telaio più un filo d'aria
export const CLEAR_MARGIN = 0.03;
// Verso in cui scostare: dal centro della testa verso il cuore delle corde, con una spinta in avanti (z > 0 è il davanti
// del personaggio) che decide quando la racchetta è proprio al centro della testa
const FORWARD_BIAS = 0.45;
const MAX_PASSES = 4;

const _pts = new Float32Array(N*3);
const _m = new THREE.Matrix4(), _inv = new THREE.Matrix4(), _m3 = new THREE.Matrix3();
const _v = new THREE.Vector3(), _d = new THREE.Vector3(), _o0 = new THREE.Vector3(), _o1 = new THREE.Vector3();

// Quanto bisogna andare lungo n (da dove si è già, a t) perché nessun punto resti dentro l'ellissoide s
function needed(s, margin, nx, ny, nz, t){
  const rx = s.rx + margin, ry = s.ry + margin, rz = s.rz + margin, cx = s.cx || 0, cy = s.cy || 0, cz = s.cz || 0;
  const ax = nx/rx, ay = ny/ry, az = nz/rz, a = ax*ax + ay*ay + az*az;
  let need = 0;
  for (let i = 0; i < N; i++){
    const px = (_pts[i*3] + nx*t - cx)/rx, py = (_pts[i*3 + 1] + ny*t - cy)/ry, pz = (_pts[i*3 + 2] + nz*t - cz)/rz;
    const q = px*px + py*py + pz*pz;
    if (q >= 1) continue;
    const b = px*ax + py*ay + pz*az, ti = (-b + Math.sqrt(b*b + a*(1 - q)))/a;
    if (ti > need) need = ti;
  }
  return need;
}

const hidden = (o, root) => { for (let p = o; p && p !== root; p = p.parent) if (!p.visible) return true; return false; };
// Limiti dello scostamento (unità del nodo della testa: per Lob e Drop 1 = 1,16 m) e della sua velocità (unità al secondo)
export const PUSH_RATE = 4, RELEASE_RATE = 8;
// Tetto dello scostamento: 1,3 volte il raggio medio della testa (per Drop 0,46 = 53 cm), così vale per teste più grandi
const meanRadius = s => (s.rx + s.ry + s.rz)/3;
export const maxShift = shape => 1.3*meanRadius(Array.isArray(shape) ? shape[0] : shape);
// Palla in arrivo: più vicina di così alle corde (metri) e più veloce di così (m/s) → niente scostamento
export const NEAR_BALL = 1.2, BALL_SPEED = 3;
const _t = new THREE.Vector3(), _c = new THREE.Vector3();

// Scosta la racchetta dalla testa quanto serve (vedi in cima). Restituisce lo scostamento applicato, nelle unità del
// nodo della testa (0 = la racchetta è al suo posto).
export function keepRacketClear(actor, shape, dt, ball, head, hand){
  const racket = actor?.racketMesh;
  if (!racket || !racket.parent || !actor.root) return 0;
  const pos = racket.position, S = actor.natpfRacketShift;
  head = head || actor.parts?.head;
  // testa nascosta (prima persona): niente da evitare
  if (shape && (!head || hidden(head, actor.root))) shape = null;
  if (!shape && !S && pos.x === 0 && pos.y === 0 && pos.z === 0) return 0;      // tennista di sempre: non si tocca niente
  actor.root.updateMatrixWorld(true);
  _o0.setFromMatrixPosition(racket.matrixWorld);         // dov'è la racchetta adesso (con lo scostamento di prima)
  pos.set(0, 0, 0);
  racket.updateMatrixWorld(true);
  // bersaglio dello scostamento, nel sistema della testa
  _t.set(0, 0, 0);
  let release = !shape;
  if (shape && ball?.pos && ball.vel && ball.vel.lengthSq() > BALL_SPEED*BALL_SPEED){
    _c.set(0, RACKET_FRAME.cy, 0).applyMatrix4(racket.matrixWorld);
    if (_c.distanceToSquared(ball.pos) < NEAR_BALL*NEAR_BALL) release = true;
  }
  if (shape && !release){
    const list = Array.isArray(shape), main = list ? shape[0] : shape, count = list ? shape.length : 1;
    _m.copy(head.matrixWorld).invert().multiply(racket.matrixWorld);
    for (let i = 0; i < N; i++){
      _v.set(PTS[i*3], PTS[i*3 + 1], PTS[i*3 + 2]).applyMatrix4(_m);
      _pts[i*3] = _v.x; _pts[i*3 + 1] = _v.y; _pts[i*3 + 2] = _v.z;
    }
    const r = meanRadius(main);
    _d.set((_pts[CENTER*3] - (main.cx || 0))/r, (_pts[CENTER*3 + 1] - (main.cy || 0))/r, (_pts[CENTER*3 + 2] - (main.cz || 0))/r + FORWARD_BIAS).normalize();
    let t = 0;
    for (let pass = 0; pass < MAX_PASSES; pass++){
      let need = 0;
      for (let k = 0; k < count; k++) need = Math.max(need, needed(list ? shape[k] : shape, CLEAR_MARGIN, _d.x, _d.y, _d.z, t));
      if (need <= 1e-6) break;
      t += need;
    }
    _t.copy(_d).multiplyScalar(Math.min(t, 1.3*r));
  }
  if (!S && _t.lengthSq() === 0) return 0;               // testa grande, ma la racchetta non l'ha ancora mai toccata
  const shift = S || (actor.natpfRacketShift = new THREE.Vector3());
  // verso il bersaglio: subito (senza testa, senza tempo o dopo un salto di tempo), altrimenti a velocità limitata
  if (!shape || !(dt > 0) || dt > 0.25) shift.copy(_t);
  else {
    const gap = _d.subVectors(_t, shift), far = gap.length(), step = (release ? RELEASE_RATE : PUSH_RATE)*dt;
    if (far <= step) shift.copy(_t); else shift.addScaledVector(gap, step/far);
  }
  const amount = shift.length();
  if (amount > 0){
    // dal sistema della testa a quello del perno della racchetta (solo la parte che gira e scala)
    _d.copy(shift).applyMatrix3(_m3.setFromMatrix4(head.matrixWorld));
    _d.applyMatrix3(_m3.setFromMatrix4(_inv.copy(racket.parent.matrixWorld).invert()));
    pos.copy(_d);
    racket.updateMatrixWorld(true);
  }
  // la mano resta sul manico: si sposta di quanto si è spostata la racchetta rispetto a prima
  _o1.setFromMatrixPosition(racket.matrixWorld);
  hand = hand || actor.rig?.handRPivot || actor.parts?.handR;
  if (hand?.parent && _o1.distanceToSquared(_o0) > 1e-12){
    hand.getWorldPosition(_v).add(_o1).sub(_o0);
    hand.position.copy(hand.parent.worldToLocal(_v));
  }
  return amount;
}

// Misura (prove e test): quanto il telaio è dentro l'ellissoide, da 0 (centro) a 1 (superficie); sopra 1 è fuori.
// È il metodo della revisione: 24 punti del telaio, dove sono adesso, contro la testa senza margine.
// whole = true: tutta la racchetta (anche il piatto delle corde e il manico sopra la mano).
export function racketInHead(actor, shape, head, whole = false){
  const racket = actor?.racketMesh;
  head = head || actor?.parts?.head;
  if (!racket || !head || !shape) return Infinity;
  actor.root.updateMatrixWorld(true);
  _m.copy(head.matrixWorld).invert().multiply(racket.matrixWorld);
  let f = Infinity;
  for (let i = 0, n = whole ? N : FRAME_N; i < n; i++){
    _v.set(PTS[i*3], PTS[i*3 + 1], PTS[i*3 + 2]).applyMatrix4(_m);
    f = Math.min(f, ((_v.x - (shape.cx || 0))/shape.rx)**2 + ((_v.y - (shape.cy || 0))/shape.ry)**2 + ((_v.z - (shape.cz || 0))/shape.rz)**2);
  }
  return Math.sqrt(f);
}
