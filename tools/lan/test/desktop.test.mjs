import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dataDirectory, migrateCertificates } from '../storage.mjs';
import { findBrowser, browserArguments, listMonitors } from '../desktop.mjs';

test('desktop finds Edge first, then Chrome; absence has a useful error', () => {
  const env = { ProgramFiles: '/programs', LOCALAPPDATA: '/local' };
  assert.equal(findBrowser(env, () => true).name, 'Edge');
  assert.equal(findBrowser(env, p => p.endsWith('chrome.exe')).name, 'Chrome');
  assert.throws(() => findBrowser(env, () => false), /Installa/);
});
test('app uses stable localhost origin, dedicated profile and negative monitor coordinates', () => {
  const args = browserArguments({ profile: 'C:\\Users\\Nome Cognome\\NATPF\\edge', monitor: { x: -1920, y: 0, width: 1920, height: 1080 } });
  assert.ok(args.includes('--app=https://localhost:8443/?lan=1'));
  assert.ok(args.includes('--window-position=-1920,0'));
  assert.ok(args.includes('--user-data-dir=C:\\Users\\Nome Cognome\\NATPF\\edge'));
  assert.ok(!args.some(a => a.includes('ignore-certificate')));
  assert.throws(() => browserArguments({ monitor: { x: 0, y: 0, width: -1, height: 1080 } }), /Dimensioni/);
  assert.ok(browserArguments({ profile: 'test', kiosk: true }).includes('--start-fullscreen'));
  assert.ok(!browserArguments({ profile: 'test', kiosk: true }).includes('--kiosk'));
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
