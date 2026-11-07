// Segnalazione del 06/11: «la voce dice "smash" ma non è realmente quel colpo». La voce diceva «Smash» per ogni colpo
// giocato dal motore come schiacciata (swingType «smash»): in singolo ogni palla sopra 2,3 m (SMASH_FROM.always), anche
// con il gesto del dritto; nel doppio (senza finestra d'impatto, regola di sempre) ogni palla sopra 1,78 m e ogni colpo
// forte (piatto) sopra 1,5 m; e anche quando la scritta diceva altro («Volée» del compagno, «Super!»). Ora la voce dice
// «Smash» solo per la schiacciata voluta (gesto della schiacciata E palla alta), e la scritta dice la stessa cosa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeadlessEngine, mulberry32 } from '../scripts/audit/headless-engine.mjs';
import { ENGINE_SHOT } from '../src/natpf/natpf_gestures.js';
import { smashAt, smashCalled, smashGesture, SMASH_FROM } from '../src/natpf/natpf_stroke_outcome.js';

const noop = () => {};
function withEngine({ difficulty = 'pro', doubles = false } = {}, fn){
  const real = Math.random; Math.random = mulberry32(6);
  try {
    const e = createHeadlessEngine({ difficulty });
    e.startNewMatch({ showStartBanner: false });
    if (doubles) e.isDoubles = true;
    const voice = [], popups = [], haptic = [];
    e.audioEngine = new Proxy({ playVoiceCallout: (s) => voice.push(String(s)) }, { get: (t, k) => (k in t ? t[k] : noop) });
    e.hud = new Proxy({ showTimingPopup: (o) => popups.push(String(o.grade)) }, { get: (t, k) => (k in t ? t[k] : noop) });
    e.motionController = { triggerHapticFeedback: (o) => haptic.push(o) };
    return fn(e, { voice, popups, haptic });
  } finally { Math.random = real; }
}
// palla dell'avversario davanti a chi colpisce, all'altezza y, nello scambio (rally: colpi già giocati)
function ballAt(e, actor, { y, ahead = .3, dx = .5, rally = 4, bounced = 0 }){
  e.phase = 'RALLY'; e.ball.inPlay = true; e.ball.lastHitter = 'opponent';
  e.ball.bounceCountOnCurrentSide = bounced; e.ball.rallyStrokeCount = rally;
  e.ball.pos.set(actor.pos.x + dx, y, actor.pos.z - ahead); e.ball.vel.set(0, -1, 14);
  e.ball.targetLanding.set(actor.pos.x, 0, actor.pos.z + 1);
  e.player.swingCooldown = 0; e.playerPartner.swingCooldown = 0;
}
// colpo del telefono con la forma del colpo (come natpfSwingToEngine); natpfTau: colpo dalla finestra d'impatto (singolo)
const phone = (shot, { side = 'forehand', power = .7, rise = 0, tau = 0 } = {}) => ({
  source: 'natpf-phone', side, shotType: ENGINE_SHOT[shot], speed: .8 + power*.85, dirX: 0, ...(tau == null ? {} : { natpfTau: tau, natpfLateSpan: .1 }),
  natpf: { aim: 'swing', shot, intent: { shot, power, depth: power, rise, face: 0 }, power, peak: 900, latency: 0, hand: 'right' },
});
const smashVoice = (voice) => voice.filter(v => /smash/i.test(v)).length;
const saysSmash = (popups) => popups.some(g => /SMASH/.test(g));

test('singolo: dritto su una palla sopra 2,3 m (il motore la gioca da sopra la testa): niente «Smash», né voce né scritta', () => {
  withEngine({}, (e, { voice, popups, haptic }) => {
    e.player.pos.set(.3, 0, 7.5); e.player.targetPos.copy(e.player.pos);
    ballAt(e, e.player, { y: SMASH_FROM.always + .15, bounced: 0 });
    const ev = phone('topspin');
    assert.equal(smashAt(ev, e.ball.pos.y), true, 'il motore la gioca come schiacciata (regola «always», invariata)');
    assert.ok(e._attemptPlayerRallyStrike({ ...ev }, false), 'colpita');
    assert.equal(e.player.swingType, 'smash', 'esito e animazione invariati');
    assert.equal(smashVoice(voice), 0, `voce: ${voice.join(', ')}`);
    assert.ok(popups.length && !saysSmash(popups), `scritta: ${popups.join(' | ')}`);
    assert.ok(!/SMASH/.test(haptic.at(-1)?.shotType || ''), 'al telefono non arriva «schiacciata»');
  });
});

test('singolo: gesto della schiacciata su palla alta: «Smash» detto e scritto, una volta', () => {
  withEngine({}, (e, { voice, popups, haptic }) => {
    e.player.pos.set(.3, 0, 7.5); e.player.targetPos.copy(e.player.pos);
    ballAt(e, e.player, { y: SMASH_FROM.always + .15 });
    assert.ok(e._attemptPlayerRallyStrike(phone('smash', { power: .5 }), false));
    assert.equal(smashVoice(voice), 1, `voce: ${voice.join(', ')}`);
    assert.ok(saysSmash(popups), `scritta: ${popups.join(' | ')}`);
    assert.match(haptic.at(-1)?.shotType || '', /SMASH/);
  });
});

test('singolo: gesto che scende deciso all\'altezza della spalla (regola del 29/10) resta una schiacciata chiamata', () => {
  withEngine({}, (e, { voice, popups }) => {
    e.player.pos.set(.3, 0, 7.5); e.player.targetPos.copy(e.player.pos);
    ballAt(e, e.player, { y: 1.7 });
    const ev = phone('slice', { power: .7, rise: -.5 });
    assert.equal(smashAt(ev, 1.7), true);
    assert.ok(e._attemptPlayerRallyStrike(ev, false));
    assert.equal(smashVoice(voice), 1, `voce: ${voice.join(', ')}`);
    assert.ok(saysSmash(popups), popups.join(' | '));
  });
});

test('doppio: volée di dritto su palla a 1,85 m e colpo forte (piatto) a 1,6 m: niente «Smash»', () => {
  for (const [shot, y] of [['topspin', 1.85], ['flat', 1.6]]) withEngine({ doubles: true }, (e, { voice, popups }) => {
    e.player.pos.set(.3, 0, 4.5); e.player.targetPos.copy(e.player.pos);
    e.playerPartner.pos.set(-3.5, 0, 9); e.playerPartner.targetPos.copy(e.playerPartner.pos);
    ballAt(e, e.player, { y });
    assert.ok(e._attemptPlayerRallyStrike(phone(shot, { power: shot === 'flat' ? .95 : .6, tau: null }), false), `${shot} colpito`);
    assert.equal(e.player.swingType, 'smash', `${shot}: il doppio la gioca ancora da sopra la testa (regola di sempre)`);
    assert.equal(smashVoice(voice), 0, `${shot} a ${y} m, voce: ${voice.join(', ')}`);
    assert.ok(popups.length && !saysSmash(popups), `${shot}: ${popups.join(' | ')}`);
  });
});

test('doppio: la schiacciata voluta resta chiamata; quella presa dal compagno («Volée» scritto) non è detta «Smash»', () => {
  withEngine({ doubles: true }, (e, { voice, popups }) => {
    e.player.pos.set(.3, 0, 4.5); e.player.targetPos.copy(e.player.pos);
    e.playerPartner.pos.set(-3.5, 0, 9); e.playerPartner.targetPos.copy(e.playerPartner.pos);
    ballAt(e, e.player, { y: 2.1 });
    assert.ok(e._attemptPlayerRallyStrike(phone('smash', { tau: null }), false));
    assert.equal(smashVoice(voice), 1, voice.join(', '));
    assert.ok(saysSmash(popups), popups.join(' | '));
  });
  withEngine({ doubles: true }, (e, { voice, popups }) => {
    // il compagno è più vicino alla palla: il colpo è suo (scritta «NET VOLLEY» → «Volée»)
    e.player.pos.set(2.5, 0, 9); e.player.targetPos.copy(e.player.pos);
    e.playerPartner.pos.set(-.5, 0, 4.5); e.playerPartner.targetPos.copy(e.playerPartner.pos);
    ballAt(e, e.playerPartner, { y: 2.1 });
    assert.ok(e._attemptPlayerRallyStrike(phone('topspin', { tau: null }), false));
    assert.equal(e.playerPartner.swingType, 'smash');
    assert.ok(popups.some(g => /NET VOLLEY/.test(g)), popups.join(' | '));
    assert.equal(smashVoice(voice), 0, `voce e scritta diverse: ${voice.join(', ')} / ${popups.join(' | ')}`);
  });
});

test('voce e scritta dicono la stessa cosa: «Smash» detto se e solo se la scritta lo dice', () => {
  const cases = [];
  for (const doubles of [false, true]) for (const shot of ['topspin', 'flat', 'slice', 'lob', 'smash']) for (const y of [1.3, 1.6, 1.9, 2.4, 2.8])
    cases.push({ doubles, shot, y });
  let named = 0;
  for (const c of cases) withEngine({ doubles: c.doubles }, (e, { voice, popups }) => {
    e.player.pos.set(.3, 0, 5); e.player.targetPos.copy(e.player.pos);
    e.playerPartner.pos.set(-3.5, 0, 9); e.playerPartner.targetPos.copy(e.playerPartner.pos);
    ballAt(e, e.player, { y: c.y });
    if (!e._attemptPlayerRallyStrike(phone(c.shot, { tau: c.doubles ? null : 0 }), false)) return;
    const said = smashVoice(voice) > 0, written = saysSmash(popups);
    assert.equal(said, written, `${JSON.stringify(c)}: voce ${voice.join(', ')} / scritta ${popups.join(' | ')}`);
    if (said) { named++; assert.equal(c.shot === 'smash' || c.shot === 'slice', true, `«Smash» per un ${c.shot} a ${c.y} m`); }
  });
  assert.ok(named > 0, 'qualche schiacciata chiamata');
});

test('smashGesture / smashCalled: telefono, webcam (colpo veloce di lato ≠ schiacciata), risposta al servizio', () => {
  // telefono: conta il colpo riconosciuto
  assert.equal(smashGesture(phone('smash')), true);
  assert.equal(smashGesture(phone('flat', { power: 1 })), false);
  assert.equal(smashGesture({ natpf: { shot: 'smash' }, shotType: 'smash', side: 'forehand', dirX: .9, dirY: .1 }), true, 'telefono senza forma: il colpo riconosciuto');
  // webcam: «smash» dello swing veloce di lato (webcam_argon_track: speed ≥ 1,46) non è una schiacciata
  assert.equal(smashGesture({ source: 'webcam', side: 'forehand', shotType: 'smash', speed: 1.6, dirX: -.8, dirY: .1 }), false);
  assert.equal(smashGesture({ source: 'webcam', side: 'forehand', shotType: 'smash', speed: 1.3, dirX: -.2, dirY: .7 }), true, 'da sopra la spalla verso il basso');
  assert.equal(smashGesture({ source: 'webcam', side: null, shotType: 'smash', dirX: 0, dirY: .6 }), true);
  assert.equal(smashGesture({ side: 'overhead' }), true);
  // schiacciata non giocata: mai chiamata
  assert.equal(smashCalled(phone('smash'), { smash: false }), false);
  // giocata: chiamata solo se voluta
  assert.equal(smashCalled(phone('topspin'), { smash: true }), false);
  assert.equal(smashCalled(phone('smash'), { smash: true }), true);
  assert.equal(smashCalled(phone('slice', { rise: -.5 }), { smash: true }), true, 'la mano che scende decisa (regola del 29/10)');
  assert.equal(smashCalled(phone('slice', { rise: -.5 }), { smash: true, serveReturn: true }), false, 'in risposta al servizio solo il gesto');
  assert.equal(smashCalled({ source: 'webcam', side: 'backhand', shotType: 'slice', speed: 1.2, dirX: .5, dirY: .4 }, { smash: true }), false, 'webcam: il tagliato non è una schiacciata voluta');
});
