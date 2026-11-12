// Registro dello stand (B30): l'indirizzo del Worker dell'utente nel pacchetto Cloudflare del gioco
// (scripts/pacchetto-cloudflare.mjs --registro-url=… → natpf/registro.json) e come lo legge il gioco. Nel pacchetto
// va solo l'indirizzo: mai la chiave segreta.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makePackage, checkRegistroUrl, headersProblems, parseArgs, main, REGISTRO_JSON, TURN_JSON, CLI_OPTIONS } from '../scripts/pacchetto-cloudflare.mjs';
import { REGISTRO, indirizzoRegistro } from '../src/natpf/registro/registro_formato.js';

function finto(){
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'natpf-registro-pacchetto-')), dist = path.join(tmp, 'dist');
  fs.mkdirSync(path.join(dist, 'natpf/tennis'), { recursive: true });
  fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html>');
  fs.writeFileSync(path.join(dist, 'natpf/tennis/racchetta.html'), '<!doctype html>');
  const headers = path.join(tmp, '_headers');
  fs.writeFileSync(headers, fs.readFileSync(new URL('../../site/_headers', import.meta.url)));
  return { tmp, dist, headers };
}

test('pacchetto Cloudflare: --registro-url scrive natpf/registro.json con il solo indirizzo; senza, nessun file', () => {
  const { tmp, dist, headers } = finto();
  try {
    assert.equal('/' + REGISTRO_JSON, REGISTRO.config, 'il gioco cerca il file dove lo mette il pacchetto');
    const r = makePackage({ out: path.join(tmp, 'a'), registroUrl: 'https://natpf-registro.example.workers.dev', dist, headers });
    assert.deepEqual(r.files, ['_headers', 'index.html', REGISTRO_JSON, 'natpf/tennis/racchetta.html']);
    const conf = JSON.parse(fs.readFileSync(path.join(r.dest, REGISTRO_JSON), 'utf8'));
    assert.deepEqual(conf, { url: 'https://natpf-registro.example.workers.dev/' });
    assert.equal(indirizzoRegistro(conf), 'https://natpf-registro.example.workers.dev/', 'il gioco lo accetta così com\'è');
    // con il TURN insieme: due file, ognuno il suo
    const due = makePackage({ out: path.join(tmp, 'b'), turnUrl: 'https://turn.example.workers.dev/', registroUrl: 'https://natpf-registro.example.workers.dev/', dist, headers });
    assert.ok(due.files.includes(TURN_JSON) && due.files.includes(REGISTRO_JSON));
    // senza --registro-url: niente file, nemmeno uno rimasto in una build vecchia
    fs.writeFileSync(path.join(dist, REGISTRO_JSON), '{"url":"https://vecchio.example/"}');
    const plain = makePackage({ out: path.join(tmp, 'c'), dist, headers });
    assert.ok(!plain.files.includes(REGISTRO_JSON)); assert.equal(plain.registroUrl, null);
    fs.rmSync(path.join(dist, REGISTRO_JSON));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('pacchetto Cloudflare: l\'indirizzo del registro è solo https, senza utente, password o parametri (mai la chiave)', () => {
  assert.equal(checkRegistroUrl('https://natpf-registro.example.workers.dev'), 'https://natpf-registro.example.workers.dev/');
  assert.equal(checkRegistroUrl('http://127.0.0.1:8787'), 'http://127.0.0.1:8787/');
  assert.throws(() => checkRegistroUrl('http://natpf-registro.example.workers.dev/'), /https/);
  assert.throws(() => checkRegistroUrl('https://utente:chiave@natpf-registro.example.workers.dev/'), /chiave segreta/);
  assert.throws(() => checkRegistroUrl('https://natpf-registro.example.workers.dev/?chiave=la-mia-chiave'), /chiave segreta/);
  assert.throws(() => checkRegistroUrl('https://natpf-registro.example.workers.dev/#x'), /solo l'indirizzo/);
  assert.throws(() => checkRegistroUrl('registro'), /non è un indirizzo/);
  assert.ok(CLI_OPTIONS.includes('registro-url'));
  assert.deepEqual(parseArgs(['--out=a', '--registro-url=https://r.example.workers.dev/']), { out: 'a', 'registro-url': 'https://r.example.workers.dev/' });
  assert.throws(() => parseArgs(['--registro-url', 'https://r.example.workers.dev/']), /argomento non valido/);
});

test('pacchetto Cloudflare: _headers non deve impedire al gioco di chiamare il Worker del registro; il comando lo dice', () => {
  const { tmp, dist, headers } = finto();
  try {
    const url = 'https://natpf-registro.example.workers.dev/';
    assert.deepEqual(headersProblems(fs.readFileSync(headers, 'utf8'), { registroUrl: url }), [], '_headers di oggi va bene');
    assert.equal(headersProblems("/*\n  Content-Security-Policy: default-src 'self'\n", { registroUrl: url }).length, 2, 'le due pagine del gioco');
    assert.deepEqual(headersProblems(`/*\n  Content-Security-Policy: default-src 'self'; connect-src 'self' ${new URL(url).origin}\n`, { registroUrl: url }), []);
    assert.equal(headersProblems('/natpf/*\n  Content-Type: text/plain\n', { registroUrl: url }).length, 2, 'registro.json e turn.json devono restare JSON');
    const csp = path.join(tmp, '_headers-csp'); fs.writeFileSync(csp, "/*\n  Content-Security-Policy: default-src 'self'; media-src https:\n");
    assert.throws(() => makePackage({ out: path.join(tmp, 'x'), registroUrl: url, dist, headers: csp }), /registro dello stand su https:\/\/natpf-registro\.example\.workers\.dev/);
    const righe = [], code = main([`--out=${path.join(tmp, 'p')}`, `--registro-url=${url}`], { dist, headers, log: t => righe.push(t), error: t => righe.push(t) });
    assert.equal(code, 0); assert.ok(righe.some(t => t.includes(`Registro dello stand: /${REGISTRO_JSON} → ${url}`)));
    const senza = [], code2 = main([`--out=${path.join(tmp, 'q')}`], { dist, headers, log: t => senza.push(t), error: t => senza.push(t) });
    assert.equal(code2, 0); assert.ok(senza.some(t => /Senza --registro-url/.test(t) && /resta in coda/.test(t)));
    const male = [], code3 = main([`--out=${path.join(tmp, 'r')}`, '--registro-url=https://r.example/?chiave=x'], { dist, headers, log: () => {}, error: t => male.push(t) });
    assert.equal(code3, 1); assert.ok(male.some(t => /chiave segreta/.test(t))); assert.ok(!fs.existsSync(path.join(tmp, 'r', REGISTRO_JSON)));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
