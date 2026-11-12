// Coda del registro dello stand nel programma Windows (src/registro.mjs, canale window.natpfDesktop.registro): accetta
// solo blocchi del registro, scrive nella cartella «registro», tetto con scarto dei più vecchi, cancellazione a invio
// confermato, riga «crash», indirizzo del Worker dal pacchetto. Limiti ed elenchi uguali a quelli del gioco.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { REGISTRO_PC, TIPI, BLOCCO_RE, controllaBlocco, creaCodaRegistro, indirizzoRegistro, leggiIndirizzo } from '../src/registro.mjs';
import { DESKTOP } from '../src/desktop-core.mjs';
import * as F from '../../natpf-tennis/src/natpf/registro/registro_formato.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'natpf-registro-'));
const righe = (n = 3) => Array.from({ length: n }, (_, i) => JSON.stringify({ k: i ? 'colpo' : 'partita', t: i*100, n: 1 })).join('\n') + '\n';
const ID = (seq, giorno = '2026-11-14', post = 'abcdefgh') => `${giorno}_${post}_${String(seq).padStart(5, '0')}-ab12`;

test('registro del programma: limiti, tipi e identificativi uguali a quelli del gioco', () => {
  assert.equal(REGISTRO_PC.maxBlocco, F.REGISTRO.maxBlocco);
  assert.equal(REGISTRO_PC.maxCoda, F.REGISTRO.maxCoda);
  assert.equal(REGISTRO_PC.maxRiga, F.REGISTRO.maxRiga);
  assert.deepEqual([...TIPI], [...F.TIPI]);
  assert.equal(BLOCCO_RE.source, F.BLOCCO_RE.source);
  assert.ok(BLOCCO_RE.test(F.idBlocco('2026-11-14', F.idGiornata(), 7)));
  assert.equal(REGISTRO_PC.ipc, DESKTOP.ipcRegistro);
  assert.ok(/^[a-z0-9]{8}$/.test(REGISTRO_PC.postazioneCrash));
});

test('registro del programma: il canale accetta solo blocchi del registro', () => {
  const dir = tmp(), Q = creaCodaRegistro({ dir });
  assert.deepEqual(Q.put(ID(1), righe()), { ok: true });
  for (const [id, testo, perche] of [
    ['../../windows/system32/x', righe(), 'identificativo'], ['2026-11-14_abcdefgh_00001-ab12/../x', righe(), 'identificativo'], [ID(2).toUpperCase(), righe(), 'identificativo'], [null, righe(), 'identificativo'],
    [ID(2), 'ciao\n', 'riga non del registro'], [ID(2), '{"k":"video","t":1}\n', 'riga non del registro'], [ID(2), '{"k":"colpo"}\n', 'riga non del registro'], [ID(2), '["k"]\n', 'riga non del registro'],
    [ID(2), righe().trimEnd(), 'blocco non valido'], [ID(2), '\n', 'blocco vuoto'], [ID(2), 42, 'blocco non valido'],
    [ID(2), `{"k":"nota","t":1,"msg":"${'x'.repeat(REGISTRO_PC.maxRiga)}"}\n`, 'riga troppo lunga'],
    [ID(2), Array.from({ length: 400 }, () => `{"k":"nota","t":1,"msg":"${'x'.repeat(900)}"}`).join('\n') + '\n', 'blocco troppo grande'],
  ]){
    const r = Q.put(id, testo);
    assert.equal(r.ok, false, `${id} ${String(testo).slice(0, 20)}`); assert.match(r.perche, new RegExp(perche));
  }
  // nella cartella c'è solo il blocco buono, con il nome fatto dal programma
  assert.deepEqual(fs.readdirSync(dir), [`${ID(1)}.jsonl`]);
  assert.equal(Q.read(ID(1)), righe());
  assert.equal(Q.read('../programma.log'), null); assert.equal(Q.read(ID(9)), null);
  assert.equal(Q.remove('../programma.log').ok, false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('registro del programma: elenco in ordine, stato, cancellazione a invio confermato, indice riletto alla riapertura', () => {
  const dir = tmp(), Q = creaCodaRegistro({ dir, url: 'https://registro.example.workers.dev/' });
  Q.put(ID(2), righe(2)); Q.put(ID(1), righe(5)); Q.put(ID(1, '2026-11-13'), righe(1));
  assert.deepEqual(Q.put(ID(1), righe(5)), { ok: true, doppione: true });
  assert.deepEqual(Q.list().map(b => [b.id, b.righe]), [[ID(1, '2026-11-13'), 1], [ID(1), 5], [ID(2), 2]]);
  const s = Q.state();
  assert.equal(s.blocchi, 3); assert.equal(s.righe, 8); assert.equal(s.byte, Buffer.byteLength(righe(2) + righe(5) + righe(1))); assert.equal(s.cartella, dir); assert.equal(s.url, 'https://registro.example.workers.dev/');
  assert.deepEqual(Q.remove(ID(1)), { ok: true });
  assert.equal(fs.existsSync(path.join(dir, `${ID(1)}.jsonl`)), false);
  // programma riaperto: la coda è quella sul disco; un file scritto a metà (.part) si butta, gli estranei si ignorano
  fs.writeFileSync(path.join(dir, `${ID(7)}.jsonl.part`), 'mezzo'); fs.writeFileSync(path.join(dir, 'appunti.txt'), 'x');
  const Q2 = creaCodaRegistro({ dir });
  assert.deepEqual(Q2.list().map(b => b.id), [ID(1, '2026-11-13'), ID(2)]);
  assert.equal(fs.existsSync(path.join(dir, `${ID(7)}.jsonl.part`)), false);
  assert.equal(Q2.state().righe, 3);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('registro del programma: oltre il tetto si scartano i blocchi più vecchi', () => {
  const dir = tmp(), uno = Buffer.byteLength(righe(4)), Q = creaCodaRegistro({ dir, limiti: { ...REGISTRO_PC, maxCoda: uno*3 + 5 } });
  for (let i = 1; i <= 5; i++) assert.equal(Q.put(ID(i), righe(4)).ok, true);
  assert.deepEqual(Q.list().map(b => b.id), [ID(3), ID(4), ID(5)]);
  assert.equal(Q.state().scartati, 2); assert.ok(Q.state().byte <= uno*3 + 5);
  assert.deepEqual(fs.readdirSync(dir).sort(), [3, 4, 5].map(i => `${ID(i)}.jsonl`));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('registro del programma: cartella che non si può scrivere → { ok: false }, nessun errore lanciato', () => {
  const dir = tmp(), file = path.join(dir, 'occupato'); fs.writeFileSync(file, 'x');
  const visti = [], Q = creaCodaRegistro({ dir: path.join(file, 'registro'), log: (...a) => visti.push(a) });
  const r = Q.put(ID(1), righe());
  assert.equal(r.ok, false); assert.ok(r.perche); assert.equal(visti.length, 1);
  assert.deepEqual(Q.list(), []); assert.equal(Q.read(ID(1)), null); assert.equal(Q.state().blocchi, 0);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('registro del programma: pagina del gioco chiusa di colpo → una riga «crash» nella coda', () => {
  const dir = tmp(), Q = creaCodaRegistro({ dir, now: () => new Date(2026, 10, 14, 15, 30, 5) });
  assert.equal(Q.crash('crashed').ok, true);
  const [b] = Q.list();
  assert.match(b.id, /^2026-11-14_crashwin_55805-[a-z0-9]{4}$/);
  const row = JSON.parse(Q.read(b.id));
  assert.equal(row.k, 'crash'); assert.equal(row.motivo, 'crashed'); assert.equal(row.t, 0);
  assert.deepEqual(F.controllaRiga(row), []);
  assert.deepEqual(F.pulisci(row), row, 'la riga passa intera dal controllo del gioco (e del Worker)');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('registro del programma: indirizzo del Worker dal pacchetto (solo https, niente segreti)', () => {
  assert.equal(indirizzoRegistro('https://registro.example.workers.dev'), 'https://registro.example.workers.dev/');
  assert.equal(indirizzoRegistro('https://registro.example.workers.dev/?chiave=abc#x'), 'https://registro.example.workers.dev/');
  assert.equal(indirizzoRegistro('http://localhost:8787/'), 'http://localhost:8787/');
  for (const bad of ['', null, 'registro', 'http://registro.example.workers.dev/', 'https://utente:segreto@registro.example/', 'file:///c:/x']) assert.equal(indirizzoRegistro(bad), '', String(bad));
  const dir = tmp(), f = path.join(dir, 'registro.json');
  assert.equal(leggiIndirizzo(f), '');
  fs.writeFileSync(f, JSON.stringify({ url: 'https://registro.example.workers.dev/' })); assert.equal(leggiIndirizzo(f), 'https://registro.example.workers.dev/');
  // nel repository l'indirizzo è vuoto finché l'utente non crea il suo Worker, e non c'è nessuna chiave
  const repo = JSON.parse(fs.readFileSync(new URL('../registro.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(repo), ['url']); assert.equal(indirizzoRegistro(repo.url), repo.url ? indirizzoRegistro(repo.url) : '');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('registro del programma: preload e processo principale (canale, azioni, solo pagine del gioco)', async () => {
  const code = fs.readFileSync(new URL('../src/preload.cjs', import.meta.url), 'utf8');
  const exposed = {}, invoked = [];
  const electron = { contextBridge: { exposeInMainWorld: (name, api) => { exposed[name] = api; } },
    ipcRenderer: { invoke: (channel, ...a) => { invoked.push([channel, ...a]); return Promise.resolve(a[0] === 'list' ? [{ id: ID(1), byte: 10, righe: 1 }] : a[0] === 'read' ? 'testo' : { ok: true }); }, on(){}, removeListener(){} } };
  vm.runInNewContext(code, { require: m => { if (m !== 'electron') throw new Error(m); return electron; }, console });
  const R = exposed.natpfDesktop.registro;
  assert.deepEqual(Object.keys(R).sort(), [...REGISTRO_PC.azioni].sort());
  assert.equal((await R.put(ID(1), righe())).ok, true);
  assert.equal((await R.list())[0].id, ID(1)); assert.equal(await R.read(ID(1)), 'testo');
  await R.remove(ID(1)); await R.state(); await R.open();
  assert.deepEqual(invoked, [[DESKTOP.ipcRegistro, 'put', ID(1), righe()], [DESKTOP.ipcRegistro, 'list'], [DESKTOP.ipcRegistro, 'read', ID(1)], [DESKTOP.ipcRegistro, 'remove', ID(1)], [DESKTOP.ipcRegistro, 'state'], [DESKTOP.ipcRegistro, 'open']]);
  const main = fs.readFileSync(new URL('../src/main.mjs', import.meta.url), 'utf8');
  assert.match(main, /ipcMain\.handle\(DESKTOP\.ipcRegistro,[^\n]*\n[^\n]*isOwnUrl\(event\.senderFrame\?\.url[^\n]*\n[^\n]*REGISTRO_PC\.azioni\.includes\(action\)/, 'registro solo dalle pagine del gioco, solo le azioni previste');
  assert.match(main, /path\.join\(DATA, 'log', REGISTRO_PC\.cartella\)/, 'cartella «registro» accanto a programma.log');
  assert.match(main, /registro\.crash\(d\.reason\)/);
  const prepara = fs.readFileSync(new URL('../scripts/prepara.mjs', import.meta.url), 'utf8');
  assert.match(prepara, /NATPF_REGISTRO_URL/); assert.match(prepara, /REGISTRO_PC\.config/);
});
