// NATPF B72 · «Avversario» al posto di «CPU» (richiesta dell'utente del 19/11: «molti non sanno cosa significa CPU»;
// docs/b72/avversario.md). Gioco vero con vite, mouse e tastiera:
//   1. «Con chi giochi?»: tessera «Contro l’avversario», «Da solo, contro un avversario guidato dal gioco: …»;
//   2. «Pronto per la partita»: singolo «Tu» contro «Avversario» e «Batte per primo: Tu · Avversario · Sorteggio»; doppio
//      «Tu + compagno» contro «Avversari», «Voi · Avversari · Sorteggio»; nessuna «CPU» nella pagina;
//   3. partita persa a livello Esperto: «Ha vinto l'avversario questa volta», «livello Esperto», nessuna «CPU»;
//   4. «Rivincita»: «Avversario facile» (Ragazzo) e la quarta tessera «Avversario esperto»;
//   5. doppio perso: «Hanno vinto gli avversari questa volta»;
//   6. nessun errore JavaScript. Schermate in OUT/avversario.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-avversario.mjs
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const PORT = +(process.env.GAME_PORT || 3272), OUT = path.join(SP, 'avversario');
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
process.on('exit', () => { try { vite.kill(); } catch {} });
for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(`http://127.0.0.1:${PORT}/`, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) break; await sleep(500); }
const shot = (p, name) => p.screenshot({ path: path.join(OUT, name), timeout: 90000 });
const B = await launch();
try {
  const { p: g, errs } = await page(B, `http://127.0.0.1:${PORT}/?intro=0`, { w: 1280, h: 720, init: () => { try { localStorage.setItem('natpf-tennis.mascotteGif', '0'); } catch {} } });
  await g.waitForFunction(() => window.__natpfTennis?.player?.model && __natpfTennis.natpfUi?.lobby?.visible, null, { timeout: 180000 });
  await g.evaluate(() => __natpfTennis.natpfUi.intro?.skip?.());
  await sleep(500);
  // 1. pagina «Con chi giochi?»
  await g.evaluate(() => __natpfTennis.natpfUi.lobby.go('mode')); await sleep(500);
  const mode = await g.evaluate(() => [...document.querySelectorAll('[data-page="mode"] .mode-tile')].map(t => `${t.querySelector('.tile-name').textContent} | ${t.querySelector('.tile-desc').textContent}`));
  check('pagina «Con chi giochi?»: «Contro l’avversario» con la descrizione nuova, niente «CPU»', /^Contro l’avversario \| Da solo, contro un avversario guidato dal gioco: facile, esperto o Leggenda\.$/.test(mode[0]) && !mode.join(' ').includes('CPU'), mode.join(' / '));
  await shot(g, 'modo-1280x720.png');
  // 2. pagina «Pronto per la partita»: singolo e doppio (mouse e tastiera)
  const match = async fmt => g.evaluate(f => {
    const ui = __natpfTennis.natpfUi, L = ui.lobby; ui.testInput = true; ui.selectController('mouse', { open: false });
    L.setMode('cpu'); L.go('match'); L.setFormat(f); L._paintServe();
    const txt = s => document.querySelector(s)?.textContent || '';
    document.getElementById('serve-first-section')?.classList.remove('hidden');   // la riga «Batte per primo» (di base nascosta con «Sempre lo stesso»)
    return { opp: txt('#setup-opponent-label'), you: txt('.you-tag'), serve: [...document.querySelectorAll('[data-natpf-serve]')].map(b => b.textContent), body: document.querySelector('[data-page="match"]').innerText };
  }, fmt);
  let m = await match('singles'); await sleep(400);
  check('«Pronto per la partita», singolo: «Tu» contro «Avversario», «Batte per primo: Tu · Avversario · Sorteggio», niente «CPU»', m.opp === 'Avversario' && m.you === 'Tu' && m.serve.join('|') === 'Tu|Avversario|Sorteggio' && !/CPU/.test(m.body), JSON.stringify({ opp: m.opp, you: m.you, serve: m.serve }));
  await g.evaluate(() => { const b = document.getElementById('match-more-btn'); if (b && !document.getElementById('match-more')?.offsetParent) b.click(); }); await sleep(400);
  await shot(g, 'partita-singolo-1280x720.png');
  m = await match('doubles'); await sleep(400);
  check('«Pronto per la partita», doppio: «Tu + compagno» contro «Avversari», «Voi · Avversari · Sorteggio», niente «CPU»', m.opp === 'Avversari' && m.you === 'Tu + compagno' && m.serve.join('|') === 'Voi|Avversari|Sorteggio' && !/CPU/.test(m.body), JSON.stringify({ opp: m.opp, you: m.you, serve: m.serve }));
  await shot(g, 'partita-doppio-1280x720.png');
  await g.evaluate(() => __natpfTennis.natpfUi.lobby.setFormat('singles'));
  for (const [w, h] of [[720, 720], [1920, 540]]){ await g.setViewportSize({ width: w, height: h }); await sleep(500); await shot(g, `partita-singolo-${w}x${h}.png`); }
  await g.setViewportSize({ width: 1280, height: 720 }); await sleep(300);
  // 3. partita persa contro l'avversario (livello Esperto), con un vincente: schermata finale
  const play = ({ doubles = false, level = 'pro' } = {}) => g.evaluate(({ doubles, level }) => {
    const E = __natpfTennis, ui = E.natpfUi;
    ui.onboarding?.close?.(); E.hud.hideTitleModal?.(); ui.lobby.visible = false; E.hud.hideVictoryModal(); ui.dayBoard?.hide?.();
    ui.testInput = true; ui.selectController('mouse', { open: false });
    E.autoPlayMode = false; E.userHasInteracted = true;
    ui.lobby.mode = 'cpu'; ui.lobby.setFormat(doubles ? 'doubles' : 'singles'); E.setMatchFormat?.(doubles ? 'doubles' : 'singles');
    ui.events.nickname = 'Ada'; E.isMultiplayer = false; ui.lobby.setLevel(level); E._applyDifficultyTuning(level); E.matchConfig.difficulty = level;
    E.natpfFair = false; E.startNewMatch({ showStartBanner: false }); E.matchConfig.gamesToWin = 1;
    E.ball.rallyStrokeCount = 5; E._awardPoint('player', 'Nice Shot!'); E.ball.rallyStrokeCount = 5; E._awardPoint('player', 'Nice Shot!');
    for (let i = 0; i < 6 && E.phase !== 'MATCH_OVER'; i++){ E.ball.rallyStrokeCount = 9; E._awardPoint('opponent', 'Out'); }
    return E.phase;
  }, { doubles, level });
  const victory = () => g.evaluate(() => { const v = document.getElementById('victory-modal'); return { on: !v.classList.contains('hidden'), text: v.innerText }; });
  check('partita persa (singolo, Esperto): finita', await play() === 'MATCH_OVER');
  await g.waitForFunction(() => !document.getElementById('victory-modal').classList.contains('hidden'), null, { timeout: 30000 }); await sleep(1500);
  let v = await victory();
  check('schermata finale persa: «Ha vinto l\'avversario questa volta», «livello Esperto», nessuna «CPU»', v.on && /Ha vinto l'avversario questa volta/.test(v.text) && /livello Esperto/i.test(v.text) && !/CPU/.test(v.text), v.text.replace(/\s+/g, ' ').slice(0, 400));
  for (const [w, h] of [[1280, 720], [720, 720], [1920, 540], [1024, 600]]){ await g.setViewportSize({ width: w, height: h }); await sleep(600); await shot(g, `fine-persa-${w}x${h}.png`); }
  await g.setViewportSize({ width: 1280, height: 720 }); await sleep(300);
  // 4. «Rivincita» → scelta del livello: la quarta tessera «Avversario esperto»
  const lv = await g.evaluate(() => ({ cpu: __natpfTennis.natpfUi.lobby.cpuLevel, hud: __natpfTennis.hud.selectedDifficulty, mode: __natpfTennis.natpfUi.lobby.mode }));
  console.log('livello prima della rivincita', JSON.stringify(lv));
  await g.evaluate(() => { __natpfTennis.natpfUi.lobby.setLevel('pro'); __natpfTennis.natpfUi.rematch.open({ origin: 'computer' }); }); await sleep(600);
  const r = await g.evaluate(() => document.getElementById('natpf-rematch').innerText);
  check('«Rivincita»: tessere Bambino · Ragazzo («Avversario facile») · Adulto · «Avversario esperto» (maiuscolo dal CSS), niente «CPU»', /Avversario esperto/i.test(r) && /Avversario facile, per prendere confidenza/i.test(r) && !/CPU/i.test(r), r.replace(/\s+/g, ' ').slice(0, 300));
  await shot(g, 'rivincita-1280x720.png');
  await g.evaluate(() => __natpfTennis.natpfUi.rematch.close());
  // 5. doppio perso
  check('partita persa (doppio, Evento): finita', await play({ doubles: true, level: 'evento' }) === 'MATCH_OVER');
  await g.waitForFunction(() => !document.getElementById('victory-modal').classList.contains('hidden'), null, { timeout: 30000 }); await sleep(1500);
  v = await victory();
  check('schermata finale del doppio persa: «Hanno vinto gli avversari questa volta», nessuna «CPU»', v.on && /Hanno vinto gli avversari questa volta/.test(v.text) && !/CPU/.test(v.text), v.text.replace(/\s+/g, ' ').slice(0, 400));
  await shot(g, 'fine-doppio-persa-1280x720.png');
  check('nessun errore JavaScript', !errs.length, errs.slice(0, 3).join(' | '));
} finally { await B.close(); vite.kill(); summary(); }
