// NATPF B33 · fine partita con dati veri e classifica delle partite (docs/b33/fine-partita.md). Gioco vero con vite:
//   A. contro la CPU (livello Evento, nickname «Ada»): una partita giocata davvero dal motore con un giocatore simulato
//      (colpi con il tempo sbagliato a caso, come il profilo «medio» del banco), al meglio di 3 game. I numeri della
//      schermata finale devono coincidere con quello che è successo: punti dal motore, colpi, km/h e voto dalle scritte
//      dei colpi del motore. Schermate a 1280×720, 1920×1080, 1920×540 (ledwall), 1024×600 e 720×720: la scheda resta
//      tutta nello schermo, senza scorrere;
//   B. classifica: la partita è nella scheda «Partite» (anche a schermo intero dal pannello dello stand), nel CSV, e
//      sparisce con «Azzera oggi»; il registro dello stand non ha mai il nome;
//   C. stesso schermo: due colonne con i nomi e i punti di ognuno; «Nuovo giocatore» chiude la schermata.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-fine-partita.mjs      (OUT=cartella delle schermate)
// Giocatore simulato e punti del motore: non sostituiscono un telefono vero né persone vere.
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3173);
const OUT = path.join(SP, 'fine-partita'); mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
const stop = () => { try { vite.kill(); } catch {} };
process.on('exit', stop);
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await sleep(500); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

// la schermata finale come la legge chi guarda
const readModal = g => g.evaluate(() => {
  const m = document.getElementById('victory-modal'), card = m.querySelector('.nt-skill-card'), r = card.getBoundingClientRect();
  const cols = [...m.querySelectorAll('.vs-col')].map(c => ({
    name: c.querySelector('.vs-name')?.textContent || '',
    tiles: Object.fromEntries([...c.querySelectorAll('.vs-tile')].map(t => [t.querySelector('small').firstChild.textContent.trim(), +t.querySelector('b').textContent])),
    legend: Object.fromEntries([...c.querySelectorAll('.vs-legend span')].map(s => [s.dataset.t, +s.textContent.replace(/\D+/g, '')])),
    best: [...c.querySelectorAll('.vs-best span')].map(s => s.textContent),
    tips: [...c.querySelectorAll('.vs-tip')].map(s => s.textContent),
  }));
  // pezzi tagliati: un testo che esce dal suo riquadro o dalla scheda
  const clipped = [...card.querySelectorAll('.vs-tile, .vs-tip, .vs-legend span, .vs-games li, .nt-footer-btn:not(.hidden), .victory-result-banner')].filter(el => { const b = el.getBoundingClientRect(); return b.height > 0 && (b.bottom > r.bottom + 1 || b.right > r.right + 1 || b.top < r.top - 1 || el.scrollWidth > el.clientWidth + 2); }).map(el => el.className + ':' + el.textContent.slice(0, 20));
  return { open: !m.classList.contains('hidden'), stats: m.classList.contains('has-stats'), title: document.getElementById('victory-result-banner').textContent,
    games: [...m.querySelectorAll('.vs-games li')].map(l => l.textContent), cols, rank: m.querySelector('.vs-rank')?.textContent || '',
    inView: r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight + 0.5 && r.right <= innerWidth + 0.5, scroll: card.scrollHeight > card.clientHeight + 1, clipped, size: [innerWidth, innerHeight] };
});

const B = await launch();
try {
  const { p: g, errs } = await page(B, `http://127.0.0.1:${GAME_PORT}/?intro=0`, { w: 1280, h: 720 });
  await g.waitForFunction(() => window.__natpfTennis?.natpfUi?.lobby && window.__natpfTennis.player?.model && window.__natpfTennis.opponent?.model, null, { timeout: 120000 });
  await g.evaluate(() => { const E = __natpfTennis; E.__render = E.render.bind(E); E.render = () => {}; E.natpfUi.intro?.skip?.(); });
  const shot = async name => { await g.evaluate(() => { try { __natpfTennis.__render(); } catch {} }); await g.screenshot({ path: `${OUT}/${name}.png` }); console.log('schermata ' + name); };

  /* ---------- A. contro la CPU, partita giocata dal motore ---------- */
  await g.evaluate(() => {
    const E = __natpfTennis, ui = E.natpfUi;
    ui.events.nickname = 'Ada'; ui.events.resetBoard();
    ui.onboarding?.close?.(); E.hud.hideTitleModal?.(); ui.lobby.visible = false;
    ui.testInput = true; ui.selectController('mouse', { open: false });
    E.autoPlayMode = false; E.userHasInteracted = true; E.isMultiplayer = false;
    E._applyDifficultyTuning('evento'); E.matchConfig.difficulty = 'evento';
    E.natpfFair = false; E.startNewMatch({ showStartBanner: false }); E.matchConfig.gamesToWin = 2;
    // quello che succede davvero: punti (dal motore, prima del punto) e scritte dei colpi del motore
    const T = window.__truth = { won: 0, lost: 0, longest: 0, serves: 0, shots: 0, kmh: 0, kmhAll: 0, kmhOut: 0, pend: null, timing: { perfetto: 0, anticipo: 0, ritardo: 0, buono: 0 }, popups: [] };
    // B34: colpo più veloce solo dei colpi finiti in campo: fuori o in rete se il punto che segue è dell'avversario con
    // il motivo «Out» o «Net» del motore
    const settle = bad => { if (T.pend != null){ if (bad) T.kmhOut = Math.max(T.kmhOut, T.pend); else T.kmh = Math.max(T.kmh, T.pend); } T.pend = null; };
    const award = E._awardPoint.bind(E);
    E._awardPoint = (w, why = '') => { if (E.phase !== 'MATCH_OVER' && E.natpfStats?.m && !E.natpfStats.m.over){ w === 'player' ? T.won++ : T.lost++; T.longest = Math.max(T.longest, E.ball.rallyStrokeCount); settle(w === 'opponent' && (why === 'Out' || why === 'Net')); } return award(w, why); };
    const pop = E.hud.showTimingPopup.bind(E.hud);
    E.hud.showTimingPopup = (o = {}) => {
      const g = String(o.grade || '').toUpperCase(), d = String(o.detail || ''), kmh = +(/(\d+) KM\/H/.exec(d)?.[1] || 0);
      if (!g.startsWith('P2') && /KM\/H/.test(d) && E.natpfStats?.m && !E.natpfStats.m.over){
        T.popups.push(g);
        if (/•/.test(d)) T.serves++;
        else { T.shots++; const v = /WHIFF|TOO LATE|TOO EARLY/.test(g) ? null : /PERFECT|POWER/.test(g) ? 'perfetto' : /EARLY/.test(g) ? 'anticipo' : /LATE/.test(g) ? 'ritardo' : 'buono'; if (v) T.timing[v]++; }
        settle(false); T.pend = kmh; T.kmhAll = Math.max(T.kmhAll, kmh);
      }
      return pop(o);
    };
    // giocatore simulato: servizio e colpi con un errore di tempo a caso (semi fissi)
    let s = 12345; const rnd = () => ((s = (s*16807) % 2147483647) / 2147483647), gauss = () => Math.sqrt(-2*Math.log(rnd() || 1e-9))*Math.cos(2*Math.PI*rnd());
    let intent = null, serveAt = null;
    const step = E._stepPhysics.bind(E);
    E._stepPhysics = dt => {
      if (E.phase === 'SERVE_STANCE'){ intent = null; if (E.score.server === 'player' && E.phaseTimer > .6){ E._handleUserTossInput({}); serveAt = E.elapsedTime + .55 + gauss()*.05; } }
      if (E.phase === 'SERVE_TOSS' && E.score.server === 'player' && serveAt != null && E.elapsedTime >= serveAt){ serveAt = null; E._handleUserSwingInput({ source: 'audit', speed: 1.25 + gauss()*.1, dirX: gauss()*.3 }); }
      if (E.phase === 'RALLY' && E.ball.inPlay){
        if (E.ball.lastHitter === 'player') intent = null;
        else if (E.ball.vel.z > .5 && E.ball.pos.z > -6){
          if (!intent) intent = { error: gauss()*.09, sent: false };
          const r = E.ball.pos.z - E.player.pos.z, tti = (-.45 - r)/Math.max(.5, E.ball.vel.z - E.player.vel.z);
          if (!intent.sent && tti <= -intent.error){ intent.sent = true; E._handleUserSwingInput({ source: 'audit', shotType: 'topspin', speed: 1.22 + gauss()*.12, dirX: Math.max(-1, Math.min(1, gauss()*.5)) }); }
        }
      }
      step(dt);
    };
  });
  let phase = '';
  for (let i = 0; i < 400 && phase !== 'MATCH_OVER'; i++) phase = await g.evaluate(() => { const E = __natpfTennis; for (let k = 0; k < 600 && E.phase !== 'MATCH_OVER'; k++) E.update(1/60); return E.phase; });
  check('A1. partita contro la CPU giocata fino alla fine dal motore', phase === 'MATCH_OVER');
  const opened = await g.waitForFunction(() => !document.getElementById('victory-modal').classList.contains('hidden'), null, { timeout: 8000 }).then(() => true, () => false);
  const truth = await g.evaluate(() => window.__truth), engine = await g.evaluate(() => { const S = __natpfTennis.score; return { pg: S.playerGames, og: S.opponentGames, board: __natpfTennis.natpfUi.events.topMatches(10) }; });
  let v = await readModal(g);
  check('   schermata finale aperta con i numeri', opened && v.open && v.stats && v.cols.length === 1, JSON.stringify({ opened, open: v.open, stats: v.stats }));
  const c = v.cols[0] || { tiles: {}, legend: {} };
  console.log('   vero:', JSON.stringify({ ...truth, popups: truth.popups.length }), '\n   schermo:', JSON.stringify(c));
  check('A2. punti vinti come il motore', c.tiles['Punti vinti'] === truth.won, `${c.tiles['Punti vinti']} / ${truth.won} su ${truth.won + truth.lost}`);
  check('   colpi (servizi e colpi nello scambio) come le scritte dei colpi', c.tiles['Colpi'] === truth.serves + truth.shots, `${c.tiles['Colpi']} / ${truth.serves}+${truth.shots}`);
  check('   scambio più lungo come il motore', c.tiles['Scambio più lungo'] === truth.longest, `${c.tiles['Scambio più lungo']} / ${truth.longest}`);
  check('   colpo più veloce come la scritta del colpo, solo colpi in campo (B34)', c.tiles['Colpo più veloce'] === truth.kmh, `${c.tiles['Colpo più veloce']} / ${truth.kmh} (tutti ${truth.kmhAll}, fuori o in rete ${truth.kmhOut})`);
  check('   km/h veri della palla (B34: sotto i 200 a Evento)', truth.kmhAll > 40 && truth.kmhAll < 200, `${truth.kmhAll}`);
  check('   voto del tempo: Perfetto, Anticipo, Ritardo come le scritte', c.legend.perfetto === truth.timing.perfetto && c.legend.anticipo === truth.timing.anticipo && c.legend.ritardo === truth.timing.ritardo, `${JSON.stringify(c.legend)} / ${JSON.stringify(truth.timing)}`);
  check('   game: un riquadro per game, quanti ne ha giocati il motore', v.games.length === engine.pg + engine.og, `${v.games.join(' ')} · motore ${engine.pg}-${engine.og}`);
  check('   due frasi semplici (bene / da migliorare)', c.tips?.length === 2 && c.tips.every(t => t.length > 8 && t.length < 90), JSON.stringify(c.tips));
  check('   posizione in classifica nella schermata', /1° su 1 nella classifica delle partite di oggi · \d+ punti/.test(v.rank), v.rank);
  for (const [w, h] of [[1280, 720], [1920, 1080], [1920, 540], [1024, 600], [720, 720]]){
    await g.setViewportSize({ width: w, height: h }); await sleep(250);
    v = await readModal(g);
    check(`A3. ${w}×${h}: scheda tutta nello schermo, senza scorrere né testi tagliati`, v.inView && !v.scroll && !v.clipped.length, JSON.stringify({ inView: v.inView, scroll: v.scroll, clipped: v.clipped }));
    await shot(`cpu-${w}x${h}`);
  }
  await g.setViewportSize({ width: 1280, height: 720 });

  /* ---------- B. classifica delle partite ---------- */
  const board = engine.board;
  check('B1. la partita è nella classifica delle partite (nickname, livello, punteggio equo)', board.length === 1 && board[0].nick === 'Ada' && board[0].level === 'evento' && board[0].won === truth.won && board[0].lost === truth.lost
    && board[0].score === Math.round(100*truth.won/(truth.won + truth.lost)*1.4), JSON.stringify(board));
  // il registro dello stand non ha mai il nome (righe in memoria e coda sul computer)
  const reg = await g.evaluate(() => { const R = __natpfTennis.natpfUi.registro; const all = [...(R?.rec?.buf || [])].join('\n'); let ls = ''; for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if (/registro/i.test(k)) ls += localStorage.getItem(k); } return { on: !!R?.rec?.on, lines: R?.rec?.conti?.righe || 0, hasName: /\bAda\b/.test(all + ls) }; });
  check('B2. registro dello stand: righe della partita, senza il nome', reg.on && reg.lines > 0 && !reg.hasName, JSON.stringify(reg));
  // revisione finale: anche la coda sul computer (IndexedDB natpf-registro, archivio «testi»), dopo aver chiuso un blocco
  const coda = await g.evaluate(async () => {
    const R = __natpfTennis.natpfUi.registro; try { await R?.rec?.blocco?.(); } catch {}
    const db = await new Promise((ok, ko) => { const r = indexedDB.open('natpf-registro'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
    if (![...db.objectStoreNames].includes('testi')){ db.close(); return { blocchi: 0, chars: 0, hasName: false, store: false }; }
    const all = await new Promise((ok, ko) => { const q = db.transaction('testi').objectStore('testi').getAll(); q.onsuccess = () => ok(q.result || []); q.onerror = () => ko(q.error); });
    db.close();
    const txt = all.map(x => String(x?.testo || '')).join('\n');
    return { blocchi: all.length, chars: txt.length, hasName: /\bAda\b/.test(txt), store: true };
  });
  check('B2b. coda del registro sul computer (IndexedDB): blocchi della partita, senza il nome', coda.store && coda.blocchi > 0 && coda.chars > 0 && !coda.hasName, JSON.stringify(coda));
  await g.click('#btn-return-title');
  await g.waitForFunction(() => __natpfTennis.natpfUi.lobby.visible, null, { timeout: 8000 });
  await g.evaluate(() => __natpfTennis.natpfUi.kiosk.run('ranking'));
  await sleep(300);
  const rk = await g.evaluate(() => ({ full: document.documentElement.classList.contains('ranking-full'), tab: document.querySelector('#ranking-tabs .selected')?.dataset.ranking, rows: [...document.querySelectorAll('#ranking-list li')].map(l => l.textContent), note: document.getElementById('ranking-note')?.textContent || '' }));
  check('B3. pannello dello stand → «A schermo intero»: la classifica delle partite', rk.full && rk.tab === 'partite' && rk.rows.length === 1 && /Ada/.test(rk.rows[0]) && /Evento/.test(rk.rows[0]) && /punti/.test(rk.rows[0]), JSON.stringify(rk));
  check('   la regola del punteggio in una riga', /Punteggio = % di punti vinti × livello/.test(rk.note), rk.note);
  await shot('classifica-1280x720');
  // dieci partite (altri nove visitatori, livelli diversi): a schermo intero ci stanno tutte, anche sul ledwall
  await g.evaluate(() => { const ev = __natpfTennis.natpfUi.events, L = ['bambini', 'casual', 'evento', 'pro', 'leggenda'];
    for (let i = 0; i < 9; i++){ ev.nickname = `Ospite ${i + 1}`; ev.recordMatch({ level: L[i % 5], won: 4 + i, lost: 10 - i, games: i % 2 ? [1, 0] : [0, 1], win: i % 2 === 1 }); }
    ev.nickname = 'Ada'; __natpfTennis.natpfUi.lobby._paintRanking(); });
  for (const [w, h] of [[1920, 540], [1280, 720], [720, 720], [1024, 600]]){
    await g.setViewportSize({ width: w, height: h }); await sleep(250);
    const fit = await g.evaluate(() => { const li = [...document.querySelectorAll('#ranking-list li')], n = document.getElementById('ranking-note').getBoundingClientRect(); return { rows: li.length, bottom: Math.round(Math.max(n.bottom, ...li.map(l => l.getBoundingClientRect().bottom))), h: innerHeight }; });
    check(`B3b. ${w}×${h}: dieci partite e la regola nello schermo`, fit.rows === 10 && fit.bottom <= fit.h, JSON.stringify(fit));
    await shot(`classifica-10-${w}x${h}`);
  }
  await g.setViewportSize({ width: 1280, height: 720 });
  const [dl] = await Promise.all([g.waitForEvent('download', { timeout: 8000 }), g.evaluate(() => __natpfTennis.natpfUi.kiosk.run('export'))]);
  const csv = readFileSync(await dl.path(), 'utf8');
  check('B4. «Scarica CSV»: la partita c\'è, con livello e risultato (dieci partite in tutto)', csv.split('\n').filter(l => l.includes('Partite contro la CPU')).length === 10 && new RegExp(`"Partite contro la CPU";"\\d+";"Ada";"${board[0]?.score}";"[^"]+";"Evento";"(vinta|persa) \\d-\\d";"${truth.won} su ${truth.won + truth.lost}"`).test(csv), csv.split('\n').slice(0, 3).join(' | '));
  g.once('dialog', d => d.accept());
  await g.evaluate(() => __natpfTennis.natpfUi.kiosk.run('reset'));
  await g.evaluate(() => __natpfTennis.natpfUi.lobby._paintRanking());
  const after = await g.evaluate(() => ({ n: __natpfTennis.natpfUi.events.topMatches(10).length, rows: [...document.querySelectorAll('#ranking-list li')].map(l => l.textContent) }));
  check('B5. «Azzera oggi»: classifica delle partite vuota', after.n === 0 && /nessuna partita/.test(after.rows.join()), JSON.stringify(after));
  await g.evaluate(() => { document.documentElement.classList.remove('ranking-full'); __natpfTennis.natpfUi.lobby.go('menu'); });

  /* ---------- C. stesso schermo ---------- */
  await g.evaluate(() => {
    const E = __natpfTennis;
    E.hud.hideVictoryModal(); E.natpfUi.lobby.visible = false; E.hud.hideTitleModal?.();
    E.autoPlayMode = false; E.userHasInteracted = true;   // il menu rimette la partita dimostrativa: qui si gioca
    E.natpfSplitNames = { p1: 'Giulia', p2: 'Marco' }; E.startSplit(); E.startNewMatch({ showStartBanner: false }); E.matchConfig.gamesToWin = 1;   // come natpf_split_ui (startSplit, poi startNewMatch)
    for (const w of ['player', 'opponent', 'opponent', 'opponent', 'player', 'opponent']) if (E.phase !== 'MATCH_OVER'){ E.ball.rallyStrokeCount = 3; E._awardPoint(w, 'Out'); }
  });
  check('C0. partita dello stesso schermo finita, schermata con due colonne', await g.waitForFunction(() => !document.getElementById('victory-modal').classList.contains('hidden') && document.getElementById('victory-modal').classList.contains('stats-split'), null, { timeout: 8000 }).then(() => true, () => false));
  for (const [w, h] of [[1280, 720], [720, 720], [1920, 540]]){
    await g.setViewportSize({ width: w, height: h }); await sleep(250);
    v = await readModal(g);
    if (w === 1280){
      const [a, b] = v.cols;
      check('C1. stesso schermo: due colonne con i nomi e i punti di ognuno', v.cols.length === 2 && a.name === 'Giulia' && b.name === 'Marco' && a.tiles['Punti vinti'] === 2 && b.tiles['Punti vinti'] === 4 && v.title === 'Vince Marco!', JSON.stringify({ title: v.title, cols: v.cols.map(x => [x.name, x.tiles]) }));
    }
    check(`C2. stesso schermo ${w}×${h}: tutta nello schermo, niente tagliato`, v.inView && !v.scroll && !v.clipped.length, JSON.stringify({ inView: v.inView, scroll: v.scroll, clipped: v.clipped }));
    await shot(`split-${w}x${h}`);
  }
  await g.setViewportSize({ width: 1280, height: 720 });
  await g.click('#btn-new-player');
  const np = await g.waitForFunction(() => document.getElementById('victory-modal').classList.contains('hidden') && __natpfTennis.natpfUi.lobby.visible, null, { timeout: 8000 }).then(() => true, () => false);
  check('C3. «Nuovo giocatore» chiude la schermata e torna alla scelta', np);
  check('nessun errore nella pagina', !errs.length, errs.slice(0, 3).join(' | '));
} finally {
  await B.close(); stop(); summary();
}
