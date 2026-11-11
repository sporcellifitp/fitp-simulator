// Sfondo sfocato del tutorial «Come si gioca» (B21, src/natpf/natpf_tutorial_bg.js): quando si può mostrare, le due
// clip che si alternano, video fermi a modale chiusa, ripiego se il video non parte, file nel pacchetto. Nel browser:
// tools/e2e/natpf-modale-gesti.mjs. File a sé: i timer sono quelli finti di test/dom-finto.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Node, Video, advance, flush } from './dom-finto.mjs';
import { TUT_BG, tutorialBgAllowed, nextClip, TutorialBackdrop } from '../src/natpf/natpf_tutorial_bg.js';
const repo = rel => fileURLToPath(new URL('../../' + rel, import.meta.url));

test('sfondo del tutorial: le due clip sono nel pacchetto, leggere, senza audio, con la provenienza scritta', () => {
  const size = f => fs.statSync(repo(`natpf-tennis/public/${f.replace(/^\.\//, '')}`)).size;
  assert.deepEqual(TUT_BG.clips, ['./media/tutorial-sfondo-1.mp4', './media/tutorial-sfondo-2.mp4']);
  const clips = TUT_BG.clips.map(size); assert.ok(clips.every(b => b > 50_000 && b < 400_000) && clips[0] + clips[1] < 600_000, clips.join(' + '));
  for (const c of TUT_BG.clips){ const b = fs.readFileSync(repo(`natpf-tennis/public/${c.slice(2)}`)); assert.ok(b.indexOf(Buffer.from('moov')) < b.indexOf(Buffer.from('mdat')), `${c} faststart`); assert.ok(!b.includes(Buffer.from('mp4a')), `${c} senza audio`); }
  const notes = fs.readFileSync(repo('natpf-tennis/public/media/LEGGIMI.txt'), 'utf8');
  for (const f of ['tutorial-sfondo-1.mp4', 'tutorial-sfondo-2.mp4']) assert.ok(notes.includes(f), `${f} non è in LEGGIMI.txt`);
  // la modale lo accende quando si apre e lo ferma quando si chiude; il velo e la scheda sopra il video
  const tut = fs.readFileSync(repo('natpf-tennis/src/natpf/natpf_tutorial.js'), 'utf8'), css = fs.readFileSync(repo('natpf-tennis/natpf-ui.css'), 'utf8');
  assert.match(tut, /this\.bg = new TutorialBackdrop\(root, \{ half \}\)/); assert.match(tut, /this\.bg\?\.start\(\);/); assert.match(tut, /this\.root\?\.classList\.add\('hidden'\);\n\s+this\.bg\?\.stop\(\);/);
  assert.match(css, /\.natpf-tutorial\.has-bg \.tut-bg \{ opacity: 1; \}/); assert.match(css, /\.natpf-tutorial \.tut-bg-veil \{[^}]*rgba\(4, 8, 24, 0\.5\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.natpf-tutorial \.tut-bg \{ display: none; \} \}/);
  assert.doesNotMatch(css.slice(css.indexOf('.natpf-tutorial .tut-bg {'), css.indexOf('.natpf-tutorial .tut-card { position: relative; }')), /\d(vw|vh)\b|backdrop-filter|filter:/, 'niente vw/vh né filtri dal vivo');
});

test('sfondo del tutorial: quando si può, alternanza delle due clip', () => {
  assert.equal(tutorialBgAllowed({}), true);
  assert.equal(tutorialBgAllowed({ reducedMotion: true }), false, '«riduci movimento»: niente video');
  assert.equal(tutorialBgAllowed({ saveData: true }), false); assert.equal(tutorialBgAllowed({ clips: 0 }), false);
  assert.equal(tutorialBgAllowed({ half: true }), false, 'stesso schermo: niente video (dimezzava i fotogrammi al secondo)');
  assert.equal(tutorialBgAllowed({ half: true, halfOk: true }), true); assert.equal(TUT_BG.half, false);
  assert.equal(nextClip(-1), 0); assert.equal(nextClip(0), 1); assert.equal(nextClip(1), 0); assert.equal(nextClip(0, 1), 0); assert.equal(nextClip(3, 0), 0);
});

test('sfondo del tutorial: parte a modale aperta, alterna le clip, si ferma a modale chiusa; ripiego se il video non parte', async () => {
  const mk = (behave, win = {}) => { const root = new Node(); root.appendChild(new Node()); const made = [];
    const doc = { createElement: tag => { const n = tag === 'video' ? new Video(behave) : new Node(tag); n.dataset = {}; if (tag === 'video') made.push(n); return n; } };
    return { root, made, B: new TutorialBackdrop(root, { doc, win }) }; };
  const { root, made, B } = mk('ok');
  assert.equal(made.length, 0, 'niente video finché la modale non si apre');
  assert.equal(B.start(), true); assert.equal(made.length, 2); assert.equal(root.children[0].className, 'tut-bg', 'primo figlio: sotto la scheda');
  assert.ok(made.every(v => v.muted && v.playsInline && !v.loop)); assert.equal(made[0].src, TUT_BG.clips[0]); assert.equal(made[1].src, '', 'la seconda clip si scarica dopo');
  assert.ok(!root.cls.has('has-bg'), 'si vede solo quando gira davvero');
  advance(120); assert.ok(root.cls.has('has-bg')); assert.ok(made[0].cls.has('on')); assert.equal(made[1].src, TUT_BG.clips[1]); assert.equal(made[1].plays, 0);
  made[0].emit('ended'); advance(120);
  assert.equal(made[1].plays, 1); assert.ok(made[1].cls.has('on') && !made[0].cls.has('on')); assert.ok(made[0].paused);
  made[1].emit('ended'); advance(120); assert.ok(made[0].cls.has('on') && !made[1].cls.has('on'), 'in ciclo');
  B.stop(); assert.ok(!root.cls.has('has-bg')); assert.ok(made.every(v => v.paused && !v.cls.has('on')), 'modale chiusa: video fermi');
  made[0].emit('ended'); advance(200); assert.ok(made.every(v => v.paused), 'da chiusa non riparte niente');
  assert.equal(B.start(), true); advance(120); assert.ok(made[1].cls.has('on'), 'riaperta: l\'altra clip'); assert.equal(made.length, 2, 'stessi video');
  B.stop();
  // ripiego: riproduzione rifiutata o errore del file → nessuno sfondo nuovo
  for (const behave of ['reject', 'error']){ const x = mk(behave); x.B.start(); await flush(); advance(200); assert.ok(!x.root.cls.has('has-bg'), behave); assert.equal(x.B.on, false); assert.ok(x.made.every(v => v.paused || behave === 'error')); }
  // «riduci movimento» e metà dello stesso schermo: nessun video creato
  const r = mk('ok', { matchMedia: q => ({ matches: /reduced-motion/.test(q) }) }); assert.equal(r.B.start(), false); assert.equal(r.made.length, 0);
  const h = new TutorialBackdrop(new Node(), { half: true, doc: { createElement: () => { throw new Error('non deve creare niente'); } }, win: {} }); assert.equal(h.start(), false);
});
