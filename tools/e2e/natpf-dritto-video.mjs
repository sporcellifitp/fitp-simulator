// NATPF motore base (natpf-tennis/): PROVA «Dritto come nel video» (B23, src/natpf/natpf_forehand_video.js) e la sua
// opzione «Dritto come nel video (prova): Sì · No» nelle Opzioni (natpf-tennis.drittoVideo, ?dritto=video|prima).
// Il gioco vero nel browser, fatto avanzare a passi fissi di 1/60 s (ciclo del gioco fermo, orologio e sorteggi finti:
// la stessa sequenza si ripete uguale): una palla della CPU verso chi gioca, il gesto dalla tastiera del gioco
// (motion_controls._emitSwing, come il tasto 1) in tempo, in anticipo e in ritardo, destro e mancino, e uno scambio
// lungo in cui colpisce anche la CPU. Verifica:
//   1) interruttore: voce nelle Opzioni (Sì di base), clic su «No» e «Sì», scelta salvata dopo aver ricaricato, parametro
//      ?dritto=prima|video che vale più della scelta salvata e non la cambia;
//   2) racchetta sulla palla all'impatto: nel primo fotogramma dopo il colpo il cuore delle corde è alla stessa distanza
//      dal punto in cui la palla è stata colpita, con la prova accesa e spenta (tolleranza: quella di oggi + 1 mm), per il
//      colpo in tempo, in anticipo, in ritardo, per il mancino;
//   3) nessuno scatto: la variazione massima tra due fotogrammi delle ossa del corpo (bacino, collo, piedi, mano libera)
//      con la prova accesa resta sotto le soglie (e si scrive accanto quella di prima);
//   4) su «No» identico a prima: le ossa della stessa sequenza, fotogramma per fotogramma, hanno la stessa impronta di
//      quelle registrate sulla base ae68759 (natpf-simulator unito; tools/e2e/dati/dritto-video-base-ae68759.json;
//      BASELINE=file la rifà, da lanciare con GAME_DIR=<natpf-tennis di ae68759>); accesa, le ossa del dritto cambiano
//      e quelle del rovescio no;
//   4b) il gioco non cambia: partite a passi e sorteggi fissi (senza persone, contro la CPU con un robot, stesso schermo
//      con due robot) con la prova accesa e spenta hanno la stessa impronta di palla, giocatori e punteggio, e la stessa
//      della base; con «Lob & Drop» (modelli 3D) la partita contro la CPU è la stessa e il dritto delle mascotte cambia
//      con la prova (le loro ossa seguono le parti del tennista), con la racchetta sulla palla come prima;
//   5) fotogrammi al secondo non peggiorati: costo dell'animazione dei personaggi per fotogramma e fotogrammi interi
//      (calcolo + disegno), accesa e spenta a blocchi alterni.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-dritto-video.mjs
//   FOGLI=cartella: salva anche i fotogrammi PRIMA/DOPO agli stessi istanti (camera di gioco e camera ravvicinata) per
//     il foglio di confronto (tools/e2e/natpf-dritto-video-foglio.mjs) · SOLO=fogli|interruttore|ossa|partite|mascotte|costo · GAME_PORT (3163)
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, check, summary } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(process.env.GAME_DIR || path.join(here, '../../natpf-tennis'));
const GAME_PORT = +(process.env.GAME_PORT || 3163), SOLO = process.env.SOLO || '', FOGLI = process.env.FOGLI || '', BASELINE = process.env.BASELINE || '';
const BASE_COMMIT = 'ae68759';   // natpf-simulator unito nel ramo della prova: base dei confronti
const REF = process.env.CONFRONTA || path.join(here, `dati/dritto-video-base-${BASE_COMMIT}.json`);
const baseRef = () => (existsSync(REF) ? JSON.parse(readFileSync(REF, 'utf8')) : null);
const KEY = 'natpf-tennis.drittoVideo';
if (FOGLI) mkdirSync(FOGLI, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
process.on('exit', () => { try { vite.kill(); } catch {} });
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await sleep(500); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));
const B = await launch();

// pagina del gioco pronta; saved: valore salvato dell'opzione prima dell'avvio ('1', '0' o null = niente di salvato)
async function game({ saved = null, query = 'intro=0', w = 1280, h = 720 } = {}){
  const ctx = await B.newContext({ viewport: { width: w, height: h } }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.addInitScript(({ KEY, saved }) => {
    // sorteggi ripetibili: generatore con seme, rimesso da capo a ogni sequenza (window.__seme)
    let a = 20261112; window.__seme = n => { a = n >>> 0; };
    Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0)/4294967296; };
    try { localStorage.setItem('natpf-tennis.controller', 'mouse'); localStorage.setItem('natpf-tennis.testInput', '1'); } catch {}
    // solo al primo avvio della pagina (una ricarica deve trovare quello che ha salvato il gioco)
    try { if (!sessionStorage.getItem('dritto-prova')){ if (saved == null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, saved); } sessionStorage.setItem('dritto-prova', '1'); } catch {}
  }, { KEY, saved });
  for (let k = 0; ; k++){
    await p.goto(`http://127.0.0.1:${GAME_PORT}/?${query}`, { waitUntil: 'domcontentloaded' });
    const ok = await p.waitForFunction(() => window.__natpfTennis?.player?.model && __natpfTennis.natpfUi?.lobby, null, { timeout: 60000 }).then(() => true, () => false);
    if (ok) break;
    if (k >= 3) throw new Error('gioco non avviato');
    errs.length = 0;
  }
  await p.waitForTimeout(1200);
  return { ctx, p, errs };
}

// Nella pagina: ciclo del gioco fermo, orologio finto, sequenze a passi fissi. window.__fv:
//   begin({ hand, offset, rally })  rimette tutto in uno stato noto e lancia la palla della CPU verso chi gioca
//   step(n)                          n fotogrammi di 1/60 s; restituisce { f, strike, phase }
//   end()                            misure della sequenza (ossa per fotogramma, scatti, impatto)
//   mode(on)                         accende o spegne la prova (se il gioco la conosce)
const DRIVER = () => {
  const E = __natpfTennis, U = E.natpfUi, V3 = E.ball.pos.constructor;
  U.onboarding?.close?.(); if (!U.testInput) U.toggleTestInput?.(); U.selectController('mouse', { open: false });
  E.hud.hideTitleModal(); E.autoPlayMode = false; E.userHasInteracted = true;
  E.__frame0 = E._natpfFrame; E._natpfFrame = () => 'paused';
  E.__render = E.render.bind(E);
  let clock = 1e6; performance.now = () => clock;
  const DT = 1/60;
  const bones = a => [['bacino', a.rig.hipPivot], ['collo', a.rig.neckPivot], ['testa', a.rig.headBounceGroup], ['piedeDietro', a.rig.footLPivot], ['piedeDavanti', a.rig.footRPivot],
    ['manoLibera', a.rig.handLPivot], ['manoRacchetta', a.rig.handRPivot], ['racchetta', a.racketPivot], ['modello', a.model], ['radice', a.root]];
  const BODY = ['bacino', 'collo', 'piedeDietro', 'piedeDavanti', 'manoLibera'];
  // stato noto di un personaggio: racchetta (racket_kinematics), corpo (player_body_animation), prova
  const still = (a, x, z) => {
    a.pos.set(x, 0, z); a.targetPos.copy(a.pos); a.vel.set(0, 0, 0); a.swingTimer = 0; a.swingCooldown = 0; a.arcVisibleTimer = 0; a.stridePhase = 0; a.swingType = 'forehand';
    if (a.userData) a.userData.natpfPrep = null;
    a.natpfReach = null; a.model.rotation.set(0, 0, 0);
    const T = a.racketKinematics;
    for (const v of [T.wristSpringPos, T.wristSpringVel, T.wristSpringEuler, T.wristSpringOmega, T.prevActorVel]) v.set(0, 0, 0);
    Object.assign(T, { idleTwitchTimer: 1, idleSpinAngle: 0, idleSpinVel: 0, idleSpinCooldown: .9, microWaggleAmp: 1, activeStanceSide: 'forehand', anticipationSide: 'forehand', prepSide: 'forehand',
      stanceSideBlend: 0, rallyTurnOriginX: x, lastBallHitter: '', anticipationCharge: 0, prepCharge: 0, anticipationHeight: 1.05, swingActive: false, isSwinging: false, swingElapsed: 0, swingProgress: 0,
      swingPhase: 'idle', swingSide: 'forehand', swingShotType: 'topspin', isServe: false, recoilTimer: 0, currentWhipSpeed: 1.8, peakWhipSpeed: 0, hasPrevTipWorld: false, lastSyncedSwingTimer: 0 });
    const R = a.rig;
    Object.assign(R, { elapsedTime: 0, hopPhase: 0, prevHopSin: 0, prevHopDerivative: 0, verticalHopOffset: 0, squashY: 1, squashYVel: 0, prevLocalVelX: 0, prevLocalVelZ: 0, wasMoving: false,
      leanPitch: 0, leanRoll: 0, leanPitchVel: 0, leanRollVel: 0, spineTwistY: 0, spineTwistVel: 0, headBouncePitch: 0, headBouncePitchVel: 0, headBounceRoll: 0, headBounceRollVel: 0,
      headScaleBounce: 0, headScaleBounceVel: 0, headLookYaw: 0, headLookPitch: 0, wasSwinging: false, lastSwingType: 'forehand', anticipationCharge: 0, coiledSide: 'forehand', prevPhase: 'RALLY' });
    Object.assign(R.reaction, { active: false, type: null, timer: 0 });
    R.handLPivot.position.set(.28, .8, .14);
    const F = R.natpfFv;
    if (F){ for (const k of Object.keys(F)) F[k] = typeof F[k] === 'boolean' ? false : k === 'after' ? null : k[0] === 'o' ? NaN : 0; F.still = 1; }
  };
  let S = null;
  const strike0 = E._attemptPlayerRallyStrike.bind(E);
  E._attemptPlayerRallyStrike = (e, t) => {
    const b = E.ball.pos.clone(), r = strike0(e, t);
    if (r && !t && S){ S.strikes.push({ f: S.f, ball: [b.x, b.y, b.z], side: E.player.swingType }); S.swungFor = null; }
    return r;
  };
  const v = new V3(), q = E.player.root.quaternion.clone(), q2 = q.clone();
  const feed = () => {
    const sx = S.hand === 'left' ? -1 : 1;
    E.phase = 'RALLY'; E.phaseTimer = 0; E.natpfPaused = false;
    Object.assign(E.ball, { inPlay: true, lastHitter: 'opponent', bounceCountOnCurrentSide: 0, rallyStrokeCount: 1, isPowerShot: false, shotType: 'TOPSPIN' });
    E.ballTrail.clear?.(); E.ball.pos.set(-.5*sx, 1, -11); E.ball.spin.set(0, 0, 0);
    E._launchBallToTarget(E.ball.pos, new V3(S.toX*sx, 0, 8.6), 1.05, { topspin: 14 }); E._natpfPlanPlayer?.();
  };
  const fnv = (h, x) => { h ^= x; return Math.imul(h, 0x01000193) >>> 0; };
  const draw0 = E.renderer.render, BONES3 = ['Hips', 'Spine02', 'Head', 'LeftArm', 'LeftForeArm', 'RightArm', 'RightForeArm', 'LeftLeg', 'RightLeg'];
  const f64 = new Float64Array(1), u8 = new Uint8Array(f64.buffer);
  const api = {
    get engine(){ return E; },
    mode(on){ const L = U.lobby; if (L.setForehandVideo){ L.setForehandVideo(!!on); return true; } return false; },
    begin({ hand = 'right', offset = 0, rally = false, toX = 1.4, pre = false } = {}){
      window.__seme(20261112);
      U.hand.set(hand);
      E.natpfFatigue = null;   // stanchezza della corsa (natpf_skill.fatigueStep): ogni sequenza riparte riposata
      E.elapsedTime = 500; E.cameraTrauma = 0; E.pendingUserSwing = E.pendingP2Swing = E.pendingServeSwing = null; E.natpfTimeScale = 1;
      E.swingVfx?.clearAllTrails?.();
      still(E.player, 0, 11.4); still(E.opponent, 0, -11.6);
      S = { hand, offset, rally, toX, f: 0, strikes: [], swungFor: null, seen: -1, rec: { player: [], opponent: [] }, jerk: { player: {}, opponent: {} }, last: { player: null, opponent: null },
        hits: { player: {}, opponent: {} }, wasSw: { player: false, opponent: false }, rel: { player: [], opponent: [] }, swStart: { player: [], opponent: [] }, prints: [], centre: [], state: [], gestures: [], top: { player: [0, 0, 0, 0], opponent: [0, 0, 0, 0] },
        pre, mprints: [], mcentre: [] };
      feed();
      E._snapCameraImmediate?.();
      return true;
    },
    step(n = 1){
      for (let i = 0; i < n; i++){
        const P = E.natpfPlan, left = P ? P.at + P.t - E.elapsedTime : null, b = E.ball;
        const live = E.phase === 'RALLY' && b.inPlay;
        if (live && b.lastHitter === 'opponent' && left != null && left <= S.offset && S.swungFor !== b.rallyStrokeCount && S.seen !== b.rallyStrokeCount){
          S.seen = S.swungFor = b.rallyStrokeCount; S.gestures.push(S.f);
          E.motionController._emitSwing({ source: 'keyboard', shotType: 'topspin', speed: 1.18, dirX: 0, dirY: -.45 });
        }
        if (!live && S.rally) feed();
        // sorteggi rimessi a ogni fotogramma (seme + numero del fotogramma): quanti numeri consumano voce e suoni, che
        // dipendono da quello che è successo prima nella pagina, non spostano i sorteggi dei fotogrammi dopo
        window.__seme(20261112 + 7919*S.f);
        clock += 1000*DT; E.update(DT); S.f++;
        let h = 0x811c9dc5;
        for (const who of ['player', 'opponent']){
          const a = E[who], T = a.racketKinematics; a.root.updateMatrixWorld(true);
          const now = {}, inv = q.copy(a.root.quaternion).invert();
          for (const [name, o] of bones(a)){
            const loc = [o.position.x, o.position.y, o.position.z, o.quaternion.x, o.quaternion.y, o.quaternion.z, o.quaternion.w];
            for (const x of loc){ f64[0] = x; for (let k = 0; k < 8; k++) h = fnv(h, u8[k]); }
            // posizione e orientamento rispetto alla radice (senza la corsa in campo): per gli scatti
            o.getWorldPosition(v); a.root.worldToLocal(v); o.getWorldQuaternion(q2).premultiply(inv);
            now[name] = [v.x, v.y, v.z, q2.x, q2.y, q2.z, q2.w];
          }
          const prev = S.last[who], J = S.jerk[who];
          if (prev) for (const name of Object.keys(now)){
            const A = prev[name], Bn = now[name], d = Math.hypot(Bn[0] - A[0], Bn[1] - A[1], Bn[2] - A[2]);
            const dot = Math.abs(A[3]*Bn[3] + A[4]*Bn[4] + A[5]*Bn[5] + A[6]*Bn[6]), ang = 2*Math.acos(Math.min(1, dot));
            const j = J[name] || (J[name] = { pos: 0, ang: 0, fp: 0, fa: 0 });
            if (d > j.pos){ j.pos = d; j.fp = S.f; } if (ang > j.ang){ j.ang = ang; j.fa = S.f; }
          }
          S.last[who] = now;
          // colpi: quanti swing per lato
          if (T.swingActive && !S.wasSw[who]){ const kk = T.isServe ? 'serve' : T.swingSide; S.hits[who][kk] = (S.hits[who][kk] || 0) + 1; S.swStart[who].push(S.f); }
          // ossa del corpo rispetto alla radice, fotogramma per fotogramma (per gli scatti di quello che la prova aggiunge)
          S.rel[who].push(BODY.flatMap(n => now[n].map(x => +x.toFixed(6))));
          S.wasSw[who] = !!T.swingActive;
          const W = a.rig.natpfFv, top = S.top[who];
          if (W){ top[0] = Math.max(top[0], W.coil); top[1] = Math.max(top[1], W.drive); top[2] = Math.max(top[2], W.finish); top[3] = Math.max(top[3], W.hop); }
        }
        S.prints.push(h.toString(16));
        // B23 con «Lob & Drop»: il lavoro che il gioco fa prima di disegnare (ossa dei modelli 3D dalle parti del
        // tennista, racchetta fuori dalla testa grande), senza disegnare; impronta delle ossa delle mascotte e corde
        if (S.pre){
          E.renderer.render = () => {}; try { E.__render(); } finally { E.renderer.render = draw0; }
          let m = 0x811c9dc5;
          for (const who of ['player', 'opponent']){
            const R3 = E[who].natpfMascot3dOn && E[who].natpfMascot3d;
            if (R3) for (const n of BONES3){ const qq = R3.bones[n].quaternion; for (const x of [qq.x, qq.y, qq.z, qq.w]){ f64[0] = x; for (let k = 0; k < 8; k++) m = fnv(m, u8[k]); } }
          }
          S.mprints.push(m.toString(16));
          E.player.root.updateMatrixWorld(true); E.player.racketMesh.localToWorld(v.set(0, .545, 0)); S.mcentre.push([v.x, v.y, v.z]);
        }
        const T = E.player.racketKinematics, c = T.getRacketRimWorldPoints().centerWorld, F = E.player.rig.natpfFv;
        S.centre.push([c.x, c.y, c.z]);
        S.state.push({ sw: !!T.swingActive, l: +T.swingProgress.toFixed(3), side: T.swingSide, charge: +T.anticipationCharge.toFixed(3), fv: F ? [+F.coil.toFixed(3), +F.drive.toFixed(3), +F.finish.toFixed(3), +F.hop.toFixed(4), +F.rPrep.toFixed(3), +F.rFin.toFixed(3)] : null });
      }
      return { f: S.f, strike: S.strikes[0] || null, strikes: S.strikes.length, phase: E.phase };
    },
    end(){
      const out = { frames: S.f, strikes: S.strikes, gestures: S.gestures, prints: S.prints, jerk: S.jerk, rel: S.rel, swStart: S.swStart, hits: S.hits, top: S.top, state: S.f <= 200 ? S.state : null, body: BODY, impact: [] };
      // impatto: cuore delle corde nel primo fotogramma dopo il colpo, rispetto al punto in cui la palla è stata colpita
      for (const k of S.strikes){ const c = S.centre[k.f]; if (c) out.impact.push({ f: k.f, side: k.side, d: Math.hypot(c[0] - k.ball[0], c[1] - k.ball[1], c[2] - k.ball[2]), c, ball: k.ball }); }
      if (S.pre){
        out.mprints = S.mprints; out.on3d = [!!E.player.natpfMascot3dOn, !!E.opponent.natpfMascot3dOn]; out.looks = [E.player.natpfLook, E.opponent.natpfLook];
        // corde della racchetta disegnata (dopo lo scostamento dalla testa grande) rispetto al punto del colpo
        out.impact3d = S.strikes.map(k => { const c = S.mcentre[k.f]; return c ? Math.hypot(c[0] - k.ball[0], c[1] - k.ball[1], c[2] - k.ball[2]) : null; });
      }
      return out;
    },
    // disegno del fotogramma corrente: camera di gioco (com'è) o camera ravvicinata dietro chi gioca, come nel trailer
    draw(cam){
      const C = E.camera, a = E.player, keep = [C.position.clone(), C.quaternion.clone(), C.fov];
      if (cam === 'vicina'){
        const sx = S.hand === 'left' ? -1 : 1;
        C.position.set(a.pos.x - 1.25*sx, 1.45, a.pos.z + 2.6); C.fov = 38; C.updateProjectionMatrix();
        C.lookAt(a.pos.x + .1*sx, .95, a.pos.z - .2);
      }
      E._updateEffects?.(0); E.__render();
      C.position.copy(keep[0]); C.quaternion.copy(keep[1]); C.fov = keep[2]; C.updateProjectionMatrix();
      // dove sta chi gioca nel disegno (per ritagliare la camera di gioco)
      const pr = new V3(a.pos.x, .9, a.pos.z).project(C);
      return { x: (pr.x + 1)/2, y: (1 - pr.y)/2 };
    },
    hideUi(){ const cv = E.renderer.domElement; for (const el of document.body.querySelectorAll('*')) if (el !== cv && !el.contains(cv)) el.style.visibility = 'hidden'; },
    // costo (ms per fotogramma) dell'animazione dei due personaggi, e del fotogramma intero (calcolo + disegno)
    cost(n, full){
      const t0 = performance0();
      for (let i = 0; i < n; i++){
        if (full){ clock += 1000*DT; E.update(DT); E.__render(); }
        else { E._updatePlayerAnimation(E.player, DT); E._updatePlayerAnimation(E.opponent, DT); }
      }
      return (performance0() - t0)/n;
    },
  };
  const realPerf = Object.getPrototypeOf(performance).now.bind(performance), performance0 = () => realPerf();
  window.__fv = api;
  return true;
};
const install = p => p.evaluate(DRIVER);
const seq = async (p, o, frames) => { await p.evaluate(o => __fv.begin(o), o); await p.evaluate(n => __fv.step(n), frames); return p.evaluate(() => __fv.end()); };
const mm = x => Math.round(x*1000);

/* ---------- fogli: fotogrammi PRIMA / DOPO agli stessi istanti ---------- */
// istanti rispetto al colpo (fotogrammi a 60 al secondo): preparazione, caricamento, impatto, finale, recupero
const ISTANTI = [['preparazione', -24], ['caricamento', -2], ['impatto', 1], ['finale', 9], ['recupero', 22]];
async function fogli(){
  const g = await game({ saved: '1' }), p = g.p;
  await install(p); await p.evaluate(() => __fv.hideUi());
  const info = {};
  for (const hand of ['right', 'left']){
    await p.evaluate(() => __fv.mode(true));
    const probe = await seq(p, { hand }, 130), f0 = probe.strikes[0]?.f;
    check(`fogli (${hand}): il colpo c'è (fotogramma ${f0})`, f0 > 30 && probe.strikes[0].side === 'forehand', JSON.stringify(probe.strikes[0]));
    for (const [mode, on] of [['prima', false], ['dopo', true]]){
      await p.evaluate(on => __fv.mode(on), on);
      await p.evaluate(o => __fv.begin(o), { hand });
      let f = 0;
      for (const [name, d] of ISTANTI){
        const want = f0 + d; await p.evaluate(n => __fv.step(n), want - f); f = want;
        for (const cam of ['gioco', 'vicina']){
          const at = await p.evaluate(cam => __fv.draw(cam), cam);
          const file = path.join(FOGLI, `${hand === 'left' ? 'mancino-' : ''}${mode}-${cam}-${name}.png`);
          if (cam === 'gioco'){
            // ritaglio attorno a chi gioca (nella camera di gioco è piccolo)
            const W = 1280, H = 720, s = 300, x = Math.round(Math.min(W - s, Math.max(0, at.x*W - s/2))), y = Math.round(Math.min(H - s, Math.max(0, at.y*H - s*.62)));
            await p.screenshot({ path: file, clip: { x, y, width: s, height: s } });
          } else await p.screenshot({ path: file, clip: { x: 280, y: 0, width: 720, height: 720 } });
        }
      }
    }
    info[hand] = { colpo: f0, istanti: Object.fromEntries(ISTANTI.map(([n, d]) => [n, +(d/60).toFixed(3)])) };
  }
  writeFileSync(path.join(FOGLI, 'istanti.json'), JSON.stringify(info, null, 2));
  check('fogli: nessun errore', !g.errs.length, g.errs.join(' | ').slice(0, 300));
  await g.ctx.close();
}
if (FOGLI && !BASELINE && (!SOLO || SOLO === 'fogli')) await fogli();

/* ---------- 1) interruttore: Opzioni, salvataggio, parametro ---------- */
const stato = p => p.evaluate(async K => {
  const M = await import('/src/natpf/natpf_forehand_video.js');
  return { on: M.forehandVideoEnabled(), saved: localStorage.getItem(K), sel: document.querySelector('[data-natpf-dritto].selected')?.dataset.natpfDritto ?? null };
}, KEY);
async function interruttore(){
  const g = await game({ saved: null }), p = g.p;
  const d0 = await stato(p);
  check('niente di salvato: prova accesa di base', d0.on === true && d0.saved == null, JSON.stringify(d0));
  await p.evaluate(() => __natpfTennis.natpfUi.lobby.go('options'));
  await p.waitForSelector('[data-natpf-dritto="0"]', { state: 'visible', timeout: 10000 });
  const row = await p.evaluate(() => {
    const b = document.querySelector('[data-natpf-dritto="1"]'), r = b.closest('.lobby-row'), box = r.getBoundingClientRect(), lab = r.querySelector('.lobby-label').getBoundingClientRect(), seg = r.querySelector('.lobby-seg').getBoundingClientRect();
    return { label: r.querySelector('.lobby-label').textContent.trim(), btns: [...r.querySelectorAll('[data-natpf-dritto]')].map(x => `${x.textContent.trim()}${x.classList.contains('selected') ? '*' : ''}`),
      dentro: box.top >= 0 && box.bottom <= innerHeight && seg.right <= innerWidth && lab.right <= seg.left + 1 };
  });
  check('Opzioni: riga «Dritto come nel video (prova)» con Sì (scelto) e No, dentro lo schermo', row.label === 'Dritto come nel video (prova)' && row.btns.join(' ') === 'Sì* No' && row.dentro, JSON.stringify(row));
  if (FOGLI) await p.screenshot({ path: path.join(FOGLI, 'opzioni.png') });
  await p.click('[data-natpf-dritto="0"]');
  const s1 = await stato(p);
  check('clic su «No»: prova spenta subito e salvata', s1.on === false && s1.saved === '0' && s1.sel === '0', JSON.stringify(s1));
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__natpfTennis?.player?.model && __natpfTennis.natpfUi?.lobby, null, { timeout: 60000 });
  await p.evaluate(() => __natpfTennis.natpfUi.lobby.go('options'));
  const s2 = await stato(p);
  check('pagina ricaricata: resta «No»', s2.on === false && s2.saved === '0' && s2.sel === '0', JSON.stringify(s2));
  await p.click('[data-natpf-dritto="1"]');
  const s3 = await stato(p);
  check('clic su «Sì»: prova accesa e salvata', s3.on === true && s3.saved === '1' && s3.sel === '1', JSON.stringify(s3));
  check('Opzioni: nessun errore', !g.errs.length, g.errs.join(' | ').slice(0, 300));
  await g.ctx.close();
  // parametro nell'indirizzo: vale più della scelta salvata e non la cambia
  for (const [saved, q, want] of [['1', 'dritto=prima', false], ['0', 'dritto=video', true], ['0', 'dritto=boh', false]]){
    const h = await game({ saved, query: `intro=0&${q}` }), s = await stato(h.p);
    await h.p.evaluate(() => __natpfTennis.natpfUi.lobby.go('options'));
    const sel = (await stato(h.p)).sel;
    check(`salvato «${saved === '1' ? 'Sì' : 'No'}» e ?${q}: prova ${want ? 'accesa' : 'spenta'}, scelta salvata intatta`, s.on === want && s.saved === saved && sel === (want ? '1' : '0'), JSON.stringify({ ...s, sel }));
    await h.ctx.close();
  }
}
if (!BASELINE && (!SOLO || SOLO === 'interruttore')) await interruttore();

/* ---------- 2–4) impatto, scatti, «No» identico a prima ---------- */
// sequenze: gesto in tempo, in anticipo (0,14 s prima del punto d'impatto: lo swing aspetta la palla), in ritardo, mancino
const SEQ = { tempo: {}, anticipo: { offset: .14 }, ritardo: { offset: -.05 }, mancino: { hand: 'left' } }, N = 160, RALLY = +(process.env.RALLY || 900);
// Scatti: quello che la prova AGGIUNGE a un osso del corpo (posizione e orientamento rispetto alla radice, accesa meno
// spenta: le due pagine fanno la stessa partita fotogramma per fotogramma) non deve cambiare di colpo tra due
// fotogrammi. Limiti per fotogramma (m e rad a 60 al secondo), come nel test di unità: durante lo swing (dalla partenza a
// 40 fotogrammi dopo, il colpo vero è veloce) e fuori (entrata nella preparazione, finale che si scioglie, corsa).
const BODY_E2E = ['bacino', 'collo', 'piedeDietro', 'piedeDavanti', 'manoLibera'];
const SCATTI = { swing: [.17, .26], fuori: [.05, .08] }, SWING_LEN = 40;
async function ossa(){
  // Ogni modo in una pagina appena aperta, con le sequenze nello stesso ordine: il gioco tiene da una sequenza all'altra
  // qualcosa che questa prova non rimette da capo (il colpo dopo il primo esce un poco diverso), quindi si confrontano
  // solo sequenze partite dallo stesso stato. Pagina «spenta» (scelta salvata No: la prova non parte mai), pagina
  // «accesa», e una seconda pagina «spenta» per vedere che la sequenza è ripetibile.
  const pagina = async saved => {
    const g = await game({ saved }); await install(g.p);
    const r = {}; for (const [k, o] of Object.entries(SEQ)) r[k] = await seq(g.p, o, N);
    r.scambio = await seq(g.p, { rally: true }, RALLY);
    check(`ossa, pagina con la prova ${BASELINE ? 'che non c\'è' : saved === '1' ? 'accesa' : 'spenta'}: nessun errore`, !g.errs.length, g.errs.join(' | ').slice(0, 300));
    return { g, r };
  };
  const A = await pagina('0'), off = A.r; await A.g.ctx.close();
  if (BASELINE){
    mkdirSync(path.dirname(BASELINE), { recursive: true });
    const old = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {};
    writeFileSync(BASELINE, JSON.stringify({ ...old, commit: process.env.COMMIT || BASE_COMMIT, fotogrammi: Object.fromEntries(Object.entries(off).map(([k, r]) => [k, r.frames])), colpi: Object.fromEntries(Object.entries(off).map(([k, r]) => [k, r.strikes.map(s => s.f)])), impronte: Object.fromEntries(Object.entries(off).map(([k, r]) => [k, r.prints])) }) + '\n');
    console.log(`impronte delle ossa scritte in ${BASELINE} (${Object.values(off).reduce((n, r) => n + r.frames, 0)} fotogrammi)`);
    return;
  }
  const C = await game({ saved: '0' }); await install(C.p);
  const again = await seq(C.p, SEQ.tempo, N); await C.ctx.close();
  check('sequenza ripetibile: stesse ossa in due pagine', again.prints.join() === off.tempo.prints.join() && again.strikes[0]?.f === off.tempo.strikes[0]?.f, `colpo ai fotogrammi ${off.tempo.strikes[0]?.f} e ${again.strikes[0]?.f}`);
  const Bp = await pagina('1'), on = Bp.r, g = Bp.g, p = g.p;
  check('il gioco conosce la prova (interruttore dal menu)', await p.evaluate(() => __fv.mode(true)) === true);

  // 2) racchetta sulla palla all'impatto
  for (const k of Object.keys(SEQ)){
    const a = off[k].impact[0], b = on[k].impact[0];
    const gest = on[k].gestures[0], hit = on[k].strikes[0]?.f;
    check(`${k}: racchetta sulla palla all'impatto come prima (tolleranza di oggi + 1 mm)`, !!a && !!b && a.side === 'forehand' && b.side === 'forehand' && a.f === b.f && Math.abs(a.d - b.d) <= .001,
      a && b ? `cuore delle corde a ${mm(b.d)} mm dal punto del colpo (prima ${mm(a.d)} mm); gesto al fotogramma ${gest}, colpo al ${hit}` : `colpo mancante: prima ${JSON.stringify(off[k].strikes)}, dopo ${JSON.stringify(on[k].strikes)}`);
  }
  const t = on.tempo.strikes[0]?.f, e = on.anticipo, l = on.ritardo;
  check('anticipo: il gesto parte prima e lo swing aspetta la palla; ritardo: il colpo arriva dopo', e.gestures[0] <= t - 6 && e.strikes[0]?.f >= e.gestures[0] + 3 && l.strikes[0]?.f > t,
    `in tempo: colpo al fotogramma ${t}; anticipo: gesto ${e.gestures[0]}, colpo ${e.strikes[0]?.f}; ritardo: gesto ${l.gestures[0]}, colpo ${l.strikes[0]?.f}`);

  // 3) nessuno scatto: variazione massima tra due fotogrammi di quello che la prova aggiunge alle ossa del corpo
  const added = (r1, r0, who) => {
    const A = r1.rel[who], Z = r0.rel[who], sw = r1.swStart[who], n = Math.min(A.length, Z.length), m = {};
    const inSwing = f => sw.some(s => f >= s - 1 && f <= s + SWING_LEN);
    for (let f = 1; f < n; f++) BODY_E2E.forEach((bone, b) => {
      const o = b*7, d = k => (A[f][o + k] - Z[f][o + k]) - (A[f - 1][o + k] - Z[f - 1][o + k]);
      const pos = Math.hypot(d(0), d(1), d(2)), rot = 2*Math.hypot(d(3), d(4), d(5), d(6)), w = inSwing(f) ? 'swing' : 'fuori', x = (m[bone] ||= { swing: [0, 0, 0, 0], fuori: [0, 0, 0, 0] })[w];
      if (pos > x[0]){ x[0] = pos; x[3] = f; } if (rot > x[1]){ x[1] = rot; x[2] = f; }
    });
    return m;
  };
  for (const k of [...Object.keys(SEQ), 'scambio']) for (const who of k === 'scambio' ? ['player', 'opponent'] : ['player']){
    const m = added(on[k], off[k], who), bad = [], txt = [];
    for (const bone of BODY_E2E) for (const w of ['fuori', 'swing']){
      const [pos, rot, f] = m[bone][w], [P, R] = SCATTI[w];
      if (pos > P) bad.push(`${bone} ${w}: ${mm(pos)} mm al fotogramma ${m[bone][w][3]}`);
      if (rot > R) bad.push(`${bone} ${w}: ${rot.toFixed(3)} rad al fotogramma ${f}`);
    }
    for (const bone of BODY_E2E) txt.push(`${bone} ${mm(m[bone].fuori[0])} mm/${m[bone].fuori[1].toFixed(3)} rad fuori, ${mm(m[bone].swing[0])}/${m[bone].swing[1].toFixed(3)} nello swing`);
    check(`${k}, ${who === 'player' ? 'chi gioca' : 'CPU'}: nessuno scatto in quello che la prova aggiunge alle ossa del corpo`, !bad.length, (bad.length ? `oltre i limiti: ${bad.join(', ')} · ` : '') + txt.join(', '));
  }
  // per informazione: movimento massimo assoluto tra due fotogrammi, accesa e spenta
  const J = (r, who) => BODY_E2E.map(b => { const j = r.jerk[who][b]; return `${b} ${mm(j.pos)}/${j.ang.toFixed(2)}`; }).join(', ');
  console.log(`movimento massimo tra due fotogrammi (mm/rad), scambio, chi gioca: accesa ${J(on.scambio, 'player')} · spenta ${J(off.scambio, 'player')}`);
  const rk = on.scambio.jerk.player.racchetta, rk0 = off.scambio.jerk.player.racchetta;
  check('scambio: lo scatto più grande della racchetta non è più grande di prima', rk.pos <= rk0.pos + .03, `${mm(rk.pos)} mm tra due fotogrammi (prima ${mm(rk0.pos)})`);
  const H = on.scambio.hits, top = on.scambio.top;
  check('scambio: dritti di chi gioca e della CPU con le pose della prova', (H.player.forehand || 0) >= 2 && (H.opponent.forehand || 0) >= 1 && top.player[2] > .9 && top.opponent[2] > .9 && top.player[0] > .9,
    `chi gioca ${JSON.stringify(H.player)}, CPU ${JSON.stringify(H.opponent)}; pesi massimi (preparazione, impatto, finale, saltello) chi gioca ${top.player.map(x => +x.toFixed(2))}, CPU ${top.opponent.map(x => +x.toFixed(2))}`);

  // 4) su «No» identico a prima (base ae68759), accesa diversa solo attorno al dritto
  const ref = baseRef();
  if (ref?.impronte){
    for (const k of [...Object.keys(SEQ), 'scambio']){
      const diff = off[k].prints.map((h, i) => (h === ref.impronte[k][i] ? -1 : i)).filter(i => i >= 0);
      check(`${k}: su «No» le ossa dei due personaggi sono quelle di ${ref.commit}, fotogramma per fotogramma`, off[k].prints.length === ref.impronte[k].length && !diff.length, `${off[k].prints.length} fotogrammi, diversi ${diff.length}${diff.length ? ` (dal ${diff[0]})` : ''}`);
    }
  } else check(`riferimento delle ossa di ${BASE_COMMIT} presente`, false, REF);
  for (const k of Object.keys(SEQ)){
    const diff = on[k].prints.map((h, i) => (h === off[k].prints[i] ? -1 : i)).filter(i => i >= 0), hit = on[k].strikes[0]?.f;
    check(`${k}: accesa, le ossa cambiano attorno al dritto e solo lì`, diff.length >= 40 && diff[0] > 5 && diff.includes(hit) && diff.includes(hit + 8), `${diff.length} fotogrammi su ${N} diversi da prima, dal ${diff[0]} al ${diff.at(-1)} (colpo al ${hit})`);
  }
  check('ossa: nessun errore', !g.errs.length, g.errs.join(' | ').slice(0, 300));
  await g.ctx.close();
}
if (!SOLO || SOLO === 'ossa' || BASELINE) await ossa();

/* ---------- 4b) il gioco non cambia: partite a passi e sorteggi fissi; «Lob & Drop» ---------- */
// Come in natpf-lob-drop.mjs: partita in una pagina appena aperta, un passo da 1/60 s alla volta, a ogni passo il lavoro
// che il gioco fa prima di disegnare (qui c'è l'animazione dei personaggi e quindi la prova) e ogni 300 passi un disegno
// vero; impronta di palla, giocatori e punteggio ogni 6 passi. mode: 'demo' (le due parti giocano da sole), 'cpu'
// (contro la CPU, un robot fa i gesti di chi gioca), 'schermo' (stesso schermo, due robot).
const PARTITE = { demo: { mode: 'demo', seed: 4242, steps: 3600 }, cpu: { mode: 'cpu', seed: 31337, steps: 2600 }, schermo: { mode: 'schermo', seed: 555, steps: 2600 } };
const play = (p, o) => p.evaluate(o => {
  const E = __natpfTennis, { steps, mode, seed } = o;
  if (!E.__frame0){ E.__frame0 = E._natpfFrame; E._natpfFrame = () => 'paused'; }
  E.natpfUi.onboarding?.close?.(); E.hud.hideTitleModal(); E.userHasInteracted = true; E.natpfPaused = false;
  for (const a of [E.player, E.opponent]){
    a.model.scale.setScalar(1.16); a.rig = null; E.bodyAnimator.setupArticulatedPlayerRig(a); a.racketKinematics = null; E.racketKinematics.initActor(a);
    a.natpfReach = null; if (a.userData) a.userData.natpfPrep = null; a.stridePhase = 0; a.swingTimer = 0; a.vel?.set(0, 0, 0);
  }
  E._natpfBackdropPose();
  if (mode === 'schermo'){ const m0 = E.isMultiplayer; E.isMultiplayer = true; E.render(); E.isMultiplayer = m0; }
  window.__seme(seed); E.elapsedTime = 0; E.physicsAccumulator = 0;
  if (mode === 'demo'){ E.autoPlayMode = true; E.startNewMatch({ showStartBanner: false }); E.autoPlayMode = true; }
  else { E.autoPlayMode = false; if (mode === 'schermo') E.startSplit(); E.startNewMatch({ showStartBanner: false }); E.autoPlayMode = false; }
  const draw = E.renderer.render, before = () => { E.renderer.render = () => {}; try { E.render(); } finally { E.renderer.render = draw; } };
  let h = 0x811c9dc5, hits = 0, last = 0, pts = 0, score = '', fh = 0, posed = 0;
  const was = new Map();
  const eat = v => { const n = Math.round(v*1000) | 0; for (let k = 0; k < 4; k++){ h ^= (n >>> (k*8)) & 255; h = Math.imul(h, 0x01000193) >>> 0; } };
  const evt = extra => ({ speed: 1.18, shotType: 'topspin', source: 'keyboard', ...extra });
  for (let i = 0; i < steps; i++){
    if (mode !== 'demo'){
      const sv = E.score.server, b = E.ball;
      if (E.phase === 'SERVE_STANCE' && E.phaseTimer > .9){ if (sv === 'player') E._handleUserTossInput({}); else if (mode === 'schermo') E._handleP2TossInput({}); }
      else if (E.phase === 'SERVE_TOSS' && b.vel.y < .6 && E.phaseTimer > .3 && i % 3 === 0){ if (sv === 'player') E._handleUserSwingInput(evt({ shotType: 'flat', speed: 1.3 })); else if (mode === 'schermo') E._handleP2SwingInput(evt({ shotType: 'flat', speed: 1.3 })); }
      else if (E.phase === 'RALLY' && i % 7 === 0){
        if (b.lastHitter === 'opponent' && b.pos.z > 5) E._handleUserSwingInput(evt({ shotType: i % 3 ? 'topspin' : 'slice' }));
        if (mode === 'schermo' && b.lastHitter === 'player' && b.pos.z < -5) E._handleP2SwingInput(evt({ shotType: i % 2 ? 'topspin' : 'lob' }));
      }
    }
    E.update(1/60);
    const b = E.ball, s = E.score;
    if (b.rallyStrokeCount !== last){ if (b.rallyStrokeCount > last) hits++; last = b.rallyStrokeCount; }
    if (i % 300 === 0) E.render(); else before();
    // quante volte la prova ha messo le sue pose (per sapere che nella partita c'era davvero)
    for (const a of [E.player, E.opponent]){ const F = a.rig?.natpfFv; if (F?.finish > .5) posed++; const T = a.racketKinematics, sw = !!T?.swingActive; if (sw && !was.get(a) && T.swingSide === 'forehand' && !T.isServe) fh++; was.set(a, sw); }
    const sc = `${s.playerPoints}-${s.opponentPoints}/${s.playerGames}-${s.opponentGames}`;
    if (sc !== score){ score = sc; pts++; }
    if (i % 6 === 0) for (const v of [b.pos.x, b.pos.y, b.pos.z, E.player.pos.x, E.player.pos.z, E.opponent.pos.x, E.opponent.pos.z, s.playerPoints, s.opponentPoints, s.playerGames, s.opponentGames]) eat(v);
  }
  E.autoPlayMode = false;
  return { hash: h.toString(16), hits, changes: pts - 1, score, posed, fh, looks: [E.player.natpfLook, E.opponent.natpfLook], on3d: [!!E.player.natpfMascot3dOn, !!E.opponent.natpfMascot3dOn] };
}, o);
const wait3d = p => p.waitForFunction(() => { const E = __natpfTennis; E.render(); return E.player.natpfMascot3dOn && E.opponent.natpfMascot3dOn; }, null, { timeout: 60000, polling: 250 }).then(() => true, () => false);
async function partite(){
  const res = {};
  for (const [name, run] of Object.entries(PARTITE)) for (const saved of BASELINE ? [null] : ['1', '0']){
    const g = await game({ saved, w: 640, h: 360 }), r = await play(g.p, run);
    res[`${name}:${saved}`] = r;
    check(`partita ${name}${BASELINE ? '' : `, prova ${saved === '1' ? 'accesa' : 'spenta'}`}: giocata, nessun errore`, r.hits >= 6 && !g.errs.length, `${r.hash}, ${r.hits} colpi, punteggio ${r.score}, dritti ${r.fh}, passi con il finale della prova ${r.posed}${g.errs.length ? ' · ' + g.errs.join(' | ').slice(0, 200) : ''}`);
    await g.ctx.close();
  }
  if (BASELINE){
    const old = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {};
    writeFileSync(BASELINE, JSON.stringify({ ...old, commit: process.env.COMMIT || BASE_COMMIT, partite: Object.fromEntries(Object.keys(PARTITE).map(n => [n, res[`${n}:null`].hash])) }) + '\n');
    console.log(`impronte delle partite scritte in ${BASELINE}`);
    return;
  }
  const ref = baseRef();
  for (const name of Object.keys(PARTITE)){
    const A = res[`${name}:1`], Z = res[`${name}:0`];
    check(`partita ${name}: stessa impronta con la prova accesa e spenta (il gioco non cambia), e la prova c'era`, A.hash === Z.hash && A.posed > 20 && Z.posed === 0, `${A.hash} / ${Z.hash}; passi con il finale della prova ${A.posed} e ${Z.posed}`);
    check(`partita ${name}: identica alla base ${BASE_COMMIT}`, ref?.partite?.[name] === A.hash, `${ref?.partite?.[name]} base, ${A.hash} ora`);
  }
  // «Lob & Drop» (B24/B29): la stessa partita contro la CPU con i modelli 3D e la prova accesa
  const g = await game({ saved: '1', w: 640, h: 360, query: 'intro=0&personaggi=lobdrop' });
  const ok3d = await wait3d(g.p), L = await play(g.p, PARTITE.cpu);
  check('«Lob & Drop», prova accesa: partita contro la CPU identica a quella con i personaggi classici', ok3d && L.hash === res['cpu:1'].hash && L.looks.join() === 'drop,lob' && L.on3d.every(Boolean) && L.posed > 20 && !g.errs.length,
    `${L.hash} / ${res['cpu:1'].hash}, in campo ${L.looks} (modelli 3D ${L.on3d}), passi con il finale della prova ${L.posed}${g.errs.length ? ' · ' + g.errs.join(' | ').slice(0, 200) : ''}`);
  await g.ctx.close();
}
if (!SOLO || SOLO === 'partite' || BASELINE) await partite();

// «Lob & Drop» con i modelli 3D: il dritto delle mascotte segue la prova (le loro ossa leggono le parti del tennista);
// la racchetta disegnata (dopo lo scostamento dalla testa grande) è sulla palla al colpo come con la prova spenta
async function mascotte(){
  const g = await game({ saved: null, query: 'intro=0&personaggi=lobdrop' }), p = g.p; await install(p);
  const ok3d = await wait3d(p);
  const run = {};
  for (const [k, on] of [['off', false], ['on', true]]){
    await p.evaluate(on => __fv.mode(on), on);
    for (const [name, o] of [['tempo', {}], ['mancino', { hand: 'left' }]]) run[`${k}:${name}`] = await seq(p, { ...o, pre: true }, N);
  }
  for (const name of ['tempo', 'mancino']){
    const A = run[`off:${name}`], Z = run[`on:${name}`], hit = Z.strikes[0]?.f;
    const diff = Z.mprints.map((h, i) => (h === A.mprints[i] ? -1 : i)).filter(i => i >= 0);
    check(`«Lob & Drop» (${name}): modelli 3D in campo, il dritto delle mascotte cambia con la prova attorno al colpo`, ok3d && Z.on3d.every(Boolean) && Z.looks.join() === 'drop,lob' && diff.length >= 30 && diff.includes(hit) && diff.includes(hit + 8),
      `modelli 3D ${Z.on3d}, ${diff.length} fotogrammi su ${N} con ossa diverse, dal ${diff[0]} al ${diff.at(-1)} (colpo al ${hit})`);
    check(`«Lob & Drop» (${name}): racchetta disegnata sulla palla al colpo come con la prova spenta (± 1 mm)`, A.impact3d?.[0] != null && Z.impact3d?.[0] != null && A.strikes[0]?.f === hit && Math.abs(A.impact3d[0] - Z.impact3d[0]) <= .001,
      `corde a ${mm(Z.impact3d?.[0] ?? NaN)} mm dal punto del colpo (spenta ${mm(A.impact3d?.[0] ?? NaN)} mm)`);
  }
  if (FOGLI){
    // fotogrammi per il foglio: Drop (chi gioca) prima / dopo agli istanti del foglio, camera ravvicinata
    const f0 = run['on:tempo'].strikes[0].f;
    await p.evaluate(() => __fv.hideUi());
    for (const [mode, on] of [['prima', false], ['dopo', true]]){
      await p.evaluate(on => __fv.mode(on), on); await p.evaluate(o => __fv.begin(o), { pre: true });
      let f = 0;
      for (const [name, d] of ISTANTI){
        const want = f0 + d; await p.evaluate(n => __fv.step(n), want - f); f = want;
        await p.evaluate(cam => __fv.draw(cam), 'vicina');
        await p.screenshot({ path: path.join(FOGLI, `lobdrop-${mode}-vicina-${name}.png`), clip: { x: 280, y: 0, width: 720, height: 720 } });
      }
    }
  }
  check('«Lob & Drop»: nessun errore', !g.errs.length, g.errs.join(' | ').slice(0, 300));
  await g.ctx.close();
}
if (!BASELINE && (!SOLO || SOLO === 'mascotte')) await mascotte();

/* ---------- 5) fotogrammi al secondo non peggiorati ---------- */
async function costo(){
  const g = await game({ saved: null }), p = g.p; await install(p);
  // a) animazione dei due personaggi con la prova al massimo (preparazione piena: la palla è ferma a un passo dal colpo)
  const probe = await seq(p, {}, 130), f0 = probe.strikes[0].f;
  const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
  const anim = { on: [], off: [] };
  for (let i = 0; i < 10; i++){
    const on = i % 2 === 0;
    await p.evaluate(on => __fv.mode(on), on); await p.evaluate(o => __fv.begin(o), {}); await p.evaluate(n => __fv.step(n), f0 - 2);
    await p.evaluate(() => __fv.cost(300, false));
    anim[on ? 'on' : 'off'].push(await p.evaluate(() => __fv.cost(4000, false)));
  }
  const a1 = med(anim.on)*1000, a0 = med(anim.off)*1000;
  check('animazione: la prova costa meno di 0,05 ms a fotogramma (su 16,7)', a1 - a0 < 50, `due personaggi: accesa ${a1.toFixed(1)} µs, spenta ${a0.toFixed(1)} µs a fotogramma (mediana di 5 misure da 4000): ${(a1 - a0 >= 0 ? '+' : '') + (a1 - a0).toFixed(1)} µs`);
  // b) fotogrammi interi (calcolo + disegno) di uno scambio vero, a blocchi alterni
  await p.evaluate(() => __fv.hideUi());
  const full = { on: [], off: [] }, NF = +(process.env.FPS_N || 45);
  for (let i = 0; i < 6; i++){
    const on = i % 2 === 0;
    await p.evaluate(on => __fv.mode(on), on); await p.evaluate(o => __fv.begin(o), { rally: true }); await p.evaluate(n => __fv.step(n), f0 - 20);
    full[on ? 'on' : 'off'].push(await p.evaluate(n => __fv.cost(n, true), NF));
  }
  const avg = a => a.reduce((x, y) => x + y, 0)/a.length, f1 = 1000/avg(full.on), f00 = 1000/avg(full.off);
  // senza GPU (WebGL in software) il campo va a pochi fotogrammi al secondo e la misura oscilla di qualche punto percentuale
  check('fotogrammi al secondo: con la prova non meno del 95% di quelli senza', f1 >= .95*f00, `accesa ${full.on.map(x => (1000/x).toFixed(2)).join(', ')} (media ${f1.toFixed(2)}), spenta ${full.off.map(x => (1000/x).toFixed(2)).join(', ')} (media ${f00.toFixed(2)}); ${NF} fotogrammi per blocco attorno al colpo`);
  if (FOGLI) writeFileSync(path.join(FOGLI, 'misure.json'), JSON.stringify({ animUs: anim, fullMs: full }, null, 2));
  check('costo: nessun errore', !g.errs.length, g.errs.join(' | ').slice(0, 300));
  await g.ctx.close();
}
if (!BASELINE && (!SOLO || SOLO === 'costo')) await costo();

await B.close();
summary();
setTimeout(() => process.exit(), 300);
