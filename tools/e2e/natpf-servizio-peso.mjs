// NATPF B18.2 (tappa 2, passo 1; difetto 11 / D11 del rapporto B16; docs/b18/t2-1-servizio.md): nel gioco vero (pagina,
// motore, tabellone e scritte veri, avviato da «Gioca» contro la CPU) il servizio di chi gioca conta e i personaggi
// partono fermi. Il servizio arriva al motore come dal telefono con la forma (stesso gesto del banco
// natpf-tennis/scripts/audit/servizio.mjs: servizio insegnato, oppure forte e sulla riga esterna del quadrato), lancio e
// colpo dagli ingressi veri (_handleUserTossInput, _handleUserSwingInput). Verifica:
//   • a ogni servizio e nella pausa tra i punti i quattro personaggi sono fermi, anche se a fine punto la CPU correva;
//   • servizio insegnato: nessuna minaccia, la CPU parte subito, nessun ace;
//   • servizio forte ed esterno: la CPU lo legge in ritardo (resta ferma un attimo), e in SERVES servizi (di base 40)
//     arriva almeno un ace con la CPU ferma: lo schermo scrive «Ace!» e il punto è di chi gioca;
//   • a Leggenda lo stesso servizio non fa ace (la CPU ci arriva), ma la legge in ritardo.
// Il caso del motore è fissato (Math.random con seme) e la fisica gira a passi fissi di 1/120 s senza disegno, come nelle
// altre prove senza GPU: il risultato è lo stesso a ogni giro. Non è una misura di persone vere né di telefoni veri.
// La scritta «Ace!» si legge dalla pagina (testo e striscia a schermo); niente schermate: il gioco gira a passi della
// prova, più veloce dell'orologio delle scritte. Porta GAME_PORT (di base 3193).
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-servizio-peso.mjs
// B28: questa prova è scritta per la calibrazione con i gesti (opzione dello stand «Con i gesti», th.mjs: CAL)
process.env.CAL ||= 'gesti';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, page, check, summary } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3193), SERVES = +(process.env.SERVES || 40);
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));
const fmt = v => JSON.stringify(v);

// nella pagina: n punti battuti da chi gioca con il servizio dato; lo scambio non si gioca (chi gioca non risponde)
const serves = (p, opts) => p.evaluate(({ level, n, power, wide, seed }) => {
  const E = __natpfTennis, DT = 1/120, A = [E.player, E.playerPartner, E.opponent, E.opponentPartner];
  // caso fissato (mulberry32, come scripts/audit/headless-engine.mjs)
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0)/4294967296; };
  E.matchConfig.difficulty = level; E._applyDifficultyTuning(level);
  const step = (cond, sec) => { for (let i = 0; i < sec*120 && !cond(); i++){ E.elapsedTime += DT; E._stepPhysics(DT); } return cond(); };
  const out = [];
  for (let k = 0; k < n; k++){
    E.score.server = 'player'; E.score.gameServer = 'player'; E.matchConfig.gamesToWin = 99;
    E._setupPointServe({ showBanner: false });
    const vServe = A.map(x => +x.vel.length().toFixed(3));
    const box = E.score.deuceSide ? -1 : 1;
    const intent = { shot: 'topspin', power, depth: power, rise: -.08, plane: wide ? -box*.55 : .5, face: wide ? box : 0 };
    E._handleUserTossInput({});
    step(() => E.ball.vel.y/9.15 <= 0, 2);
    E._handleUserSwingInput({ source: 'prova', side: 'overhead', shotType: 'topspin', speed: .8 + power*.85, dirX: 0, natpf: { aim: 'swing', shot: 'topspin', intent, power, latency: 0, hand: 'right' } });
    const sv = E.natpfSkill.serve ? { ...E.natpfSkill.serve } : null, plan = !!E.natpfSkill.cpuPlan?.serve, p0 = E.opponent.pos.clone();
    // i primi passi dopo il servizio: la CPU si muove subito o resta ferma per la lettura in ritardo
    let still = 0;
    for (let i = 0; i < 60 && E.phase === 'RALLY' && E.opponent.pos.distanceTo(p0) < 1e-6; i++){ E.elapsedTime += DT; E._stepPhysics(DT); still += DT; }
    let vmax = 0;
    step(() => { vmax = Math.max(vmax, E.opponent.vel.length()); return E.phase !== 'RALLY'; }, 12);
    const call = E.lastBannerBroadcast?.call || {};
    const row = { rally: E.phase === 'RALLY', kmh: sv?.kmh, threat: sv?.threat, sharp: sv?.sharp, late: sv?.late, plan, still: +still.toFixed(3), vServe, vmax: +vmax.toFixed(2),
      touched: E.ball.rallyStrokeCount > 1, winner: call.winner, why: call.why,
      text: document.getElementById('center-banner-text')?.textContent, sub: document.getElementById('center-banner-sub')?.textContent,
      shown: !document.getElementById('center-banner-layer')?.classList.contains('hidden') };
    // nella pausa: fermi subito e dopo mezzo secondo
    row.vEnd = A.map(x => +x.vel.length().toFixed(3));
    step(() => false, .5);
    row.vPause = A.map(x => +x.vel.length().toFixed(3)); row.phasePause = E.phase;
    out.push(row);
    if (row.why === 'Ace!' && !window.__aceShot){ window.__aceShot = true; break; }
  }
  return out;
}, opts);

const B = await launch();
try {
  const { p, errs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0`, { w: 1280, h: 720 });
  await p.waitForFunction(() => window.__natpfTennis?.natpfUi?.lobby && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  await p.evaluate(() => __natpfTennis.natpfUi.intro?.skip?.());
  await p.evaluate(() => { const ui = __natpfTennis.natpfUi; ui.lobby.go('menu'); if (!ui.testInput) ui.toggleTestInput(); ui.selectController('mouse', { open: false }); ui.lobby.setMode('cpu'); ui.lobby.setFormat('singles'); ui.lobby.go('match'); });
  await p.waitForTimeout(500);
  await p.evaluate(() => document.getElementById('btn-start-match').click());
  const started = await p.waitForFunction(() => !__natpfTennis.autoPlayMode && __natpfTennis.phase === 'SERVE_STANCE', null, { timeout: 30000 }).then(() => true, () => false);
  check('partita contro la CPU avviata da «Gioca»', started);
  // il gioco va avanti solo con i passi della prova (niente fotogrammi tra un passo e l'altro)
  await p.evaluate(() => { const E = __natpfTennis; E.__update = E.update.bind(E); E.update = () => {}; E.natpfUi.onboarding?.close?.(); });

  // 1. servizio insegnato a Casual: nessuna minaccia, la CPU parte subito, nessun ace; fermi al servizio e nella pausa
  const taught = await serves(p, { level: 'casual', n: 10, power: .5, wide: false, seed: 5 });
  const zero = a => a.every(v => v === 0);
  check('servizio insegnato (83 km/h veri, 157 sulla scala di prima del B34): minaccia 0, nessuna lettura in ritardo, la CPU parte al primo passo, nessun ace',
    taught.length === 10 && taught.every(r => r.threat === 0 && r.late === 0 && !r.plan && r.still <= 1/120 + 1e-9 && r.why !== 'Ace!'), fmt(taught.map(r => [r.kmh, r.threat, r.late, r.still, r.why])));
  check('a ogni servizio e nella pausa tra i punti i quattro personaggi sono fermi, anche se a fine punto la CPU correva',
    taught.every(r => zero(r.vServe) && zero(r.vEnd) && zero(r.vPause) && r.phasePause !== 'RALLY') && taught.filter(r => r.vmax > 1).length >= 5, fmt(taught.map(r => ({ servizio: r.vServe, fine: r.vEnd, pausa: r.vPause, corsaCpu: r.vmax }))));

  // 2. servizio forte ed esterno a Casual: lettura in ritardo e almeno un ace con la CPU ferma, «Ace!» a schermo
  const great = await serves(p, { level: 'casual', n: SERVES, power: .9, wide: true, seed: 11 });
  const ace = great.find(r => r.why === 'Ace!');
  check('servizio forte ed esterno (oltre 99 km/h veri, 188 sulla scala di prima del B34, sulla riga): minaccia piena e CPU ferma per la lettura in ritardo (pochi centesimi)',
    great.every(r => r.kmh >= 99 && r.threat >= .95 && r.sharp >= .9 && zero(r.vServe)) && great.filter(r => r.plan && r.late > .01 && Math.abs(r.still - r.late) < .03).length >= Math.min(great.length, 3) && great.every(r => r.late < .25),
    fmt(great.map(r => [r.kmh, r.threat, r.late, r.still, r.why])));
  check(`servizio forte ed esterno a Casual: un ace in al più ${SERVES} servizi, con la CPU ferma al servizio; il punto è di chi gioca e lo schermo scrive «Ace!»`,
    !!ace && !ace.touched && ace.winner === 'player' && zero(ace.vServe) && ace.shown && /Ace/.test(`${ace.text} ${ace.sub}`), fmt({ dopo: great.length, ace }));

  // 3. Leggenda: lo stesso servizio non fa ace (la CPU ci arriva), ma lo legge in ritardo
  await p.evaluate(() => { window.__aceShot = true; });
  const legend = await serves(p, { level: 'leggenda', n: 12, power: .9, wide: true, seed: 7 });
  check('Leggenda: sul servizio forte ed esterno nessun ace in 12 servizi (la CPU tocca la palla), lettura in ritardo presente, ferma al servizio',
    legend.length === 12 && legend.every(r => r.why !== 'Ace!' && r.touched && zero(r.vServe) && zero(r.vPause)) && legend.filter(r => r.plan && r.late > .01).length >= 8, fmt(legend.map(r => [r.kmh, r.threat, r.late, r.still, r.why, r.touched])));
  check('nessun errore JavaScript', !errs.length, errs.join(' | ').slice(0, 500));
} finally {
  await B.close(); stop();
}
summary();
setTimeout(() => process.exit(), 300);
