// Aggiornamenti del programma Windows dal gioco (src/aggiornamenti.mjs, richiesta del 07/11/2026): versioni, manifesto,
// download con dimensione e sha256, redirect, interruzioni e ripresa, stato per window.natpfDesktop.updates.
// Server HTTP locale finto (127.0.0.1), niente internet né Electron.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { UPDATES, STATUSES, UpdateError, parseBuild, compareBuilds, installerName, normalizeBase, readUpdateConfig, urlAllowed, validateManifest,
  fetchManifest, downloadVerified, sha256File, installerLaunchArgs, staleFiles, friendlyError, Updater } from '../src/aggiornamenti.mjs';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'natpf-agg-'));
const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');
const BODY = Buffer.from(Array.from({ length: 300_000 }, (_, i) => (i*7 + 3) % 256));
const manifestFor = (build, body = BODY, extra = {}) => ({ build, version: undefined, file: installerName(build), size: body.length, sha256: sha(body), notes: 'Novità di prova', published: '2026-11-07T10:00:00Z', ...extra });

// server finto: routes[path] = (req, res) => …; registra le richieste
async function server(routes){
  const seen = [];
  const srv = http.createServer((req, res) => {
    const p = new URL(req.url, 'http://x').pathname;
    seen.push({ path: p, range: req.headers.range || null, url: req.url });
    const h = routes[p];
    if (!h){ res.writeHead(404); res.end('no'); return; }
    h(req, res);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  return { base, seen, close: () => new Promise(r => { srv.closeAllConnections?.(); srv.close(r); }) };
}
const json = obj => (_req, res) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
// file con Range (come R2)
const file = (body, { range = true } = {}) => (req, res) => {
  const m = range && /^bytes=(\d+)-$/.exec(req.headers.range || '');
  if (m){
    const from = Number(m[1]);
    if (from >= body.length){ res.writeHead(416); res.end(); return; }
    res.writeHead(206, { 'Content-Length': body.length - from, 'Content-Range': `bytes ${from}-${body.length - 1}/${body.length}` });
    res.end(body.subarray(from)); return;
  }
  res.writeHead(200, { 'Content-Length': body.length }); res.end(body);
};

test('versioni AAAA-MM-GG.n: confronto e nomi', () => {
  assert.deepEqual(parseBuild('2026-11-07.3'), [2026, 11, 7, 3]);
  for (const bad of ['', '2026-11-07', '2026-13-01.1', '2026-11-00.1', '26-11-07.1', '2026-11-07.3 ', null, undefined, 'x']) assert.equal(parseBuild(bad), null, String(bad));
  assert.ok(compareBuilds('2026-11-07.4', '2026-11-07.3') > 0);
  assert.ok(compareBuilds('2026-11-07.10', '2026-11-07.9') > 0, 'numero, non testo');
  assert.ok(compareBuilds('2026-11-08.1', '2026-11-07.12') > 0);
  assert.ok(compareBuilds('2027-01-01.1', '2026-12-31.9') > 0);
  assert.equal(compareBuilds('2026-11-07.3', '2026-11-07.3'), 0);
  assert.ok(compareBuilds('2026-11-06.3', '2026-11-07.1') < 0);
  assert.ok(compareBuilds('prova', '2026-11-07.1') < 0, 'una versione non valida non è mai più nuova');
  assert.equal(installerName('2026-11-07.3'), 'NATPF-Simulator-Setup-2026-11-07.3.exe');
  assert.deepEqual(staleFiles(['NATPF-Simulator-Setup-2026-11-07.2.exe', 'NATPF-Simulator-Setup-2026-11-07.3.exe.parziale', 'NATPF-Simulator-Setup-2026-11-08.1.exe', 'altro.txt'], '2026-11-07.3'),
    ['NATPF-Simulator-Setup-2026-11-07.2.exe', 'NATPF-Simulator-Setup-2026-11-07.3.exe.parziale']);
  assert.deepEqual(STATUSES, ['off', 'idle', 'checking', 'none', 'available', 'downloading', 'ready', 'installing', 'error']);
});

test('indirizzo base: https (http solo verso questo computer), configurazione dal file o dall\'ambiente', () => {
  assert.equal(normalizeBase(''), ''); assert.equal(normalizeBase('  '), '');
  assert.equal(normalizeBase('https://pub-abc.r2.dev/'), 'https://pub-abc.r2.dev');
  assert.equal(normalizeBase('https://aggiornamenti.example.it/natpf//'), 'https://aggiornamenti.example.it/natpf');
  assert.equal(normalizeBase('http://127.0.0.1:9611'), 'http://127.0.0.1:9611');
  for (const bad of ['http://pub-abc.r2.dev', 'ftp://x', 'non un indirizzo', 'https://x.it/?a=1', 'https://u:p@x.it']) assert.throws(() => normalizeBase(bad), UpdateError, bad);
  const dir = tmp(), f = path.join(dir, 'aggiornamenti.json');
  assert.deepEqual(readUpdateConfig(f), { base: '', hosts: [] }, 'senza file: spento');
  fs.writeFileSync(f, JSON.stringify({ base: '' }));
  assert.deepEqual(readUpdateConfig(f), { base: '', hosts: [] });
  fs.writeFileSync(f, JSON.stringify({ base: 'https://pub-abc.r2.dev/', hosts: ['Natpf.Example.it', 'non valido/', 3] }));
  assert.deepEqual(readUpdateConfig(f), { base: 'https://pub-abc.r2.dev', hosts: ['natpf.example.it', '3'] });
  assert.equal(readUpdateConfig(f, { [UPDATES.envBase]: 'http://localhost:9611' }).base, 'http://localhost:9611', 'l\'ambiente (prove) vince');
  fs.writeFileSync(f, JSON.stringify({ base: 'http://pub-abc.r2.dev' }));
  const bad = readUpdateConfig(f); assert.equal(bad.base, ''); assert.match(bad.error, /https/);
  fs.writeFileSync(f, '{ rotto');
  assert.equal(readUpdateConfig(f).base, '');
  // stesso indirizzo della base o host elencati (solo https)
  assert.ok(urlAllowed('https://pub-abc.r2.dev/windows/a.exe', 'https://pub-abc.r2.dev'));
  assert.ok(!urlAllowed('https://evil.example/windows/a.exe', 'https://pub-abc.r2.dev'));
  assert.ok(urlAllowed('https://natpf.example.it/a.exe', 'https://pub-abc.r2.dev', ['natpf.example.it']));
  assert.ok(!urlAllowed('http://natpf.example.it/a.exe', 'https://pub-abc.r2.dev', ['natpf.example.it']), 'mai http verso un altro host');
  assert.ok(!urlAllowed('http://pub-abc.r2.dev/a.exe', 'https://pub-abc.r2.dev'), 'da https a http no');
  assert.ok(!urlAllowed('https://u:p@pub-abc.r2.dev/a.exe', 'https://pub-abc.r2.dev'));
  assert.ok(!urlAllowed('http://127.0.0.1:2/a', 'http://127.0.0.1:1'), 'altra porta = altra origine');
});

test('manifesto: valido e non valido', () => {
  const base = 'https://pub-abc.r2.dev';
  const ok = validateManifest({ ...manifestFor('2026-11-08.1'), version: '2026.1108.1' }, base);
  assert.equal(ok.url, 'https://pub-abc.r2.dev/windows/NATPF-Simulator-Setup-2026-11-08.1.exe');
  assert.equal(ok.version, '2026.1108.1'); assert.equal(ok.size, BODY.length); assert.equal(ok.notes, 'Novità di prova');
  assert.equal(validateManifest({ ...manifestFor('2026-11-08.1'), sha256: sha(BODY).toUpperCase(), notes: 5 }, base).sha256, sha(BODY), 'sha256 in minuscolo, note non testo → vuote');
  assert.equal(validateManifest({ ...manifestFor('2026-11-08.1'), notes: 'x'.repeat(5000) }, base).notes.length, UPDATES.maxNotes);
  const bad = {
    'non un oggetto': null, 'array': [], 'build': { build: '2026-11-08' }, 'version incoerente': { version: '2026.1108.2' },
    'file con percorso': { file: '../x.exe' }, 'file assoluto': { file: 'https://evil.example/x.exe' }, 'non exe': { file: 'x.zip' }, 'file vuoto': { file: '' },
    'size zero': { size: 0 }, 'size testo': { size: '300000' }, 'size enorme': { size: 2*1024**3 }, 'size decimale': { size: 1.5 },
    'sha256 corto': { sha256: 'abc' }, 'sha256 non hex': { sha256: 'z'.repeat(64) },
  };
  for (const [name, change] of Object.entries(bad)){
    const m = change === null || Array.isArray(change) ? change : { ...manifestFor('2026-11-08.1'), ...change };
    assert.throws(() => validateManifest(m, base), e => e instanceof UpdateError && e.code === 'manifesto', name);
  }
});

test('manifesto dal server: 200, 404, 500, JSON rotto, troppo grande, redirect', async () => {
  const good = manifestFor('2026-11-08.1');
  const s = await server({
    '/windows/latest.json': json(good),
    '/rotto/windows/latest.json': (_q, r) => { r.writeHead(200); r.end('{ non json'); },
    '/grande/windows/latest.json': (_q, r) => { r.writeHead(200); r.end(JSON.stringify({ ...good, notes: 'x'.repeat(100_000) })); },
    '/errore/windows/latest.json': (_q, r) => { r.writeHead(500); r.end(); },
    '/sposta/windows/latest.json': (_q, r) => { r.writeHead(302, { Location: '/windows/latest.json' }); r.end(); },
    '/fuori/windows/latest.json': (_q, r) => { r.writeHead(302, { Location: 'http://127.0.0.1:1/windows/latest.json' }); r.end(); },
    '/giro/windows/latest.json': (_q, r) => { r.writeHead(302, { Location: '/giro/windows/latest.json' }); r.end(); },
  });
  try {
    const m = await fetchManifest(s.base, { now: () => 42 });
    assert.equal(m.build, '2026-11-08.1'); assert.equal(m.url, `${s.base}/windows/${good.file}`);
    assert.match(s.seen.at(-1).url, /latest\.json\?t=42$/, 'niente copia vecchia dalla cache');
    const code = async (base, c) => assert.rejects(fetchManifest(base), e => e.code === c, `${base} → ${c}`);
    await code(`${s.base}/manca`, 'nessuno');
    await code(`${s.base}/errore`, 'http');
    await code(`${s.base}/rotto`, 'manifesto');
    await code(`${s.base}/grande`, 'manifesto');
    assert.equal((await fetchManifest(`${s.base}/sposta`)).build, '2026-11-08.1', 'redirect sullo stesso host: consentito');
    await code(`${s.base}/fuori`, 'redirect');
    await code(`${s.base}/giro`, 'redirect');
    // nessun server: errore di rete con un testo chiaro
    const e = await fetchManifest('http://127.0.0.1:1').catch(x => x);
    assert.equal(e.code, 'ECONNREFUSED');
    assert.match(friendlyError(e), /non raggiungibile.*funziona lo stesso/);
  } finally { await s.close(); }
});

test('download: dimensione e sha256 controllati, redirect esterno rifiutato', async () => {
  const wrong = Buffer.from(BODY); wrong[1000] ^= 0xff;
  const longer = Buffer.concat([BODY, Buffer.from('extra')]);
  const s = await server({
    '/ok.exe': file(BODY),
    '/sbagliato.exe': file(wrong),
    '/lungo.exe': file(longer),
    '/lungo-senza-length.exe': (_q, r) => { r.writeHead(200); r.end(longer); },
    '/corto-senza-length.exe': (_q, r) => { r.writeHead(200); r.end(BODY.subarray(0, 1000)); },
    '/fuori.exe': (_q, r) => { r.writeHead(301, { Location: 'http://127.0.0.1:1/ok.exe' }); r.end(); },
    '/manca.exe': (_q, r) => { r.writeHead(404); r.end(); },
  });
  try {
    const dir = tmp(), args = { size: BODY.length, sha256: sha(BODY), base: s.base, retryMs: 10 };
    const progress = [];
    const dest = path.join(dir, 'a.exe');
    assert.deepEqual(await downloadVerified({ ...args, url: `${s.base}/ok.exe`, dest, onProgress: (d, t) => progress.push(d/t) }), { reused: false });
    assert.equal(await sha256File(dest), sha(BODY));
    assert.equal(progress.at(-1), 1); assert.ok(progress.every((p, i) => i === 0 || p >= progress[i - 1]), 'avanzamento crescente');
    assert.ok(!fs.existsSync(dest + UPDATES.partSuffix));
    assert.deepEqual(await downloadVerified({ ...args, url: `${s.base}/ok.exe`, dest }), { reused: true }, 'già scaricato: niente download');
    const fails = async (name, code) => {
      const d = path.join(dir, `${name}`);
      await assert.rejects(downloadVerified({ ...args, url: `${s.base}/${name}`, dest: d }), e => e instanceof UpdateError && e.code === code, `${name} → ${code}`);
      assert.ok(!fs.existsSync(d), `${name}: nessun file installabile`);
      assert.ok(!fs.existsSync(d + UPDATES.partSuffix), `${name}: niente parziale da riprendere`);
    };
    await fails('sbagliato.exe', 'sha256');
    await fails('lungo.exe', 'dimensione');
    await fails('lungo-senza-length.exe', 'dimensione');
    await fails('fuori.exe', 'redirect');
    await fails('manca.exe', 'http');
    // stream corto senza Content-Length: per il client è un download finito ma incompleto → dimensione sbagliata
    await fails('corto-senza-length.exe', 'dimensione');
    assert.match(friendlyError(new UpdateError('sha256', 'Il file scaricato non corrisponde (controllo sha256): riprova.')), /sha256/);
  } finally { await s.close(); }
});

test('download interrotto: riprende con Range, ricomincia se il server non lo permette, riparte da capo se il ripreso è rotto', async () => {
  let cut = 1;
  // la prima richiesta si interrompe a metà (connessione chiusa), le altre vanno
  const flaky = range => (req, res) => {
    if (cut > 0){ cut--; res.writeHead(200, { 'Content-Length': BODY.length }); res.write(BODY.subarray(0, 120_000)); setTimeout(() => res.socket.destroy(), 30); return; }
    file(BODY, { range })(req, res);
  };
  const s = await server({ '/flaky.exe': flaky(true), '/norange.exe': flaky(false), '/ok.exe': file(BODY) });
  try {
    const dir = tmp(), args = { size: BODY.length, sha256: sha(BODY), base: s.base, retryMs: 10 };
    // 1. ripresa nella stessa chiamata
    let dest = path.join(dir, 'flaky.exe');
    await downloadVerified({ ...args, url: `${s.base}/flaky.exe`, dest });
    assert.equal(await sha256File(dest), sha(BODY));
    const reqs = s.seen.filter(x => x.path === '/flaky.exe');
    assert.equal(reqs.length, 2); assert.equal(reqs[0].range, null); assert.match(reqs[1].range, /^bytes=\d+-$/);
    assert.ok(Number(/\d+/.exec(reqs[1].range)[0]) > 0, 'ripreso dal punto raggiunto');
    // 2. una sola prova: errore chiaro, il parziale resta; la chiamata dopo riprende
    cut = 1; dest = path.join(dir, 'flaky2.exe');
    const e = await downloadVerified({ ...args, url: `${s.base}/flaky.exe`, dest, attempts: 1 }).catch(x => x);
    assert.equal(e.code, 'interrotto'); assert.match(e.message, /riprende da dove si era fermato/);
    const kept = fs.statSync(dest + UPDATES.partSuffix).size;
    assert.ok(kept > 0 && kept < BODY.length, `parziale tenuto: ${kept}`);
    await downloadVerified({ ...args, url: `${s.base}/flaky.exe`, dest });
    assert.equal(await sha256File(dest), sha(BODY));
    assert.equal(s.seen.at(-1).range, `bytes=${kept}-`);
    // 3. server senza Range: ricomincia da capo (200), il file è giusto
    cut = 1; dest = path.join(dir, 'norange.exe');
    await downloadVerified({ ...args, url: `${s.base}/norange.exe`, dest });
    assert.equal(await sha256File(dest), sha(BODY));
    // 4. parziale rotto (scritto da un'altra versione): sha256 sbagliato dopo la ripresa → una volta da capo, poi giusto
    dest = path.join(dir, 'rotto.exe');
    fs.writeFileSync(dest + UPDATES.partSuffix, Buffer.alloc(5000, 0x55));
    const before = s.seen.length;
    await downloadVerified({ ...args, url: `${s.base}/ok.exe`, dest });
    assert.equal(await sha256File(dest), sha(BODY));
    assert.deepEqual(s.seen.slice(before).map(x => x.range), ['bytes=5000-', null], 'ripresa, poi da capo');
    // 5. parziale più lungo del file: via, da capo
    dest = path.join(dir, 'lungo.exe');
    fs.writeFileSync(dest + UPDATES.partSuffix, Buffer.alloc(BODY.length + 10));
    await downloadVerified({ ...args, url: `${s.base}/ok.exe`, dest });
    assert.equal(await sha256File(dest), sha(BODY));
  } finally { await s.close(); }
});

test('installer avviato con il permesso di Windows (PowerShell Start-Process -Verb RunAs, /S /AGGIORNA)', () => {
  const args = installerLaunchArgs("C:\\Users\\Dell'Acqua\\AppData\\Local\\NATPF\\aggiornamenti\\NATPF-Simulator-Setup-2026-11-08.1.exe");
  assert.equal(args.at(-2), '-Command');
  assert.equal(args.at(-1), "Start-Process -FilePath 'C:\\Users\\Dell''Acqua\\AppData\\Local\\NATPF\\aggiornamenti\\NATPF-Simulator-Setup-2026-11-08.1.exe' -ArgumentList '/S','/AGGIORNA' -Verb RunAs");
  assert.ok(!args.at(-1).includes('-Wait'), 'non aspetta l\'installer (che chiude il programma)');
  assert.throws(() => installerLaunchArgs('C:\\a"b.exe'));
  assert.throws(() => installerLaunchArgs(''));
  assert.deepEqual(UPDATES.installerArgs, ['/S', '/AGGIORNA']);
});

test('stato: spento senza indirizzo, senza installazione o con una versione non valida', async () => {
  for (const opts of [{ base: '' }, { base: 'https://x.it', enabled: false }, { base: 'https://x.it', current: 'prova' }, { base: 'https://x.it', dir: '' }]){
    const u = new Updater({ current: '2026-11-07.3', dir: tmp(), ...opts });
    assert.equal(u.state().status, 'off', JSON.stringify(opts));
    assert.equal((await u.check()).status, 'off');
    assert.equal((await u.download()).status, 'off');
    assert.equal((await u.install()).ok, false);
  }
  assert.deepEqual(new Updater({ current: '2026-11-07.3', base: 'https://x.it', dir: tmp() }).state(), { status: 'idle', current: '2026-11-07.3' });
});

test('stato: controllo → disponibile → download → pronto → installazione (clic dell\'utente), poi chiusura', async () => {
  let manifest = manifestFor('2026-11-08.1');
  const s = await server({ '/windows/latest.json': (q, r) => json(manifest)(q, r), [`/windows/${installerName('2026-11-08.1')}`]: file(BODY) });
  try {
    const dir = tmp(), launched = [], logs = [];
    let quits = 0, t = 1000;
    const u = new Updater({ current: '2026-11-07.3', base: s.base, dir, now: () => (t += 100), retryMs: 10, progressMs: 0,
      launch: async f => { launched.push(f); return { ok: true }; }, quit: () => { quits++; }, log: (...a) => logs.push(a) });
    const seen = [];
    const off = u.onChange(x => seen.push(x));
    assert.equal(typeof off, 'function');
    // install prima del download: niente
    assert.deepEqual(await u.install(), { ok: false, error: 'Nessun aggiornamento pronto da installare.' });
    const c = await u.check();
    assert.equal(c.status, 'available'); assert.equal(c.latest, '2026-11-08.1'); assert.equal(c.size, BODY.length); assert.equal(c.notes, 'Novità di prova');
    assert.equal(c.current, '2026-11-07.3'); assert.ok(c.checkedAt > 0);
    assert.deepEqual(seen.slice(0, 2).map(x => x.status), ['checking', 'available']);
    // nessun download senza clic
    assert.ok(!s.seen.some(x => x.path.endsWith('.exe')), 'il controllo non scarica');
    const both = [u.download(), u.download()];
    const [d1, d2] = await Promise.all(both);
    assert.equal(d1.status, 'ready'); assert.deepEqual(d1, d2, 'due clic: un solo download');
    assert.equal(s.seen.filter(x => x.path.endsWith('.exe')).length, 1);
    const prog = seen.filter(x => x.status === 'downloading').map(x => x.progress);
    assert.ok(prog.length >= 2 && prog[0] === 0, `avanzamento: ${prog}`);
    assert.ok(prog.every(p => p >= 0 && p <= 1));
    assert.equal(fs.readdirSync(dir).join(), installerName('2026-11-08.1'));
    // controllo di nuovo a scaricamento fatto: resta pronto; anche se il server non risponde
    assert.equal((await u.check()).status, 'ready');
    // installazione: avvio dell'installer scaricato e chiusura del programma
    const r = await u.install();
    assert.deepEqual(r, { ok: true });
    assert.deepEqual(launched, [path.join(dir, installerName('2026-11-08.1'))]);
    assert.equal(quits, 1);
    assert.equal(u.state().status, 'installing');
    off();
    const n = seen.length; u.set({ status: 'idle' }); assert.equal(seen.length, n, 'onChange tolto');
    assert.ok(logs.some(([m, d]) => m === 'aggiornamenti' && d.stato === 'ready'));
  } finally { await s.close(); }
});

test('stato: già aggiornato, offline, permesso rifiutato, file cambiato prima di installare, già scaricato', async () => {
  let manifest = manifestFor('2026-11-07.3');
  const s = await server({ '/windows/latest.json': (q, r) => json(manifest)(q, r), [`/windows/${installerName('2026-11-08.1')}`]: file(BODY) });
  try {
    const dir = tmp();
    // file vecchi nella cartella: tolti quando si scopre di essere aggiornati
    fs.writeFileSync(path.join(dir, installerName('2026-11-07.2')), 'vecchio');
    fs.writeFileSync(path.join(dir, 'tieni.txt'), 'x');
    let answer = { ok: false, error: 'Aggiornamento annullato: serve il permesso di Windows.' }, quits = 0;
    const u = new Updater({ current: '2026-11-07.3', base: s.base, dir, retryMs: 10, launch: async () => answer, quit: () => { quits++; } });
    const none = await u.check();
    assert.equal(none.status, 'none'); assert.equal(none.latest, '2026-11-07.3');
    assert.deepEqual(fs.readdirSync(dir), ['tieni.txt']);
    assert.equal((await u.download()).status, 'none', 'niente da scaricare');
    // versione nuova
    manifest = manifestFor('2026-11-08.1');
    assert.equal((await u.check()).status, 'available');
    assert.equal((await u.download()).status, 'ready');
    // permesso rifiutato (UAC): resta pronto, con il motivo; il programma non si chiude
    const r = await u.install();
    assert.equal(r.ok, false); assert.match(r.error, /permesso di Windows/);
    assert.equal(u.state().status, 'ready'); assert.match(u.state().error, /permesso/); assert.equal(quits, 0);
    // il file cambia sul disco: non si avvia, si torna a «disponibile»
    fs.appendFileSync(path.join(dir, installerName('2026-11-08.1')), 'x');
    answer = { ok: true };
    const r2 = await u.install();
    assert.equal(r2.ok, false); assert.match(r2.error, /scaricalo di nuovo/); assert.equal(u.state().status, 'available'); assert.equal(quits, 0);
    // un altro programma (stesso computer) trova il file già scaricato e controllato: pronto senza scaricare
    assert.equal((await u.download()).status, 'ready');
    const exeReqs = s.seen.filter(x => x.path.endsWith('.exe')).length;
    const u2 = new Updater({ current: '2026-11-07.3', base: s.base, dir });
    assert.equal((await u2.check()).status, 'ready');
    assert.equal(s.seen.filter(x => x.path.endsWith('.exe')).length, exeReqs);
    // server spento: errore chiaro, il pronto resta installabile
    await s.close();
    const off = await u2.check();
    assert.equal(off.status, 'ready'); assert.match(off.error, /non raggiungibile/);
    const u3 = new Updater({ current: '2026-11-07.3', base: s.base, dir: tmp() });
    const e = await u3.check();
    assert.equal(e.status, 'error'); assert.match(e.error, /non raggiungibile.*funziona lo stesso/);
    assert.equal((await u3.download()).status, 'error', 'senza manifesto niente download');
  } finally { await s.close(); }
});

test('stato: download con sha256 sbagliato → errore, poi si riprova dal clic', async () => {
  const wrong = Buffer.from(BODY); wrong[5] ^= 1;
  let body = wrong;
  const s = await server({ '/windows/latest.json': json(manifestFor('2026-11-08.1')), [`/windows/${installerName('2026-11-08.1')}`]: (q, r) => file(body)(q, r) });
  try {
    const u = new Updater({ current: '2026-11-07.3', base: s.base, dir: tmp(), retryMs: 10 });
    await u.check();
    const e = await u.download();
    assert.equal(e.status, 'error'); assert.match(e.error, /sha256/); assert.equal(e.latest, '2026-11-08.1');
    body = BODY;
    assert.equal((await u.download()).status, 'ready', 'dopo l\'errore il clic riprova');
  } finally { await s.close(); }
});
