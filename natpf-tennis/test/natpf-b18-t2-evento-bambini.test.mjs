// B18.2 · tappa 2, gruppo 3 (difetto 3 / D3 e miglioramenti 3 e 4 di docs/b16/rapporto-gameplay.md): livelli «Bambini» ed
// «Evento» (che si regola da solo), «Chi gioca», segnale del momento giusto, colpo super spiegato.
// Documento: docs/b18/t2-4-evento-bambini.md
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeadlessEngine } from '../scripts/audit/headless-engine.mjs';
import { simulate } from '../scripts/audit/rally-balance.mjs';
import { measure, SERIE } from '../scripts/audit/evento-bambini.mjs';
import * as NS from '../src/natpf/natpf_skill.js';
import { EVENTO, eventoStep, eventoPoint, eventoReset, eventoState, eventoK, eventoTuning, blend } from '../src/natpf/natpf_evento.js';
import { ASSIST, assistOf, IMPACT, impactWindow, SUPER } from '../src/natpf/natpf_stroke_outcome.js';
import { lateMargin } from '../src/natpf/natpf_impact.js';
import { WHO, WHO_LEVEL, WHO_DEFAULT, CPU_LEVELS, whoOfLevel, urlLevel, baseLevel, levelSummary, whoNote } from '../src/natpf/natpf_who.js';
import { CUE, cueOn, cueDefault, cueView, readCue, writeCue, CUE_KEY } from '../src/natpf/natpf_timing_cue.js';
import { superHint, superReason, SUPER_RULE } from '../src/natpf/natpf_super_hint.js';
import { matchSummary } from '../src/natpf/natpf_lobby.js';

const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const storage = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };

/* ---------- Evento: la regola ---------- */
test('Evento, regola: punto vinto su di poco, punto perso giù di più, fermo in media a 65 punti su 100', () => {
  const up = eventoStep(.5, true) - .5, down = .5 - eventoStep(.5, false);
  assert.ok(near(up, EVENTO.gain*(1 - EVENTO.target)) && near(down, EVENTO.gain*EVENTO.target), `${up} ${down}`);
  assert.ok(up > 0 && down > up, 'il punto perso pesa di più');
  // a 65 punti vinti su 100 lo spostamento medio è zero; sopra sale, sotto scende
  const drift = p => p*up - (1 - p)*down;
  assert.ok(near(drift(EVENTO.target), 0)); assert.ok(drift(.8) > 0 && drift(.5) < 0);
  // gradini piccoli: un punto non sposta la CPU di più di un decimo della scala (il doppio nei primi punti)
  assert.ok(down <= .1 && up <= .05);
});

test('Evento, regola: nei primi sei punti di un giocatore i gradini sono doppi, poi normali', () => {
  for (let n = 0; n < EVENTO.fastPoints; n++) assert.ok(near(eventoStep(.5, true, EVENTO, n) - .5, 2*EVENTO.gain*(1 - EVENTO.target)), `punto ${n + 1}`);
  assert.ok(near(eventoStep(.5, true, EVENTO, EVENTO.fastPoints) - .5, EVENTO.gain*(1 - EVENTO.target)));
  assert.ok(near(.5 - eventoStep(.5, false, EVENTO, 2), 2*EVENTO.gain*EVENTO.target));
  assert.equal(EVENTO.fast, 2); assert.equal(EVENTO.fastPoints, 6);
});

test('Evento, limiti: la CPU non scende sotto quella facile e non sale sopra il tetto, qualunque serie di punti', () => {
  let k = EVENTO.start;
  for (let i = 0; i < 60; i++) k = eventoStep(k, false, EVENTO, i);
  assert.equal(k, 0, 'sessanta punti persi di fila: CPU facile, non meno');
  for (let i = 0; i < 80; i++) k = eventoStep(k, true, EVENTO, 60 + i);
  assert.equal(k, 1, 'ottanta punti vinti di fila: tetto');
  assert.equal(eventoStep(NaN, true), eventoStep(EVENTO.start, true), 'valore non valido: si riparte dalla base');
});

test('Evento, stato: un punto muove k di un gradino, «riparti» torna alla base, il valore fissato dalle prove non si muove', () => {
  try {
    assert.equal(eventoReset().k, EVENTO.start); assert.equal(eventoK(), EVENTO.start);
    const k1 = eventoPoint(true);
    assert.ok(near(k1, EVENTO.start + 2*EVENTO.gain*(1 - EVENTO.target)));
    const k2 = eventoPoint(false);
    assert.ok(near(k2, k1 - 2*EVENTO.gain*EVENTO.target));
    assert.deepEqual({ points: eventoState().points, won: eventoState().won, trail: eventoState().trail.length }, { points: 2, won: 1, trail: 2 });
    assert.equal(eventoReset().k, EVENTO.start); assert.equal(eventoState().points, 0);
    eventoTuning.fixed = .3;
    assert.equal(eventoK(), .3); eventoPoint(true); eventoPoint(true);
    assert.equal(eventoK(), .3, 'fissato: la regola non lo muove');
  } finally { delete eventoTuning.fixed; eventoReset(); }
  assert.deepEqual({ ...eventoTuning }, {}, 'nel gioco nessun valore di prova');
});

test('Evento, stabilità: chi vince 65 punti su 100 resta dov\'è; chi ne vince 90 arriva al tetto; chi ne vince 30 alla CPU facile', () => {
  // sequenze fisse (niente caso): 13 vinti ogni 20 = 65%
  const run = (pattern, n) => { let k = EVENTO.start, min = k, max = k; for (let i = 0; i < n; i++){ k = eventoStep(k, pattern[i % pattern.length] === 'V', EVENTO, i); min = Math.min(min, k); max = Math.max(max, k); } return { k, min, max }; };
  const pari = run('VVPVVPVVPVVPVPVVPVVP'.split(''), 200);
  assert.ok(Math.abs(pari.k - EVENTO.start) < .15, `a 65% k resta vicino a dov'era: ${pari.k}`);
  assert.ok(pari.max - pari.min < .35, `… senza oscillare: ${pari.min}–${pari.max}`);
  assert.ok(run('VVVVVVVVVP'.split(''), 120).k > .9);
  assert.ok(run('VPPVPPPVPP'.split(''), 120).k < .1);
});

/* ---------- Evento: il livello ---------- */
test('media tra due livelli: numeri, gruppi di numeri, voci che mancano da una parte, voci non numeriche', () => {
  assert.deepEqual(blend({ a: 1, g: { x: 0, y: 2 }, s: 'no' }, { a: 3, g: { x: 1, y: 2, z: 5 }, b: 7 }, .5), { a: 2, g: { x: .5, y: 2, z: 5 }, s: 'no', b: 7 });
  assert.equal(blend({ a: 1 }, { a: 3 }, 0).a, 1); assert.equal(blend({ a: 1 }, { a: 3 }, 1).a, 3);
  assert.equal(blend({ a: 1 }, { a: 3 }, 7).a, 3, 'peso oltre 1: resta al secondo');
  assert.equal(blend({ n: null }, { n: Object.freeze({ q: 1 }) }, .5).n.q, 1);
});

test('Evento a k = 0 è Casual numero per numero; a k = 1 ha la CPU dell\'estremo difficile; in mezzo cambia con ordine', () => {
  const c = NS.SKILL_LEVELS.casual, e0 = NS.eventoLevelAt(0), e1 = NS.eventoLevelAt(1), H = NS.EVENTO_ENDS.hard;
  for (const key of Object.keys(c)) assert.deepEqual(e0[key], typeof c[key] === 'object' && key === 'cpuErr' ? { ...c[key], tired: 0 } : c[key], `k = 0, ${key}`);
  assert.equal(e0.cpuFlight, 1); assert.equal(e0.cpuPro, 0); assert.equal(e0.cpuFatigue.slow, 0);
  for (const key of ['cpuSpeed', 'cpuReach', 'cpuReact', 'cpuReadSd', 'timingSpan', 'perfectLead', 'playerSpeed', 'cpuFlight', 'cpuPro']) assert.equal(e1[key], H[key], `k = 1, ${key}`);
  assert.deepEqual(e1.cpuErr, H.cpuErr); assert.deepEqual(e1.cpuFatigue, NS.SKILL_LEVELS.pro.cpuFatigue);
  // l'estremo difficile è la CPU di Pro con un poco di corsa in più; Pro non è toccato
  assert.ok(H.cpuSpeed > NS.SKILL_LEVELS.pro.cpuSpeed && H.cpuSpeed <= NS.SKILL_LEVELS.pro.cpuSpeed + .5);
  assert.deepEqual(H.cpuErr, NS.SKILL_LEVELS.pro.cpuErr);
  // con k la CPU corre di più e sbaglia di meno, la palla arriva più veloce, a chi gioca è chiesta più precisione
  let prev = e0;
  for (const k of [.25, .5, .75, 1]){
    const L = NS.eventoLevelAt(k);
    assert.ok(L.cpuSpeed > prev.cpuSpeed && L.cpuErr.base < prev.cpuErr.base && L.cpuFlight < prev.cpuFlight && L.timingSpan < prev.timingSpan && L.cpuPro > prev.cpuPro, `k = ${k}`);
    assert.equal(L.adaptive, true); assert.equal(L.cpuLegend, undefined);
    // finestra d'impatto e assistenza restano quelle di Casual a ogni k (natpf_stroke_outcome.js non è toccato)
    assert.equal(assistOf(L), ASSIST.casual, `k = ${k}: assistenza di Casual`);
    prev = L;
  }
  assert.equal(impactWindow('evento'), IMPACT.casual); assert.equal(impactWindow('bambini'), IMPACT.casual);
  assert.equal(NS.SKILL_LEVELS.evento.cpuSpeed, NS.eventoLevelAt(EVENTO.start).cpuSpeed, 'SKILL_LEVELS.evento è il livello alla partenza');
});

test('Evento fermo a k = 0: la partita simulata è quella di Casual, punto per punto (stessi semi)', () => {
  const casual = simulate({ profile: 'amatore', difficulty: 'casual', points: 40, seed: 7 });
  let evento;
  try { eventoTuning.fixed = 0; evento = simulate({ profile: 'amatore', difficulty: 'evento', points: 40, seed: 7 }); } finally { delete eventoTuning.fixed; eventoReset(); }
  assert.deepEqual(evento.rallies, casual.rallies); assert.equal(evento.won, casual.won); assert.deepEqual(evento.reasons, casual.reasons);
});

test('Evento nel motore: a fine punto la CPU cambia di un gradino e la sua velocità segue; negli altri livelli niente', () => {
  try {
    const e = createHeadlessEngine({ difficulty: 'evento' });
    NS.eventoRestart(e);
    assert.equal(NS.isEvento(e), true);
    assert.ok(near(e.opponent.maxSpeed, NS.eventoLevelAt(EVENTO.start).cpuSpeed), 'alla partenza la CPU corre come il livello di base');
    e.startNewMatch({ showStartBanner: false });
    const k0 = NS.eventoK(); e._awardPoint('player', 'Out');
    const k1 = NS.eventoK();
    assert.ok(k1 > k0, 'punto vinto: CPU un gradino più brava');
    assert.ok(near(e.opponent.maxSpeed, NS.skillLevel('evento').cpuSpeed) && near(e.player.maxSpeed, NS.skillLevel('evento').playerSpeed));
    assert.ok(e.opponent.maxSpeed > NS.eventoLevelAt(k0).cpuSpeed);
    e._awardPoint('opponent', 'Out');
    assert.ok(NS.eventoK() < k1, 'punto perso: CPU più facile');
    // la partita nuova dello stesso giocatore («Gioca ancora») non riporta k alla base; «riparti» sì
    const kept = NS.eventoK(); e.startNewMatch({ showStartBanner: false });
    assert.equal(NS.eventoK(), kept);
    NS.eventoRestart(e); assert.equal(NS.eventoK(), EVENTO.start);
    // demo dietro il menu: non si adatta
    e.autoPlayMode = true; e.userHasInteracted = false; assert.equal(NS.eventoAfterPoint(e, 'player'), null); assert.equal(NS.eventoK(), EVENTO.start);
    // altri livelli e partita tra due persone: niente
    for (const difficulty of ['casual', 'pro', 'leggenda', 'bambini', '1v1']){
      const o = createHeadlessEngine({ difficulty }); o.startNewMatch({ showStartBanner: false });
      const speed = o.opponent.maxSpeed; o._awardPoint('player', 'Out');
      assert.equal(NS.eventoK(), EVENTO.start, difficulty); assert.equal(o.opponent.maxSpeed, speed, difficulty);
    }
    const m = createHeadlessEngine({ difficulty: 'evento' }); m.isMultiplayer = true;
    assert.equal(NS.isEvento(m), false); assert.equal(NS.eventoAfterPoint(m, 'player'), null);
  } finally { NS.eventoRestart(null); }
});

test('servizio: Bambini ed Evento hanno il loro peso; quello di Evento è la media tra Casual e Pro pesata da k', () => {
  const W = NS.SERVE_WEIGHT;
  for (const key of ['base', 'threat', 'stretch', 'max', 'read', 'readSd', 'pressure']) assert.equal(NS.eventoServeAt(0)[key], W.casual[key], key);
  for (const key of ['base', 'threat', 'stretch', 'max', 'read']) assert.equal(NS.eventoServeAt(1)[key], W.pro[key], key);
  assert.equal(NS.eventoServeAt(1).lateBase, W.lateBase); assert.equal(NS.eventoServeAt(0).lateBase, 1);
  const s = NS.eventoServeAt(EVENTO.start);
  for (const key of Object.keys(W.evento)) assert.ok(near(W.evento[key], s[key], 1e-3), `riga di Evento alla partenza, ${key}: ${W.evento[key]} e ${s[key]}`);
  assert.ok(W.bambini.base > W.casual.base && W.bambini.lateBase === 1, 'Bambini: la CPU sbaglia più spesso la risposta, anche sul servizio fuori tempo');
});

/* ---------- Bambini ---------- */
test('Bambini: più margine sul tempo per chi gioca, palla della CPU più lenta e al centro, CPU che non attacca', () => {
  const b = NS.SKILL_LEVELS.bambini, c = NS.SKILL_LEVELS.casual;
  assert.ok(b.timingSpan > c.timingSpan && b.perfectLead > c.perfectLead && b.scatter < c.scatter && b.lineRisk < c.lineRisk && b.playerErr.timing < c.playerErr.timing);
  assert.ok(b.lateMargin > 0 && b.lateMargin <= .1 && b.cpuFlight > 1 && b.cpuFlight <= 1.2 && b.cpuServe.flight > c.cpuServe.flight);
  assert.equal(b.cpuAttack, 0); assert.equal(b.cpuAttackBase, 0);
  assert.equal(assistOf(b), ASSIST.casual, 'assistenza di Casual (natpf_stroke_outcome.js non è toccato)');
  assert.equal(b.cpuSpeed, c.cpuSpeed, 'la CPU corre come a Casual: gli scambi ci sono');
  // margine in ritardo: solo per chi gioca contro la CPU a Bambini
  const e = createHeadlessEngine({ difficulty: 'bambini' });
  const cz = createHeadlessEngine({ difficulty: 'casual' });
  assert.equal(lateMargin(e, e.player), b.lateMargin); assert.equal(lateMargin(e, e.opponent), lateMargin(cz, cz.opponent), 'per la CPU niente in più');
  for (const difficulty of ['casual', 'pro', 'leggenda', 'evento']){ const o = createHeadlessEngine({ difficulty }); assert.equal(lateMargin(o, o.player), 0, difficulty); }
  e.isMultiplayer = true; assert.equal(lateMargin(e, e.player), 0, 'tra due persone niente');
  // tempo di volo dei colpi della CPU: × 1 esatto negli altri livelli e per il pallonetto
  const f = createHeadlessEngine({ difficulty: 'bambini' });
  assert.equal(NS.cpuFlightFactor(f, 'TOPSPIN'), b.cpuFlight); assert.equal(NS.cpuFlightFactor(f, 'LOB'), 1);
  for (const difficulty of ['casual', 'pro', 'leggenda', '1v1']) assert.equal(NS.cpuFlightFactor(createHeadlessEngine({ difficulty }), 'TOPSPIN'), 1, difficulty);
  assert.equal(NS.cpuFlightFactor(createHeadlessEngine({ difficulty: 'evento' }), 'TOPSPIN'), NS.skillLevel('evento').cpuFlight);
});

test('Bambini: la CPU tira quasi sempre al centro, mai il contropiede o l\'angolo stretto; Casual e Pro scelgono come prima', () => {
  let s = 1; const rng = () => { s = (s*16807) % 2147483647; return s/2147483647; };
  const kinds = {}; let central = 0;
  for (let i = 0; i < 800; i++){ const c = NS.cpuShotChoice({ difficulty: 'bambini', playerX: i % 2 ? 2 : -2, rally: 6, rng }); kinds[c.kind] = (kinds[c.kind] || 0) + 1; if (Math.abs(c.x) <= 1.3) central++; }
  assert.equal(kinds.behind, undefined); assert.equal(kinds.angle, undefined);
  assert.ok(kinds.rally/800 > .6, `scambio al centro: ${kinds.rally}`); assert.ok(central/800 > .6, `palle entro 1,3 m dal centro: ${central}`);
  assert.deepEqual(Object.keys(NS.CPU_PATTERNS).sort(), ['bambini', 'casual', 'pro']);
  // stessi sorteggi, stessi colpi di prima per Casual e Pro (la scelta non consuma numeri in più)
  const seq = difficulty => { let t = 5; const r = () => { t = (t*48271) % 2147483647; return t/2147483647; }; const out = []; for (let i = 0; i < 30; i++){ const c = NS.cpuShotChoice({ difficulty, playerX: 1.5, rally: 5, rng: r }); out.push(c.kind + c.x.toFixed(3) + c.z.toFixed(3)); } return { out, calls: t }; };
  assert.notDeepEqual(seq('casual').out, seq('pro').out);
  assert.deepEqual(seq('casual'), seq('sconosciuto'), 'un livello sconosciuto sceglie come Casual');
  assert.deepEqual(seq('leggenda'), seq('pro'));
});

/* ---------- banco ridotto ---------- */
test('banco ridotto: Evento porta l\'adulto medio verso 60–70 punti su 100; Bambini fa vincere game al bambino; k resta nei limiti', { timeout: 240000 }, () => {
  try {
    const seeds = SERIE.A(3), points = 200;
    const ev = measure({ profile: 'amatore', difficulty: 'evento', fair: true, gamesToWin: 1, points, seeds });
    assert.ok(ev.puntiG >= 55 && ev.puntiG <= 75, `Evento, amatore: ${ev.puntiG}% dei punti`);
    assert.ok(ev.k.p10 >= 0 && ev.k.p90 <= 1 && ev.k.escursioneMax <= .55, `k: ${JSON.stringify(ev.k)}`);
    const cas = measure({ profile: 'amatore', difficulty: 'casual', fair: true, gamesToWin: 1, points, seeds });
    assert.ok(cas.puntiG > ev.puntiG + 10, `a Casual lo stesso profilo vince molto di più: ${cas.puntiG}% contro ${ev.puntiG}%`);
    const bb = measure({ profile: 'bambino', difficulty: 'bambini', fair: true, gamesToWin: 1, points, seeds });
    const bc = measure({ profile: 'bambino', difficulty: 'casual', fair: true, gamesToWin: 1, points, seeds });
    assert.ok(bb.puntiG >= 60 && bb.gameG >= 75, `Bambini, bambino: ${bb.puntiG}% dei punti, ${bb.gameG}% dei game`);
    assert.ok(bb.puntiG > bc.puntiG + 15 && bb.colpi.media > bc.colpi.media, `più punti e scambi più lunghi che a Casual: ${bb.puntiG}% e ${bb.colpi.media} colpi contro ${bc.puntiG}% e ${bc.colpi.media}`);
  } finally { NS.eventoRestart(null); }
});

/* ---------- «Chi gioca» ---------- */
test('«Chi gioca»: Bambino → Bambini, Ragazzo → Casual, Adulto → Evento; di base Adulto, o il livello dell\'indirizzo', () => {
  assert.deepEqual(WHO, ['bambino', 'ragazzo', 'adulto']);
  assert.deepEqual(WHO_LEVEL, { bambino: 'bambini', ragazzo: 'casual', adulto: 'evento' });
  assert.equal(WHO_DEFAULT, 'adulto');
  for (const lv of CPU_LEVELS) assert.ok(NS.SKILL_LEVELS[lv], `${lv}: livello del motore`);
  assert.equal(whoOfLevel('evento'), 'adulto'); assert.equal(whoOfLevel('casual'), 'ragazzo'); assert.equal(whoOfLevel('pro'), null);
  assert.equal(baseLevel(''), 'evento'); assert.equal(baseLevel('?foo=1'), 'evento');
  // gli indirizzi di sempre continuano a valere, e valgono anche per i due livelli nuovi
  assert.equal(urlLevel('?mode=pro'), 'pro'); assert.equal(urlLevel('?difficulty=LEGGENDA'), 'leggenda'); assert.equal(urlLevel('?mode=casual'), 'casual');
  assert.equal(urlLevel('?mode=bambini'), 'bambini'); assert.equal(baseLevel('?mode=evento&x=1'), 'evento');
  assert.equal(urlLevel('?mode=1v1'), null); assert.equal(urlLevel('?mode=boh'), null);
  assert.equal(baseLevel('?mode=leggenda'), 'leggenda');
  // Esperta e Leggenda non corrispondono a una tessera: lo dice la riga sotto le tessere e il riassunto
  assert.equal(levelSummary('pro'), 'CPU Esperta'); assert.equal(levelSummary('leggenda'), 'CPU Leggenda');
  for (const lv of ['bambini', 'casual', 'evento', '1v1', undefined]){ assert.equal(levelSummary(lv), null, String(lv)); assert.equal(whoNote(lv), ''); }
  assert.match(whoNote('pro'), /CPU Esperta.*Altre impostazioni/);
  assert.equal(matchSummary({ games: 1, level: 'CPU Esperta' }), 'CPU Esperta · 1 game · singolare · 3ª persona');
  assert.equal(matchSummary({ games: 3 }), 'Al meglio di 3 · singolare · 3ª persona', 'senza livello il riassunto è quello di prima');
  assert.equal(matchSummary({ games: 1, split: true, level: 'CPU Esperta' }), '1 game · 3ª persona', 'nello stesso schermo niente livello');
});

/* ---------- segnale del momento giusto ---------- */
test('segnale: di base acceso a Bambini ed Evento, spento agli altri; «Sì» e «No» valgono per tutti; mai tra due persone', () => {
  assert.equal(cueDefault('bambini'), true); assert.equal(cueDefault('evento'), true);
  for (const lv of ['casual', 'pro', 'leggenda']) assert.equal(cueDefault(lv), false, lv);
  for (const lv of CPU_LEVELS){
    assert.equal(cueOn({ level: lv, pref: 'auto' }), cueDefault(lv), lv);
    assert.equal(cueOn({ level: lv, pref: 'on' }), true, lv); assert.equal(cueOn({ level: lv, pref: 'off' }), false, lv);
    assert.equal(cueOn({ level: lv, pref: 'on', versus: true }), false, `${lv}, stesso schermo o sfida tra due computer`);
  }
  assert.equal(cueOn({ level: '1v1', pref: 'on' }), false);
  const st = storage();
  assert.equal(readCue({ storage: st }), 'auto');
  assert.equal(writeCue('on', { storage: st }), 'on'); assert.equal(st.getItem(CUE_KEY), '1'); assert.equal(readCue({ storage: st }), 'on');
  assert.equal(writeCue('off', { storage: st }), 'off'); assert.equal(readCue({ storage: st }), 'off');
  assert.equal(writeCue('auto', { storage: st }), 'auto'); assert.equal(st.getItem(CUE_KEY), null);
  assert.equal(writeCue('boh', { storage: st }), 'auto');
  assert.equal(readCue({ storage: { getItem(){ throw new Error('no'); } } }), 'auto');
});

test('segnale: l\'anello si stringe mentre la palla arriva, è verde nella finestra «Perfetto», poi rosso e sparisce', () => {
  const span = NS.SKILL_LEVELS.casual.timingSpan, perfect = NS.SWING_AIM.centre*span;
  assert.equal(cueView(null), null); assert.equal(cueView(CUE.lead + .01, span), null, 'palla ancora lontana');
  const far = cueView(CUE.lead, span), mid = cueView(CUE.lead/2, span), now = cueView(0, span);
  assert.equal(far.phase, 'wait'); assert.ok(near(far.diameter, CUE.wide));
  assert.ok(mid.diameter < far.diameter && mid.diameter > now.diameter); assert.ok(near(now.diameter, CUE.tight));
  assert.equal(now.phase, 'now'); assert.equal(cueView(perfect*.9, span).phase, 'now'); assert.equal(cueView(-perfect*.9, span).phase, 'now');
  assert.equal(cueView(perfect*1.2, span).phase, 'wait'); assert.equal(cueView(-perfect*1.2, span).phase, 'late');
  assert.equal(cueView(-(perfect + CUE.after + .01), span), null, 'palla passata');
  // la finestra verde è quella del voto «Perfetto» del livello (swingGrade)
  for (const lv of ['casual', 'bambini', 'pro']){
    const L = NS.SKILL_LEVELS[lv], p = NS.SWING_AIM.centre*L.timingSpan;
    for (const t of [-p*1.3, -p*.8, 0, p*.8, p*1.3]) assert.equal(cueView(t, L.timingSpan).phase === 'now', NS.swingGrade(t, L).grade === 'PERFECT', `${lv} ${t}`);
  }
  assert.ok(NS.SKILL_LEVELS.bambini.timingSpan > span, 'a Bambini la finestra verde è più larga');
});

test('segnale: è solo disegno, la partita simulata è la stessa con il segnale acceso o spento (stessi semi)', async () => {
  const { NatpfTimingCue } = await import('../src/natpf/natpf_timing_cue.js');
  let seen = 0;
  const run = on => simulate({ profile: 'amatore', difficulty: 'bambini', points: 25, seed: 11, setup: e => { e.natpfCueTest = new NatpfTimingCue(e); e.natpfCueTest.pref = on ? 'on' : 'off'; },
    onStep: e => { e.natpfCueTest.update(1/120); if (e.natpfCueTest.view) seen++; } });
  const acceso = run(true), visti = seen; seen = 0;
  const spento = run(false);
  assert.ok(visti > 200, `acceso: l'anello è in vista mentre la palla arriva (${visti} passi)`); assert.equal(seen, 0, 'spento: mai');
  assert.deepEqual(acceso.rallies, spento.rallies); assert.equal(acceso.won, spento.won); assert.deepEqual(acceso.grades, spento.grades);
});

/* ---------- colpo super spiegato ---------- */
test('colpo super spiegato: la prima volta la regola e il motivo, poi solo il motivo; niente se il gesto non era fortissimo', () => {
  const strong = { power: 1, depth: 1, shot: 'topspin' };
  const shot = (why, o = {}) => ({ who: 'player', intent: strong, out: { shot: 'TOPSPIN' }, super: null, superWhy: [why], superRel: 1.1, ...o });
  const first = superHint(shot('palla né alta, né lenta, né corta'), { first: true });
  assert.ok(first.first && first.text.startsWith(SUPER_RULE) && /bassa e veloce/.test(first.text), first.text);
  const again = superHint(shot('fuori tempo'));
  assert.equal(again.text, 'Super mancato: eri fuori tempo.'); assert.ok(again.seconds < first.seconds);
  assert.match(superHint(shot('in corsa o in allungo')).text, /in corsa/);
  assert.match(superHint(shot('colpo innaturale (palla dall\'altra parte)')).text, /lato sbagliato/);
  assert.match(superHint(shot('colpo slice')).text, /dritto, rovescio o schiacciata/);
  // niente scritta: super riuscito, colpo fallito, gesto non fortissimo, motivo che non spiega niente
  assert.equal(superHint(shot('gesto fortissimo', { super: 'alta' })), null);
  assert.equal(superHint(shot('fuori tempo', { out: { failed: true } })), null);
  assert.equal(superHint(shot('fuori tempo', { superRel: .8 })), null);
  assert.equal(superHint(shot('gesto non abbastanza forte')), null); assert.equal(superHint(shot('colpo non riuscito')), null);
  assert.equal(superHint(null), null);
  for (const w of ['gesto non abbastanza forte', 'colpo non riuscito', '', undefined]) assert.equal(superReason(w), null);
  // le condizioni del super non sono toccate (decisione del 29/10)
  assert.deepEqual({ power: SUPER.power, timing: SUPER.timing, quality: SUPER.quality, highY: SUPER.highY, slowVz: SUPER.slowVz }, { power: .86, timing: .6, quality: .8, highY: 1.25, slowVz: 12.5 });
  // le frasi sono corte: stanno in due righe sul grande schermo
  assert.ok(SUPER_RULE.length <= 80 && first.text.length <= 130 && again.text.length <= 60);
});
