// Presa insegnata (richiesta del 04/11/2026): la foto del «martello» sostituita dalla presa nel palmo della foto
// dell'utente, con un rollback a un solo interruttore (GRIP_STYLE in site/js/tennis/grip-art.js). Qui: i due profili sono
// completi e coerenti, foto presenti, testi statici della pagina uguali a quelli del profilo attivo (niente scambio di
// testo all'avvio), posa 3D definita per tutti e due.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { GRIP_STYLE, GRIP_STYLES, GRIPS, GRIP, GRIP_TEXT, gripSvg } from '@natpf/tennis/grip-art.js';
import { GRIP_POSE, GESTURES } from '../src/natpf/natpf_gesture_motion.js';
import { PHOTOS } from '../src/natpf/natpf_media.js';
import { LESSON } from '../src/natpf/natpf_training.js';
import { calPrompt } from '../src/natpf/natpf_cal_view.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

test('presa insegnata dal 09/11: a racchetta (foto dell\'utente); palmo e martello restano pronti per il rollback', () => {
  assert.equal(GRIP_STYLE, 'racchetta');
  assert.deepEqual([...GRIP_STYLES].sort(), ['martello', 'palmo', 'racchetta']);
  assert.equal(GRIP, GRIPS.racchetta);
  assert.match(GRIP_TEXT, /racchetta/); assert.doesNotMatch(GRIP_TEXT, /martello/);
  assert.equal(PHOTOS.grip.src, './media/presa-racchetta-davanti.webp');
  assert.equal(LESSON.find(s => s.id === 'grip').title, 'Presa a racchetta');
  assert.match(calPrompt({ stage: 'still' }).sub, /cima in avanti/);
  assert.match(GESTURES.grip.cues.join(' '), /cima in avanti/);
  // le indicazioni della scheda «Presa»: le prime due concordate con l'utente (docs/b17/presa-foto.md); la terza dalla presa
  // misurata nel video (B17.1 passo B2, correzioni: nella posa della scheda lo schermo guarda verso l'interno, il pollice in alto)
  assert.deepEqual(GESTURES.grip.cues, ['Telefono disteso nel palmo, cima in avanti', 'Dita sotto, attorno al bordo', 'Pollice in alto lungo il bordo, schermo verso l’interno']);
});

test('i due profili hanno gli stessi campi, la foto nel pacchetto, la posa 3D e la figura per le due mani', () => {
  const keys = Object.keys(GRIPS.palmo.ui).sort();
  for (const style of GRIP_STYLES){
    const G = GRIPS[style];
    for (const k of ['name', 'text', 'short', 'aria']) assert.ok(G[k], `${style}.${k}`);
    assert.deepEqual(Object.keys(G.ui).sort(), keys, `${style}: testi dell'interfaccia`);
    assert.ok(fs.existsSync(`${ROOT}public/media/${G.photo.file}`), `${style}: foto ${G.photo.file}`);
    assert.equal(GRIP_POSE[style].euler.length, 3, `${style}: posa 3D`);
    for (const hand of ['right', 'left']){
      const svg = gripSvg({ style, hand });
      assert.match(svg, new RegExp(`data-grip="${style}"`));
      assert.match(svg, /DI LATO/);
      assert.match(svg, hand === 'left' ? /Mano sinistra/ : /Mano destra/);
    }
  }
});

test('testi statici della pagina «Collega» e dello stesso schermo uguali al profilo attivo', () => {
  const html = fs.readFileSync(`${ROOT}index.html`, 'utf8');
  for (const [key, text] of Object.entries(GRIP.ui)){
    const m = new RegExp(`data-grip-text="${key}">([^<]*)<`).exec(html);
    if (m) assert.equal(m[1], text, `index.html data-grip-text="${key}"`);
  }
  assert.ok(html.includes(`src="./media/${GRIP.photo.file}"`), 'foto della presa nella pagina «Collega»');
  assert.doesNotMatch(html, /martello/i);
});

// Tocchi involontari con la presa nel palmo (schermo verso chi gioca, dita vicine al display): ogni tocco vota il segno
// dei sensori (site/js/tennis/motion-sign.js) e un cambio di segno fa ripartire la calibrazione (racchetta.js). Con la
// presa nel palmo la gravità lungo l'asse lungo del telefono resta nel verso «cima in alto» (o sotto la soglia di voto
// quando il telefono è molto inclinato): nessun tocco cambia il segno, su Android come su iPhone
import { createAccSign, SIGN } from '@natpf/tennis/motion-sign.js';
test('presa nel palmo: i tocchi sullo schermo non cambiano il segno dei sensori (niente calibrazione rifatta per errore)', () => {
  const D = Math.PI/180;
  // accelerazione con la gravità (Android, telefono fermo) nel riferimento del telefono dopo la posa del palmo:
  // vettore «in su» del mondo ruotato all'indietro di Rx(−tilt)·Rz(lean)
  const upInPhone = (lean, tilt) => {
    const l = lean*D, t = -tilt*D, g = 9.81;
    // R = Rx(t)·Rz(l); in phone = Rᵀ·(0, g, 0) = Rz(−l)·Rx(−t)·(0, g, 0)
    const y1 = g*Math.cos(-t), z1 = g*Math.sin(-t);           // Rx(−t)·(0, g, 0) = (0, g cos t, g sin t) con t → −t
    return [Math.sin(l)*y1 /* Rz(−l): x = cos·0 + sin(l)·y */, Math.cos(l)*y1, z1];
  };
  for (const hand of ['right', 'left']) for (const lean of [20, 35, 50]) for (const tilt of [25, 40, 55]){
    const raw = upInPhone(lean*(hand === 'left' ? -1 : 1), tilt);
    assert.ok(raw[1] > 0, `${hand} ${lean}/${tilt}: asse lungo verso l'alto`);
    for (const [prior, flip] of [[1, 1], [-1, -1]]){            // Android; iPhone dà l'accelerazione con il segno opposto
      const s = createAccSign({ prior });
      for (let i = 0; i < 12; i++) assert.equal(s.vote(raw.map(v => v*flip)), false, `${hand} ${lean}/${tilt} prior ${prior}: tocco ${i + 1}`);
      assert.equal(s.sign, prior);
    }
  }
  assert.ok(SIGN.votes >= 4, 'servono più tocchi concordi per cambiare segno');
});
