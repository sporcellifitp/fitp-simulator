// NATPF motore base (natpf-tennis/), B8: inquadratura della partita adattata alla forma della finestra o del monitor
// (natpf_camera.js thirdPersonFrame). Nel gioco vero, a 1920×1080 (16:9), 1600×1200 (4:3), 1200×1200 (1:1, come il
// ledwall 2×2) e 1080×1920 (in verticale): con la camera viva del motore proietta angoli del campo e pali della rete e
// controlla che stiano dentro ±0,97 (in verticale almeno singolare e pali; il doppio si riporta), nello sfondo del menu,
// al servizio e con chi gioca largo nello scambio. Con chi gioca in profondità (z 15 e 16,5 m, C16) la camera resta davanti
// al maxischermo del proprio fondo e la sua cassa nera non copre il fondo dell'immagine (revisione B8: sul quadrato e in
// verticale copriva fino a un terzo dell'immagine): si leggono i pixel delle righe in basso del disegno. Poi il
// ridimensionamento: menu fermo e partita passano al quadrato e tornano al 16:9, e la densità dei pixel che cambia
// (finestra spostata su un monitor con un'altra scala).
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome GAME_PORT=3186 node natpf-inquadratura.mjs
//   (SIZES=1200x1200,1080x1920 per provare solo alcune misure)
// Mouse e tastiera in modalità prova (localStorage testInput=1): nessun telefono. Per misurare sempre la stessa posa, in
// partita il gioco si ferma (update) e gira solo il ciclo della camera del motore. Schermate in $OUT (inquadratura-*.png).
// Grafica software (swiftshader) e Chromium senza cornice della finestra: non sostituisce la prova su un monitor vero.
// B28: questa prova è scritta per la calibrazione con i gesti (opzione dello stand «Con i gesti», th.mjs: CAL)
process.env.CAL ||= 'gesti';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3186), LIMIT = .97;
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

// Nella pagina: misura dell'inquadratura con la camera del motore. Angoli del doppio e del singolare (vicini e lontani),
// pali della rete (piede e cima), chi gioca (piedi e testa); frame atteso da natpf_camera.js per la forma dell'area
const MEASURE = async () => {
  const E = window.__natpfTennis, c = E.camera, M = await import('/src/natpf/natpf_camera.js'), S = await import('/src/natpf/natpf_screen.js');
  const vp = S.viewport(), want = M.thirdPersonFrame(vp.w/vp.h), V = c.position.constructor;
  c.updateMatrixWorld();
  const side = E.playerRole === 'p2' ? -1 : 1, B = 11.89;
  const pr = p => { const q = new V(...p).project(c); return [+q.x.toFixed(3), +q.y.toFixed(3), q.z < 1]; };
  const worst = pts => Math.max(...pts.map(p => { const q = pr(p); return q[2] ? Math.max(Math.abs(q[0]), Math.abs(q[1])) : 99; }));
  const posts = [[-6.4, 0, 0], [6.4, 0, 0], [-6.4, 1.07, 0], [6.4, 1.07, 0]];
  const corners = x => [[-x, 0, side*B], [x, 0, side*B], [-x, 0, -side*B], [x, 0, -side*B]];
  const a = side > 0 ? E.player : E.opponent;
  const look = E.cameraLookSmooth, { targetPos, targetLook } = E._computeTargetCameraPose();
  E._frameThirdPerson(targetPos, targetLook);
  // tutti i raggi dell'inquadratura vanno verso il campo: quello che sta dietro la camera (maxischermo) non si vede
  const toCourt = [[-1, -1], [1, -1], [-1, 1], [1, 1]].every(([x, y]) => side*(new V(x, y, .5).unproject(c).z - c.position.z) < 0);
  return {
    vp: [vp.w, vp.h], aspect: +c.aspect.toFixed(4), fov: +c.fov.toFixed(2), wantFov: +want.fov.toFixed(2), dolly: +want.dolly.toFixed(3),
    maxZ: M.THIRD_PERSON.maxZ, screenZ: M.NEAR_SCREEN_Z, camZ: +(side*c.position.z).toFixed(3), toCourt,
    mode: E.manualCameraOverride || E.cameraMode, phase: E.phase,
    pos: c.position.toArray().map(v => +v.toFixed(2)), dist: +c.position.distanceTo(look).toFixed(3),
    settled: +c.position.distanceTo(targetPos).toFixed(3),
    doubles: worst([...corners(5.485), ...posts]), singles: worst([...corners(4.115), ...posts]),
    nearDoubles: [pr([-5.485, 0, side*B]), pr([5.485, 0, side*B])],
    actor: [pr([a.pos.x, 0, a.pos.z]), pr([a.pos.x, 1.9, a.pos.z])],
    pixelRatio: E.renderer.getPixelRatio(), canvas: [E.renderer.domElement.width, E.renderer.domElement.height],
  };
};
// distanza camera → punto guardato della camera della partita con il player al centro (MATCH_CAM, 22,28 m) × dolly
const BASE_DIST = Math.hypot(7.8 - .35, 22.8 - 1.8);
// gioco fermo: il ciclo della camera del motore (_updateCameraRig, lo stesso di update()) a 60 Hz finché la camera arriva
async function settle(p){
  return p.evaluate(() => new Promise(done => {
    const E = __natpfTennis, t0 = performance.now();
    const id = setInterval(() => {
      for (let i = 0; i < 4; i++) E._updateCameraRig(1/60);
      const { targetPos: t, targetLook: l } = E._computeTargetCameraPose(); E._frameThirdPerson(t, l);
      if (E.camera.position.distanceTo(t) < .005 || performance.now() - t0 > 8000){ clearInterval(id); done(); }
    }, 16);
  }));
}
const fmt = m => `fov ${m.fov}° (atteso ${m.wantFov}°), dolly ${m.dolly}, distanza ${m.dist} m, punto più esterno doppio ${m.doubles.toFixed(3)}, singolare ${m.singles.toFixed(3)}, angoli vicini ${JSON.stringify(m.nearDoubles.map(q => q.slice(0, 2)))}`;

// righe in basso del disegno (WebGL, senza l'interfaccia sopra): quota di pixel quasi neri, il colore della cassa del
// maxischermo (0x05080f). Si legge subito dopo il disegno, nello stesso compito (il buffer non è conservato)
const BOTTOM_DARK = (share = .1) => {
  const E = window.__natpfTennis; E.__render();
  const gl = E.renderer.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, rows = Math.max(1, Math.round(H*share));
  const px = new Uint8Array(W*rows*4); gl.readPixels(0, 0, W, rows, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let dark = 0; for (let i = 0; i < px.length; i += 4) if (px[i] < 24 && px[i + 1] < 24 && px[i + 2] < 32) dark++;
  return +(dark/(W*rows)).toFixed(4);
};
const SIZES = process.env.SIZES ? process.env.SIZES.split(',').map(t => t.split('x').map(Number)) : [[1920, 1080], [1600, 1200], [1200, 1200], [1080, 1920]];
const B = await launch();
const report = [];
try {
  for (const [w, h] of SIZES){
    const tag = `${w}x${h}`, portrait = h > w;
    const { ctx, p, errs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0`, { w, h, init: () => { try { localStorage.setItem('natpf-tennis.testInput', '1'); localStorage.setItem('natpf-tennis.controller', 'mouse'); } catch {} } });
    await p.waitForFunction(() => window.__natpfTennis?.player?.model && __natpfTennis.natpfUi?.lobby?.visible && __natpfTennis.natpfBackdrop, null, { timeout: 120000 });
    // il disegno con la grafica software è lento: si disegna solo per le schermate (il ciclo della camera gira lo stesso)
    await p.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; });
    const shot = async name => { await p.evaluate(() => __natpfTennis.__render()); await p.screenshot({ path: `${SP}/inquadratura-${tag}-${name}.png` }); };
    const ok = (m, label) => {
      const fovOk = Math.abs(m.fov - m.wantFov) < .02 && Math.abs(m.aspect - w/h) < .002;
      const inside = portrait ? m.singles <= LIMIT : m.doubles <= LIMIT;
      check(`${tag} ${label}: campo visivo per la forma e ${portrait ? 'singolare e pali' : 'campo del doppio e pali'} dentro ±${LIMIT}`, fovOk && inside, fmt(m));
    };

    // 1) sfondo del menu (inquadratura ferma, camera dello scambio dietro il P1)
    await p.waitForTimeout(400);
    const menu = await p.evaluate(MEASURE);
    ok(menu, 'sfondo del menu');
    await shot('1-menu');
    report.push({ tag, step: 'menu', ...menu });

    // ridimensionamento con il menu fermo (solo a 16:9): al quadrato e ritorno, l'inquadratura cambia subito
    if (w === 1920){
      check(`${tag} sfondo del menu come prima del B8 (45°, camera a 7,8 m e 22,8 m)`, menu.fov === 45 && menu.pos[1] === 7.8 && menu.pos[2] === 22.8 && Math.abs(menu.dist - BASE_DIST) < .05, fmt(menu));
      await p.setViewportSize({ width: 1200, height: 1200 });
      await p.waitForFunction(() => Math.abs(__natpfTennis.camera.aspect - 1) < 1e-3, null, { timeout: 5000 });
      const sq = await p.evaluate(MEASURE);
      check(`${tag} → 1200x1200 con il menu fermo: campo visivo e arretramento subito, campo intero`, sq.fov === 58 && sq.settled < .01 && Math.abs(sq.dist/BASE_DIST - sq.dolly) < .01 && sq.doubles <= LIMIT, fmt(sq));
      await shot('1b-menu-ridimensionato-1x1');
      await p.setViewportSize({ width: w, height: h });
      await p.waitForFunction(w => Math.abs(__natpfTennis.camera.aspect - 16/9) < 1e-3, w, { timeout: 5000 });
      const back = await p.evaluate(MEASURE);
      check(`${tag} ritorno a 16:9 con il menu fermo: di nuovo 45° e camera di prima`, back.fov === 45 && back.pos[2] === 22.8 && back.settled < .01, fmt(back));
      report.push({ tag, step: 'menu→1x1', ...sq }, { tag, step: 'menu→16:9', ...back });
    }
    // 2) partita contro la CPU con mouse e tastiera, al servizio
    await p.evaluate(() => { const U = __natpfTennis.natpfUi; U.lobby.setMode('cpu'); U.lobby.go('match'); });
    await p.waitForTimeout(500);
    await p.click('#btn-start-match');
    await p.waitForFunction(() => __natpfTennis.phase === 'SERVE_STANCE' && !__natpfTennis.natpfBackdrop, null, { timeout: 30000 });
    // il gioco si ferma (la CPU non serve mentre si misura) e gira solo il ciclo della camera del motore, a 60 Hz, finché
    // la camera arriva alla sua posa (inseguimento morbido): misure e schermata della stessa posa
    await p.evaluate(() => { const E = __natpfTennis; E.update = () => {}; });
    await settle(p);
    const serve = await p.evaluate(MEASURE);
    ok(serve, `servizio (${serve.mode}, ${serve.phase})`);
    check(`${tag} servizio: camera arrivata alla posa e arretrata di ${serve.dolly}×`, serve.settled < .05 && Math.abs(serve.dist/BASE_DIST - serve.dolly) < .03, `scarto ${serve.settled} m, distanza ${serve.dist} m su ${BASE_DIST.toFixed(2)} m`);
    await shot('2-servizio');
    report.push({ tag, step: 'servizio', ...serve });

    // 3) scambio con chi gioca largo, fin dove la corsa automatica si ferma (x −5,085 m) e un poco oltre il fondo
    await p.evaluate(() => {
      const E = __natpfTennis, a = E.player;
      a.pos.set(-5.085, 0, 12.2); a.targetPos?.copy?.(a.pos); a.root?.position.copy(a.pos); E.ball.pos.set(-4.5, 1, 9);
      E.phase = 'RALLY'; E.cameraMode = 'RALLY_CAM'; E._snapCameraImmediate();     // gioco fermo: solo posa e camera
    });
    const rally = await p.evaluate(MEASURE);
    const inside = rally.actor.every(q => q[2] && Math.abs(q[0]) <= LIMIT && Math.abs(q[1]) <= LIMIT);
    check(`${tag} scambio, chi gioca largo (x −5,085 m): piedi e testa in vista`, inside && (portrait ? rally.singles : rally.doubles) <= LIMIT, `piedi ${rally.actor[0].slice(0, 2)}, testa ${rally.actor[1].slice(0, 2)}; ${fmt(rally)}`);
    await shot('3-largo');
    report.push({ tag, step: 'largo', ...rally });

    // 3b) chi gioca in profondità (C16), a 15 e 16,5 m dalla rete: camera davanti al maxischermo del proprio fondo, nessuna
    // fascia nera in basso (prima: sul quadrato 12% e 28%, in 9:16 22% e 33% dell'immagine), piedi in vista
    for (const z of [15, 16.5]){
      await p.evaluate(z => {
        const E = __natpfTennis, a = E.player;
        a.pos.set(1, 0, z); a.targetPos?.copy?.(a.pos); a.root?.position.copy(a.pos); E.ball.pos.set(1.5, 1, z - 1);
        E.phase = 'RALLY'; E.cameraMode = 'RALLY_CAM'; E._snapCameraImmediate();
      }, z);
      const m = await p.evaluate(MEASURE), dark = await p.evaluate(BOTTOM_DARK, .1);
      const feet = m.actor[0], front = m.camZ <= m.maxZ + 1e-6 && m.maxZ < m.screenZ && m.toCourt;
      check(`${tag} chi gioca a ${z} m: camera davanti al maxischermo (z ${m.camZ} ≤ ${m.maxZ.toFixed(2)}), niente nero in basso, piedi in vista`,
        front && dark < .05 && feet[2] && Math.abs(feet[0]) <= 1 && feet[1] >= -.97,
        `pixel quasi neri nel 10% in basso ${(dark*100).toFixed(1)}%, piedi ${feet.slice(0, 2)}, camera ${m.pos}; ${fmt(m)}`);
      await p.screenshot({ path: `${SP}/inquadratura-${tag}-3b-profondo-${z}.png` });
      report.push({ tag, step: `profondo ${z}`, dark, ...m });
    }

    // 4) a 16:9, finestra portata al quadrato durante la partita (non in pausa): campo visivo subito, la posa la porta il
    // ciclo della camera (morbido) e arriva all'arretramento del quadrato
    if (w === 1920){
      await p.evaluate(() => { const E = __natpfTennis, a = E.player; E.phase = 'SERVE_STANCE'; E.cameraMode = 'SERVE_CAM'; a.pos.set(1.15, 0, 11.89); a.root?.position.copy(a.pos); E._snapCameraImmediate(); });
      await p.setViewportSize({ width: 1200, height: 1200 });
      await p.waitForFunction(() => Math.abs(__natpfTennis.camera.aspect - 1) < 1e-3, null, { timeout: 5000 });
      const now = await p.evaluate(() => ({ fov: +__natpfTennis.camera.fov.toFixed(2), z: +__natpfTennis.camera.position.z.toFixed(2) }));
      await settle(p);
      const m = await p.evaluate(MEASURE);
      check(`${tag} → 1200x1200 in partita: 58° subito, poi camera arretrata e campo intero`, now.fov === 58 && now.z === 22.8 && m.settled < .05 && Math.abs(m.dist/BASE_DIST - m.dolly) < .03 && m.doubles <= LIMIT, `subito fov ${now.fov}° e camera a z ${now.z}; dopo ${fmt(m)}`);
      await shot('4-partita-ridimensionata-1x1');
      report.push({ tag, step: 'partita→1x1', ...m });
    }
    // 5) densità dei pixel che cambia (finestra spostata su un monitor con un'altra scala), solo al quadrato e per ultima
    // (l'emulazione di Chromium cambia la pagina). Nel Chromium senza finestra delle prove il cambio della sola densità
    // non manda l'avviso della media query (natpf_camera.js watchPixelRatio, provato in node con una finestra finta):
    // si riporta e basta. Con la misura che cambia arriva un «resize», e lì la densità va aggiornata
    if (w === 1200 && h === 1200){
      const cdp = await ctx.newCDPSession(p);
      const read = () => p.evaluate(() => ({ pr: __natpfTennis.renderer.getPixelRatio(), dpr: devicePixelRatio, canvas: [__natpfTennis.renderer.domElement.width, __natpfTennis.renderer.domElement.height], query: matchMedia(`(resolution: ${devicePixelRatio}dppx)`).matches }));
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1.25, mobile: false });
      await p.waitForFunction(() => __natpfTennis.renderer.getPixelRatio() === 1.25, null, { timeout: 3000 }).catch(() => {});
      const only = await read();
      console.log(`    (informazione) solo la densità a 1,25, stessa misura: disegno a ${only.pr} — ${JSON.stringify(only)}`);
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h - 2, deviceScaleFactor: 1.5, mobile: false });
      await p.waitForFunction(() => __natpfTennis.renderer.getPixelRatio() === 1.5, null, { timeout: 5000 }).catch(() => {});
      const d = await read();
      check(`${tag} monitor al 150% (densità 1,5): disegno a 1,5 e canvas ${w*1.5}×${(h - 2)*1.5}`, d.pr === 1.5 && d.canvas[0] === w*1.5 && d.canvas[1] === (h - 2)*1.5 && d.query, JSON.stringify(d));
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 3, mobile: false });
      await p.waitForFunction(() => __natpfTennis.renderer.getPixelRatio() === 2, null, { timeout: 5000 }).catch(() => {});
      const d3 = await read();
      check(`${tag} monitor al 300%: disegno fermo a 2 (prestazioni)`, d3.pr === 2 && d3.canvas[0] === w*2, JSON.stringify(d3));
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h - 2, deviceScaleFactor: 1, mobile: false });
      await p.waitForFunction(() => __natpfTennis.renderer.getPixelRatio() === 1, null, { timeout: 5000 }).catch(() => {});
      const d1 = await read();
      check(`${tag} di nuovo al 100%: disegno a 1`, d1.pr === 1 && d1.canvas[0] === w, JSON.stringify(d1));
      report.push({ tag, step: 'densità', only, d, d3, d1 });
    }
    check(`${tag} nessun errore nella pagina`, errs.length === 0, errs.slice(0, 3).join(' | '));
    await ctx.close();
  }
} finally {
  await B.close();
  stop();
}
console.log('\nmisure:');
for (const r of report) console.log(`${r.tag.padEnd(9)} ${String(r.step).padEnd(12)} ${r.fov != null ? `${fmt(r)}, camera ${r.pos}${r.dark != null ? `, nero in basso ${(r.dark*100).toFixed(1)}%` : ''}` : JSON.stringify(r)}`);
console.log(`schermate in ${SP}`);
summary();
setTimeout(() => process.exit(), 300);
