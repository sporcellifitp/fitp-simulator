// App Android 1.0.2 (16/11/2026): il certificato del PC dello stand senza il certificato NATPF sul telefono.
//
// L'utente: QR del PC dello stand (rete locale), sul telefono solo l'app → «Fissa app» e poi schermo fermo. La WebView
// rifiutava in silenzio il certificato fatto dal PC (tools/lan/certificato.mjs). La 1.0.2 va avanti
// (SslErrorHandler.proceed) per l'indirizzo di rete locale del QR. Qui non c'è un telefono: si prova in Chromium (lo
// stesso motore della WebView) con il server LAN vero e il suo certificato, SENZA «ignora i certificati»: la pagina si
// apre solo passando dall'avviso del certificato con «Procedi», che come proceed() nella WebView fa ricordare la scelta
// per quell'indirizzo e quel certificato. Si guarda che dopo tutto il resto vada: file della pagina, collegamento wss
// del PC (/lan-signal), WebRTC, contesto sicuro (i sensori lo vogliono), sensori e un colpo che arriva al PC.
//   node tools/e2e/natpf-app-certificato.mjs        (prima: npm ci in tools/lan e tools/e2e)
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, check, summary } from './th.mjs';

const lan = f => fileURLToPath(new URL('../lan/' + f, import.meta.url));
const data = mkdtempSync(join(tmpdir(), 'natpf-cert-'));
const env = { ...process.env, NATPF_DATA_DIR: data };
const made = spawnSync(process.execPath, [lan('certificato.mjs')], { env, encoding: 'utf8' });
if (made.status !== 0) { console.error(made.stdout, made.stderr); process.exit(1); }
const certs = join(data, 'certs'), port = 18767, base = `https://127.0.0.1:${port}`;
const server = spawn(process.execPath, [lan('server.mjs'), `--port=${port}`, `--cert=${join(certs, 'cert.pem')}`, `--key=${join(certs, 'key.pem')}`], { env, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('il server LAN non parte')), 10000);
  server.stdout.on('data', () => { clearTimeout(t); resolve(); });
  server.once('exit', c => { clearTimeout(t); reject(new Error('server LAN uscito ' + c)); });
});

let browser;
try {
  browser = await launch();
  const errors = [];
  // il PC (gioco): qui il certificato non interessa
  const pc = await (await browser.newContext({ ignoreHTTPSErrors: true })).newPage();
  pc.on('pageerror', e => errors.push('pc: ' + e.message));
  await pc.goto(base + '/tennis/racchetta.html?lan=1');
  await pc.evaluate(async () => { const { createPhoneLink } = await import('/js/tennis/link.js'); window.hostLink = createPhoneLink(); window.swings = []; hostLink.on('swing', s => swings.push(s)); await hostLink.start(); });
  await pc.waitForFunction(() => hostLink.L.state === 'waiting');
  const qr = await pc.evaluate(() => hostLink.url());

  // il telefono: certificato del PC NON installato, nessuna eccezione sui certificati
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  // (solo nelle pagine https: lo script gira anche nella pagina dell'avviso del certificato, che non ha i sensori)
await ctx.addInitScript("if (location.protocol === 'https:') {" + readFileSync(new URL('./motion.js', import.meta.url), 'utf8') + ';DeviceMotionEvent.requestPermission=async()=>"granted";}');
  const phone = await ctx.newPage();
  phone.on('pageerror', e => errors.push('telefono: ' + e.message));
  phone.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|net::/.test(m.text())) errors.push('console: ' + m.text()); });

  let refused = '';
  try { await phone.goto(qr, { timeout: 15000 }); } catch (e) { refused = (e.message.match(/net::ERR_[A-Z_]+/) || [''])[0]; }
  check('senza «Procedi» la pagina del QR non si apre (quello che faceva la WebView della 1.0.1: schermo vuoto)', /ERR_CERT/.test(refused), refused || 'aperta?!');

  // «Procedi» dall'avviso del certificato = proceed() della 1.0.2
  await phone.click('#details-button', { timeout: 10000 });
  await Promise.all([phone.waitForNavigation({ timeout: 20000 }), phone.click('#proceed-link')]);
  check('con «Procedi» la pagina vera della racchetta si apre', await phone.evaluate(() => location.pathname.endsWith('/tennis/racchetta.html') && !!window.__racchetta), phone.url().replace(/#.*/, '#…'));
  check('contesto sicuro anche con il certificato del PC accettato così (i sensori lo vogliono)', await phone.evaluate(() => window.isSecureContext === true));

  await phone.waitForFunction(() => window.__racchetta?.state.linkState === 'on', null, { timeout: 30000 });
  check('collegamento al PC: wss://…/lan-signal e WebRTC passano con la scelta ricordata', await pc.evaluate(() => hostLink.connected && hostLink.transport === 'lan-webrtc'));

  await phone.evaluate(() => sessionStorage.setItem('natpf-simulator.profile', JSON.stringify({ version: 4, grip: 'upright', accSign: 1, axis: [0, 1, 0], bias: [0, 0, 0], gravity: [0, 1, 0], ref: 120, refs: { L: 120, R: 120 }, on: 25, minPeak: 40, minAngle: 2.5, intentGate: false })));
  await phone.click('#enable');
  await phone.waitForFunction(() => __racchetta.state.sensor === 'ready', null, { timeout: 15000 });
  check('«Attiva i sensori»: sensori pronti', true);
  await pc.evaluate(() => { swings.length = 0; hostLink.send({ t: 'ph', ph: 'play' }); });
  await phone.waitForFunction(() => __racchetta.state.phase === 'play');
  await phone.evaluate(async () => { await __motion.still(350); await __motion.swing({ axis: [0, 1, 0], peak: 300 }); await __motion.still(300); });
  await pc.waitForFunction(() => hostLink.motion()?.received > 3 && swings.length === 1, null, { timeout: 15000 });
  check('un colpo del telefono arriva al PC', await pc.evaluate(() => hostLink.L.phone === 'ready' && swings.length === 1));
  check('nessun errore nelle pagine', errors.length === 0, JSON.stringify(errors));
  await pc.evaluate(() => hostLink.stop());
} catch (e) {
  check('prova del certificato del PC', false, e.stack);
} finally {
  await browser?.close();
  server.kill();
  rmSync(data, { recursive: true, force: true });
  summary();
}
