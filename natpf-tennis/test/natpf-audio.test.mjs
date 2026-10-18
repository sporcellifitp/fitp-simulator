// Identità NATPF: colonna sonora generata, voce italiana del punteggio, testi dell'HUD e assenza di riferimenti
// visibili al gioco di partenza. node --import ./test/register.mjs --test test/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NATPF_TRACKS, NatpfMusic, trackForState, parseChord, noteToMidi } from '../src/natpf/natpf_music.js';
import { italianCallout, pickItalianVoice, NatpfVoice } from '../src/natpf/natpf_voice.js';
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
test('colonna sonora: sei brani originali, battute da 16 passi, accordi e note validi', () => {
  const ids = Object.keys(NATPF_TRACKS);
  assert.deepEqual(ids.sort(), ['court_intro', 'game_point', 'match_rally', 'menu_theme', 'replay', 'victory_fanfare']);
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
  assert.equal(music.currentId, 'match_rally');
  assert.deepEqual(switched, ['match_rally']);
  assert.ok(music.scheduledNotes > 100);
  assert.ok(music.nextTime <= ctx.currentTime + 0.2, 'look-ahead breve');
  // il loop dello scambio riparte dalla prima battuta senza fermarsi
  const loopLength = NATPF_TRACKS.match_rally.chords.length*4*60/NATPF_TRACKS.match_rally.bpm;
  const t0 = ctx.currentTime;
  for (; ctx.currentTime < t0 + loopLength*1.5; ctx.currentTime += 0.025) music._tick();
  assert.equal(music.currentId, 'match_rally');
  music.timer = null; music.stop();
  assert.equal(music.playing, false);
});

test('voce: annunci del motore → frasi italiane', () => {
  const cases = {
    '15 - 00': 'quindici zero', '00 - 30': 'zero trenta', '30 - 30': 'trenta pari', '40 - 15': 'quaranta quindici',
    Deuce: 'Parità', 'Ad In': 'Vantaggio', 'Ad Out': 'Vantaggio', 'Game Point': 'Palla game', 'Break Point': 'Palla break',
    'Match Point': 'Palla match', Game: 'Game', 'Game Set and Match': 'Game, set e partita', Out: 'Fuori', Net: 'Rete',
    'Ace!': 'Ace', 'Nice Shot!': 'Bel colpo', Start: 'Inizio partita', 'Palla game': 'Palla game', parità: 'Parità',
  };
  for (const [en, it] of Object.entries(cases)) assert.equal(italianCallout(en), it, en);
  assert.equal(italianCallout('qualcosa di strano'), null);
  assert.equal(italianCallout(''), null);
});

test('voce: solo voci italiane, silenzio senza; si può spegnere', () => {
  const en = { name: 'English', lang: 'en-US' }, it = { name: 'Elsa', lang: 'it-IT' }, itNat = { name: 'Isabella Online (Natural)', lang: 'it-IT' };
  assert.equal(pickItalianVoice([en]), null);
  assert.equal(pickItalianVoice([en, it]), it);
  assert.equal(pickItalianVoice([it, itNat]), itNat);
  const spoken = [];
  globalThis.SpeechSynthesisUtterance = class { constructor(text){ this.text = text; } };
  const synth = voices => ({ getVoices: () => voices, speak: u => spoken.push(u), cancel(){}, addEventListener(){} });
  const silent = new NatpfVoice({ synth: synth([en]) });
  assert.equal(silent.say('15 - 00'), null);
  assert.equal(spoken.length, 0, 'nessuna voce inglese di ripiego');
  const voice = new NatpfVoice({ synth: synth([en, it]) });
  assert.equal(voice.say('Deuce'), 'Parità');
  assert.equal(spoken[0].lang, 'it-IT'); assert.equal(spoken[0].voice, it);
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
