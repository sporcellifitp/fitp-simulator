// Programma Windows (natpf-desktop): funzioni pure del processo principale. Electron e Windows non servono qui.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DESKTOP, chooseDisplay, nextDisplay, displayLabel, isOwnUrl, samePem, firewallCommand, elevatedPowershellArgs, ruleCoversExe, readSettings, writeSettings, windowsVersion, readBuild } from '../src/desktop-core.mjs';

const d = (id, w, h, x = 0) => ({ id, bounds: { x, y: 0, width: w, height: h }, scaleFactor: 1 });

test('monitor del gioco: quello salvato, altrimenti il più grande esterno (ledwall), altrimenti il principale', () => {
  const laptop = d(1, 1920, 1080), ledwall = d(2, 3840, 2160, 1920), small = d(3, 1280, 720, 5760);
  assert.equal(chooseDisplay([laptop, ledwall, small], { primaryId: 1 }).id, 2, 'ledwall come monitor esteso');
  assert.equal(chooseDisplay([laptop, ledwall], { primaryId: 1, savedId: 1 }).id, 1, 'scelta salvata');
  assert.equal(chooseDisplay([laptop, ledwall], { primaryId: 1, savedId: 99 }).id, 2, 'monitor salvato scollegato');
  assert.equal(chooseDisplay([laptop], { primaryId: 1 }).id, 1, 'un solo monitor');
  assert.equal(chooseDisplay([], {}), null);
  assert.equal(nextDisplay([laptop, ledwall], 2).id, 1); assert.equal(nextDisplay([laptop, ledwall], 1).id, 2);
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

test('installazione e portatile coerenti con il programma: nome della regola, porte, avviso del portatile', () => {
  const read = f => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
  const setup = read('build/installatore.nsi'), port = read('build/portatile.nsi'), main = read('src/main.mjs');
  assert.match(setup, new RegExp(`!define REGOLA "${DESKTOP.ruleName}"`), 'l\'installazione crea la regola che il programma controlla');
  assert.match(setup, /add rule name="\$\{REGOLA\}" dir=in action=allow program="\$INSTDIR\\\$\{EXE\}" enable=yes profile=any remoteip=localsubnet/);
  assert.match(setup, /delete rule name=all program="\$INSTDIR\\\$\{EXE\}"[\s\S]*add rule name=/, 'via le regole di blocco prima di consentire');
  assert.match(setup, /Section "Uninstall"[\s\S]*delete rule name="\$\{REGOLA\}"[\s\S]*delete rule name=all program=/, 'la disinstallazione toglie le regole');
  assert.match(setup, /WriteUninstaller/); assert.match(setup, /RequestExecutionLevel admin/);
  assert.match(port, /RequestExecutionLevel user/);
  assert.match(port, /SetEnvironmentVariable\(t "PORTABLE_EXECUTABLE_DIR"/); assert.match(main, /process\.env\.PORTABLE_EXECUTABLE_DIR/);
  for (const nsi of [setup, port]) assert.match(nsi, /!define EXE "NATPF Simulator\.exe"/);
});
