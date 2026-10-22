// Webcam con più persone, mano persa e tremolio (test/webcam-sim.mjs, scene sintetiche): colpi fantasma con il codice
// attuale o con uno di prima, sulle stesse scene. Gli eventi escono dal vero motion_controls.js.
//   node --import ./test/register.mjs scripts/audit/webcam-crowd.mjs
//   node --import ./test/register.mjs scripts/audit/webcam-crowd.mjs --prima=<motion_controls.js> --riconoscimento=<webcam_strokes.js>
// (per esempio estratti con git show <commit>:natpf-tennis/src/motion_controls.js in natpf-tennis/src/, dove trovano i
// propri import). Atteso: nessun colpo nelle scene con altre persone e nel tremolio; un rovescio nell'ultima scena.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runScene, sweep, handLandmarks, gauss, MODEL_LABEL } from '../../test/webcam-sim.mjs';

const opt = name => { const a = process.argv.find(x => x.startsWith(`--${name}=`)); return a ? path.resolve(a.slice(name.length + 3)) : null; };
const { MotionController: MC } = await import(pathToFileURL(opt('prima') || new URL('../../src/motion_controls.js', import.meta.url).pathname).href);
const { createStrokeTracker } = await import(opt('riconoscimento') ? pathToFileURL(opt('riconoscimento')).href : '../../src/natpf/webcam_strokes.js');
const aspect = .75, L = MODEL_LABEL.right;
// chi gioca: mano destra ferma al centro-destra (con tremolio facoltativo); un'altra persona: mano ferma a S0 e uno swing
const still = (c, rng, { S = .62, y = .55, size = .04, trem = 0, f = 9 } = {}) => ({ lm: handLandmarks({ S: S + gauss(rng)*.003 + trem*Math.sin(2*Math.PI*f*c), y: y + gauss(rng)*.003 + .6*trem*Math.cos(2*Math.PI*f*1.13*c), size, aspect }), label: L });
const other = (t0, { dir = -1, dS = .35, S0 = .3, y = .45, size = .04, label = L } = {}) => {
  const sw = sweep({ dir, dS, ratio: .1, aspect, T: .25, curve: 1, yMid: y });
  return c => { const p = sw(Math.max(0, Math.min(.25, c - t0))); return { lm: handLandmarks({ S: p.S - (sw(0).S - S0), y: p.y, size, aspect }), label }; };
};
const lost = (c, a, b) => c >= a && c < b;
const passer = c => ({ lm: handLandmarks({ S: -.1 + .6*(c - 1.1), y: .6 + .02*Math.sin(9*c), size: .075, aspect }), label: L });
const bh = sweep({ dir: 1, dS: .4, ratio: .2, aspect, T: .25, curve: 1, yMid: .55 });
const me = (c, rng) => { const p = bh(Math.max(0, Math.min(.25, c - 2.2))); return { lm: handLandmarks({ S: p.S + .12 + gauss(rng)*.003, y: p.y, size: .04, aspect }), label: L }; };
const SCENES = [
  ['chi guarda fa due swing, chi gioca resta visibile', (c, rng) => [other(1.2)(c), other(2.4, { dir: 1 })(c), still(c, rng)]],
  ['mano di chi gioca persa 0,8 s, chi guarda fa uno swing', (c, rng) => [other(1.5, { dS: .4 })(c), ...(lost(c, 1, 1.8) ? [] : [still(c, rng)])]],
  ['persa 1,5 s, swing di chi guarda', (c, rng) => [other(2, { dS: .4 })(c), ...(lost(c, 1, 2.5) ? [] : [still(c, rng)])]],
  ['persa 3 s, swing di chi guarda', (c, rng) => [other(3, { dS: .4 })(c), ...(lost(c, 1, 4) ? [] : [still(c, rng)])]],
  ['persa 1,5 s, chi guarda con la mano opposta', (c, rng) => [other(2, { dS: .4, label: MODEL_LABEL.left })(c), ...(lost(c, 1, 2.5) ? [] : [still(c, rng)])]],
  ['mano nuova che entra lontano dopo 0,6 s e si avvicina con uno swing', (c, rng) => [...(c >= 1.6 ? [other(2.2, { S0: .18, dir: 1 })(c)] : []), ...(lost(c, 1, 3.5) ? [] : [still(c, rng)])]],
  ['chi passa davanti alla webcam (mano grande che attraversa)', (c, rng) => [...(c >= 1.1 && c < 3.3 ? [passer(c)] : []), ...(lost(c, 1, 3.4) ? [] : [still(c, rng)])]],
  ['limite: chi guarda più vicino alla webcam fin dall\'inizio', (c, rng) => [other(1.2, { size: .055 })(c), still(c, rng)]],
  ['limite: mano nuova lontana entro 0,5 s dalla perdita', (c, rng) => [...(c >= 1.3 ? [other(2, { S0: .18, dir: 1 })(c)] : []), ...(lost(c, 1, 3.5) ? [] : [still(c, rng)])]],
  ['chi gioca ritrovato dopo 0,9 s, poi rovescio a 2,2 s (atteso: 1 colpo)', (c, rng) => [other(1.6, { S0: .2 })(c), ...(lost(c, 1, 1.9) ? [] : [me(c, rng)])], 4],
];
const fmt = ev => ev.map(e => `${e.side || '?'}·${e.shotType || '?'}@${e.ts.toFixed(2)}`).join(' ') || '–';
let ghosts = 0;
console.log(`motion_controls: ${opt('prima') || 'attuale'} · riconoscimento: ${opt('riconoscimento') || 'attuale'}\n`);
for (const [name, handsAt, total = 5] of SCENES){
  const ev = runScene(MC, { total, handsAt, seed: 3, tracker: createStrokeTracker() });
  if (!/^limite|atteso/.test(name)) ghosts += ev.length;
  console.log(`${name.padEnd(72)} ${fmt(ev)}`);
}
let trem = 0, runs = 0;
for (const amp of [.005, .01, .015]) for (const f of [4, 6, 9, 12]) for (let seed = 1; seed <= 5; seed++){
  runs++; trem += runScene(MC, { total: 6, handsAt: (c, rng) => [still(c, rng, { trem: amp, f })], seed, tracker: createStrokeTracker() }).length;
}
console.log(`\ntremolio fino a 3,6 cm a 2 m (4–12 Hz, ${runs} prove da 6 s): ${trem} colpi`);
console.log(`colpi fantasma nelle scene con altre persone (esclusi i limiti): ${ghosts}`);
