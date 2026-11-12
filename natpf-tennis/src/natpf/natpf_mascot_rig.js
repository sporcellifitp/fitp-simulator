// B29 · Lob & Drop dai modelli 3D: le animazioni del gioco riportate sulle ossa del modello.
//
// Il motore non muove ossa: muove SEI PARTI del tennista (busto, testa, due mani, due piedi; natpf_character.js) e la
// racchetta, che ha un perno suo. I modelli 3D delle mascotte (public/media/mascotte-*.glb) hanno invece una pelle
// sola e uno scheletro di 24 ossa. Qui, a ogni fotogramma e senza creare oggetti, si leggono le sei parti e si
// scrivono le ossa: così corsa, colpi, servizio, schiacciata, volée, esultanza, destri e mancini, giocatore, CPU,
// Player 2, stesso schermo, moviola e schermo del Player 2 valgono anche per i modelli senza toccare il motore.
// Il punto d'impatto e la fisica non c'entrano: la racchetta resta dove la mette il motore, è la mano che ci va.
//
// TABELLA «parte del tennista → osso» (RIG_TABLE qui sotto):
//   busto            → Hips: posizione (di quanto il busto si è spostato dal riposo) e rotazione;
//   testa            → Head: rotazione; in più Spine02 si piega di quanto la testa si è spostata rispetto al busto;
//   mano della racchetta e mano libera → Arm, ForeArm, Hand del lato giusto: il palmo va dove sta la mano del
//                      tennista (posizione assoluta: la racchetta è lì). Braccio a due ossa, gomito verso dietro e
//                      fuori; se la mano è più lontana del braccio, il braccio si allunga come un peluche;
//   piedi            → Leg del lato giusto: gamba e piede sono un pezzo solo (vedi scripts/mascotte-modelli.py) che
//                      gira intorno all'attacco della gamba; la pianta va dove sta il piede del tennista rispetto al
//                      suo riposo (spostamento, non posizione assoluta: le mascotte stanno a gambe più larghe).
//   Ossa che restano a riposo: Spine01, Spine, neck, le spalle, UpLeg, Foot, ToeBase, head_end, headfront.
//
// ASSI. Il modello guarda verso +z come il tennista; la sua sinistra è a x > 0 (ossa Left…), la destra a x < 0
// (ossa Right…). Nel motore il lato della racchetta è quello a x < 0 (parti Hand_R e Foot_L, perni handR e footL).
// MANCINI. Il motore specchia la radice dell'attore (scala x negativa). Il modello NON si specchia (le scritte DROP,
// LOB e il marchio sul petto resterebbero al contrario): il suo contenitore ha la scala x opposta, e le parti si
// leggono nel sistema della radice con la x cambiata di segno. Così per il mancino la mano della racchetta cade a
// x > 0 e la prende l'osso LeftHand; per il destro RightHand (racketHandBone).
// UNITÀ. Il modello è alto 1; in campo è alto MASCOT_SCALE metri. I conti si fanno nel sistema del modello.
import * as THREE from 'three';

export const MASCOT_BONES = Object.freeze(['Hips', 'Spine02', 'Spine01', 'Spine', 'neck', 'Head', 'head_end', 'headfront',
  'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase']);
// parte del tennista → ossa che la seguono («Lato» = Left o Right, secondo il lato e la mano del giocatore)
export const RIG_TABLE = Object.freeze({
  torso: Object.freeze({ bones: Object.freeze(['Hips']), follows: 'posizione e rotazione' }),
  head: Object.freeze({ bones: Object.freeze(['Head', 'Spine02']), follows: 'rotazione (Head) e inclinazione testa-busto (Spine02)' }),
  handRacket: Object.freeze({ bones: Object.freeze(['LatoArm', 'LatoForeArm', 'LatoHand']), follows: 'posizione del palmo' }),
  handFree: Object.freeze({ bones: Object.freeze(['LatoArm', 'LatoForeArm', 'LatoHand']), follows: 'posizione del palmo' }),
  footRacketSide: Object.freeze({ bones: Object.freeze(['LatoLeg']), follows: 'spostamento della pianta' }),
  footFreeSide: Object.freeze({ bones: Object.freeze(['LatoLeg']), follows: 'spostamento della pianta' }),
});
// Lato del modello che prende le parti del lato della racchetta (x < 0 nel motore): destro per i destri, sinistro
// per i mancini (radice specchiata)
export const racketSide = mirrored => (mirrored ? 'Left' : 'Right');
export const racketHandBone = mirrored => `${racketSide(mirrored)}Hand`;

// Altezza in campo (metri). Il tennista è alto 1,91 m e le mascotte nel codice 1,95 m, ma hanno la testa in cima a
// un corpo lungo. Qui la testa è metà del pupazzo: a 1,6 m è larga 0,85 m (come quella delle mascotte nel codice),
// sta sotto la zona dove passano mano e racchetta nei colpi e copre meno campo a chi gioca. Vedi docs/b29.
export const MASCOT_SCALE = 1.6;
// Riposo delle parti del tennista nel sistema della radice (metri, destro): natpf_character.PART_BASE passato per i
// perni del rig (player_body_animation.MII_RIG_PIVOTS) e la scala 1,16. Il test di unità li confronta con il motore.
export const ENGINE_REST = Object.freeze({
  torso: Object.freeze([0, 0.638, 0]), head: Object.freeze([0, 1.4152, 0]),
  footA: Object.freeze([-0.1218, 0.1508, 0.0116]), footB: Object.freeze([0.1218, 0.1508, 0.0116]),
  handFree: Object.freeze([0.3248, 0.928, 0.1624]),
});
// Forma della testa nel sistema dell'osso Head (unità del modello): ciò che la racchetta non deve attraversare
// (natpf_racket_clear.keepRacketClear). Il primo ellissoide è la testa; per Lob in più la punta e la tesa della visiera.
export const MASCOT_HEAD_SHAPE = Object.freeze({
  drop: Object.freeze([
    Object.freeze({ rx: 0.272, ry: 0.235, rz: 0.275, cx: -0.008, cy: 0.165, cz: 0 }),
    Object.freeze({ rx: 0.075, ry: 0.085, rz: 0.075, cx: -0.2, cy: 0.3, cz: 0.165 }),    // ciuffo sopra la fascia
  ]),
  lob: Object.freeze([
    Object.freeze({ rx: 0.28, ry: 0.236, rz: 0.275, cx: -0.012, cy: 0.172, cz: 0 }),
    Object.freeze({ rx: 0.1, ry: 0.11, rz: 0.1, cx: 0.03, cy: 0.4, cz: -0.03 }),         // punta in cima
    Object.freeze({ rx: 0.2, ry: 0.095, rz: 0.15, cx: -0.14, cy: 0.17, cz: 0.19 }),      // tesa della visiera
  ]),
});
export const mascotModelHeadShape = key => MASCOT_HEAD_SHAPE[key] || null;
// Quanto della rotazione della testa del tennista (sguardo, scatti, esultanza) passa alla testa della mascotte, e
// quanto dell'inclinazione testa-busto passa alla schiena
export const HEAD_TURN = 0.6, SPINE_LEAN = 0.8;
// Punto del palmo che impugna il manico, nel sistema dell'osso della mano (y lungo le dita, z verso il palmo)
export const GRIP_LOCAL = Object.freeze([0, 0.055, 0.02]);
// Mano libera. Il tennista la tiene a 0,93 m, più o meno all'altezza della spalla della mascotte: riportata tale e
// quale resterebbe alzata accanto alla guancia. A riposo il palmo sta qui (sistema del modello, lato sinistro: braccio
// giù e un po' aperto) e segue gli spostamenti della mano del tennista; quando quella si allontana dal suo riposo
// (lancio della palla al servizio, esultanza, rovescio) il palmo passa alla posizione vera, dove sta la palla.
export const FREE_HAND_REST = Object.freeze([0.3, 0.41, 0.1]);
export const FREE_HAND_BLEND = Object.freeze([0.06, 0.3]);       // metri dal riposo: sotto resta bassa, sopra è quella vera
// La mano libera gira intorno alla testa: il tennista la alza dritta sopra la spalla (lancio della palla, esultanza),
// ma lì la mascotte ha la testa. Il palmo non sale oltre FREE_HAND_TOP (frazione del semiasse verticale sopra il centro
// della testa) e, all'altezza della testa, resta fuori dal suo contorno con FREE_HAND_GAP di margine.
export const FREE_HAND_RATE = 12;          // 1/s: quanto in fretta la mano libera insegue il suo bersaglio
export const FREE_HAND_TOP = 0.15, FREE_HAND_GAP = 0.075, FREE_HAND_MIN_REACH = 0.55;
// Passo: i piedi del tennista si spostano di pochi centimetri; alle gambe corte e larghe delle mascotte serve di più
export const LEG_TILT = 0.55;              // quanta dell'inclinazione verso il piede prende la gamba
export const FOOT_EDGE = 0.07;             // di quanto si alza il piede per unità di inclinazione (unità del modello)
export const FOOT_GAIN = 1.8, FOOT_LIFT_DEAD = 0.012;      // sotto 1,2 cm di alzata il piede resta a terra (il tennista fermo sposta il peso)
// Verso del gomito a riposo e in movimento (sistema del modello, lato sinistro: per il destro la x cambia segno):
// fuori, giù e dietro, come il polo dei gomiti del tennista (natpf_character.ELBOW_POLE)
const ELBOW_POLE = Object.freeze([0.25, -0.35, -0.9]), ELBOW_POLE2 = Object.freeze([0.85, -0.5, 0.1]);
// quanto in fretta il verso della piega del gomito insegue quello voluto (1/s)
const BEND_RATE = 12;
// Quanto può allungarsi il braccio prima che la mano resti indietro (oltre, la mano non arriva alla racchetta: non
// capita con le pose del gioco, serve da tetto contro posizioni impossibili)
export const ARM_MAX_STRETCH = 3.5;
// Il braccio comincia ad allungarsi un po' prima di essere teso: resta sempre un poco piegato (un braccio a due ossa
// quasi teso cambia angolo di colpo a ogni piccolo spostamento della mano)
export const ARM_REACH = 0.93;

const _m = new THREE.Matrix4(), _inv = new THREE.Matrix4();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _u = new THREE.Vector3(), _w = new THREE.Vector3();
const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _qi = new THREE.Quaternion();
const _b0 = new THREE.Matrix4(), _b1 = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);

// Base di un osso del braccio: y = verso dell'osso, z = perno del gomito (la normale al piano in cui il braccio si
// piega). Braccio e avambraccio stanno tutti e due in quel piano, quindi la base è sempre ben definita, anche a
// braccio tutto piegato o tutto teso: niente giri improvvisi intorno all'osso.
function basis(out, dir, normal){
  _y.copy(dir).normalize();
  _z.copy(normal).addScaledVector(_y, -normal.dot(_y));
  if (_z.lengthSq() < 1e-10) _z.set(0, 0, 1).addScaledVector(_y, -_y.z);
  if (_z.lengthSq() < 1e-10) _z.set(1, 0, 0);
  _z.normalize(); _x.crossVectors(_y, _z);
  return out.makeBasis(_x, _y, _z);
}
// Verso in cui piega il gomito, perpendicolare all'asse spalla→palmo. Il gomito tira verso il polo (dietro, un po' giù
// e in fuori); quando il braccio punta proprio lungo il polo quel verso non è definito e si usa un secondo polo.
function restBend(out, ax, sx, torsoQ){
  out.set(ELBOW_POLE[0]*sx, ELBOW_POLE[1], ELBOW_POLE[2]).normalize().applyQuaternion(torsoQ);
  out.addScaledVector(ax, -out.dot(ax));                 // lungo quanto il seno dell'angolo tra braccio e polo
  if (out.lengthSq() < 0.03){
    out.set(ELBOW_POLE2[0]*sx, ELBOW_POLE2[1], ELBOW_POLE2[2]).normalize().applyQuaternion(torsoQ);
    out.addScaledVector(ax, -out.dot(ax));
  }
  return out;
}
// In movimento il verso della piega insegue quello voluto partendo da quello del fotogramma prima (portato sul nuovo
// asse): così non salta mai, neanche quando il braccio passa lungo il polo. Senza tempo (scene ferme, prove) o dopo
// un salto di tempo va subito a quello voluto.
function bendDir(out, ax, side, torsoQ, dt){
  restBend(out, ax, side.sx, torsoQ);
  if (side.bendSet && dt > 0 && dt <= 0.25){
    _w.copy(side.bend).addScaledVector(ax, -side.bend.dot(ax));
    if (_w.lengthSq() > 1e-8) out.multiplyScalar(1 - Math.exp(-dt*BEND_RATE)).add(_w.normalize());
  }
  if (out.lengthSq() < 1e-10) out.set(0, 0, -1).addScaledVector(ax, ax.z);
  out.normalize();
  side.bend.copy(out); side.bendSet = true;
  return out;
}

const boneInfo = bone => ({ bone, t: bone.position.clone(), q: bone.quaternion.clone().normalize(), wp: new THREE.Vector3(), wq: new THREE.Quaternion() });

// Prepara il rig di un modello (la scena del GLB o una sua copia, con le ossa a riposo). Restituisce null se manca
// un osso. `group` è il contenitore da mettere nella radice dell'attore.
export function createMascotRig(model, key, scale = MASCOT_SCALE){
  const bones = {};
  model.traverse(o => { if (o.isBone && MASCOT_BONES.includes(o.name) && !bones[o.name]) bones[o.name] = o; });
  for (const n of MASCOT_BONES) if (!bones[n]) return null;
  const group = new THREE.Group();
  group.name = `NatpfMascotte3d-${key}`;
  group.add(model);
  group.scale.setScalar(scale);
  model.updateMatrixWorld(true);
  const B = {};
  // riposo: posizione e rotazione locali, posizione e rotazione nel sistema del modello
  model.matrixWorld.decompose(_p, _q, _s);
  _inv.copy(model.matrixWorld).invert();
  for (const n of MASCOT_BONES){
    const info = B[n] = boneInfo(bones[n]);
    _m.multiplyMatrices(_inv, bones[n].matrixWorld).decompose(info.wp, info.wq, _s);
  }
  const side = name => {
    const sx = name === 'Left' ? 1 : -1, arm = B[`${name}Arm`], fore = B[`${name}ForeArm`], hand = B[`${name}Hand`], leg = B[`${name}Leg`];
    // punto del palmo nel sistema dell'avambraccio (a riposo) e sua distanza dal gomito
    const grip = new THREE.Vector3().fromArray(GRIP_LOCAL).applyQuaternion(hand.q).add(hand.t);
    const gripDir = grip.clone().normalize();                                      // dal gomito al palmo, nel sistema dell'avambraccio
    const armDir = fore.wp.clone().sub(arm.wp).normalize();
    const gripW = new THREE.Vector3().fromArray(GRIP_LOCAL).applyQuaternion(hand.wq).add(hand.wp);
    const foreDir = gripW.clone().sub(fore.wp).normalize();
    // perno del gomito a riposo: come in movimento, dall'asse spalla→palmo e dal verso della piega
    const ax0 = gripW.clone().sub(arm.wp).normalize(), ident = new THREE.Quaternion();
    const normal0 = new THREE.Vector3().crossVectors(ax0, restBend(new THREE.Vector3(), ax0, sx, ident).normalize()).normalize();
    return {
      name, sx, shoulder: B[`${name}Shoulder`], arm, fore, hand, upleg: B[`${name}UpLeg`], leg,
      a: fore.t.length(), b: grip.length(), grip, gripDir,
      // rotazioni di riposo riferite alla base «osso + piega»: basta moltiplicarle per la base di adesso
      armFrom: new THREE.Quaternion().setFromRotationMatrix(basis(new THREE.Matrix4(), armDir, normal0)).invert().multiply(arm.wq),
      foreFrom: new THREE.Quaternion().setFromRotationMatrix(basis(new THREE.Matrix4(), foreDir, normal0)).invert().multiply(fore.wq),
      legLen: leg.wp.y, sole: new THREE.Vector3(leg.wp.x, 0, leg.wp.z),
      elbow: new THREE.Vector3(), palm: new THREE.Vector3(), foot: new THREE.Vector3(), stretch: 1, bend: new THREE.Vector3(), bendSet: false, free: new THREE.Vector3(), freeSet: false,
    };
  };
  return {
    key, scale, group, model, bones, B,
    hips: B.Hips, spine02: B.Spine02, spine01: B.Spine01, spine: B.Spine, neck: B.neck, head: B.Head,
    left: side('Left'), right: side('Right'),
    headShape: (s => (Array.isArray(s) ? s[0] : s))(MASCOT_HEAD_SHAPE[key] || MASCOT_HEAD_SHAPE.drop),
    mirrored: false,
    // stato del fotogramma (sistema del modello)
    hipsP: new THREE.Vector3(), hipsQ: new THREE.Quaternion(), spineP: new THREE.Vector3(), spineQ: new THREE.Quaternion(), torsoQ: new THREE.Quaternion(),
    rootInv: new THREE.Matrix4(),
  };
}

// Parte del tennista nel sistema del modello: posizione (unità del modello) e rotazione. sigma: -1 per il mancino.
function readPart(rig, node, outP, outQ){
  _m.multiplyMatrices(rig.rootInv, node.matrixWorld).decompose(outP, outQ || _q2, _s);
  if (rig.mirrored){ outP.x = -outP.x; if (outQ){ outQ.y = -outQ.y; outQ.z = -outQ.z; } }
  return outP;
}
const _tp = new THREE.Vector3(), _hp = new THREE.Vector3(), _hq = new THREE.Quaternion(), _lean = new THREE.Quaternion();
const _pUp = new THREE.Vector3(), _qUp = new THREE.Quaternion(), _K = new THREE.Vector3(), _F = new THREE.Vector3(), _d = new THREE.Vector3();

// Primo tempo, prima di scostare la racchetta dalla testa: bacino, busto, testa e gambe. Dopo, l'osso della testa
// (rig.head.bone) ha la matrice nel mondo aggiornata: è il «nodo della testa» da dare a keepRacketClear.
export function poseMascotBody(rig, actor){
  const P = actor.parts, root = actor.root;
  if (!P?.torso || !P.head || !root) return false;
  const S = rig.scale, mirrored = root.scale.x < 0;
  rig.mirrored = mirrored;
  rig.group.scale.set(mirrored ? -S : S, S, S);
  root.updateMatrixWorld(true);
  rig.rootInv.copy(root.matrixWorld).invert();
  const R = ENGINE_REST, k = 1/S;
  // busto → bacino: spostamento dal riposo e rotazione
  readPart(rig, P.torso, _tp, rig.torsoQ);
  rig.hipsP.set(_tp.x - R.torso[0], _tp.y - R.torso[1], _tp.z - R.torso[2]).multiplyScalar(k).add(rig.hips.wp);
  rig.hipsQ.multiplyQuaternions(rig.torsoQ, rig.hips.wq);
  rig.hips.bone.position.copy(rig.hipsP); rig.hips.bone.quaternion.copy(rig.hipsQ);
  // testa → inclinazione del busto (Spine02): di quanto il verso busto→testa è cambiato, tolta la rotazione del busto
  readPart(rig, P.head, _hp, _hq);
  _u.subVectors(_hp, _tp).normalize();
  _v.copy(UP).applyQuaternion(rig.torsoQ);
  _lean.setFromUnitVectors(_v, _u); _lean.slerp(_qi.identity(), 1 - SPINE_LEAN);
  // rotazioni nel sistema del modello lungo la schiena: Spine02 (piegata), Spine01, Spine, neck
  _q.multiplyQuaternions(rig.hipsQ, rig.spine02.q).premultiply(_lean);              // Spine02 nel modello
  rig.spine02.bone.quaternion.copy(_qi.copy(rig.hipsQ).invert()).multiply(_q);
  _p.copy(rig.spine02.t).applyQuaternion(rig.hipsQ).add(rig.hipsP);                 // dov'è Spine02
  _p.add(_v.copy(rig.spine01.t).applyQuaternion(_q)); _q.multiply(rig.spine01.q);   // Spine01
  _p.add(_v.copy(rig.spine.t).applyQuaternion(_q)); _q.multiply(rig.spine.q);       // Spine: porta le spalle
  rig.spineP.copy(_p); rig.spineQ.copy(_q);
  _q.multiply(rig.neck.q);                                                          // neck
  // testa → Head: la rotazione della parte, portata sul riposo dell'osso
  // (smorzata: una testa così grande che si gira o si piega quanto quella del tennista sembra cadere)
  _q2.identity().slerp(_hq, HEAD_TURN).multiply(rig.head.wq);
  rig.head.bone.quaternion.copy(_qi.copy(_q).invert()).multiply(_q2);
  // piedi → gambe. Lato della racchetta nel motore: x < 0 (parte Foot_L); nel modello è il destro, o il sinistro
  // per il mancino
  const sideA = mirrored ? rig.left : rig.right, sideB = mirrored ? rig.right : rig.left;
  poseLeg(rig, sideA, P.footL, R.footA, k);
  poseLeg(rig, sideB, P.footR, R.footB, k);
  rig.group.updateMatrixWorld(true);
  return true;
}
function poseLeg(rig, side, foot, rest, k){
  if (!foot) return;
  readPart(rig, foot, _F, null);
  // spostamento del piede dal suo riposo (nel sistema del modello la x del riposo segue il lato)
  const rx = rig.mirrored ? -rest[0] : rest[0];
  side.foot.set(_F.x - rx, Math.max(0, _F.y - rest[1] - FOOT_LIFT_DEAD), _F.z - rest[2]).multiplyScalar(k*FOOT_GAIN).add(side.sole);
  // la coscia resta ferma con il bacino
  _pUp.copy(side.upleg.t).applyQuaternion(rig.hipsQ).add(rig.hipsP);
  _qUp.multiplyQuaternions(rig.hipsQ, side.upleg.q);
  _K.copy(side.leg.t).applyQuaternion(_qUp).add(_pUp);                               // attacco della gamba
  _d.subVectors(side.foot, _K);
  const len = _d.length();
  if (len < 1e-6) _d.copy(DOWN); else _d.multiplyScalar(1/len);
  // la gamba gira dal «giù» di riposo verso la pianta e scorre lungo il suo asse perché la pianta arrivi giusta
  // (solo una parte dell'inclinazione: gamba e piede sono un pezzo solo, e un piede molto inclinato punta nel campo;
  // quello che manca lo fa l'attacco della gamba, che scorre: è un peluche)
  _d.lerp(DOWN, 1 - LEG_TILT).normalize();
  _q.setFromUnitVectors(DOWN, _d).multiply(side.leg.wq);
  _K.copy(side.foot).addScaledVector(_d, -side.legLen);
  // il piede inclinato si alza un poco, perché punta o tallone non scendano sotto il campo
  _K.y += FOOT_EDGE*Math.sqrt(_d.x*_d.x + _d.z*_d.z);
  _qi.copy(_qUp).invert();
  side.leg.bone.quaternion.copy(_qi).multiply(_q);
  side.leg.bone.position.copy(_K.sub(_pUp).applyQuaternion(_qi));
}

const _S = new THREE.Vector3(), _T = new THREE.Vector3(), _E = new THREE.Vector3(), _ax = new THREE.Vector3(), _bend = new THREE.Vector3(), _pole = new THREE.Vector3();
const _qSh = new THREE.Quaternion(), _qArm = new THREE.Quaternion(), _qFore = new THREE.Quaternion();
// Secondo tempo, dopo keepRacketClear (che può aver spostato la mano della racchetta): le braccia.
export function poseMascotArms(rig, actor, dt){
  const P = actor.parts;
  if (!P) return false;
  const handA = P.handR, handB = P.handL;                 // A: lato della racchetta nel motore (x < 0)
  if (handA) handA.updateWorldMatrix(true, false);
  if (handB) handB.updateWorldMatrix(true, false);
  const sideA = rig.mirrored ? rig.left : rig.right, sideB = rig.mirrored ? rig.right : rig.left;
  poseArm(rig, sideA, handA, false, dt);
  poseArm(rig, sideB, handB, true, dt);
  return true;
}
function poseArm(rig, side, hand, free, dt){
  if (!hand) return;
  const k = 1/rig.scale;
  readPart(rig, hand, _T, null);                                                     // dove va il palmo (metri)
  if (free){
    // mano libera: bassa a riposo, alla posizione vera quando la mano del tennista si allontana dal suo riposo
    const R = ENGINE_REST.handFree, dx = _T.x - R[0]*side.sx, dy = _T.y - R[1], dz = _T.z - R[2];
    const far = Math.sqrt(dx*dx + dy*dy + dz*dz), t = Math.min(1, Math.max(0, (far - FREE_HAND_BLEND[0])/(FREE_HAND_BLEND[1] - FREE_HAND_BLEND[0]))), w = t*t*(3 - 2*t);
    _w.set(FREE_HAND_REST[0]*side.sx + dx*k, FREE_HAND_REST[1] + dy*k, FREE_HAND_REST[2] + dz*k);
    _T.multiplyScalar(k).lerp(_w, 1 - w);
    // la mano libera insegue il suo bersaglio con un filo di ritardo: quando il tennista la sposta di colpo (inizio
    // di un colpo, lancio) la mascotte non scatta. Senza tempo (scene ferme, prove) ci va subito.
    if (side.freeSet && dt > 0 && dt <= 0.25) _T.copy(side.free.lerp(_T, 1 - Math.exp(-dt*FREE_HAND_RATE)));
    else { side.free.copy(_T); side.freeSet = true; }
    // fuori dalla testa (il suo centro segue il bacino)
    const H = rig.headShape, cx = rig.head.wp.x + H.cx + rig.hipsP.x - rig.hips.wp.x, cy = rig.head.wp.y + H.cy + rig.hipsP.y - rig.hips.wp.y, cz = rig.head.wp.z + (H.cz || 0) + rig.hipsP.z - rig.hips.wp.z;
    _T.y = Math.min(_T.y, cy + FREE_HAND_TOP*H.ry);
    const v = (_T.y - cy)/(H.ry + FREE_HAND_GAP);
    if (v > -1 && v < 1){
      const f = Math.sqrt(1 - v*v), ex = (H.rx + FREE_HAND_GAP)*f, ez = (H.rz + FREE_HAND_GAP)*f;
      let ox = _T.x - cx, oz = _T.z - cz;
      if (ox*side.sx < 0.02) ox = 0.02*side.sx;                                     // sempre dal suo lato
      const e = Math.sqrt((ox/ex)*(ox/ex) + (oz/ez)*(oz/ez));
      if (e < 1){ _T.x = cx + ox/e; _T.z = cz + oz/e; }
    }
  } else _T.multiplyScalar(k);
  side.palm.copy(_T);
  // spalla: segue la schiena, resta a riposo
  _qSh.multiplyQuaternions(rig.spineQ, side.shoulder.q);
  _S.copy(side.shoulder.t).applyQuaternion(rig.spineQ).add(rig.spineP);
  _S.add(_v.copy(side.arm.t).applyQuaternion(_qSh));                                 // attacco del braccio
  // due ossa: braccio (a) e avambraccio fino al palmo (b); se il palmo è lontano si allungano insieme
  _ax.subVectors(_T, _S);
  let d = _ax.length();
  if (free && d < FREE_HAND_MIN_REACH*(side.a + side.b)){
    // mano libera addosso alla spalla: il verso del braccio cambierebbe di colpo; la si tiene un poco in fuori
    _T.addScaledVector(_w.set(0.8*side.sx, -0.5, 0.33), FREE_HAND_MIN_REACH*(side.a + side.b) - d);
    side.palm.copy(_T);
    _ax.subVectors(_T, _S); d = _ax.length();
  }
  if (d < 1e-6){ _ax.set(side.sx, 0, 0); d = 1e-6; } else _ax.multiplyScalar(1/d);
  const a0 = side.a, b0 = side.b, full = a0 + b0;
  // lontano: si allunga (mai del tutto teso: resta un filo di piega); troppo vicino alla spalla: si accorcia, così le
  // due ossa formano sempre un triangolo e il palmo arriva dove deve
  const near = 1.3*Math.abs(a0 - b0);
  const stretch = d > full*ARM_REACH ? Math.min(ARM_MAX_STRETCH, d/(full*ARM_REACH)) : d < near ? Math.max(0.2, d/near) : 1;
  side.stretch = stretch;
  const A = a0*stretch, Bl = b0*stretch, dd = Math.min(Math.max(d, Math.abs(A - Bl) + 1e-4), A + Bl);
  const x = (A*A - Bl*Bl + dd*dd)/(2*dd), h = Math.sqrt(Math.max(0, A*A - x*x));
  bendDir(_bend, _ax, side, rig.torsoQ, dt);
  _pole.crossVectors(_ax, _bend);                                                    // perno del gomito
  _E.copy(_S).addScaledVector(_ax, x).addScaledVector(_bend, h);
  side.elbow.copy(_E);
  // braccio: base «verso dell'osso + piega» di adesso per la rotazione di riposo riferita alla stessa base
  _qArm.setFromRotationMatrix(basis(_b0, _u.subVectors(_E, _S), _pole)).multiply(side.armFrom);
  side.arm.bone.quaternion.copy(_qi.copy(_qSh).invert()).multiply(_qArm);
  // avambraccio: verso il palmo (se la mano è oltre il tetto dell'allungamento punta comunque verso di lei)
  _qFore.setFromRotationMatrix(basis(_b1, _u.subVectors(_T, _E), _pole)).multiply(side.foreFrom);
  side.fore.bone.quaternion.copy(_qi.copy(_qArm).invert()).multiply(_qFore);
  side.fore.bone.position.copy(side.fore.t).multiplyScalar(stretch);
  // mano: a riposo sull'avambraccio; si allontana dal gomito quanto serve perché il palmo arrivi
  side.hand.bone.position.copy(side.hand.t).addScaledVector(side.gripDir, side.b*(stretch - 1));
}

// Misure per le prove (sistema della radice dell'attore, metri): palmo e pianta delle due parti, allungamento
const _o = new THREE.Vector3();
export function mascotRigProbe(rig, actor, out = {}){
  rig.group.updateMatrixWorld(true);
  const world = (bone, local) => _o.fromArray(local).applyMatrix4(bone.matrixWorld).clone();
  const sideA = rig.mirrored ? rig.left : rig.right, sideB = rig.mirrored ? rig.right : rig.left;
  out.racketHandBone = sideA.hand.bone.name;
  out.palmA = world(sideA.hand.bone, GRIP_LOCAL); out.palmB = world(sideB.hand.bone, GRIP_LOCAL);
  out.stretchA = sideA.stretch; out.stretchB = sideB.stretch;
  // pianta: il punto sotto l'attacco della gamba, nel sistema dell'osso della gamba a riposo
  const sole = side => { _inv.compose(side.leg.wp, side.leg.wq, _s.set(1, 1, 1)).invert(); return _o.copy(side.sole).applyMatrix4(_inv).applyMatrix4(side.leg.bone.matrixWorld).clone(); };
  out.soleA = sole(sideA); out.soleB = sole(sideB);
  return out;
}
