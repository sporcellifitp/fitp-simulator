// B45.2 «rifiniture del collegamento» · dopo la revisione indipendente del B45.1 (14/11; docs/b45/b45-1-collegamento.md,
// sezione «B45.2»). Interfaccia vera (NatpfUi, chiosco, registro dello stand) sul motore senza disegno (ui-world.mjs) e,
// dove serve, il collegamento VERO del computer (site/js/tennis/link.js) con un Peer finto al posto di PeerJS, come in
// tools/test/b45-collegamento.test.mjs: i messaggi del telefono passano dalla stessa catena del gioco.
//   1. «Scollega» fatto dal computer (pannello dello stand, riquadro del telefono, useStand) non è una caduta: niente nel
//      pannello, nel registro la riga «scollegato» di sempre; gli eventi di un collegamento di prima non contano;
//   2. schermo del telefono spento: motivo «telefono: pagina nascosta» e una caduta sola anche se il telefono la racconta
//      un minuto dopo; un racconto è una caduta nuova solo se il computer non ne ha già una dall'ultimo collegamento;
//   3. pagina del telefono chiusa o «Scollega» sul telefono in partita: il riquadro lo dice e il QR si apre subito;
//   7. chiosco: gesti, tocchi sul telefono e telefono mosso contano come attività; «a riposo»; il chiosco non scollega.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, $, visible } from './ui-world.mjs';
import { QUICK_PLAN } from '@natpf/tennis/calibration.js';
const { leggiCadute, rigaCadute } = await import('../src/natpf/natpf_cadute.js');
const { PANEL_AFTER_MS } = await import('../src/natpf/natpf_phone_watch.js');
const { LIFE, MOVE } = await import('@natpf/tennis/link-life.js');

/* ---------- Peer finto (come PeerJS: close() e destroy() emettono subito i loro eventi) ---------- */
class Emitter { constructor(){ this.h = {}; } on(k, f){ (this.h[k] ||= []).push(f); return this; } emit(k, v){ for (const f of this.h[k] || []) f(v); } }
class FakeConn extends Emitter { constructor(peer){ super(); this.peer = peer; this.open = true; this.sent = []; } send(m){ this.sent.push(m); } close(){ if (!this.open) return; this.open = false; this.emit('close'); } }
class FakePeer extends Emitter {
  constructor(){ super(); this.destroyed = false; this.conns = []; FakePeer.last = this; setTimeout(() => this.emit('open'), 0); }
  destroy(){ if (this.destroyed) return; this.emit('disconnected'); for (const c of this.conns) c.close(); this.destroyed = true; this.emit('close'); }
  reconnect(){}
}
// righe del registro dello stand scritte da qui in poi (come natpf-b46-caso-utente.test.mjs)
function regRows(ui){
  const rec = ui.registro?.rec, out = [];
  assert.ok(rec, 'registro dello stand acceso');
  const orig = rec._scrivi.bind(rec);
  rec._scrivi = raw => { const n = rec.buf.length; orig(raw); if (rec.buf.length > n) out.push(JSON.parse(rec.buf[rec.buf.length - 1])); };
  return out;
}
// Mondo con il collegamento vero del computer: il telefono finto entra con il codice del QR e dice «pronto».
// L'orologio del collegamento (Date.now: controllo di vita) segue quello finto del mondo di prova: advance() lo fa andare
async function linked(){
  const w = await makeWorld({ controller: 'phone', cal: 'play' }), { ui } = w, P = ui.phone;
  globalThis.Peer = FakePeer; globalThis.qrcode = () => ({ addData(){}, make(){}, createSvgTag: () => '<svg></svg>' });
  const realNow = Date.now, t0 = realNow() - performance.now(); Date.now = () => t0 + performance.now();
  P.link = null; await P.start(); w.advance(50);
  const link = P.link;
  assert.equal(link.L.state, 'waiting', 'collegamento vero in attesa del telefono');
  const join = (hello = { t: 'hello', v: 2, k: link.token }, id = 'phone-1') => { const c = new FakeConn(id); FakePeer.last.conns.push(c); FakePeer.last.emit('connection', c); c.emit('data', hello); return c; };
  // segnale del telefono di ogni secondo («st»): pronto, pagina in vista (vis 0: nascosta)
  const beat = (c, { vis = 1, s = 'ready' } = {}) => c.emit('data', { t: 'st', s, vis, sa: 10 });
  const diag = []; P.onDiag((k, d) => { if (k === 'caduta') diag.push(d); });
  const c = join(); beat(c);
  assert.equal(c.sent[0]?.t, 'welcome'); assert.ok(P.connected && P.ready);
  w.advance(1500);                                           // (il registro scrive «collegato» al suo controllo di ogni secondo)
  const reg = regRows(ui);
  return { ...w, P, link, c, join, beat, diag, reg, tel: () => reg.filter(x => x.k === 'tel' && ['caduto', 'scollegato', 'ricollegato', 'collegato'].includes(x.stato)), done(){ Date.now = realNow; try { P.link?.stop?.(); } catch {} } };
}
const cadute = () => leggiCadute();

/* ---------- 1 · «Scollega» fatto dal computer non è una caduta ---------- */

test('1 · «Telefono: Scollega» del pannello e «Scollega» del riquadro del telefono: nessuna caduta nel pannello, nel registro «scollegato» e non «caduto»', async () => {
  const w = await linked();
  try {
    // pannello dello stand (lo stesso comando del telecomando dello staff: natpf_kiosk.run)
    w.ui.kiosk.run('phone');
    assert.equal(w.P.connected, false); assert.equal(w.link.L.state, 'waiting', 'in attesa del QR nuovo, senza passare da «lost»');
    assert.equal(w.c.open, false); assert.deepEqual(w.c.sent.find(m => m.t === 'bye'), { t: 'bye' });
    w.advance(1500);
    assert.equal(cadute().p1.n, 0, 'nessuna caduta contata'); assert.equal(rigaCadute(cadute()), '', 'nessuna riga nel pannello');
    assert.deepEqual(w.diag, []); assert.equal(w.P.drop, null);
    assert.deepEqual(w.tel().map(x => x.stato), ['scollegato'], JSON.stringify(w.tel()));
    assert.equal(w.tel()[0].motivo, undefined, '«scollegato» di sempre: senza motivo di caduta');
    // un telefono nuovo inquadra il QR nuovo; poi «Scollega» nel riquadro del telefono (pagina «Collega», pannello del telefono)
    const c2 = w.join({ t: 'hello', v: 2, k: w.link.token }, 'phone-2'); w.beat(c2);
    assert.ok(w.P.connected); w.advance(1500);
    $('natpf-phone-forget').click();
    assert.equal(w.P.connected, false); assert.equal(c2.open, false);
    w.advance(1500);
    assert.equal(cadute().p1.n, 0); assert.deepEqual(w.diag, []);
    assert.deepEqual(w.tel().map(x => x.stato), ['scollegato', 'collegato', 'scollegato']);
    // una caduta vera resta una caduta: il telefono chiude il canale da sé
    const c3 = w.join({ t: 'hello', v: 2, k: w.link.token }, 'phone-3'); w.beat(c3); w.advance(1500);
    c3.close(); w.advance(1500);
    assert.deepEqual(cadute().p1, { n: 1, m: { chiuso: 1 } });
    assert.equal(w.tel().at(-1).stato, 'caduto'); assert.equal(w.tel().at(-1).motivo, 'chiuso');
  } finally { w.done(); }
});

test('1 · useStand (collegamento fermato e rifatto) non è una caduta; gli eventi «drop» di un collegamento di prima non contano', async () => {
  const w = await linked();
  try {
    const old = w.link;
    // la modalità fiera passa al posto dello stand: il collegamento col QR si ferma (link.stop) e ne nasce un altro
    await w.P.useStand('p1'); w.advance(1500);
    assert.notEqual(w.P.link, old); assert.equal(w.c.open, false, 'il canale di prima è chiuso');
    assert.equal(cadute().p1.n, 0, 'fermare il collegamento non è una caduta'); assert.deepEqual(w.diag, []);
    assert.ok(!w.tel().some(x => x.stato === 'caduto'), JSON.stringify(w.tel()));
    await w.P.useStand(null); w.advance(200);
  } finally { w.done(); }
  // un collegamento sostituito che emette ancora «drop» (il telefono di prima chiude dopo): la racchetta lo ignora
  const k = await linked();
  try {
    const old = k.P.link;
    k.P.link = { ...old, L: { state: 'off', phone: null }, connected: false, ready: false, on(){}, start(){}, stop(){}, send(){}, cmd(){}, forget(){}, motion(){ return null; }, face(){ return null; }, stats(){ return { rates: {} }; } };
    k.c.close();                                             // il collegamento vero di prima vede cadere il suo telefono
    assert.equal(old.L.state, 'lost', 'per il collegamento di prima è una caduta');
    assert.equal(cadute().p1.n, 0, 'ma non è più quello della racchetta: non si conta'); assert.deepEqual(k.diag, []);
    try { old.stop(); } catch {}
  } finally { k.done(); }
});

/* ---------- 2 · schermo del telefono spento: motivo giusto, una caduta sola ---------- */

test('2 · schermo spento per un minuto: «telefono: pagina nascosta» (non «Wi-Fi ferma»), contata una volta anche se il telefono la racconta al risveglio', async () => {
  const w = await linked();
  try {
    const resume = w.c.sent[0].r;
    w.beat(w.c, { vis: 0 });                                 // l'ultimo segnale del telefono: pagina nascosta (schermo spento)
    w.advance(LIFE.silentMs + 2500);                         // poi tace: a 10 s il controllo di vita del computer chiude
    assert.equal(w.link.L.state, 'lost');
    assert.deepEqual(cadute().p1, { n: 1, m: { 'telefono: pagina nascosta': 1 } });
    assert.equal(rigaCadute(cadute()), 'Telefono 1: 1 caduta oggi · motivo più frequente: pagina nascosta');
    assert.deepEqual(w.diag.map(d => [d.motivo, d.causa]), [['telefono: pagina nascosta', 'telefono']]);
    assert.ok(w.diag[0].ms > LIFE.silentMs, 'con da quanto taceva');
    // il visitatore riaccende lo schermo dopo quasi un minuto: il telefono vede il canale chiuso, rientra con la sua chiave
    // e racconta «nascosta», con l'ora del risveglio (1,5 s prima)
    w.advance(45000);
    const back = w.join({ t: 'hello', v: 2, r: resume }, 'phone-1b'); w.beat(back);
    assert.equal(back.sent[0]?.t, 'welcome');
    back.emit('data', { t: 'dev', ua: 'Pixel', as: 1, cd: { w: 'nascosta', ms: 1500, prove: 1, fallite: 0 } });
    w.advance(1500);
    assert.deepEqual(cadute().p1, { n: 1, m: { 'telefono: pagina nascosta': 1 } }, 'una sola caduta (lo schermo spento), non due');
    assert.equal(w.diag.length, 1, 'nessuna seconda caduta alla diagnostica');
    const tel = w.tel();
    assert.deepEqual(tel.map(x => x.stato), ['caduto', 'ricollegato'], JSON.stringify(tel));
    assert.deepEqual([tel[0].motivo, tel[0].causa], ['telefono: pagina nascosta', 'telefono']);
    assert.deepEqual([tel[1].motivo, tel[1].prove], ['telefono: pagina nascosta', 1], 'al ritorno il motivo confermato dal telefono e i suoi tentativi');
    assert.ok(tel[1].dopoS >= 45, `tornato dopo ${tel[1].dopoS} s`);
  } finally { w.done(); }
});

test('2 · silenzio a schermo acceso resta «silenzio»; il racconto del telefono lo chiarisce («rete cambiata») senza contarlo due volte, a qualunque distanza', async () => {
  const w = await linked();
  try {
    const resume = w.c.sent[0].r;
    w.advance(LIFE.silentMs + 2500);
    assert.deepEqual(cadute().p1, { n: 1, m: { silenzio: 1 } });
    // il telefono torna dopo due minuti (era fuori portata) e racconta: aveva cambiato rete, 4 tentativi a vuoto
    w.advance(120000);
    const back = w.join({ t: 'hello', v: 2, r: resume }, 'phone-1b'); w.beat(back);
    back.emit('data', { t: 'dev', ua: 'Pixel', as: 1, cd: { w: 'silenzio', ms: 119000, prove: 5, fallite: 4, rete: 1, tipo: 'cellular' } });
    w.advance(1500);
    assert.deepEqual(cadute().p1, { n: 1, m: { 'rete cambiata': 1 } }, 'stessa caduta, motivo chiarito');
    assert.equal(w.diag.length, 1);
    assert.deepEqual(w.tel().map(x => [x.stato, x.motivo]), [['caduto', 'silenzio'], ['ricollegato', 'rete cambiata']]);
  } finally { w.done(); }
});

test('2 · un racconto è una caduta nuova solo se il computer non ne ha già una di quel telefono dall\'ultimo collegamento', async () => {
  const w = await linked();
  try {
    const resume = w.c.sent[0].r;
    // il telefono cade e rientra prima che il computer se ne accorga (il canale di prima è ancora aperto): lo racconta lui
    const b = w.join({ t: 'hello', v: 2, r: resume }, 'phone-1b'); w.beat(b);
    assert.equal(w.c.open, false, 'il canale di prima è chiuso dal computer, senza caduta'); assert.equal(cadute().p1.n, 0);
    b.emit('data', { t: 'dev', ua: 'Pixel', as: 1, cd: { w: 'rete', ms: 3000, prove: 2, fallite: 1 } });
    assert.deepEqual(cadute().p1, { n: 1, m: { 'rete cambiata': 1 } }, 'caduta che il computer non ha visto: contata dal racconto');
    assert.deepEqual(w.diag.map(d => [d.motivo, d.fonte]), [['rete cambiata', 'telefono']]);
    // un secondo racconto nello stesso ingresso (non deve succedere: il telefono lo dice una volta) non si conta
    b.emit('data', { t: 'dev', ua: 'Pixel', as: 1, cd: { w: 'chiuso', ms: 500, prove: 1, fallite: 0 } });
    assert.equal(cadute().p1.n, 1);
    // poi una caduta vista dal computer; il telefono torna con una pagina di prima (senza racconto): resta com'è
    b.close(); w.advance(1500);
    assert.deepEqual(cadute().p1, { n: 2, m: { 'rete cambiata': 1, chiuso: 1 } });
    const c3 = w.join({ t: 'hello', v: 2, r: resume }, 'phone-1c'); w.beat(c3);
    c3.emit('data', { t: 'dev', ua: 'Pixel', as: 1 });
    assert.equal(cadute().p1.n, 2);
    // e ancora una caduta lampo non vista dal computer, raccontata: è nuova (la caduta di prima era di un altro collegamento)
    const c4 = w.join({ t: 'hello', v: 2, r: resume }, 'phone-1d'); w.beat(c4);
    c4.emit('data', { t: 'dev', ua: 'Pixel', as: 1, cd: { w: 'nascosta', ms: 2000, prove: 1, fallite: 0 } });
    assert.deepEqual(cadute().p1, { n: 3, m: { 'rete cambiata': 1, chiuso: 1, 'telefono: pagina nascosta': 1 } });
  } finally { w.done(); }
});

/* ---------- 3 · pagina del telefono chiusa o «Scollega» sul telefono: il riquadro lo dice, QR subito ---------- */

const calibrate = w => {
  w.cal({ kind: 'step', step: 'still' });
  QUICK_PLAN.forEach((want, idx) => { w.cal({ kind: idx ? 'next' : 'step', step: 'swings', want, idx, total: QUICK_PLAN.length }); w.cal({ kind: 'ready', want }); w.cal({ kind: 'attempt', ok: true, idx, want }); w.advance(700); });
  w.cal({ kind: 'review', pass: true });
};
// partita contro la CPU con il telefono (collegamento finto del mondo di prova, come natpf-flows.test.mjs)
async function phoneMatch(){
  const w = await makeWorld({ controller: 'phone' }); w.advance(300);
  const { ui, lobby } = w;
  lobby.menu('play'); lobby.setMode('cpu'); lobby.go('controller'); lobby.go('connect'); lobby.next();
  calibrate(w); w.cal({ kind: 'done', profile: { hand: 'right' } }); ui.training.skip(); w.pressStart(); w.advance(500);
  assert.ok(ui.prematch.active && w.E.natpfPaused); w.advance(2700); assert.ok(!ui.prematch.active && !w.E.natpfPaused);
  return w;
}
// caduta vista dal computer con il suo motivo (evento «drop» di link.js), poi lo stato «lost»
const drop = (w, motivo, causa = 'telefono') => { w.E.natpfPhone._onDrop({ motivo, causa, ms: 150 }); Object.assign(w.link, { connected: false, ready: false, L: { ...w.link.L, state: 'lost', phone: null } }); w.E.natpfPhone._changed(); };
const back = w => { Object.assign(w.link, { connected: true, ready: true, L: { ...w.link.L, state: 'connected', phone: 'ready', joins: (w.link.L.joins || 0) + 1 } }); w.E.natpfPhone._changed(); };
const hold = () => ({ title: $('natpf-phone-hold').querySelector('b').textContent, text: $('natpf-phone-hold').querySelector('p').textContent });

test('3 · pagina del telefono chiusa o ricaricata in partita: «Telefono 1: pagina chiusa», QR subito; la pagina ricaricata torna e il pannello si chiude da solo', async () => {
  const w = await phoneMatch(), { E } = w;
  drop(w, 'telefono: pagina chiusa'); w.advance(200);
  assert.ok(!E.natpfPaused && !visible('natpf-phone-modal'), 'non prima della tolleranza di sempre (un ricollegamento lampo)');
  w.advance(400);
  assert.ok(E.natpfPaused && visible('natpf-phone-hold'));
  assert.deepEqual(hold(), { title: 'Telefono 1: pagina chiusa', text: 'Se non torna tra pochi secondi (pagina ricaricata), inquadra di nuovo il QR.' });
  assert.ok(!/si ricollega da solo/.test(hold().title + hold().text), 'niente «si ricollega da solo»');
  assert.ok(visible('natpf-phone-modal'), `il pannello con il QR si apre subito (non dopo ${PANEL_AFTER_MS/1000} s)`);
  // era una ricarica: il telefono rientra da solo dopo 3 s, il pannello aperto così si chiude e la partita riprende
  w.advance(3000); back(w); w.advance(3600);
  assert.ok(!visible('natpf-phone-modal') && !E.natpfPaused && !visible('natpf-phone-hold'));
  assert.equal(E.natpfPhone.dropMotivo, null, 'da collegato il motivo di prima non vale più');
});

test('3 · «Scollega» toccato sul telefono in partita: «Telefono 1 scollegato dal telefono · inquadra il QR», QR subito', async () => {
  const w = await phoneMatch(), { E } = w;
  drop(w, 'telefono: scollegato'); w.advance(600);
  assert.ok(E.natpfPaused);
  assert.deepEqual(hold(), { title: 'Telefono 1 scollegato dal telefono · inquadra il QR', text: 'Sul telefono è stato toccato «Scollega»: per giocare ancora inquadra di nuovo il QR.' });
  assert.ok(visible('natpf-phone-modal'), 'pannello con il QR subito');
});

test('3 · gli altri motivi come prima: «scollegato · si ricollega da solo», QR solo dopo; dopo «Scollega» fatto dal computer nessun motivo vecchio', async () => {
  for (const motivo of ['silenzio', 'chiuso', 'rete cambiata', 'ricollega']){
    const w = await phoneMatch(), { E } = w;
    drop(w, motivo, motivo === 'silenzio' ? 'computer' : 'telefono'); w.advance(600);
    assert.ok(E.natpfPaused);
    assert.equal(hold().title, 'Telefono 1 scollegato · si ricollega da solo', motivo);
    assert.ok(!visible('natpf-phone-modal'), `${motivo}: niente QR subito`);
    w.advance(PANEL_AFTER_MS);
    assert.ok(visible('natpf-phone-modal'), `${motivo}: il QR se non torna`);
  }
  // una caduta «pagina chiusa», il telefono torna; poi un'altra caduta di cui non si sa il motivo (collegamento finto:
  // nessun evento): non si riusa il motivo di prima
  const w = await phoneMatch(), P = w.E.natpfPhone;
  drop(w, 'telefono: pagina chiusa'); w.advance(600); assert.equal(P.dropMotivo, 'telefono: pagina chiusa');
  back(w); w.advance(3600); assert.equal(P.dropMotivo, null);
  Object.assign(w.link, { connected: false, ready: false, L: { ...w.link.L, state: 'lost', phone: null } }); P._changed(); w.advance(600);
  assert.equal(P.dropMotivo, null, 'caduta di un altro ingresso: motivo non noto');
  assert.equal(hold().title, 'Telefono 1 scollegato · si ricollega da solo');
});

/* ---------- 7 · chiosco: attività dal telefono, «a riposo», niente scollegamento ---------- */

// chiosco acceso a 30 s, al menu con un nome scritto (c'è stato qualcuno); conta gli azzeramenti e gli «Scollega»
function kioskOn(w){
  const { ui } = w;
  ui.kiosk.close?.(); ui.remote?.close?.({ toStaff: false });
  const count = { resets: 0, forgets: 0 };
  const r = ui.kiosk.reset.bind(ui.kiosk); ui.kiosk.reset = (...a) => { count.resets++; return r(...a); };
  const P = ui.phone, f = P.forget.bind(P); P.forget = (...a) => { count.forgets++; return f(...a); };
  ui.kiosk.enabled = true; ui.kiosk.limit = 30;
  w.lobby.go('menu'); ui.events.nickname = 'Marco'; ui.kiosk.poke();
  return count;
}

test('7 · chiosco: gesti e tocchi del telefono contano come attività; poi azzera chi gioca senza scollegare; a riposo non riparte', async () => {
  const w = await makeWorld({ controller: 'phone', cal: 'play' }), P = w.ui.phone, n = kioskOn(w);
  for (let i = 0; i < 6; i++){ w.advance(10000); P._activity(); }
  assert.equal(n.resets, 0, '60 s di gesti e tocchi sul telefono: nessun azzeramento (prima: a 30 s, con il telefono scollegato)');
  assert.equal(w.ui.events.nickname, 'Marco');
  w.advance(32000);
  assert.equal(n.resets, 1, 'poi 32 s senza nessuno: azzerato');
  assert.equal(w.ui.events.nickname, '', 'chi gioca è azzerato');
  assert.equal(P.connected, true, 'il telefono resta collegato'); assert.equal(n.forgets, 0, 'il chiosco non scollega');
  assert.ok(w.link.cmds.includes('cal'), 'il telefono riparte dalla calibrazione (profilo da capo), senza QR');
  w.advance(200000);
  assert.equal(n.resets, 1, 'a riposo: non riparte a ogni giro');
  // qualcuno riprende in mano il telefono (un tocco): non è più a riposo, e dopo il tempo del chiosco si azzera di nuovo
  P._activity(); w.advance(32000);
  assert.equal(n.resets, 2); assert.equal(n.forgets, 0); assert.equal(P.connected, true);
});

test('7 · chiosco: telefono preso in mano (sensori in movimento) conta, telefono fermo sul tavolo no', async () => {
  const w = await makeWorld({ controller: 'phone', cal: 'play' }), n = kioskOn(w);
  for (let i = 0; i < 6; i++){ w.advance(10000); w.link.L.movedAt = performance.now(); }
  assert.equal(n.resets, 0, 'telefono mosso: nessun azzeramento');
  w.advance(32000);
  assert.equal(n.resets, 1, 'fermo: azzerato');
  assert.equal(n.forgets, 0); assert.equal(w.ui.phone.connected, true);
  // un movimento di prima dell'azzeramento non lo fa ripartire
  w.advance(100000); assert.equal(n.resets, 1);
});

test('7 · chiosco con il collegamento vero: i messaggi del telefono (tutorial, mano, segno, gesto della calibrazione, sensori che si muovono) lo tengono sveglio', async () => {
  const w = await linked();
  try {
    const n = kioskOn(w), still = [0.4, -0.3, 0.2], moving = [MOVE.dps + 30, 2, 1];
    let q = 0; const sm = rot => w.c.emit('data', { t: 'sm', q: ++q, k: performance.now(), r: rot });
    // ogni 10 s un messaggio diverso del telefono, e intanto il segnale di ogni secondo (che da solo non conta)
    const tocchi = [
      () => w.c.emit('data', { t: 'tut', ok: 1 }),                               // «Tutto chiaro, ho capito»
      () => w.c.emit('data', { t: 'tut', nav: 1 }),                              // freccia del tutorial
      () => w.c.emit('data', { t: 'hand', h: 'left' }),                          // mano scelta sul telefono
      () => w.c.emit('data', { t: 'mk', x: 'qui è successo un problema' }),      // segno toccato sul telefono
      () => w.c.emit('data', { t: 'cal', e: { kind: 'attempt', ok: true, idx: 0 } }),   // gesto della calibrazione
      () => sm(moving),                                                          // telefono preso in mano
    ];
    for (const tocco of tocchi){ for (let s = 0; s < 10; s++){ w.advance(1000); w.beat(w.c); sm(still); } tocco(); }
    assert.equal(n.resets, 0, '60 s con il telefono in mano: nessun azzeramento');
    // poi il telefono resta sul tavolo: collegato, con il suo segnale e i sensori fermi. Non è «qualcuno»
    for (let s = 0; s < 33; s++){ w.advance(1000); w.beat(w.c); sm(still); }
    assert.equal(n.resets, 1, 'telefono fermo sul tavolo: il chiosco azzera');
    assert.equal(w.P.connected, true, 'e il telefono resta collegato'); assert.equal(n.forgets, 0);
    assert.equal(w.c.open, true); assert.equal(cadute().p1.n, 0, 'nessuna caduta');
    assert.ok(w.c.sent.some(m => m.t === 'cmd' && m.c === 'cal'), 'al telefono arriva la calibrazione da capo');
  } finally { w.done(); }
});
