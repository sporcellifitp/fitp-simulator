// B39 · Stand con il solo mouse: funzioni pure del programma Windows (menu del tasto destro, comandi, pagine e download
// consentiti, porta occupata) e i collegamenti in main.mjs. Electron e Windows non servono qui.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DESKTOP, COMMANDS, PAGE_COMMANDS, SEPARATOR, commandItem, displayItems, staffMenu, appMenu, menuCommands, contextMenuMode, navigationAllowed,
  safeFileName, uniqueName, downloadTarget, downloadAllowed, busyPort, netstatListener, tasklistImage, startupProblem, isOwnUrl } from '../src/desktop-core.mjs';

const main = fs.readFileSync(new URL('../src/main.mjs', import.meta.url), 'utf8');
const d = (id, w, h, x = 0) => ({ id, bounds: { x, y: 0, width: w, height: h }, scaleFactor: 1 });
const labels = items => items.map(i => (i.type === 'separator' ? '—' : i.label));
const find = (items, label) => items.find(i => i.label === label);

test('elenco dei comandi: nomi italiani, azione per ogni comando in main.mjs, comandi della pagina dall\'elenco congelato', () => {
  assert.ok(Object.isFrozen(COMMANDS) && Object.isFrozen(PAGE_COMMANDS));
  for (const [id, c] of Object.entries(COMMANDS)){
    assert.ok(Object.isFrozen(c), id);
    assert.ok(c.label && !/\b(Quit|Exit|Reload|Restart|Settings|Open)\b/.test(c.label), `${id}: nome italiano`);
    // ogni comando ha la sua azione in ACTIONS (main.mjs)
    assert.match(main, new RegExp(`\\n  (?:'${id}'|${id.replace(/-/g, '_')}): (?:\\(\\)|arg|id) =>`), `azione per ${id}`);
    if (c.page) assert.ok(PAGE_COMMANDS.includes(c.page), `${id}: comando della pagina nell'elenco`);
  }
  assert.deepEqual([...PAGE_COMMANDS].sort(), Object.values(COMMANDS).filter(c => c.page).map(c => c.page).sort(), 'ogni comando della pagina ha la sua voce');
  assert.throws(() => commandItem('formatta-il-disco'), /comando sconosciuto/);
  assert.deepEqual(commandItem('ricarica'), { cmd: 'ricarica', label: 'Ricarica il gioco', accel: 'CmdOrCtrl+R' });
});

test('menu del tasto destro sul gioco: pannello, diagnostica, calibrazione, schermo, ricarica, rete, programma; riavvia ed esci con conferma', () => {
  const items = staffMenu({ gamePage: true, fullscreen: true, displays: [d(1, 1920, 1080), d(2, 1024, 1024, 1920)], currentId: 2, primaryId: 1, version: '2026-11-14.2' });
  assert.deepEqual(labels(items), ['Pannello dello stand', 'Diagnostica', '—', 'Calibra lo schermo…', 'Azzera la calibrazione dello schermo', '—', 'Schermo intero', 'Schermo del gioco', '—',
    'Ricarica il gioco', 'Rete per i telefoni', 'Programma', '—', 'Riavvia il programma', 'Esci']);
  // il pannello dal tasto destro si apre (F9 apre e chiude)
  assert.equal(items[0].cmd, 'pannello-stand'); assert.equal(items[0].arg, 'open'); assert.equal(items[0].accel, 'F9');
  const fsItem = find(items, 'Schermo intero'); assert.equal(fsItem.type, 'checkbox'); assert.equal(fsItem.checked, true);
  assert.equal(staffMenu({ fullscreen: false }).find(i => i.cmd === 'schermo-intero').checked, false);
  // monitor: uno per riga, quello del gioco spuntato, poi «Monitor successivo»
  const mon = find(items, 'Schermo del gioco').submenu;
  assert.deepEqual(mon.filter(i => i.cmd === 'monitor').map(i => [i.arg, i.checked, i.type]), [[1, false, 'radio'], [2, true, 'radio']]);
  assert.match(mon[0].label, /^Monitor 1 · 1920×1080 \(principale\)$/);
  assert.equal(mon.at(-1).cmd, 'monitor-successivo'); assert.notEqual(mon.at(-1).enabled, false);
  assert.equal(displayItems([d(1, 1920, 1080)], { currentId: 1 }).at(-1).enabled, false, 'un solo monitor: «Monitor successivo» spento');
  // rete e programma
  assert.deepEqual(find(items, 'Rete per i telefoni').submenu.map(i => i.cmd), ['rete-apri', 'rete-indirizzi']);
  const prog = find(items, 'Programma').submenu;
  assert.deepEqual(prog.filter(i => i.cmd).map(i => i.cmd), ['aggiornamenti', 'cartella-salvati', 'cartella-dati', 'scheda-grafica']);
  assert.deepEqual(prog.at(-1), { label: 'Versione 2026-11-14.2', enabled: false });
  // «Riavvia» ed «Esci» mai al primo livello: un sottomenu di conferma che si apre accanto al puntatore
  assert.ok(!items.some(i => i.cmd === 'esci' || i.cmd === 'riavvia'), 'esci e riavvia non partono con un clic solo');
  assert.deepEqual(find(items, 'Esci').submenu, [{ cmd: 'esci', label: 'Sì, chiudi NATPF Simulator', accel: 'CmdOrCtrl+Q' }]);
  assert.deepEqual(find(items, 'Riavvia il programma').submenu, [{ cmd: 'riavvia', label: 'Sì, riavvia adesso' }]);
  // ogni voce ha un nome o è un separatore; ogni comando esiste
  const all = items.flatMap(i => [i, ...(i.submenu || [])]);
  for (const i of all) assert.ok(i === SEPARATOR || i.type === 'separator' || i.label, JSON.stringify(i));
  for (const c of menuCommands(items)) assert.ok(COMMANDS[c], c);
});

test('menu del tasto destro sulla pagina di avvio e in un campo di testo', () => {
  // pagina «Avvio del gioco…» (porta occupata, firewall): niente comandi della pagina, ma esci, riavvia, rete e programma
  const boot = staffMenu({ gamePage: false, displays: [d(1, 1920, 1080)], currentId: 1 });
  const cmds = menuCommands(boot);
  for (const c of [...PAGE_COMMANDS, 'pannello-stand', 'ricarica']) assert.ok(!cmds.includes(c), `${c} non sulla pagina di avvio`);
  for (const c of ['esci', 'riavvia', 'rete-apri', 'rete-indirizzi', 'cartella-dati', 'schermo-intero']) assert.ok(cmds.includes(c), c);
  // campo di testo: Taglia, Copia, Incolla in cima, poi i comandi
  const edit = staffMenu({ editable: true });
  assert.deepEqual(edit.slice(0, 4).map(i => i.role || i.type), ['cut', 'copy', 'paste', 'separator']);
  assert.deepEqual(edit.slice(0, 3).map(i => i.label), ['Taglia', 'Copia', 'Incolla']);
  assert.ok(!staffMenu({ editable: false }).some(i => i.role));
});

test('barra del menu (Alt, in finestra): le voci di sempre dallo stesso elenco, più diagnostica e calibrazione', () => {
  const bar = appMenu({ displays: [d(1, 1920, 1080)], currentId: 1, primaryId: 1, version: 'x' });
  assert.deepEqual(bar.map(m => m.label), ['NATPF', 'Schermo', 'Rete', 'Aiuto']);
  assert.deepEqual(bar[0].submenu.filter(i => i.cmd).map(i => i.cmd), ['schermo-intero', 'ricarica', 'pannello-stand', 'diagnostica', 'esci']);
  assert.equal(bar[0].submenu.find(i => i.cmd === 'esci').accel, 'CmdOrCtrl+Q');
  for (const c of ['monitor', 'monitor-successivo', 'calibra', 'azzera-calibrazione', 'rete-apri', 'rete-indirizzi', 'aggiornamenti', 'cartella-dati', 'cartella-salvati', 'scheda-grafica', 'strumenti']) assert.ok(menuCommands(bar).includes(c), c);
  // le scorciatoie hanno la stessa scritta nei due menu
  const accel = id => menuCommands(bar).includes(id) && [...bar.flatMap(m => m.submenu)].find(i => i.cmd === id)?.accel;
  assert.equal(accel('schermo-intero'), 'F11'); assert.equal(accel('ricarica'), 'CmdOrCtrl+R'); assert.equal(accel('monitor-successivo'), 'CmdOrCtrl+Shift+M'); assert.equal(accel('strumenti'), 'CmdOrCtrl+Shift+I');
  // main.mjs: le due barre vengono dalle stesse funzioni; il menu del tasto destro si apre al puntatore, solo sulle pagine giuste
  assert.match(main, /electronMenu\(appMenu\(/);
  assert.match(main, /win\.webContents\.on\('context-menu', \(_e, params\) => showContextMenu\(params\)\)/);
  assert.match(main, /const mode = contextMenuMode\(win\.webContents\.getURL\(\), addresses, \{ loading: loadingShown \}\);\n  if \(!mode\) return;/);
  assert.match(main, /\.popup\(\{ window: win \}\)/, 'senza x e y: dove c\'è il puntatore');
  assert.match(main, /if \(context\) out\.registerAccelerator = false;/, 'nel menu del tasto destro le scorciatoie sono solo scritte');
});

test('tasto destro e navigazione: solo le pagine del proprio server (porta del gioco, https)', () => {
  const ips = ['192.168.1.20'];
  assert.equal(contextMenuMode('https://localhost:8443/?lan=1', ips), 'gioco');
  assert.equal(contextMenuMode('https://192.168.1.20:8443/', ips), 'gioco');
  assert.equal(contextMenuMode('http://192.168.1.20:8081/', ips), null, 'la pagina del certificato non è il gioco');
  assert.equal(contextMenuMode('https://example.com/', ips), null);
  assert.equal(contextMenuMode('data:text/html,ciao', ips), null, 'una pagina data: qualunque no');
  assert.equal(contextMenuMode('data:text/html,avvio', ips, { loading: true }), 'avvio', 'la pagina di avvio del programma sì');
  assert.equal(contextMenuMode('file:///C:/x.html', ips, { loading: true }), null);
  assert.ok(navigationAllowed('https://localhost:8443/?lan=1&room=AT-1234', ips));
  assert.ok(navigationAllowed('https://192.168.1.20:8443/', ips));
  for (const bad of ['http://localhost:8443/', 'https://localhost:8081/', 'file:///C:/Users/x/Desktop/foto.jpg', 'https://example.com/', 'https://192.168.1.21:8443/', 'javascript:alert(1)', 'data:text/html,x', '', null])
    assert.ok(!navigationAllowed(bad, ips), String(bad));
  // collegamenti in main.mjs: niente finestre nuove, navigazione controllata, cronologia svuotata (tasto «indietro» del mouse)
  assert.match(main, /setWindowOpenHandler\(\(\{ url \}\) => \{[^\n]*return \{ action: 'deny' \}; \}\)/);
  assert.match(main, /'will-navigate', \(event, url\) => \{ if \(!navigationAllowed\(url, addresses\)\)\{ event\.preventDefault\(\);/);
  assert.match(main, /'did-navigate'[^\n]*\n[^\n]*isOwnUrl\(url, addresses\)[^\n]*navigationHistory\.clear\(\)/);
});

test('file salvati dal gioco: solo un nome (mai un percorso), caratteri vietati tolti, nessuna sovrascrittura', () => {
  assert.equal(safeFileName('classifica-natpf-2026-11-14.csv'), 'classifica-natpf-2026-11-14.csv');
  assert.equal(safeFileName('../../Windows/System32/x.dll'), 'x.dll');
  assert.equal(safeFileName('..\\..\\autoexec.bat'), 'autoexec.bat');
  assert.equal(safeFileName('a<b>c:d"e|f?g*h.zip'), 'abcdefgh.zip');
  assert.equal(safeFileName('riga\nnuova.csv'), 'riganuova.csv');
  assert.equal(safeFileName('CON.txt'), '_CON.txt'); assert.equal(safeFileName('lpt1'), '_lpt1');
  assert.equal(safeFileName('  .nascosto.  '), 'nascosto');
  assert.equal(safeFileName(''), 'file-natpf'); assert.equal(safeFileName(null), 'file-natpf'); assert.equal(safeFileName('...'), 'file-natpf');
  assert.ok(safeFileName('x'.repeat(500) + '.csv').length <= 120 && safeFileName('x'.repeat(500) + '.csv').endsWith('.csv'));
  const taken = new Set(['classifica.csv', 'classifica (2).csv']);
  assert.equal(uniqueName('classifica.csv', n => taken.has(n)), 'classifica (3).csv');
  assert.equal(uniqueName('nuovo.zip', n => taken.has(n)), 'nuovo.zip');
  const dir = path.join('C:', 'Utenti', 'stand', 'Download', 'NATPF');
  assert.equal(downloadTarget(dir, '../classifica.csv', p => p === path.join(dir, 'classifica.csv')), path.join(dir, 'classifica (2).csv'));
  // solo dalla pagina del gioco: blob: del proprio server
  const ips = ['192.168.1.20'];
  assert.ok(downloadAllowed('blob:https://localhost:8443/3f2a-11', ips));
  assert.ok(downloadAllowed('https://localhost:8443/file.csv', ips));
  for (const bad of ['blob:https://example.com/1', 'https://example.com/x.exe', 'http://localhost:8081/rootCA.pem', 'data:text/csv,x', 'file:///C:/x', ''])
    assert.ok(!downloadAllowed(bad, ips), bad);
  // collegamento in main.mjs: percorso scelto dal programma, senza «Salva con nome»
  assert.match(main, /session\.defaultSession\.on\('will-download', onWillDownload\)/);
  assert.match(main, /wc !== win\.webContents \|\| !downloadAllowed\(url, addresses\)/);
  assert.match(main, /item\.setSavePath\(file\)/);
  assert.equal(DESKTOP.downloadsFolder, 'NATPF');
});

test('porta occupata: numero della porta dall\'errore, chi la tiene (netstat, tasklist), testo italiano con «Riprova»', () => {
  assert.equal(busyPort('listen EADDRINUSE: address already in use 0.0.0.0:8443'), 8443);
  assert.equal(busyPort('Il server HTTPS non si avvia: listen EADDRINUSE: address already in use 0.0.0.0:8443. Controlla che la porta 8443 sia libera.'), 8443);
  assert.equal(busyPort('listen EADDRINUSE: address already in use :::8081'), 8081);
  assert.equal(busyPort('listen EADDRINUSE: address already in use 127.0.0.1:8080'), 8080);
  assert.equal(busyPort('ENOENT: no such file'), null); assert.equal(busyPort(''), null); assert.equal(busyPort(undefined), null);
  const netstat = `
Connessioni attive

  Proto  Indirizzo locale       Indirizzo esterno      Stato           PID
  TCP    0.0.0.0:135            0.0.0.0:0              IN ASCOLTO      1012
  TCP    0.0.0.0:18443          0.0.0.0:0              IN ASCOLTO      77
  TCP    127.0.0.1:52000        127.0.0.1:8443         ESTABLISHED     900
  TCP    0.0.0.0:8443           0.0.0.0:0              IN ASCOLTO      4321
  TCP    [::]:8081              [::]:0                 LISTENING       5555
  UDP    0.0.0.0:8443           *:*                                    66
`;
  assert.equal(netstatListener(netstat, 8443), 4321, 'la riga in ascolto, non la connessione verso la 8443 né la 18443');
  assert.equal(netstatListener(netstat, 8081), 5555, 'anche IPv6');
  assert.equal(netstatListener(netstat, 9999), null); assert.equal(netstatListener('', 8443), null);
  assert.equal(tasklistImage('"node.exe","4321","Console","1","45.000 K"\r\n'), 'node.exe');
  assert.equal(tasklistImage('INFORMAZIONI: nessuna attività in esecuzione corrispondente ai criteri specificati.'), null);
  const p = startupProblem('listen EADDRINUSE: address already in use 0.0.0.0:8443', { port: 8443, owner: { pid: 4321, name: 'node.exe' } });
  assert.equal(p.busy, true); assert.equal(p.message, 'La porta 8443 è già in uso da «node.exe» (PID 4321).');
  assert.match(p.detail, /porta 8443 per il gioco e i telefoni[^]*«Riprova»[^]*riavvia il computer/);
  assert.match(startupProblem('x', { port: 8081 }).detail, /pagina del certificato/);
  assert.equal(startupProblem('x', { port: 8443 }).message, 'La porta 8443 è già in uso da un altro programma.');
  const other = startupProblem('certificato non leggibile', { logPath: 'C:\\NATPF\\log\\programma.log' });
  assert.equal(other.busy, false); assert.match(other.detail, /certificato non leggibile[^]*Registro: C:\\NATPF/);
  // main.mjs: finestra con «Riprova» e «Chiudi il programma», server chiusi prima di riprovare; la 8080 non serve più
  assert.match(main, /buttons: \['Riprova', 'Chiudi il programma'\]/);
  assert.match(main, /if \(!lan\.game\)\{ const s = lan\.status\(\); await stopServers\(\);/);
  assert.equal(DESKTOP.setupPort, 0, 'pagina dell\'avvio guidato su una porta scelta dal sistema');
  assert.match(main, /process\.on\('uncaughtException'/);
});

test('tempi: firewall, gioco bloccato; monitor ricordato quando si trascina la finestra', () => {
  assert.equal(DESKTOP.firewallAskMs, 60000);
  assert.ok(DESKTOP.hangDialogMs >= 5000 && DESKTOP.hangReloadMs > DESKTOP.hangDialogMs);
  assert.match(main, /signal: ctrl\.signal,\n\s*message: 'I telefoni devono poter raggiungere questo computer\.'/);
  assert.match(main, /win\.on\('unresponsive', onUnresponsive\);\n  win\.on\('responsive', onResponsive\);/);
  assert.match(main, /buttons: \['Ricarica il gioco', 'Aspetta', 'Chiudi il programma'\]/);
  assert.match(main, /function onResponsive\(\)\{\n  clearTimeout\(hangTimer\); hangTimer = null;\n  if \(hang\)\{ hang\.back = true; hang\.ctrl\.abort\(\); \}/, 'la finestra si chiude da sola quando il gioco risponde');
  assert.match(main, /win\.on\('moved', \(\) => \{[^]*?settings\.displayId = d\.id;[^]*?writeSettings\(DATA, settings\)/);
  // «Esci» non tocca la scelta dello schermo intero
  assert.match(main, /esci: \(\) => \{ log\('uscita \(comando\)'\); app\.quit\(\); \}/);
  assert.ok(isOwnUrl('https://localhost:8443/'));
});
