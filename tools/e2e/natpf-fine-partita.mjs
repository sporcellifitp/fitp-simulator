// NATPF B33 · fine partita con dati veri e classifica delle partite (docs/b33/fine-partita.md). Gioco vero con vite:
//   A. contro la CPU (livello Evento, nickname «Ada»): una partita giocata davvero dal motore con un giocatore simulato
//      (colpi con il tempo sbagliato a caso, come il profilo «medio» del banco), al meglio di 3 game. I numeri della
//      partita devono coincidere con quello che è successo: punti dal motore, colpi, km/h e voto dalle scritte dei colpi
//      del motore. B35 (docs/b35/collaudo-13-11.md): la schermata segue la proposta grafica (titolo, game in una pillola,
//      al più tre riquadri con le cose migliori, solo positive, pillola in basso, bottoni a pillola) e i riquadri mostrano
//      quei numeri veri. Schermate a 1280×720, 1920×1080, 1920×540 (ledwall), 1024×600 e 720×720: la scheda resta
//      tutta nello schermo, senza scorrere;
//   B. classifica: la partita è nella scheda «Partite» (anche a schermo intero dal pannello dello stand), nel CSV, e
//      sparisce con «Azzera oggi»; il registro dello stand non ha mai il nome;
//   C. stesso schermo: due schede con i nomi e due cose belle per giocatore, lo scambio più lungo nella pillola;
//      «Nuovo giocatore» chiude la schermata.
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

// la schermata finale come la legge chi guarda (B35: riquadri .end-tile con il numero e la scritta, schede dello stesso
// schermo .end-player); expect: quello che deve mostrare secondo natpf_match_stats.endScreen dai numeri del motore
const NEG = /errori|errore|in rete|fuori|anticipo|ritardo|a vuoto|migliora|sbagli/i;
const readModal = g => g.evaluate(async () => {
  const m = document.getElementById('victory-modal'), card = m.querySelector('.nt-skill-card'), r = card.getBoundingClientRect();
  const tile = t => ({ id: t.dataset.stat, value: +t.querySelector('.end-num').textContent, label: t.querySelector('.end-lab').textContent });
  const tiles = [...m.querySelectorAll('#victory-stats > .end-tiles .end-tile')].map(tile);
  const players = [...m.querySelectorAll('.end-player')].map(c => ({ name: c.querySelector('.end-pname')?.textContent || '', chip: c.querySelector('.end-chip')?.textContent || '', tiles: [...c.querySelectorAll('.end-tile')].map(tile) }));
  const vis = id => { const n = document.getElementById(id); return n && !n.classList.contains('hidden') && n.getBoundingClientRect().height > 0 ? n.textContent : ''; };
  // pezzi tagliati: un testo che esce dal suo riquadro o dalla scheda
  const clipped = [...card.querySelectorAll('.end-tile, .end-lab, .end-num, .end-pill, .end-games, .end-sub, .end-pname, .end-chip, .skill-card-header, .nt-footer-btn:not(.hidden), .victory-result-banner')].filter(el => { const b = el.getBoundingClientRect(); return b.height > 0 && (b.bottom > r.bottom + 1 || b.right > r.right + 1 || b.top < r.top - 1 || b.left < r.left - 1 || el.scrollWidth > el.clientWidth + 2); }).map(el => el.className + ':' + el.textContent.slice(0, 20));
  // parti che si sovrappongono (titolo, pillola dei game, riquadri, pillola in basso, bottoni)
  const parts = ['victory-result-banner', 'victory-games', 'victory-stats', 'victory-pill'].map(id => document.getElementById(id)).filter(n => n && !n.classList.contains('hidden')).concat([card.querySelector('.end-btns')]).map(n => n.getBoundingClientRect()).filter(b => b.height > 0);
  const overlap = parts.some((a, i) => parts.some((b, k) => k > i && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1));
  const view = window.__endView, M = await import('/src/natpf/natpf_match_stats.js');
  const expect = view?.stats ? M.endScreen(view, view.stats) : null;
  return { open: !m.classList.contains('hidden'), stats: m.classList.contains('has-stats'), split: m.classList.contains('stats-split'), title: document.getElementById('victory-result-banner').textContent,
    kicker: document.getElementById('victory-kicker').textContent, sub: vis('victory-sub'), games: vis('victory-games') ? [...document.getElementById('victory-games').children].map(c => c.textContent.trim()).join(' ') : '', pill: vis('victory-pill'),
    again: document.getElementById('btn-play-again').textContent, btns: [...card.querySelectorAll('.end-btns .nt-footer-btn')].filter(b => !b.classList.contains('hidden') && b.offsetParent).map(b => b.textContent),
    tiles, players, sums: view?.stats?.cols.map(c => c.sum) || [], expect, text: card.innerText,
    inView: r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight + 0.5 && r.right <= innerWidth + 0.5, scroll: card.scrollHeight > card.clientHeight + 1, clipped, overlap, size: [innerWidth, innerHeight] };
});
const sameTiles = (a, b) => JSON.stringify((a || []).map(t => [t.id, t.value, t.label])) === JSON.stringify((b || []).map(t => [t.id, t.value, t.label]));

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
    // la vista che il motore passa alla schermata finale (per confrontarla con quello che si vede)
    const svm = E.hud.showVictoryModal.bind(E.hud); E.hud.showVictoryModal = o => { window.__endView = o?.view || null; return svm(o); };
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
  check('   schermata finale aperta con i numeri', opened && v.open && v.stats && v.sums.length === 1 && !v.split, JSON.stringify({ opened, open: v.open, stats: v.stats }));
  const sum = v.sums[0] || { timing: {} };
  console.log('   vero:', JSON.stringify({ ...truth, popups: truth.popups.length }), '\n   numeri:', JSON.stringify(sum), '\n   schermo:', JSON.stringify({ title: v.title, kicker: v.kicker, games: v.games, tiles: v.tiles, pill: v.pill, btns: v.btns }));
  // i numeri della partita (quelli da cui si scelgono i riquadri) sono quelli del motore
  check('A2. punti vinti come il motore', sum.points === truth.won && sum.lost === truth.lost, `${sum.points} / ${truth.won} su ${truth.won + truth.lost}`);
  check('   colpi (servizi e colpi nello scambio) come le scritte dei colpi', sum.hits === truth.serves + truth.shots, `${sum.hits} / ${truth.serves}+${truth.shots}`);
  check('   scambio più lungo come il motore', sum.longest === truth.longest, `${sum.longest} / ${truth.longest}`);
  check('   colpo più veloce come la scritta del colpo, solo colpi in campo (B34)', sum.fastest === truth.kmh, `${sum.fastest} / ${truth.kmh} (tutti ${truth.kmhAll}, fuori o in rete ${truth.kmhOut})`);
  check('   km/h veri della palla (B34: sotto i 200 a Evento)', truth.kmhAll > 40 && truth.kmhAll < 200, `${truth.kmhAll}`);
  check('   voto del tempo: Perfetto, Anticipo, Ritardo come le scritte', sum.timing.perfetto === truth.timing.perfetto && sum.timing.anticipo === truth.timing.anticipo && sum.timing.ritardo === truth.timing.ritardo, `${JSON.stringify(sum.timing)} / ${JSON.stringify(truth.timing)}`);
  // B35: la schermata della proposta grafica
  const won = engine.pg > engine.og, val = { perfetti: truth.timing.perfetto, kmh: truth.kmh, scambio: truth.longest, punti: truth.won, vincenti: sum.winners, ace: sum.aces, super: sum.superOk };
  check('A2b. B35: titolo grande con il nome («Vince Ada!» / «Bella sfida, Ada!»), livello nella pillola in alto', v.title === (won ? 'Vince Ada!' : 'Bella sfida, Ada!') && /^Fine partita · livello Evento$/i.test(v.kicker), `${v.title} · ${v.kicker}`);
  check('   game in una pillola, dal motore', v.games === `${engine.pg} game a ${engine.og}`, `${v.games} · motore ${engine.pg}-${engine.og}`);
  check('   da uno a tre riquadri, tutti con un numero positivo, e sono quelli scelti da endScreen', v.tiles.length >= 1 && v.tiles.length <= 3 && v.tiles.every(t => t.value > 0) && sameTiles(v.tiles, v.expect?.tiles), JSON.stringify(v.tiles));
  check('   ogni riquadro ha il numero vero della partita (scritte dei colpi e punti del motore)', v.tiles.every(t => val[t.id] === t.value), JSON.stringify(v.tiles.map(t => [t.id, t.value, val[t.id]])));
  check('   mai numeri negativi: niente errori, niente Anticipo/Ritardo, niente «cosa migliorare»', !NEG.test(v.text.replace(/Ecco cosa ti è venuto meglio/, '')), v.text.replace(/\s+/g, ' ').slice(0, 300));
  check('   pillola in basso: posizione in classifica se vince, consiglio gentile se perde', won ? v.pill === '1° posto nella classifica di oggi' : v.pill === 'Prossima volta prova il livello Facile', v.pill);
  check('   riga sotto il titolo solo quando perde', won ? v.sub === '' : v.sub === 'La CPU ha vinto questa volta. Ecco cosa ti è venuto meglio:', v.sub);
  check('   bottoni a pillola: Menu, Nuovo giocatore, Gioca ancora (Rivincita se perde)', v.btns.join('|') === `Menu|Nuovo giocatore|${won ? 'Gioca ancora' : 'Rivincita'}`, v.btns.join('|'));
  for (const [w, h] of [[1280, 720], [1920, 1080], [1920, 540], [1024, 600], [720, 720]]){
    await g.setViewportSize({ width: w, height: h }); await sleep(250);
    v = await readModal(g);
    check(`A3. ${w}×${h}: scheda tutta nello schermo, senza scorrere né testi tagliati o sovrapposti`, v.inView && !v.scroll && !v.clipped.length && !v.overlap, JSON.stringify({ inView: v.inView, scroll: v.scroll, clipped: v.clipped, overlap: v.overlap }));
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
  check('   B34: la riga dice anche l\'ordine (prima le vinte, poi le perse)', /Prima le partite vinte, poi le perse, ognuna per punteggio/.test(rk.note), rk.note);
  await shot('classifica-1280x720');
  // dieci partite (altri nove visitatori, livelli diversi): a schermo intero ci stanno tutte, anche sul ledwall
  await g.evaluate(() => { const ev = __natpfTennis.natpfUi.events, L = ['bambini', 'casual', 'evento', 'pro', 'leggenda'];
    for (let i = 0; i < 9; i++){ ev.nickname = `Ospite ${i + 1}`; ev.recordMatch({ level: L[i % 5], won: 4 + i, lost: 10 - i, games: i % 2 ? [1, 0] : [0, 1], win: i % 2 === 1 }); }
    ev.nickname = 'Ada'; __natpfTennis.natpfUi.lobby._paintRanking(); });
  // B34 (decisione dell'utente): in cima tutte le vinte per punteggio, sotto le perse per punteggio
  const order = await g.evaluate(() => [...document.querySelectorAll('#ranking-list li')].map(l => ({ win: /vinta/.test(l.textContent), score: +(/(\d+)/.exec(l.querySelector('em')?.textContent || '')?.[1] || 0), nick: l.querySelector('span')?.firstChild?.textContent || '' })));
  const firstLost = order.findIndex(r => !r.win), sorted = rows => rows.every((r, i) => i === 0 || rows[i - 1].score >= r.score);
  check('B3c. B34: prima tutte le vinte, poi le perse, ognuna per punteggio (anche se una persa ha più punti di una vinta)',
    firstLost > 0 && order.slice(firstLost).every(r => !r.win) && sorted(order.slice(0, firstLost)) && sorted(order.slice(firstLost)) && Math.max(...order.slice(firstLost).map(r => r.score)) > Math.min(...order.slice(0, firstLost).map(r => r.score)),
    JSON.stringify(order.map(r => `${r.win ? 'V' : 'P'}${r.score}`)));
  for (const [w, h] of [[1920, 540], [1280, 720], [720, 720], [1024, 600]]){
    await g.setViewportSize({ width: w, height: h }); await sleep(250);
    const fit = await g.evaluate(() => { const li = [...document.querySelectorAll('#ranking-list li')], n = document.getElementById('ranking-note').getBoundingClientRect(); return { rows: li.length, bottom: Math.round(Math.max(n.bottom, ...li.map(l => l.getBoundingClientRect().bottom))), h: innerHeight }; });
    check(`B3b. ${w}×${h}: dieci partite e la regola nello schermo`, fit.rows === 10 && fit.bottom <= fit.h, JSON.stringify(fit));
    await shot(`classifica-10-${w}x${h}`);
  }
  await g.setViewportSize({ width: 1280, height: 720 });
  const [dl] = await Promise.all([g.waitForEvent('download', { timeout: 8000 }), g.evaluate(() => __natpfTennis.natpfUi.kiosk.run('export'))]);
  const csv = readFileSync(await dl.path(), 'utf8');
  const csvNicks = csv.split('\n').filter(l => l.includes('Partite contro la CPU')).map(l => l.split(';')[3].replace(/"/g, ''));
  check('B4b. B34: il CSV ha lo stesso ordine della classifica', csvNicks.join('|') === order.map(r => r.nick).join('|'), `${csvNicks.join('|')} / ${order.map(r => r.nick).join('|')}`);
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
    // due colpi Perfetti di Giulia e uno di Marco (scritte dei colpi come nello stesso schermo)
    E.natpfStats.shot(E, { role: 'p1', grade: 'PERFECT', kmh: 96 }); E.natpfStats.shot(E, { role: 'p2', grade: 'PERFECT', kmh: 104 }); E.natpfStats.shot(E, { role: 'p1', grade: 'PERFECT', kmh: 88 });
    for (const w of ['player', 'opponent', 'opponent', 'opponent', 'player', 'opponent']) if (E.phase !== 'MATCH_OVER'){ E.ball.rallyStrokeCount = 3; E._awardPoint(w, 'Out'); }
  });
  check('C0. partita dello stesso schermo finita, schermata con due colonne', await g.waitForFunction(() => !document.getElementById('victory-modal').classList.contains('hidden') && document.getElementById('victory-modal').classList.contains('stats-split'), null, { timeout: 8000 }).then(() => true, () => false));
  for (const [w, h] of [[1280, 720], [1920, 1080], [1920, 540], [1024, 600], [720, 720]]){
    await g.setViewportSize({ width: w, height: h }); await sleep(250);
    v = await readModal(g);
    if (w === 1280){
      const [a, b] = v.players, valOf = s => ({ perfetti: s.timing.perfetto, kmh: s.fastest, scambio: s.longest, punti: s.points, vincenti: s.winners, ace: s.aces, super: s.superOk });
      const real = (p, s) => !!s && p.tiles.every(t => valOf(s)[t.id] === t.value);
      check('C1. stesso schermo: due schede con i nomi, chi vince e due cose belle ciascuno (numeri veri: 2 e 4 punti, i colpi Perfetti e i km/h dati)', v.players.length === 2 && a.name === 'Giulia' && b.name === 'Marco' && a.chip === 'Bella sfida' && b.chip === 'Vince'
        && v.sums[0]?.points === 2 && v.sums[1]?.points === 4 && v.sums[0]?.timing.perfetto === 2 && v.sums[1]?.timing.perfetto === 1
        && v.players.every(p => p.tiles.length >= 1 && p.tiles.length <= 2 && p.tiles.every(t => t.value > 0)) && real(a, v.sums[0]) && real(b, v.sums[1]) && v.title === 'Vince Marco!' && sameTiles(a.tiles, v.expect?.players?.[0]?.tiles) && sameTiles(b.tiles, v.expect?.players?.[1]?.tiles),
        JSON.stringify({ title: v.title, players: v.players, sums: v.sums.map(s => valOf(s)) }));
      check('   pillola dei game in alto, scambio più lungo nella pillola in basso, «Rivincita»', v.kicker === 'Fine partita · 1 game a 0' && v.pill === 'Scambio più lungo della partita: 3 colpi' && v.again === 'Rivincita' && !v.players.some(p => p.tiles.some(t => t.id === 'scambio')), JSON.stringify({ kicker: v.kicker, pill: v.pill, again: v.again }));
      check('   mai numeri negativi', !NEG.test(v.text), v.text.replace(/\s+/g, ' ').slice(0, 200));
    }
    check(`C2. stesso schermo ${w}×${h}: tutta nello schermo, niente tagliato né sovrapposto`, v.inView && !v.scroll && !v.clipped.length && !v.overlap, JSON.stringify({ inView: v.inView, scroll: v.scroll, clipped: v.clipped, overlap: v.overlap }));
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
