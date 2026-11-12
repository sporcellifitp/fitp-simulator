// Telecomando dello staff (B27): per ogni schermata del gioco, dove siamo e cosa può fare ogni pulsante del telefono
// (natpf_remote_map.js), e i pezzi dell'interfaccia (pannello dello stand, foglio del telecomando, pagina del telefono nella
// build). La matrice completa, con le prove nel browser, è in docs/b27/telecomando.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { remoteScreen, remoteCommands, navPlan, confirmText, gameRunning, scoreLine, nextCpu, LAYERS } from '../src/natpf/natpf_remote_map.js';
import { phoneFiles, ALLOWED } from '../scripts/natpf-site-plugin.mjs';
import { PAGES } from '../scripts/pacchetto-cloudflare.mjs';
import { REMOTE_COMMANDS } from '@natpf/tennis/remote-pairing.js';

const SITE = new URL('../../site/', import.meta.url).pathname;
const base = { controller: 'phone', phone: { connected: true, ready: true }, cpu: 'pro', fullscreen: { available: true, on: true, gesture: false }, desktop: { displays: 2, label: 'Monitor 2 · 1024×1024 · probabile ledwall' } };
const lobby = (step, mode = 'cpu', extra = {}) => ({ ...base, lobby: { visible: true, step, mode }, ...extra });
const field = extra => ({ ...base, lobby: { visible: false, step: 'warmup', mode: 'cpu' }, inField: true, ...extra });
// tutte le schermate della matrice (docs/b27/telecomando.md), con la fotografia che il gioco ne fa
const MATRIX = {
  intro: { ...lobby('menu'), intro: true },
  'menu principale': lobby('menu'), modalità: lobby('mode'), racchetta: lobby('controller'), collega: lobby('connect'),
  'collega pronto': lobby('connect', 'cpu', { connectReady: true }), 'pronto per la partita': lobby('match'),
  opzioni: lobby('options'), minigiochi: lobby('challenges'), classifica: lobby('ranking'), 'risultato minigioco': lobby('result', 'challenge'),
  'stesso schermo: telefoni': lobby('connect', 'split'), 'stesso schermo: tutorial': { ...lobby('connect', 'split'), lobby: { visible: true, step: 'connect', mode: 'split', splitTutorial: true } },
  'sfida tra due computer (lobby)': lobby('match', 'friend'),
  'pannello dello stand': { ...lobby('menu'), staff: true }, 'pannello del telecomando': { ...lobby('menu'), remote: true },
  'finestra del certificato': { ...lobby('connect'), dialog: true }, 'nome del giocatore': { ...lobby('match'), nick: true },
  diagnostica: { ...lobby('menu'), diag: true }, 'calibrazione dello schermo': { ...lobby('options'), calibra: true },
  guida: { ...lobby('menu'), guide: true }, 'tutorial gioco singolo': field({ tutorial: true, training: { active: true, cal: true } }),
  'rivedi i gesti': { ...lobby('match'), tutorial: true, tutorialReview: true },
  lezione: field({ training: { active: true, lesson: true, mode: 'training' } }), 'calibrazione del telefono': field({ training: { active: true, cal: true } }),
  riscaldamento: field({ training: { active: true } }), allenamento: field({ training: { active: true, mode: 'training' } }),
  partita: field({}), 'partita stesso schermo': field({ split: true }), 'sfida 1v1 in campo': field({ versus: true }),
  minigioco: field({ minigame: 'Bersagli' }), pausa: field({ pause: true }), 'pausa del minigioco': field({ pause: true, minigame: 'Bersagli' }),
  'telefono scollegato in partita': field({ hold: true }), 'pannello del telefono': field({ phonePanel: true }),
  'fine partita': { ...base, lobby: { visible: false }, victory: true }, 'player 2 dell\'invito': { ...base, guest: true },
  'pannello dello stand in partita': field({ staff: true }),
};

test('ogni schermata ha un nome per il telefono e da ognuna si va avanti o si torna al menu senza toccare il PC', () => {
  for (const [name, s] of Object.entries(MATRIX)){
    const screen = remoteScreen(s), { cmds } = remoteCommands(s, screen);
    assert.ok(screen.label && screen.label !== 'Gioco', `${name}: nome della pagina (${screen.id})`);
    for (const c of REMOTE_COMMANDS) assert.ok(cmds[c] === 1 || (typeof cmds[c] === 'string' && cmds[c].length > 3), `${name}: «${c}» acceso o spento con il motivo`);
    // avanti: OK o Gioca; indietro: Indietro o Torna al menu (nell'intro OK porta al menu)
    const forward = cmds.ok === 1 || cmds.play === 1 || cmds.skip === 1;
    const back = cmds.menu === 1 || cmds.back === 1 || screen.id === 'lobby:menu' || screen.id === 'intro';
    assert.ok(forward || screen.nav === 'field', `${name}: si va avanti (${screen.id})`);
    assert.ok(back, `${name}: si torna indietro o al menu (${screen.id})`);
    assert.equal(cmds.newplayer === 1 || screen.id === 'intro', true, `${name}: «Nuovo giocatore» sempre (tranne l'intro)`);
    assert.equal(cmds.staff === 1 || screen.id === 'intro', true, `${name}: pannello dell'addetto sempre (tranne l'intro)`);
  }
});

test('in campo il telecomando non muove il giocatore e non tira colpi: frecce e OK spenti, Indietro = pausa', () => {
  for (const name of ['partita', 'partita stesso schermo', 'sfida 1v1 in campo', 'minigioco', 'riscaldamento', 'allenamento', 'calibrazione del telefono']){
    const s = MATRIX[name], screen = remoteScreen(s), { cmds, labels } = remoteCommands(s, screen);
    assert.equal(screen.nav, 'field', name);
    for (const c of ['up', 'down', 'left', 'right', 'ok']){ assert.equal(navPlan(screen, c).kind, 'blocked', `${name}: ${c}`); assert.equal(typeof cmds[c], 'string'); }
    assert.deepEqual(navPlan(screen, 'back'), { kind: 'pause' }, name);
    assert.equal(cmds.pause, 1); assert.equal(labels.pause, 'Pausa');
    assert.equal(typeof cmds.cpu, 'string', `${name}: la CPU non cambia a metà partita`);
    assert.ok(gameRunning(screen));
    assert.match(confirmText('menu', screen), /chiude/); assert.match(confirmText('newplayer', screen), /azzera/);
  }
  // la lezione (presa e posizione) si sfoglia con frecce e OK come da tastiera
  const lesson = remoteScreen(MATRIX.lezione);
  assert.equal(lesson.nav, 'keys'); assert.deepEqual(navPlan(lesson, 'right'), { kind: 'key', code: 'ArrowRight' });
});

test('menu, guida, tutorial e calibrazione dello schermo: gli stessi tasti della tastiera; finestre: fuoco tra i pulsanti', () => {
  const keys = ['menu principale', 'modalità', 'racchetta', 'collega', 'pronto per la partita', 'opzioni', 'minigiochi', 'classifica', 'risultato minigioco', 'stesso schermo: tutorial', 'guida', 'tutorial gioco singolo', 'calibrazione dello schermo', 'intro'];
  for (const name of keys){
    const screen = remoteScreen(MATRIX[name]);
    assert.equal(screen.nav, 'keys', name);
    assert.deepEqual([navPlan(screen, 'up'), navPlan(screen, 'ok'), navPlan(screen, 'back')], [{ kind: 'key', code: 'ArrowUp' }, { kind: 'key', code: 'Enter' }, { kind: 'key', code: 'Escape' }], name);
  }
  for (const name of ['pannello dello stand', 'pannello del telecomando', 'finestra del certificato', 'nome del giocatore', 'diagnostica', 'pausa', 'telefono scollegato in partita', 'pannello del telefono', 'fine partita', 'player 2 dell\'invito']){
    const screen = remoteScreen(MATRIX[name]);
    assert.equal(screen.nav, 'focus', name);
    assert.deepEqual([navPlan(screen, 'left'), navPlan(screen, 'ok'), navPlan(screen, 'back')], [{ kind: 'focus', dir: 'ArrowLeft' }, { kind: 'press' }, { kind: 'back' }], name);
  }
  // strato più in alto: il pannello dello stand sopra la partita, con la partita sotto (Menu chiede conferma)
  const staff = remoteScreen(MATRIX['pannello dello stand in partita']);
  assert.deepEqual([staff.id, staff.under], ['staff', 'match']);
  assert.ok(confirmText('menu', staff));
  assert.equal(confirmText('menu', remoteScreen(MATRIX['pannello dello stand'])), null, 'dal menu niente conferma');
  assert.equal(LAYERS[0], 'intro');
});

test('pulsanti diretti: Gioca, Pausa, livello CPU, schermo, schermo intero, Salta, ricalibra, rivedi i gesti', () => {
  const cmdsOf = s => remoteCommands(s, remoteScreen(s));
  assert.deepEqual([cmdsOf(MATRIX['menu principale']).labels.play, cmdsOf(MATRIX['pronto per la partita']).labels.play, cmdsOf(MATRIX['fine partita']).labels.play], ['Gioca', 'Gioca!', 'Gioca ancora']);
  assert.match(cmdsOf(MATRIX.collega).cmds.play, /non è ancora collegato/);
  assert.equal(cmdsOf(MATRIX['collega pronto']).cmds.play, 1);
  assert.match(cmdsOf(MATRIX['stesso schermo: telefoni']).cmds.play, /due telefoni/);
  assert.equal(cmdsOf(MATRIX.partita).cmds.play, 'La partita è già in corso');
  assert.equal(cmdsOf(MATRIX['menu principale']).cmds.menu, 'Sei già al menu principale');
  assert.deepEqual([cmdsOf(MATRIX.pausa).labels.pause, cmdsOf(MATRIX.pausa).cmds.pause], ['Riprendi', 1]);
  assert.match(cmdsOf(MATRIX['menu principale']).cmds.pause, /solo in campo/);
  // CPU: Facile → Esperta → Leggenda → Facile; non nello stesso schermo né nella sfida tra due computer
  assert.deepEqual([nextCpu('casual'), nextCpu('pro'), nextCpu('leggenda'), nextCpu(undefined)], ['pro', 'leggenda', 'casual', 'casual']);
  assert.equal(cmdsOf(MATRIX['menu principale']).labels.cpu, 'CPU: Esperta');
  assert.match(cmdsOf(MATRIX['stesso schermo: telefoni']).cmds.cpu, /Non c’è la CPU/);
  assert.match(cmdsOf(MATRIX['sfida tra due computer (lobby)']).cmds.cpu, /Non c’è la CPU/);
  assert.equal(cmdsOf(MATRIX['fine partita']).cmds.cpu, 1, 'a fine partita sì (vale dalla prossima)');
  // schermo del gioco: solo nel programma Windows e con due monitor
  assert.equal(cmdsOf(MATRIX['menu principale']).cmds.screen, 1);
  assert.equal(cmdsOf({ ...MATRIX['menu principale'], desktop: null }).cmds.screen, 'Solo nel programma Windows');
  assert.equal(cmdsOf({ ...MATRIX['menu principale'], desktop: { displays: 1 } }).cmds.screen, 'C’è un solo monitor collegato');
  assert.match(cmdsOf({ ...MATRIX['menu principale'], fullscreen: { available: true, gesture: true } }).cmds.fullscreen, /tasto sul computer/);
  assert.equal(cmdsOf(MATRIX['menu principale']).labels.fullscreen, 'Schermo intero: sì');
  // Salta: dove c'è (intro, riscaldamento, nome)
  assert.equal(cmdsOf({ ...MATRIX.riscaldamento, skip: 'Salta il riscaldamento' }).cmds.skip, 1);
  assert.equal(cmdsOf({ ...MATRIX.riscaldamento, skip: 'Salta il riscaldamento' }).labels.skip, 'Salta il riscaldamento');
  assert.match(cmdsOf(MATRIX.partita).cmds.skip, /niente da saltare/);
  // telefono del giocatore
  assert.equal(cmdsOf(MATRIX.partita).cmds.recal, 1);
  assert.match(cmdsOf({ ...MATRIX.partita, phone: { connected: false } }).cmds.recal, /non collegato/);
  assert.match(cmdsOf({ ...MATRIX.partita, controller: 'webcam' }).cmds.recal, /non usa il telefono/);
  assert.equal(cmdsOf({ ...MATRIX['pronto per la partita'], canReview: true }).cmds.gestures, 1);
  assert.match(cmdsOf(MATRIX.partita).cmds.gestures, /Pausa/);
});

test('riga del punteggio per il telefono', () => {
  assert.equal(scoreLine({ playerPoints: 2, opponentPoints: 1, playerGames: 1, opponentGames: 0 }), 'Tu 1 · CPU 0 (game) · 30-15');
  assert.equal(scoreLine({ playerPoints: 3, opponentPoints: 3, playerGames: 0, opponentGames: 0 }), 'Tu 0 · CPU 0 (game) · Parità');
  assert.equal(scoreLine({ playerPoints: 5, opponentPoints: 4, playerGames: 2, opponentGames: 2 }, { names: ['P1', 'P2'] }), 'P1 2 · P2 2 (game) · Vantaggio P1');
  assert.equal(scoreLine(null), '');
});

test('pannello dello stand e pagina del telefono: voci del telecomando, foglio con il QR, file nella build e nel pacchetto', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const staff = html.slice(html.indexOf('id="natpf-staff"'), html.indexOf('id="natpf-remote"'));
  const grid = staff.slice(staff.indexOf('pause-grid'), staff.indexOf('staff-note'));
  assert.ok(!/data-staff="(remote|display)"/.test(grid), 'non nella griglia: il foglio resta di tre file');
  assert.match(staff, /class="sheet-actions staff-actions"><button[^>]*data-staff="remote"/);
  assert.match(staff, /data-staff="display"/);
  assert.match(html, /id="natpf-remote"[\s\S]*id="remote-qr"[\s\S]*id="remote-code"[\s\S]*data-remote="forget"[\s\S]*data-remote="close"/);
  const kiosk = fs.readFileSync(new URL('../src/natpf/natpf_kiosk.js', import.meta.url), 'utf8');
  assert.match(kiosk, /cmd === 'remote'/); assert.match(kiosk, /cmd === 'display'/);
  const files = phoneFiles(SITE);
  for (const f of ['tennis/telecomando.html', 'js/tennis/telecomando.js', 'js/tennis/remote-pairing.js', 'tennis/telecomando.webmanifest', 'tennis/telecomando-192.png', 'tennis/telecomando-512.png']){
    assert.ok(files.includes(f), `nella build: ${f}`);
    assert.ok(ALLOWED.test(f), `servito sotto /natpf/: ${f}`);
  }
  assert.ok(!ALLOWED.test('tennis/telecomando.js') && !ALLOWED.test('tennis/altro.html'));
  assert.ok(PAGES.includes('/natpf/tennis/telecomando.html'));
  const manifest = JSON.parse(fs.readFileSync(new URL('tennis/telecomando.webmanifest', `file://${SITE}`), 'utf8'));
  assert.equal(manifest.display, 'standalone'); assert.equal(manifest.name, 'NATPF Telecomando');
  assert.deepEqual(manifest.icons.map(i => i.sizes), ['192x192', '512x512']);
  const page = fs.readFileSync(new URL('tennis/telecomando.html', `file://${SITE}`), 'utf8');
  for (const c of REMOTE_COMMANDS) assert.match(page, new RegExp(`data-c="${c}"`), `pulsante ${c} sulla pagina del telefono`);
  assert.match(page, /rel="manifest" href="telecomando\.webmanifest"/);
  // la pagina del telefono non manda mai sensori né colpi
  const js = fs.readFileSync(new URL('js/tennis/telecomando.js', `file://${SITE}`), 'utf8');
  assert.ok(!/devicemotion|deviceorientation|t: 'sw'|sendMotion/.test(js));
});
