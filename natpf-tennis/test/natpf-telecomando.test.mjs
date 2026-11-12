// Telecomando dello staff (B27): per ogni schermata del gioco, dove siamo e cosa può fare ogni pulsante del telefono
// (natpf_remote_map.js), e i pezzi dell'interfaccia (pannello dello stand, foglio del telecomando, pagina del telefono nella
// build). La matrice completa, con le prove nel browser, è in docs/b27/telecomando.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { remoteScreen, remoteCommands, navPlan, confirmText, gameRunning, scoreLine, nextCpu, CPU_LEVELS, LAYERS } from '../src/natpf/natpf_remote_map.js';
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
  // B28: scambi di prova (calibrazione giocando), anche nella sfida tra due computer (aperti con il menu ancora sotto)
  'scambi di prova': field({ trial: true, skip: 'Salta gli scambi di prova', calMode: 'play' }),
  'scambi di prova stesso schermo': field({ trial: true, split: true, skip: 'Salta gli scambi di prova', calMode: 'play' }),
  'scambi di prova nella sfida': { ...lobby('connect', 'friend'), trial: true, skip: 'Salta gli scambi di prova', calMode: 'play' },
  'pausa negli scambi di prova': field({ trial: true, pause: true, calMode: 'play' }),
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
  for (const name of ['partita', 'partita stesso schermo', 'sfida 1v1 in campo', 'minigioco', 'riscaldamento', 'allenamento', 'calibrazione del telefono', 'scambi di prova', 'scambi di prova stesso schermo', 'scambi di prova nella sfida']){
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
    // (↑ ↓ nel tutorial no: revisione, prova sotto)
    assert.deepEqual([navPlan(screen, 'left'), navPlan(screen, 'ok'), navPlan(screen, 'back')], [{ kind: 'key', code: 'ArrowLeft' }, { kind: 'key', code: 'Enter' }, { kind: 'key', code: 'Escape' }], name);
    if (screen.id !== 'tutorial') assert.deepEqual(navPlan(screen, 'up'), { kind: 'key', code: 'ArrowUp' }, name);
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
  assert.deepEqual([nextCpu('casual'), nextCpu('pro'), nextCpu('leggenda'), nextCpu(undefined)], ['evento', 'leggenda', 'bambini', 'pro']);
  assert.equal(cmdsOf(MATRIX['menu principale']).labels.cpu, 'CPU: Esperta');
  // dal 2026-11-12.4: «Chi gioca» (Bambino · Ragazzo · Adulto) più Esperta e Leggenda, cinque livelli in ordine
  assert.equal(cmdsOf({ ...MATRIX['menu principale'], cpu: 'evento' }).labels.cpu, 'Chi gioca: Adulto');
  assert.equal(cmdsOf({ ...MATRIX['menu principale'], cpu: 'evento' }).hints.cpu, 'poi CPU Esperta');
  assert.equal(cmdsOf({ ...MATRIX['menu principale'], cpu: 'bambini' }).labels.cpu, 'Chi gioca: Bambino');
  assert.equal(cmdsOf({ ...MATRIX['menu principale'], cpu: 'leggenda' }).hints.cpu, 'poi Bambino');
  assert.equal(cmdsOf({ ...MATRIX['menu principale'], cpu: 'sconosciuto' }).labels.cpu, 'Chi gioca: Adulto');
  assert.deepEqual([...CPU_LEVELS], ['bambini', 'casual', 'evento', 'pro', 'leggenda']);
  { let l = 'bambini'; const seen = []; for (let i = 0; i < 5; i++){ seen.push(l); l = nextCpu(l); } assert.equal(l, 'bambini'); assert.equal(new Set(seen).size, 5); }
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

// B28 insieme al B27: gli scambi di prova sono «in campo» (frecce e OK spenti, Indietro = pausa); «Salta» li salta e,
// dove ci sono, preme «Avanti ›» dell'allenamento e «Salta la calibrazione»; «Ricalibra il telefono» fa quello che fa
// «Ricalibra» del pannello (in partita con «Giocando»: scambi di prova, anche nello stesso schermo)
test('B28: scambi di prova dal telecomando (pagina, Salta, Ricalibra) e «Avanti ›» dell\'allenamento', async () => {
  const cmdsOf = s => remoteCommands(s, remoteScreen(s));
  for (const name of ['scambi di prova', 'scambi di prova stesso schermo', 'scambi di prova nella sfida']){
    const s = MATRIX[name], screen = remoteScreen(s), { cmds, labels } = cmdsOf(s);
    assert.deepEqual([screen.id, screen.label, screen.nav], ['trial', 'Scambi di prova', 'field'], name);
    assert.match(navPlan(screen, 'ok').why, /Scambi di prova.*Salta/);
    assert.deepEqual([cmds.skip, labels.skip], [1, 'Salta gli scambi di prova'], name);
    assert.match(cmds.recal, /stanno già calibrando/, name); assert.equal(cmds.play, 'La partita è già in corso');
  }
  const paused = remoteScreen(MATRIX['pausa negli scambi di prova']);
  assert.deepEqual([paused.id, paused.under], ['pause', 'trial']); assert.ok(gameRunning(paused));
  assert.match(cmdsOf(MATRIX['pausa negli scambi di prova']).cmds.recal, /stanno già calibrando/);
  // Ricalibra: in partita con «Giocando» → scambi di prova (anche nello stesso schermo); con i gesti nello stesso schermo no
  const play = { ...MATRIX.partita, calMode: 'play', recalTrial: true };
  assert.deepEqual([cmdsOf(play).cmds.recal, cmdsOf(play).hints.recal], [1, 'scambi di prova, poi si rigioca il punto']);
  assert.equal(cmdsOf({ ...MATRIX['partita stesso schermo'], calMode: 'play', recalTrial: true }).cmds.recal, 1);
  assert.match(cmdsOf({ ...MATRIX['partita stesso schermo'], calMode: 'gesti' }).cmds.recal, /Racchette/);
  assert.equal(cmdsOf({ ...MATRIX['pronto per la partita'], calMode: 'gesti' }).hints.recal, 'rifà i gesti');
  assert.match(cmdsOf({ ...MATRIX['pronto per la partita'], calMode: 'play' }).hints.recal, /impara dai prossimi scambi/);
  // la fotografia e i comandi veri (natpf_remote.js): nomi dei pulsanti che il gioco ha davvero
  const remote = fs.readFileSync(new URL('../src/natpf/natpf_remote.js', import.meta.url), 'utf8');
  assert.match(remote, /trial \? \(ui\.pause\?\.isOpen \? null : 'Salta gli scambi di prova'\)/);
  assert.match(remote, /if \(ui\.trial\?\.active\)\{ ui\.trial\.skip\(\);/);
  assert.match(remote, /visible\(\$\('coach-next'\)\)\)\{ \$\('coach-next'\)\.click\(\);/);
  assert.match(remote, /visible\(\$\('natpf-phone-skip'\)\)\)\{ \$\('natpf-phone-skip'\)\.click\(\);/);
  assert.match(remote, /if \(ui\.recalibrate\(\)\) return \{ ok: true, msg: 'Scambi di prova: poi si rigioca il punto' \}/);
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const id of ['coach-next', 'coach-exit', 'natpf-phone-skip', 'trial-skip']) assert.match(html, new RegExp(`id="${id}"`), id);
});

// Revisione del B27 (12/11): pausa aperta sopra «telefono scollegato», ↑ ↓ con «Rivedi i gesti» o la lezione in campo,
// conferma inutile a fine partita, menu nascosto senza partita
test('revisione: la pausa vince su «telefono scollegato»; ↑ ↓ spente nel tutorial e nella lezione; fine partita senza conferma', () => {
  const both = remoteScreen(field({ hold: true, pause: true }));
  assert.deepEqual([both.id, both.nav], ['pause', 'focus']);
  assert.deepEqual(navPlan(both, 'back'), { kind: 'back' });
  assert.equal(remoteCommands(field({ hold: true, pause: true }), both).labels.pause, 'Riprendi');
  assert.ok(LAYERS.indexOf('pause') < LAYERS.indexOf('hold'));
  // «Rivedi i gesti» in campo (riscaldamento, servizio) e tutorial prima della calibrazione: ↑ lancerebbe la palla
  for (const s of [field({ tutorial: true, tutorialReview: true, training: { active: true } }), MATRIX['tutorial gioco singolo'], MATRIX['rivedi i gesti'], MATRIX.lezione]){
    const screen = remoteScreen(s), { cmds } = remoteCommands(s, screen);
    for (const c of ['up', 'down']){ assert.equal(navPlan(screen, c).kind, 'blocked', `${screen.id}: ${c}`); assert.match(cmds[c], /← e →/); }
    assert.deepEqual([navPlan(screen, 'left'), navPlan(screen, 'right'), navPlan(screen, 'ok'), navPlan(screen, 'back')],
      [{ kind: 'key', code: 'ArrowLeft' }, { kind: 'key', code: 'ArrowRight' }, { kind: 'key', code: 'Enter' }, { kind: 'key', code: 'Escape' }]);
  }
  // fine partita, anche se il motore è ancora «in campo»: la partita è finita, Menu e Nuovo giocatore senza conferma
  const end = remoteScreen({ ...base, lobby: { visible: false }, inField: true, victory: true });
  assert.deepEqual([end.id, gameRunning(end), confirmText('menu', end), confirmText('newplayer', end)], ['victory', false, null, null]);
  // menu nascosto e nessuna partita (passaggio al campo, dimostrazione): i tasti non vanno al motore
  const other = remoteScreen({ ...base, lobby: { visible: false } });
  assert.deepEqual([other.id, other.nav, navPlan(other, 'up').kind, navPlan(other, 'ok').kind], ['other', 'field', 'blocked', 'blocked']);
});

// Il telecomando non apre finestre di Windows (confirm, salvataggi), non segue link e non preme «Conferma» dell'abbinamento
test('revisione: controlli che il telecomando salta (finestre di Windows, link, «Conferma»); nessun confirm() nuovo senza dirlo', async () => {
  const { NO_REMOTE } = await import('../src/natpf/natpf_remote.js');
  for (const sel of ['[data-staff="reset"]', '[data-staff="export"]', '[data-diag="del"]', '[data-diag="save"]', '[data-remote="confirm"]', '[data-no-remote]', 'a', '[target="_blank"]', '[href]']) assert.ok(NO_REMOTE.split(',').map(x => x.trim()).includes(sel), sel);
  // ogni confirm() del gioco è di un controllo dell'elenco: chi ne aggiunge uno lo aggiunge anche a NO_REMOTE
  const dir = new URL('../src/natpf/', import.meta.url);
  const native = fs.readdirSync(dir).filter(f => f.endsWith('.js')).flatMap(f => [...fs.readFileSync(new URL(f, dir), 'utf8').matchAll(/(?<![\w.])(confirm|alert|prompt)\(\s*['"`]/g)].map(() => f)).sort();
  assert.deepEqual(native, ['natpf_diag.js', 'natpf_kiosk.js'], 'finestre native: solo «Elimina» della diagnostica e «Azzera oggi» (saltati dal telecomando)');
  const remote = fs.readFileSync(new URL('../src/natpf/natpf_remote.js', import.meta.url), 'utf8');
  assert.ok(!/(?<![\w.])confirm\(\s*['"`]/.test(remote), '«Scollega» senza finestra di Windows');
  assert.match(remote, /cmd === 'confirm'\)\{ if \(e\.isTrusted && this\.link\.confirm\(\)\)/, '«Conferma» solo con un clic o un tasto veri');
  assert.match(remote, /out = plan \? this\._nav\(screen, plan\) : await this\._direct\(c, s, screen\)/, 'i comandi diretti si aspettano: l\'errore arriva al telefono');
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const sheet = html.slice(html.indexOf('id="natpf-remote"'), html.indexOf('<!-- passaggio dal menu al campo -->'));
  assert.ok(!/<a\b|target="_blank"/.test(sheet), 'nel foglio del telecomando nessun link');
  assert.match(sheet, /data-remote="confirm" data-no-remote/);
  for (const v of ['pair', 'request', 'paired', 'closed']) assert.match(sheet, new RegExp(`data-remote-view="${v}"`));
  assert.match(sheet, /data-remote="new"[^>]*>Abbina un altro telefono</);
  assert.match(sheet, /Un telefono chiede di diventare il telecomando · numero/);
  const prep = fs.readFileSync(new URL('../lan/prepare.mjs', import.meta.url), 'utf8');
  for (const f of ['telecomando.html', 'telecomando.webmanifest', 'telecomando-192.png', 'telecomando-512.png']) assert.ok(prep.includes(`../site/tennis/${f}`), `build vecchia se cambia ${f}`);
});

test('revisione: «Conferma» dell\'abbinamento solo da un clic vero sul computer; OK del telecomando rifiutato; «Scollega» in due passi', async () => {
  const { makeWorld, $, mkEvent } = await import('./ui-world.mjs');
  const w = await makeWorld({ controller: 'mouse' });
  const R = w.ui.remote, sheet = $('natpf-remote');
  let confirmed = 0, refused = 0, forgot = 0;
  R.link.confirm = () => { confirmed++; return true; }; R.link.refuse = () => { refused++; return true; }; R.link.forget = () => { forgot++; };
  const fire = (cmd, extra) => { const btn = { dataset: { remote: cmd }, textContent: '' }; const ev = mkEvent('click', { closest: () => btn }, extra); for (const l of sheet.ls.click) l.fn(ev); return btn; };
  // clic fatto dal codice (el.click() del telecomando o di uno script): isTrusted falso o assente → niente
  fire('confirm', { isTrusted: false }); fire('confirm', {});
  assert.equal(confirmed, 0);
  fire('confirm', { isTrusted: true });
  assert.equal(confirmed, 1);
  fire('refuse', { isTrusted: false }); assert.equal(refused, 1, '«Rifiuta» può farlo anche il telecomando in carica');
  // OK del telecomando con il fuoco su «Conferma» (lasciato lì da un clic sul computer): rifiutato, e le frecce non ci arrivano
  sheet.contains = () => true;
  const focused = { matches: sel => sel.includes('[data-remote="confirm"]'), click(){ confirmed += 100; } };
  document.activeElement = focused;
  const out = R._nav({ id: 'remote', nav: 'focus' }, { kind: 'press' });
  assert.deepEqual([out.ok, confirmed], [false, 1]); assert.match(out.msg, /dal computer/);
  document.activeElement = undefined;
  // «Scollega»: il primo clic arma, il secondo scollega (niente confirm() di Windows)
  sheet._q.set('[data-remote="forget"]', { dataset: { remote: 'forget' }, textContent: 'Scollega il telecomando', classList: { toggle(){} } });
  const b = sheet.querySelector('[data-remote="forget"]');
  const press = () => { const ev = mkEvent('click', { closest: () => b }, { isTrusted: true }); for (const l of sheet.ls.click) l.fn(ev); };
  press(); assert.deepEqual([forgot, b.dataset.armed], [0, '1']); assert.match(b.textContent, /ancora/);
  press(); assert.deepEqual([forgot, b.dataset.armed], [1, '']);
  // comando diretto che va in errore: il telefono riceve l'esito con il motivo (prima niente)
  const acks = [];
  R.snapshot = () => ({ controller: 'mouse', phone: {}, lobby: { visible: true, step: 'menu', mode: 'cpu' }, desktop: { displays: 2, label: 'x' }, fullscreen: {} });
  globalThis.natpfDesktop = { displays: { next: async () => { throw new Error('monitor sparito'); } } };
  await R._onCmd({ c: 'screen', y: false, reply: m => acks.push(m) });
  delete globalThis.natpfDesktop;
  assert.equal(acks.length, 1); assert.equal(acks[0].ok, false); assert.match(acks[0].msg, /Comando non riuscito: monitor sparito/);
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
  assert.match(html, /id="natpf-remote"[\s\S]*id="remote-qr"[\s\S]*id="remote-code"[\s\S]*id="remote-num"[\s\S]*data-remote="forget"[\s\S]*data-remote="close"/);
  const kiosk = fs.readFileSync(new URL('../src/natpf/natpf_kiosk.js', import.meta.url), 'utf8');
  assert.match(kiosk, /cmd === 'remote'/); assert.match(kiosk, /cmd === 'display'/);
  const files = phoneFiles(SITE);
  for (const f of ['tennis/telecomando.html', 'js/tennis/telecomando.js', 'js/tennis/remote-pairing.js', 'js/tennis/remote-client.js', 'tennis/telecomando.webmanifest', 'tennis/telecomando-192.png', 'tennis/telecomando-512.png']){
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
