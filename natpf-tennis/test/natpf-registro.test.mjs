// Registro dello stand (B30): formato delle righe e riservatezza (nessun nome, nessun campo vietato), coda dei blocchi
// con il tetto, invio al Worker (rete assente, riprova, niente doppioni), registratore con un motore finto (partita
// contro la CPU e nello stesso schermo), registro spento, registro che non si può scrivere, testi del pannello.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/natpf/registro/registro_formato.js';
import { codaMemoria, codaProgramma, conRiserva, controllaBlocco, daScartare } from '../src/natpf/registro/registro_coda.js';
import { InvioRegistro, percheNo } from '../src/natpf/registro/registro_invio.js';
import { RegistroStand } from '../src/natpf/registro/registro_registratore.js';
import { testoStato, nomeNelloZip } from '../src/natpf/natpf_registro.js';
import zlib from 'node:zlib';
import worker, { dimentica } from '../cloudflare/registro-worker.js';
import { r2Finto } from '../scripts/registro/r2-finto.mjs';

const { REGISTRO } = F;
const storageFinto = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); }, m }; };
const righe = (n = 3, k = 'colpo') => Array.from({ length: n }, (_, i) => JSON.stringify({ k: i ? k : 'partita', t: i*10, n: 1 })).join('\n') + '\n';
const ID = (seq, giorno = '2026-11-14') => `${giorno}_abcdefgh_${String(seq).padStart(5, '0')}-ab12`;
const tutte = async coda => { await new Promise(r => setImmediate(r)); const out = []; for (const b of await coda.elenco()) for (const l of (await coda.leggi(b.id)).trim().split('\n')) out.push(JSON.parse(l)); return out; };

/* ---------- formato e riservatezza ---------- */
test('registro: è sempre acceso di base; la scelta dello staff comanda e resta salvata', () => {
  const st = storageFinto();
  assert.equal(F.registroDiBase(), true);
  assert.equal(F.registroAcceso({ storage: st }), true, 'niente di salvato: acceso');
  assert.equal(F.registroAcceso({ storage: null }), true, 'senza spazio del browser: acceso');
  F.scriviScelta(false, st); assert.equal(F.registroAcceso({ storage: st }), false);
  F.scriviScelta(true, st); assert.equal(F.registroAcceso({ storage: st }), true);
  assert.equal(F.registroAcceso({ storage: { getItem(){ throw new Error('bloccato'); } } }), true);
});

test('registro: una riga tiene solo i campi previsti; nomi, indirizzi, e-mail e campi vietati non passano', () => {
  const nomi = ['Mario Rossi', 'Lulù'];
  const row = F.pulisci({ k: 'errore', t: 12, n: 3, msg: 'Errore di Mario Rossi su https://192.168.1.20:8443/natpf/tennis/racchetta.html?room=AB12#x scritto a mario@example.com da 10.0.0.7:5000', file: 'index-abc.js', riga: 10, col: 2,
    nome: 'Mario Rossi', nickname: 'Lulù', giocatore: 'x', ip: '10.0.0.7', ua: 'Mozilla/5.0', video: 'AAAA', campioni: [1, 2, 3], roomId: 'AB12', qualcosaDiNuovo: 1,
    tel: { so: 'Android 14', browser: 'Chrome 126', strada: 'lan', rtt: 12, deviceId: 'abc', modello: 'SM-S911B' }, scartati: { 'gesto di Lulù troppo debole': 2, presto: 1, testo: 'no' }, stand: { chiosco: true, password: 'x' } }, { nomi });
  const s = JSON.stringify(row);
  for (const no of ['Mario', 'Lulù', '192.168', '10.0.0.7', 'example.com', 'room=', 'Mozilla', 'AAAA', 'AB12', 'SM-S911B', 'qualcosaDiNuovo', 'password', 'campioni']) assert.ok(!s.includes(no), no);
  assert.deepEqual(row.tel, { so: 'Android 14', browser: 'Chrome 126', strada: 'lan', rtt: 12 });
  assert.deepEqual(row.scartati, { 'gesto di [nome] troppo debole': 2, presto: 1 });
  assert.deepEqual(row.stand, { chiosco: true });
  assert.match(row.msg, /\[nome\]/); assert.match(row.msg, /racchetta\.html/); assert.match(row.msg, /\[e-mail\]/); assert.match(row.msg, /\[indirizzo\]/);
  assert.deepEqual(F.controllaRiga(row, { nomi }), []);
  // non sono righe del registro
  for (const bad of [null, 'testo', [1], { t: 1 }, { k: 'video', t: 1 }, { k: 'colpo' }, { k: 'colpo', t: -1 }, { k: 'colpo', t: 1.5 }]) assert.equal(F.pulisci(bad), null, JSON.stringify(bad));
  // il controllo dei test vede ogni cosa che non va
  const male = F.controllaRiga({ k: 'colpo', t: 1, nome: 'x', boh: 2, msg: 'vai su http://sito.example/a', gesto: 'colpo di Mario Rossi', tel: { ip: '1.2.3.4', so: 'a@b.it' } }, { nomi });
  for (const atteso of [/nome: campo vietato/, /boh: campo non previsto/, /indirizzo di una pagina/, /nome di chi gioca/, /ip: campo vietato/, /e-mail/]) assert.ok(male.some(m => atteso.test(m)), String(atteso));
  // ogni campo vietato è davvero fuori dai campi previsti
  const norm = k => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const c of F.CAMPI) assert.ok(!F.CAMPI_VIETATI.includes(norm(c)), `campo previsto e vietato insieme: ${c}`);
  // riga troppo lunga: restano tipo, tempo, partita
  const lunga = F.testoRiga({ k: 'visita', t: 5, n: 2, posti: Object.fromEntries(Array.from({ length: 400 }, (_, i) => [`posto-${i}-${'x'.repeat(20)}`, i])) });
  assert.deepEqual(Object.keys(JSON.parse(lunga)), ['k', 't', 'n', 'tagliata']);
});

test('registro: blocchi, giornata, telefono a grandi linee, strada, fine del punto, indirizzo del Worker', () => {
  const id = F.idBlocco('2026-11-14', 'abcdefgh', 12, () => .5);
  assert.match(id, F.BLOCCO_RE); assert.deepEqual(F.leggiIdBlocco(id), { giorno: '2026-11-14', postazione: 'abcdefgh', parte: id.split('_')[2] });
  assert.ok(F.idBlocco('2026-11-14', 'abcdefgh', 9) < F.idBlocco('2026-11-14', 'abcdefgh', 10), 'in ordine alfabetico = in ordine di tempo');
  assert.equal(F.leggiIdBlocco('../x'), null);
  assert.equal(F.indirizzoBlocco('https://r.example.workers.dev/', id), `https://r.example.workers.dev/?giorno=2026-11-14&postazione=abcdefgh&parte=${id.split('_')[2]}`);
  const st = storageFinto(), g1 = F.leggiGiornata('2026-11-14', st);
  assert.match(g1.g, /^[a-z0-9]{8}$/); g1.n = 4; g1.b = 9; F.scriviGiornata(g1, st);
  assert.deepEqual(F.leggiGiornata('2026-11-14', st), { giorno: '2026-11-14', g: g1.g, n: 4, b: 9, aperta: null });
  const g2 = F.leggiGiornata('2026-11-15', st); assert.equal(g2.n, 0); assert.notEqual(g2.g, g1.g, 'identificativo casuale nuovo ogni giorno');
  assert.deepEqual(F.dispositivo('Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 Chrome/126.0.6478.122 Mobile Safari/537.36'), { so: 'Android 14', browser: 'Chrome 126' });
  assert.deepEqual(F.dispositivo('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1'), { so: 'iPhone iOS 17', browser: 'Safari 17' });
  assert.equal(F.strada({ locale: 'host', remoto: 'host' }), 'lan'); assert.equal(F.strada({ locale: 'relay', remoto: 'srflx' }), 'relay'); assert.equal(F.strada({ turn: true }), 'relay');
  assert.equal(F.strada({ locale: 'srflx', remoto: 'srflx' }), 'internet'); assert.equal(F.strada(null, 'lan-webrtc'), 'lan'); assert.equal(F.strada(null), null);
  assert.equal(F.gpuVera('ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11)'), true); assert.equal(F.gpuVera('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))'), false);
  assert.equal(F.finePunto({ motivo: 'Net', colpi: 1 }), 'servizio.rete'); assert.equal(F.finePunto({ motivo: 'Out', colpi: 4 }), 'fuori');
  assert.equal(F.finePunto({ motivo: 'Nice Shot!', colpi: 1 }), 'ace'); assert.equal(F.finePunto({ motivo: 'Nice Shot!', colpi: 5 }), 'vincente');
  assert.equal(F.finePunto({ motivo: 'Point', colpi: 3, vuoto: true }), 'a vuoto'); assert.equal(F.finePunto({ motivo: 'Point', colpi: 3 }), 'passata');
  for (const f of ['servizio.rete', 'fuori', 'ace', 'vincente', 'a vuoto', 'passata']) assert.ok(F.FINI.includes(f));
  assert.equal(F.indirizzoRegistro({ url: 'https://r.example.workers.dev' }), 'https://r.example.workers.dev/');
  assert.equal(F.indirizzoRegistro({ url: 'https://r.example.workers.dev/?chiave=segreta' }), 'https://r.example.workers.dev/', 'niente parametri: la chiave non ci deve mai finire');
  for (const bad of [null, {}, { url: '' }, { url: 'http://r.example/' }, { url: 'https://u:p@r.example/' }, { url: 'javascript:alert(1)' }]) assert.equal(F.indirizzoRegistro(bad), null);
});

/* ---------- coda ---------- */
test('registro, coda: accetta solo blocchi del registro, in ordine; oltre il tetto scarta i più vecchi', async () => {
  const uno = new TextEncoder().encode(righe(4)).length, Q = codaMemoria({ limiti: { ...REGISTRO, maxCoda: uno*3 + 5 } });
  for (const [id, t] of [['x', righe()], [ID(1), 'ciao\n'], [ID(1), righe().trimEnd()], [ID(1), 5], [ID(1), righe(1) + 'x'.repeat(REGISTRO.maxBlocco) + '\n']]) assert.equal((await Q.metti(id, t)).ok, false);
  for (const i of [2, 1, 3, 4, 5]) assert.equal((await Q.metti(ID(i), righe(4))).ok, true);
  assert.deepEqual((await Q.metti(ID(5), righe(4))), { ok: true, doppione: true });
  assert.deepEqual((await Q.elenco()).map(b => b.id), [ID(3), ID(4), ID(5)], 'restano i tre più nuovi');
  const s = await Q.stato(); assert.equal(s.blocchi, 3); assert.equal(s.righe, 12); assert.equal(s.scartati, 2); assert.ok(s.byte <= uno*3 + 5);
  assert.equal(await Q.leggi(ID(3)), righe(4)); assert.equal(await Q.leggi(ID(1)), null);
  await Q.togli(ID(3)); assert.deepEqual((await Q.elenco()).map(b => b.id), [ID(4), ID(5)]);
  assert.deepEqual(daScartare([{ id: ID(1), byte: 60 }, { id: ID(2), byte: 60 }], 50, { maxCoda: 100 }), [ID(1), ID(2)].slice(0, 2));
  assert.deepEqual(daScartare([{ id: ID(1), byte: 30 }], 50, { maxCoda: 100 }), []);
  assert.equal(REGISTRO.maxCoda, 200*1024*1024, 'tetto della coda sul PC: 200 MB');
  assert.equal(controllaBlocco(ID(1), righe(2)).righe, 2);
});

test('registro, coda: se il disco non si scrive il blocco resta in memoria e parte lo stesso; niente errori fuori', async () => {
  const rotta = { tipo: 'browser', metti: async () => { throw new Error('QuotaExceededError'); }, elenco: async () => [], leggi: async () => null, togli: async () => ({ ok: true }), stato: async () => ({ tipo: 'browser', blocchi: 0, byte: 0, righe: 0, scartati: 0 }) };
  const Q = conRiserva(rotta);
  const r = await Q.metti(ID(1), righe());
  assert.equal(r.ok, true); assert.equal(r.riserva, true);
  assert.deepEqual((await Q.elenco()).map(b => b.id), [ID(1)]); assert.equal(await Q.leggi(ID(1)), righe());
  assert.equal((await Q.stato()).inMemoria, 1);
  await Q.togli(ID(1)); assert.deepEqual(await Q.elenco(), []);
  // un blocco non valido non va nemmeno in riserva
  assert.equal((await conRiserva(codaMemoria()).metti('x', righe())).ok, false);
  // programma Windows: il ponte che lancia errori non li fa uscire
  const P = codaProgramma({ put: async () => { throw new Error('EPERM'); }, list: async () => { throw new Error('x'); }, read: async () => { throw new Error('x'); }, remove: async () => { throw new Error('x'); }, state: async () => { throw new Error('x'); }, open: async () => { throw new Error('x'); } });
  assert.equal((await P.metti(ID(1), righe())).ok, false); assert.deepEqual(await P.elenco(), []); assert.equal(await P.leggi(ID(1)), null);
  assert.equal((await P.togli(ID(1))).ok, false); assert.equal((await P.stato()).errore, true); assert.equal((await P.apri()).ok, false);
  const visti = [], ok = codaProgramma({ put: async (id, t) => { visti.push([id, t]); return { ok: true }; }, list: async () => [{ id: ID(2), byte: 9, righe: 1 }, { id: 'estraneo', byte: 1 }], read: async () => righe(1), remove: async () => ({ ok: true }), state: async () => ({ blocchi: 1, byte: 9, righe: 1, scartati: 0, cartella: 'C:/x' }) });
  assert.equal((await ok.metti(ID(2), righe(1))).ok, true); assert.deepEqual(visti, [[ID(2), righe(1)]]);
  assert.deepEqual((await ok.elenco()).map(b => b.id), [ID(2)]); assert.equal((await ok.stato()).tipo, 'programma');
});

/* ---------- invio ---------- */
// Spazio finto dall'altra parte della rete: tiene i blocchi per identificativo, non riscrive i doppioni, apre il gzip.
// (Il Worker vero ha il suo test: test/registro-worker.test.mjs; qui si prova il lato del gioco.)
function reteFinta(){
  const R = { blocchi: new Map(), giu: false, status: null, chiamate: 0, doppioni: 0, fetch: async (url, init = {}) => {
    R.chiamate++;
    if (R.giu) throw new TypeError('Failed to fetch');
    if (R.status) return new Response('{"ok":false}', { status: R.status });
    const u = new URL(url), id = `${u.searchParams.get('giorno')}_${u.searchParams.get('postazione')}_${u.searchParams.get('parte')}`;
    if (init.method !== 'POST' || !F.BLOCCO_RE.test(id) || init.credentials !== 'omit') return new Response('{"ok":false}', { status: 400 });
    if (u.searchParams.get('giorno') < '2026-01-01') return new Response('{"ok":false}', { status: 400 });
    let testo = init.body; if (typeof testo !== 'string'){ const buf = Buffer.from(testo); testo = buf[0] === 0x1f && buf[1] === 0x8b ? zlib.gunzipSync(buf).toString('utf8') : buf.toString('utf8'); }
    if (R.blocchi.has(id)){ R.doppioni++; return new Response('{"ok":true,"doppione":true}', { status: 200 }); }
    R.blocchi.set(id, testo);
    return new Response(JSON.stringify({ ok: true, righe: testo.trim().split('\n').length, scartate: 0 }), { status: 200 });
  } };
  return R;
}
const URL_R = 'https://registro.example.workers.dev/';

test('registro, invio: i blocchi partono in ordine, a invio confermato si cancellano dal PC; lo spazio ha le stesse righe', async () => {
  const rete = reteFinta(), coda = codaMemoria();
  const I = new InvioRegistro({ coda, indirizzo: () => URL_R, fetch: rete.fetch });
  for (const i of [2, 3, 1]) await coda.metti(ID(i), righe(2 + i));
  const r = await I.invia();
  assert.equal(r.ok, true); assert.equal(r.inviati, 3);
  assert.deepEqual(await coda.elenco(), [], 'sul PC non resta niente');
  assert.deepEqual([...rete.blocchi.keys()], [ID(1), ID(2), ID(3)], 'in ordine');
  assert.equal(rete.blocchi.get(ID(2)), righe(4));
  const s = I.stato(); assert.equal(s.inviati, 3); assert.equal(s.righe, 12); assert.ok(s.ultimoOk > 0); assert.equal(s.ultimoErrore, null); assert.equal(s.configurato, true);
  assert.equal(I.daInviare, false);
});

test('registro, invio: senza rete i blocchi restano in coda e si rimandano dopo, in ordine, senza doppioni', async () => {
  const rete = reteFinta(), coda = codaMemoria(); let ora = 1_000_000;
  const I = new InvioRegistro({ coda, indirizzo: () => URL_R, fetch: rete.fetch, wallNow: () => ora });
  await coda.metti(ID(1), righe(3)); await coda.metti(ID(2), righe(4));
  rete.giu = true;
  const no = await I.invia();
  assert.equal(no.ok, false); assert.match(no.perche, /rete assente/); assert.equal((await coda.elenco()).length, 2, 'niente perso');
  assert.equal(rete.chiamate, 1, 'ci si ferma al primo che non passa');
  // prima dei 30 s non si riprova (nemmeno dal controllo al secondo); «Invia adesso» sì
  I.tic(); assert.equal((await I.invia()).perche, 'in attesa di riprovare'); assert.equal(rete.chiamate, 1);
  assert.equal((await I.invia({ forza: true })).ok, false); assert.equal(rete.chiamate, 2);
  // l'attesa raddoppia: 30 s, 60 s… fino a 10 minuti
  assert.equal(I.stato().riprovaAlle - ora, 60000);
  for (let i = 0; i < 12; i++) await I.invia({ forza: true });
  assert.equal(I.stato().riprovaAlle - ora, REGISTRO.riprovaMaxMs);
  // la conferma del primo blocco si era persa (scritto nello spazio, risposta mai arrivata): si rimanda, e lo spazio
  // non lo scrive due volte
  rete.giu = false; rete.blocchi.set(ID(1), righe(3));
  ora += REGISTRO.riprovaMaxMs + 1; I.tic();
  const r = await I.invia();
  assert.equal(r.ok, true); assert.equal(r.inviati, 2); assert.deepEqual(await coda.elenco(), []);
  assert.equal(rete.doppioni, 1);
  assert.equal([...rete.blocchi.values()].join(''), righe(3) + righe(4), 'ogni riga una volta sola, in ordine');
});

test('registro, invio: blocco rifiutato per sempre si toglie; giorno pieno resta; origine non permessa e troppi invii si riprovano; senza indirizzo solo coda', async () => {
  const rete = reteFinta(), coda = codaMemoria();
  const I = new InvioRegistro({ coda, indirizzo: () => URL_R, fetch: rete.fetch });
  // blocco di un giorno troppo vecchio: lo spazio risponde 400, non passerà mai → via dalla coda, contato
  await coda.metti(ID(1, '2020-01-01'), righe()); await coda.metti(ID(1), righe());
  const r = await I.invia();
  assert.equal(r.ok, true); assert.equal(r.inviati, 1); assert.equal(I.stato().rifiutati, 1); assert.deepEqual(await coda.elenco(), []);
  for (const [status, perche] of [[403, /origine non permessa/], [429, /troppi invii/], [500, /non risponde/], [404, /indirizzo del registro sbagliato/]]){
    const c = codaMemoria(), J = new InvioRegistro({ coda: c, indirizzo: () => URL_R, fetch: rete.fetch });
    await c.metti(ID(2), righe()); rete.status = status;
    const x = await J.invia(); assert.equal(x.ok, false); assert.match(x.perche, perche); assert.equal((await c.elenco()).length, 1, `${status}: resta in coda`);
    assert.equal(J.daInviare, true);
  }
  // giorno pieno (507): il blocco resta, gli altri del giro si provano lo stesso
  rete.status = 507; const c = codaMemoria(), J = new InvioRegistro({ coda: c, indirizzo: () => URL_R, fetch: rete.fetch });
  await c.metti(ID(3), righe()); await c.metti(ID(4), righe());
  const prima507 = rete.chiamate, pieno = await J.invia();
  assert.equal(pieno.ok, false); assert.equal((await c.elenco()).length, 2); assert.equal(rete.chiamate - prima507, 2); assert.equal(J.stato().pieno, true);
  rete.status = null;
  // senza indirizzo: niente chiamate, tutto in coda, il pannello lo dice
  const prima = rete.chiamate, S = new InvioRegistro({ coda: c, indirizzo: () => null, fetch: rete.fetch });
  S.tic(); const s = await S.invia({ forza: true });
  assert.equal(s.ok, false); assert.match(s.perche, /non configurato/); assert.equal(rete.chiamate, prima); assert.equal(S.stato().configurato, false);
  for (const st of [0, 403, 404, 429, 500, 507, 418]) assert.ok(percheNo(st).length > 10);
  // fetch che non risponde mai: il tempo massimo lo ferma (qui 20 ms) e il blocco resta
  const lenta = new InvioRegistro({ coda: c, indirizzo: () => URL_R, limiti: { ...REGISTRO, attesaMs: 20 }, fetch: (_u, init) => new Promise((_res, rej) => init.signal.addEventListener('abort', () => rej(new Error('abort')))) });
  const l = await lenta.invia(); assert.equal(l.ok, false); assert.equal((await c.elenco()).length, 2);
  // chiusura della pagina: sendBeacon con l'indirizzo del blocco; senza indirizzo niente
  const visti = [], B = new InvioRegistro({ coda: c, indirizzo: () => URL_R, fetch: rete.fetch, beacon: (u, t) => { visti.push([u, t]); return true; } });
  assert.equal(B.allaChiusura(ID(9), righe(1)), true); assert.match(visti[0][0], /parte=00009-ab12$/); assert.equal(visti[0][1], righe(1));
  assert.equal(new InvioRegistro({ coda: c, indirizzo: () => null, beacon: () => true }).allaChiusura(ID(9), righe(1)), false);
});

/* ---------- registratore con un motore finto ---------- */
function mondo({ storage = storageFinto(), coda = codaMemoria(), invio = null, split = false, livello = 'adulto', nick = 'Mario Rossi', ctrl = 'phone', raf = null } = {}){
  let now = 0;
  const E = {
    phase: 'MENU', autoPlayMode: true, natpfPaused: false, isMultiplayer: false, playerRole: 'p1', player: { id: 'p' }, opponent: { id: 'o' },
    ball: { rallyStrokeCount: 0, lastHitter: null, inPlay: false }, score: { server: 'player', playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0, fair: false },
    matchConfig: { difficulty: livello, gamesToWin: 2 }, matchFormat: { id: 'breve' }, natpfTossMisses: 0, natpfLastWhiff: null, natpfLastRacket: null, natpfLastServe: null,
    natpfSplit: split ? { active: true } : null, natpfSplitNames: split ? { p1: 'Giulia Bianchi', p2: 'Player 2' } : null, natpfSplitBands: split ? { p1: 'bambino', p2: 'adulto' } : null,
    natpfDuo: split ? { help: { p1: true }, autoToss: true, open: false } : null, natpfHot: false,
    natpfPhone: { connected: true, hand: 'right', device: { ua: 'Mozilla/5.0 (Linux; Android 14; SM-S911B) Chrome/126.0.0.0 Mobile' }, link: { route: { locale: 'host', remoto: 'host' }, transport: 'webrtc' }, state: { rtt: 14, state: 'on' },
      onChange(fn){ this._c = fn; }, onCal(fn){ this._cal = fn; }, onSwing(fn){ this._sw = fn; }, onDropped(fn){ this._dr = fn; }, onDiag(fn){ this._dg = fn; } },
    renderer: { getContext: () => ({ getExtension: () => ({ UNMASKED_RENDERER_WEBGL: 1 }), getParameter: () => 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)' }) },
    startNewMatch(){ this.autoPlayMode = false; this.phase = 'SERVE'; Object.assign(this.score, { playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0, server: 'player' }); },
    _startServeToss(){ this.phase = 'SERVE_TOSS'; },
    _executeServeHit(actor){ if (this.noGesto && this.ball.inPlay) return; if (!this.noGesto) this.natpfLastServe = { kind: 'piatto', q: .8, tau: .02, kmh: 142, grade: 'Perfetto • 142 km/h' }; this.ball.inPlay = true; this.ball.rallyStrokeCount = 1; this.ball.lastHitter = actor === this.player ? 'player' : 'opponent'; this.phase = 'RALLY'; },
    _natpfRacketShot(e){ this.ball.rallyStrokeCount++; this.ball.lastHitter = e.who === 'p2' ? 'opponent' : 'player';
      this.natpfLastRacket = { who: e.who || 'player', intent: { shot: e.shot || 'forehand', power: e.power ?? .6, typePower: e.power ?? .6 }, out: { shot: e.shot || 'forehand', grade: e.grade || 'Perfetto', aim: .2, failed: !!e.failed, netFault: !!e.net },
        timing: e.tau ?? .01, source: 'phone', ...(e.super ? { super: e.super } : { superWhy: ['palla troppo bassa'] }) };
      return { E: 1.5, N: -8.2 }; },
    _natpfEarlyWhiff(){}, _natpfWeakDropped(){},
    _awardPoint(winner){ const k = winner === 'player' ? 'playerPoints' : 'opponentPoints'; this.score[k]++; this.ball.inPlay = false; this.ball.rallyStrokeCount = 0;
      if (this.score[k] >= 4){ this.score[winner === 'player' ? 'playerGames' : 'opponentGames']++; this.score.playerPoints = this.score.opponentPoints = 0; if (this.score.playerGames >= 2 || this.score.opponentGames >= 2) this.phase = 'MATCH_OVER'; } },
  };
  const ui = { controller: ctrl, hand: { hand: 'right' }, cue: { enabled: true }, kiosk: { enabled: true, reset(){} }, lobby: { visible: true, step: 'menu' },
    events: { nickname: nick, active: null, start(){}, finish(){}, abort(){} }, training: { active: false, start(){}, stop(){}, tutorial: null, stats: {} }, split: split ? { webcam: false, tut: {} } : null,
    // B28: scambi di prova (natpf_trial.js) a grandi linee: start, «Salta ›», fine dell'apprendimento, chiusura
    trial: { S: null, get active(){ return !!this.S; }, start({ split: sp = false } = {}){ if (this.S) return false; this.S = { players: Object.fromEntries((sp ? ['p1', 'p2'] : ['p1']).map(id => [id, { balls: 0 }])), result: null }; return true; },
      skip(){ if (this.S && !this.S.result) this._outro(); }, _outro(){ this.S.result = Object.fromEntries(Object.keys(this.S.players).map(id => [id, { level: 'pieno', n: { forehand: 3, backhand: 2 } }])); }, _close(){ this.S = null; } } };
  const errori = {}, win = { addEventListener: (t, fn) => { errori[t] = fn; }, screen: { width: 1920, height: 1080 }, innerWidth: 1920, innerHeight: 1080, devicePixelRatio: 1, navigator: { hardwareConcurrency: 8 }, performance: { getEntriesByType: () => [{ type: 'reload' }] } };
  const R = new RegistroStand({ engine: E, ui, coda, invio, storage, now: () => now, wallNow: () => Date.UTC(2026, 10, 14, 10, 0, 0) + now, win, raf, timers: false, programma: true });
  return { E, ui, R, coda, storage, win, errori, avanti: ms => { now += ms; }, nomi: ['Mario Rossi', 'Giulia Bianchi', 'Mario', 'Giulia'] };
}
// una partita: chi gioca batte, n colpi, il punto finisce; fino alla fine della partita
function gioca(M, { punti = 99, vince = i => (i % 3 ? 'player' : 'opponent') } = {}){
  const { E, ui } = M; ui.lobby.visible = false; E.startNewMatch();
  for (let i = 0; i < punti && E.phase !== 'MATCH_OVER'; i++){
    M.avanti(3000); E._startServeToss(E.player); M.avanti(900); E._executeServeHit(E.player, {});
    for (let c = 0; c < 3; c++){ M.avanti(1200); E._natpfRacketShot({ who: c % 2 && E.natpfSplit ? 'p2' : 'player', shot: c ? 'backhand' : 'forehand', power: c === 2 ? .9 : .5, tau: (c - 1)*.03, grade: c ? 'Anticipo' : 'Perfetto', super: c === 1 && i === 0 ? 'alta' : null }); }
    M.avanti(800); E._awardPoint(vince(i), i % 2 ? 'Out' : 'Nice Shot!');
  }
}

test('registro, registratore: una partita contro la CPU dà le righe attese, senza nomi né campi vietati, in pochi kB', async () => {
  const M = mondo(); gioca(M);
  M.R.secondo(); await M.R.blocco();
  const rows = await tutte(M.coda), di = k => rows.filter(r => r.k === k);
  assert.deepEqual([...new Set(rows.map(r => r.k))].sort(), ['avvio', 'colpo', 'partita', 'partita.fine', 'punto', 'servizio']);
  const [avvio] = di('avvio'), [partita] = di('partita'), [fine] = di('partita.fine');
  assert.equal(avvio.dove, 'programma'); assert.deepEqual(avvio.schermo, [1920, 1080]); assert.equal(avvio.gpu, true); assert.match(avvio.gpuTipo, /RTX 3060/); assert.equal(avvio.pagina, 'reload');
  assert.match(avvio.g, /^[a-z0-9]{8}$/); assert.match(avvio.versione, /^\d{4}-\d{2}-\d{2}\.\d+$/); assert.equal(typeof avvio.fuso, 'number');
  assert.equal(partita.n, 1); assert.equal(partita.modo, 'cpu'); assert.equal(partita.livello, 'adulto'); assert.equal(partita.formato, 'breve'); assert.equal(partita.ctrl, 'telefono'); assert.equal(partita.mano, 'right');
  assert.equal(partita.nomeInserito, true, 'del nome resta solo «inserito: sì»'); assert.equal(partita.segnale, true); assert.equal(partita.stand.chiosco, true);
  assert.deepEqual(partita.tel, { strada: 'lan', rtt: 14, so: 'Android 14', browser: 'Chrome 126' });
  const punti = di('punto'); assert.ok(punti.length >= 8);
  assert.deepEqual(punti[0], { k: 'punto', t: punti[0].t, n: 1, p: 1, batte: 'g', vince: 'a', fine: 'vincente', ultimo: 'g', colpi: 4, durS: 4.4, attesaS: 3.9, pt: [0, 1, 0, 0], lanci: 1 });
  assert.equal(punti[1].fine, 'fuori');
  const colpi = di('colpo'); assert.equal(colpi.length, punti.length*3);
  // righe compatte: il colpo non ripete il punto (è quello della riga «punto» che segue), chi gioca ('g'), «dentro» né il controller
  assert.deepEqual(colpi[0], { k: 'colpo', t: colpi[0].t, n: 1, gesto: 'forehand', ms: -30, voto: 'perfetto', f: .5, d: .2, x: 1.5, z: -8.2 });
  assert.ok(rows.indexOf(colpi[2]) < rows.indexOf(punti[0]) && rows.indexOf(punti[0]) < rows.indexOf(colpi[3]), 'i colpi di un punto stanno prima della sua riga «punto»');
  assert.equal(colpi[1].sup, 'alta'); assert.equal(colpi[2].supNo, 'palla troppo bassa', 'colpo super mancato: il perché, solo con un gesto forte');
  assert.equal(colpi[2].voto, 'anticipo'); assert.equal(colpi[2].ms, 30);
  const servizi = di('servizio'); assert.equal(servizi.length, punti.length); assert.equal(servizi[0].kmh, 142); assert.equal(servizi[0].voto, 'perfetto');
  assert.equal(fine.esito, 'finita'); assert.equal(fine.punti, punti.length); assert.equal(fine.colpi, colpi.length); assert.ok(fine.durS > 20); assert.deepEqual(fine.game.reduce((a, b) => a + b), fine.game[0] + fine.game[1]);
  assert.ok(['g', 'a'].includes(fine.vince)); assert.equal(typeof fine.costoMs, 'number');
  // riservatezza: nessuna riga con un nome o un campo vietato o non previsto
  const testo = rows.map(r => JSON.stringify(r)).join('\n');
  for (const no of ['Mario', 'Rossi', 'Mozilla', 'SM-S911B']) assert.ok(!testo.includes(no), no);
  for (const r of rows) assert.deepEqual(F.controllaRiga(r, { nomi: M.nomi }), [], JSON.stringify(r));
  // peso: pochi kB a partita
  const byte = new TextEncoder().encode(testo).length;
  assert.ok(byte < 12000, `${byte} byte per una partita di ${punti.length} punti`);
  // i blocchi hanno l'identificativo della giornata e il numero d'ordine
  const ids = (await M.coda.elenco()).map(b => b.id);
  assert.ok(ids.length >= 1, 'il blocco fatto a fine partita'); for (const id of ids) assert.equal(F.leggiIdBlocco(id).postazione, avvio.g);
  assert.equal(M.R.stato().partite, 1); assert.equal(M.R.stato().perse, 0);
});

test('registro, registratore: stesso schermo (fasce, aiuto, nomi mai scritti), partita abbandonata, errori JavaScript puliti', async () => {
  const M = mondo({ split: true, nick: '' }); gioca(M, { punti: 3 });
  // errore JavaScript con un nome e un indirizzo dentro
  M.errori.error({ message: 'TypeError: Giulia Bianchi is not defined', filename: 'https://192.168.1.5:8443/assets/index-abc123.js?v=1', lineno: 42, colno: 7 });
  for (let i = 0; i < 12; i++) M.errori.error({ message: 'TypeError: Giulia Bianchi is not defined', filename: 'https://192.168.1.5:8443/assets/index-abc123.js?v=1', lineno: 42, colno: 7 });
  M.errori.unhandledrejection({ reason: new Error('rete giù per mario@example.com') });
  // servizio del Player 2 senza il tempo del gesto (mouse, webcam): una riga senza tipo né voto; palla già in gioco: niente
  M.E.noGesto = true; M.E.ball.inPlay = false; M.E._executeServeHit(M.E.opponent); M.E._executeServeHit(M.E.opponent); M.E.noGesto = false;
  // ritorno al menu a metà partita
  M.E.autoPlayMode = true; M.ui.lobby.visible = true; M.avanti(1000); M.R.secondo();
  await M.R.blocco();
  const rows = await tutte(M.coda), di = k => rows.filter(r => r.k === k);
  const [partita] = di('partita'), [fine] = di('partita.fine');
  assert.equal(partita.modo, 'stesso-schermo'); assert.deepEqual(partita.fasce, ['bambino', 'adulto']); assert.equal(partita.aiuto, 'g');
  assert.equal(partita.nomeInserito, true); assert.equal(partita.nomeInserito2, false, '«Player 2» non è un nome scritto');
  assert.deepEqual(partita.stand, { chiosco: true, caldo: false, lancioAuto: true, campoAperto: false, ...(partita.stand.fiera != null ? { fiera: partita.stand.fiera } : {}), ...(partita.stand.mira != null ? { mira: partita.stand.mira } : {}) });
  assert.ok(di('colpo').some(c => c.chi === 'a'), 'i colpi del secondo giocatore');
  assert.deepEqual(di('servizio').filter(r => r.fonte).map(r => [r.chi, r.fonte, r.voto]), [['a', 'senza gesto', undefined]], 'servizio senza gesto: uno solo, del Player 2');
  assert.equal(fine.esito, 'abbandonata'); assert.equal(fine.dove, 'a metà partita'); assert.equal(fine.come, 'menu'); assert.equal(fine.punti, 3); assert.equal(fine.errori, 14);
  const errori = di('errore');
  assert.deepEqual(errori.map(e => e.volte), [1, 10, 1], 'lo stesso errore si conta, non si ripete');
  assert.equal(errori[0].file, 'index-abc123.js'); assert.equal(errori[0].riga, 42); assert.match(errori[0].msg, /\[nome\] is not defined/); assert.match(errori[2].msg, /\[e-mail\]/);
  const testo = rows.map(r => JSON.stringify(r)).join('\n');
  for (const no of ['Giulia', 'Bianchi', '192.168', 'example.com']) assert.ok(!testo.includes(no), no);
  for (const r of rows) assert.deepEqual(F.controllaRiga(r, { nomi: M.nomi }), [], JSON.stringify(r));
});

test('registro, registratore: calibrazione giocando (scambi di prova del B28): una riga per giocatore, colpi a parte, saltata o lasciata', async () => {
  const M = mondo({ split: true, nick: '' }), { E, ui, R } = M;
  ui.lobby.visible = false;
  ui.trial.start({ split: true }); R.secondo();
  for (const id of ['p1', 'p2']) ui.trial.S.players[id].balls = 4;
  M.avanti(1500); E._natpfRacketShot({ who: 'player', shot: 'forehand', power: .5, tau: .02 });
  M.avanti(1500); E._natpfRacketShot({ who: 'p2', shot: 'backhand', power: .5, tau: -.04 });
  M.avanti(1000); R.secondo(); ui.trial.skip(); ui.trial._close(true);
  // gli scambi di prova lasciati a metà (ritorno al menu)
  ui.trial.start({ split: false }); ui.trial.S.players.p1.balls = 2; M.avanti(3000); ui.trial._close(false);
  gioca(M, { punti: 2 });
  M.E.autoPlayMode = true; ui.lobby.visible = true; M.avanti(1000); R.secondo();
  await R.blocco();
  const rows = await tutte(M.coda), cal = rows.filter(r => r.k === 'calibrazione');
  assert.deepEqual(cal.map(c => [c.chi, c.tipo, c.finita, !!c.saltato, c.prove]), [['g', 'giocando', true, true, 4], ['a', 'giocando', true, true, 4], ['g', 'giocando', false, false, 2]]);
  assert.deepEqual(cal[0].passi, { dritto: [3, 0], rovescio: [2, 0] }); assert.equal(cal[0].colpi, 5); assert.equal(cal[0].livello, 'pieno'); assert.equal(cal[0].durS, 4);
  const prova = rows.filter(r => r.k === 'colpo' && r.amb === 'prova');
  assert.deepEqual(prova.map(c => [c.chi || 'g', c.gesto, c.ms]), [['g', 'forehand', 20], ['a', 'backhand', -40]], 'i colpi degli scambi di prova si registrano a parte');
  const [fine] = rows.filter(r => r.k === 'partita.fine'); assert.equal(fine.colpi + (fine.colpi2 || 0), rows.filter(r => r.k === 'colpo' && !r.amb).length, 'e non entrano nei conti della partita');
  const [visita] = rows.filter(r => r.k === 'visita'); assert.ok(visita.posti.calibrazione >= 1, JSON.stringify(visita));
  for (const r of rows) assert.deepEqual(F.controllaRiga(r, { nomi: M.nomi }), [], JSON.stringify(r));
});

test('registro, registratore: fotogrammi al secondo della partita (medi, secondo peggiore, più lungo, lenti); a gioco in pausa non contano', async () => {
  let cb = null; const raf = f => { cb = f; };
  const M = mondo({ raf }), { E, ui, R } = M;
  ui.lobby.visible = false; E.startNewMatch();
  let t = 1000; const frame = dt => { t += dt; const f = cb; cb = null; f(t); };
  frame(16);                                                               // il primo dà solo il tempo di partenza
  for (let i = 0; i < 120; i++) frame(1000/60);                            // 2 s a 60
  for (let i = 0; i < 30; i++) frame(1000/30);                             // 1 s a 30
  frame(80);                                                               // un fotogramma lento
  E.natpfPaused = true; for (let i = 0; i < 50; i++) frame(5); E.natpfPaused = false;   // in pausa: non conta
  frame(1500);                                                             // pagina nascosta: non conta
  for (let i = 0; i < 10; i++) frame(1000/60);
  E.phase = 'MATCH_OVER'; M.avanti(1000); R.secondo(); await R.blocco();
  const [fine] = (await tutte(M.coda)).filter(r => r.k === 'partita.fine');
  assert.equal(fine.fps.n, 161); assert.equal(fine.fps.maxMs, 80); assert.equal(fine.fps.lunghi, 1);
  assert.ok(fine.fps.medi > 48 && fine.fps.medi < 51, JSON.stringify(fine.fps)); assert.ok(fine.fps.peggiori >= 27 && fine.fps.peggiori <= 31, JSON.stringify(fine.fps));
  frame(16); assert.equal(cb, null, 'a partita finita il conto si ferma al fotogramma dopo (nessun altro fotogramma chiesto)');
});

test('registro, registratore: spento = nessuna riga; la scelta resta salvata; riacceso riparte', async () => {
  const storage = storageFinto(); F.scriviScelta(false, storage);
  const M = mondo({ storage }); assert.equal(M.R.on, false);
  gioca(M, { punti: 4 }); M.R.secondo(); await M.R.blocco();
  assert.deepEqual(await M.coda.elenco(), [], 'registro spento: niente in coda'); assert.equal(M.R.buf.length, 0); assert.equal(M.R.stato().righe, 0);
  // il motore non cambia comportamento: i punti sono stati giocati
  assert.equal(M.E.score.playerPoints + M.E.score.opponentPoints + 4*(M.E.score.playerGames + M.E.score.opponentGames), 4);
  M.R.accendi(true); assert.equal(F.leggiScelta(storage), true);
  gioca(M, { punti: 2 }); await M.R.blocco();
  const rows = await tutte(M.coda); assert.equal(rows[0].k, 'avvio'); assert.equal(rows[0].motivo, 'acceso'); assert.equal(rows.filter(r => r.k === 'punto').length, 2);
  M.R.accendi(false); assert.equal(F.leggiScelta(storage), false);
  await new Promise(r => setTimeout(r, 5));
  const dopo = await tutte(M.coda); assert.equal(dopo.at(-1).k, 'chiusura'); assert.equal(dopo.at(-1).motivo, 'spento');
  const n = dopo.length; gioca(M, { punti: 2 }); await M.R.blocco(); assert.equal((await tutte(M.coda)).length, n);
});

test('registro, registratore: coda che non si scrive e rete assente non fermano il gioco; le righe perse si contano e si dichiarano', async () => {
  const rotta = { tipo: 'browser', metti: async () => { throw new Error('disco pieno'); }, elenco: async () => [], leggi: async () => null, togli: async () => ({ ok: true }), stato: async () => ({}) };
  const M = mondo({ coda: rotta, invio: { daInviare: false, tic(){ throw new Error('non deve uscire'); }, invia: async () => { throw new Error('rete'); }, allaChiusura(){ throw new Error('x'); } } });
  assert.doesNotThrow(() => gioca(M, { punti: 5 }));
  await assert.doesNotReject(M.R.blocco());
  const s = M.R.stato(); assert.ok(s.perse > 10); assert.equal(s.scritte, 0); assert.match(s.problema, /coda non scrivibile/);
  // la coda torna a funzionare: il blocco dopo comincia con la nota delle righe perse
  const buona = codaMemoria(); M.R.coda = buona; M.R.invio = null;
  gioca(M, { punti: 1 }); await M.R.blocco();
  const rows = await tutte(buona); assert.equal(rows[0].k, 'nota'); assert.equal(rows[0].perse, s.perse);
  // memoria ferma da molto (nessun blocco fatto): oltre 4000 righe non si accumula
  const N = mondo(); N.ui.lobby.visible = false; N.E.startNewMatch();
  for (let i = 0; i < 4200; i++) N.E._natpfRacketShot({});
  assert.equal(N.R.buf.length, 4000); assert.ok(N.R.stato().perse >= 200);
  // blocchi grandi si dividono: nessuno oltre il limite
  await N.R.blocco(); for (const b of await N.coda.elenco()) assert.ok(b.byte <= REGISTRO.maxBlocco);
  assert.ok((await N.coda.elenco()).length > 1);
});

test('registro, registratore: con l\'invio le righe arrivano nello spazio (Worker vero, R2 finto) e la coda si svuota', async () => {
  dimentica();
  const CHIAVE = 'chiave-di-prova-123', env = { REGISTRO: r2Finto(), CHIAVE_LETTURA: CHIAVE, ALLOWED_ORIGINS: 'https://localhost:8443' }, coda = codaMemoria();
  const fetchW = (url, init = {}) => worker.fetch(new Request(url, { method: init.method, headers: { ...(init.headers || {}), Origin: 'https://localhost:8443', 'CF-Connecting-IP': '203.0.113.1' }, body: init.body }), env);
  const invio = new InvioRegistro({ coda, indirizzo: () => URL_R, fetch: fetchW });
  const M = mondo({ coda, invio });
  M.R.wallNow = () => Date.now(); M.R.giornata = null;       // il Worker accetta solo giorni vicini a oggi
  gioca(M); M.R.secondo(); await M.R.blocco(); await invio.invia({ forza: true });
  assert.deepEqual(await coda.elenco(), [], 'niente resta sul PC');
  assert.equal(invio.stato().rifiutati, 0); assert.ok(invio.stato().ultimoOk > 0);
  // con la chiave: il giorno c'è, con tutte le righe (il Worker non ne ha scartata nessuna: stessi campi previsti)
  const g = await (await worker.fetch(new Request(`${URL_R}giorni`, { headers: { Authorization: `Bearer ${CHIAVE}`, Accept: 'application/json' } }), env)).json();
  assert.equal(g.ok, true); assert.equal(g.giorni.length, 1); assert.equal(g.giorni[0].righe, M.R.stato().righe); assert.ok(g.giorni[0].blocchi >= 1);
});

/* ---------- pannello dello stand ---------- */
test('registro, pannello: stato in parole semplici', () => {
  const base = { acceso: true, partite: 12, inMemoria: 4, coda: { righe: 30, blocchi: 2, byte: 5000, tipo: 'programma' }, invio: { configurato: true, ultimoOk: new Date(2026, 10, 14, 14, 32).getTime(), ultimoErrore: null, inCorso: false }, cerca: false };
  assert.equal(testoStato(base), 'Oggi 12 partite registrate · ultimo invio riuscito alle 14:32 · 34 righe ancora in coda (5 kB).');
  assert.equal(testoStato({ ...base, partite: 1, inMemoria: 0, coda: { righe: 0, blocchi: 0, byte: 0, tipo: 'browser' } }), 'Oggi 1 partita registrata · ultimo invio riuscito alle 14:32 · niente in coda.');
  assert.match(testoStato({ ...base, invio: { configurato: false } }), /indirizzo dello spazio non configurato: 34 righe in coda su questo computer/);
  assert.match(testoStato({ ...base, invio: { configurato: true, ultimoOk: null, ultimoErrore: 'rete assente o Worker non raggiungibile' } }), /ancora nessun invio riuscito · 34 righe ancora in coda \(5 kB\) · invio non riuscito: rete assente o Worker non raggiungibile; si riprova da solo/);
  assert.match(testoStato({ ...base, coda: { righe: 3, tipo: 'memoria' } }), /solo in memoria/);
  assert.match(testoStato({ ...base, acceso: false }), /^Registro spento/);
  assert.match(testoStato({ ...base, cerca: true }), /cerco l’indirizzo/);
  assert.equal(nomeNelloZip(ID(7)), 'registro/2026-11-14/abcdefgh/00007-ab12.jsonl'); assert.equal(nomeNelloZip('x'), null);
});
