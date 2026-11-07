// NATPF Simulator, aggiornamenti del programma Windows nel gioco (richiesta del 07/11), nel browser con un
// window.natpfDesktop finto come il preload di Electron (ponte versione 2, iniettato prima del caricamento):
//   • senza natpfDesktop (gioco nel browser, Cloudflare): niente avviso nel menu e niente sezione in Opzioni;
//   • a 1280 × 720, 1920 × 1080, 720 × 720 (ledwall quadrato) e 1024 × 600: avviso «Aggiornamento disponibile · <build>» sotto il
//     menu, dentro lo schermo, che non copre nessuna voce del menu né i pulsanti in basso;
//   • «Aggiorna» → download con percentuale, MB e barra; «pronto» → «Riavvia e aggiorna» con la nota del consenso di
//     Windows → install chiamato; «Più tardi» con Invio (frecce e Invio come con un joypad) nasconde l'avviso;
//   • Opzioni → «Aggiornamenti»: versione installata, ultima verifica, «Cerca aggiornamenti» → «Sei aggiornato»;
//     stato «non configurati»; in Opzioni non c'è l'avviso;
//   • mai in campo: Allenamento in corso con lo stato che diventa «pronto» → nessun avviso; al ritorno al menu compare;
//   • stesso schermo e area di ledwall 2×2: un solo avviso, dentro l'area;
//   • schermate in $OUT (da guardare).
//   cd tools/e2e && GAME_PORT=3631 CHROMIUM_PATH=/percorso/chrome OUT=/cartella node natpf-aggiornamenti.mjs
// Non prova: il programma Windows vero (Electron, installer, consenso di Windows, riapertura), il download vero da R2.
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, page, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3192), URL0 = `http://127.0.0.1:${GAME_PORT}/`;
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
process.on('exit', () => { try { vite.kill(); } catch {} });
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await new Promise(r => setTimeout(r, 500)); } return false; };
check('gioco avviato con vite', await up(URL0));

const ready = p => p.waitForFunction(() => window.__natpfTennis?.natpfUi?.lobby?.visible && !__natpfTennis.natpfUi.intro?.active, null, { timeout: 120000 });
// modalità prova (mouse e tastiera): l'Allenamento parte senza telefono
const mouse = () => { try { localStorage.setItem('natpf-tennis.controller', 'mouse'); localStorage.setItem('natpf-tennis.testInput', '1'); } catch {} };
// programma Windows finto: schermo intero e aggiornamenti (stato in window.__upd, emit() come onChange del preload)
const desk = () => {
  try { localStorage.setItem('natpf-tennis.controller', 'mouse'); localStorage.setItem('natpf-tennis.testInput', '1'); } catch {}
  const cbs = [];
  const W = window.__upd = { calls: [], st: { status: 'available', current: '2026-11-07.3', latest: '2026-11-08.1', size: 124880055, notes: 'Correzioni del tutorial e del tabellone', checkedAt: Date.now() - 5 * 60000 } };
  W.emit = s => { W.st = { ...W.st, ...s }; cbs.forEach(cb => cb(W.st)); };
  let fs = true;
  window.natpfDesktop = { shell: 'electron', version: 2, isFullScreen: async () => fs, setFullScreen: async v => (fs = !!v), toggleFullScreen: async () => (fs = !fs), onFullScreenChange(){},
    updates: {
      state: async () => { W.calls.push('state'); return W.st; },
      check: async () => { W.calls.push('check'); W.emit({ status: 'checking' }); await new Promise(r => setTimeout(r, 150)); W.emit({ status: 'none', latest: undefined, checkedAt: Date.now() }); return W.st; },
      download: async () => { W.calls.push('download'); W.emit({ status: 'downloading', progress: 0 }); return W.st; },
      install: async () => { W.calls.push('install'); W.emit({ status: 'installing' }); return { ok: true }; },
      onChange(cb){ cbs.push(cb); return () => {}; },
    } };
};
// avviso: in vista, dentro lo schermo (o l'area), testo, pulsanti; e nessuna voce del menu né pulsante in basso coperti
const notice = p => p.evaluate(() => {
  const all = [...document.querySelectorAll('.natpf-update')].filter(e => e.getBoundingClientRect().height > 0 && getComputedStyle(e).display !== 'none');
  const e = document.getElementById('natpf-update'), r = e.getBoundingClientRect(), on = all.includes(e);
  const area = document.body.getBoundingClientRect();
  const inside = on && r.left >= area.left - 0.5 && r.right <= area.right + 0.5 && r.top >= area.top - 0.5 && r.bottom <= area.bottom + 0.5;
  // ogni voce visibile del menu (pagina corrente) e i pulsanti in basso: al loro centro c'è la voce stessa, non l'avviso
  const page = document.querySelector('#title-modal .lobby-page.on');
  const items = [...(page?.querySelectorAll('.menu-item, .lobby-tile, .seg-btn') || []), ...document.querySelectorAll('#title-modal .lobby-bottom button')].filter(x => x.offsetParent !== null && x.getBoundingClientRect().height > 0);
  const covered = items.filter(x => { const b = x.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2; if (cy < 0 || cy > innerHeight) return false; const h = document.elementFromPoint(cx, cy); return h && e.contains(h); }).map(x => x.textContent.trim().slice(0, 20));
  const overlap = items.filter(x => { const b = x.getBoundingClientRect(); return on && b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top; }).map(x => x.textContent.trim().slice(0, 20));
  const btns = [...e.querySelectorAll('[data-update-act]')].map(b => { const q = b.getBoundingClientRect(); return { act: b.dataset.updateAct, label: b.textContent.trim(), ok: q.width > 0 && q.left >= area.left && q.right <= area.right + 0.5 && q.bottom <= area.bottom + 0.5 }; });
  const bar = e.querySelector('.upd-bar i');
  return { count: all.length, on, inside, covered, overlap, title: e.querySelector('[data-upd-title]')?.textContent || '', sub: e.querySelector('[data-upd-sub]')?.textContent || '', btns,
    bar: bar ? Math.round(100 * bar.getBoundingClientRect().width / bar.parentElement.getBoundingClientRect().width) : null, rect: [r.left, r.top, r.width, r.height].map(Math.round) };
});
const opt = p => p.evaluate(() => {
  const o = document.getElementById('natpf-updates-opt'), shown = !!o && getComputedStyle(o).display !== 'none';
  return { shown, state: o?.querySelector('[data-upd-state]')?.textContent || '', meta: o?.querySelector('[data-upd-meta]')?.textContent || '', note: o?.querySelector('[data-upd-note]')?.textContent || '',
    btns: [...(o?.querySelectorAll('[data-update-act]') || [])].map(b => b.textContent.trim() + (b.disabled ? ' (spento)' : '')) };
});
const wait = (p, ms = 350) => p.waitForTimeout(ms);

const B = await launch();
try {
  // 1. Gioco nel browser (niente natpfDesktop): niente avviso, sezione nascosta
  {
    const { p, errs, ctx } = await page(B, `${URL0}?intro=0`, { w: 1280, h: 720, init: mouse });
    await ready(p); await wait(p, 600);
    const n = await notice(p);
    check('browser: nessun avviso di aggiornamento nel menu', !n.on && n.count === 0, JSON.stringify(n));
    await p.evaluate(() => __natpfTennis.natpfUi.lobby.go('options')); await wait(p);
    const o = await opt(p);
    check('browser: nessuna sezione «Aggiornamenti» in Opzioni', !o.shown, JSON.stringify(o));
    check('browser: nessun errore JavaScript', !errs.length, errs.join(' | ').slice(0, 300));
    await ctx.close();
  }

  // 2. Programma Windows finto a tre misure: avviso nel menu che non copre niente; download, pronto, install
  for (const [w, h] of [[1280, 720], [1920, 1080], [720, 720], [1024, 600]]){
    const tag = `${w} × ${h}`;
    const { p, errs, ctx } = await page(B, `${URL0}?intro=0`, { w, h, init: desk });
    await ready(p); await wait(p, 700);
    const n = await notice(p);
    check(`${tag}: avviso «Aggiornamento disponibile · 2026-11-08.1» con «Aggiorna» e «Più tardi»`, n.on && n.count === 1 && n.title === 'Aggiornamento disponibile · 2026-11-08.1' && n.btns.map(b => b.label).join('|') === 'Aggiorna|Più tardi' && n.btns.every(b => b.ok), JSON.stringify(n));
    check(`${tag}: avviso dentro lo schermo, non copre le voci del menu né i pulsanti`, n.inside && !n.covered.length && !n.overlap.length, JSON.stringify({ rect: n.rect, covered: n.covered, overlap: n.overlap }));
    await p.screenshot({ path: `${SP}/agg-menu-disponibile-${w}x${h}.png` });
    await p.click('#natpf-update [data-update-act="download"]'); await wait(p, 200);
    await p.evaluate(() => __upd.emit({ status: 'downloading', progress: 0.42 })); await wait(p, 500);
    const d = await notice(p);
    check(`${tag}: «Aggiorna» → download con percentuale, MB e barra`, (await p.evaluate(() => __upd.calls.includes('download'))) && d.on && d.title === 'Download dell’aggiornamento · 2026-11-08.1' && d.sub === '42% · 52,4 di 124,9 MB' && Math.abs(d.bar - 42) <= 2 && !d.covered.length, JSON.stringify(d));
    await p.screenshot({ path: `${SP}/agg-menu-download-${w}x${h}.png` });
    await p.evaluate(() => __upd.emit({ status: 'ready', progress: 1 })); await wait(p);
    const r = await notice(p);
    check(`${tag}: pronto → «Riavvia e aggiorna» con la nota del consenso di Windows`, r.on && r.title === 'Aggiornamento pronto · 2026-11-08.1' && /Windows chiederà il consenso/.test(r.sub) && r.btns[0]?.label === 'Riavvia e aggiorna' && r.btns.every(b => b.ok) && !r.covered.length && !r.overlap.length, JSON.stringify(r));
    await p.screenshot({ path: `${SP}/agg-menu-pronto-${w}x${h}.png` });
    if (w === 1280){
      await p.click('#natpf-update [data-update-act="install"]'); await wait(p);
      const i = await p.evaluate(() => ({ calls: __upd.calls, title: document.querySelector('#natpf-update [data-upd-title]')?.textContent }));
      check('«Riavvia e aggiorna» chiama install (il programma avvia l’installer e si chiude)', i.calls.includes('install') && i.title === 'Avvio dell’installazione…', JSON.stringify(i));
    }
    check(`${tag}: nessun errore JavaScript`, !errs.length, errs.join(' | ').slice(0, 300));
    await ctx.close();
  }

  // 3. Tastiera (come un joypad): frecce fino a «Più tardi», Invio lo nasconde e il fuoco torna al menu
  {
    const { p, errs, ctx } = await page(B, `${URL0}?intro=0`, { w: 1280, h: 720, init: desk });
    await ready(p); await wait(p, 700);
    let at = '';
    for (let k = 0; k < 12 && at !== 'later'; k++){ await p.keyboard.press('ArrowDown'); await wait(p, 80); at = await p.evaluate(() => document.activeElement?.dataset?.updateAct || ''); if (at === 'download'){ await p.keyboard.press('ArrowRight'); await wait(p, 80); at = await p.evaluate(() => document.activeElement?.dataset?.updateAct || ''); } }
    check('frecce: si arriva ai pulsanti dell’avviso', at === 'later', at);
    await p.keyboard.press('Enter'); await wait(p);
    const s = await p.evaluate(() => ({ on: getComputedStyle(document.getElementById('natpf-update')).display !== 'none', step: __natpfTennis.natpfUi.lobby.step, focus: document.activeElement?.className || '' }));
    check('Invio su «Più tardi»: avviso nascosto, si resta nel menu con il fuoco su una voce', !s.on && s.step === 'menu' && /menu-item/.test(s.focus), JSON.stringify(s));
    await p.evaluate(() => __upd.emit({ status: 'ready', latest: '2026-11-08.1' })); await wait(p);
    check('«pronto» della stessa versione: l’avviso torna (stato nuovo)', (await notice(p)).on);
    check('tastiera: nessun errore JavaScript', !errs.length, errs.join(' | ').slice(0, 300));
    await ctx.close();
  }

  // 4. Opzioni → «Aggiornamenti» (1280 × 720 e 720 × 720)
  for (const [w, h] of [[1280, 720], [720, 720]]){
    const tag = `${w} × ${h}`;
    const { p, errs, ctx } = await page(B, `${URL0}?intro=0`, { w, h, init: desk });
    await ready(p); await wait(p, 600);
    await p.evaluate(() => __natpfTennis.natpfUi.lobby.go('options')); await wait(p, 500);
    const n = await notice(p);
    check(`${tag}: in Opzioni niente avviso (c’è la sezione)`, !n.on, JSON.stringify(n));
    await p.evaluate(() => document.getElementById('natpf-updates-opt').scrollIntoView({ block: 'center' })); await wait(p);
    const o1 = await opt(p);
    check(`${tag}: sezione con stato, versione installata e ultima verifica`, o1.shown && o1.state === 'Disponibile: 2026-11-08.1 · 124,9 MB' && /^Versione installata 2026-11-07\.3 · ultima verifica oggi alle \d\d:\d\d$/.test(o1.meta) && o1.btns.join('|') === 'Aggiorna|Cerca aggiornamenti' && /Correzioni del tutorial/.test(o1.note), JSON.stringify(o1));
    await p.screenshot({ path: `${SP}/agg-opzioni-disponibile-${w}x${h}.png` });
    await p.evaluate(() => __upd.emit({ status: 'downloading', progress: 0.42 })); await wait(p);
    const o2 = await opt(p), bar = await p.evaluate(() => { const b = document.querySelector('#natpf-updates-opt .upd-bar'); return b && getComputedStyle(b).display !== 'none' ? Math.round(100 * b.firstElementChild.getBoundingClientRect().width / b.getBoundingClientRect().width) : null; });
    check(`${tag}: download in Opzioni: «Download 42%» con la barra`, /^Download 42% · 52,4 di 124,9 MB$/.test(o2.state) && Math.abs(bar - 42) <= 2 && !o2.btns.length, JSON.stringify({ o2, bar }));
    await p.screenshot({ path: `${SP}/agg-opzioni-download-${w}x${h}.png` });
    await p.evaluate(() => __upd.emit({ status: 'error', error: 'rete non raggiungibile' })); await wait(p);
    const o3 = await opt(p);
    check(`${tag}: errore in parole con «Cerca aggiornamenti»`, o3.state === 'Errore: rete non raggiungibile' && o3.btns.join('|') === 'Cerca aggiornamenti', JSON.stringify(o3));
    await p.click('#natpf-updates-opt [data-update-act="check"]'); await wait(p, 60);
    const o4 = await opt(p); await wait(p, 400);
    const o5 = await opt(p);
    check(`${tag}: «Cerca aggiornamenti» → ricerca (pulsante spento) → «Sei aggiornato»`, o4.state === 'Ricerca in corso…' && o4.btns[0] === 'Cerca aggiornamenti (spento)' && o5.state === 'Sei aggiornato' && (await p.evaluate(() => __upd.calls.includes('check'))), JSON.stringify({ o4, o5 }));
    await p.screenshot({ path: `${SP}/agg-opzioni-aggiornato-${w}x${h}.png` });
    await p.evaluate(() => __upd.emit({ status: 'off' })); await wait(p);
    const o6 = await opt(p);
    check(`${tag}: «Aggiornamenti non configurati» senza pulsanti`, o6.state === 'Aggiornamenti non configurati' && !o6.btns.length && /installer/.test(o6.note), JSON.stringify(o6));
    check(`${tag}: Opzioni: nessun errore JavaScript`, !errs.length, errs.join(' | ').slice(0, 300));
    await ctx.close();
  }

  // 5. Mai in campo: Allenamento in corso, lo stato diventa «pronto» → niente avviso; al ritorno al menu compare
  {
    const { p, errs, ctx } = await page(B, `${URL0}?intro=0`, { w: 1280, h: 720, init: desk });
    await ready(p); await wait(p, 600);
    await p.evaluate(() => __upd.emit({ status: 'none', latest: undefined })); await wait(p);
    await p.evaluate(() => { const L = __natpfTennis.natpfUi.lobby; L.menu('training'); L.go('connect'); L.next(); }); await wait(p, 1500);
    const t = await p.evaluate(() => ({ training: __natpfTennis.natpfUi.training.active, lobby: __natpfTennis.natpfUi.lobby.visible }));
    check('Allenamento in campo', t.training && !t.lobby, JSON.stringify(t));
    await p.evaluate(() => __upd.emit({ status: 'ready', latest: '2026-11-08.1' })); await wait(p, 800);
    const n1 = await notice(p), q = await p.evaluate(() => __natpfTennis.natpfUi.updates.notice());
    check('in Allenamento lo stato «pronto» non mostra l’avviso', !n1.on && n1.count === 0 && q === null, JSON.stringify({ n1, q }));
    await p.screenshot({ path: `${SP}/agg-allenamento-niente-avviso.png` });
    await p.evaluate(() => __natpfTennis.natpfUi.backToMenu()); await wait(p, 800);
    const n2 = await notice(p);
    check('ritorno al menu: l’avviso «pronto» compare', n2.on && n2.title === 'Aggiornamento pronto · 2026-11-08.1', JSON.stringify(n2));
    // partita contro la CPU (Gioca della pagina «Partita»)
    await p.evaluate(() => { const L = __natpfTennis.natpfUi.lobby; L.menu('play'); L.setMode('cpu'); L.go('controller'); L.go('connect'); }); await wait(p, 300);
    check('in «Collega» niente avviso (si prepara la partita)', !(await notice(p)).on);
    await p.evaluate(() => { const ui = __natpfTennis.natpfUi; if (ui.training.active) ui.training.stop({ completed: false, silent: true }); ui.lobby.go('match'); }); await wait(p, 300);
    await p.click('#btn-start-match'); await wait(p, 2500);
    const m = await p.evaluate(() => ({ lobby: __natpfTennis.natpfUi.lobby.visible, auto: __natpfTennis.autoPlayMode }));
    await p.evaluate(() => __upd.emit({ status: 'ready', latest: '2026-11-08.2' })); await wait(p, 600);
    const n3 = await notice(p);
    check('partita in corso: niente avviso anche con un aggiornamento nuovo pronto', !m.lobby && !n3.on && n3.count === 0, JSON.stringify({ m, n3 }));
    await p.screenshot({ path: `${SP}/agg-partita-niente-avviso.png` });
    check('in campo: nessun errore JavaScript', !errs.length, errs.join(' | ').slice(0, 300));
    await ctx.close();
  }

  // 6. Stesso schermo e area di ledwall 2×2: un solo avviso, dentro l'area
  {
    const { p, errs, ctx } = await page(B, `${URL0}?intro=0`, { w: 1920, h: 1080, init: desk });
    await ready(p); await wait(p, 600);
    await p.evaluate(() => { const L = __natpfTennis.natpfUi.lobby; L.setMode('split'); L.go('menu'); }); await wait(p, 500);
    const s1 = await notice(p);
    check('stesso schermo: un solo avviso nel menu', s1.on && s1.count === 1 && !s1.covered.length, JSON.stringify(s1));
    await p.evaluate(() => { __natpfTennis.natpfUi.screen.set('2x2'); __natpfTennis.natpfUi.lobby.paint(); }); await wait(p, 700);
    const s2 = await notice(p), area = await p.evaluate(() => { const b = document.body.getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map(Math.round); });
    check('ledwall 2×2: un solo avviso, dentro l’area, non copre il menu', s2.on && s2.count === 1 && s2.inside && !s2.covered.length && !s2.overlap.length, JSON.stringify({ s2, area }));
    await p.screenshot({ path: `${SP}/agg-ledwall-2x2-stesso-schermo.png` });
    await p.evaluate(() => __natpfTennis.natpfUi.screen.set('full'));
    check('stesso schermo: nessun errore JavaScript', !errs.length, errs.join(' | ').slice(0, 300));
    await ctx.close();
  }
} finally {
  await B.close();
  summary();
  vite.kill();
}
