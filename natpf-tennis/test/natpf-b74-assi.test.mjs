// B74 · «Assi del giroscopio: Come oggi · Corretti (prova)» (docs/b74/verifica-assi.md, docs/b74/assi-giroscopio.md).
// Chrome su Android e l'app NATPF Racchetta mandano la rotazione con α attorno a x; il codice la legge con α attorno a z
// (W3C). Con l'interruttore dello staff acceso un telefono Android la riordina all'ingresso; spento, tutto come prima.
//   1. pannello dello stand: voce nuova, di base «Come oggi», salvata, il chiosco e «Nuovo giocatore» non la toccano;
//   2. il gioco la manda ai telefoni nel cfg (ax 1) solo quando è accesa (spenta: il cfg di prima) e subito quando cambia;
//      l'ordine usato dal telefono (messaggio «dev» ax) fa ripartire i riferimenti imparati quando cambia;
//   3. registro: la riga «partita» dice l'interruttore (stand.assi) e cosa usa il telefono (tel.assi), solo se acceso;
//   4. telefono simulato: con la rotazione di Chrome e l'interruttore acceso la catena dà ESATTAMENTE i messaggi e le
//      letture del telefono simulato di sempre (ordine W3C); con l'interruttore spento i gesti speciali si perdono
//      (pallonetti letti top spin: come il telefono Android vero di oggi); iPhone con l'interruttore acceso: niente cambia.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, $ } from './ui-world.mjs';
import { simPhone, SIM_UA } from './phone-sim.mjs';
import { photoGrip, armSwing, STROKES } from './arm-sim.mjs';
import { AXES_KEY, AXES_DEFAULT, readAxesMode, writeAxesMode, nextAxesMode, axesButton, axesToast, axesOn } from '../src/natpf/natpf_gyro_axes.js';
import { RegistroStand } from '../src/natpf/registro/registro_registratore.js';
import { codaMemoria } from '../src/natpf/registro/registro_coda.js';
import * as F from '../src/natpf/registro/registro_formato.js';
import { rotOrderFor } from '@natpf/tennis/motion-sign.js';
import { readFileSync } from 'node:fs';

const storageFinto = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); } }; };

/* ---------- 1. opzione dello stand ---------- */
test('B74: «Assi del giroscopio» di base «Come oggi»; valori salvati, giro Come oggi ↔ Corretti, scritte del pannello', () => {
  const s = storageFinto();
  assert.equal(AXES_DEFAULT, 'oggi'); assert.equal(readAxesMode({ storage: s }), 'oggi', 'senza chiave: «Come oggi»');
  assert.equal(axesOn({ storage: s }), false);
  assert.equal(writeAxesMode('corretti', { storage: s }), 'corretti'); assert.equal(s.getItem(AXES_KEY), 'corretti');
  assert.equal(readAxesMode({ storage: s }), 'corretti'); assert.equal(axesOn({ storage: s }), true);
  assert.equal(writeAxesMode('boh', { storage: s }), 'oggi', 'un valore strano vale «Come oggi»');
  s.setItem(AXES_KEY, 'xyz'); assert.equal(readAxesMode({ storage: s }), 'oggi');
  assert.equal(nextAxesMode('oggi'), 'corretti'); assert.equal(nextAxesMode('corretti'), 'oggi'); assert.equal(nextAxesMode(undefined), 'corretti');
  assert.equal(axesButton('oggi'), 'Come oggi'); assert.equal(axesButton('corretti'), 'Corretti · prova');
  assert.match(axesToast('corretti'), /^Assi del giroscopio: Corretti \(prova\)\. Solo i telefoni Android, che rifanno la calibrazione; iPhone come prima\./);
  assert.match(axesToast('oggi'), /^Assi del giroscopio: Come oggi, come sempre/);
  // un archivio che non risponde: «Come oggi»
  const rotto = { getItem(){ throw new Error('no'); }, setItem(){ throw new Error('no'); } };
  assert.equal(readAxesMode({ storage: rotto }), 'oggi'); assert.equal(writeAxesMode('corretti', { storage: rotto }), 'corretti');
});

test('B74, pannello dello stand: «Assi del giroscopio» Come oggi ↔ Corretti · prova con un clic, salvata; il chiosco e «Nuovo giocatore» non la toccano', async () => {
  const w = await makeWorld({ controller: 'mouse' }); w.advance(300);
  const K = w.ui.kiosk, voce = () => $('natpf-staff').querySelector('[data-staff="axes"] b');
  K.open();
  assert.equal(voce().textContent, 'Come oggi', 'di base «Come oggi»');
  assert.equal(voce().parentElement.classList.contains('on'), false);
  K.run('axes');
  assert.equal(localStorage.getItem(AXES_KEY), 'corretti');
  assert.equal(voce().textContent, 'Corretti · prova');
  assert.equal(voce().parentElement.classList.contains('on'), true, '«Corretti» si vede acceso');
  assert.match($('natpf-toast').textContent, /Corretti \(prova\).*iPhone come prima.*resta salvata/);
  K.reset();
  assert.equal(localStorage.getItem(AXES_KEY), 'corretti', 'dopo il chiosco resta «Corretti»');
  w.ui.newPlayer(); w.advance(200);
  assert.equal(localStorage.getItem(AXES_KEY), 'corretti', 'dopo «Nuovo giocatore» resta «Corretti»');
  K.open(); K.run('axes');
  assert.equal(localStorage.getItem(AXES_KEY), 'oggi');
  assert.equal(voce().textContent, 'Come oggi');
  assert.match($('natpf-toast').textContent, /Come oggi, come sempre/);
});

/* ---------- 1b. revisione (S1): il pannello dello stand con 21 voci non scorre ---------- */
// A 1280 × 720 le 21 voci su cinque colonne facevano una quinta fila e con le righe delle cadute il foglio scorreva (1–22 px);
// tra 801 e 900 px di altezza (1536 × 864, 1600 × 900) su quattro colonne erano sei file (fino a 72 px). Qui la regola:
// sei colonne (foglio più largo) fino a 800 px di altezza, cinque sopra, e le voci che ci stanno in quattro e cinque file.
// L'impaginazione vera è nel browser: tools/e2e/natpf-pannello-cadute.mjs (anche 1536 × 864 e 1600 × 900) e
// natpf-stand-layout.mjs. Una voce in più oltre 24 fa diventare rossa questa prova: rifare quelle due nel browser.
test('B74 revisione: pannello dello stand dai 1000 px di larghezza, 21 voci in quattro file da sei (fino a 800 px di altezza) e cinque da cinque (sopra), nel foglio più largo', () => {
  const css = readFileSync(new URL('../natpf-ui.css', import.meta.url), 'utf8'), html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const griglia = html.slice(html.indexOf('<div class="pause-grid">'), html.indexOf('<div class="staff-touch-status'));
  const voci = (griglia.match(/<button type="button" data-staff="/g) || []).length;
  assert.equal(voci, 21, 'le voci del pannello (con «Assi del giroscopio»)');
  // l'ultima regola per ogni area vince (stesso peso dei selettori): quella in fondo al file
  const ultima = cond => { const i = css.lastIndexOf(`@container natpf (${cond}) {`); assert.ok(i > 0, cond); return css.slice(i, css.indexOf('\n}', i)); };
  const colonne = blocco => +(blocco.match(/\.natpf-sheet\.staff-sheet \.pause-grid \{ grid-template-columns: repeat\((\d+), minmax\(0, 1fr\)\); \}/) || [])[1];
  const larghezza = blocco => +(blocco.match(/\.natpf-sheet-backdrop \.natpf-sheet\.staff-sheet \{ width: min\((\d+)px, calc\(100cqw - 2 \* var\(--gutter\)\)\); \}/) || [])[1];
  const basse = ultima('min-width: 1000px) and (max-height: 800px');
  assert.equal(colonne(basse), 6, '1280 × 720, 1366 × 768, 1366 × 657: sei colonne');
  assert.ok(Math.ceil(voci/colonne(basse)) <= 4, `quattro file (${voci} voci su ${colonne(basse)} colonne)`);
  assert.equal(larghezza(basse), 1500, 'foglio più largo di 1000 px (sei colonne in 1000 px: scritte su tre righe)');
  const alte = ultima('min-width: 1000px) and (min-height: 801px');
  assert.equal(colonne(alte), 5, '1536 × 864, 1600 × 900, 1920 × 1080: cinque colonne');
  assert.ok(Math.ceil(voci/colonne(alte)) <= 5, `cinque file (${voci} voci su ${colonne(alte)} colonne)`);
  assert.equal(larghezza(alte), 1250);
  // dopo le regole del B20 (quattro colonne, 1000 px) e del B51 (quattro tra 701 e 999 px): vincono queste
  const b20 = css.indexOf('@container natpf (min-width: 1000px) {'), b51 = css.lastIndexOf('@container natpf (min-width: 701px) and (max-width: 999px) {');
  assert.ok(b20 > 0 && b51 > b20 && css.lastIndexOf('@container natpf (min-width: 1000px) and (max-height: 800px) {') > b51 && css.lastIndexOf('@container natpf (min-width: 1000px) and (min-height: 801px) {') > b51);
});

/* ---------- 2. al telefono ---------- */
test('B74, al telefono: «Come oggi» → cfg di prima (niente ax); «Corretti» → cfg con ax 1 subito, anche a telefono già collegato; di nuovo «Come oggi» → cfg senza ax', async () => {
  const w = await makeWorld({ controller: 'phone' }), { ui, link } = w, P = ui.phone;
  P._sendGrip(); w.advance(200);                         // (il collegamento: presa e cfg, come all'evento «change» del link vero)
  const cfgs = () => link.sent.filter(m => m.t === 'cfg');
  assert.ok(cfgs().length, 'il cfg del collegamento');
  assert.ok(cfgs().every(m => !('ax' in m)), 'spento: nessun cfg porta ax (telefoni di prima: niente di nuovo)');
  assert.ok(!('ax' in P._cfg()));
  const n = cfgs().length;
  w.advance(500); assert.equal(cfgs().length, n, 'niente cfg in più a interruttore fermo');
  localStorage.setItem(AXES_KEY, 'corretti'); P.update();
  assert.equal(cfgs().length, n + 1, 'acceso: un cfg subito'); assert.equal(cfgs().at(-1).ax, 1);
  // il resto del cfg è quello di sempre
  const { ax, ...resto } = cfgs().at(-1), prima = cfgs().at(-2);
  assert.equal(ax, 1); assert.deepEqual(Object.keys(resto).sort(), Object.keys(prima).sort());
  P.update(); w.advance(300); assert.equal(cfgs().length, n + 1, 'una volta sola');
  localStorage.setItem(AXES_KEY, 'oggi'); P.update();
  assert.equal(cfgs().length, n + 2); assert.ok(!('ax' in cfgs().at(-1)), 'spento di nuovo: cfg senza ax');
});

test('B74, ordine usato dal telefono (dev ax): al cambio tra riordinati e no ripartono centro della mira, salita, piatto e quello imparato dagli scambi di prova', async () => {
  const w = await makeWorld({ controller: 'phone' }), P = w.ui.phone, diag = [];
  P.onDiag((k, d) => { if (k === 'assi') diag.push(d); });
  const resets = [];
  for (const m of ['aimModel', 'riseModel', 'faceModel', 'learner']){ const o = P[m], f = o.reset.bind(o); o.reset = (...a) => { resets.push(m); return f(...a); }; }
  assert.equal(P._axesSeen(undefined), false, 'il primo «dev» (interruttore spento): niente da azzerare'); assert.equal(P.axesApplied, 0);
  assert.equal(P._axesSeen(0), false, 'iPhone con l’interruttore acceso: come prima'); assert.deepEqual(resets, []);
  assert.equal(P._axesSeen(1), true, 'Android riordina: si riparte'); assert.equal(P.axesApplied, 1);
  assert.deepEqual(resets.sort(), ['aimModel', 'faceModel', 'learner', 'riseModel']);
  assert.deepEqual(diag, [{ corretti: true, ruolo: 'p1' }]);
  resets.length = 0; assert.equal(P._axesSeen(1), false); assert.deepEqual(resets, []);
  assert.equal(P._axesSeen(undefined), true, 'di nuovo spento'); assert.deepEqual(diag.at(-1), { corretti: false, ruolo: 'p1' });
});

/* ---------- 3. registro ---------- */
function partitaRegistrata({ on, axes }){
  const storage = storageFinto(), prima = globalThis.localStorage;
  globalThis.localStorage = storageFinto(); if (on) globalThis.localStorage.setItem(AXES_KEY, 'corretti');
  try {
    const E = { phase: 'MENU', autoPlayMode: true, playerRole: 'p1', player: {}, opponent: {}, ball: {}, score: { server: 'player', fair: false }, matchConfig: { difficulty: 'adulto', gamesToWin: 2 }, matchFormat: { id: 'breve' },
      natpfPhone: { connected: true, hand: 'right', device: { ua: SIM_UA.android, ...(axes != null ? { axes } : {}) }, link: { route: { locale: 'host', remoto: 'host' }, transport: 'webrtc' }, state: { rtt: 14 }, onChange(){}, onCal(){}, onSwing(){}, onDropped(){}, onDiag(){}, onState(){} },
      startNewMatch(){ this.autoPlayMode = false; this.phase = 'SERVE'; } };
    const ui = { controller: 'phone', hand: { hand: 'right' }, cue: { enabled: true }, lobby: { visible: false }, events: { nickname: '' } }, coda = codaMemoria();
    const R = new RegistroStand({ engine: E, ui, coda, storage, now: () => 0, wallNow: () => Date.UTC(2026, 10, 20, 10), win: null, raf: () => {}, timers: false });
    E.startNewMatch(); R._partita?.();
    return { R, coda };
  } finally { globalThis.localStorage = prima; }
}
test('B74, registro: la riga «partita» scrive stand.assi e tel.assi solo con l’interruttore acceso; spento, la riga di prima', async () => {
  const leggi = async ({ R, coda }) => { await R.blocco(); const rows = []; for (const b of await coda.elenco()) for (const l of (await coda.leggi(b.id)).trim().split('\n')) if (l) rows.push(JSON.parse(l)); return rows.find(r => r.k === 'partita'); };
  const off = await leggi(partitaRegistrata({ on: false }));
  assert.ok(off, 'riga «partita»'); assert.equal(off.stand.assi, undefined); assert.equal(off.tel.assi, undefined);
  const on = await leggi(partitaRegistrata({ on: true, axes: 1 }));
  assert.equal(on.stand.assi, 'corretti'); assert.equal(on.tel.assi, 'corretti');
  const iphone = await leggi(partitaRegistrata({ on: true, axes: 0 }));
  assert.equal(iphone.tel.assi, 'oggi', 'telefono che ha ricevuto l’interruttore e non riordina (iPhone)');
  const vecchio = await leggi(partitaRegistrata({ on: true }));
  assert.equal(vecchio.stand.assi, 'corretti'); assert.equal(vecchio.tel.assi, undefined, 'pagina del telefono di prima: niente');
  for (const r of [off, on, iphone, vecchio]) assert.deepEqual(F.controllaRiga(r), [], JSON.stringify(r));
  assert.equal(F.REGISTRO.versione, 5); assert.ok(F.CAMPI.includes('assi'));
  // con l'interruttore spento la riga è la stessa di quella acceso, senza il campo
  const { assi: _s, ...standOn } = on.stand, { assi: _t, ...telOn } = on.tel;
  assert.deepEqual(standOn, off.stand); assert.deepEqual(telOn, off.tel);
});

/* ---------- 4. telefono simulato ---------- */
// presa insegnata (foto), calibrazione rapida con il braccio, poi dritti e rovesci con il piatto girato, pallonetti, palle
// corte e tagliati (come scripts/audit/colpi.mjs e la verifica del B74 §4.3)
function partita(opts){
  const p = simPhone({ seed: 11, shape: true, ...opts });
  photoGrip(p);
  p.calibrate({ armGesture: w => armSwing(p, w === 'L' ? STROKES.dritto : STROKES.rovescio) });
  const reads = [];
  const play = (g, n, o = {}) => { for (let i = 0; i < n; i++){ const b = p.msgs.length; armSwing(p, g); p.rest(900, 4); for (const d of p.msgs.slice(b)) reads.push(p.game(d, o).ev.natpf.shot); } };
  for (let i = 0; i < 6; i++){ play(STROKES.dritto, 1); play(STROKES.rovescio, 1); }
  play(STROKES.pallonetto, 4); play(STROKES.corta, 4); play(STROKES.tagliato, 4);
  return { msgs: p.msgs, reads, shots: reads.slice(-12) };
}
test('B74, telefono simulato: rotazione di Chrome + interruttore acceso (Android) = il telefono simulato di sempre, messaggio per messaggio', () => {
  const v0 = partita({}), v2 = partita({ order: 'chrome', fix: true, axes: true });
  assert.ok(v0.msgs.length >= 20, `${v0.msgs.length} colpi`);
  assert.deepEqual(v2.msgs, v0.msgs, 'gli stessi messaggi al computer, numero per numero');
  assert.deepEqual(v2.reads, v0.reads);
  assert.deepEqual(v0.shots.slice(0, 4), ['lob', 'lob', 'lob', 'lob'], `pallonetti: ${v0.shots}`);
});
test('B74, telefono simulato: rotazione di Chrome con l’interruttore spento (il telefono Android di oggi) perde i pallonetti; acceso li ritrova', () => {
  const v0 = partita({}), v1 = partita({ order: 'chrome', fix: true, axes: false }), v1b = partita({ order: 'chrome' });
  assert.deepEqual(v1b.msgs, v1.msgs, 'spento: la pagina del telefono non tocca la rotazione (come prima del B74)');
  const lobs = r => r.shots.slice(0, 4).filter(s => s === 'lob').length, slices = r => r.shots.slice(8).filter(s => s === 'slice').length;
  assert.equal(lobs(v0), 4); assert.equal(slices(v0), 4);
  // (20/11: pallonetti 0 su 4 letti top spin, tagliati 1 su 4; la verifica del B74 §4.3: 0/16 e 5/16)
  assert.ok(lobs(v1) <= 1, `con l’ordine sbagliato i pallonetti si perdono: ${v1.shots.slice(0, 4)}`);
  assert.ok(slices(v1) <= 2, `… e i tagliati: ${v1.shots.slice(8)}`);
  assert.notDeepEqual(v1.msgs, v0.msgs);
});
test('B74, iPhone (Safari, ordine del W3C) con l’interruttore acceso: niente riordino, gli stessi messaggi di oggi', () => {
  assert.equal(rotOrderFor(true, { ua: SIM_UA.iphone }), 'w3c'); assert.equal(rotOrderFor(true, { ua: SIM_UA.android }), 'chrome');
  const oggi = partita({ ios: true, fix: true }), acceso = partita({ ios: true, fix: true, axes: true });
  assert.deepEqual(acceso.msgs, oggi.msgs);
  assert.deepEqual(acceso.reads, oggi.reads);
});
// la prova dello staff sul telefono vero (docs/b74/assi-giroscopio.md §3): telefono dritto come un manico, schermo verso di
// sé, polso girato piano a sinistra e a destra (60 °/s). Il piatto della pagina del telefono (face-tracker, quello che fa
// girare la racchetta a schermo) con la rotazione di Chrome e l'interruttore spento non gira (si inclina un poco); acceso
// gira come il telefono, come nel telefono simulato di sempre
test('B74, prova dello staff simulata: polso girato a destra e a sinistra; spento la racchetta non gira, acceso gira come il telefono', () => {
  const giro = o => { const p = simPhone({ seed: 3, ...o }); p.skip(); const out = []; for (const deg of [45, -90, 45]){ p.pose([0, 1, 0], deg, 60); out.push({ ...p.face.face }); p.rest(300); } return out; };
  const w3c = giro({}), spento = giro({ order: 'chrome' }), acceso = giro({ order: 'chrome', fix: true, axes: true });
  assert.deepEqual(w3c.map(f => Math.round(f.yaw) + 0), [-45, 45, 0]);
  assert.deepEqual(acceso, w3c, 'acceso: lo stesso piatto del telefono simulato di sempre');
  assert.ok(spento.every(f => Math.abs(f.yaw) < 5), `spento: la racchetta non gira (${spento.map(f => f.yaw.toFixed(1))})`);
  assert.ok(spento.some(f => Math.abs(f.pitch) > 15), `… e si inclina (${spento.map(f => f.pitch.toFixed(1))})`);
});
