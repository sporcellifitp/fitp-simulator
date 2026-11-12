// NATPF B18 (difetto 14 dell'audit B16): Precision e Combo per chi arriva per la prima volta, nel gioco vero (senza
// telefono: la sfida si avvia dal codice come dalla pagina «Minigiochi»). Prova:
//   • Combo: la prima catena è solo dritto e rovescio; con un passo di direzione o un colpo speciale imparato accanto al
//     riquadro compare l'animazione del gesto (Canvas 2D, disegnata), che sparisce con un dritto o un rovescio;
//   • due errori sullo stesso passo: il passo diventa un dritto o un rovescio e la scritta lo dice;
//   • Precision: le zone corte sono a portata di un dritto morbido (5,2–5,4 m), con la scritta della zona.
// Schermate in OUT (predefinito la cartella temporanea). Porta 3158.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-minigiochi-principianti.mjs
// B28: questa prova è scritta per la calibrazione con i gesti (opzione dello stand «Con i gesti», th.mjs: CAL)
process.env.CAL ||= 'gesti';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3158);
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));
const B = await launch();
try {
  const { p: game, errs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0`, { w: 1280, h: 720 });
  await game.waitForFunction(() => window.__natpfTennis?.natpfUi?.events && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  await game.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; E.natpfUi.controller = 'mouse'; E.natpfUi.events.forgetLearned(); });   // senza telefono collegato (altrimenti il pannello «Collega il telefono» copre il campo)
  // Combo: prima catena
  const first = await game.evaluate(() => { const ev = __natpfTennis.natpfUi.events; ev.start('combo'); return ev.active.chain; });
  check('Combo: la prima catena è solo dritto e rovescio', first.every(s => s === 'forehand' || s === 'backhand'), first.join(', '));
  const demo = () => game.evaluate(() => { const b = document.getElementById('natpf-challenge-demo'), c = b?.querySelector('canvas'), r = b?.getBoundingClientRect();
    let ink = 0; try { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4*37) if (d[i] > 20) ink++; } catch {}
    return { shown: !!b && !b.classList.contains('hidden'), title: b?.querySelector('.cd-title')?.textContent || '', ink, box: r ? [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] : null }; });
  const d0 = await demo();
  check('Combo: con un dritto o un rovescio niente animazione', !d0.shown, JSON.stringify(d0));
  // passo di direzione (dalla terza catena) e pallonetto imparato
  await game.evaluate(() => { const ev = __natpfTennis.natpfUi.events, A = ev.active; ev.learnShot('lob'); A.chain = ['cross', 'lob', 'forehand']; A.chainIdx = 0; ev.paint(); });
  await game.waitForTimeout(700);
  const d1 = await demo();
  check('Combo: con l\'incrociato l\'animazione del gesto accanto al riquadro, disegnata e dentro lo schermo', d1.shown && d1.title === 'Incrociato' && d1.ink > 20 && d1.box && d1.box[0] + d1.box[2] <= 1280 && d1.box[1] >= 0, JSON.stringify(d1));
  await game.evaluate(() => __natpfTennis.__render()); await game.screenshot({ path: `${SP}/combo-animazione-incrociato.png` });
  // due errori sullo stesso passo: un colpo di base al posto dell'incrociato
  const swap = await game.evaluate(() => { const E = __natpfTennis, ev = E.natpfUi.events, A = ev.active;
    const miss = () => { E.player.swingType = 'forehand'; E.ball.targetLanding.set(0, 0, -8); E.natpfLastRacket = { at: E.elapsedTime, out: { shot: 'TOPSPIN' }, hitX: 2.5 }; ev.onShot({ label: 'Perfetto', color: 'green' }, {}); };
    A.chain = ['lob', 'forehand']; A.chainIdx = 0; miss(); const one = A.chain[0]; miss(); return { one, two: A.chain[0], last: A.last }; });
  check('Combo: due errori sullo stesso passo → il passo cambia con un dritto o un rovescio, e lo dice', swap.one === 'lob' && ['forehand', 'backhand'].includes(swap.two) && /Cambiamo: al posto di Pallonetto/.test(swap.last), JSON.stringify(swap));
  await game.waitForTimeout(400);
  const d2 = await demo();
  check('Combo: con il passo di base l\'animazione sparisce', !d2.shown, JSON.stringify(d2));
  await game.evaluate(() => __natpfTennis.__render()); await game.screenshot({ path: `${SP}/combo-passo-cambiato.png` });
  await game.evaluate(() => __natpfTennis.natpfUi.events.abort());
  check('Combo finita: niente animazione rimasta', !(await demo()).shown);
  // Precision: zone corte
  const zones = await game.evaluate(async () => { const { PRECISION_ZONES } = await import('/src/natpf/natpf_arcade.js'); return PRECISION_ZONES.map(z => ({ z: z.z, label: z.label })); });
  const short = zones.filter(z => -z.z < 6);
  check('Precision: le due zone corte a 5–5,6 m, per un dritto morbido', short.length === 2 && short.every(z => -z.z >= 5 && -z.z <= 5.6 && /dritto morbido/.test(z.label)), JSON.stringify(short));
  await game.evaluate(() => { const ev = __natpfTennis.natpfUi.events; ev.start('precision'); ev.active.zoneIdx = 6; ev.active.ball = 6; });
  await game.evaluate(async () => { const { PRECISION_ZONES } = await import('/src/natpf/natpf_arcade.js'); const ev = __natpfTennis.natpfUi.events; ev.field.zone(PRECISION_ZONES[6]); ev.paint(); });
  const hud = await game.evaluate(() => document.getElementById('natpf-challenge-hud')?.innerText || '');
  check('Precision: la scritta della zona dice «Corta al centro: dritto morbido»', /Corta al centro: dritto morbido/.test(hud), hud.replace(/\n/g, ' · '));
  await game.evaluate(() => __natpfTennis.__render()); await game.screenshot({ path: `${SP}/precision-zona-corta.png` });
  await game.evaluate(() => __natpfTennis.natpfUi.events.abort());
  check('nessun errore JavaScript', !errs.length, errs.join(' | ').slice(0, 500));
} finally {
  await B.close(); stop();
}
summary();
setTimeout(() => process.exit(), 300);
