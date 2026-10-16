// Exercise the real link, main loop, guest receiver and renderer. Phone motion
// detection is represented by normalized sensor packets, not physical motion.
import { launch, page, check, summary, SP } from './th.mjs';
const B = await launch(), Q = '?peer=127.0.0.1:9000&q=low', size = { w: 800, h: 600 };
const opened = [];
async function screen(url){ const v = await page(B, url, { ...size, init: () => { const RTC = window.RTCPeerConnection; window.RTCPeerConnection = class extends RTC { constructor(config, ...rest){ super({ ...config, iceServers: [] }, ...rest); } }; } }); opened.push(v); await v.p.waitForFunction(() => window.__racchetta); return v.p; }
async function pair(p){
  await p.waitForFunction(() => document.querySelector('#qr').dataset.url);
  console.log('Pairing normalized phone fixture');
  await p.evaluate(async () => {
    const { peerConfig, loadPeer } = await import('/js/tennis/link.js');
    const { parsePairing } = await import('/js/tennis/pairing.js');
    const qr = parsePairing(new URL(document.querySelector('#qr').dataset.url).hash), Peer = await loadPeer();
    const peer = new Peer(undefined, { ...peerConfig(), config: { iceServers: [] } });
    await new Promise((resolve, reject) => { peer.on('open', resolve); peer.on('error', reject); });
    const conn = peer.connect(qr.session, { reliable: true });
    window.__phone = { peer, conn, errors: [] };
    peer.on('error', e => __phone.errors.push(e.type+': '+e.message));
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Phone fixture connection timeout: '+conn.peerConnection?.connectionState+' / '+conn.peerConnection?.iceConnectionState+' local='+!!conn.peerConnection?.localDescription+' remote='+!!conn.peerConnection?.remoteDescription+' errors='+JSON.stringify(__phone.errors))), 15000);
      conn.on('open', () => conn.send({ t: 'hello', k: qr.token }));
      conn.on('error', reject);
      conn.on('data', d => {
        if (d.t === 'welcome'){ clearTimeout(timeout); conn.send({ t: 'st', s: 'ready' }); resolve(); }
        if (d.t === 'dp') conn.send({ t: 'dq', d: d.d, p: performance.now() });
      });
    });
    __phone.heart = setInterval(() => conn.send({ t: 'ping', c: performance.now() }), 1000);
  });
  await p.waitForFunction(() => __racchetta.link.ready);
  await p.click('#pairGo');
}
async function hook(p){
  await p.evaluate(async () => {
    const { evaluateContact } = await import('/js/match/contact.js');
    const S = __racchetta.S, sync = S.sync, render = S.render;
    window.__timing = { armed: false, sent: null, view: null };
    S.sync = (v, dt, local) => { __timing.view = v; __timing.local = local; return sync(v, dt, local); };
    S.render = () => {
      render();
      const T = __timing, v = T.view, p = v?.players.find(p => p.id === T.local?.id);
      if (!T.armed || !p || !p.inc || v.phase !== 'live') return;
      const cue = evaluateContact({ ball: v.ball.p, velocity: v.ball.v, player: p, eligible: p.contactEligible });
      if (!cue.perfect) return;
      const ring = S.scene.children.find(o => o.geometry?.type === 'RingGeometry' && o.geometry.parameters.outerRadius === 1);
      T.sent = { at: v.t, green: !!ring?.visible && ring.material.color.getHex() === 0x4cff8a };
      T.armed = false;
      queueMicrotask(() => { const pk = performance.now(); setTimeout(() => __phone.conn.send({ t: 'sw', pk, lat: 60, p: .6, dir: 1, l: 0 }), 60); });
    };
  });
}
async function incoming(host, team){
  await host.evaluate(team => {
    const c = __racchetta.core, sign = team === 0 ? 1 : -1;
    c.score.server = 1-team; c.setupPoint(); c.phase = 'live';
    c.rally.hit(1-team); c.rally.event({ type: 'bounce', x: sign*.7, z: sign*4, side: team }); c.rally.hit(team); c.rally.hit(1-team);
    c.sinceHit = .5; c.ball.held = false;
    const h = c.players[team]; Object.assign(h, { x: 0, z: sign*8, tx: 0, tz: sign*8, grace: .45 });
    c.ball.p = { x: sign*.7, y: 1.3, z: sign*5.8 }; c.ball.v = { x: 0, y: 1.5, z: sign*8 };
    window.__contacts = [];
    if (!c.__timingHook){ const update = c.update.bind(c); c.update = (dt, input) => { const ev = update(dt, input); __contacts.push(...ev.filter(e => e.type === 'contact')); return ev; }; c.__timingHook = true; }
  }, team);
}
async function exercise(host, target, team, label){
  await target.evaluate(() => { __timing.armed = true; __timing.sent = null; });
  await incoming(host, team);
  const id = await host.evaluate(team => __racchetta.core.players[team].id, team);
  await host.waitForFunction(id => __contacts.some(e => e.player === id), id, { timeout: 12000 });
  const event = await host.evaluate(id => __contacts.find(e => e.player === id), id), sent = await target.evaluate(() => __timing.sent);
  check(label, sent?.green && event.label === 'perfetto' && Math.abs(event.at - sent.at) < .03, JSON.stringify({ sent, event }));
}
try {
  const cpu = await screen('http://127.0.0.1:8765/tennis/'+Q);
  console.log('CPU page loaded');
  await cpu.click('#btnCpu'); await pair(cpu); await hook(cpu);
  await exercise(cpu, cpu, 0, 'CPU: actual green ring -> phone packet -> perfect contact');
  await cpu.click('#pauseBtn');
  const paused = await cpu.evaluate(() => ({ t: __racchetta.core.t, swings: __racchetta.core.players[0].swings.length }));
  await cpu.evaluate(() => __phone.conn.send({ t: 'sw', pk: performance.now(), p: .6, dir: 1 }));
  await cpu.waitForTimeout(150);
  check('pause freezes physics and discards phone swings', await cpu.evaluate(v => __racchetta.core.t === v.t && __racchetta.core.players[0].swings.length === 0, paused));
  await cpu.click('#resume'); await exercise(cpu, cpu, 0, 'CPU timing still correct after resume');
  await cpu.screenshot({ path: SP+'/timing-cpu.png' });
  await cpu.context().close();

  const host = await screen('http://127.0.0.1:8765/tennis/'+Q);
  await host.click('#btnInvite'); await pair(host);
  await host.waitForFunction(() => /#sfida=/.test(document.querySelector('#invUrl').value));
  const guest = await screen(await host.inputValue('#invUrl'));
  await guest.waitForFunction(() => /Collegato/.test(document.querySelector('#gStatus').textContent));
  await guest.click('#gGo'); await pair(guest);
  await host.waitForFunction(() => !document.querySelector('#lobbyStart').disabled); await host.click('#lobbyStart');
  await guest.waitForFunction(() => __racchetta.state === 'play' && __racchetta.A.mirror?.last);
  await hook(host); await hook(guest);
  await exercise(host, host, 0, 'P1: real host loop accepts phone contact');
  await exercise(host, guest, 1, 'P2: interpolated green -> phone -> guest -> host callback');
  await host.click('#pauseBtn'); await guest.waitForFunction(() => __racchetta.A.netPause && __timing.view.t === __racchetta.A.mirror.last.ct);
  const freeze = await guest.evaluate(() => __timing.view.t);
  await guest.waitForTimeout(200);
  check('P2 display freezes while host is paused', await guest.evaluate(t => __timing.view.t === t && !__racchetta.controls.enabled, freeze));
  await host.click('#resume'); await guest.waitForFunction(() => !__racchetta.A.netPause && !__racchetta.A.mirror.waiting);
  await exercise(host, guest, 1, 'P2 timing still correct after shared pause');
  await guest.screenshot({ path: SP+'/timing-p2.png' });
  check('no browser JavaScript errors', opened.every(p => !p.errs.length), opened.flatMap(p => p.errs).join(' | ').slice(0, 500));
  summary();
} catch (e) { console.log('Browser errors:', opened.flatMap(p => p.errs)); throw e; } finally { await B.close(); }
