// Exercise the real link, main loop, guest receiver and renderer. Phone motion
// detection is represented by normalized sensor packets, not physical motion.
import { launch, page, check, summary, SP } from './th.mjs';
const B = await launch(), Q = '?peer=127.0.0.1:9000&q=low', size = { w: 800, h: 600 };
const opened = [];
let sharedContext = null;
const localControls = process.env.TIMING_LOCAL_CONTROLS === '1'; // isolate rendering when local WebRTC is unavailable
async function screen(url){ const target = new URL(url); target.searchParams.set('q', 'low'); const v = await page(B, target.href, { ...size, context: sharedContext, init: () => { const RTC = window.RTCPeerConnection; window.RTCPeerConnection = class extends RTC { constructor(config, ...rest){ super({ ...config, iceServers: [] }, ...rest); } }; } }); sharedContext = v.ctx; opened.push(v); await v.p.waitForFunction(() => window.__racchetta); await v.p.evaluate(() => __racchetta.S.renderer.setSize(320, 240, false)); return v.p; }
async function pair(p){
  await p.waitForFunction(() => document.querySelector('#qr').dataset.url);
  console.log('Pairing normalized phone fixture');
  if (localControls){
    await p.evaluate(() => { window.__phone = { conn: { send(d){ if (d.t === 'sw') __racchetta.controls.phoneSwing({ at: (d.pk - (__racchetta.link?.clock?.off || 0))/1000, power: d.p, dir: d.dir }); } } }; document.querySelector('#pairGo').click(); });
    return;
  }
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
        if (d.t === 'dp' && __phone.sync !== false) conn.send({ t: 'dq', d: d.d, p: performance.now() });
      });
    });
    __phone.heart = setInterval(() => conn.send({ t: 'ping', c: performance.now() }), 1000);
  });
  await p.waitForFunction(() => __racchetta.link.ready && __racchetta.link.clock);
  await p.click('#pairGo');
}
async function hook(p){
  await p.evaluate(async () => {
    const { evaluateContact } = await import('/js/match/contact.js');
    const S = __racchetta.S, sync = S.sync, render = S.render;
    window.__timing = { armed: false, sent: null, view: null, samples: [], received: [], packets: [] };
    __racchetta.link.on('swing', s => __timing.received.push({ at: s.at, wall: performance.now()/1000 }));
    __racchetta.A.host?.on('input', d => { if (d.sw?.length) __timing.packets.push({ ct: __racchetta.core.t, times: d.sw.map(s => s.at) }); });
    S.sync = (v, dt, local) => { __timing.view = v; __timing.local = local; return sync(v, dt, local); };
    S.render = () => {
      render();
      const T = __timing, v = T.view, p = v?.players.find(p => p.id === T.local?.id);
      if (!T.armed || !p || !p.inc || v.phase !== 'live') return;
      const cue = evaluateContact({ ball: v.ball.p, velocity: v.ball.v, player: p, eligible: p.contactEligible });
      if (T.samples.length < 40) T.samples.push({ t: v.t, eta: cue.timeToImpact, perfect: cue.perfect, ready: cue.ready, eligible: p.contactEligible, z: p.z, y: v.ball.p.y });
      if (!cue.perfect) return;
      const ring = S.scene.children.find(o => o.geometry?.type === 'RingGeometry' && o.geometry.parameters.outerRadius === 1);
      T.sent = { at: v.t, green: !!ring?.visible && ring.material.color.getHex() === 0x4cff8a };
      T.armed = false;
      // This normalized fixture expresses its peak in the estimated phone clock.
      // Clock estimation itself is covered separately; software rendering can
      // stall both simulated endpoints on this single page/event loop.
      queueMicrotask(() => { const pk = performance.now() + (__racchetta.link?.clock?.off || 0); setTimeout(() => __phone.conn.send({ t: 'sw', pk, lat: 60, p: .6, dir: 1, l: 0 }), 60); });
    };
  });
}
async function incoming(host, team){
  return host.evaluate(team => {
    __racchetta.A.netPause = true;
    const c = __racchetta.core, sign = team === 0 ? 1 : -1;
    c.score.server = 1-team; c.setupPoint(); c.phase = 'live';
    c.rally.hit(1-team); const box = c.rally.serveBox(); c.rally.event({ type: 'bounce', x: (box.x0+box.x1)/2, z: (box.z0+box.z1)/2, side: team }); c.rally.hit(team); c.rally.hit(1-team);
    if (c.rally.state !== 'live') throw new Error('Invalid incoming-ball fixture');
    c.lastHitter = c.players[1-team];
    c.sinceHit = .5; c.ball.held = false;
    const h = c.players[team]; Object.assign(h, { x: 0, z: sign*8, tx: 0, tz: sign*8, grace: .45, speed:0, autoSide: null, reactT: 0, planT: 0, vx: 0, vz: 0 });
    // Fixed reachable target isolates input/render timing from auto-movement AI.
    // Moving-player coverage lives in the 30/60/120 FPS core regression grid.
    h.inc = { Tc: c.t+.15, x: sign*.7, y: 1.3, z: sign*7, sx: 0, sz: sign*8, side: 'fh' }; h.planT = 2;
    c.ball.p = { x: sign*.7, y: 1.3, z: sign*5.8 }; c.ball.v = { x: 0, y: 1.5, z: sign*8 };
    window.__contacts = [];
    if (!c.__timingHook){ const update = c.update.bind(c); c.update = (dt, input) => { const ev = update(dt, input); __contacts.push(...ev.filter(e => e.type === 'contact')); return ev; }; c.__timingHook = true; }
    return c.t;
  }, team);
}
async function exercise(host, target, team, label){
  // Stabilize the synthetic phone clock before judging a rendered frame.
  // The real clock estimator has its own unit tests and physical-device gate.
  await target.evaluate(() => { __timing.armed = false; __phone.sync = false; });
  await target.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const startedAt = await incoming(host, team);
  await target.evaluate(() => { __timing.armed = true; __timing.sent = null; __timing.samples = []; });
  await host.evaluate(() => { __racchetta.A.netPause = false; });
  const id = await host.evaluate(team => __racchetta.core.players[team].id, team);
  try { await host.waitForFunction(id => __contacts.some(e => e.player === id), id, { timeout: 20000 }); }
  catch (e) { console.log('Timing diagnostic', await target.evaluate(() => ({ received: __timing.received, packets: __timing.packets, samples: __timing.samples, sent: __timing.sent, armed: __timing.armed, state: __racchetta.state, view: __timing.view, frameT: __racchetta.A.frameT, now: performance.now() }))); console.log('Host diagnostic', await host.evaluate(() => ({ packets: __timing.packets, contacts: __contacts, time: __racchetta.core.t, phase: __racchetta.core.phase, players: __racchetta.core.players }))); throw e; }
  const event = await host.evaluate(id => __contacts.find(e => e.player === id), id), sent = await target.evaluate(() => __timing.sent);
  check(label, sent?.green && event.label === 'perfetto' && event.at >= startedAt && event.at < startedAt + 2 && Math.abs(event.at - sent.at) < .03, JSON.stringify({ sent, event }));
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
  await cpu.context().close(); sharedContext = null;

  if (!localControls){
  const host = await screen('http://127.0.0.1:8765/tennis/'+Q);
  await host.click('#btnInvite'); await pair(host);
  await host.waitForFunction(() => /#sfida=/.test(document.querySelector('#invUrl').value));
  const guest = await screen(await host.inputValue('#invUrl'));
  try { await guest.waitForFunction(() => /Collegato/.test(document.querySelector('#gStatus').textContent)); } catch (e) { console.log('Guest connection diagnostic', await guest.evaluate(() => ({ status: document.querySelector('#gStatus').textContent, state: __racchetta.A.guest.S.state, error: __racchetta.A.guest.S.error }))); throw e; }
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
  }
  check('no browser JavaScript errors', opened.every(p => !p.errs.length), opened.flatMap(p => p.errs).join(' | ').slice(0, 500));
  summary();
} catch (e) { console.log('Browser errors:', opened.flatMap(p => p.errs)); throw e; } finally { await B.close(); }
