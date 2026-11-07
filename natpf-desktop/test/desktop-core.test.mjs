// Programma Windows (natpf-desktop): funzioni pure del processo principale. Electron e Windows non servono qui.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { DESKTOP, UPDATE_ACTIONS, chooseDisplay, nextDisplay, displayLabel, isOwnUrl, samePem, firewallCommand, elevatedPowershellArgs, ruleCoversExe, readSettings, writeSettings, windowsVersion, readBuild,
  windowedBounds, needsRefit, displayToFollow, shortcutFor, fullscreenTarget, initialWanted, placeMode } from '../src/desktop-core.mjs';

const d = (id, w, h, x = 0) => ({ id, bounds: { x, y: 0, width: w, height: h }, scaleFactor: 1 });

test('monitor del gioco: quello salvato, altrimenti il più grande esterno (ledwall), altrimenti il principale', () => {
  const laptop = d(1, 1920, 1080), ledwall = d(2, 3840, 2160, 1920), small = d(3, 1280, 720, 5760);
  assert.equal(chooseDisplay([laptop, ledwall, small], { primaryId: 1 }).id, 2, 'ledwall come monitor esteso');
  assert.equal(chooseDisplay([laptop, ledwall], { primaryId: 1, savedId: 1 }).id, 1, 'scelta salvata');
  assert.equal(chooseDisplay([laptop, ledwall], { primaryId: 1, savedId: 99 }).id, 2, 'monitor salvato scollegato');
  assert.equal(chooseDisplay([laptop], { primaryId: 1 }).id, 1, 'un solo monitor');
  assert.equal(chooseDisplay([], {}), null);
  assert.equal(nextDisplay([laptop, ledwall], 2).id, 1); assert.equal(nextDisplay([laptop, ledwall], 1).id, 2);
  assert.equal(nextDisplay([laptop, ledwall, small], 3).id, 1);
  assert.equal(nextDisplay([laptop], 1), null, 'un solo monitor: Ctrl+Maiusc+M non fa niente');
  assert.equal(nextDisplay([laptop, ledwall], 99).id, 1, 'monitor attuale sconosciuto: il primo');
  assert.equal(nextDisplay([], 1), null);
  assert.match(displayLabel(laptop, 0, 1), /Monitor 1 · 1920×1080 \(principale\)/);
  assert.match(displayLabel({ ...ledwall, scaleFactor: 1.5, bounds: { ...ledwall.bounds, width: 2560, height: 1440 } }, 1, 1), /3840×2160.*scala 150%/);
});

test('certificato: fiducia solo per i propri indirizzi e porte, e solo per lo stesso certificato', () => {
  assert.ok(isOwnUrl('https://localhost:8443/?lan=1'));
  assert.ok(isOwnUrl('https://192.168.1.20:8443/', ['192.168.1.20']));
  assert.ok(isOwnUrl('http://192.168.1.20:8081/', ['192.168.1.20']));
  assert.ok(!isOwnUrl('https://192.168.1.21:8443/', ['192.168.1.20']), 'altro computer');
  assert.ok(!isOwnUrl('https://localhost:443/'), 'altra porta');
  assert.ok(!isOwnUrl('https://example.com:8443/'), 'altro sito');
  assert.ok(!isOwnUrl('non un indirizzo'));
  const pem = '-----BEGIN CERTIFICATE-----\nMIIBAAAA\nBBBB\n-----END CERTIFICATE-----\n';
  assert.ok(samePem(pem, pem.replace(/\n/g, '\r\n')));
  assert.ok(!samePem(pem, pem.replace('BBBB', 'CCCC')));
  assert.ok(!samePem('', ''));
});

test('firewall: regola per l\'eseguibile, solo rete locale, con il permesso di Windows', () => {
  const exe = 'C:\\Program Files\\NATPF Simulator\\NATPF Simulator.exe';
  const cmd = firewallCommand(exe);
  assert.match(cmd, /delete rule name="NATPF Simulator" &/);
  assert.match(cmd, /delete rule name=all program="C:\\Program Files\\NATPF Simulator\\NATPF Simulator.exe" &/, 'via anche le regole di blocco create da Windows');
  assert.ok(cmd.indexOf('delete rule name=all') < cmd.indexOf('add rule'));
  assert.match(cmd, /add rule name="NATPF Simulator" dir=in action=allow program="C:\\Program Files\\NATPF Simulator\\NATPF Simulator.exe" enable=yes profile=any remoteip=localsubnet/);
  assert.match(firewallCommand(exe, 'NATPF Simulator portatile'), /name="NATPF Simulator portatile"/);
  assert.throws(() => firewallCommand('C:\\a"b.exe'));
  const args = elevatedPowershellArgs(cmd);
  assert.equal(args.at(-2), '-Command'); assert.match(args.at(-1), /-Verb RunAs -Wait/);
  const en = `Rule Name:                            NATPF Simulator\n----\nEnabled:                              Yes\nDirection:                            In\nProgram:                              ${exe}\n`;
  const it = `Nome regola:                          NATPF Simulator\n----\nAbilitato:                            Sì\nProgramma:                            ${exe}\n`;
  assert.ok(ruleCoversExe(en, exe)); assert.ok(ruleCoversExe(it, exe));
  assert.ok(!ruleCoversExe(en, 'C:\\Altro\\NATPF Simulator.exe'), 'regola per un altro percorso');
  assert.ok(!ruleCoversExe(en.replace('Yes', 'No'), exe), 'regola disattivata');
  assert.ok(!ruleCoversExe('Nessuna regola corrisponde ai criteri specificati.', exe));
});

test('impostazioni salvate nella cartella dei dati; versione di Windows dalla versione del gioco', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'natpf-desktop-test-'));
  assert.deepEqual(readSettings(dir), {});
  assert.ok(writeSettings(dir, { displayId: 2, fullscreen: false }));
  assert.deepEqual(readSettings(dir), { displayId: 2, fullscreen: false });
  assert.ok(fs.existsSync(path.join(dir, DESKTOP.settingsFile)));
  assert.equal(windowsVersion('2026-11-04.5'), '2026.1104.5');
  assert.equal(windowsVersion('2027-01-09.12'), '2027.109.12');
  assert.throws(() => windowsVersion('prova'));
  assert.equal(readBuild("export const NATPF_BUILD = '2026-11-04.5';"), '2026-11-04.5');
});

test('installazione coerente con il programma: nome della regola, porte; un solo eseguibile (niente portatile)', () => {
  const read = f => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
  const setup = read('build/installatore.nsi'), main = read('src/main.mjs'), costruisci = read('scripts/costruisci.mjs');
  assert.match(setup, new RegExp(`!define REGOLA "${DESKTOP.ruleName}"`), 'l\'installazione crea la regola che il programma controlla');
  assert.match(setup, /add rule name="\$\{REGOLA\}" dir=in action=allow program="\$INSTDIR\\\$\{EXE\}" enable=yes profile=any remoteip=localsubnet/);
  assert.match(setup, /delete rule name=all program="\$INSTDIR\\\$\{EXE\}"[\s\S]*add rule name=/, 'via le regole di blocco prima di consentire');
  assert.match(setup, /Section "Uninstall"[\s\S]*delete rule name="\$\{REGOLA\}"[\s\S]*delete rule name=all program=/, 'la disinstallazione toglie le regole');
  assert.match(setup, /WriteUninstaller/); assert.match(setup, /RequestExecutionLevel admin/);
  assert.match(setup, /!define EXE "NATPF Simulator\.exe"/);
  assert.match(setup, new RegExp(`!define DISINST "${DESKTOP.uninstaller}"`), 'il programma riconosce l\'installazione dalla disinstallazione accanto');
  // portatile tolto (richiesta del 07/11/2026): un solo eseguibile
  assert.ok(!fs.existsSync(new URL('../build/portatile.nsi', import.meta.url)), 'build/portatile.nsi tolto');
  assert.ok(!/PORTABLE_EXECUTABLE_DIR|portatile\.nsi|Portatile-/.test(main + costruisci), 'niente portatile nel programma e nella costruzione');
  assert.match(costruisci, /\[\['installatore\.nsi', `NATPF-Simulator-Setup-\$\{build\}\.exe`\]\]/);
});

test('installer: aggiorna sopra senza chiedere, /S /AGGIORNA dal gioco aspetta la chiusura e riapre il gioco', () => {
  const setup = fs.readFileSync(new URL('../build/installatore.nsi', import.meta.url), 'utf8');
  // parametro dell'aggiornamento dal gioco
  assert.match(setup, /\$\{GetOptions\} \$R0 "\/AGGIORNA" \$R1\s+\$\{IfNot\} \$\{Errors\}\s+StrCpy \$AGGIORNA 1/);
  // aggiornamento: stessa cartella della precedente, pagina della cartella saltata
  assert.match(setup, /ReadRegStr \$0 HKLM "\$\{CHIAVE\}" "InstallLocation"[\s\S]*StrCpy \$INSTDIR \$0[\s\S]*StrCpy \$PRECEDENTE \$0/);
  assert.match(setup, /!define MUI_PAGE_CUSTOMFUNCTION_PRE SaltaCartella\s+!insertmacro MUI_PAGE_DIRECTORY/);
  assert.match(setup, /Function SaltaCartella\s+\$\{If\} \$PRECEDENTE != ""\s+Abort/);
  // il programma si chiude da solo: attesa (30 × 500 ms) prima di chiuderlo, poi la chiusura di sempre (/SD IDOK)
  assert.match(setup, /\$\{AndIf\} \$AGGIORNA == 1[\s\S]*\$\{Do\}[\s\S]*Sleep 500[\s\S]*\$\{OrIf\} \$2 >= 30[\s\S]*\$\{Loop\}[\s\S]*taskkill/);
  assert.match(setup, /MessageBox MB_OKCANCEL\|MB_ICONEXCLAMATION "NATPF Simulator è aperto[^\n]*\/SD IDOK/);
  // alla fine riapre il gioco senza i permessi dell'installer (Esplora risorse), solo nell'aggiornamento dal gioco
  assert.match(setup, /Function \.onInstSuccess\s+\$\{If\} \$AGGIORNA == 1\s+Call Avvia/);
  assert.match(setup, /Function Avvia\s+Exec '"\$WINDIR\\explorer\.exe" "\$INSTDIR\\\$\{EXE\}"'/);
  // i dati dell'utente (impostazioni, certificati, aggiornamenti scaricati) non si toccano
  assert.ok(!/LOCALAPPDATA/.test(setup.replace(/^;.*$/gm, '').replace(/MUI_FINISHPAGE_TEXT[^\n]*/, '')), 'nessuna operazione su %LOCALAPPDATA%');
});

test('finestra di partenza e di ritorno: al centro dell\'area utile, al massimo 1280×720, tutta dentro il monitor', () => {
  const ledwall = { id: 2, bounds: { x: 1920, y: 0, width: 1920, height: 1080 }, workArea: { x: 1920, y: 0, width: 1920, height: 1040 }, scaleFactor: 1 };
  assert.deepEqual(windowedBounds(ledwall), { x: 2240, y: 160, width: 1280, height: 720 });
  // monitor a sinistra del principale (coordinate negative), senza workArea: si usa bounds
  assert.deepEqual(windowedBounds({ bounds: { x: -1920, y: -200, width: 1920, height: 1080 } }), { x: -1600, y: -20, width: 1280, height: 720 });
  // monitor piccolo: 90% dell'area utile, sempre dentro
  const small = windowedBounds({ bounds: { x: 0, y: 0, width: 1024, height: 600 }, workArea: { x: 0, y: 0, width: 1024, height: 560 } });
  assert.deepEqual(small, { x: 51, y: 28, width: 921, height: 504 });
  // scala 150%: coordinate in punti (DIP) di Electron, sempre intere
  const scaled = windowedBounds({ bounds: { x: 1280, y: 0, width: 1707, height: 960 }, workArea: { x: 1280, y: 0, width: 1707, height: 912 }, scaleFactor: 1.5 });
  for (const v of Object.values(scaled)) assert.ok(Number.isInteger(v), JSON.stringify(scaled));
  assert.ok(scaled.x >= 1280 && scaled.x + scaled.width <= 1280 + 1707 && scaled.y >= 0 && scaled.y + scaled.height <= 912, JSON.stringify(scaled));
  // workArea non valida → bounds; niente monitor → null
  assert.deepEqual(windowedBounds({ bounds: { x: 0, y: 0, width: 3840, height: 2160 }, workArea: { x: 0, y: 0, width: 0, height: 0 } }), { x: 1280, y: 720, width: 1280, height: 720 });
  assert.equal(windowedBounds(null), null);
  assert.equal(windowedBounds({}), null);
});

test('schermo intero da riadattare solo se non copre più il monitor (tolleranza 2 px)', () => {
  const fhd = { x: 1920, y: 0, width: 1920, height: 1080 };
  assert.equal(needsRefit({ ...fhd }, fhd), false);
  assert.equal(needsRefit({ ...fhd, height: 1079 }, fhd), false, 'il pixel che Chromium toglie con un\'altra finestra attiva');
  assert.equal(needsRefit({ ...fhd, width: 1921 }, fhd), false, 'arrotondamento delle scale non intere');
  assert.equal(needsRefit(fhd, { x: 1920, y: 0, width: 1280, height: 720 }), true, 'risoluzione cambiata');
  assert.equal(needsRefit(fhd, { x: 2560, y: 0, width: 1920, height: 1080 }), true, 'monitor spostato nella disposizione');
  assert.equal(needsRefit(null, fhd), false);
});

test('monitor ricollegato: si torna solo su quello voluto, se il gioco non c\'è già', () => {
  const ledwall = { id: 7 }, other = { id: 9 };
  // monitor voluto all'avvio: quello salvato anche se manca (ledwall acceso dopo il programma), poi quello scelto
  assert.equal(initialWanted({ displayId: 7 }, { id: 1 }), 7, 'ledwall salvato e spento: resta il voluto');
  assert.equal(initialWanted({ displayId: 1 }, { id: 1 }), 1);
  assert.equal(initialWanted({ displayId: 0 }, { id: 1 }), 0, 'id 0 è un id');
  assert.equal(initialWanted({}, { id: 1 }), 1, 'niente di salvato: quello scelto');
  assert.equal(initialWanted({ fullscreen: false }, null), null);
  assert.equal(initialWanted(undefined, { id: 3 }), 3);
  // il ledwall salvato (7) compare dopo l'avvio sul portatile (1): il gioco ci va
  assert.equal(displayToFollow(ledwall, { wantedId: initialWanted({ displayId: 7 }, { id: 1 }), currentId: 1 }), ledwall);
  assert.equal(displayToFollow(ledwall, { wantedId: 7, currentId: 1 }), ledwall);
  assert.equal(displayToFollow(ledwall, { wantedId: '7', currentId: 1 }), ledwall, 'id salvato come testo');
  assert.equal(displayToFollow(other, { wantedId: 7, currentId: 1 }), null, 'un altro monitor non sposta il gioco');
  assert.equal(displayToFollow(ledwall, { wantedId: 7, currentId: 7 }), null, 'già lì');
  assert.equal(displayToFollow(ledwall, { wantedId: null, currentId: 1 }), null);
  assert.equal(displayToFollow(null, { wantedId: 7 }), null);
});

test('schermo intero su un monitor: fermo se è già lì e lo copre, rettangolo sullo stesso monitor, giro solo se serve', () => {
  const fhd = { x: 0, y: 0, width: 1920, height: 1080 };
  assert.equal(placeMode({ currentId: 1, targetId: 1, bounds: { ...fhd }, displayBounds: fhd }), 'fermo', 'menu sul monitor già scelto');
  assert.equal(placeMode({ currentId: 1, targetId: '1', bounds: { ...fhd, height: 1079 }, displayBounds: fhd }), 'fermo', 'pixel di Chromium, id come testo');
  const smaller = { x: 0, y: 0, width: 1280, height: 720 };
  assert.equal(placeMode({ currentId: 1, targetId: 1, bounds: fhd, displayBounds: smaller }), 'rettangolo', 'risoluzione cambiata: niente finestra trasparente');
  assert.equal(placeMode({ currentId: 1, targetId: 1, bounds: fhd, displayBounds: smaller, inPlaceTried: true }), 'giro', 'il rettangolo non è bastato');
  assert.equal(placeMode({ currentId: 1, targetId: 2, bounds: fhd, displayBounds: { ...fhd, x: 1920 } }), 'giro', 'altro monitor');
  assert.equal(placeMode({ currentId: null, targetId: 2, bounds: fhd, displayBounds: fhd }), 'giro');
  assert.equal(placeMode(), 'giro');
});

test('scorciatoie del programma: F11, Ctrl+Maiusc+M, Ctrl+R, Ctrl+Q, Ctrl+Maiusc+I; mai Esc, lettere o AltGr', () => {
  const down = (key, mods = {}) => ({ type: 'keyDown', key, isAutoRepeat: false, control: false, shift: false, alt: false, meta: false, ...mods });
  const table = [
    [down('F11'), 'schermo-intero'],
    [down('F11', { shift: true }), 'schermo-intero'],
    [down('M', { control: true, shift: true }), 'monitor-successivo'],
    [down('m', { control: true, shift: true }), 'monitor-successivo'],
    [down('r', { control: true }), 'ricarica'],
    [down('q', { control: true }), 'esci'],
    [down('I', { control: true, shift: true }), 'strumenti'],
    // la pagina li riceve
    [down('Escape'), null],
    [down('f'), null], [down('F'), null], [down('F', { shift: true }), null], [down('m'), null], [down('r'), null], [down('Enter'), null],
    [down('Alt', { alt: true }), null],
    [down('F11', { control: true }), null], [down('F11', { alt: true }), null],
    [down('r', { control: true, shift: true }), null],
    [down('m', { control: true }), null],
    [down('r', { control: true, alt: true }), null], // AltGr
    [down('q', { meta: true }), null],
    [{ ...down('F11'), type: 'keyUp' }, null],
    [{ ...down('F11'), isAutoRepeat: true }, null],
    [null, null], [{}, null],
  ];
  for (const [input, expected] of table) assert.equal(shortcutFor(input), expected, JSON.stringify(input));
  // le azioni sono quelle del menu (id delle voci in main.mjs)
  const main = fs.readFileSync(new URL('../src/main.mjs', import.meta.url), 'utf8');
  for (const id of ['schermo-intero', 'monitor-successivo', 'ricarica', 'esci', 'strumenti']) assert.match(main, new RegExp(`id: '${id}'`), id);
});

test('richieste della pagina sullo schermo intero', () => {
  assert.equal(fullscreenTarget('get', true), true); assert.equal(fullscreenTarget('get', false), false);
  assert.equal(fullscreenTarget('on', false), true); assert.equal(fullscreenTarget('off', true), false);
  assert.equal(fullscreenTarget('toggle', true), false); assert.equal(fullscreenTarget('toggle', false), true);
  for (const bad of ['', 'chiudi', undefined, null, 1, true]) assert.equal(fullscreenTarget(bad, true), null, String(bad));
});

test('preload: window.natpfDesktop come da contratto, canali uguali al processo principale', async () => {
  const code = fs.readFileSync(new URL('../src/preload.cjs', import.meta.url), 'utf8');
  const exposed = {}, invoked = [], listeners = {}, removed = [];
  const electron = {
    contextBridge: { exposeInMainWorld: (name, api) => { exposed[name] = api; } },
    ipcRenderer: {
      invoke: (channel, action) => { invoked.push([channel, action]); return Promise.resolve(action === 'off' ? false : true); },
      on: (channel, fn) => { (listeners[channel] ||= []).push(fn); },
      removeListener: (channel, fn) => { removed.push([channel, fn]); },
    },
  };
  const require = m => { if (m !== 'electron') throw new Error(`modulo non disponibile nella sandbox: ${m}`); return electron; };
  vm.runInNewContext(code, { require, console });
  const api = exposed.natpfDesktop;
  assert.ok(api, 'natpfDesktop esposto');
  assert.deepEqual(Object.keys(api).sort(), ['isFullScreen', 'onFullScreenChange', 'setFullScreen', 'shell', 'toggleFullScreen', 'updates', 'version']);
  assert.equal(api.shell, 'electron'); assert.equal(api.version, 2);
  assert.equal(await api.isFullScreen(), true);
  assert.equal(await api.setFullScreen(false), false);
  await api.setFullScreen(true); await api.toggleFullScreen();
  assert.deepEqual(invoked, [[DESKTOP.ipcFullscreen, 'get'], [DESKTOP.ipcFullscreen, 'off'], [DESKTOP.ipcFullscreen, 'on'], [DESKTOP.ipcFullscreen, 'toggle']]);
  const seen = [];
  api.onFullScreenChange(on => seen.push(on));
  api.onFullScreenChange('non una funzione');
  assert.equal(listeners[DESKTOP.ipcFullscreenChanged].length, 1);
  listeners[DESKTOP.ipcFullscreenChanged][0]({ sender: 'evento di Electron' }, false);
  listeners[DESKTOP.ipcFullscreenChanged][0]({}, 1);
  assert.deepEqual(seen, [false, true], 'alla pagina solo true/false, mai l\'evento');
  // aggiornamenti (07/11/2026): state, check, download, install, onChange con la funzione che toglie l'ascolto
  assert.deepEqual(Object.keys(api.updates).sort(), ['check', 'download', 'install', 'onChange', 'state']);
  invoked.length = 0;
  for (const a of UPDATE_ACTIONS) await api.updates[a]();
  assert.deepEqual(invoked, UPDATE_ACTIONS.map(a => [DESKTOP.ipcUpdates, a]));
  const states = [];
  const off = api.updates.onChange(s => states.push(s));
  assert.equal(typeof off, 'function');
  assert.equal(typeof api.updates.onChange('non una funzione'), 'function', 'anche senza funzione risponde con una funzione');
  assert.equal(listeners[DESKTOP.ipcUpdatesChanged].length, 1);
  const s1 = { status: 'downloading', current: '2026-11-07.3', latest: '2026-11-08.1', progress: 0.5 };
  listeners[DESKTOP.ipcUpdatesChanged][0]({ sender: 'evento di Electron' }, s1);
  // (la copia nasce nel contesto del preload: si confronta il contenuto)
  assert.equal(JSON.stringify(states), JSON.stringify([s1])); assert.notEqual(states[0], s1, 'una copia');
  off();
  assert.deepEqual(removed, [[DESKTOP.ipcUpdatesChanged, listeners[DESKTOP.ipcUpdatesChanged][0]]], 'ascolto tolto');
  // il programma usa il preload e lo copia in app/; la richiesta passa dal controllo dei propri indirizzi
  const main = fs.readFileSync(new URL('../src/main.mjs', import.meta.url), 'utf8');
  const prepara = fs.readFileSync(new URL('../scripts/prepara.mjs', import.meta.url), 'utf8');
  assert.match(main, /preload: path\.join\(ROOT, DESKTOP\.preload\)/);
  assert.match(main, /contextIsolation: true, sandbox: true/);
  assert.match(main, /ipcMain\.handle\(DESKTOP\.ipcFullscreen,[^\n]*\n[^\n]*isOwnUrl\(event\.senderFrame\?\.url/);
  assert.match(main, /webContents\.send\(DESKTOP\.ipcFullscreenChanged/);
  assert.match(main, /ipcMain\.handle\(DESKTOP\.ipcUpdates,[^\n]*\n[^\n]*isOwnUrl\(event\.senderFrame\?\.url[^\n]*\n[^\n]*UPDATE_ACTIONS\.includes\(action\)/, 'aggiornamenti solo dalle pagine del gioco');
  assert.match(main, /isOwnUrl\(win\.webContents\.getURL\(\), addresses\)\) win\.webContents\.send\(DESKTOP\.ipcUpdatesChanged/);
  for (const k of ['ipcFullscreen', 'ipcFullscreenChanged', 'ipcUpdates', 'ipcUpdatesChanged']) assert.ok(code.includes(`'${DESKTOP[k]}'`), `canale ${k} uguale nel preload`);
  assert.match(main, /'fullscreen'/, 'permesso dello schermo intero ancora consentito');
  assert.match(prepara, /'main\.mjs', 'desktop-core\.mjs', 'aggiornamenti\.mjs', DESKTOP\.preload/);
  assert.match(prepara, /UPDATES\.config/, 'aggiornamenti.json nel pacchetto');
  assert.equal(DESKTOP.preload, 'preload.cjs');
});

test('finestra senza cornici: nasce a schermo intero, cornice normale, niente kiosk, Alt non mostra il menu', () => {
  const main = fs.readFileSync(new URL('../src/main.mjs', import.meta.url), 'utf8');
  assert.match(main, /fullscreen: settings\.fullscreen !== false, show: false/);
  assert.match(main, /\.\.\.\(windowedBounds\(display\) \|\| \{\}\)/);
  assert.ok(!/frame: *false|kiosk: *true|thickFrame: *false|transparent: *true/.test(main), 'niente frame:false, kiosk, thickFrame:false, transparent');
  assert.match(main, /ready-to-show', \(\) => win\?\.show\(\)\)/, 'ready-to-show solo mostra la finestra');
  assert.match(main, /setAutoHideMenuBar\(false\); win\.setMenuBarVisibility\(false\)/);
  assert.match(main, /'before-input-event'/);
  assert.match(main, /'display-metrics-changed'/);
  // monitor voluto all'avvio dalle impostazioni (ledwall acceso dopo), un solo monitor senza giro, opacità solo nel giro
  assert.match(main, /wantedDisplayId = initialWanted\(settings, display\);/);
  assert.match(main, /displayToFollow\(added, \{ wantedId: wantedDisplayId/);
  assert.match(main, /if \(!next\)\{[^}]*return; \}\s*placeOn\(next\);/, 'Ctrl+Maiusc+M con un solo monitor non fa niente');
  assert.equal((main.match(/setOpacity\(0\)/g) || []).length, 1);
  assert.ok(main.indexOf("mode === 'rettangolo'") < main.indexOf('setOpacity(0)'), 'il giro con la finestra trasparente viene dopo i casi senza');
});

test('consegna a pezzi: UNISCI I PEZZI.cmd rimette insieme ogni eseguibile e controlla lo sha256', async () => {
  const { joinScript, splitFile } = await import('../scripts/dividi.mjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'natpf-dividi-'));
  const src = path.join(dir, 'NATPF-Simulator-Setup-prova.exe');
  fs.writeFileSync(src, Buffer.from(Array.from({ length: 2500 }, (_, i) => i % 251)));
  const out = path.join(dir, 'out'); fs.mkdirSync(out);
  const f = splitFile(src, out, 1000);
  assert.deepEqual(f.parts, ['NATPF-Simulator-Setup-prova.exe.001', 'NATPF-Simulator-Setup-prova.exe.002', 'NATPF-Simulator-Setup-prova.exe.003']);
  assert.deepEqual(Buffer.concat(f.parts.map(p => fs.readFileSync(path.join(out, p)))), fs.readFileSync(src), 'i pezzi uniti ridanno il file');
  const cmd = joinScript([f, { name: 'NATPF-Simulator-Portatile-prova.exe', parts: ['NATPF-Simulator-Portatile-prova.exe.001'], sha256: 'ab'.repeat(32) }]);
  assert.ok(cmd.includes('\r\n') && !/[^\r]\n/.test(cmd), 'righe CRLF');
  assert.match(cmd, /copy \/b "NATPF-Simulator-Setup-prova\.exe\.001"\+"NATPF-Simulator-Setup-prova\.exe\.002"\+"NATPF-Simulator-Setup-prova\.exe\.003" "NATPF-Simulator-Setup-prova\.exe"/);
  assert.ok(cmd.includes(`findstr /i /c:"${f.sha256}"`));
  assert.match(cmd, /goto salta1[\s\S]*:salta1[\s\S]*goto salta2[\s\S]*:salta2/);
  assert.throws(() => joinScript([{ name: 'a"b.exe', parts: ['x'], sha256: '0' }]));
});
