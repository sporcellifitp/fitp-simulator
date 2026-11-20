// B73 · Passi veri delle mascotte 3D nella card di fine partita (richiesta dell'utente del 16/11 ripresa il 20/11:
// «migliorare le movenze con i piedi: avanti, indietro, destra e sinistra», «falli»; docs/b73/passi-mascotte.md).
// Con i modelli veri (senza browser), come la cattura di natpf_ritratti (giro di prova, poi il giro, 96 campioni con la
// reazione del corpo e il movimento di tutto il personaggio): il piede che sta a terra resta fermo nel mondo mentre il
// corpo si sposta (tutti i movimenti, Drop e Lob, destri e mancini; la «Corsa all'indietro» scivola apposta); i passi
// vanno davvero avanti, indietro, a destra e a sinistra; la figura resta dentro la finestra della card con l'inquadratura
// della cattura; piani dei passi chiusi, un piede alla volta.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CARD_MOVES, CARD_LOOP, CARD_K, cardMove, applyCardMove } from '../src/natpf/natpf_card_moves.js';
import { PLAN_FESTA, PLAN_SALTI, PLAN_TRASCINA, PLAN_INDIETRO, PLANTED, STEP_SCALE, STEP_LIFTOFF, stepPlan, stepsAt, stepsMotion } from '../src/natpf/natpf_card_passi.js';
import { MASCOT_SCALE } from '../src/natpf/natpf_mascot_rig.js';
import { updateNatpfCharacters } from '../src/natpf/natpf_character.js';
import { updatePlayerBodyAnimation } from '../src/player_body_animation.js';
import { frameCamera, visibleBox, PORTRAIT_FOV, PORTRAIT_MAX } from '../src/natpf/natpf_ritratti.js';
import { resetMascotModels, setMascotMode } from '../src/natpf/natpf_mascot_models.js';
import { resetCast } from '../src/natpf/natpf_personaggi.js';
import { engineOf, useModels } from './mascotte-campo.mjs';

const ALL = [...CARD_MOVES.win, ...CARD_MOVES.lose];
const WALKS = { 'win-passi': PLAN_FESTA, 'win-salti': PLAN_SALTI, 'lose-trascina': PLAN_TRASCINA, 'lose-indietro': PLAN_INDIETRO };
// la «Corsa all'indietro» (B69) è un balletto in cui il piede a terra scivola indietro apposta, sul posto
const GLIDE = new Set(['win-corsa']);
const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ctx), set: (t, k, v) => { t[k] = v; return true; } });
test.before(() => { globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) }; });
test.after(() => { delete globalThis.document; resetMascotModels(); setMascotMode(null); resetCast(); });

function stage(lefty = false){
  useModels();
  const E = engineOf();
  if (lefty) for (const a of [E.player, E.opponent]) a.root.scale.x = -1;
  E.step();
  return E;
}
// come natpf_ritratti: _hold (posto di partenza, reazione da capo), giro di prova, poi il giro misurato; a ogni passo la
// reazione del corpo (tre passi), il movimento di tutto il personaggio e la posa sulle ossa. visit(i, actor) a ogni campione
function capture(E, who, move, N, visit){
  const a = E[who], R = a.rig.reaction, dir = (a.sideSign || 1) > 0 ? -1 : 1;
  const base = { pos: a.root.position.clone(), rotY: a.root.rotation.y, rotX: a.root.rotation.x, rotZ: a.root.rotation.z };
  R.active = true; R.type = move.base; R.timer = 0;
  const c = { phase: 'MATCH_OVER', score: { server: 'player' }, ball: null, elapsedTime: 0 };
  let t = 0;
  const adv = dt => {
    for (let i = 0; i < 3; i++){ E.rk[who].update(a, dt/3, c); updatePlayerBodyAnimation(a, dt/3, c); }
    t += dt; applyCardMove(a, move, t, base, dir); updateNatpfCharacters(E); a.root.updateMatrixWorld(true);
  };
  for (let i = 0; i < N; i++) adv(CARD_LOOP/N);
  for (let i = 0; i < N; i++){ adv(CARD_LOOP/N); visit(i, a, base, dir); }
  a.root.position.copy(base.pos); a.root.rotation.set(base.rotX, base.rotY, base.rotZ); a.natpfCardPose = null; updateNatpfCharacters(E);
}
// pianta dei due piedi nel riferimento di chi guarda (metri dal posto di partenza: r destra, f verso chi guarda, y su)
const soles = (a, base, dir) => {
  const p = a.natpfMascot3d.probe(a, {}), v = q => ({ r: dir*(q.x - base.pos.x), f: dir*(q.z - base.pos.z), y: q.y - base.pos.y });
  return { A: v(p.soleA), B: v(p.soleB), root: v(a.root.position) };
};

test('B73: piani dei passi chiusi, un piede alla volta, il corpo a metà fra i piedi, il piede si stacca prima di andare', () => {
  assert.equal(STEP_SCALE, MASCOT_SCALE);
  for (const [id, P] of Object.entries(WALKS)){
    assert.ok(P.closed, `${id}: ogni piede torna al suo posto`);
    for (let i = 0; i <= 400; i++){
      const u = i/400, s = stepsAt(P, u);
      // al più un piede in aria (i passi saltellati staccano anche l'altro, ma in verticale: stessa x e z)
      const swings = P.steps.filter(q => u >= q.u0 && u < q.u1);
      assert.ok(swings.length <= 1, `${id} ${u}: due piedi in aria`);
      assert.ok(Math.abs(s.body[0] - (s.a[0] + s.b[0])/2) < 1e-12 && Math.abs(s.body[1] - (s.a[2] + s.b[2])/2) < 1e-12);
      assert.ok(s.a[1] >= 0 && s.b[1] >= 0);
    }
    // all'inizio e alla fine di ogni passo il piede in aria si alza e si posa in verticale (niente strisciate)
    for (const q of P.steps){
      const at = t => stepsAt(P, q.u0 + t*(q.u1 - q.u0))[q.foot];
      assert.deepEqual([at(STEP_LIFTOFF*0.99)[0], at(STEP_LIFTOFF*0.99)[2]], q.from, `${id}: si stacca prima di andare`);
      const e = at(1 - STEP_LIFTOFF*0.99); assert.ok(Math.abs(e[0] - q.to[0]) < 1e-12 && Math.abs(e[2] - q.to[1]) < 1e-12, `${id}: arriva prima di posarsi`);
      assert.ok(at(STEP_LIFTOFF)[1] > 0.008, `${id}: a inizio passo il piede è già su di ${at(STEP_LIFTOFF)[1]}`);
    }
    const A = stepsMotion(P, 0), B = stepsMotion(P, 1 - 1e-9);
    for (const k of ['right', 'fwd', 'up', 'footL', 'footR']) assert.ok(Math.abs(A[k] - B[k]) < 1e-9, `${id} ${k}: giro chiuso`);
  }
  // «Quattro passi di festa»: avanti (verso chi guarda), a destra, indietro, a sinistra, in quest'ordine
  const body = u => stepsAt(PLAN_FESTA, u).body;
  assert.ok(body(0.25)[1] > 0.16 && Math.abs(body(0.25)[0]) < 1e-9, 'prima avanti');
  assert.ok(body(0.5)[0] > 0.14 && body(0.5)[1] > 0.16, 'poi a destra');
  assert.ok(body(0.75)[0] > 0.14 && Math.abs(body(0.75)[1]) < 1e-9, 'poi indietro');
  assert.ok(Math.abs(body(0.999)[0]) < 1e-9 && Math.abs(body(0.999)[1]) < 1e-9, 'poi a sinistra, al posto di partenza');
  assert.ok(stepsAt(PLAN_INDIETRO, 0.5).body[1] < -0.12, 'sconfitta: due passi indietro');
  assert.ok(stepsAt(PLAN_TRASCINA, 0.5).body[0] > 0.12 && stepsAt(PLAN_SALTI, 0.5).body[0] > 0.14, 'di lato a destra, poi indietro a sinistra');
  // un piano che non si chiude si vede
  assert.equal(stepPlan([{ foot: 'a', to: [0.1, 0], beat: 0 }]).closed, false);
  assert.deepEqual([...PLANTED.a, ...PLANTED.b], [0, 0, 0, 0, 0, 0]);
});

test('B73: il piede a terra resta fermo nel mondo mentre il corpo si sposta (tutti i movimenti, Drop e Lob, destri e mancini)', () => {
  const N = 96, worst = {};
  for (const lefty of [false, true]){
    const E = stage(lefty);
    for (const who of ['player', 'opponent']){
      for (const move of ALL){
        const S = [];
        capture(E, who, move, N, (i, a, base, dir) => S.push(soles(a, base, dir)));
        // tutte le pose dicono dove stanno i piedi (mai più quelli del tennista che salta sotto)
        assert.ok(move.mascot(0.3, { key: 'drop', racketReach: 0.5 }).legs, `${move.id}: piedi della posa`);
        if (GLIDE.has(move.id)) continue;
        for (const F of ['A', 'B']){
          const low = Math.min(...S.map(s => s[F].y));
          for (let i = 0; i < N; i++){
            const s = S[i][F], q = S[(i + N - 1) % N][F];
            if (s.y > low + 0.01 || q.y > low + 0.01) continue;              // in aria
            const d = Math.hypot(s.r - q.r, s.f - q.f);
            worst[move.id] = Math.max(worst[move.id] || 0, d);
            assert.ok(d < 0.002, `${who} ${lefty ? 'mancino' : 'destro'} ${move.id} campione ${i}: il piede ${F} a terra scivola di ${(d*1000).toFixed(1)} mm`);
          }
        }
      }
    }
  }
  console.log(`   B73: scivolata massima del piede a terra fra due campioni (mm): ${Object.entries(worst).map(([k, v]) => `${k} ${(v*1000).toFixed(2)}`).join(', ')}`);
});

test('B73: passi veri avanti, indietro, a destra e a sinistra: il piede fermo dove lo dice il piano, quello in aria si posa più in là', () => {
  const N = 96;
  for (const lefty of [false, true]){
    const E = stage(lefty), m = lefty ? -1 : 1;
    for (const who of ['player', 'opponent']){
      for (const [id, P] of Object.entries(WALKS)){
        const S = [];
        capture(E, who, cardMove(id), N, (i, a, base, dir) => S.push(soles(a, base, dir)));
        const u = i => ((i + 1)/N) % 1;
        // A: lato della racchetta (piede 'a' del piano), B: l'altro
        for (const [F, k] of [['A', 'a'], ['B', 'b']]){
          // fermo: tra la fine di un suo passo e l'inizio del prossimo la pianta non si muove (in pianta)
          let ref = null, prevAir = true, moved = 0;
          for (let i = 0; i < N; i++){
            const uu = u(i), air = P.steps.some(q => q.foot === k && uu >= q.u0 - 1e-9 && uu <= q.u1 + 1e-9);
            if (air){ prevAir = true; continue; }
            const s = S[i][F];
            if (prevAir){ if (ref) moved = Math.max(moved, Math.hypot(s.r - ref.r, s.f - ref.f)); ref = s; prevAir = false; continue; }
            // (al più 2 mm in tutto l'appoggio: con il personaggio piegato in avanti, B63, il piede che si inclina e si
            // raddrizza, natpf_mascot_rig.FOOT_EDGE, sale e scende lungo la verticale del modello, che è inclinata)
            assert.ok(Math.hypot(s.r - ref.r, s.f - ref.f) < 0.002, `${who} ${id} ${F} campione ${i}: il piede fermo si sposta di ${(1000*Math.hypot(s.r - ref.r, s.f - ref.f)).toFixed(1)} mm`);
          }
          // e ogni passo lo posa in un punto nuovo (lungo quanto il piano: unità del modello × scala)
          const len = Math.max(...P.steps.filter(q => q.foot === k).map(q => Math.hypot(q.to[0] - q.from[0], q.to[1] - q.from[1])))*STEP_SCALE;
          assert.ok(moved > 0.9*len, `${who} ${id} ${F}: passo di ${(moved*100).toFixed(1)} cm (piano ${(len*100).toFixed(1)} cm)`);
        }
        // il corpo va dove dice il piano (destra di chi guarda allo specchio per il mancino)
        const R = S.map(s => s.root.r), Fw = S.map(s => s.root.f), rng = a => Math.max(...a) - Math.min(...a);
        if (id === 'win-passi'){
          assert.ok(rng(R) > 0.22 && rng(Fw) > 0.25, `${id}: ${rng(R).toFixed(2)} m di lato, ${rng(Fw).toFixed(2)} m avanti-indietro`);
          assert.ok(Fw[Math.round(N/4) - 1] > 0.25 && m*R[Math.round(N/2) - 1] > 0.22, `${id}: prima avanti, poi a destra (${lefty ? 'sinistra: mancino' : 'destro'})`);
        }
        if (id === 'lose-indietro') assert.ok(Math.min(...Fw) < -0.2 && rng(R) < 1e-6, `${id}: indietro ${Math.min(...Fw).toFixed(2)} m`);
        if (id === 'lose-trascina' || id === 'win-salti') assert.ok(Math.max(...R.map(r => m*r)) > 0.2 && rng(Fw) < 1e-6, `${id}: di lato ${rng(R).toFixed(2)} m`);
      }
    }
  }
});

// vertici visibili di un attore (pelle con le ossa, racchetta) proiettati con la camera: riquadro in [-1, 1]
const _v = new THREE.Vector3();
function projected(root, cam, box){
  root.updateMatrixWorld(true);
  root.traverseVisible(o => {
    if (!o.geometry || !(o.isMesh || o.isLine) || o.isSprite) return;
    const P = o.geometry.attributes.position, step = o.isSkinnedMesh ? 3 : 1;
    for (let i = 0; i < P.count; i += step){
      if (o.isSkinnedMesh) o.getVertexPosition(i, _v); else _v.fromBufferAttribute(P, i);
      _v.applyMatrix4(o.matrixWorld).project(cam);
      box.x0 = Math.min(box.x0, _v.x); box.x1 = Math.max(box.x1, _v.x); box.y0 = Math.min(box.y0, _v.y); box.y1 = Math.max(box.y1, _v.y);
    }
  });
  return box;
}

test('B73: la figura resta dentro la finestra della card con l\'inquadratura della cattura (fotogramma 4:5 e finestra 3:4 dello stesso schermo)', () => {
  const E = stage(false), K = CARD_K, cam = new THREE.PerspectiveCamera(PORTRAIT_FOV, PORTRAIT_MAX.w/PORTRAIT_MAX.h, 0.05, 60), b = new THREE.Box3();
  const out = [], frames = new Map();
  for (const who of ['player', 'opponent']){
    for (const move of ALL){
      // giro di prova: riquadro di tutto il giro (come natpf_ritratti._measure), poi la camera della cattura (_shoot)
      let union = null;
      capture(E, who, move, K, (i, a) => { visibleBox(a.root, b); union = union ? union.union(b) : b.clone(); });
      const a = E[who], dir = (a.sideSign || 1) > 0 ? -1 : 1, f = frameCamera(union.min, union.max, { aspect: PORTRAIT_MAX.w/PORTRAIT_MAX.h });
      cam.position.set(f.center.x + 0.12*f.dist, f.center.y + (move.camUp ?? 0.08)*f.dist, f.center.z + dir*f.dist);
      cam.lookAt(f.center.x, f.center.y, f.center.z); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      // i fotogrammi del giro: la figura vera (vertici) proiettata
      const all = { x0: 1, x1: -1, y0: 1, y1: -1 }, cx = [];
      let h = 0;
      capture(E, who, move, K, (i, a) => {
        const r = projected(a.root, cam, { x0: 1, x1: -1, y0: 1, y1: -1 });
        all.x0 = Math.min(all.x0, r.x0); all.x1 = Math.max(all.x1, r.x1); all.y0 = Math.min(all.y0, r.y0); all.y1 = Math.max(all.y1, r.y1);
        h = Math.max(h, (r.y1 - r.y0)/2); cx.push((r.x0 + r.x1)/2);
      });
      // finestra dello stesso schermo 3:4: il fotogramma 4:5 la copre tagliando i lati (0,75/0,8 della larghezza)
      const cut = 0.75/0.8, travel = (Math.max(...cx) - Math.min(...cx))/2/cut;
      frames.set(`${who}:${move.id}`, { all, h, travel });
      out.push(`${who === 'player' ? 'Drop' : 'Lob'} ${move.id}: x ${all.x0.toFixed(2)}…${all.x1.toFixed(2)}, y ${all.y0.toFixed(2)}…${all.y1.toFixed(2)}, alta ${(100*h).toFixed(0)} %, centro che va di lato ${(100*travel).toFixed(0)} % della finestra`);
      assert.ok(all.x0 > -cut && all.x1 < cut && all.y0 > -1 && all.y1 < 1, `${who} ${move.id}: fuori dalla finestra (x ${all.x0.toFixed(3)}…${all.x1.toFixed(3)}, taglio ±${cut.toFixed(3)}; y ${all.y0.toFixed(3)}…${all.y1.toFixed(3)})`);
      // i passi non rimpiccioliscono la figura più dei balletti che c'erano (robot e disco: 55 % del fotogramma) e si vedono
      // (di lato: il centro si sposta di almeno il 10 % della finestra)
      if (WALKS[move.id]) assert.ok(h > 0.53, `${who} ${move.id}: figura alta il ${(100*h).toFixed(0)} % del fotogramma`);
      if (['win-passi', 'win-salti', 'lose-trascina'].includes(move.id)) assert.ok(travel > 0.1, `${who} ${move.id}: il centro va di lato del ${(100*travel).toFixed(0)} %`);
    }
  }
  console.log('   B73 inquadratura (coordinate del fotogramma, −1…1):\n     ' + out.join('\n     '));
});

test('B73: tra una fetta e l\'altra della fotografia (personaggio rimesso al suo posto) i piedi vanno con lui come nella posa', () => {
  const E = stage(false);
  for (const who of ['player', 'opponent']){
    const a = E[who], dir = (a.sideSign || 1) > 0 ? -1 : 1, move = cardMove('win-passi');
    const base = { pos: a.root.position.clone(), rotY: a.root.rotation.y, rotX: a.root.rotation.x, rotZ: a.root.rotation.z };
    const local = () => { const p = a.natpfMascot3d.probe(a, {}), inv = new THREE.Matrix4().copy(a.root.matrixWorld).invert(); return [p.soleA.applyMatrix4(inv), p.soleB.applyMatrix4(inv)]; };
    // a metà giro il personaggio è 24 cm a destra e 27 cm avanti: piedi rispetto al corpo
    applyCardMove(a, move, 0.5*CARD_LOOP, base, dir); updateNatpfCharacters(E); a.root.updateMatrixWorld(true);
    const moved = local();
    // natpf_ritratti._capture lo rimette al posto di partenza (niente salti in campo) e l'arena lo disegna così
    a.root.position.copy(base.pos); a.root.rotation.set(base.rotX, base.rotY, base.rotZ); updateNatpfCharacters(E); a.root.updateMatrixWorld(true);
    const reset = local();
    for (let i = 0; i < 2; i++) assert.ok(moved[i].distanceTo(reset[i]) < 1e-6, `${who}: piede ${i} a ${moved[i].distanceTo(reset[i])} m da dove stava rispetto al corpo`);
    a.natpfCardPose = null; updateNatpfCharacters(E);
  }
});

// Revisione del B73 (docs/b73/unione.md, «Revisione e sistemazione», rilievo «M1»): nei «Salti di gioia» il saltello alza
// i due piedi nel riferimento del suolo e anche la radice; tra una fetta e l'altra natpf_ritratti._capture rimette la
// radice al posto di partenza e l'arena (in vista per circa 0,5 s prima della card) la disegna così. cardLeg spostava i
// piedi con il personaggio solo in x e z: i piedi restavano sollevati fino a 8 cm con il corpo già a terra. A metà di un
// passo (u 0,33 e 0,58: a 0,5 il saltello vale 0 e la prova passerebbe comunque) i piedi devono restare dove stavano
// rispetto al corpo, e quindi a terra (la quota del piede più basso come a riposo, entro 2 cm: lo scarto che la gamba ha
// anche nel movimento)
test('B73 (revisione): tra una fetta e l\'altra, nei «Salti di gioia», i piedi tornano giù con il corpo (anche la quota)', () => {
  for (const lefty of [false, true]){
    const E = stage(lefty);
    for (const who of ['player', 'opponent']){
      const a = E[who], dir = (a.sideSign || 1) > 0 ? -1 : 1, move = cardMove('win-salti');
      const base = { pos: a.root.position.clone(), rotY: a.root.rotation.y, rotX: a.root.rotation.x, rotZ: a.root.rotation.z };
      const local = () => { const p = a.natpfMascot3d.probe(a, {}), inv = new THREE.Matrix4().copy(a.root.matrixWorld).invert(); return [p.soleA.applyMatrix4(inv), p.soleB.applyMatrix4(inv)]; };
      const quota = () => { const p = a.natpfMascot3d.probe(a, {}); return Math.min(p.soleA.y, p.soleB.y) - base.pos.y; };
      a.natpfCardPose = null; updateNatpfCharacters(E); a.root.updateMatrixWorld(true);
      const riposo = quota();
      for (const u of [0.33, 0.58]){
        applyCardMove(a, move, u*CARD_LOOP, base, dir); updateNatpfCharacters(E); a.root.updateMatrixWorld(true);
        assert.ok(a.root.position.y - base.pos.y > 0.02, `${who} u ${u}: il corpo è in aria (${a.root.position.y - base.pos.y})`);
        const moved = local();
        a.root.position.copy(base.pos); a.root.rotation.set(base.rotX, base.rotY, base.rotZ); updateNatpfCharacters(E); a.root.updateMatrixWorld(true);
        const reset = local(), tag = `${lefty ? 'mancino' : 'destro'} ${who} u ${u}`;
        for (let i = 0; i < 2; i++) assert.ok(moved[i].distanceTo(reset[i]) < 1e-6, `${tag}: piede ${i} a ${(100*moved[i].distanceTo(reset[i])).toFixed(1)} cm da dove stava rispetto al corpo`);
        assert.ok(Math.abs(quota() - riposo) < 0.02, `${tag}: piede più basso a ${(100*(quota() - riposo)).toFixed(1)} cm dalla quota di riposo`);
      }
      a.natpfCardPose = null; updateNatpfCharacters(E);
    }
  }
});
