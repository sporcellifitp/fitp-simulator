import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dataDirectory, migrateCertificates } from '../storage.mjs';
import { findBrowser, browserArguments, listMonitors, screenMode, exitHint } from '../desktop.mjs';

test('desktop finds Edge first, then Chrome; absence has a useful error', () => {
  const env = { ProgramFiles: '/programs', LOCALAPPDATA: '/local' };
  assert.equal(findBrowser(env, () => true).name, 'Edge');
  assert.equal(findBrowser(env, p => p.endsWith('chrome.exe')).name, 'Chrome');
  assert.throws(() => findBrowser(env, () => false), /Installa/);
});
test('app uses stable localhost origin, dedicated profile and negative monitor coordinates', () => {
  const ledwall = { x: -1920, y: 0, width: 1920, height: 1080 };
  const args = browserArguments({ profile: 'C:\\Users\\Nome Cognome\\NATPF\\edge', monitor: ledwall });
  assert.ok(args.includes('--app=https://localhost:8443/?lan=1'));
  assert.ok(args.includes('--user-data-dir=C:\\Users\\Nome Cognome\\NATPF\\edge'));
  assert.ok(!args.some(a => a.includes('ignore-certificate')));
  assert.throws(() => browserArguments({ monitor: { x: 0, y: 0, width: -1, height: 1080 } }), /Dimensioni/);
  // predefinito: schermo intero senza bordi, mai kiosk (in Edge è InPrivate e perde impostazioni e record)
  assert.ok(args.includes('--start-fullscreen'));
  for (const a of args) assert.ok(!/kiosk|force-app-mode/.test(a), a);
  assert.ok(browserArguments({ profile: 'test' }).includes('--start-fullscreen'));
  // schermo intero: finestra di partenza a metà, centrata dentro il monitor scelto (lo schermo intero va su quel monitor)
  assert.ok(args.includes('--window-position=-1440,270'));
  assert.ok(args.includes('--window-size=960,540'));
  // finestra con bordi (prove): posizione e dimensioni esatte, senza --start-fullscreen
  const windowed = browserArguments({ profile: 'test', fullscreen: false, monitor: ledwall });
  assert.ok(windowed.includes('--window-position=-1920,0'));
  assert.ok(windowed.includes('--window-size=1920,1080'));
  assert.ok(!windowed.includes('--start-fullscreen'));
  // in finestra il gioco non va a schermo intero da solo al primo tasto: ?fs=0 (natpf_screen.js)
  assert.ok(windowed.includes('--app=https://localhost:8443/?lan=1&fs=0'), windowed.join(' '));
  assert.ok(!args.some(a => a.includes('fs=0')), 'a schermo intero niente fs=0');
});
test('screen mode: options first (new and legacy), then the saved choice; legacy kiosk:false is not a choice', () => {
  const table = [
    [{}, {}, 'intero'],
    [{}, { monitor: 'x', kiosk: false }, 'intero'],
    [{}, { schermo: 'finestra' }, 'finestra'],
    [{}, { schermo: 'intero' }, 'intero'],
    [{ finestra: true }, {}, 'finestra'],
    [{ app: true }, {}, 'finestra'],
    [{ 'schermo-intero': true }, { schermo: 'finestra' }, 'intero'],
    [{ kiosk: true }, { schermo: 'finestra' }, 'intero'],
    [{ finestra: true, kiosk: true }, {}, 'finestra'],
    [{}, null, 'intero'],
  ];
  for (const [args, saved, expected] of table) assert.equal(screenMode(args, saved), expected, JSON.stringify([args, saved]));
  assert.match(exitHint('intero'), /tieni premuto Esc oppure premi F11.*Alt\+F4/);
  assert.match(exitHint('finestra'), /F11.*Alt\+F4/);
});
test('CONFIGURA SCHERMO: Enter keeps borderless fullscreen, 2 opens a framed window, no kiosk', () => {
  const pkg = fs.readFileSync(fileURLToPath(new URL('../../../natpf-tennis/lan/pacchetto.mjs', import.meta.url)), 'utf8');
  const cmd = /'CONFIGURA SCHERMO\.cmd'[\s\S]*?`\)\);/.exec(pkg)?.[0];
  assert.ok(cmd, 'testo di CONFIGURA SCHERMO.cmd');
  assert.ok(cmd.indexOf('set "MODO=1"') >= 0 && cmd.indexOf('set "MODO=1"') < cmd.indexOf('set /p "MODO='), 'INVIO lascia lo schermo intero');
  assert.match(cmd, /if "%MODO%"=="2" goto finestra/);
  assert.match(cmd, /desktop\.mjs "--monitor=%MONITOR%" --schermo-intero/);
  assert.match(cmd, /:finestra\r?\n"%NODE%" tools\\\\lan\\\\desktop\.mjs "--monitor=%MONITOR%" --finestra/);
  assert.ok(!/kiosk/i.test(pkg), 'niente kiosk nel pacchetto');
  const readme = fs.readFileSync(fileURLToPath(new URL('../../../natpf-tennis/lan/LEGGIMI.txt', import.meta.url)), 'utf8');
  assert.ok(!/kiosk/i.test(readme), 'niente kiosk nel LEGGIMI');
  assert.match(readme, /schermo intero senza bordi/);
  assert.match(readme, /tieni premuto Esc oppure premi F11/);
});
test('monitor discovery handles one or multiple screens', () => {
  assert.equal(listMonitors(() => '{"name":"screen"}').length, 1);
  assert.equal(listMonitors(() => '[{"name":"a"},{"name":"b"}]').length, 2);
});
test('Windows state is independent of extracted ZIP directory', () => {
  assert.equal(dataDirectory({ platform: 'win32', env: { LOCALAPPDATA: '/user/local' } }), '/user/local/NATPF');
  assert.equal(dataDirectory({ platform: 'linux', env: {} }), null);
});
test('CA migration preserves identity, renews only leaf on IP change and never overwrites existing state', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'natpf-storage-'));
  const old = path.join(root, 'old'), next = path.join(root, 'next');
  const moduleUrl = new URL('../certificato.mjs', import.meta.url).href;
  const issue = (dir, ip) => execFileSync(process.execPath, ['--input-type=module', '-e', `import {ensureCertificate} from ${JSON.stringify(moduleUrl)}; ensureCertificate({addresses:[${JSON.stringify(ip)}]});`], { env: { ...process.env, NATPF_DATA_DIR: dir }, stdio: 'pipe' });
  try {
    issue(old, '192.168.1.2');
    const source = path.join(old, 'certs'), target = path.join(next, 'certs');
    const ca = fs.readFileSync(path.join(source, 'ca/rootCA.pem'));
    assert.equal(migrateCertificates(source, target), true);
    assert.equal(migrateCertificates(source, target), false);
    issue(next, '192.168.20.2');
    assert.deepEqual(fs.readFileSync(path.join(target, 'ca/rootCA.pem')), ca);
    assert.notDeepEqual(fs.readFileSync(path.join(target, 'cert.pem')), fs.readFileSync(path.join(source, 'cert.pem')));
    fs.writeFileSync(path.join(source, 'ca/rootCA-key.pem'), 'invalid');
    assert.throws(() => migrateCertificates(source, path.join(root, 'invalid')));
    assert.ok(!fs.existsSync(path.join(root, 'invalid')));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
