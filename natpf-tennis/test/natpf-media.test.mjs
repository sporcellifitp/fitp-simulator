// Foto e video reali del tutorial (natpf_media.js, public/media/): file presenti e leggeri, foto nella lezione, clip
// verificate negli esercizi, animazione 3D dove non c'è una clip (incrociato, lungolinea…) e specchio per i mancini.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PHOTOS, CLIPS, LESSON_PHOTOS, clipFor, lessonPhotos, rateLabel } from '../src/natpf/natpf_media.js';
import { DRILLS, LESSON } from '../src/natpf/natpf_training.js';
import { makeWorld } from './ui-world.mjs';
import { mimeFor } from '../scripts/offline-assets.mjs';

const pub = rel => fileURLToPath(new URL('../public/' + rel.replace(/^\.\//, ''), import.meta.url));
const size = rel => fs.statSync(pub(rel)).size;

test('media del tutorial: ogni file esiste ed è leggero, con la provenienza documentata', () => {
  for (const p of Object.values(PHOTOS)){ assert.ok(size(p.src) < 60_000, `${p.src} ${size(p.src)} B`); assert.ok(p.alt.length > 10); }
  for (const c of Object.values(CLIPS)){
    assert.ok(size(c.src) < 200_000, `${c.src} ${size(c.src)} B`);
    assert.ok(size(c.poster) < 30_000, c.poster);
  }
  // il server LAN risponde con nosniff: senza il tipo giusto il browser può rifiutare i video
  for (const c of Object.values(CLIPS)){ assert.equal(mimeFor(c.src), 'video/mp4'); assert.equal(mimeFor(c.poster), 'image/webp'); }
  assert.equal(mimeFor('media/intro.mp4'), 'video/mp4');
  const notes = fs.readFileSync(pub('media/LEGGIMI.txt'), 'utf8');
  for (const f of new Set([...Object.values(PHOTOS).map(p => p.src), ...Object.values(CLIPS).map(c => c.src)])) assert.ok(notes.includes(f.split('/').pop()), `${f} non è in LEGGIMI.txt`);
});

test('clip solo per i gesti verificati: incrociato, lungolinea, volée e piatto restano in 3D', () => {
  for (const id of ['cross', 'line', 'volley', 'flat', 'ready', 'grip']) assert.equal(clipFor(id), null, id);
  for (const id of Object.keys(CLIPS)) assert.ok(DRILLS.some(d => d.demo === id), `${id} non è un esercizio`);
  assert.equal(CLIPS.drop.src, CLIPS.slice.src, 'palla corta = gesto del tagliato, lento');
  assert.ok(CLIPS.drop.rate < CLIPS.slice.rate);
  assert.equal(rateLabel(.5), '×0,5'); assert.equal(rateLabel(1), '×1');
  for (const st of LESSON) assert.ok(lessonPhotos(st.id)?.main, `foto per il passo ${st.id}`);
  assert.ok(LESSON_PHOTOS.grip.no, 'la presa ha anche l’esempio sbagliato');
});

test('lezione con foto reali (specchiate per il mancino), esercizi con la clip o con il 3D', async () => {
  const w = await makeWorld({ controller: 'phone' });
  const T = w.ui.training, $ = id => T.coach.querySelector('#' + id);
  T.start({ intro: true }); T.paint();
  const media = $('coach-lesson-media');
  assert.equal(media.classList.contains('hidden'), false);
  assert.equal($('coach-lesson-demo').classList.contains('hidden'), true, 'niente 3D nella lezione');
  assert.match(media.innerHTML, /presa-lato\.webp/); assert.match(media.innerHTML, /Così no/);
  T.lessonAction('next'); T.paint();
  assert.match(media.innerHTML, /presa-schermo\.webp/); assert.doesNotMatch(media.innerHTML, /mirror/);
  T.lessonAction('left'); T.paint();
  assert.match(media.innerHTML, /lesson-photo mirror/);
  T.lessonAction('right'); T.stop({ completed: false, silent: true });

  w.E.natpfPhone.link.cmd('skip');
  T.start({ drills: DRILLS.filter(d => ['forehand', 'cross'].includes(d.id)) }); T.cal = null; T.paint();
  const video = $('coach-demo-video'), card = $('coach-demo');
  assert.equal(T.drill.id, 'forehand');
  assert.equal(card.classList.contains('hidden'), false);
  assert.equal(video.classList.contains('hidden'), false, 'clip reale del dritto');
  assert.equal(video.src, CLIPS.forehand.src);
  assert.equal($('coach-demo-stage').classList.contains('hidden'), true);
  w.ui.hand.set('left'); T.paint();
  assert.equal(video.classList.contains('mirror'), true, 'mancino: clip specchiata');
  w.ui.hand.set('right');
  T.idx = DRILLS.filter(d => ['forehand', 'cross'].includes(d.id)).findIndex(d => d.id === 'cross'); T.paint();
  assert.equal(T.drill.id, 'cross');
  assert.equal(video.classList.contains('hidden'), true, 'incrociato: animazione 3D (conta il display all’impatto)');
  assert.equal($('coach-demo-stage').classList.contains('hidden'), false);
  T.stop({ completed: false, silent: true });
});
