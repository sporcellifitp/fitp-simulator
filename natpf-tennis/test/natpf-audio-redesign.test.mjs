// Audio del 28/10: arrangiamento che cambia a ogni giro, clip vocali registrate per ogni annuncio, volumi separati.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NATPF_TRACKS, NatpfMusic, ARRANGEMENT, arrangementFor, TRACK_GROUPS, groupOf, trackForState } from '../src/natpf/natpf_music.js';
import { callout, clipName, UMPIRE_CLIPS, CUE_CLIPS, PLAYER_CLIPS, NatpfVoice } from '../src/natpf/natpf_voice.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
globalThis.localStorage ||= mem();

function fakeAudioContext(){
  const param = () => ({ value: 0, setValueAtTime(){}, linearRampToValueAtTime(){}, exponentialRampToValueAtTime(){}, setTargetAtTime(){}, cancelScheduledValues(){} });
  const node = () => ({ gain: param(), frequency: param(), detune: param(), Q: param(), delayTime: param(), playbackRate: param(), type: '', buffer: null,
    connect(n){ return n; }, disconnect(){}, start(){ ctx.started++; }, stop(){}, get context(){ return ctx; } });
  const ctx = { currentTime: 0, sampleRate: 48000, started: 0, createGain: node, createOscillator: node, createBiquadFilter: node, createDelay: node, createBufferSource: node };
  return ctx;
}

test('arrangiamento: il brano cambia a ogni giro (intro, pieno, break, lift); i brani brevi restano interi', () => {
  const t = NATPF_TRACKS.arcade_rush;
  assert.deepEqual([0, 1, 2, 3, 4].map(p => arrangementFor(t, p).name), ['intro', 'full', 'break', 'lift', 'intro']);
  assert.equal(arrangementFor(t, 0).lead, false); assert.equal(arrangementFor(t, 2).kick, false);
  for (const id of ['court_intro', 'game_point', 'victory_fanfare', 'replay']) assert.equal(arrangementFor(NATPF_TRACKS[id], 0).name, 'full', id);
  // nel sequencer: senza melodia nel primo giro, con la melodia nel secondo
  const ctx = fakeAudioContext(), music = new NatpfMusic(ctx, ctx.createGain());
  let leads = 0; const orig = music._voice.bind(music);
  music._voice = (kind, ...a) => { if (kind === t.lead.voice) leads++; return orig(kind, ...a); };
  music._switch(t, { fade: false });
  const loop = t.chords.length*16;
  for (let i = 0; i < loop; i++) music._scheduleStep(t, i, i*.1);
  assert.equal(leads, 0, 'intro senza melodia');
  music.loops = 1;
  for (let i = 0; i < loop; i++) music._scheduleStep(t, i, i*.1);
  assert.ok(leads > 20, `pieno con la melodia (${leads})`);
});

test('brani per contesto: tutorial e minigiochi hanno due brani ciascuno, la partita ne ha quattro', () => {
  assert.equal(trackForState('training'), 'tutorial_flow'); assert.equal(trackForState('minigame'), 'arcade_rush');
  assert.deepEqual(TRACK_GROUPS.tutorial_flow.tracks, ['tutorial_flow', 'tutorial_drift']);
  assert.deepEqual(TRACK_GROUPS.arcade_rush.tracks, ['arcade_rush', 'arcade_combo']);
  assert.equal(TRACK_GROUPS.match_rally.tracks.length, 4);
  for (const g of Object.values(TRACK_GROUPS)) for (const id of g.tracks) assert.ok(NATPF_TRACKS[id], id);
  // ogni brano appartiene a un solo gruppo
  const seen = new Set(); for (const g of Object.values(TRACK_GROUPS)) for (const id of g.tracks){ assert.ok(!seen.has(id), id); seen.add(id); assert.equal(groupOf(id), groupOf(g.tracks[0])); }
});

test('voci registrate: ogni annuncio del motore ha la sua clip e tutti i file esistono', () => {
  const files = new Set(fs.readdirSync(path.join(ROOT, 'public/voce')).filter(f => f.endsWith('.mp3')).map(f => f.slice(0, -4)));
  const labels = ['15 - 00', '30 - 00', '40 - 00', '00 - 15', '00 - 30', '00 - 40', '15 - 30', '30 - 15', '15 - 40', '40 - 15', '30 - 40', '40 - 30', '00 - 00', '15 - 15', '30 - 30', '40 - 40', 'AD - 40', 'Start', 'Game Point', 'Break Point', 'Match Point', 'Game', 'Game Set and Match', 'Out', 'Net', 'Ace', 'Nice shot', 'Power serve', 'Smash', 'Replay'];
  for (const l of labels){ const p = callout(l); assert.ok(p, l); assert.ok(files.has(clipName(p)), `${l} → ${clipName(p)}`); }
  const all = new Set([...UMPIRE_CLIPS, ...Object.values(CUE_CLIPS), ...Object.values(PLAYER_CLIPS).flat()]);
  for (const n of all) assert.ok(files.has(n), n);
  // una sola lingua: nessun file fuori elenco (le clip italiane della prima versione sono state tolte)
  for (const f of files) assert.ok(all.has(f), `clip non usata: ${f}`);
  assert.ok(fs.existsSync(path.join(ROOT, 'public/voce/LEGGIMI.txt')), 'provenienza e diritti delle clip');
  // peso contenuto: meno di 600 kB in tutto
  const bytes = [...files].reduce((n, f) => n + fs.statSync(path.join(ROOT, 'public/voce', f + '.mp3')).size, 0);
  assert.ok(bytes < 600*1024, `${bytes} byte`);
});

test('voce: con la clip caricata suona la clip (bus delle voci), senza clip ripiega sulla sintesi del browser', () => {
  const ctx = fakeAudioContext();
  const spoken = [];
  globalThis.SpeechSynthesisUtterance = class { constructor(t){ this.text = t; } };
  const synth = { getVoices: () => [{ lang: 'en-GB', name: 'Google UK English Female' }], speak: u => spoken.push(u.text), cancel(){}, addEventListener(){} };
  const v = new NatpfVoice({ synth });
  v.ctx = ctx; v.dest = ctx.createGain();
  v.clips.set('fifteen-love', { duration: .6 });
  assert.equal(v.say('15 - 00'), 'Fifteen love'); assert.equal(ctx.started, 1); assert.deepEqual(spoken, []);
  assert.equal(v.say('30 - 00'), 'Thirty love'); assert.deepEqual(spoken, ['Thirty love'], 'senza clip: sintesi');
  v.clips.set('cue-combo', {}); assert.equal(v.cue('combo'), true);
  v.setEnabled(false); assert.equal(v.cue('combo'), false); v.setEnabled(true);
});
