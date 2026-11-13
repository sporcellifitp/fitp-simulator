// B35 (collaudo dell'utente del 13/11 sulla 2026-11-13.6), punti 3 e 6.
//   3) «su un game BO1 la battuta era alternata e non fissa ad un giocatore»: con le opzioni di base (formato in fiera
//      «Solo stesso schermo», campo aperto spento) il servizio passa ogni due punti SOLO nello stesso schermo; contro la
//      CPU e nella sfida tra due computer un giocatore batte tutto il game. Quando passa ogni due punti lo dice una riga
//      chiara a inizio partita e sul tabellone («Formato veloce: il servizio cambia ogni 2 punti»).
//   6) «con Lob e Drop non si vede chi deve servire»: nello stesso schermo la scritta «Al servizio» c'è in tutte e due le
//      metà, sopra chi batte (natpf_split.serveTagPoint), con qualsiasi personaggio.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FAST_SERVE_LINE, FAIR_KEY, readFairFormat } from '../src/natpf/natpf_fair_format.js';
import { scoreboardView, scoreboardHtml } from '../src/natpf/natpf_scoreboard.js';
import { serveTagPoint, splitViewports, splitCameraPose } from '../src/natpf/natpf_split.js';
import { createHeadlessEngine } from '../scripts/audit/headless-engine.mjs';

const memory = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
// partita con l'opzione dello stand com'è salvata (saved: valore di natpf-tennis.formatoFiera, null = mai toccata)
function match({ mode = 'cpu', saved = null, first = 'player', banner = false } = {}){
  const had = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { value: memory(saved == null ? {} : { [FAIR_KEY]: saved }), configurable: true, writable: true });
  try {
    const e = createHeadlessEngine({ difficulty: 'casual' });
    e.natpfServeFirst = first; e.matchConfig.gamesToWin = 1;
    e.natpfArena = { setScore(){}, setSpeed(){}, update(){}, setPractice(){} };
    if (mode === 'split'){ e.isMultiplayer = true; e.natpfSplit.active = true; }
    if (mode === 'host') e.isMultiplayer = true;
    e.startNewMatch({ showStartBanner: banner });
    return e;
  } finally {
    if (had) Object.defineProperty(globalThis, 'localStorage', had); else delete globalThis.localStorage;
  }
}
// chi batte ogni punto (A = chi gioca qui / Player 1, B = l'altro) fino alla fine della partita a 1 game
const servers = (e, winners) => winners.split('').map(w => { const s = e.score.server; e._awardPoint(w === 'P' ? 'player' : 'opponent', 'Out'); return s === 'player' ? 'A' : 'B'; }).join('');

test('punto 3 · opzioni di base: contro la CPU un giocatore batte tutto il game (partita a 1 game)', () => {
  assert.equal(readFairFormat({ search: '', storage: memory() }), false, 'formato in fiera di base: solo stesso schermo');
  for (const first of ['player', 'opponent']){
    const e = match({ mode: 'cpu', first });
    assert.equal(e.score.fair, false);
    const s = servers(e, 'POPOPOPOPP');   // parità, vantaggi, game
    assert.equal(new Set(s).size, 1, `un solo battitore: ${s}`);
    assert.equal(s[0], first === 'player' ? 'A' : 'B');
    assert.equal(e.phase === 'MATCH_OVER' || e.score.playerGames + e.score.opponentGames === 1, true, 'partita finita');
  }
});

test('punto 3 · opzioni di base: sfida tra due computer (host) un battitore per game; stesso schermo ogni due punti', () => {
  const h = match({ mode: 'host' });
  assert.equal(h.score.fair, false);
  assert.equal(servers(h, 'POPOPOP'), 'AAAAAAA');
  const s = match({ mode: 'split' });
  assert.equal(s.score.fair, true, 'stesso schermo: formato in fiera di base');
  assert.equal(servers(s, 'PPPOOO'), 'ABBAAB');
});

test('punto 3 · «Formato in fiera: Sì» salvato dallo staff: anche contro la CPU il servizio passa ogni due punti; «No»: mai', () => {
  const si = match({ mode: 'cpu', saved: '1' });
  assert.equal(si.score.fair, true);
  assert.equal(servers(si, 'POPO'), 'ABBA');
  const no = match({ mode: 'split', saved: 'no' });
  assert.equal(no.score.fair, false);
  assert.equal(servers(no, 'POPOPO'), 'AAAAAA', 'spento dal pannello dello stand: anche nello stesso schermo un battitore per game');
});

test('punto 3 · la riga «Formato veloce» c’è a inizio partita e sul tabellone solo quando il servizio passa ogni due punti', () => {
  assert.equal(FAST_SERVE_LINE, 'Formato veloce: il servizio cambia ogni 2 punti');
  const s = match({ mode: 'split', banner: true });
  assert.match(s.lastBannerBroadcast?.subText || '', /Formato veloce: il servizio cambia ogni 2 punti$/, 'sotto «Si gioca», dopo chi batte per primo');
  assert.match(s.lastBannerBroadcast.subText, /^(Sorteggio: batte|Batte) /);
  const c = match({ mode: 'cpu', banner: true });
  assert.ok(!/Formato veloce/.test(c.lastBannerBroadcast?.subText || ''), 'contro la CPU (di base) niente riga');
  const f = match({ mode: 'cpu', saved: '1', banner: true });
  assert.equal(f.lastBannerBroadcast.subText, FAST_SERVE_LINE, 'contro la CPU con «Sì»: solo la riga');
  // tabellone
  const on = scoreboardView({ playerPoints: 1, opponentPoints: 0, server: 'opponent', fair: true }, { split: true, altServe: true });
  assert.equal(on.rule, FAST_SERVE_LINE);
  assert.match(scoreboardHtml(on), /data-sb-rule[^>]*>.*Formato veloce: il servizio cambia ogni 2 punti<\/div>$/);
  const off = scoreboardView({ playerPoints: 1, opponentPoints: 0, server: 'player' }, {});
  assert.equal(off.rule, '');
  assert.ok(!/data-sb-rule/.test(scoreboardHtml(off)), 'senza: il tabellone di prima');
});

test('punto 6 · stesso schermo: «Al servizio» in tutte e due le metà, sopra chi batte, dentro la sua metà', () => {
  const vp = splitViewports(1280, 720);
  const cam = (side, actorZ, v) => {
    const c = new THREE.PerspectiveCamera(45, v.w/v.h, .1, 500), p = splitCameraPose({ side, actorX: 0, actorZ, ballX: 0, aspect: v.w/v.h });
    c.fov = p.fov; c.updateProjectionMatrix(); c.position.set(...p.pos); c.lookAt(new THREE.Vector3(...p.look)); c.updateMatrixWorld(); return c;
  };
  const c1 = cam(1, 11.9, vp.p1), c2 = cam(-1, -11.9, vp.p2);
  const p1 = new THREE.Vector3(1.3, 0, 11.9), p2 = new THREE.Vector3(-1.3, 0, -11.9);
  for (const [who, pos] of [['Player 1', p1], ['Player 2', p2]]){
    const a = serveTagPoint(pos, c1, vp.p1), b = serveTagPoint(pos, c2, vp.p2);
    assert.ok(a && a.x >= vp.p1.x && a.x <= vp.p1.x + vp.p1.w && a.y > 0 && a.y < 720, `${who}, metà del P1: ${JSON.stringify(a)}`);
    assert.ok(b && b.x >= vp.p2.x && b.x <= vp.p2.x + vp.p2.w && b.y > 0 && b.y < 720, `${who}, metà del P2: ${JSON.stringify(b)}`);
  }
  // chi batte vicino alla camera ha la scritta in basso nella sua metà, chi batte lontano in alto
  assert.ok(serveTagPoint(p1, c1, vp.p1).y > serveTagPoint(p2, c1, vp.p1).y);
  assert.ok(serveTagPoint(p2, c2, vp.p2).y > serveTagPoint(p1, c2, vp.p2).y);
  // dietro la camera: niente scritta
  assert.equal(serveTagPoint(new THREE.Vector3(0, 0, 40), c1, vp.p1), null);
  assert.equal(serveTagPoint(null, c1, vp.p1), null);
});

test('punto 6 · la scritta dipende solo da chi batte, non dai personaggi (Classici o Lob & Drop)', () => {
  const s = { playerPoints: 0, opponentPoints: 0, server: 'opponent' };
  const cl = scoreboardView(s, {}), ld = scoreboardView(s, { looks: { player: 'drop', opponent: 'lob' } });
  assert.deepEqual(cl.rows.map(r => r.serving), ld.rows.map(r => r.serving));
  assert.match(scoreboardHtml(ld), /data-sb-look="lob"[^>]*>.*\(al servizio\)/);
});
