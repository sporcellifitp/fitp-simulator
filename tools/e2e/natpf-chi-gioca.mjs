// NATPF motore base (natpf-tennis/): «Chi gioca», livelli Bambini ed Evento, segnale del momento giusto, colpo super
// spiegato (B18.2 tappa 2, gruppo 3; docs/b18/t2-4-evento-bambini.md). Gioco vero nel browser, comandi veri del menu,
// racchetta «mouse» della modalità prova (non serve il telefono: qui non si provano i gesti).
//   1. pagina «Partita» contro la CPU: «Chi gioca?» con le tre tessere Bambino · Ragazzo · Adulto (di base Adulto), senza
//      scorrere a 1280×720, 1920×540 e 720×720; ogni tessera sceglie il suo livello (Bambini, Casual, Evento);
//   2. «Altre impostazioni» → «Livello della CPU»: cinque livelli per nome; Esperta e Leggenda si scelgono lì, e la pagina
//      lo dice sotto le tessere e nel riassunto;
//   3. «Gioca» con ognuna delle tre tessere: il motore gioca al livello giusto;
//   4. livello Evento: la CPU cambia di un gradino tra un punto e l'altro e la sua velocità segue; «Gioca ancora» continua
//      da lì, il ritorno al menu principale riparte dal valore di base;
//   5. segnale del momento giusto: l'anello compare largo, si stringe e diventa verde sulla palla; di base acceso con
//      Bambino e Adulto e spento con Ragazzo; Opzioni → «No» lo spegne, «Sì» lo accende anche a Ragazzo;
//   6. colpo super spiegato: la scritta lunga la prima volta, quella corta dopo, niente quando il super riesce. Il colpo è
//      messo a mano nel registro del motore (engine.natpfLastRacket): qui si prova la scritta, non il gesto;
//   7. chiosco e «Nuovo giocatore»: la scelta torna al valore di base, il livello Evento riparte, la spiegazione si rivede;
//   8. indirizzi di sempre: ?mode=pro e ?mode=leggenda aprono il gioco con quel livello, che resta il valore di base.
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome node natpf-chi-gioca.mjs     (OUT=cartella delle schermate)
// Non sostituisce persone vere: dice che i comandi fanno quello che devono, non che un bambino riesca a giocare.
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3171);
const OUT = path.join(SP, 'chi-gioca'); mkdirSync(OUT, { recursive: true });
const SIZES = [[1280, 720], [1920, 540], [720, 720]];
const OPT_SIZES = [...SIZES, [1024, 600]];   // revisione: a 1024×600 la riga del segnale non si vedeva senza scorrere
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
process.on('exit', () => { try { vite.kill(); } catch {} });
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));
const fmt = v => JSON.stringify(v);
const URL0 = `http://127.0.0.1:${GAME_PORT}/?intro=0`;

const ready = async p => {
  await p.waitForFunction(() => window.__natpfTennis?.natpfUi?.lobby && window.__natpfTennis.player?.model, null, { timeout: 120000 });
  await p.evaluate(async () => {
    const E = __natpfTennis, ui = E.natpfUi;
    ui.intro?.skip?.();
    window.__ev = await import('/src/natpf/natpf_evento.js');      // lo stesso modulo che usa il gioco (stato del livello Evento)
    if (!ui.testInput) ui.toggleTestInput();
    ui.selectController('mouse', { open: false });
  });
};
// pagina «Partita» contro la CPU
const toMatch = p => p.evaluate(() => { const L = __natpfTennis.natpfUi.lobby; L.setMode('cpu'); L.setFormat('singles'); L.go('match'); L.paint(); });
// la pagina come la vede chi gioca
const view = p => p.evaluate(() => {
  const E = __natpfTennis, m = document.getElementById('title-modal');
  const vis = el => !!el && !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0;
  // in vista davvero: dentro la finestra e non coperto né tagliato dalla pagina che scorre (il punto al centro è suo)
  const inView = el => { const r = el.getBoundingClientRect(); if (!(r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight + .5 && r.right <= innerWidth + .5)) return false; const at = document.elementFromPoint((r.left + r.right)/2, (r.top + r.bottom)/2); return !!at && (at === el || el.contains(at)); };
  const tiles = [...document.querySelectorAll('#difficulty-mode-group [data-difficulty]')].filter(vis);
  const levels = [...document.querySelectorAll('[data-natpf-level]')];
  return {
    label: vis(document.getElementById('who-label')) ? document.getElementById('who-label').textContent : null,
    tiles: tiles.map(b => `${b.querySelector('.tile-name').textContent}=${b.dataset.difficulty}${b.classList.contains('selected') ? '*' : ''}`),
    desc: tiles.map(b => b.querySelector('.tile-desc').textContent),
    tilesInView: tiles.every(inView), play: inView(document.getElementById('btn-start-match')), more: inView(document.getElementById('match-more-btn')),
    note: vis(document.getElementById('who-note')) ? document.getElementById('who-note').textContent : '',
    sum: document.getElementById('match-more-sum')?.textContent || '',
    lastRow: (() => { const l = document.getElementById('match-more')?.lastElementChild; return !!l && vis(l) && inView(l); })(),
    levelRow: vis(document.getElementById('level-row')), levelsInView: levels.every(b => !vis(b) || inView(b)),
    levels: levels.filter(vis).map(b => `${b.textContent.trim()}=${b.dataset.natpfLevel}${b.classList.contains('selected') ? '*' : ''}`),
    scroll: m.scrollHeight - m.clientHeight, hud: E.hud.selectedDifficulty, opp: document.getElementById('setup-opponent-label')?.textContent || '',
  };
});
const evento = p => p.evaluate(() => ({ k: +__ev.eventoK().toFixed(3), points: __ev.eventoState().points, start: __ev.EVENTO.start }));
// schermata del campo: con il gioco fermo da questa prova (window.__hold) un giro del motore senza tempo (1 decimo di
// millesimo) rimette a posto palla, scritte e telecamera, poi si ridisegna
const shotTo = async (p, name) => { await p.evaluate(() => { const E = __natpfTennis; try { if (window.__hold && window.__upd) window.__upd(1e-4); E.render(); } catch {} }); await p.screenshot({ path: path.join(OUT, name) }); };
// «Gioca» dalla pagina «Partita»: partita vera contro la CPU, ferma al primo servizio
const play = async p => {
  await p.evaluate(() => document.getElementById('btn-start-match').click());
  await p.waitForFunction(() => !__natpfTennis.autoPlayMode && __natpfTennis.phase === 'SERVE_STANCE', null, { timeout: 30000 });
  return p.evaluate(() => { const E = __natpfTennis; return { level: E.matchConfig.difficulty, multi: !!E.isMultiplayer, cpu: +E.opponent.maxSpeed.toFixed(3), cue: E.natpfUi.cue.enabled }; });
};
const menu = async p => { await p.evaluate(() => __natpfTennis.natpfUi.backToMenu()); await p.waitForTimeout(250); await toMatch(p); await p.waitForTimeout(250); };
// Una palla della CPU verso chi gioca (come natpf-rally.mjs), poi la fisica a passi di 1/120 s con il segnale aggiornato a
// ogni passo: le fasi dell'anello una dopo l'altra. Chi gioca non colpisce. stopAt: fase a cui fermarsi (per la schermata)
const incoming = (p, stopAt = null) => p.evaluate(stopAt => {
  const E = __natpfTennis, C = E.natpfUi.cue, V = E.ball.pos.constructor;
  if (!window.__upd){ window.__upd = E.update.bind(E); E.update = dt => (window.__hold ? undefined : window.__upd(dt)); }
  window.__hold = true;                                    // il gioco avanza solo con i passi di questa prova
  E.phase = 'RALLY'; E.phaseTimer = 0; E.natpfPaused = false; E.player.pos.set(0, 0, 11.4); E.player.targetPos.copy(E.player.pos);
  Object.assign(E.ball, { inPlay: true, lastHitter: 'opponent', bounceCountOnCurrentSide: 0, rallyStrokeCount: 1 });
  E.ball.pos.set(-.5, 1, -11); E._launchBallToTarget(E.ball.pos, new V(.6, 0, 8.6), 1.05, { topspin: 14 }); E._natpfPlanPlayer?.();
  const seen = [], diam = []; let at = null;
  for (let i = 0; i < 4*120 && E.phase === 'RALLY'; i++){
    E._stepPhysics(1/120); C.update(1/120);
    const v = C.view;
    if (v){
      if (seen[seen.length - 1] !== v.phase) seen.push(v.phase);
      diam.push(v.diameter);
      if (stopAt && v.phase === stopAt && (stopAt !== 'wait' || v.size < .55)){ at = { phase: v.phase, diameter: v.diameter, full: !!C.sprite && C.sprite.material.map === C._maps.full, visible: !!C.sprite?.visible, onBall: C.sprite ? +C.sprite.position.distanceTo(E.ball.pos).toFixed(3) : null, color: C.sprite ? '#' + C.sprite.material.color.getHexString() : null, scale: C.sprite ? +C.sprite.scale.x.toFixed(2) : null }; break; }
    } else if (seen.length && !stopAt) break;
  }
  const shrink = diam.every((d, i) => i === 0 || d <= diam[i - 1] + 1e-9);
  return { seen, first: diam[0] ?? null, last: diam[diam.length - 1] ?? null, shrink, at, sprite: !!C.sprite?.visible, phase: E.phase };
}, stopAt);
const release = p => p.evaluate(() => { window.__hold = false; });
// la scritta del colpo super come la vede chi gioca, e dove sta rispetto alle barre di potenza ed energia
const hint = p => p.evaluate(() => {
  const el = document.getElementById('natpf-super-hint'), on = !!el && !el.classList.contains('hidden');
  const r = el?.getBoundingClientRect(), m = document.querySelector('.natpf-meters')?.getBoundingClientRect();
  return { on, text: on ? el.textContent : '', inView: on ? r.top >= 0 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight : null,
    px: on ? parseFloat(getComputedStyle(el).fontSize) : 0, aboveMeters: on && m && m.height > 0 ? r.bottom <= m.top + 1 || r.right <= m.left + 1 || r.left >= m.right - 1 : null, lines: on ? (() => { const c = getComputedStyle(el); return Math.round((r.height - parseFloat(c.paddingTop) - parseFloat(c.paddingBottom))/parseFloat(c.lineHeight)); })() : 0 };
});
// un colpo di chi gioca nel registro del motore (come lo scrive game_engine._natpfRacketShot), poi un giro della scritta
const racket = (p, why, extra = {}) => p.evaluate(({ why, extra }) => {
  const E = __natpfTennis; E.phase = 'RALLY';
  E.natpfLastRacket = { who: 'player', intent: { power: 1, typePower: 1, depth: 1, shot: 'topspin' }, out: { shot: 'TOPSPIN' }, super: null, superWhy: [why], at: E.elapsedTime, ...extra };
  E.natpfUi.superHint.update(1/60);
}, { why, extra });
// un punto nuovo: la scritta può uscire di nuovo (al massimo una a punto)
const newPoint = p => p.evaluate(() => { const E = __natpfTennis, was = E.phase; E.phase = 'SERVE_STANCE'; E.natpfUi.superHint.update(1/60); E.phase = was; });
// le voci della situazione come le scrive il motore (natpfLastRacket.sit)
const SIT = { reach: 1, prep: 1, stretch: 1, fast: 1, deep: 1, high: 1, pressure: 1, running: 0 };

const B = await launch();
try {
  /* ---------- 1 e 2: la pagina «Partita» ---------- */
  const { ctx, p, errs } = await page(B, URL0, { w: 1280, h: 720 });
  await ready(p);
  await p.evaluate(() => { try { localStorage.removeItem('natpf-tennis.segnaleTempo'); } catch {} __natpfTennis.natpfUi.cue.setPref('auto'); });
  await toMatch(p); await p.waitForTimeout(500);
  let v = await view(p);
  check('pagina «Partita»: «Chi gioca?» con Bambino · Ragazzo · Adulto al posto del livello; di base Adulto (livello Evento)',
    v.label === 'Chi gioca?' && v.tiles.join(' ') === 'Bambino=bambini Ragazzo=casual Adulto=evento*' && v.hud === 'evento' && v.note === '' && !/CPU/.test(v.sum), fmt(v));
  check('le tre tessere dicono in parole semplici che cosa cambia', /lenta/.test(v.desc[0]) && /facile/.test(v.desc[1]) && /si regola/.test(v.desc[2]), v.desc.join(' | '));
  for (const [w, h] of SIZES){
    await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(350);
    await p.evaluate(() => { const L = __natpfTennis.natpfUi.lobby; L.matchMore = false; L.paint(); });
    const a = await view(p);
    check(`${w}×${h}: «Chi gioca?», le tre tessere, «Altre impostazioni» e «Gioca» in vista senza scorrere`, a.scroll <= 0 && a.tilesInView && a.play && a.more && a.label === 'Chi gioca?', fmt({ scroll: a.scroll, tiles: a.tilesInView, play: a.play, more: a.more }));
    await p.screenshot({ path: path.join(OUT, `chi-gioca-${w}x${h}.png`) });
    await p.click('#match-more-btn'); await p.waitForTimeout(300);
    const b = await view(p);
    // (aperte, su uno schermo basso la pagina scorre da sola fino all'ultima riga, come dal B15: titolo e tessere salgono)
    check(`${w}×${h}: «Altre impostazioni» aperte: «Livello della CPU» con i cinque livelli, tutti in vista insieme a «Gioca»`,
      b.levelRow && b.levels.join(' ') === 'Bambini=bambini Facile=casual Evento=evento* Esperta=pro Leggenda=leggenda' && b.scroll <= 0 && b.levelsInView && b.play, fmt({ levels: b.levels, scroll: b.scroll, inView: b.levelsInView, play: b.play }));
    await p.screenshot({ path: path.join(OUT, `altre-impostazioni-${w}x${h}.png`) });
    await p.click('#match-more-btn'); await p.waitForTimeout(150);
  }
  await p.setViewportSize({ width: 1280, height: 720 }); await p.waitForTimeout(350);
  const picks = [];
  for (const who of ['bambino', 'ragazzo', 'adulto']){ await p.click(`#difficulty-mode-group [data-who="${who}"]`); await p.waitForTimeout(120); const a = await view(p); picks.push(`${who}:${a.hud}:${a.tiles.find(t => t.endsWith('*'))}`); }
  check('ogni tessera sceglie il suo livello: Bambino → Bambini, Ragazzo → Casual, Adulto → Evento', picks.join(' ') === 'bambino:bambini:Bambino=bambini* ragazzo:casual:Ragazzo=casual* adulto:evento:Adulto=evento*', picks.join(' '));
  await p.click('#match-more-btn'); await p.waitForTimeout(200);
  await p.click('[data-natpf-level="pro"]'); await p.waitForTimeout(200);
  v = await view(p);
  // (revisione: con «Altre impostazioni» aperte la riga sotto le tessere non c'è: il livello scelto si vede già lì, e la
  // riga in più tagliava a metà l'ultima riga sopra «Gioca»)
  check('«Livello della CPU» → Esperta: nessuna tessera scelta, il livello è scelto nella riga, l\'ultima riga («Visuale») resta in vista intera',
    v.hud === 'pro' && !v.tiles.some(t => t.endsWith('*')) && v.note === '' && v.levels.includes('Esperta=pro*') && v.opp === 'CPU Pro' && v.scroll <= 0 && v.lastRow && v.play, fmt(v));
  await p.screenshot({ path: path.join(OUT, 'livello-esperta-aperte-1280x720.png') });
  await p.click('#match-more-btn'); await p.waitForTimeout(200);
  v = await view(p);
  check('… chiuse «Altre impostazioni»: la riga sotto le tessere dice il livello, il riassunto comincia con «CPU Esperta»',
    /CPU Esperta.*Altre impostazioni/.test(v.note) && v.sum.startsWith('CPU Esperta') && v.scroll <= 0 && v.play, fmt({ note: v.note, sum: v.sum, scroll: v.scroll }));
  await p.screenshot({ path: path.join(OUT, 'livello-esperta-1280x720.png') });
  await p.click('#match-more-btn'); await p.waitForTimeout(200);
  await p.click('[data-natpf-level="leggenda"]'); await p.waitForTimeout(200);
  v = await view(p);
  const legOpen = { hud: v.hud, note: v.note, lastRow: v.lastRow, levels: v.levels };
  await p.click('#match-more-btn'); await p.waitForTimeout(200);
  v = await view(p);
  check('… → Leggenda: come prima si gioca contro la Leggenda', legOpen.hud === 'leggenda' && legOpen.note === '' && legOpen.lastRow && legOpen.levels.includes('Leggenda=leggenda*') && /CPU Leggenda/.test(v.note) && v.sum.startsWith('CPU Leggenda'), fmt({ legOpen, note: v.note, sum: v.sum }));
  const leg = await play(p);
  check('«Gioca» con Leggenda scelta: il motore gioca a Leggenda, senza segnale', leg.level === 'leggenda' && leg.cue === false, fmt(leg));
  await menu(p);
  await p.click('#difficulty-mode-group [data-who="bambino"]'); await p.waitForTimeout(150);
  v = await view(p);
  check('una tessera di «Chi gioca» toglie il livello scelto per nome: la riga sparisce', v.hud === 'bambini' && v.note === '' && !/CPU/.test(v.sum), fmt({ hud: v.hud, note: v.note, sum: v.sum }));

  /* ---------- 3: «Gioca» con le tre tessere ---------- */
  const started = {};
  for (const who of ['bambino', 'ragazzo', 'adulto']){
    await p.click(`#difficulty-mode-group [data-who="${who}"]`); await p.waitForTimeout(120);
    started[who] = await play(p);
    if (who !== 'adulto') await menu(p);
  }
  check('«Gioca»: Bambino → livello Bambini, Ragazzo → Casual, Adulto → Evento; contro la CPU, non tra due persone',
    started.bambino.level === 'bambini' && started.ragazzo.level === 'casual' && started.adulto.level === 'evento' && !started.adulto.multi, fmt(started));
  check('segnale di base: acceso con Bambino e Adulto, spento con Ragazzo', started.bambino.cue === true && started.ragazzo.cue === false && started.adulto.cue === true, fmt(started));

  /* ---------- 4: livello Evento, un gradino a punto ---------- */
  const e0 = await evento(p);
  const s0 = started.adulto.cpu;
  await p.evaluate(() => __natpfTennis._awardPoint('player', 'Out'));
  const e1 = await evento(p), s1 = await p.evaluate(() => +__natpfTennis.opponent.maxSpeed.toFixed(3));
  await p.evaluate(() => { const E = __natpfTennis; for (let i = 0; i < 6*120 && E.phase !== 'SERVE_STANCE'; i++) E._stepPhysics(1/120); E._awardPoint('opponent', 'Out'); });
  const e2 = await evento(p), s2 = await p.evaluate(() => +__natpfTennis.opponent.maxSpeed.toFixed(3));
  check('livello Evento: parte dal valore di base; punto vinto → CPU un gradino più brava e più veloce; punto perso → un gradino (più grande) più facile',
    e0.k === e0.start && e0.points === 0 && e1.k > e0.k && s1 > s0 && e2.k < e1.k && s2 < s1 && (e1.k - e2.k) > (e1.k - e0.k) && e2.points === 2, fmt({ e0, e1, e2, s0, s1, s2 }));

  /* ---------- 5: segnale del momento giusto ---------- */
  await p.evaluate(() => { const E = __natpfTennis; for (let i = 0; i < 6*120 && E.phase !== 'SERVE_STANCE'; i++) E._stepPhysics(1/120); E.hud.hideCenterBanner?.(); });
  const ring = await incoming(p);
  check('segnale (Adulto): l\'anello compare largo, si stringe sempre, diventa verde nell\'istante giusto, poi rosso e sparisce',
    ring.seen.join(' ') === 'wait now late' && ring.first > 2.5 && ring.shrink && ring.last < .7 && ring.sprite === false, fmt(ring));
  for (const [w, h] of SIZES){
    await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(400);
    const wait = await incoming(p, 'wait');
    check(`${w}×${h}: anello bianco attorno alla palla mentre arriva`, wait.at?.phase === 'wait' && wait.at.visible && wait.at.onBall < .01 && wait.at.color === '#ffffff' && !wait.at.full, fmt(wait.at));
    await shotTo(p, `segnale-aspetta-${w}x${h}.png`);
    const now = await incoming(p, 'now');
    check(`${w}×${h}: anello verde, pieno e un poco più largo, stretto sulla palla nell'istante giusto`, now.at?.phase === 'now' && now.at.visible && now.at.onBall < .01 && now.at.color === '#39e58c' && now.at.diameter < 1.2 && now.at.full && now.at.scale >= now.at.diameter*1.25, fmt(now.at));
    await shotTo(p, `segnale-adesso-${w}x${h}.png`);
  }
  await p.setViewportSize({ width: 1280, height: 720 }); await p.waitForTimeout(300);
  await release(p);

  /* ---------- 6: colpo super spiegato ---------- */
  await p.evaluate(() => { const E = __natpfTennis; E.natpfUi.superHint.reset(); E.hud.hideCenterBanner?.(); });
  await incoming(p, 'now');                       // gioco fermo con la palla sulla racchetta: la scritta arriva dopo un colpo
  // la qualità mancava (superShot: «in corsa o in allungo») ma chi gioca era fermo: bastava portare indietro la racchetta.
  // È il motivo più lungo: le misure qui sotto valgono per tutte le frasi
  await racket(p, 'in corsa o in allungo', { sit: { ...SIT, prep: .86, deep: .9 } });
  const h1 = await hint(p);
  check('colpo super spiegato, prima volta: la regola in una riga e il motivo vero di questa volta (non «eri in corsa»)',
    h1.on && h1.text === 'Colpo super: gesto fortissimo, a tempo e da fermo, su una palla alta o lenta. Questa volta non hai portato indietro la racchetta.' && h1.inView && h1.aboveMeters !== false, fmt(h1));
  for (const [w, h] of SIZES){
    await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(400);
    const a = await hint(p);
    check(`${w}×${h}: la scritta del super (la frase più lunga) sta nello schermo, in al più tre righe da almeno 14 px, senza coprire potenza ed energia`, a.on && a.inView && a.lines <= 3 && a.px >= 14 && a.aboveMeters !== false, fmt(a));
    await shotTo(p, `super-spiegato-${w}x${h}.png`);
  }
  await p.setViewportSize({ width: 1280, height: 720 }); await p.waitForTimeout(300);
  await racket(p, 'fuori tempo');
  const h1b = await hint(p);
  check('… nello stesso punto un altro super mancato non cambia la scritta (al massimo una a punto)', h1b.on && h1b.text === h1.text, fmt(h1b));
  await newPoint(p);
  await racket(p, 'fuori tempo');
  const h2 = await hint(p);
  check('… nei punti dopo: «Super mancato: eri fuori tempo.»', h2.on && h2.text === 'Super mancato: eri fuori tempo.', fmt(h2));
  const reasons = [];
  for (const [sit, want] of [[{ ...SIT, deep: .78 }, 'la palla era troppo profonda'], [{ ...SIT, pressure: .7 }, 'lo scambio era lungo'], [{ ...SIT, reach: .7, running: .1 }, 'la palla era lontana'], [{ ...SIT, reach: .7, running: .9 }, 'eri in corsa']]){
    await newPoint(p); await racket(p, 'in corsa o in allungo', { sit });
    const h = await hint(p); reasons.push(h.text === `Super mancato: ${want}.` ? 'ok' : h.text);
  }
  check('… quando manca la qualità dice la voce vera: palla profonda, scambio lungo, palla lontana; «eri in corsa» solo se correva', reasons.every(r => r === 'ok'), reasons.join(' | '));
  await newPoint(p); await racket(p, 'fuori tempo');
  await shotTo(p, 'super-mancato-1280x720.png');
  await p.evaluate(() => { const E = __natpfTennis; E.elapsedTime += 4; E.natpfUi.superHint.update(1/60); });
  const h3 = await hint(p);
  await newPoint(p); await racket(p, 'gesto fortissimo', { super: 'alta' });
  const h4 = await hint(p);
  await newPoint(p); await racket(p, 'gesto non abbastanza forte', { intent: { power: .5, typePower: .5 } });
  const h5 = await hint(p);
  check('… sparisce dopo pochi secondi; niente scritta se il super riesce o se il gesto non era fortissimo', !h3.on && !h4.on && !h5.on, fmt({ h3, h4, h5 }));
  await release(p);

  /* ---------- 4 (seguito): «Gioca ancora» tiene il livello Evento, il menu principale lo fa ripartire ---------- */
  const kPlayed = await evento(p);
  await p.evaluate(() => __natpfTennis.natpfUi.backToMenu('match'));       // «Gioca ancora»: pagina «Partita»
  const kAgain = await evento(p);
  await p.evaluate(() => __natpfTennis.natpfUi.backToMenu());              // «Menu» a fine partita, «Torna al menu» dalla pausa
  const kMenu = await evento(p);
  check('livello Evento: «Gioca ancora» continua da dove era arrivato; tornare al menu principale lo riporta al valore di base',
    kPlayed.k !== kPlayed.start && kPlayed.points === 2 && kAgain.k === kPlayed.k && kAgain.points === 2 && kMenu.k === kMenu.start && kMenu.points === 0, fmt({ kPlayed, kAgain, kMenu }));

  /* ---------- 5 (seguito): Opzioni → Segnale del momento giusto ---------- */
  await p.evaluate(() => { const ui = __natpfTennis.natpfUi; ui.backToMenu(); ui.lobby.go('options'); });
  await p.waitForTimeout(400);
  const opt0 = await p.evaluate(() => { const b = [...document.querySelectorAll('[data-natpf-cue]')]; return { row: b.map(b => `${b.textContent.trim()}${b.classList.contains('selected') ? '*' : ''}`).join(' '), label: b[0].closest('.lobby-row').querySelector('.lobby-label').textContent, after: b[0].closest('.lobby-row').previousElementSibling?.querySelector('.lobby-label')?.textContent }; });
  check('Opzioni: «Segnale del momento giusto: Di base · Sì · No» dopo «Giochi con la mano», di base scelto «Di base»', opt0.row === 'Di base* Sì No' && opt0.label === 'Segnale del momento giusto' && opt0.after === 'Giochi con la mano', fmt(opt0));
  for (const [w, h] of OPT_SIZES){
    await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(350);
    // la pagina Opzioni ha dieci righe e scorre (già prima). Revisione: la riga del segnale è la quarta, dopo «Giochi con la
    // mano»: si vede intera appena si apre la pagina, senza scorrere
    const s = await p.evaluate(() => { const row = document.querySelector('[data-natpf-cue="off"]').closest('.lobby-row');
      for (let el = row.parentElement; el; el = el.parentElement) if (el.scrollTop) el.scrollTop = 0;
      const seen = el => { const r = el.getBoundingClientRect(); if (!(r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth)) return false; const at = document.elementFromPoint((r.left + r.right)/2, (r.top + r.bottom)/2); return !!at && (at === el || el.contains(at)); };
      return { buttons: [...row.querySelectorAll('[data-natpf-cue]')].every(seen), label: seen(row.querySelector('.lobby-label')) }; });
    check(`${w}×${h}: Opzioni, la riga del segnale si vede intera senza scorrere (etichetta e i tre pulsanti)`, s.buttons && s.label, fmt(s));
    await p.screenshot({ path: path.join(OUT, `opzioni-segnale-${w}x${h}.png`) });
  }
  await p.setViewportSize({ width: 1280, height: 720 }); await p.waitForTimeout(300);
  await p.click('[data-natpf-cue="off"]'); await p.waitForTimeout(150);
  const off = await p.evaluate(() => ({ saved: localStorage.getItem('natpf-tennis.segnaleTempo'), pref: __natpfTennis.natpfUi.cue.pref, toast: document.getElementById('natpf-toast').textContent, sel: document.querySelector('[data-natpf-cue].selected')?.dataset.natpfCue }));
  check('«No»: salvato, detto a chi gioca', off.saved === '0' && off.pref === 'off' && off.sel === 'off' && /spento a tutti i livelli/.test(off.toast), fmt(off));
  await toMatch(p); await p.waitForTimeout(200);
  await p.click('#difficulty-mode-group [data-who="adulto"]');
  const offGame = await play(p);
  const offRing = await incoming(p);
  await release(p);
  check('«No»: con Adulto il segnale non c\'è più', offGame.level === 'evento' && offGame.cue === false && offRing.seen.length === 0 && !offRing.sprite, fmt({ offGame, offRing }));
  await p.evaluate(() => { const ui = __natpfTennis.natpfUi; ui.backToMenu(); ui.lobby.go('options'); }); await p.waitForTimeout(300);
  await p.click('[data-natpf-cue="on"]'); await p.waitForTimeout(150);
  await toMatch(p); await p.waitForTimeout(200);
  await p.click('#difficulty-mode-group [data-who="ragazzo"]');
  const onGame = await play(p);
  const onRing = await incoming(p);
  await release(p);
  check('«Sì»: il segnale c\'è anche con Ragazzo (livello Casual)', onGame.level === 'casual' && onGame.cue === true && onRing.seen.join(' ') === 'wait now late' && await p.evaluate(() => localStorage.getItem('natpf-tennis.segnaleTempo')) === '1', fmt({ onGame, seen: onRing.seen }));
  await p.evaluate(() => { const ui = __natpfTennis.natpfUi; ui.backToMenu(); ui.lobby.go('options'); }); await p.waitForTimeout(300);
  await p.click('[data-natpf-cue="auto"]'); await p.waitForTimeout(150);
  check('«Di base»: la scelta salvata si toglie', await p.evaluate(() => localStorage.getItem('natpf-tennis.segnaleTempo') === null && __natpfTennis.natpfUi.cue.pref === 'auto'));

  /* ---------- 7: chiosco e «Nuovo giocatore» ---------- */
  await toMatch(p); await p.waitForTimeout(200);
  await p.click('#difficulty-mode-group [data-who="bambino"]'); await p.waitForTimeout(120);
  await p.evaluate(() => { __ev.eventoPoint(true); __ev.eventoPoint(true); __natpfTennis.natpfUi.superHint.seen = true; });
  const before = { ...(await evento(p)), hud: (await view(p)).hud };
  await p.evaluate(() => __natpfTennis.natpfUi.kiosk.reset());
  await p.waitForTimeout(300);
  const afterK = await p.evaluate(() => ({ hud: __natpfTennis.hud.selectedDifficulty, k: __ev.eventoK(), points: __ev.eventoState().points, seen: __natpfTennis.natpfUi.superHint.seen, step: __natpfTennis.natpfUi.lobby.step }));
  check('chiosco che riparte: «Chi gioca» torna Adulto, il livello Evento riparte dal valore di base, la spiegazione del super si rivede',
    before.hud === 'bambini' && before.k > before.start && afterK.hud === 'evento' && afterK.k === before.start && afterK.points === 0 && afterK.seen === false && afterK.step === 'menu', fmt({ before, afterK }));
  await toMatch(p); await p.waitForTimeout(200);
  v = await view(p);
  check('… e la pagina «Partita» mostra di nuovo Adulto scelto', v.tiles.join(' ') === 'Bambino=bambini Ragazzo=casual Adulto=evento*' && v.note === '', fmt(v.tiles));
  await p.click('#difficulty-mode-group [data-who="ragazzo"]'); await p.waitForTimeout(120);
  await play(p);
  await p.evaluate(() => { const E = __natpfTennis; E.matchConfig.gamesToWin = 1; __ev.eventoPoint(false); E.natpfUi.superHint.seen = true; for (let i = 0; i < 4 && E.phase !== 'MATCH_OVER'; i++) E._awardPoint('player', 'Out'); });
  // (nel Chromium senza GPU il gioco va piano: la schermata finale si aspetta più a lungo)
  await p.waitForFunction(() => { const m = document.getElementById('victory-modal'), b = document.getElementById('btn-new-player'); return m && !m.classList.contains('hidden') && b && b.getBoundingClientRect().height > 0; }, null, { timeout: 90000, polling: 200 });
  await p.waitForTimeout(600);
  await p.evaluate(() => document.getElementById('btn-new-player').click()); await p.waitForTimeout(500);
  const afterN = await p.evaluate(() => ({ hud: __natpfTennis.hud.selectedDifficulty, k: __ev.eventoK(), points: __ev.eventoState().points, seen: __natpfTennis.natpfUi.superHint.seen }));
  check('«Nuovo giocatore» a fine partita: «Chi gioca» torna Adulto, livello Evento da capo, spiegazione da rivedere', afterN.hud === 'evento' && afterN.k === before.start && afterN.points === 0 && afterN.seen === false, fmt(afterN));
  check('nessun errore JavaScript', !errs.length, errs.slice(0, 3).join(' | '));
  await ctx.close();

  /* ---------- 8: indirizzi di sempre ---------- */
  for (const [mode, name] of [['pro', 'CPU Esperta'], ['leggenda', 'CPU Leggenda'], ['casual', null], ['bambini', null]]){
    const u = await page(B, `${URL0}&mode=${mode}`, { w: 1280, h: 720 });
    await ready(u.p); await toMatch(u.p); await u.p.waitForTimeout(400);
    const a = await view(u.p);
    const sel = a.tiles.find(t => t.endsWith('*')) || '';
    const okPage = a.hud === mode && (name ? !sel && a.note.includes(name) && a.sum.startsWith(name) : sel.includes(`=${mode}*`) && a.note === '');
    await u.p.click('#difficulty-mode-group [data-who="bambino"]'); await u.p.waitForTimeout(120);
    await u.p.evaluate(() => __natpfTennis.natpfUi.kiosk.reset()); await u.p.waitForTimeout(250);
    const back = await u.p.evaluate(() => __natpfTennis.hud.selectedDifficulty);
    await toMatch(u.p); await u.p.waitForTimeout(200);
    const g = await play(u.p);
    check(`?mode=${mode}: il gioco si apre con quel livello${name ? ` (detto sotto le tessere: «${name}»)` : ''}, il chiosco ci ritorna, «Gioca» lo usa`, okPage && back === mode && g.level === mode, fmt({ hud: a.hud, sel, note: a.note, sum: a.sum, back, level: g.level }));
    check(`?mode=${mode}: nessun errore JavaScript`, !u.errs.length, u.errs.slice(0, 3).join(' | '));
    await u.ctx.close();
  }
} finally {
  await B.close();
}
summary();
setTimeout(() => process.exit(), 300);
