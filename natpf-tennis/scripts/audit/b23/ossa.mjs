// B23 · «Su No il dritto è ESATTAMENTE quello di prima». Una sequenza registrata e ripetibile (attesa, corsa, palla in
// arrivo sul dritto, dritto di chi gioca dall'impatto, recupero, rovescio, dritto piatto e dritto tagliato per intero
// come li fa la CPU, servizio, esultanza) fatta girare su un personaggio vero (modello, rig del corpo, racchetta animata)
// senza grafica: per ogni fotogramma l'impronta (sha1) di posizione, rotazione e scala di ogni osso. Tre personaggi:
// destro, mancino (specchiato), avversario (l'altra metà campo).
//
//   node --import ./test/register.mjs scripts/audit/b23/ossa.mjs                      # stampa il riassunto del codice di oggi
//   node --import ./test/register.mjs scripts/audit/b23/ossa.mjs --src=<cartella src di ae68759> --out=scripts/audit/b23/risultati/ossa-ae68759.json
//
// BASE del confronto: ae68759 (natpf-simulator unito in questo ramo, versione 2026-11-12.7). Le impronte fatte sui
// sorgenti di 9b8f9cb (da cui la prova è partita) sono identiche, fotogramma per fotogramma: l'animazione dei
// personaggi non è cambiata tra i due commit.
// Il file in risultati/ è stato fatto così sui sorgenti di ae68759 (git archive ae68759 natpf-tennis/src, con un
// collegamento a node_modules accanto): test/natpf-dritto-video.test.mjs rifà la sequenza con il codice di oggi e la
// prova spenta e confronta le impronte fotogramma per fotogramma.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as THREE from 'three';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SRC = path.resolve(here, '../../../src');
export const GOLDEN = path.join(here, 'risultati/ossa-ae68759.json');
export const DT = 1/60;
export const BASE = 'ae68759';   // commit di riferimento (natpf-simulator unito)

// moduli dell'animazione da una cartella src (quella di oggi o quella di un altro commit)
export async function load(src = SRC){
  const imp = f => import(pathToFileURL(path.join(src, f)).href);
  const [body, rk, ch] = await Promise.all([imp('player_body_animation.js'), imp('racket_kinematics.js'), imp('natpf/natpf_character.js')]);
  return { body, rk, ch };
}

// Come game_engine._preparePlayerActor: stesse parti, stessa scala, stesso ordine
const PART_RE = { head: /^head(\.?0*\d+)?$/i, torso: /^torso(\.?0*\d+)?$/i, handL: /^hand_l(\.?0*\d+)?$/i, handR: /^hand_r(\.?0*\d+)?$/i, footL: /^foot_l(\.?0*\d+)?$/i, footR: /^foot_r(\.?0*\d+)?$/i };
export function mount(M, { sideSign = 1, lefty = false } = {}){
  const role = sideSign > 0 ? 'player' : 'opponent';
  const actor = { role, sideSign, root: new THREE.Group(), model: null, parts: {}, racketPivot: new THREE.Group(), pos: new THREE.Vector3(0, 0, sideSign*11.6),
    vel: new THREE.Vector3(), targetPos: new THREE.Vector3(), stridePhase: 0, swingTimer: 0, swingDuration: .34, swingType: 'forehand', maxSpeed: 9, userData: {} };
  const model = M.ch.createNatpfCharacter(sideSign > 0 ? 'p1' : 'cpu');
  actor.model = model;
  model.traverse(s => {
    s.userData.basePos = s.position.clone(); s.userData.baseRot = s.rotation.clone();
    const n = (s.name || '').trim();
    for (const [k, re] of Object.entries(PART_RE)) if (re.test(n) && (!actor.parts[k] || !s.isMesh)){ actor.parts[k] = s; break; }
  });
  model.scale.setScalar(1.16);
  actor.root.add(model);
  M.body.setupArticulatedPlayerRig(actor);
  const racket = M.ch.createNatpfRacket();
  racket.scale.setScalar(1.22);
  actor.racketMesh = racket;
  actor.racketPivot.position.set(-.36, .9, .16);
  actor.racketPivot.add(racket);
  actor.root.add(actor.racketPivot);
  actor.root.rotation.y = sideSign > 0 ? Math.PI : 0;
  actor.root.position.copy(actor.pos);
  if (lefty){ actor.natpfHand = 'left'; actor.root.scale.x = -1; }
  const rk = new M.rk.RacketKinematicsController();
  rk.initActor(actor);
  return { actor, rk };
}
export const bones = a => [a.rig.hipPivot, a.rig.neckPivot, a.rig.headBounceGroup, a.rig.footLPivot, a.rig.footRPivot, a.rig.handLPivot, a.rig.handRPivot, a.racketPivot, a.model, a.root];
export const BONE_NAMES = ['bacino', 'collo', 'testa', 'piedeDietro', 'piedeDavanti', 'manoLibera', 'manoRacchetta', 'racchetta', 'modello', 'radice'];

// La sequenza: per ogni fotogramma che cosa succede (palla, corsa, colpi). Restituisce le ossa di ogni fotogramma
// (Float64Array: per osso posizione, quaternione, scala) e il nome del tratto.
export const TRATTI = [
  ['attesa', 0, 30], ['palla sul dritto, corsa', 30, 55], ['palla sul dritto, fermo', 55, 90], ['dritto dall\'impatto', 90, 112], ['dopo il dritto, corsa', 112, 170],
  ['palla sul rovescio', 170, 215], ['rovescio intero', 215, 250], ['dritto piatto intero', 250, 290], ['dritto tagliato intero', 290, 340],
  ['servizio: attesa e lancio', 340, 390], ['servizio: colpo', 390, 420], ['fine punto: esultanza', 420, 470],
];
export const FRAMES = TRATTI.at(-1)[2];
export function sequenza(M, { sideSign = 1, lefty = false, onFrame = null } = {}){
  const { actor: a, rk } = mount(M, { sideSign, lefty });
  // lato del dritto in campo: la palla a destra di chi colpisce per il destro, a sinistra per il mancino
  const L = (sideSign > 0 ? 1 : -1)*(lefty ? -1 : 1), back = sideSign;      // back: verso il proprio fondo campo
  const who = sideSign > 0 ? 'player' : 'opponent', other = sideSign > 0 ? 'opponent' : 'player';
  const ball = { inPlay: false, lastHitter: other, pos: new THREE.Vector3(0, -5, 0), vel: new THREE.Vector3(), targetLanding: new THREE.Vector3(), shotType: 'TOPSPIN', isPowerShot: false };
  const ctx = { phase: 'RALLY', score: { server: who }, server: who, ball, elapsedTime: 100, lastPointWinner: null };
  // palla in arrivo verso chi colpisce: a d metri lungo il campo, dal lato side (1 dritto, -1 rovescio)
  const incoming = (d, side, y = 1) => { ball.inPlay = true; ball.lastHitter = other; ball.pos.set(a.pos.x + 1.1*L*side, y, a.pos.z - back*d); ball.vel.set(0, 0, back*14); ball.targetLanding.set(a.pos.x + 1.1*L*side, 0, a.pos.z - back*2); };
  const leaving = n => { ball.inPlay = true; ball.lastHitter = who; ball.pos.set(a.pos.x + .6*L, 1.2 + .02*n, a.pos.z - back*(1 + .35*n)); ball.vel.set(0, 2, -back*21); };
  const out = [];
  for (let f = 0; f < FRAMES; f++){
    a.vel.set(0, 0, 0);
    if (f < 30) ball.inPlay = false;
    else if (f < 90){
      incoming(14*(90 - f)*DT + .4, 1);
      if (f < 55){ a.vel.set(3.2*L, 0, .6*back); a.pos.addScaledVector(a.vel, DT); }
      // preparazione dal telefono negli ultimi fotogrammi, come fa il gesto in anticipo (natpf_skill.holdSwingPrep)
      if (f === 78) a.userData.natpfPrep = { side: 'forehand', amount: 1, until: Infinity };
    } else if (f < 170){
      if (f === 90){
        // colpo di chi gioca: lo swing parte da poco prima dell'impatto (natpf_skill.swingFromContact)
        const st = rk.triggerSwing(a, { shotType: 'topspin', side: 'forehand', speed: 1.18, timing: 'sweet', dirX: .2 });
        st.swingElapsed = Math.max(st.swingElapsed || 0, .24*st.swingDuration); a.userData.natpfPrep = null;
        rk.triggerImpactRecoil(a, 1);
      }
      leaving(f - 90);
      if (f >= 112){ a.vel.set(-2.6*L, 0, -.8*back); a.pos.addScaledVector(a.vel, DT); }
    } else if (f < 250){
      incoming(14*Math.max(0, 215 - f)*DT + .4, -1);
      if (f === 215) rk.triggerSwing(a, { shotType: 'topspin', side: 'backhand', speed: 1.3, timing: 'early', dirX: -.3 });
      if (f > 215) leaving(f - 215);
    } else if (f < 290){
      incoming(14*Math.max(0, 262 - f)*DT + .4, 1, 1.2);
      if (f === 262) rk.triggerSwing(a, { shotType: 'flat', side: 'forehand', speed: 1.5, timing: 'late', dirX: 0 });
      if (f > 262) leaving(f - 262);
    } else if (f < 340){
      incoming(14*Math.max(0, 310 - f)*DT + .4, 1, .7);
      if (f === 310) rk.triggerSwing(a, { shotType: 'slice', side: 'forehand', speed: 1, timing: 'sweet', dirX: 0 });
      if (f > 310) leaving(f - 310);
    } else if (f < 390){
      ctx.phase = f < 360 ? 'SERVE_STANCE' : 'SERVE_TOSS'; ball.inPlay = false; ball.lastHitter = who; ball.vel.set(0, f < 375 ? 4 : -2, 0);
      ball.pos.set(a.pos.x, f < 360 ? 1.1 : 1.1 + 2*Math.sin(Math.PI*Math.min(1, (f - 360)/40)), a.pos.z - back*.4);
    } else if (f < 420){
      ctx.phase = 'RALLY';
      if (f === 390) rk.triggerSwing(a, { shotType: 'serve', isServe: true, speed: 1.4 });
      leaving(f - 390);
    } else { ctx.phase = 'POINT_OVER'; ctx.lastPointWinner = who === 'player' ? 'player' : 'opponent'; ball.inPlay = false; }
    ctx.elapsedTime += DT;
    rk.update(a, DT, ctx);
    M.body.updatePlayerBodyAnimation(a, DT, ctx);
    const B = bones(a), v = new Float64Array(B.length*10);
    B.forEach((o, i) => { v.set([o.position.x, o.position.y, o.position.z, o.quaternion.x, o.quaternion.y, o.quaternion.z, o.quaternion.w, o.scale.x, o.scale.y, o.scale.z], i*10); });
    out.push(v);
    onFrame && onFrame(f, a, ctx, v);
  }
  return out;
}
export const impronta = v => createHash('sha1').update(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)).digest('hex').slice(0, 12);
export const PERSONAGGI = { destro: { sideSign: 1 }, mancino: { sideSign: 1, lefty: true }, avversario: { sideSign: -1 } };
export function impronte(M){
  return Object.fromEntries(Object.entries(PERSONAGGI).map(([k, o]) => [k, sequenza(M, o).map(impronta)]));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)){
  const arg = k => process.argv.find(x => x.startsWith(`--${k}=`))?.slice(k.length + 3);
  const src = arg('src') ? path.resolve(arg('src')) : SRC, P = impronte(await load(src));
  const all = createHash('sha1').update(JSON.stringify(P)).digest('hex').slice(0, 12);
  console.log(`sorgenti: ${src}\n${FRAMES} fotogrammi per personaggio (${Object.keys(P).join(', ')}) · impronta di tutta la sequenza ${all}`);
  if (fs.existsSync(GOLDEN)){
    const G = JSON.parse(fs.readFileSync(GOLDEN, 'utf8')).impronte;
    for (const k of Object.keys(P)){
      const diff = P[k].map((h, i) => (h === G[k][i] ? -1 : i)).filter(i => i >= 0);
      console.log(`${k.padEnd(11)} fotogrammi diversi da ${BASE}: ${diff.length}${diff.length ? ` (dal ${diff[0]} al ${diff.at(-1)})` : ''}`);
      for (const [name, f0, f1] of TRATTI){ const n = diff.filter(i => i >= f0 && i < f1).length; if (n) console.log(`    ${name}: ${n} su ${f1 - f0}`); }
    }
  }
  if (arg('out')){ fs.writeFileSync(path.resolve(arg('out')), JSON.stringify({ commit: BASE, fotogrammi: FRAMES, dt: '1/60', tratti: TRATTI, impronte: P }) + '\n'); console.log('scritto ' + arg('out')); }
}
