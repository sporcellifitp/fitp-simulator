// Worker del registro dello stand (cloudflare/registro-worker.js) con uno spazio R2 finto (scripts/registro/r2-finto.mjs):
// solo aggiunte senza la chiave, niente lettura né elenco, limiti, origine, CORS, righe e campi non previsti scartati,
// niente doppioni, scarico a pezzi. Nessuna chiave vera: quella delle prove è scritta qui e non serve a niente.
import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import worker, { LIMITI, TIPI, CAMPI, MAPPE, CAMPI_VIETATI, pulisci, righeBuone, dimentica } from '../cloudflare/registro-worker.js';
import * as F from '../src/natpf/registro/registro_formato.js';
import { r2Finto } from '../scripts/registro/r2-finto.mjs';

const GAME = 'https://gioco.example.workers.dev', PC = 'https://localhost:8443', BASE = 'https://registro.example.workers.dev';
const CHIAVE = 'chiave-di-prova-123';
const oggi = new Date().toISOString().slice(0, 10);
const env = (extra = {}) => ({ REGISTRO: r2Finto(), CHIAVE_LETTURA: CHIAVE, ALLOWED_ORIGINS: `${GAME}, https://localhost:*`, ...extra });
const RIGHE = [{ k: 'partita', t: 100, n: 1, modo: 'cpu', chi: 'adulto' }, { k: 'colpo', t: 2300, n: 1, p: 1, chi: 'g', gesto: 'dritto', ms: -40, voto: 'ritardo', e: 'dentro' }, { k: 'partita.fine', t: 90000, n: 1, esito: 'finita' }];
const testo = (rows = RIGHE) => rows.map(r => JSON.stringify(r)).join('\n') + '\n';
async function manda(E, { giorno = oggi, postazione = 'abcdefgh', parte = '00001-ab12', body = testo(), origin = GAME, z = null, ip = '203.0.113.7', method = 'POST' } = {}){
  const u = new URL(BASE + '/'); u.search = new URLSearchParams({ giorno, postazione, parte, ...(z ? { z } : {}) }).toString();
  const res = await worker.fetch(new Request(u, { method, headers: { 'Content-Type': 'text/plain', ...(origin ? { Origin: origin } : {}), 'CF-Connecting-IP': ip }, body: method === 'POST' ? body : undefined }), E);
  const t = await res.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return { res, body: j, text: t };
}
async function leggi(E, path, { chiave = CHIAVE, query = false, ip = '203.0.113.9', accept = 'application/json' } = {}){
  const u = new URL(BASE + path); if (query && chiave) u.searchParams.set('chiave', chiave);
  const res = await worker.fetch(new Request(u, { headers: { Accept: accept, 'CF-Connecting-IP': ip, ...(chiave && !query ? { Authorization: `Bearer ${chiave}` } : {}) } }), E);
  const t = await res.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return { res, body: j, text: t };
}
test.beforeEach(() => dimentica());

test('Worker del registro: gli elenchi e i limiti sono la copia esatta di quelli del gioco', () => {
  assert.deepEqual([...TIPI], [...F.TIPI]);
  assert.deepEqual([...CAMPI], [...F.CAMPI]);
  assert.deepEqual([...MAPPE], [...F.MAPPE]);
  assert.deepEqual([...CAMPI_VIETATI], [...F.CAMPI_VIETATI]);
  for (const k of ['maxBlocco', 'maxRiga', 'maxTesto', 'maxMessaggio']) assert.equal(LIMITI[k], F.REGISTRO[k], k);
  assert.equal(LIMITI.maxTotale, 2*1024*1024*1024, 'tetto di base del registro: 2 GB');
  // la stessa riga, pulita dal gioco e dal Worker, dà lo stesso risultato
  const sporca = { k: 'errore', t: 5, msg: 'TypeError a http://192.168.1.20:8443/natpf/tennis/racchetta.html?room=AB12 di mario@example.com', file: 'main.js', riga: 12, nome: 'Mario', boh: 1,
    scartati: { 'troppo debole': 3, x: 'testo' }, tel: { so: 'Android 14', browser: 'Chrome 126', ua: 'Mozilla/5.0', strada: 'lan' }, stand: { chiosco: true, segreto: 1 } };
  assert.deepEqual(pulisci(sporca), F.pulisci(sporca));
  assert.equal(pulisci({ k: 'video', t: 1 }), null);
  assert.equal(pulisci({ k: 'colpo' }), null);
});

test('Worker del registro: un blocco si scrive in R2 sotto registro/<giorno>/<postazione>/<parte>.jsonl, con CORS per il gioco', async () => {
  const E = env(), r = await manda(E);
  assert.equal(r.res.status, 200); assert.deepEqual(r.body, { ok: true, righe: 3, scartate: 0 });
  assert.equal(r.res.headers.get('Access-Control-Allow-Origin'), GAME);
  assert.equal(r.res.headers.get('Cache-Control'), 'no-store');
  const o = E.REGISTRO.oggetti.get(`registro/${oggi}/abcdefgh/00001-ab12.jsonl`);
  assert.ok(o, 'oggetto scritto'); assert.equal(o.testo, testo());
  // il programma Windows (https://localhost:8443) scrive anche lui; una porta qualunque di localhost con «:*»
  assert.equal((await manda(E, { origin: PC, parte: '00002-cd34' })).res.status, 200);
  assert.equal((await manda(E, { origin: 'https://localhost:9000', parte: '00003-cd34' })).res.status, 200);
  // domanda preliminare del browser
  const pre = await worker.fetch(new Request(BASE + '/', { method: 'OPTIONS', headers: { Origin: GAME, 'Access-Control-Request-Method': 'POST' } }), E);
  assert.equal(pre.status, 204); assert.equal(pre.headers.get('Access-Control-Allow-Origin'), GAME); assert.match(pre.headers.get('Access-Control-Allow-Methods'), /POST/);
});

test('Worker del registro: origine non permessa o assente → 403, niente scritto', async () => {
  const E = env();
  for (const origin of ['https://altro.example', 'https://localhost.evil.example', 'https://localhost:8443.evil.example', null]){
    const r = await manda(E, { origin }); assert.equal(r.res.status, 403, String(origin)); assert.equal(r.res.headers.get('Access-Control-Allow-Origin'), null);
  }
  assert.equal(E.REGISTRO.oggetti.size, 0);
  const pre = await worker.fetch(new Request(BASE + '/', { method: 'OPTIONS', headers: { Origin: 'https://altro.example' } }), E);
  assert.equal(pre.status, 403);
  // senza ALLOWED_ORIGINS (prova): scrive chiunque, con «*»
  const r = await manda(env({ ALLOWED_ORIGINS: '' }), { origin: 'https://altro.example' });
  assert.equal(r.res.status, 200); assert.equal(r.res.headers.get('Access-Control-Allow-Origin'), '*');
});

test('Worker del registro: righe non del registro e campi non previsti si scartano; nomi, indirizzi ed e-mail non passano', async () => {
  const E = env();
  const body = [JSON.stringify({ k: 'colpo', t: 10, gesto: 'dritto', nome: 'Mario Rossi', nickname: 'SuperMario', campoNuovo: 'x', tel: { so: 'Android 14', ua: 'Mozilla/5.0 (Linux; Android 14; SM-S911B)', ip: '192.168.1.7' } }),
    JSON.stringify({ k: 'errore', t: 11, msg: 'fetch fallita verso https://203.0.113.5:8443/natpf/tennis/racchetta.html?room=XY99&token=abc da mario.rossi@example.com', file: 'index-abc.js', riga: 3 }),
    JSON.stringify({ k: 'video', t: 12, dati: 'AAAA' }), 'non è json', JSON.stringify(['k', 'colpo']), JSON.stringify({ k: 'punto', t: -1 }), JSON.stringify({ k: 'punto', t: 20, pt: [1, 0, 0, 0], msg: 'x'.repeat(1000) }), JSON.stringify({ k: 'punto', t: 21, msg: 'x'.repeat(5000) })].join('\n');
  const r = await manda(E, { body });
  assert.equal(r.res.status, 200); assert.deepEqual(r.body, { ok: true, righe: 3, scartate: 5 });
  const scritto = E.REGISTRO.oggetti.get(`registro/${oggi}/abcdefgh/00001-ab12.jsonl`).testo;
  for (const vietato of ['Mario', 'SuperMario', 'campoNuovo', 'Mozilla', '192.168', '203.0.113', 'room=', 'token', '@example.com', 'AAAA', 'non è json']) assert.ok(!scritto.includes(vietato), vietato);
  const righe = scritto.trim().split('\n').map(l => JSON.parse(l));
  assert.deepEqual(righe[0], { k: 'colpo', t: 10, gesto: 'dritto', tel: { so: 'Android 14' } });
  assert.match(righe[1].msg, /\[e-mail\]/); assert.equal(righe[1].file, 'index-abc.js');
  assert.ok(righe[2].msg.length <= LIMITI.maxMessaggio);
  for (const row of righe) assert.deepEqual(F.controllaRiga(row), [], JSON.stringify(row));
  // un blocco senza nemmeno una riga del registro: 422, niente scritto
  const no = await manda(E, { parte: '00002-zz99', body: 'ciao\n{"k":"video","t":1}\n' });
  assert.equal(no.res.status, 422); assert.equal(E.REGISTRO.oggetti.has(`registro/${oggi}/abcdefgh/00002-zz99.jsonl`), false);
});

test('Worker del registro: lo stesso blocco mandato due volte non si riscrive (niente doppioni)', async () => {
  const E = env();
  assert.deepEqual((await manda(E)).body, { ok: true, righe: 3, scartate: 0 });
  const puts = E.REGISTRO.ops.put;
  const r = await manda(E, { body: testo([{ k: 'nota', t: 1, perse: 9 }]) });
  assert.equal(r.res.status, 200); assert.deepEqual(r.body, { ok: true, doppione: true });
  assert.equal(E.REGISTRO.ops.put, puts, 'nessuna scrittura');
  assert.equal(E.REGISTRO.oggetti.get(`registro/${oggi}/abcdefgh/00001-ab12.jsonl`).testo, testo());
});

test('Worker del registro: parametri sbagliati, giorno troppo lontano, blocco troppo grande, gzip', async () => {
  const E = env();
  for (const bad of [{ giorno: '2026-13-40' }, { giorno: '../../x' }, { giorno: '2020-01-01' }, { giorno: '2099-01-01' }, { postazione: 'ABCDEFGH' }, { postazione: 'abc' }, { postazione: 'abc/defg' }, { parte: '1' }, { parte: '00001-ab12/../x' }])
    assert.equal((await manda(E, bad)).res.status, 400, JSON.stringify(bad));
  // un blocco di ieri o di un mese fa (stand senza rete) passa
  const ieri = new Date(Date.now() - 30*86400000).toISOString().slice(0, 10);
  assert.equal((await manda(E, { giorno: ieri })).res.status, 200);
  const grande = await manda(E, { parte: '00009-big1', body: JSON.stringify({ k: 'nota', t: 1 }) + '\n' + 'x'.repeat(LIMITI.maxBlocco) });
  assert.equal(grande.res.status, 413);
  // compresso: si apre e si controlla come l'altro
  const gz = await manda(E, { parte: '00010-gzip', z: 'gzip', body: zlib.gzipSync(testo()) });
  assert.equal(gz.res.status, 200); assert.equal(E.REGISTRO.oggetti.get(`registro/${oggi}/abcdefgh/00010-gzip.jsonl`).testo, testo());
  assert.equal((await manda(E, { parte: '00011-gzip', z: 'gzip', body: 'non gzip' })).res.status, 400);
  // un blocco piccolo che aperto diventa enorme: rifiutato
  const bomba = await manda(E, { parte: '00012-gzip', z: 'gzip', body: zlib.gzipSync(Buffer.alloc(LIMITI.maxAperto + 10, 0x20)) });
  assert.equal(bomba.res.status, 413);
  assert.equal((await manda(E, { method: 'PUT' })).res.status, 405);
  assert.equal((await manda(E, { method: 'DELETE' })).res.status, 405);
});

test('Worker del registro: tetto del giorno, tetto di tutto il registro (2 GB di base) e freno alle richieste', async () => {
  // giorno pieno (MAX_GIORNO_MB piccolo per la prova): 507, niente scritto; gli altri giorni passano
  const E = env({ MAX_GIORNO_MB: '0.0003' });
  assert.equal((await manda(E)).res.status, 200);
  const pieno = await manda(E, { parte: '00002-ab12' });
  assert.equal(pieno.res.status, 507); assert.match(pieno.body.error, /giorno pieno/);
  assert.equal(E.REGISTRO.oggetti.has(`registro/${oggi}/abcdefgh/00002-ab12.jsonl`), false);
  // registro pieno: tutti i giorni insieme
  const T = env({ MAX_TOTALE_MB: '0.0003' }), ieri = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  assert.equal((await manda(T, { giorno: ieri })).res.status, 200);
  const tot = await manda(T); assert.equal(tot.res.status, 507); assert.match(tot.body.error, /registro pieno/);
  // cancellato il giorno vecchio dal pannello di R2, «Mostra i giorni» rifà il conto e si riscrive
  for (const k of [...T.REGISTRO.oggetti.keys()]) if (k.startsWith(`registro/${ieri}/`)) T.REGISTRO.oggetti.delete(k);
  assert.equal((await leggi(T, '/giorni')).res.status, 200);
  assert.equal((await manda(T)).res.status, 200);
  // freno: più di 120 scritture al minuto dallo stesso indirizzo → 429 con Retry-After; un altro indirizzo passa
  const R = env(); let ultimo = null;
  for (let i = 0; i <= LIMITI.invioAlMinuto; i++) ultimo = await manda(R, { parte: `${String(i).padStart(5, '0')}-ab12`, ip: '198.51.100.1' });
  assert.equal(ultimo.res.status, 429); assert.equal(ultimo.res.headers.get('Retry-After'), '30');
  assert.equal((await manda(R, { parte: '09999-ab12', ip: '198.51.100.2' })).res.status, 200);
  // l'indirizzo di chi scrive non finisce nello spazio
  assert.ok(![...R.REGISTRO.oggetti.entries()].some(([k, o]) => k.includes('198.51') || o.testo.includes('198.51')));
});

test('Worker del registro: senza il collegamento al bucket non parte (stato chiaro, 503) e non accetta righe', async () => {
  const E = { CHIAVE_LETTURA: CHIAVE, ALLOWED_ORIGINS: GAME };
  const stato = await leggi(E, '/', { chiave: null });
  assert.equal(stato.res.status, 503); assert.equal(stato.body.ok, false); assert.equal(stato.body.registro, 'non pronto'); assert.equal(stato.body.spazio, false);
  assert.match(stato.body.error, /REGISTRO/); assert.match(stato.body.error, /privato/);
  const r = await manda(E); assert.equal(r.res.status, 503); assert.match(r.body.error, /R2/);
  assert.equal((await leggi(E, '/giorni')).res.status, 503);
  const pagina = await leggi(E, '/', { chiave: null, accept: 'text/html' });
  assert.equal(pagina.res.status, 503); assert.match(pagina.text, /NON è pronto/);
  // con il bucket: pronto
  const ok = await leggi(env(), '/', { chiave: null });
  assert.equal(ok.res.status, 200); assert.deepEqual(ok.body, { ok: true, registro: 'pronto', spazio: true, chiave: true });
});

test('Worker del registro: senza la chiave niente lettura, niente elenco, niente cancellazione', async () => {
  const E = env(); await manda(E);
  for (const path of ['/giorni', `/scarica?giorno=${oggi}`]){
    assert.equal((await leggi(E, path, { chiave: null })).res.status, 401, path);
    const sbagliata = await leggi(E, path, { chiave: 'chiave-sbagliata-999' });
    assert.equal(sbagliata.res.status, 401); assert.ok(!sbagliata.text.includes(CHIAVE)); assert.ok(!sbagliata.text.includes('partita'));
  }
  // la pagina e lo stato non contengono dati né la chiave
  for (const accept of ['text/html', 'application/json']){
    const p = await leggi(E, '/', { chiave: null, accept });
    assert.equal(p.res.status, 200); assert.ok(!p.text.includes(CHIAVE)); assert.ok(!p.text.includes('"k":"partita"')); assert.ok(!p.text.includes('abcdefgh'));
  }
  // nessun indirizzo dà gli oggetti: né il percorso del file né altri metodi
  assert.equal((await leggi(E, `/registro/${oggi}/abcdefgh/00001-ab12.jsonl`)).res.status, 404);
  const del = await worker.fetch(new Request(`${BASE}/registro/${oggi}/abcdefgh/00001-ab12.jsonl`, { method: 'DELETE', headers: { Authorization: `Bearer ${CHIAVE}` } }), E);
  assert.equal(del.status, 405); assert.equal(E.REGISTRO.oggetti.size, 2);
  // chiave non impostata o troppo corta: la lettura è chiusa per tutti
  for (const k of ['', 'corta']) assert.equal((await leggi(env({ CHIAVE_LETTURA: k }), '/giorni', { chiave: k || 'x' })).res.status, 403);
  // troppe chiavi sbagliate dallo stesso indirizzo: 429, anche con quella giusta, per dieci minuti
  for (let i = 0; i < LIMITI.erroriChiave; i++) await leggi(E, '/giorni', { chiave: `sbagliata-numero-${i}`, ip: '198.51.100.77' });
  assert.equal((await leggi(E, '/giorni', { ip: '198.51.100.77' })).res.status, 429);
  assert.equal((await leggi(E, '/giorni', { ip: '198.51.100.78' })).res.status, 200);
});

test('Worker del registro: con la chiave, elenco dei giorni e scarico di un giorno a pezzi (mai più di 50 operazioni per richiesta)', async () => {
  const E = env(), ieri = new Date(Date.now() - 86400000).toISOString().slice(0, 10), N = 95;
  for (let i = 1; i <= N; i++) await manda(E, { parte: `${String(i).padStart(5, '0')}-ab12`, postazione: i % 2 ? 'abcdefgh' : 'zzzz9999', body: testo([{ k: 'punto', t: i, p: i }]), ip: `198.51.100.${i % 200}` });
  await manda(E, { giorno: ieri });
  for (const query of [false, true]){
    const g = await leggi(E, '/giorni', { query });
    assert.equal(g.res.status, 200);
    assert.deepEqual(g.body.giorni.map(x => x.giorno), [ieri, oggi]);
    assert.equal(g.body.giorni[1].blocchi, N); assert.equal(g.body.giorni[1].righe, N); assert.equal(g.body.giorni[0].righe, 3);
    assert.ok(g.body.byte > 0 && g.body.maxByte === LIMITI.maxTotale);
  }
  // a pezzi: l'intestazione dice da dove riprendere; alla fine tutte le righe, una volta sola, con la riga del blocco
  let da = '', tutto = '', giri = 0;
  do {
    const prima = { ...E.REGISTRO.ops };
    const r = await leggi(E, `/scarica?a-pezzi=1&giorno=${oggi}${da ? `&da=${encodeURIComponent(da)}` : ''}`);
    assert.equal(r.res.status, 200); assert.match(r.res.headers.get('Content-Disposition'), /registro-\d{4}-\d{2}-\d{2}\.jsonl/);
    const fatte = Object.keys(prima).reduce((a, k) => a + E.REGISTRO.ops[k] - prima[k], 0);
    assert.ok(fatte <= 50, `operazioni su R2 in una richiesta: ${fatte}`);
    tutto += r.text; da = r.res.headers.get('X-Registro-Continua') || ''; giri++;
  } while (da && giri < 10);
  assert.equal(giri, Math.ceil(N/LIMITI.pagina));
  const righe = tutto.trim().split('\n').map(l => JSON.parse(l));
  assert.equal(righe.filter(r => r.k === 'blocco').length, N);
  assert.deepEqual(righe.filter(r => r.k === 'punto').map(r => r.p).sort((a, b) => a - b), Array.from({ length: N }, (_, i) => i + 1));
  assert.deepEqual(righe[0], { k: 'blocco', giorno: oggi, postazione: 'abcdefgh', parte: '00001-ab12' });
  assert.ok(!tutto.includes('"continua"'));
  // senza «a-pezzi» (indirizzo aperto a mano): se non è tutto, l'ultima riga lo dice
  const mano = await leggi(E, `/scarica?giorno=${oggi}`, { query: true });
  assert.match(mano.text.trim().split('\n').pop(), /"k":"nota".*"continua"/);
  assert.equal((await leggi(E, '/scarica?giorno=sempre')).res.status, 400);
});

test('Worker del registro: righeBuone tiene l\'ordine e conta le righe scartate', () => {
  const r = righeBuone(testo() + '\n\n{"k":"boh","t":1}\n{rotto\n');
  assert.equal(r.righe.length, 3); assert.equal(r.scartate, 2);
  assert.equal(r.righe.join('\n') + '\n', testo());
});
