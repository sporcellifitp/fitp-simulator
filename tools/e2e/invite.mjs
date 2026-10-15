// partita tra amici con un link: computer A invita (mouse), il link aperto su un telefono chiede un computer,
// computer B entra con nome e telefono come racchetta (QR e calibrazione sul suo schermo), si gioca davvero in rete,
// un terzo computer con lo stesso link non entra, B ricarica la pagina e rientra, fine partita su entrambi
import { readFileSync } from 'node:fs';
import { launch, page, check, summary, SP } from './th.mjs';
const motion = readFileSync(new URL('./motion.js', import.meta.url), 'utf8'), bots = readFileSync(new URL('./bots.js', import.meta.url), 'utf8');
const B = await launch(), Q = '?peer=127.0.0.1:9000&q=low', size = { w: 640, h: 400 };
const A = await page(B, 'http://127.0.0.1:8765/tennis/' + Q, size), a = A.p;
await a.waitForFunction(() => window.__racchetta, null, { timeout: 60000 });
await a.fill('#name', 'Sergio'); await a.click('#fmt [data-v="1"]');
await a.click('#btnInvite'); await a.click('#ctrlMouse');
await a.waitForFunction(() => /#sfida=racchetta-sfida-/.test(document.querySelector('#invUrl').value), null, { timeout: 20000 });
const link = await a.inputValue('#invUrl');
check('A: sala d\'attesa con un link d\'invito unico', /\/tennis\/\?peer=.*#sfida=racchetta-sfida-[a-z0-9]+\.[a-z0-9]+$/.test(link), link);
await a.screenshot({ path: SP + '/inv-a-lobby.png' });
// il link aperto su uno smartphone
const M = await page(B, link, { w: 390, h: 844, mobile: true });
await M.p.waitForFunction(() => !document.querySelector('#mobile').classList.contains('hidden'), null, { timeout: 20000 });
check('link aperto su smartphone: «Apri il link su un computer», nessuna partita avviata', await M.p.evaluate(() => /computer/.test(document.querySelector('#mobile h2').textContent) && window.__racchetta.state === 'mobile'));
await M.p.screenshot({ path: SP + '/inv-mobile.png' }); await M.ctx.close();
// B entra
const G = await page(B, link, size), b = G.p;
await b.waitForFunction(() => window.__racchetta && /Collegato/.test(document.querySelector('#gStatus').textContent), null, { timeout: 120000 });
await b.waitForFunction(() => /Sergio ti ha invitato/.test(document.querySelector('#gTitle').textContent), null, { timeout: 40000 });
check('B: invito ricevuto, sa chi lo invita', true, await b.textContent('#gTitle'));
await b.fill('#gName', 'Giulia'); await b.click('#gGo'); await b.click('#ctrlPhone');
await b.waitForFunction(() => document.querySelector('#qr').dataset.url, null, { timeout: 20000 });
const qr = await b.evaluate(() => document.querySelector('#qr').dataset.url);
const P = await page(B, qr, { w: 390, h: 844, mobile: true, init: motion }), ph = P.p;
await ph.waitForFunction(() => window.__racchetta && __racchetta.state.linkState === 'on', null, { timeout: 90000 }).catch(async e => {
  console.log('telefono', await ph.evaluate(() => window.__racchetta && JSON.stringify(__racchetta.state) + ' ' + document.body.innerText.replace(/\s+/g, ' ')), 'B', await b.evaluate(() => JSON.stringify(__racchetta.link.L)), P.errs, G.errs); throw e; });
await ph.click('#enable'); await ph.evaluate(() => __motion.still(1800));
for (const ax of [[0, 1, 0], [0, 1, 0], [0, 1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0]]){ await ph.evaluate(x => __motion.swing({ axis: x, peak: 700 }), ax); await ph.evaluate(() => __motion.still(600)); }
await b.waitForFunction(() => !document.querySelector('#rvConfirm').classList.contains('hidden'), null, { timeout: 10000 }).catch(async e => {
  console.log('telefono', JSON.stringify(await ph.evaluate(() => __racchetta.state)), 'B', await b.evaluate(() => [...document.querySelectorAll('.pane')].filter(p => !p.classList.contains('hidden')).map(p => p.id + ':' + p.textContent.replace(/\s+/g, ' ').slice(0, 120))));
  await b.screenshot({ path: SP + '/inv-b-fail.png' }); throw e; });
await b.click('#rvConfirm'); await b.waitForFunction(() => !document.querySelector('#pConferma').classList.contains('hidden'));
await b.click('#pairGo');
await b.waitForFunction(() => __racchetta.state === 'lobby');
check('B: telefono collegato al SUO computer con il QR e calibrato', await ph.evaluate(() => __racchetta.state.sensor === 'ready'));
await a.waitForFunction(() => !document.querySelector('#lobbyStart').disabled, null, { timeout: 15000 });
check('A vede Giulia pronta (telefono) e può iniziare', /Giulia/.test(await a.textContent('#lobbyPlayers')) && /telefono pronto/.test(await a.textContent('#lobbyPlayers')), (await a.textContent('#lobbyPlayers')).replace(/\s+/g, ' '));
// un terzo computer con lo stesso link non entra
const X = await page(B, link, size);
await X.p.waitForFunction(() => window.__racchetta && !document.querySelector('#net').classList.contains('hidden'), null, { timeout: 60000 }).catch(async e => {
  console.log('terzo', await X.p.evaluate(() => window.__racchetta && JSON.stringify({ st: __racchetta.state, g: __racchetta.A.guest && __racchetta.A.guest.S }) + document.body.innerText.replace(/\s+/g, ' ').slice(0, 200)), X.errs); throw e; });
check('un terzo computer con lo stesso link non entra', /già due giocatori|non è più valido/.test(await X.p.textContent('#netText')), await X.p.textContent('#netText'));
await X.ctx.close();
await a.click('#lobbyStart');
await a.waitForFunction(() => __racchetta.state === 'play'); await b.waitForFunction(() => __racchetta.state === 'play', null, { timeout: 15000 });
check('la partita parte su entrambi i computer', true);
await a.addScriptTag({ content: bots }); await a.evaluate(() => __mouseBot({ sd: .05 }));
await a.evaluate(() => { window.__ev = { g: [], h: [], points: [0, 0], toss: 0 };
  const c = __racchetta.core, u = c.update.bind(c);
  c.update = (dt, inp) => { const ev = u(dt, inp); for (const e of ev){ if (e.type === 'contact') __ev[e.player].push(e.label + (e.serve ? '·servizio' : '') + ' ' + Math.round(e.timing*1000)); if (e.type === 'miss') __ev[e.player].push('mancata:' + e.why); if (e.type === 'point') __ev.points[e.team]++; } return ev; }; });
// robot del telefono di Giulia: guarda ciò che B disegna e colpisce quando la palla le arriva
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
let lastTc = null, tossState = null, tossAt = 0;
async function guestBot(ms){
  const t0 = Date.now();
  while (Date.now() - t0 < ms){
    const s = await b.evaluate(() => { const A = __racchetta.A, M = A.mirror; if (!M || !M.last || A.state !== 'play') return null;
      const now = performance.now(), R = M.renderTime(now, A.guest.clock), v = M.view(R), g = v.players[1];
      return { now, R, ph: v.phase, srv: v.serverId === 'g', toss: v.toss && v.toss.t0, tc: g.inc ? g.inc.Tc : null, clock: A.link.clock }; });
    if (s && s.clock){
      const toPhone = tc => s.now + (tc - s.R)*1000 + s.clock.off;
      if (s.ph === 'serve' && s.srv && !s.toss && (tossState !== 'sent' || Date.now() - tossAt > 4000)){ tossState = 'sent'; tossAt = Date.now(); await ph.evaluate(() => __motion.swing({ axis: [0, 1, 0], peak: 500 })); }
      else if (s.ph === 'serve' && !s.toss && typeof tossState === 'number') tossState = null;
      else if (s.ph === 'serve' && s.toss && tossState !== s.toss){ tossState = s.toss; const t = toPhone(s.toss + 5.1/9.81) + gauss()*50; ph.evaluate(t => new Promise(r => setTimeout(() => __motion.swing({ axis: [0, 1, 0], peak: 800 }).then(r), Math.max(0, t - 110 - performance.now()))), t); }
      else if (s.ph !== 'serve') tossState = null;
      if (s.ph === 'live' && s.tc && s.tc !== lastTc && s.tc - s.R < .6){ lastTc = s.tc; const t = toPhone(s.tc) + gauss()*50; ph.evaluate(t => new Promise(r => setTimeout(() => __motion.swing({ axis: Math.random() < .5 ? [0, 1, 0] : [0, -1, 0], peak: 500 + Math.random()*500 }).then(r), Math.max(0, t - 110 - performance.now()))), t); }
    }
    await b.waitForTimeout(25);
  }
}
await guestBot(240000);
await a.screenshot({ path: SP + '/inv-a-play.png' }); await b.screenshot({ path: SP + '/inv-b-play.png' });
let ev = await a.evaluate(() => __ev);
check('Giulia (B, telefono, in rete) colpisce la palla: l\'host giudica i suoi colpi', ev.g.filter(x => !x.startsWith('mancata')).length >= 3, ev.g.join(', '));
check('Sergio (A, mouse) colpisce la palla', ev.h.filter(x => !x.startsWith('mancata')).length >= 3, ev.h.join(', '));
const scA = (await a.textContent('#score')).replace(/\s+/g, ''), scB = (await b.textContent('#score')).replace(/\s+/g, '');
check('stesso punteggio sui due computer', scA === scB, `${scA} | ${scB}`);
// B ricarica la pagina: A aspetta, B rientra da solo e la partita riprende
await b.reload();
await a.waitForFunction(() => !document.querySelector('#net').classList.contains('hidden'), null, { timeout: 20000 });
check('B si scollega: A mette in pausa e lo dice', /scollegato/.test(await a.textContent('#netTitle')), await a.textContent('#netTitle'));
await b.waitForFunction(() => window.__racchetta && __racchetta.state === 'play', null, { timeout: 40000 });
await a.waitForFunction(() => document.querySelector('#net').classList.contains('hidden') && __racchetta.state === 'play', null, { timeout: 20000 });
check('B rientra con la chiave di ripresa e la partita riprende', true);
// fine partita: si porta il game sul 40-0 per A e si gioca l'ultimo punto
await a.evaluate(() => { __racchetta.core.score.points = [3, 0]; });
// dopo il ricaricamento B gioca con il mouse (il telefono andrebbe ricollegato con il QR nuovo)
await b.addScriptTag({ content: bots }); await b.evaluate(() => __guestMouseBot({ sd: .05 }));
await a.waitForFunction(() => __racchetta.state === 'end', null, { timeout: 240000 }).catch(() => {});
await b.waitForFunction(() => __racchetta.state === 'end', null, { timeout: 30000 }).catch(() => {});
const endA = await a.evaluate(() => __racchetta.state === 'end' && document.querySelector('#endTitle').textContent), endB = await b.evaluate(() => __racchetta.state === 'end' && document.querySelector('#endTitle').textContent);
check('fine partita su entrambi, risultati opposti', endA && endB && endA !== endB, `${endA} | ${endB}`);
await a.screenshot({ path: SP + '/inv-a-end.png' }); await b.screenshot({ path: SP + '/inv-b-end.png' });
check('nessun errore JavaScript', ![...A.errs, ...G.errs, ...P.errs].length, [...A.errs, ...G.errs, ...P.errs].join(' | ').slice(0, 500));
summary(); await B.close();
