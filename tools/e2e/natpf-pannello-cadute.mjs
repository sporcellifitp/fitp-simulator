// NATPF B45.2 (revisione del B45.1, punto 6) · pannello dello stand con la riga delle cadute dei telefoni di oggi
// (natpf_cadute.js: «Telefono 1: 3 cadute oggi · motivo più frequente: Wi-Fi ferma 10 s», una riga per telefono). Prima la
// riga stava nello spazio libero della riga dei pulsanti in basso ed era tagliata con due telefoni, nel programma Windows
// (pulsante «Schermo del gioco»), a 1920×1080 e a 720×720; e a 1024×600 il foglio scorreva di 5 px con il chiosco, lo
// scambio caldo, il lancio automatico e il campo aperto accesi (natpf-stesso-schermo-b25). Per ogni misura (1024×600,
// 1280×720, 1920×1080, 720×720, 1366×657, 1920×540), nella versione web e «come nel programma Windows» (ponte
// window.natpfDesktop finto: compare «Schermo del gioco»), con due telefoni caduti oggi (e con uno solo a 1024×600,
// 720×720 e 1280×720), opzioni spente e accese.
// B74 (revisione, S1): con «Assi del giroscopio» le voci sono 21 e a 1280×720 (cinque colonne) facevano una quinta fila:
// il foglio scorreva di 1–22 px; a 1536×864 e 1600×900 (quattro colonne, sei file) fino a 72 px e «Chiudi» usciva. Da qui
// anche 1536×864 (1920×1080 con la scala di Windows al 125 %) e 1600×900, le altezze tra 801 e 900 px. Controlli:
//   • la riga delle cadute si vede tutta: niente tagliato, ogni telefono su una riga sua (a 1920×540 su due colonne);
//   • il foglio non scorre, «Chiudi», «Nuovo giocatore» e (dal B74) «Telecomando dello staff» interi nel foglio,
//     nessuna scritta dei pulsanti tagliata;
//   • «Schermo del gioco» solo nel programma.
// Schermate in $OUT/pannello-cadute (OUT come nelle altre prove).
//   cd tools/e2e && CHROMIUM_PATH=… GAME_PORT=… node natpf-pannello-cadute.mjs
// Solo il disegno della pagina nel Chromium della prova: non il programma Windows vero né un ledwall.
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, check, summary, SP } from './th.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), GAME = path.resolve(here, '../../natpf-tennis');
const GAME_PORT = +(process.env.GAME_PORT || 3171);
const OUT = path.join(SP, 'pannello-cadute'); mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const vite = spawn(process.execPath, [path.join(GAME, 'node_modules/vite/bin/vite.js'), '--port', String(GAME_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: GAME, env: { ...process.env, DISABLE_HMR: 'true' }, stdio: 'pipe' });
process.on('exit', () => { try { vite.kill(); } catch {} });
const up = async url => { for (let i = 0; i < 120; i++){ const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false))); if (ok) return true; await sleep(500); } return false; };
check('gioco avviato con vite', await up(`http://127.0.0.1:${GAME_PORT}/`));

const d = new Date(), giorno = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// cadute di oggi (localStorage del gioco, natpf_cadute.CADUTE_KEY): uno o due telefoni, motivi con le parole più lunghe
const CADUTE = {
  1: { giorno, p1: { n: 3, m: { silenzio: 2, 'telefono: pagina chiusa': 1 } }, p2: { n: 0, m: {} } },
  2: { giorno, p1: { n: 3, m: { silenzio: 3 } }, p2: { n: 12, m: { 'telefono: scollegato': 7, 'pagina del gioco ricaricata': 5 } } },
};
const RIGHE = {
  1: ['Telefono 1: 3 cadute oggi · motivo più frequente: Wi-Fi ferma 10 s'],
  2: ['Telefono 1: 3 cadute oggi · motivo più frequente: Wi-Fi ferma 10 s', 'Telefono 2: 12 cadute oggi · motivo più frequente: «Scollega» sul telefono'],
};
const SIZES = [[1024, 600], [1280, 720], [1920, 1080], [720, 720], [1366, 657], [1920, 540], [1536, 864], [1600, 900]];
const CASES = [];
for (const desk of [false, true]) for (const opts of [false, true]){
  for (const size of SIZES) CASES.push({ desk, opts, phones: 2, size });
  for (const size of [[1024, 600], [720, 720], [1280, 720]]) CASES.push({ desk, opts, phones: 1, size });
}
const B = await launch();
try {
  for (const { desk, opts, phones, size: [w, h] } of CASES){
    const ctx = await B.newContext({ viewport: { width: w, height: h } }), p = await ctx.newPage(), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
    await p.addInitScript(([c, desk]) => {
      localStorage.setItem('natpf-tennis.cadute', c);
      // ponte del programma Windows finto: basta perché il pannello mostri «Schermo del gioco» (natpf_kiosk.paint)
      if (desk){ const noop = () => {}; window.natpfDesktop = new Proxy({ displays: { get: async () => ({ current: { label: 'Monitor 2' }, list: [{}, {}] }), next: async () => ({}), list: async () => ({ current: { label: 'Monitor 2' }, list: [{}, {}] }), on: noop, onChange: noop } }, { get: (t, k) => (k in t ? t[k] : undefined) }); }
    }, [JSON.stringify(CADUTE[phones]), desk]);
    await p.goto(`http://127.0.0.1:${GAME_PORT}/?intro=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await p.waitForFunction(() => window.__natpfTennis?.natpfUi?.kiosk, null, { timeout: 120000 });
    await p.evaluate(() => { const ui = __natpfTennis.natpfUi; ui.intro?.skip?.(); ui.kiosk.open(); });
    await sleep(500);
    // opzioni accese come in natpf-stesso-schermo-b25 (chiosco con la nota, scambio caldo, lancio automatico, campo aperto)
    if (opts) for (const k of ['hot', 'kiosk', 'autotoss', 'open']){ await p.click(`#natpf-staff [data-staff="${k}"]`); await sleep(100); }
    // (puntatore fuori dal foglio: la riga sotto le voci torna a dire lo stato del chiosco; gli avvisi dei clic spariscono)
    await p.mouse.move(2, 2); await sleep(4600);
    const r = await p.evaluate(() => {
      const s = document.querySelector('#natpf-staff .natpf-sheet'), c = document.getElementById('staff-cadute'), q = sel => s.querySelector(sel)?.getBoundingClientRect();
      const close = q('[data-staff="close"]'), nuovo = q('[data-staff="newplayer"]'), remote = q('[data-staff="remote"]'), disp = s.querySelector('[data-staff="display"]'), sr = s.getBoundingClientRect(), cr = c.getBoundingClientRect();
      const btn = [...s.querySelectorAll('.pause-grid > button')], cut = btn.filter(x => x.scrollWidth > x.clientWidth + 1 || x.scrollHeight > x.clientHeight + 1).map(x => x.dataset.staff);
      // righe disegnate: un riquadro per riga del testo (con le due colonne delle aree larghe e basse, una riga per colonna);
      // una riga di un telefono che va a capo ne fa due
      const rg = document.createRange(); rg.selectNodeContents(c);
      const lines = [...rg.getClientRects()].filter(x => x.width > 1).length;
      return { text: c.textContent, visible: !c.classList.contains('hidden') && cr.height > 0, cut: c.scrollHeight > c.clientHeight + 1 || c.scrollWidth > c.clientWidth + 1, inSheet: cr.left >= sr.left && cr.right <= sr.right && cr.top >= sr.top && cr.bottom <= sr.bottom,
        lines, box: [Math.round(cr.left), Math.round(cr.top), Math.round(cr.width), Math.round(cr.height)], font: getComputedStyle(c).fontSize,
        scroll: s.scrollHeight - s.clientHeight, sheet: [Math.round(sr.top), Math.round(sr.bottom)], H: innerHeight,
        closeIn: !!close && close.top >= sr.top && close.bottom <= sr.bottom && close.bottom <= innerHeight && close.right <= innerWidth, nuovoIn: !!nuovo && nuovo.top >= sr.top && nuovo.bottom <= sr.bottom,
        // (B74, revisione S1: anche «Telecomando dello staff», che il bordo del foglio tagliava a 1280×720)
        remoteIn: !!remote && remote.top >= sr.top && remote.bottom <= sr.bottom,
        display: !!disp && !disp.classList.contains('hidden'), tagliati: cut };
    });
    const name = `${desk ? 'programma' : 'web'}-${phones}tel-${opts ? 'opzioni-accese' : 'opzioni-spente'}-${w}x${h}`;
    const want = RIGHE[phones];
    check(`${name}: riga delle cadute intera (${phones === 2 ? 'due telefoni, ' : ''}una riga per telefono), foglio che non scorre, «Chiudi», «Nuovo giocatore» e «Telecomando dello staff» in vista, nessuna scritta tagliata${desk ? ', «Schermo del gioco» in vista' : ''}`,
      r.visible && !r.cut && r.inSheet && r.text === want.join('\n') && r.lines === want.length && r.scroll <= 0 && r.closeIn && r.nuovoIn && r.remoteIn && !r.tagliati.length && r.display === desk && !errs.length,
      JSON.stringify({ ...r, text: undefined, errori: errs.slice(0, 2) }));
    await p.screenshot({ path: `${OUT}/${name}.png` });
    await ctx.close();
  }
} catch (e){ check('prova completata senza eccezioni', false, String(e?.stack || e).slice(0, 600)); }
finally { await B.close().catch(() => {}); vite.kill(); }
summary();
setTimeout(() => process.exit(process.exitCode || 0), 300);
