// Identità NATPF: colonna sonora generata, voce italiana del punteggio, testi dell'HUD e assenza di riferimenti
// visibili al gioco di partenza. node --import ./test/register.mjs --test test/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NATPF_TRACKS, NatpfMusic, trackForState, parseChord, noteToMidi, TRACK_GROUPS, groupOf } from '../src/natpf/natpf_music.js';
import { callout, pickEnglishVoice, NatpfVoice } from '../src/natpf/natpf_voice.js';
import { t, scoreText } from '../src/natpf/natpf_i18n.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// AudioContext finto: ogni nodo accetta connect/start/stop e parametri automatizzabili; il tempo si fa avanzare a mano.
function fakeAudioContext(){
  const param = () => ({ value: 0, setValueAtTime(){}, linearRampToValueAtTime(){}, exponentialRampToValueAtTime(){}, setTargetAtTime(){}, cancelScheduledValues(){} });
  const node = () => ({ gain: param(), frequency: param(), detune: param(), Q: param(), delayTime: param(), type: '', buffer: null,
    connect(n){ return n; }, disconnect(){}, start(){}, stop(){}, get context(){ return ctx; } });
  const ctx = { currentTime: 0, sampleRate: 48000, createGain: node, createOscillator: node, createBiquadFilter: node, createDelay: node, createBufferSource: node };
  return ctx;
}

// nomi del gioco di partenza, composti così da non comparire nei sorgenti
const ORIGIN = new RegExp(['ar' + 'gon', 'ly' + 'ria', 'ai st' + 'udio', '\\bm' + 'ii\\b'].join('|'), 'i');
test('colonna sonora: diciassette brani originali, battute da 16 passi, accordi e note validi', () => {
  const ids = Object.keys(NATPF_TRACKS);
  assert.deepEqual(ids.sort(), ['arcade_combo', 'arcade_rush', 'court_intro', 'game_point', 'game_point_tension', 'match_night', 'match_rally', 'menu_lounge', 'menu_palazzetto', 'menu_theme', 'rally_baseline', 'rally_volley', 'replay', 'tutorial_drift', 'tutorial_flow', 'victory_fanfare', 'victory_parade']);
  const melodies = new Set();
  for (const tr of Object.values(NATPF_TRACKS)){
    const bars = tr.chords.length;
    assert.ok(tr.title && !ORIGIN.test(tr.title + tr.subtitle), tr.id);
    for (const c of tr.chords) assert.ok(parseChord(c), `${tr.id}: accordo ${c}`);
    assert.equal(tr.lead.bars.length, bars, `${tr.id}: una battuta di melodia per accordo`);
    for (const bar of tr.lead.bars){
      assert.equal(bar.length, 16, `${tr.id}: ${bar.join(' ')}`);
      for (const tok of bar) assert.ok(tok === '-' || tok === '.' || noteToMidi(tok) !== null, `${tr.id}: nota ${tok}`);
    }
    const kits = Array.isArray(tr.drums) ? tr.drums : [tr.drums];
    for (const pat of [tr.bass.pattern, tr.arp?.pattern, ...kits.flatMap(k => Object.values(k))].filter(Boolean)) assert.equal(pat.split(/\s+/).length, 16, `${tr.id}: ${pat}`);
    assert.ok(tr.bpm >= 80 && tr.bpm <= 150);
    melodies.add(tr.lead.bars.flat().join(' '));
  }
  assert.equal(melodies.size, ids.length, 'ogni brano ha una melodia propria');
  assert.equal(NATPF_TRACKS.court_intro.loopFrom, null);
  assert.equal(NATPF_TRACKS.court_intro.next, 'match_rally');
});

test('stato del gioco → brano: lobby, ingresso, scambio, punto decisivo, moviola, vittoria', () => {
  assert.equal(trackForState('title'), 'menu_theme');
  assert.equal(trackForState('start'), 'court_intro');
  assert.equal(trackForState('rally'), 'match_rally');
  assert.equal(trackForState('gamepoint'), 'game_point');
  assert.equal(trackForState('replay'), 'replay');
  assert.equal(trackForState('victory'), 'victory_fanfare');
  assert.equal(trackForState('qualsiasi'), 'match_rally');
});

test('sequencer: note programmate in anticipo, ingresso in campo che passa da solo allo scambio senza buchi', () => {
  const ctx = fakeAudioContext();
  const music = new NatpfMusic(ctx, ctx.createGain());
  const switched = [];
  music.onSwitch = id => switched.push(id);
  music._startTimer = function(){ this.timer = 1; };   // niente setInterval: il tempo avanza a mano
  music.play('court_intro');
  assert.equal(music.currentId, 'court_intro');
  music.play('match_rally');                     // richiesto durante l'ingresso: aspetta la fine
  assert.equal(music.currentId, 'court_intro');
  const introLength = 4*4*60/NATPF_TRACKS.court_intro.bpm;
  let lastNext = music.nextTime;
  for (ctx.currentTime = 0; ctx.currentTime < introLength + 1; ctx.currentTime += 0.025){
    music._tick();
    assert.ok(music.nextTime >= lastNext, 'il tempo delle note non torna indietro');
    lastNext = music.nextTime;
  }
  // dopo l'ingresso un brano dello scambio (la scaletta parte da un brano a caso del gruppo, 28/10)
  assert.equal(groupOf(music.currentId), 'match_rally');
  assert.equal(switched.length, 1); assert.equal(switched[0], music.currentId);
  assert.ok(music.scheduledNotes > 100);
  // look-ahead breve: al massimo 0,14 s più un sedicesimo (con lo swing) del brano che suona
  const sixteenth = 60/NATPF_TRACKS[music.currentId].bpm/4*(1 + (NATPF_TRACKS[music.currentId].swing || 0));
  assert.ok(music.nextTime <= ctx.currentTime + 0.14 + sixteenth + 0.026, 'look-ahead breve');
  // il loop dello scambio riparte dalla prima battuta senza fermarsi
  const rally = music.currentId, loopLength = NATPF_TRACKS[rally].chords.length*4*60/NATPF_TRACKS[rally].bpm;
  const t0 = ctx.currentTime;
  for (; ctx.currentTime < t0 + loopLength*1.5; ctx.currentTime += 0.025) music._tick();
  assert.equal(music.currentId, rally);
  music.timer = null; music.stop();
  assert.equal(music.playing, false);
});

test('voce: annunci del motore (e dell\u2019HUD in italiano) → frasi inglesi', () => {
  const cases = {
    '15 - 00': 'Fifteen love', '00 - 30': 'Love thirty', '30 - 30': 'Thirty all', '00 - 00': 'Love all', '40 - 15': 'Forty fifteen',
    '40 - 40': 'Deuce', Deuce: 'Deuce', 'Ad In': 'Advantage', 'Ad Out': 'Advantage', 'AD - 40': 'Advantage', 'Game Point': 'Game point',
    'Break Point': 'Break point', 'Match Point': 'Match point', Game: 'Game', 'Game Set and Match': 'Game, set and match', Out: 'Out',
    Net: 'Net', 'Ace!': 'Ace', 'Nice Shot!': 'Nice shot', Start: 'Ready? Play!', 'Palla game': 'Game point', parità: 'Deuce',
    Fuori: 'Out', 'Power serve': 'Big serve',
  };
  for (const [label, phrase] of Object.entries(cases)) assert.equal(callout(label), phrase, label);
  assert.equal(callout('qualcosa di strano'), null);
  assert.equal(callout(''), null);
});

test('voce: una sola lingua, l\u2019inglese; senza clip ripiega su una voce inglese del browser; si può spegnere', () => {
  const it = { name: 'Elsa', lang: 'it-IT' }, en = { name: 'English', lang: 'en-US' }, enNat = { name: 'Libby Online (Natural)', lang: 'en-GB' };
  assert.equal(pickEnglishVoice([it]), null);
  assert.equal(pickEnglishVoice([it, en]), en);
  assert.equal(pickEnglishVoice([en, enNat]), enNat);
  const spoken = [];
  globalThis.SpeechSynthesisUtterance = class { constructor(text){ this.text = text; } };
  const synth = voices => ({ getVoices: () => voices, speak: u => spoken.push(u), cancel(){}, addEventListener(){} });
  const silent = new NatpfVoice({ synth: synth([it]) });
  assert.equal(silent.say('15 - 00'), null);
  assert.equal(spoken.length, 0, 'nessuna voce italiana di ripiego: una sola lingua');
  const voice = new NatpfVoice({ synth: synth([it, en]) });
  assert.equal(voice.say('Deuce'), 'Deuce');
  assert.equal(spoken[0].lang, 'en-US'); assert.equal(spoken[0].voice, en);
  voice.setEnabled(false);
  assert.equal(voice.say('Game'), null);
  assert.equal(spoken.length, 1);
  delete globalThis.SpeechSynthesisUtterance;
});

test('HUD in italiano: etichette del motore tradotte quando si mostrano', () => {
  assert.equal(t('PERFECT • FOREHAND TOPSPIN!'), 'PERFETTO • DRITTO TOPSPIN!');
  assert.equal(t('SWING TIMING'), 'TEMPO DEL COLPO');
  assert.equal(t('EARLY (CROSS)'), 'ANTICIPO (INCROCIATO)');
  assert.equal(t('TOO LATE! • WHIFF'), 'TROPPO TARDI! • A VUOTO');
  assert.equal(t('Game Point'), 'Palla game');
  assert.equal(t('YOU WIN!'), 'HAI VINTO!');
  assert.equal(t('Final Games: 2 - 0'), 'Game finali: 2 - 0');
  assert.equal(t('Net Close'), 'Rete');
  assert.equal(t('Punto di prova'), 'Punto di prova', 'i testi già italiani restano com\'erano');
  assert.equal(scoreText('00'), '0');
  assert.equal(scoreText('15 - 00'), '15 - 0');
  assert.equal(scoreText('Deuce', { short: true }), 'PARITÀ');
  assert.equal(scoreText('Ad In', { short: true }), 'VANT.');
});

test('white label: nessun riferimento visibile al gioco di partenza, niente audio o QR esterni', () => {
  const visible = new RegExp(ORIGIN.source + '|ammaar|club ai|w' + 'ii sports', 'i');
  const html = read('index.html').replace(/<!--[\s\S]*?-->/g, '').replace(/\s(id|class|for|data-[\w-]+)="[^"]*"/g, '');
  assert.ok(!visible.test(html), (html.match(visible) || [])[0]);
  for (const f of ['metadata.json', 'README.md']) assert.ok(!ORIGIN.test(read(f)), f);
  const pkg = JSON.parse(read('package.json'));
  assert.ok(!ORIGIN.test(pkg.name + pkg.description));
  const audio = read('src/audio_engine.js');
  assert.ok(!/gstatic|\.mp3|new Audio\(/i.test(audio) && !ORIGIN.test(audio), 'audio solo sintetizzato');
  const hud = read('src/hud_ui.js');
  assert.ok(!/gstatic|Ammaar|Club AI|"Matt"/.test(hud) && !ORIGIN.test(hud));
  assert.ok(!/textures\/court/.test(read('src/game_engine.js')), 'niente texture esterne del cielo');
});

test('musica varia: ogni schermata ha più brani, a rotazione, mai lo stesso due volte di fila; in partita cambia dopo qualche giro', () => {
  for (const [head, g] of Object.entries(TRACK_GROUPS)){ assert.ok(g.tracks.length >= 2, head); for (const id of g.tracks) assert.equal(groupOf(id), head); }
  const ctx = fakeAudioContext();
  const music = new NatpfMusic(ctx, ctx.createGain());
  music._startTimer = function(){ this.timer = 1; };
  const menus = [];
  for (let i = 0; i < 4; i++){ music.play('menu_theme'); menus.push(music.currentId); music.play('match_rally'); }
  for (let i = 1; i < menus.length; i++) assert.notEqual(menus[i], menus[i - 1], `menu ${menus}`);
  assert.equal(new Set(menus).size, 3, `tutti e tre i brani del menu: ${menus}`);
  // stessa schermata chiesta di nuovo (il motore lo fa a ogni punto): il brano non riparte
  music.play('match_rally'); const now = music.currentId; music.play('match_rally'); assert.equal(music.currentId, now);
  // durante lo scambio: dopo `rotate` giri entra il brano successivo, alla fine del giro e senza silenzi
  const switched = []; music.onSwitch = id => switched.push(id);
  const first = music.currentId, loopS = id => NATPF_TRACKS[id].chords.length*4*60/NATPF_TRACKS[id].bpm;
  for (let t = 0; t < loopS(first)*TRACK_GROUPS.match_rally.rotate + 1; t += .1){ ctx.currentTime = t; music._tick(); }
  assert.ok(switched.length >= 1 && switched[0] !== first && groupOf(switched[0]) === 'match_rally', `${first} → ${switched}`);
});
