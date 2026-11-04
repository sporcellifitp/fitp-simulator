// Fotogrammi chiave per l'intro (docs/PIANO_LAVORI.md, B2, 04/11/2026): arena del gioco senza marchi, senza giocatori,
// senza interfaccia. Le grafiche con i loghi (site/assets/arena) si sostituiscono con pannelli neutri della stessa misura.
//   CAMS='[{"name":"inizio","pos":[0,1.05,15.5],"look":[0,1,0]},{"name":"fine","pos":[0,15,27],"look":[0,0,0.5]}]' \
//   node scripts/audit/intro-fotogrammi.mjs http://127.0.0.1:3131/?intro=0 <uscita> <cartella pannelli neutri>
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const playwright = createRequire('/opt/node-tools/node_modules/x.js')('playwright');
const [url, outDir, neutri] = process.argv.slice(2);
const b = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, proxy: undefined });
await ctx.addInitScript(() => { try { localStorage.setItem('natpf-tennis.controller', 'mouse'); localStorage.setItem('natpf-tennis.testInput', '1'); } catch {} });
await ctx.route(/\/assets\/arena\/([a-z-]+\.png)/, r => { const n = r.request().url().match(/\/assets\/arena\/([a-z-]+\.png)/)[1]; try { r.fulfill({ body: readFileSync(`${neutri}/${n}`), contentType: 'image/png' }); } catch { r.continue(); } });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('pageerror', e.message));
await p.goto(url, { waitUntil: 'load', timeout: 180000 });
await p.waitForFunction(() => window.__natpfTennis?.natpfUi?.lobby && window.__natpfTennis.player?.model, null, { timeout: 180000 });
await p.evaluate(() => { const E = window.__natpfTennis, U = E.natpfUi; U.testInput = true; U.intro?.skip?.(); E.hud.hideTitleModal(); document.getElementById('title-modal')?.classList.add('hidden'); U.lobby?.el?.classList?.add('hidden'); E.autoPlayMode = false; E.userHasInteracted = true; E.persistentStateLock = false; E.startNewMatch({ showStartBanner: false }); });
await p.waitForTimeout(4000);
await p.evaluate(() => {
  const E = window.__natpfTennis, cv = E.renderer?.domElement || document.querySelector('canvas');
  for (const el of document.body.querySelectorAll('*')) if (el !== cv && !el.contains(cv)) el.style.visibility = 'hidden';
  E.autoPlayMode = false; E.phase = 'POINT_OVER'; E.phaseTimer = -1e9;
  for (const a of [E.player, E.opponent]){ for (const o of [a?.root, a?.shadowBlob, a?.model]) if (o) Object.defineProperty(o, 'visible', { get: () => false, set(){}, configurable: true }); }
  for (const a of [E.player, E.opponent]) if (a?.shadowBlob) a.shadowBlob.visible = false;
  if (E.ball?.mesh) E.ball.mesh.visible = false;
  E.ballTrail?.clear?.();
  E.ball.inPlay = false;
});
const cams = JSON.parse(process.env.CAMS);
for (const v of cams){
  await p.evaluate(v => { const E = window.__natpfTennis, V = E.camera.position.constructor; E._computeTargetCameraPose = () => ({ targetPos: new V(...v.pos), targetLook: new V(...v.look) }); E._snapCameraImmediate?.(); if (v.fov){ E.camera.fov = v.fov; E.camera.updateProjectionMatrix(); } }, v);
  await p.waitForTimeout(2500);
  await p.evaluate(() => { const E = window.__natpfTennis; for (const a of [E.player, E.opponent]){ if (a?.root) a.root.visible = false; if (a?.model) a.model.visible = false; if (a?.racket) a.racket.visible = false; } if (E.ball?.mesh) E.ball.mesh.visible = false; });
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${outDir}/${v.name}.png`, timeout: 180000 });
  console.log('fatto', v.name);
}
await b.close();
