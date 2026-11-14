// B38 · tastiera a schermo e «Gioca come Ospite», con il SOLO MOUSE (clic veri del mouse di Playwright; nessun tasto,
// salvo dove la prova controlla proprio che un tasto vero chiuda la tastiera):
//   A. 1920 × 1080: Minigiochi → Target Rush → clic sul campo del nome → tastiera → «Bea» scritto cliccando i tasti (⇧ da
//      sola all'inizio, à e ⌫) → «Fatto» (doppio clic: il secondo non arriva sotto) → «Avanti ›» → il nome nel minigioco
//      (riquadro in campo) e nella classifica del giorno;
//   B. stesso schermo: i due nomi, la tastiera nella metà di chi scrive (Player 1 a sinistra, Player 2 a destra), le
//      schede con i nomi, il conto alla rovescia che aspetta chi scrive;
//   C. codice della sfida tra due computer: tasti del codice (maiuscole, cifre, trattino; niente accenti), campo in vista
//      sopra la tastiera (la pagina sale), «Entra ›» porta alla stanza AT-K3ZQ;
//   D. «Gioca come Ospite»: un clic, si gioca, fuori classifica; nel passo di «Nuovo giocatore» al posto di «Salta»;
//   E. diagnostica: nota (testo) e ritardo dello schermo (tastierino numerico);
//   F. tasto vero: la tastiera sparisce e la lettera arriva; Esc; Maiusc+D in un nome non apre la diagnostica; opzione dello
//      stand «Tastiera a schermo» Automatica → Sempre → Mai;
//   G. aree strette: finestra 720 × 720 e area di ledwall 720 × 720 dentro 1920 × 1080 (?area=): tastiera dentro l'area,
//      campo in vista sopra.
// Schermate in OUT/tastiera (OUT di th.mjs).
//   cd tools/e2e && CHROMIUM_PATH=/percorso/chrome GAME_PORT=4101 node natpf-tastiera-schermo.mjs
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3141);
const OUT = path.join(SP, 'tastiera'); mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
process.on('exit', () => { try { vite.kill(); } catch {} });
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await sleep(500); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

const B = await launch();
const open = async (w, h, q = '') => {
  const ctx = await B.newContext({ viewport: { width: w, height: h } }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.goto(`http://127.0.0.1:${GAME_PORT}/?intro=0${q}`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__natpfTennis?.player?.model && __natpfTennis.natpfUi?.lobby?.visible, null, { timeout: 120000 });
  await p.waitForTimeout(500);
  return { ctx, p, errs };
};
// la tastiera e il campo: rettangoli (pixel della finestra), area del gioco, tasti
const kbState = p => p.evaluate(() => {
  const k = document.getElementById('natpf-tastiera'), T = __natpfTennis.natpfUi.tastiera, f = T.field;
  const r = e => { if (!e) return null; const q = e.getBoundingClientRect(); return { l: Math.round(q.left), t: Math.round(q.top), r: Math.round(q.right), b: Math.round(q.bottom), w: Math.round(q.width), h: Math.round(q.height) }; };
  const key = k?.querySelector('.osk-main [data-k="a"]'), done = k?.querySelector('.osk-main [data-k="done"]'), dig = k?.querySelector('.osk-num [data-k="1"]');
  const vp = (() => { const s = getComputedStyle(document.documentElement); return { x: parseFloat(s.getPropertyValue('--area-x')) || 0, y: parseFloat(s.getPropertyValue('--area-y')) || 0, w: parseFloat(s.getPropertyValue('--area-w')) || innerWidth, h: parseFloat(s.getPropertyValue('--area-h')) || innerHeight }; })();
  return { open: !!k && !k.classList.contains('hidden') && T.visible, kind: k?.dataset.kind, half: k?.dataset.half || '', kb: r(k), field: r(f), value: f?.value ?? null, key: r(key), done: r(done), digit: r(dig), area: vp, inner: [innerWidth, innerHeight],
    nocodeHidden: k ? [...k.querySelectorAll('[data-nocode]')].every(b => getComputedStyle(b).visibility === 'hidden') : null,
    focus: document.activeElement === f };
});
// clic veri del mouse sui tasti (tastierino numerico se la tastiera è quella delle cifre)
const clickKeys = async (p, keys) => {
  const pad = await p.evaluate(() => (document.getElementById('natpf-tastiera').classList.contains('digits') ? 'osk-num' : 'osk-main'));
  for (const k of keys){ await p.click(`#natpf-tastiera:not(.hidden) .${pad} [data-k="${k}"]`); await p.waitForTimeout(60); }
};
const above = s => !!s.field && !!s.kb && s.field.b <= s.kb.t && s.field.t >= s.area.y;
const inside = s => !!s.kb && s.kb.l >= s.area.x - 1 && s.kb.r <= s.area.x + s.area.w + 1 && s.kb.t >= s.area.y - 1 && s.kb.b <= s.area.y + s.area.h + 1;

try {
  /* ---------- A. nome del minigioco, solo mouse ---------- */
  {
    const { ctx, p, errs } = await open(1920, 1080);
    await p.click('[data-menu="challenges"]'); await p.waitForTimeout(400);
    await p.click('[data-challenge="rush"]'); await p.waitForSelector('#natpf-nick:not(.hidden)', { timeout: 5000 }); await p.waitForTimeout(400);
    const sheet = await p.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect(); const f = r('nick-input'), g = r('nick-guest'); return { title: document.getElementById('nick-title').textContent, guest: g.width > 0 && !document.getElementById('nick-guest').classList.contains('hidden'), sameRow: Math.abs((f.top + f.bottom)/2 - (g.top + g.bottom)/2) < 6 && g.left >= f.right - 1, back: document.getElementById('nick-cancel').textContent, kb: !document.getElementById('natpf-tastiera').classList.contains('hidden') }; });
    check('A: foglio «Il tuo nickname» con «Gioca come Ospite» accanto al campo, la tastiera non c\'è ancora', sheet.title === 'Il tuo nickname' && sheet.guest && sheet.sameRow && sheet.back === 'Indietro' && !sheet.kb, JSON.stringify(sheet));
    await p.screenshot({ path: `${OUT}/A0-foglio-nome-ospite-1920x1080.png` });
    await p.click('#nick-input'); await p.waitForTimeout(300);
    let s = await kbState(p);
    check('A: clic sul campo del nome → tastiera a schermo, campo in vista sopra la tastiera, dentro lo schermo', s.open && s.kind === 'name' && above(s) && inside(s) && s.focus, JSON.stringify(s));
    check('A: tasti grandi da lontano (≥ 6 % dell\'altezza) e «Fatto» grande', s.key.h >= 0.06*1080 && s.done.w >= 3*s.key.w, JSON.stringify({ key: s.key, done: s.done }));
    await p.screenshot({ path: `${OUT}/A1-tastiera-nome-1920x1080.png` });
    const shiftOn = await p.evaluate(() => document.getElementById('natpf-tastiera').classList.contains('shift'));
    await clickKeys(p, ['b', 'e', 'a', 'à']);
    s = await kbState(p);
    check('A: «Bea» + à scritti con il mouse (maiuscola da sola all\'inizio)', shiftOn && s.value === 'Beaà', JSON.stringify({ shiftOn, v: s.value }));
    await clickKeys(p, ['back']); s = await kbState(p);
    check('A: ⌫ cancella', s.value === 'Bea' && s.open && s.focus, JSON.stringify(s));
    // «Fatto» con un doppio clic: si chiude e il secondo clic non arriva al foglio sotto (il foglio resta, nome com'era)
    const done = s.done;
    await p.mouse.dblclick(done.l + done.w/2, done.t + done.h/2); await p.waitForTimeout(300);
    const after = await p.evaluate(() => ({ kb: !document.getElementById('natpf-tastiera').classList.contains('hidden'), sheet: !document.getElementById('natpf-nick').classList.contains('hidden'), v: document.getElementById('nick-input').value, step: __natpfTennis.natpfUi.lobby.step }));
    check('A: «Fatto» (doppio clic) chiude la tastiera; il foglio resta con «Bea»', !after.kb && after.sheet && after.v === 'Bea', JSON.stringify(after));
    await p.click('#nick-form button[type="submit"]'); await p.waitForTimeout(400);
    const named = await p.evaluate(() => ({ nick: __natpfTennis.natpfUi.events.nickname, sheet: !document.getElementById('natpf-nick').classList.contains('hidden'), step: __natpfTennis.natpfUi.lobby.step }));
    check('A: «Avanti ›» → nickname «Bea», si va avanti verso il minigioco', named.nick === 'Bea' && !named.sheet && named.step === 'controller', JSON.stringify(named));
    // il minigioco (senza racchetta qui: lo si avvia e lo si chiude dal codice) mostra il nome e la classifica lo tiene
    await p.evaluate(() => { __natpfTennis.natpfUi.events.start('rush'); });
    await p.waitForTimeout(700);
    const hud = await p.evaluate(() => document.querySelector('#natpf-challenge-hud .ch-kicker')?.textContent || '');
    check('A: in campo il riquadro del minigioco dice «Target Rush · Bea»', /Bea/.test(hud), hud);
    await p.screenshot({ path: `${OUT}/A2-minigioco-con-il-nome-1920x1080.png` });
    await p.evaluate(() => { const ev = __natpfTennis.natpfUi.events; ev.active.score = 480; ev.finish(); });
    await p.waitForTimeout(600);
    const res = await p.evaluate(() => ({ title: document.getElementById('lobby-t-result').textContent, rank: document.getElementById('result-rank').textContent, top: [...document.querySelectorAll('#result-top li span')].map(e => e.textContent) }));
    check('A: risultato «Bravo, Bea!», 1° posto, «Bea» nella classifica del giorno', /Bea/.test(res.title) && /1° posto/.test(res.rank) && res.top.includes('Bea'), JSON.stringify(res));
    await p.evaluate(() => { const L = __natpfTennis.natpfUi.lobby; L.rankingTab = 'rush'; L.go('ranking'); }); await p.waitForTimeout(400);
    const rk = await p.evaluate(() => [...document.querySelectorAll('#ranking-list li span')].map(e => e.textContent));
    check('A: pagina «Classifica» con «Bea»', rk.includes('Bea'), JSON.stringify(rk));
    await p.screenshot({ path: `${OUT}/A3-classifica-con-il-nome-1920x1080.png` });
    check('A: nessun errore nella pagina', errs.length === 0, errs.join(' | '));
    await ctx.close();
  }

  /* ---------- B. stesso schermo: i due nomi ---------- */
  {
    const { ctx, p, errs } = await open(1920, 1080);
    await p.click('[data-menu="play"]'); await p.waitForTimeout(400);
    // «Stesso schermo»: il gioco va da solo alla pagina dei due telefoni (con i due nomi in alto)
    await p.click('[data-mode="split"]'); await p.waitForTimeout(700);
    check('B: «Stesso schermo» → pagina dei due telefoni', await p.evaluate(() => __natpfTennis.natpfUi.lobby.step === 'connect' && __natpfTennis.natpfUi.lobby.mode === 'split'));
    await p.waitForSelector('[data-split-name="p1"]', { state: 'visible', timeout: 8000 });
    await p.click('[data-split-name="p1"]'); await p.waitForTimeout(300);
    let s = await kbState(p);
    check('B: nome del Player 1 → tastiera nella metà sinistra, campo in vista', s.open && s.half === 'p1' && s.kb.r <= 960 && above(s), JSON.stringify(s));
    await clickKeys(p, ['g', 'i', 'u', 'l', 'i', 'a']);
    const held = await p.evaluate(() => __natpfTennis.natpfUi.split.typing === true);
    check('B: mentre si scrive con la tastiera a schermo il conto alla rovescia aspetta', held);
    await p.screenshot({ path: `${OUT}/B1-stesso-schermo-p1-sinistra-1920x1080.png` });
    // clic sul secondo nome con la tastiera aperta: passa al Player 2, nella metà destra
    await p.click('[data-split-name="p2"]'); await p.waitForTimeout(300);
    s = await kbState(p);
    check('B: nome del Player 2 → tastiera nella metà destra, non copre il campo del Player 1', s.open && s.half === 'p2' && s.kb.l >= 960 && above(s), JSON.stringify(s));
    await clickKeys(p, ['m', 'a', 'r', 'c', 'o']);
    await p.screenshot({ path: `${OUT}/B2-stesso-schermo-p2-destra-1920x1080.png` });
    await clickKeys(p, ['done']); await p.waitForTimeout(300);
    const names = await p.evaluate(() => ({ eng: { ...__natpfTennis.natpfSplitNames }, cards: ['p1', 'p2'].map(id => document.querySelector(`[data-split-player="${id}"] [data-ready-name]`)?.textContent), kb: !document.getElementById('natpf-tastiera').classList.contains('hidden') }));
    check('B: nomi «Giulia» e «Marco» nel gioco e sulle schede', names.eng.p1 === 'Giulia' && names.eng.p2 === 'Marco' && names.cards[0] === 'Giulia' && names.cards[1] === 'Marco' && !names.kb, JSON.stringify(names));
    check('B: nessun errore nella pagina', errs.length === 0, errs.join(' | '));
    await ctx.close();
  }

  /* ---------- C. codice della sfida tra due computer ---------- */
  {
    const { ctx, p, errs } = await open(1920, 1080);
    await p.click('[data-menu="play"]'); await p.waitForTimeout(500);
    await p.click('#join-code'); await p.waitForTimeout(300);
    let s = await kbState(p);
    check('C: codice → tastiera del codice (niente accenti, spazio, ⇧), campo in vista sopra (la pagina sale)', s.open && s.kind === 'code' && s.nocodeHidden && above(s) && inside(s), JSON.stringify(s));
    await clickKeys(p, ['a', 't', '-', 'k', '3', 'z', 'q']);
    s = await kbState(p);
    check('C: «AT-K3ZQ» in maiuscolo', s.value === 'AT-K3ZQ', s.value);
    await p.screenshot({ path: `${OUT}/C1-codice-sfida-1920x1080.png` });
    await clickKeys(p, ['done']); await p.waitForTimeout(300);
    const back = await p.evaluate(() => ({ lifted: !!document.querySelector('.osk-lifted'), tr: document.querySelector('[data-page="mode"]').style.translate || '' }));
    check('C: chiusa la tastiera la pagina torna al suo posto', !back.lifted && !back.tr, JSON.stringify(back));
    const [nav] = await Promise.all([p.waitForURL(/room=AT-K3ZQ/, { timeout: 15000, waitUntil: 'commit' }).then(() => true, () => false), p.click('#join-form button[type="submit"]')]);
    check('C: «Entra ›» porta alla stanza AT-K3ZQ come Player 2', nav && /role=p2/.test(p.url()), p.url());
    check('C: nessun errore nella pagina', errs.filter(e => !/PeerJS|peer|WebRTC|Could not connect/i.test(e)).length === 0, errs.join(' | '));
    await ctx.close();
  }

  /* ---------- D. «Gioca come Ospite» ---------- */
  {
    const { ctx, p, errs } = await open(1920, 1080);
    await p.click('[data-menu="challenges"]'); await p.waitForTimeout(400);
    await p.click('[data-challenge="precision"]'); await p.waitForSelector('#natpf-nick:not(.hidden)', { timeout: 5000 }); await p.waitForTimeout(300);
    await p.click('#nick-guest'); await p.waitForTimeout(400);
    const g = await p.evaluate(() => ({ guest: __natpfTennis.natpfUi.events.guest, nick: __natpfTennis.natpfUi.events.nickname, sheet: !document.getElementById('natpf-nick').classList.contains('hidden'), step: __natpfTennis.natpfUi.lobby.step }));
    check('D: «Gioca come Ospite»: un clic, senza nome, si va avanti', g.guest && g.nick === '' && !g.sheet && g.step === 'controller', JSON.stringify(g));
    await p.evaluate(() => { __natpfTennis.natpfUi.events.start('precision'); });
    await p.waitForTimeout(500);
    await p.evaluate(() => { const ev = __natpfTennis.natpfUi.events; ev.active.score = 260; ev.finish(); });
    await p.waitForTimeout(600);
    const res = await p.evaluate(() => ({ title: document.getElementById('lobby-t-result').textContent, rank: document.getElementById('result-rank').textContent, top: __natpfTennis.natpfUi.events.top('precision').map(e => e.nick), csv: /Ospite/.test(__natpfTennis.natpfUi.events.board ? JSON.stringify(__natpfTennis.natpfUi.events.board) : '') }));
    check('D: l\'ospite gioca e resta fuori classifica («Fuori classifica: hai giocato come Ospite»)', /Ospite/.test(res.title) && /Fuori classifica/.test(res.rank) && res.top.length === 0 && !res.csv, JSON.stringify(res));
    await p.screenshot({ path: `${OUT}/D1-ospite-fuori-classifica-1920x1080.png` });
    // il minigioco dopo non chiede il nome
    await p.evaluate(() => { const L = __natpfTennis.natpfUi.lobby; L.go('menu'); }); await p.waitForTimeout(300);
    await p.click('[data-menu="challenges"]'); await p.waitForTimeout(400); await p.click('[data-challenge="rush"]'); await p.waitForTimeout(400);
    check('D: il minigioco dopo non chiede di nuovo il nome', await p.evaluate(() => document.getElementById('natpf-nick').classList.contains('hidden')));
    // «Nuovo giocatore» (pannello dello stand, con il mouse): «Come ti chiami?» con «Gioca come Ospite» al posto di «Salta»
    await p.evaluate(() => { __natpfTennis.natpfUi.lobby.go('menu'); __natpfTennis.natpfUi.lobby.setMode('cpu'); __natpfTennis.natpfUi.lobby.go('match'); __natpfTennis.natpfUi.kiosk.open(); });
    await p.waitForTimeout(400);
    await p.click('#natpf-staff [data-staff="newplayer"]'); await p.waitForSelector('#natpf-nick:not(.hidden)', { timeout: 5000 }); await p.waitForTimeout(300);
    const np = await p.evaluate(() => ({ title: document.getElementById('nick-title').textContent, skip: !document.getElementById('nick-cancel').classList.contains('hidden'), guest: !document.getElementById('nick-guest').classList.contains('hidden'), hand: !document.getElementById('nick-hand').classList.contains('hidden'), wasGuest: __natpfTennis.natpfUi.events.guest }));
    check('D: «Nuovo giocatore» → «Come ti chiami?» con la mano e «Gioca come Ospite» (niente «Salta»), ospite di prima dimenticato', np.title === 'Come ti chiami?' && !np.skip && np.guest && np.hand && !np.wasGuest, JSON.stringify(np));
    await p.screenshot({ path: `${OUT}/D2-nuovo-giocatore-ospite-1920x1080.png` });
    await p.click('#nick-guest'); await p.waitForTimeout(600);
    check('D: «Gioca come Ospite» dal passo di «Nuovo giocatore» → avanti senza nome', await p.evaluate(() => __natpfTennis.natpfUi.events.guest && document.getElementById('natpf-nick').classList.contains('hidden')));
    check('D: nessun errore nella pagina', errs.length === 0, errs.join(' | '));
    await ctx.close();
  }

  /* ---------- E. diagnostica: nota e ritardo dello schermo ---------- */
  {
    const { ctx, p, errs } = await open(1920, 1080);
    await p.evaluate(() => __natpfTennis.natpfUi.diag.toggle()); await p.waitForSelector('.natpf-diag:not(.hidden) [data-label]', { timeout: 8000 });
    await p.click('.natpf-diag [data-label]'); await p.waitForTimeout(300);
    let s = await kbState(p);
    check('E: nota della diagnostica → tastiera (testo), campo in vista', s.open && s.kind === 'text' && above(s), JSON.stringify(s));
    await clickKeys(p, ['p', 'r', 'o', 'v', 'a']);
    s = await kbState(p); check('E: nota «Prova»', s.value === 'Prova', s.value);
    await clickKeys(p, ['done']);
    // il ritardo dello schermo sta in un riquadro che si apre (details)
    await p.evaluate(() => { for (const d of document.querySelectorAll('.natpf-diag details')) d.open = true; }); await p.waitForTimeout(200);
    const lag = await p.$('.natpf-diag [data-lag]');
    if (lag){
      await p.click('.natpf-diag [data-lag]'); await p.waitForTimeout(300);
      await p.evaluate(() => { const f = document.querySelector('.natpf-diag [data-lag]'); f.value = ''; });
      s = await kbState(p);
      check('E: ritardo dello schermo → tastierino numerico', s.open && s.kind === 'digits' && !!s.digit && s.digit.w > 0, JSON.stringify(s));
      await p.screenshot({ path: `${OUT}/E1-diagnostica-tastierino-1920x1080.png` });
      await clickKeys(p, ['1', '2', '0', '5']);
      s = await kbState(p); check('E: «120» (al più tre cifre: max 200)', s.value === '120', s.value);
      await clickKeys(p, ['done']);
    } else check('E: campo del ritardo nella diagnostica', false, 'non trovato');
    check('E: nessun errore nella pagina', errs.length === 0, errs.join(' | '));
    await ctx.close();
  }

  /* ---------- F. tasti veri, Esc, Maiusc+D, opzione dello stand ---------- */
  {
    const { ctx, p, errs } = await open(1920, 1080);
    await p.click('[data-menu="challenges"]'); await p.waitForTimeout(400);
    await p.click('[data-challenge="rush"]'); await p.waitForSelector('#natpf-nick:not(.hidden)'); await p.waitForTimeout(300);
    await p.click('#nick-input'); await p.waitForTimeout(300);
    check('F: tastiera aperta', (await kbState(p)).open);
    await p.keyboard.type('Dario'); await p.waitForTimeout(200);
    const t = await p.evaluate(() => ({ kb: !document.getElementById('natpf-tastiera').classList.contains('hidden'), v: document.getElementById('nick-input').value, diag: !!document.querySelector('.natpf-diag:not(.hidden)') }));
    check('F: un tasto vero chiude la tastiera e la lettera arriva; «Dario» intero, la D maiuscola non apre la diagnostica', !t.kb && t.v === 'Dario' && !t.diag, JSON.stringify(t));
    await p.click('#nick-input'); await p.waitForTimeout(300);
    check('F: subito dopo una tastiera vera il clic sul campo non la riapre (chi ha la tastiera non la vede)', !(await kbState(p)).open);
    await p.evaluate(() => { __natpfTennis.natpfUi.tastiera.physicalAt = -1e9; });
    await p.click('#nick-input'); await p.waitForTimeout(300);
    check('F: (dopo 30 s) di nuovo con il clic', (await kbState(p)).open);
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    const esc = await p.evaluate(() => ({ kb: !document.getElementById('natpf-tastiera').classList.contains('hidden'), sheet: !document.getElementById('natpf-nick').classList.contains('hidden') }));
    check('F: Esc chiude la tastiera, non il foglio del nome', !esc.kb && esc.sheet, JSON.stringify(esc));
    await p.click('#nick-cancel'); await p.waitForTimeout(300);
    // opzione dello stand con il mouse: Automatica → Sempre → Mai
    await p.evaluate(() => { __natpfTennis.natpfUi.tastiera.physicalAt = -1e9; __natpfTennis.natpfUi.kiosk.open(); }); await p.waitForTimeout(400);
    const lab = () => p.evaluate(() => document.querySelector('#natpf-staff [data-staff="osk"] b').textContent);
    const l0 = await lab();
    await p.screenshot({ path: `${OUT}/F1-pannello-tastiera-a-schermo-1920x1080.png` });
    await p.click('#natpf-staff [data-staff="osk"]'); await p.waitForTimeout(250); const l1 = await lab();
    await p.click('#natpf-staff [data-staff="osk"]'); await p.waitForTimeout(250); const l2 = await lab();
    const saved = await p.evaluate(() => localStorage.getItem('natpf-tennis.tastiera'));
    check('F: pannello dello stand «Tastiera a schermo»: Automatica → Sempre → Mai, salvata', l0 === 'Automatica' && l1 === 'Sempre' && l2 === 'Mai' && saved === 'mai', JSON.stringify({ l0, l1, l2, saved }));
    const panel = await p.evaluate(() => { const s = document.querySelector('#natpf-staff .natpf-sheet'); return s.scrollHeight - s.clientHeight; });
    check('F: il pannello dello stand non scorre (1920 × 1080)', panel <= 0, String(panel));
    await p.click('#natpf-staff [data-staff="close"]'); await p.waitForTimeout(300);
    await p.click('[data-challenge="rush"]'); await p.waitForSelector('#natpf-nick:not(.hidden)'); await p.waitForTimeout(300);
    await p.click('#nick-input'); await p.waitForTimeout(300);
    check('F: con «Mai» il clic sul campo non apre la tastiera', !(await kbState(p)).open);
    check('F: nessun errore nella pagina', errs.length === 0, errs.join(' | '));
    await ctx.close();
  }

  /* ---------- G. aree strette: 720 × 720 e area di ledwall dentro 1920 × 1080 ---------- */
  for (const [w, h, q, tag] of [[720, 720, '', '720x720'], [1920, 1080, '&area=0,0,720,720', 'area-720-in-1920x1080'], [1920, 540, '', '1920x540']]){
    const { ctx, p, errs } = await open(w, h, q);
    await p.click('[data-menu="challenges"]'); await p.waitForTimeout(400);
    await p.click('[data-challenge="rush"]'); await p.waitForSelector('#natpf-nick:not(.hidden)'); await p.waitForTimeout(400);
    await p.click('#nick-input'); await p.waitForTimeout(400);
    const s = await kbState(p);
    check(`G ${tag}: tastiera dentro l'area del gioco, campo in vista sopra, tasti di almeno 30 px`, s.open && inside(s) && above(s) && s.key.h >= 30, JSON.stringify(s));
    await clickKeys(p, ['l', 'u', 'c', 'a']);
    check(`G ${tag}: «Luca» con i clic`, (await kbState(p)).value === 'Luca');
    await p.screenshot({ path: `${OUT}/G-tastiera-nome-${tag}.png` });
    await clickKeys(p, ['done']); await p.waitForTimeout(200);
    if (tag === '720x720'){
      await p.click('#nick-cancel'); await p.waitForTimeout(300);
      await p.evaluate(() => { const L = __natpfTennis.natpfUi.lobby; L.setMode('split'); L.go('connect'); }); await p.waitForTimeout(600);
      await p.click('[data-split-name="p2"]'); await p.waitForTimeout(300);
      const sp = await kbState(p);
      const p1 = await p.evaluate(() => { const r = document.querySelector('[data-split-name="p1"]').getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right }; });
      check('G 720 × 720: stesso schermo, metà troppo stretta: tastiera sotto, che non copre il nome del Player 1 né quello del Player 2', sp.open && !sp.half && above(sp) && p1.b <= sp.kb.t, JSON.stringify({ sp, p1 }));
      await p.screenshot({ path: `${OUT}/G-stesso-schermo-p2-720x720.png` });
    }
    check(`G ${tag}: nessun errore nella pagina`, errs.length === 0, errs.join(' | '));
    await ctx.close();
  }
} catch (e){ check('prova senza eccezioni', false, e.stack || String(e)); }
await B.close();
summary();
process.exit(process.exitCode || 0);
