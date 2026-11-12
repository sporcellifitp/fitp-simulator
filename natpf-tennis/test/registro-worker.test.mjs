// Worker del registro dello stand (cloudflare/registro-worker.js) con uno spazio R2 finto (scripts/registro/r2-finto.mjs):
// solo aggiunte senza la chiave, niente lettura né elenco né cancellazione, limiti, origine, CORS, righe e campi non
// previsti scartati, niente doppioni, blocchi salvati compressi, indice dello spazio per giorno, tetto totale che
// rifiuta (507) e non cancella mai niente senza la chiave, scarico a pezzi, cancellazione e ricalcolo con la chiave.
// Nessuna chiave vera: quella delle prove è scritta qui e non serve a niente.
import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import worker, { LIMITI, TIPI, CAMPI, MAPPE, CAMPI_VIETATI, CONTI, pulisci, righeBuone, dimentica, oggiItalia } from '../cloudflare/registro-worker.js';
import * as F from '../src/natpf/registro/registro_formato.js';
import { r2Finto } from '../scripts/registro/r2-finto.mjs';

const GAME = 'https://gioco.example.workers.dev', PC = 'https://localhost:8443', BASE = 'https://registro.example.workers.dev';
const CHIAVE = 'chiave-di-prova-123';
const oggi = new Date().toISOString().slice(0, 10);
const env = (extra = {}) => ({ REGISTRO: r2Finto(), CHIAVE_LETTURA: CHIAVE, ALLOWED_ORIGINS: `${GAME}, https://localhost:*`, ...extra });
const RIGHE = [{ k: 'partita', t: 100, n: 1, modo: 'cpu', chi: 'adulto' }, { k: 'colpo', t: 2300, n: 1, p: 1, chi: 'g', gesto: 'dritto', ms: -40, voto: 'ritardo', e: 'dentro' }, { k: 'partita.fine', t: 90000, n: 1, esito: 'finita' }];
const testo = (rows = RIGHE) => rows.map(r => JSON.stringify(r)).join('\n') + '\n';
// la riga che il Worker mette in testa a ogni blocco salvato
const testa = (giorno = oggi, postazione = 'abcdefgh', parte = '00001-ab12') => JSON.stringify({ k: 'blocco', giorno, postazione, parte }) + '\n';
const blocchi = E => [...E.REGISTRO.oggetti.keys()].filter(k => k.endsWith('.jsonl.gz'));
async function manda(E, { giorno = oggi, postazione = 'abcdefgh', parte = '00001-ab12', body = testo(), origin = GAME, z = null, ip = '203.0.113.7', method = 'POST', now = null } = {}){
  const u = new URL(BASE + '/'); u.search = new URLSearchParams({ giorno, postazione, parte, ...(z ? { z } : {}) }).toString();
  const res = await worker.fetch(new Request(u, { method, headers: { 'Content-Type': 'text/plain', ...(origin ? { Origin: origin } : {}), 'CF-Connecting-IP': ip }, body: method === 'POST' ? body : undefined }), E, null, now);
  const t = await res.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return { res, body: j, text: t };
}
async function leggi(E, path, { chiave = CHIAVE, query = false, ip = '203.0.113.9', accept = 'application/json', method = 'GET', now = null, bytes = false } = {}){
  const u = new URL(BASE + path); if (query && chiave) u.searchParams.set('chiave', chiave);
  const res = await worker.fetch(new Request(u, { method, headers: { Accept: accept, 'CF-Connecting-IP': ip, ...(chiave && !query ? { Authorization: `Bearer ${chiave}` } : {}) } }), E, null, now);
  if (bytes) return { res, bytes: Buffer.from(await res.arrayBuffer()) };
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
  // testi tra virgolette nei messaggi d'errore: via, come nel gioco
  const virg = { k: 'errore', t: 1, msg: "Cannot read properties of undefined (reading 'Zorbetta')", file: 'a.js' };
  assert.deepEqual(pulisci(virg), F.pulisci(virg)); assert.equal(pulisci(virg).msg, 'Cannot read properties of undefined (reading [testo])');
});

test('Worker del registro: testi enormi costano pochi millisecondi (il testo si taglia prima delle espressioni)', () => {
  for (const s of ['x'.repeat(1024*1024), 'a.'.repeat(500000)]){
    const t0 = performance.now(), row = pulisci({ k: 'errore', t: 1, msg: s, file: s }), ms = performance.now() - t0;
    assert.ok(row.msg.length <= LIMITI.maxMessaggio && row.file.length <= LIMITI.maxTesto); assert.ok(ms < 20, `${ms.toFixed(1)} ms`);
  }
  // un blocco di righe costruite apposta con parole di 2.000 caratteri: veloce
  const body = Array.from({ length: 30 }, (_, i) => JSON.stringify({ k: 'errore', t: i, msg: 'z'.repeat(1990) })).join('\n');
  const t0 = performance.now(); righeBuone(body); assert.ok(performance.now() - t0 < 30, `${(performance.now() - t0).toFixed(1)} ms`);
});

test('Worker del registro: un corpo senza Content-Length si legge a pezzi e si ferma al tetto', async () => {
  const E = env(); let letti = 0;
  const stream = new ReadableStream({ pull(c){ if (letti > 4*LIMITI.maxBlocco){ c.close(); return; } const pezzo = new TextEncoder().encode('x'.repeat(65536)); letti += pezzo.length; c.enqueue(pezzo); } });
  const u = new URL(BASE + '/'); u.search = new URLSearchParams({ giorno: oggi, postazione: 'abcdefgh', parte: '00001-ab12' }).toString();
  const res = await worker.fetch(new Request(u, { method: 'POST', headers: { Origin: GAME }, body: stream, duplex: 'half' }), E);
  assert.equal(res.status, 413); assert.ok(letti <= LIMITI.maxBlocco + 2*65536, `letti ${letti} byte`);
});

test('Worker del registro: un blocco si scrive in R2 sotto registro/<giorno>/<postazione>/<parte>.jsonl.gz, compresso, con CORS per il gioco', async () => {
  const E = env(), r = await manda(E);
  assert.equal(r.res.status, 200); assert.deepEqual(r.body, { ok: true, righe: 3, scartate: 0 });
  assert.equal(r.res.headers.get('Access-Control-Allow-Origin'), GAME);
  assert.equal(r.res.headers.get('Cache-Control'), 'no-store');
  const o = E.REGISTRO.oggetti.get(`registro/${oggi}/abcdefgh/00001-ab12.jsonl.gz`);
  assert.ok(o, 'oggetto scritto'); assert.equal(o.bytes[0], 0x1f); assert.equal(o.bytes[1], 0x8b);
  // dentro: la riga del blocco e poi le righe del gioco, in ordine
  assert.equal(o.testo, testa() + testo());
  assert.deepEqual(o.customMetadata, { righe: '3', partite: '1' });
  // l'indice dello spazio dice il peso vero del giorno, e un invio costa poche operazioni e nessun elenco del bucket
  const conti = JSON.parse(E.REGISTRO.oggetti.get(CONTI).testo);
  assert.deepEqual(conti.giorni[oggi], { byte: o.size, blocchi: 1, righe: 3, partite: 1 });
  assert.equal(E.REGISTRO.ops.list, 0); assert.ok(E.REGISTRO.ops.put + E.REGISTRO.ops.get + E.REGISTRO.ops.head <= 4, JSON.stringify(E.REGISTRO.ops));
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
  const scritto = E.REGISTRO.oggetti.get(`registro/${oggi}/abcdefgh/00001-ab12.jsonl.gz`).testo.slice(testa().length);
  for (const vietato of ['Mario', 'SuperMario', 'campoNuovo', 'Mozilla', '192.168', '203.0.113', 'room=', 'token', '@example.com', 'AAAA', 'non è json']) assert.ok(!scritto.includes(vietato), vietato);
  const righe = scritto.trim().split('\n').map(l => JSON.parse(l));
  assert.deepEqual(righe[0], { k: 'colpo', t: 10, gesto: 'dritto', tel: { so: 'Android 14' } });
  assert.match(righe[1].msg, /\[e-mail\]/); assert.equal(righe[1].file, 'index-abc.js');
  assert.ok(righe[2].msg.length <= LIMITI.maxMessaggio);
  for (const row of righe) assert.deepEqual(F.controllaRiga(row), [], JSON.stringify(row));
  // un blocco senza nemmeno una riga del registro: 422, niente scritto
  const no = await manda(E, { parte: '00002-zz99', body: 'ciao\n{"k":"video","t":1}\n' });
  assert.equal(no.res.status, 422); assert.equal(blocchi(E).length, 1);
});

test('Worker del registro: lo stesso blocco mandato due volte non si riscrive (niente doppioni)', async () => {
  const E = env();
  assert.deepEqual((await manda(E)).body, { ok: true, righe: 3, scartate: 0 });
  const puts = E.REGISTRO.ops.put;
  const r = await manda(E, { body: testo([{ k: 'nota', t: 1, perse: 9 }]) });
  assert.equal(r.res.status, 200); assert.deepEqual(r.body, { ok: true, doppione: true });
  assert.equal(E.REGISTRO.ops.put, puts, 'nessuna scrittura');
  assert.equal(E.REGISTRO.oggetti.get(`registro/${oggi}/abcdefgh/00001-ab12.jsonl.gz`).testo, testa() + testo());
  assert.equal(JSON.parse(E.REGISTRO.oggetti.get(CONTI).testo).giorni[oggi].blocchi, 1, 'il doppione non si riconta');
});

test('Worker del registro: parametri sbagliati, giorno troppo lontano, blocco troppo grande, gzip', async () => {
  const E = env();
  for (const bad of [{ giorno: '2026-13-40' }, { giorno: '../../x' }, { postazione: 'ABCDEFGH' }, { postazione: 'abc' }, { postazione: 'abc/defg' }, { parte: '1' }, { parte: '00001-ab12/../x' }])
    assert.equal((await manda(E, bad)).res.status, 400, JSON.stringify(bad));
  // giorno fuori dalla finestra (più di 7 giorni fa, dopo domani: orologio del PC sbagliato): 409, il gioco lo tiene in coda
  const giorno = d => new Date(Date.now() + d*86400000).toISOString().slice(0, 10);
  for (const g of ['2020-01-01', '2099-01-01', giorno(-9), giorno(3)]){ const r = await manda(E, { giorno: g }); assert.equal(r.res.status, 409, g); assert.match(r.body.error, /orologio/); }
  assert.equal(blocchi(E).length, 0);
  // un blocco di ieri o di una settimana fa (stand senza rete) passa
  assert.equal((await manda(E, { giorno: giorno(-1) })).res.status, 200);
  assert.equal((await manda(E, { giorno: giorno(-7), parte: '00002-ab12' })).res.status, 200);
  const grande = await manda(E, { parte: '00009-big1', body: JSON.stringify({ k: 'nota', t: 1 }) + '\n' + 'x'.repeat(LIMITI.maxBlocco) });
  assert.equal(grande.res.status, 413);
  // compresso: si apre e si controlla come l'altro
  const gz = await manda(E, { parte: '00010-gzip', z: 'gzip', body: zlib.gzipSync(testo()) });
  assert.equal(gz.res.status, 200); assert.equal(E.REGISTRO.oggetti.get(`registro/${oggi}/abcdefgh/00010-gzip.jsonl.gz`).testo, testa(oggi, 'abcdefgh', '00010-gzip') + testo());
  // il gioco non dice «z=gzip»: il Worker riconosce il blocco compresso dai primi due byte
  const solo = await manda(E, { parte: '00013-gzip', body: zlib.gzipSync(testo()) });
  assert.equal(solo.res.status, 200); assert.deepEqual(solo.body, { ok: true, righe: 3, scartate: 0 });
  assert.equal(E.REGISTRO.oggetti.get(`registro/${oggi}/abcdefgh/00013-gzip.jsonl.gz`).testo, testa(oggi, 'abcdefgh', '00013-gzip') + testo());
  assert.equal((await manda(E, { parte: '00011-gzip', z: 'gzip', body: 'non gzip' })).res.status, 400);
  // un blocco piccolo che aperto diventa enorme: rifiutato
  const bomba = await manda(E, { parte: '00012-gzip', z: 'gzip', body: zlib.gzipSync(Buffer.alloc(LIMITI.maxAperto + 10, 0x20)) });
  assert.equal(bomba.res.status, 413);
  assert.equal((await manda(E, { method: 'PUT' })).res.status, 405);
  assert.equal((await manda(E, { method: 'DELETE' })).res.status, 405);
});

test('Worker del registro: tetto del giorno (507, il gioco tiene in coda) e freno alle richieste', async () => {
  // giorno pieno (MAX_GIORNO_MB piccolo per la prova): 507, niente scritto; gli altri giorni passano
  const E = env({ MAX_GIORNO_MB: '0.0003' });
  assert.equal((await manda(E)).res.status, 200);
  const pieno = await manda(E, { parte: '00002-ab12' });
  assert.equal(pieno.res.status, 507); assert.match(pieno.body.error, /giorno pieno/);
  assert.equal(blocchi(E).length, 1);
  const ieri = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  assert.equal((await manda(E, { giorno: ieri })).res.status, 200);
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
  // nemmeno cancellare o ricalcolare
  for (const [path, method] of [[`/giorni?giorno=${oggi}`, 'DELETE'], ['/giorni?tutto=si', 'DELETE'], ['/ricalcola', 'POST']]){
    assert.equal((await leggi(E, path, { chiave: null, method })).res.status, 401, `${method} ${path}`);
    assert.equal((await leggi(E, path, { chiave: 'chiave-sbagliata-999', method, ip: '203.0.113.10' })).res.status, 401, `${method} ${path}`);
  }
  assert.equal(blocchi(E).length, 1);
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
  assert.equal((await leggi(E, `/registro/${oggi}/abcdefgh/00001-ab12.jsonl.gz`)).res.status, 404);
  const del = await worker.fetch(new Request(`${BASE}/registro/${oggi}/abcdefgh/00001-ab12.jsonl.gz`, { method: 'DELETE', headers: { Authorization: `Bearer ${CHIAVE}` } }), E);
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
  const g0 = await leggi(E, '/giorni');
  for (const query of [false, true]){
    const g = await leggi(E, '/giorni', { query });
    assert.equal(g.res.status, 200);
    assert.deepEqual(g.body.giorni.map(x => x.giorno), [ieri, oggi]);
    assert.equal(g.body.giorni[1].blocchi, N); assert.equal(g.body.giorni[1].righe, N); assert.equal(g.body.giorni[0].righe, 3);
    assert.ok(g.body.byte > 0 && g.body.maxByte === LIMITI.maxTotale);
  }
  assert.equal(g0.body.byte, E.REGISTRO.byteBlocchi(), 'lo spazio detto è quello vero'); assert.equal(g0.body.giorni[0].partite, 1); assert.deepEqual(g0.body.cancellati, []);
  // a pezzi: l'intestazione dice da dove riprendere; alla fine tutte le righe, una volta sola, con la riga del blocco.
  // Lo scarico è un .jsonl.gz: i blocchi compressi uno dopo l'altro (si apre come un gzip solo)
  let da = '', giri = 0; const pezzi = [];
  do {
    const prima = { ...E.REGISTRO.ops };
    const r = await leggi(E, `/scarica?a-pezzi=1&giorno=${oggi}${da ? `&da=${encodeURIComponent(da)}` : ''}`, { bytes: true });
    assert.equal(r.res.status, 200); assert.match(r.res.headers.get('Content-Disposition'), /registro-\d{4}-\d{2}-\d{2}\.jsonl\.gz/); assert.equal(r.res.headers.get('Content-Type'), 'application/gzip');
    const fatte = Object.keys(prima).reduce((a, k) => a + E.REGISTRO.ops[k] - prima[k], 0);
    assert.ok(fatte <= 50, `operazioni su R2 in una richiesta: ${fatte}`);
    pezzi.push(r.bytes); da = r.res.headers.get('X-Registro-Continua') || ''; giri++;
  } while (da && giri < 10);
  assert.equal(giri, Math.ceil(N/LIMITI.pagina));
  const tutto = zlib.gunzipSync(Buffer.concat(pezzi)).toString('utf8');
  const righe = tutto.trim().split('\n').map(l => JSON.parse(l));
  assert.equal(righe.filter(r => r.k === 'blocco').length, N);
  assert.deepEqual(righe.filter(r => r.k === 'punto').map(r => r.p).sort((a, b) => a - b), Array.from({ length: N }, (_, i) => i + 1));
  assert.deepEqual(righe[0], { k: 'blocco', giorno: oggi, postazione: 'abcdefgh', parte: '00001-ab12' });
  assert.ok(!tutto.includes('"continua"'));
  // senza «a-pezzi» (indirizzo aperto a mano): se non è tutto, l'ultima riga lo dice
  const mano = await leggi(E, `/scarica?giorno=${oggi}`, { query: true, bytes: true });
  assert.match(zlib.gunzipSync(mano.bytes).toString('utf8').trim().split('\n').pop(), /"k":"nota".*"continua"/);
  assert.equal((await leggi(E, '/scarica?giorno=sempre')).res.status, 400);
});

test('Worker del registro: righeBuone tiene l\'ordine e conta le righe scartate', () => {
  const r = righeBuone(testo() + '\n\n{"k":"boh","t":1}\n{rotto\n');
  assert.equal(r.righe.length, 3); assert.equal(r.scartate, 2);
  assert.equal(r.righe.join('\n') + '\n', testo());
});

/* ---------- lo spazio non è infinito: compressione, tetto totale, cancellazione ---------- */
const ORA = Date.parse('2026-11-14T10:00:00Z');
// un blocco di colpi diversi tra loro (si comprime, ma non a zero): i = numero del blocco
const colpi = (i, n = 40) => testo(Array.from({ length: n }, (_, j) => ({ k: 'colpo', t: 1000*i + 37*j, n: i, gesto: j % 3 ? 'dritto' : 'rovescio', ms: (i*131 + j*7919) % 400 - 200, voto: j % 4 ? 'buono' : 'perfetto', f: ((i + j) % 10)/10, d: ((j*7) % 20 - 10)/10, x: (j % 9)/2, z: -(i % 7) - j/10 })));

test('Worker del registro: i blocchi si salvano compressi (gzip), circa un quinto del testo o meno', async () => {
  const E = env(), body = colpi(1, 400);
  assert.equal((await manda(E, { body, now: ORA, giorno: '2026-11-14' })).res.status, 200);
  const o = E.REGISTRO.oggetti.get(blocchi(E)[0]);
  assert.equal(o.testo, testa('2026-11-14') + body);
  assert.ok(o.size < body.length/4, `compresso ${o.size} byte, in chiaro ${body.length}`);
  // quello che conta per i tetti è il peso compresso
  assert.equal((await leggi(E, '/giorni', { now: ORA })).body.byte, o.size);
});

test('Worker del registro: sopra il tetto totale non cancella niente (507, il gioco tiene in coda); i giorni già scritti restano', async () => {
  // misura di un blocco compresso, poi un tetto che ne tiene circa sei e mezzo
  const P = env(); await manda(P, { body: colpi(0), giorno: '2026-11-14', now: ORA });
  const uno = P.REGISTRO.byteBlocchi(), E = env({ MAX_TOTALE_MB: String(uno*6.5/1024/1024) });
  let i = 0;
  for (const g of ['2026-11-10', '2026-11-11', '2026-11-12']) for (let k = 0; k < 2; k++)
    assert.equal((await manda(E, { giorno: g, parte: `${String(++i).padStart(5, '0')}-ab12`, body: colpi(i), now: Date.parse(`${g}T12:00:00Z`) })).res.status, 200, `${g} ${k}`);
  const prima = blocchi(E).sort();
  // il settimo blocco supererebbe il tetto: 507 «spazio pieno», niente scritto e niente cancellato
  const pieno = await manda(E, { giorno: '2026-11-14', parte: '00099-ab12', body: colpi(99), now: ORA });
  assert.equal(pieno.res.status, 507); assert.match(pieno.body.error, /spazio pieno/);
  assert.deepEqual(blocchi(E).sort(), prima); assert.equal(E.REGISTRO.ops.delete, 0);
  const s = (await leggi(E, '/giorni', { now: ORA })).body;
  assert.deepEqual(s.giorni.map(g => [g.giorno, g.blocchi]), [['2026-11-10', 2], ['2026-11-11', 2], ['2026-11-12', 2]]);
  assert.deepEqual(s.cancellati, []); assert.equal(s.byte, E.REGISTRO.byteBlocchi()); assert.ok(s.byte <= s.maxByte);
  // l'utente, con la chiave, cancella un giorno già scaricato: c'è di nuovo posto e il blocco rimasto in coda entra
  assert.equal((await leggi(E, '/giorni?giorno=2026-11-10', { method: 'DELETE', now: ORA })).res.status, 200);
  assert.equal((await manda(E, { giorno: '2026-11-14', parte: '00099-ab12', body: colpi(99), now: ORA })).res.status, 200);
  // senza superare il tetto non si elenca e non si cancella niente: lo spazio si conta dall'indice
  const C = env(); for (let k = 1; k <= 20; k++) await manda(C, { giorno: '2026-11-14', parte: `${String(k).padStart(5, '0')}-ab12`, body: colpi(k), now: ORA });
  assert.equal(C.REGISTRO.ops.list, 0); assert.equal(C.REGISTRO.ops.delete, 0);
  assert.ok(C.REGISTRO.ops.put + C.REGISTRO.ops.get + C.REGISTRO.ops.head <= 20*4, JSON.stringify(C.REGISTRO.ops));
});

// Revisione del 12/11 (bloccante): l'indirizzo del Worker sta nel pacchetto web pubblico. Chi lo conosce, senza chiave e
// con un'origine finta, manda righe valide di giorni scelti da lui finché lo spazio è pieno: prima il Worker cancellava da
// solo i giorni più vecchi, cioè quelli veri dello stand. Adesso può al più riempire lo spazio: i giorni veri restano.
test('Worker del registro: scritture estranee senza chiave oltre il tetto lasciano intatti i giorni già scritti', async () => {
  const P = env(); await manda(P, { body: colpi(0), giorno: '2026-11-14', now: ORA });
  const uno = P.REGISTRO.byteBlocchi(), E = env({ MAX_TOTALE_MB: String(uno*8/1024/1024), MAX_GIORNO_MB: String(uno*2.5/1024/1024) });
  // i blocchi veri dello stand, del 10 e dell'11
  const veri = [];
  for (const [g, parte] of [['2026-11-10', '00001-ver1'], ['2026-11-11', '00001-ver2']]){
    assert.equal((await manda(E, { giorno: g, parte, body: colpi(+parte.slice(-1)), now: Date.parse(`${g}T12:00:00Z`) })).res.status, 200);
    veri.push(`registro/${g}/abcdefgh/${parte}.jsonl.gz`);
  }
  const testi = veri.map(k => E.REGISTRO.oggetti.get(k).testo);
  // l'attacco: tante richieste, origine finta (curl), giorni di tutta la finestra e oltre, testo poco comprimibile
  const st = {}; let n = 0;
  for (let d = -10; d <= 3; d++) for (let k = 0; k < 4; k++){
    const g = new Date(ORA + d*86400000).toISOString().slice(0, 10);
    const rumore = Array.from({ length: 60 }, (_, j) => JSON.stringify({ k: 'nota', t: j, msg: Math.random().toString(36).repeat(5) })).join('\n') + '\n';
    const r = await manda(E, { giorno: g, postazione: 'zzzzzzzz', parte: `${String(++n).padStart(5, '0')}-evil`, body: rumore, origin: GAME, ip: `198.51.100.${n % 200}`, now: ORA });
    st[r.res.status] = (st[r.res.status] || 0) + 1;
  }
  assert.ok(st[507] > 0, `lo spazio si è riempito: ${JSON.stringify(st)}`); assert.ok(st[409] > 0, 'giorni fuori dalla finestra rifiutati');
  // i giorni veri ci sono ancora, intatti; il Worker non ha cancellato niente
  for (const [i, k] of veri.entries()){ assert.ok(E.REGISTRO.oggetti.has(k), k); assert.equal(E.REGISTRO.oggetti.get(k).testo, testi[i]); }
  assert.equal(E.REGISTRO.ops.delete, 0);
  const s = (await leggi(E, '/giorni', { now: ORA })).body;
  assert.deepEqual(s.cancellati, []); assert.ok(s.byte <= s.maxByte, `${s.byte} > ${s.maxByte}`);
  // la pagina del Worker avvisa quando lo spazio è (quasi) pieno
  const pagina = await leggi(E, '/', { chiave: null, accept: 'text/html' });
  assert.match(pagina.text, /Spazio PIENO/); assert.match(pagina.text, /non cancella mai niente da solo/);
});

test('Worker del registro: il giorno in corso è quello in Italia; tetto di base 2 GB, variabile MAX_TOTALE_MB', async () => {
  assert.equal(oggiItalia(Date.parse('2026-11-14T22:59:00Z')), '2026-11-14'); assert.equal(oggiItalia(Date.parse('2026-11-14T23:30:00Z')), '2026-11-15');
  assert.equal(oggiItalia(Date.parse('2026-07-01T21:59:00Z')), '2026-07-01'); assert.equal(oggiItalia(Date.parse('2026-07-01T22:01:00Z')), '2026-07-02');
  assert.equal((await leggi(env(), '/giorni')).body.maxByte, 2048*1024*1024);
  assert.equal((await leggi(env({ MAX_TOTALE_MB: '500' }), '/giorni')).body.maxByte, 500*1024*1024);
  assert.equal((await leggi(env({ MAX_TOTALE_MB: 'boh' }), '/giorni')).body.maxByte, 2048*1024*1024);
  assert.equal((await leggi(env({ MAX_GIORNO_MB: '50' }), '/giorni')).body.maxGiorno, 50*1024*1024);
});

test('Worker del registro: con la chiave si cancella un giorno o tutto, a pezzi se i blocchi sono tanti', async () => {
  const E = env(); let i = 0;
  for (const g of ['2026-11-12', '2026-11-13', '2026-11-14']) for (let k = 0; k < 3; k++) await manda(E, { giorno: g, parte: `${String(++i).padStart(5, '0')}-ab12`, now: ORA });
  let r = await leggi(E, '/giorni?giorno=2026-11-13', { method: 'DELETE', now: ORA });
  assert.equal(r.res.status, 200); assert.equal(r.body.finito, true);
  assert.deepEqual(r.body.giorni.map(g => g.giorno), ['2026-11-12', '2026-11-14']);
  assert.deepEqual(r.body.cancellati.map(c => [c.giorno, c.perche]), [['2026-11-13', 'utente']]);
  assert.ok(blocchi(E).every(k => !k.includes('/2026-11-13/'))); assert.equal(r.body.byte, E.REGISTRO.byteBlocchi());
  assert.equal((await leggi(E, '/giorni', { method: 'DELETE', now: ORA })).res.status, 400);
  assert.equal((await leggi(E, '/giorni?giorno=boh', { method: 'DELETE', now: ORA })).res.status, 400);
  // tutto
  r = await leggi(E, '/giorni?tutto=si', { method: 'DELETE', now: ORA });
  assert.equal(r.body.finito, true); assert.equal(r.body.byte, 0); assert.deepEqual(r.body.giorni, []); assert.equal(blocchi(E).length, 0);
  // tanti blocchi e poche operazioni per richiesta: si finisce richiamando (finito: false), come fa la pagina
  const T = env({ MAX_OPERAZIONI: '7' }), salvato = 7;
  for (const g of ['2026-11-11', '2026-11-12', '2026-11-13']) await manda(T, { giorno: g, now: ORA });
  let giri = 0;
  for (; giri < 10; giri++){
    const prima = T.REGISTRO.ops.list + T.REGISTRO.ops.delete;
    r = await leggi(T, '/giorni?tutto=si', { method: 'DELETE', now: ORA });
    assert.ok(T.REGISTRO.ops.list + T.REGISTRO.ops.delete - prima <= salvato, 'operazioni per richiesta sotto il limite');
    if (r.body.finito !== false) break;
  }
  assert.ok(giri >= 2, `giri ${giri + 1}`); assert.equal(blocchi(T).length, 0); assert.equal(r.body.byte, 0);
  assert.deepEqual(r.body.cancellati.map(c => c.giorno), ['2026-11-11', '2026-11-12', '2026-11-13']);
});

test('Worker del registro: «Ricalcola lo spazio» rifà l’indice dai blocchi veri; due postazioni insieme non perdono il conto', async () => {
  const E = env(); let i = 0;
  for (const g of ['2026-11-12', '2026-11-14']) for (let k = 0; k < 3; k++) await manda(E, { giorno: g, parte: `${String(++i).padStart(5, '0')}-ab12`, now: ORA });
  E.REGISTRO.oggetti.delete(CONTI);                                             // indice perso
  const r = await leggi(E, '/ricalcola', { method: 'POST', now: ORA });
  assert.equal(r.res.status, 200); assert.equal(r.body.finito, true); assert.equal(r.body.byte, E.REGISTRO.byteBlocchi());
  assert.deepEqual(r.body.giorni.map(g => [g.giorno, g.blocchi, g.righe, g.partite]), [['2026-11-12', 3, 9, 3], ['2026-11-14', 3, 9, 3]]);
  // un giorno cancellato a mano dal pannello di R2 esce dal conto alla prossima «Mostra i giorni»
  for (const k of blocchi(E)) if (k.includes('/2026-11-12/')) E.REGISTRO.oggetti.delete(k);
  const g = (await leggi(E, '/giorni', { now: ORA })).body;
  assert.deepEqual(g.giorni.map(x => x.giorno), ['2026-11-14']); assert.equal(g.byte, E.REGISTRO.byteBlocchi());
  // due postazioni scrivono nello stesso istante: l'indice (scritto solo se nessun altro ha scritto nel frattempo) tiene
  const D = env();
  await Promise.all(Array.from({ length: 6 }, (_, k) => manda(D, { giorno: '2026-11-14', postazione: k % 2 ? 'postaaaa' : 'postbbbb', parte: `0000${k}-cccc`, ip: `198.51.100.${k}`, now: ORA })));
  const d = (await leggi(D, '/giorni', { now: ORA })).body;
  assert.equal(blocchi(D).length, 6); assert.equal(d.giorni[0].blocchi, 6); assert.equal(d.byte, D.REGISTRO.byteBlocchi());
});

test('Worker del registro: la pagina dell’utente mostra lo spazio, scarica e cancella solo con la chiave scritta lì', async () => {
  const p = await leggi(env(), '/', { chiave: null, accept: 'text/html' });
  assert.equal(p.res.status, 200);
  for (const pezzo of ['Spazio occupato dal registro', 'Cancella tutto', 'Ricalcola lo spazio', '.jsonl.gz', "'DELETE'", 'type="password"']) assert.ok(p.text.includes(pezzo), pezzo);
  assert.ok(!p.text.includes(CHIAVE)); assert.equal(p.res.headers.get('Cache-Control'), 'no-store'); assert.equal(p.res.headers.get('Referrer-Policy'), 'no-referrer');
});
