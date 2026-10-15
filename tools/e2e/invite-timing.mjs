// partita tra amici con due computer e mouse: l'amico colpisce guardando ciò che vede (stato dell'host un attimo
// indietro) e l'host giudica i suoi colpi su quell'istante. Misura gli esiti dei colpi dei due lati e la fine partita.
import { readFileSync } from 'node:fs';
import { launch, page, check, summary, SP } from './th.mjs';
const bots = readFileSync(new URL('./bots.js', import.meta.url), 'utf8');
const B = await launch(), Q = '?peer=127.0.0.1:9000&q=low', size = { w: 640, h: 400 };
const A = await page(B, 'http://127.0.0.1:8765/tennis/' + Q, size), a = A.p;
await a.waitForFunction(() => window.__racchetta, null, { timeout: 60000 });
await a.fill('#name', 'Sergio'); await a.click('#fmt [data-v="1"]'); await a.click('#btnInvite'); await a.click('#ctrlMouse');
await a.waitForFunction(() => /#sfida=/.test(document.querySelector('#invUrl').value), null, { timeout: 30000 });
const G = await page(B, await a.inputValue('#invUrl'), size), b = G.p;
await b.waitForFunction(() => window.__racchetta && /Collegato/.test(document.querySelector('#gStatus').textContent), null, { timeout: 90000 });
await b.fill('#gName', 'Giulia'); await b.click('#gGo'); await b.click('#ctrlMouse');
await a.waitForFunction(() => !document.querySelector('#lobbyStart').disabled, null, { timeout: 30000 });
await a.click('#lobbyStart');
await b.waitForFunction(() => __racchetta.state === 'play', null, { timeout: 30000 });
await a.addScriptTag({ content: bots }); await b.addScriptTag({ content: bots });
await a.evaluate(() => { __mouseBot({ sd: .05 }); window.__ev = { g: [], h: [], points: [0, 0] };
  const c = __racchetta.core, u = c.update.bind(c);
  c.update = (dt, inp) => { const ev = u(dt, inp); for (const e of ev){ if (e.type === 'contact') __ev[e.player].push(e.label + ' ' + Math.round(e.timing*1000)); if (e.type === 'miss') __ev[e.player].push('mancata:' + e.why); if (e.type === 'point') __ev.points[e.team]++; } return ev; }; });
await b.evaluate(() => __guestMouseBot({ sd: .05 }));
const t0 = Date.now(); let endA = false;
while (Date.now() - t0 < 900000){ if (await a.evaluate(() => __racchetta.state === 'end')){ endA = true; break; } await a.waitForTimeout(2000); }
const ev = await a.evaluate(() => __ev);
await b.waitForFunction(() => __racchetta.state === 'end', null, { timeout: 30000 }).catch(() => {});
const tA = await a.textContent('#endTitle'), tB = await b.evaluate(() => __racchetta.state === 'end' && document.querySelector('#endTitle').textContent);
const ok = l => l.filter(x => !x.startsWith('mancata'));
console.log('host (mouse):', ev.h.join(', ')); console.log('amico (mouse, in rete):', ev.g.join(', '));
check('i colpi dell\'amico in rete vengono giudicati in tempo come quelli dell\'host', ok(ev.g).length >= 4 && ok(ev.g).filter(x => /perfetto|buono/.test(x)).length >= ok(ev.g).length*.6, `${ok(ev.g).length} colpi, mancate ${ev.g.length - ok(ev.g).length}`);
check('l\'host colpisce', ok(ev.h).length >= 4);
check('fine partita su entrambi, risultati opposti', endA && tB && tA !== tB, `${tA} | ${tB} · punti ${ev.points}`);
check('nessun errore JavaScript', !A.errs.length && !G.errs.length, [...A.errs, ...G.errs].join(' | ').slice(0, 300));
await a.screenshot({ path: SP + '/it-a-end.png' }); await b.screenshot({ path: SP + '/it-b-end.png' });
summary(); await B.close();
