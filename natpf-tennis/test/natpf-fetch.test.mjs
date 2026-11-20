// B73 (docs/b73/prove-rotte-2.md §2): le richieste «spara e dimentica» del gioco leggono la risposta. In Chromium una
// risposta mai letta resta aperta per sempre (anche dopo la raccolta della memoria) e dopo circa 180 ogni richiesta della
// pagina fallisce con net::ERR_INSUFFICIENT_RESOURCES: nel gioco servito dal server LAN (programma Windows) bastavano circa
// 180 colpi (/api/racket/feedback a ogni colpo), nella sfida tra due computer circa 8 s (/api/match/sync 22 volte al
// secondo). Qui: l'aiuto natpf_fetch.js e i punti del gioco che lo usano. La prova nel browser è test/e2e/lan-e2e.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { drain, sendAndForget } from '../src/natpf/natpf_fetch.js';
import { InvioRegistro } from '../src/natpf/registro/registro_invio.js';
import { codaMemoria } from '../src/natpf/registro/registro_coda.js';

test('drain: legge e scarta il corpo, restituisce la stessa risposta; mai un errore', async () => {
  const r = new Response('{"ok":true}', { status: 200 });
  assert.equal(r.bodyUsed, false);
  assert.equal(await drain(r), r);
  assert.equal(r.bodyUsed, true);
  // già letta, senza corpo, non una risposta, null: niente eccezioni
  assert.equal(await drain(r), r);
  const vuota = new Response(null, { status: 204 });
  assert.equal(await drain(vuota), vuota);
  const finta = { status: 200 };
  assert.equal(await drain(finta), finta);
  assert.equal(await drain(null), null);
  // corpo che si rompe a metà: la promessa si risolve lo stesso
  const rotta = { bodyUsed: false, arrayBuffer: () => Promise.reject(new Error('rete')) };
  assert.equal(await drain(rotta), rotta);
});

test('sendAndForget: risposta letta (anche quella d\'errore), rete giù o fetch assente → null, mai un\'eccezione', async () => {
  const viste = [];
  const ok = await sendAndForget('/api/racket/feedback', { method: 'POST', body: '{}' }, async (url, init) => { const r = new Response('{"ok":true}'); viste.push([url, init.method, r]); return r; });
  assert.equal(viste.length, 1); assert.equal(viste[0][0], '/api/racket/feedback'); assert.equal(viste[0][1], 'POST');
  assert.equal(ok, viste[0][2]); assert.equal(ok.bodyUsed, true);
  const no = await sendAndForget('/x', {}, async () => new Response('<html>404</html>', { status: 404 }));
  assert.equal(no.status, 404); assert.equal(no.bodyUsed, true);
  assert.equal(await sendAndForget('/x', {}, async () => { throw new TypeError('Failed to fetch'); }), null);
  assert.equal(await sendAndForget('/x', {}, () => { throw new Error('subito'); }), null);
  // senza fetch passato usa globalThis.fetch, cercato a ogni chiamata (natpf_p2p.js lo sostituisce nella sfida senza server)
  const prima = globalThis.fetch;
  try {
    let chiamate = 0; globalThis.fetch = async () => { chiamate++; return new Response('x'); };
    const r = await sendAndForget('/api/match/sync', { method: 'POST' });
    assert.equal(chiamate, 1); assert.equal(r.bodyUsed, true);
  } finally { globalThis.fetch = prima; }
});

test('registro: l\'invio di un blocco legge la risposta del Worker (anche un rifiuto)', async () => {
  const risposte = [];
  for (const status of [200, 507]){
    const coda = codaMemoria();
    assert.equal((await coda.metti('2026-11-20_abcdefgh_00001-ab12', JSON.stringify({ k: 'partita', t: 0, n: 1 }) + '\n')).ok, true);
    const I = new InvioRegistro({ coda, indirizzo: () => 'https://registro.esempio.invalid/', fetch: async () => { const r = new Response('{"ok":true}', { status }); risposte.push(r); return r; } });
    await I.invia({ forza: true });
  }
  assert.ok(risposte.length >= 2, `risposte: ${risposte.length}`);
  assert.ok(risposte.every(r => r.bodyUsed), JSON.stringify(risposte.map(r => [r.status, r.bodyUsed])));
});

test('nel gioco nessuna richiesta «spara e dimentica» senza leggere la risposta (relay, conferma del colpo, corpo del P2)', () => {
  const file = f => fs.readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
  const sorgenti = ['game_engine.js', 'motion_controls.js', 'natpf/natpf_versus_ui.js', 'natpf/webcam_body_follow.js'].map(f => [f, file(f)]);
  for (const [f, s] of sorgenti){
    // (prima: fetch("/api/match/sync", …).catch(() => {}) e simili, con la risposta mai letta)
    assert.doesNotMatch(s, /\bfetch\(\s*["'`]\/api\/(match\/sync|racket\/feedback|body)\b/, `${f}: usare sendAndForget (natpf_fetch.js)`);
  }
  const tutto = sorgenti.map(([, s]) => s).join('\n');
  for (const p of ['/api/match/sync', '/api/racket/feedback', '/api/body']) assert.match(tutto, new RegExp(`sendAndForget\\(\\s*["'\`]${p.replace(/\//g, '\\/')}`), p);
  // le letture dello stato del relay e i colpi del Player 2 leggono anche le risposte d'errore
  const mc = file('motion_controls.js');
  assert.match(mc, /if \(!i\.ok\) await drain\(i\);/);
  assert.equal((mc.match(/r\.ok \? r\.json\(\) : drain\(r\)\.then\(\(\) => null\)/g) || []).length, 2);
});
