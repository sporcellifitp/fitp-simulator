// Foto reali del tutorial (natpf_media.js, public/media/): file presenti e leggeri, foto nella lezione (specchiate per i
// mancini), negli esercizi l'animazione 3D verificata (le clip video generate dei colpi sono state tolte il 28/10).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PHOTOS, LESSON_PHOTOS, lessonPhotos } from '../src/natpf/natpf_media.js';
import { DRILLS, LESSON } from '../src/natpf/natpf_training.js';
import { makeWorld } from './ui-world.mjs';
import { mimeFor } from '../scripts/offline-assets.mjs';

const pub = rel => fileURLToPath(new URL('../public/' + rel.replace(/^\.\//, ''), import.meta.url));
const size = rel => fs.statSync(pub(rel)).size;

test('media del tutorial: ogni foto esiste ed è leggera, con la provenienza documentata', () => {
  for (const p of Object.values(PHOTOS)){ assert.ok(size(p.src) < 60_000, `${p.src} ${size(p.src)} B`); assert.ok(p.alt.length > 10); }
  // il server LAN risponde con nosniff: senza il tipo giusto il browser può rifiutare il video dell'intro
  assert.equal(mimeFor('media/intro.mp4'), 'video/mp4'); assert.equal(mimeFor(PHOTOS.grip.src), 'image/webp');
  assert.ok(!fs.existsSync(pub('media/colpi')), 'clip dei colpi tolte');
  const notes = fs.readFileSync(pub('media/LEGGIMI.txt'), 'utf8');
  for (const p of Object.values(PHOTOS)) assert.ok(notes.includes(p.src.split('/').pop()), `${p.src} non è in LEGGIMI.txt`);
  for (const st of LESSON) assert.ok(lessonPhotos(st.id)?.main, `foto per il passo ${st.id}`);
  assert.ok(LESSON_PHOTOS.grip.no, 'la presa ha anche l’esempio sbagliato');
});

test('lezione con foto reali (specchiate per il mancino), esercizi con l’animazione 3D verificata', async () => {
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
  T.start({ drills: DRILLS.filter(d => ['forehand', 'serve'].includes(d.id)) }); T.cal = null; T.paint();
  assert.equal(T.drill.id, 'forehand');
  assert.equal($('coach-demo').classList.contains('hidden'), false, '«Guarda e ripeti» negli esercizi');
  assert.equal(T.demoOn, true, 'animazione 3D del gesto');
  assert.match($('coach-demo-title').textContent, /dritto/i);
  T.stop({ completed: false, silent: true });
  assert.equal(T.demoOn, false);
});
