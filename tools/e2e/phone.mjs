// telefono come racchetta: QR → pagina del telefono → permessi e calibrazione → colpi in partita; sicurezza e guasti
import { readFileSync } from 'node:fs';
import { launch, page, check, summary, SP, JSQR } from './th.mjs';
const motion = readFileSync(new URL('./motion.js', import.meta.url), 'utf8'), jsqr = readFileSync(JSQR, 'utf8');
const B = await launch();
const gaussMs = sd => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return sd*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
const D = await page(B, 'http://127.0.0.1:8765/tennis/?peer=127.0.0.1:9000');
const d = D.p;
await d.waitForFunction(() => window.__tennis && window.qrcode, null, { timeout: 60000 });
await d.click('#fmt [data-f="1"]');
await d.click('#playPhone');
await d.waitForFunction(() => document.querySelector('#qr svg'), null, { timeout: 20000 });
await d.waitForTimeout(300);
await d.screenshot({ path: SP + '/t2-qr.png' });
// il QR si legge davvero: lo decodifico con jsQR dall'immagine dello schermo
await d.addScriptTag({ content: jsqr });
const decoded = await d.evaluate(async () => {
  const svg = document.querySelector('#qr svg'), xml = new XMLSerializer().serializeToString(svg);
  const img = new Image(); img.src = 'data:image/svg+xml;base64,' + btoa(xml); await img.decode();
  const c = document.createElement('canvas'); c.width = c.height = 300; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 300, 300); x.drawImage(img, 20, 20, 260, 260);
  const r = jsQR(x.getImageData(0, 0, 300, 300).data, 300, 300); return r && r.data;
});
const url = await d.evaluate(() => document.querySelector('#qr').dataset.url);
check('il QR contiene l\'indirizzo della sessione', decoded === url && /racchetta\.html\?peer=127\.0\.0\.1:9000#s=fitp-racchetta-[a-z0-9]+&k=[a-z0-9]+$/.test(decoded), decoded);
const warn = await d.evaluate(() => !document.querySelector('#pairWarn').classList.contains('hidden') && document.querySelector('#pairWarn').textContent);
check('avviso: da localhost il telefono vero non arriva al computer', /localhost/.test(warn || ''), warn);

// telefono
const P = await page(B, decoded, { w: 390, h: 844, mobile: true, init: motion });
const ph = P.p;
await ph.waitForFunction(() => window.__racchetta && __racchetta.state.linkState === 'on', null, { timeout: 20000 });
check('il telefono si collega alla sessione', true);
check('il codice sparisce dalla barra degli indirizzi', !/#|k=/.test(ph.url()), ph.url());
await d.waitForFunction(() => /Attiva i sensori/.test(document.querySelector('#pairStatus').textContent));
check('il computer vede il telefono e chiede di attivare i sensori', true);
await ph.screenshot({ path: SP + '/t2-phone-connected.png' });
await ph.click('#enable');
await ph.evaluate(() => __motion.still(1200));
await ph.waitForFunction(() => __racchetta.state.sensor === 'practice', null, { timeout: 5000 });
check('calibrazione da fermo, poi dritto di prova', true);
await d.waitForFunction(() => /dritto di prova/.test(document.querySelector('#pairStatus').textContent));
await ph.screenshot({ path: SP + '/t2-phone-practice.png' });
await ph.evaluate(() => __motion.swing({ peak: 900 }));
await ph.waitForFunction(() => __racchetta.state.sensor === 'ready', null, { timeout: 5000 });
await d.waitForFunction(() => !document.querySelector('#pairGo').disabled, null, { timeout: 5000 });
check('telefono pronto: «Inizia la partita» si abilita', true);
await ph.waitForTimeout(500);
await ph.evaluate(() => __motion.swing({ axis: [0, 0, -1], peak: 1200 }));
await d.waitForFunction(() => /Colpo ricevuto: rovescio/.test(document.querySelector('#pairStatus').textContent), null, { timeout: 5000 });
check('un colpo di prova arriva al computer (rovescio riconosciuto)', true, await d.evaluate(() => document.querySelector('#pairStatus').textContent));
await d.screenshot({ path: SP + '/t2-pair-ready.png' });
await ph.screenshot({ path: SP + '/t2-phone-ready.png' });

// sicurezza: lo stesso QR non vale per un secondo telefono
const P2 = await page(B, decoded, { w: 390, h: 844, mobile: true });
await P2.p.waitForFunction(() => window.__racchetta && __racchetta.state.linkState === 'denied', null, { timeout: 20000 });
check('lo stesso QR usato da un secondo telefono viene rifiutato', true, await P2.p.evaluate(() => document.querySelector('#sub').textContent));
await P2.ctx.close();
// un QR di un'altra sessione (inventata) non porta da nessuna parte
const fake = decoded.replace(/#s=fitp-racchetta-[a-z0-9]+/, '#s=fitp-racchetta-' + 'a'.repeat(26));
const P3 = await page(B, fake, { w: 390, h: 844, mobile: true });
await P3.p.waitForFunction(() => window.__racchetta && __racchetta.state.linkState === 'denied', null, { timeout: 20000 });
check('sessione sconosciuta: «Partita non trovata»', /non trovata/.test(await P3.p.evaluate(() => document.querySelector('#big').textContent)));
await P3.ctx.close();

// partita: il computer avvia, il robot muove il telefono quando la palla arriva
await d.click('#pairGo');
await d.waitForFunction(() => __tennis.state === 'play');
await d.evaluate(() => { const c = __tennis.core; c.score.server = 0; c.setupPoint(); });      // il primo servizio al telefono
check('partita avviata con il telefono, movimento automatico attivo', await d.evaluate(() => __tennis.controls && document.querySelector('#chip').classList.contains('ok')), await d.evaluate(() => document.querySelector('#chip').textContent));
await d.evaluate(() => { window.__log = { contacts: [], hits: 0, toss: 0, phoneSw: 0 };
  const c0 = __tennis.core, up = c0.update.bind(c0);
  __tennis.link.on('swing', () => __log.phoneSw++);
  const wrap = () => { const c = __tennis.core; if (!c || c.__w) return; c.__w = 1; const u = c.update.bind(c); c.update = (dt, inp) => { const ev = u(dt, inp); for (const e of ev){ if (e.type === 'contact' && e.player === 'me') __log.contacts.push(e.label + (e.serve ? '(servizio)' : '') + ' ' + e.timing.toFixed(2)); if (e.type === 'toss') __log.toss++; } return ev; }; };
  setInterval(wrap, 50); wrap();
});
const t0 = Date.now(); let end = false, busy = false, n = 0;
while (Date.now() - t0 < 360000){
  const s = await d.evaluate(() => {
    const T = __tennis, c = T.core; if (!c) return { st: T.state };
    const h = c.players[0], b = c.ball;
    return { st: T.state, ph: c.phase, srv: c.serverP === h, toss: !!c.toss, tt: c.toss ? c.t - c.toss.t0 : 0, mine: c.rally.lastHitter !== 0 && c.rally.canHit(0) && !(c.rally.isServe && c.rally.bouncesSinceHit === 0),
      s: h.z - b.p.z, vin: b.v.z, l: Math.abs(b.p.x - h.x), now: T.frameT, clock: T.link.clock };
  });
  if (s.st === 'end'){ end = true; break; }
  if (s.st === 'play' && !busy){
    // il colpo sintetico dura 220 ms e il picco (l'impatto) è a metà: si parte un po' prima dell'arrivo
    if (s.ph === 'serve' && s.srv && !s.toss){ busy = true; await ph.evaluate(() => __motion.swing({ peak: 600 })); busy = false; await d.waitForTimeout(200); }
    else if (s.ph === 'serve' && s.srv && s.toss && s.tt > .35){ busy = true; await ph.evaluate(() => __motion.swing({ peak: 1100 })); busy = false; await d.waitForTimeout(400); }
    else if (s.ph === 'live' && s.mine && s.s > .45 && s.vin > 2){
      const eta = (s.s - .45)/s.vin;
      // il robot «vede» quando arriva la palla e fa partire il movimento sul telefono in modo che il picco (a metà del
      // movimento sintetico di 220 ms) cada in quell'istante, convertito sull'orologio del telefono; più un errore umano
      if (eta < .3 && s.clock){ busy = true; const tgt = s.now + eta*1000 + s.clock.off + gaussMs(35);
        await ph.evaluate(tgt => { window.__pk = window.__pk || []; const o = { tgt, late0: performance.now() - (tgt - 110) }; __pk.push(o); __racchetta.det.on('swing', s => { if (!o.pk) o.pk = s.peakT - tgt; }); return new Promise(r => setTimeout(() => __motion.swing({ peak: 1000 + Math.random()*400 }).then(r), Math.max(0, tgt - 110 - performance.now()))); }, tgt);
        busy = false; await d.waitForTimeout(300); }
    }
  }
  if (++n % 200 === 0) console.log('  ', Math.round((Date.now() - t0)/1000) + 's', await d.evaluate(() => document.querySelector('#score').textContent + ' ' + JSON.stringify({ c: __log.contacts.slice(-6), sw: __log.phoneSw })));
  await d.waitForTimeout(15);
}
const log = await d.evaluate(() => __log);
console.log('telefono: picco − obiettivo (ms)', JSON.stringify(await ph.evaluate(() => (window.__pk || []).map(o => [Math.round(o.pk), Math.round(o.late0)]))));
console.log('orologio', JSON.stringify(await d.evaluate(() => __tennis.link.clock)));
await d.screenshot({ path: SP + '/t2-end.png' });
check('i colpi del telefono arrivano in partita', log.phoneSw >= 4, `${log.phoneSw} colpi ricevuti`);
check('servizio col telefono: un movimento lancia la palla', log.toss >= 1, `${log.toss} lanci`);
check('colpi del telefono toccano la palla', log.contacts.length >= 2, log.contacts.join(', '));
check('la partita col telefono arriva alla fine', end);
const phoneTxt = await ph.evaluate(() => document.body.innerText);
check('il telefono riceve i messaggi della partita', /Partita finita|Punto|Perfetto|anticipo|ritardo|Steccata|Mancata/.test(phoneTxt), phoneTxt.replace(/\s+/g, ' ').slice(0, 140));

// guasti: il telefono si chiude → il computer lo segnala e mouse e tastiera restano attivi
await d.click('#again'); await d.waitForFunction(() => __tennis.state === 'play');
// il telefono ricarica la pagina: si ricollega da solo con la chiave di ripresa (il QR intanto è cambiato)
await ph.reload();
await ph.waitForFunction(() => window.__racchetta && __racchetta.state.linkState === 'on', null, { timeout: 20000 });
check('ricaricando la pagina il telefono si ricollega da solo', true);
await ph.click('#enable'); await ph.evaluate(() => __motion.still(1200)); await ph.evaluate(() => __motion.swing({ peak: 900 }));
await d.waitForFunction(() => document.querySelector('#chip').classList.contains('ok'), null, { timeout: 8000 });
check('… e dopo la calibrazione torna «pronto»', true);
await P.ctx.close();
await d.waitForFunction(() => /scollegato/i.test(document.querySelector('#chip').textContent), null, { timeout: 20000 });
check('telefono chiuso: il computer lo segnala', true, await d.evaluate(() => document.querySelector('#chip').textContent));
const x0 = await d.evaluate(() => __tennis.core.players[0].x);
await d.keyboard.down('KeyA'); await d.waitForTimeout(500); await d.keyboard.up('KeyA');
check('… e la tastiera continua a funzionare', await d.evaluate(x => __tennis.core.players[0].x < x - .5, x0));
await d.screenshot({ path: SP + '/t2-lost.png' });
check('nessun errore JavaScript (computer e telefono)', !D.errs.length && !P.errs.length, [...D.errs, ...P.errs].join(' | ').slice(0, 500));
summary(); await B.close();
