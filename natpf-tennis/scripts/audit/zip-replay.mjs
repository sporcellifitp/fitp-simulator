// Rigioca i campioni grezzi del telefono di una sessione registrata (pacchetto della diagnostica estratto in una
// cartella) nella catena della pagina del telefono: rilevatore, filtro d'orientamento, forma del colpo. Serve a
// confrontare, sugli stessi dati, cosa riconosce il codice di adesso con quello che era stato registrato in partita.
//
//   node --import ./test/register.mjs scripts/audit/zip-replay.mjs <cartella dello ZIP estratto> [--json=uscita.json]
//        [--prima=<swing-detect.js di prima>] [--prima-face=<face-tracker.js di prima>]
// Con --prima i campioni passano anche nel rilevatore di una versione precedente (per esempio estratto con
// git show <commit>:site/js/tennis/swing-detect.js in site/js/tennis/, dove trova i propri import) e si confrontano i
// colpi riconosciuti dalle due versioni.
//
// Il pacchetto non va nel repository (contiene il video della webcam): si estrae in una cartella qualsiasi fuori.
// Limiti: il contesto del rilevatore è sempre «gioco» (i servizi non sono distinti) e il verso atteso della palla non è
// noto (expect = 0), quindi la modalità preparazione trattiene meno gesti che in partita.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createSwingDetector } from '@natpf/tennis/swing-detect.js';
import { createFaceTracker } from '@natpf/tennis/face-tracker.js';
import { strokeShape } from '@natpf/tennis/stroke-shape.js';
import { strokeIntent } from '../../src/natpf/natpf_stroke_intent.js';

const args = process.argv.slice(2);
const dir = args.find(a => !a.startsWith('--'));
const out = (args.find(a => a.startsWith('--json=')) || '').slice(7) || null;
const opt = k => (args.find(a => a.startsWith(`--${k}=`)) || '').slice(k.length + 3) || null;
const before = opt('prima') ? await import(pathToFileURL(path.resolve(opt('prima'))).href) : null;
const beforeFace = opt('prima-face') ? await import(pathToFileURL(path.resolve(opt('prima-face'))).href) : null;
if (!dir){ console.error('uso: zip-replay.mjs <cartella dello ZIP estratto> [--json=uscita.json]'); process.exit(2); }
const lines = f => fs.readFileSync(path.join(dir, f), 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
const events = lines('eventi.jsonl'), raw = lines('telefono-sensori.jsonl').sort((a, b) => a.k - b.k);

export function replay(raw, profile, { prep = true, detector = createSwingDetector, tracker = createFaceTracker, shape = true } = {}){
  const det = detector(), face = tracker({ quietHold: 400, relax: 2.5 });
  const swings = [];
  det.on('swing', s => {
    if (face.ready){ s.face = face.strokeFace(s.peakT, s.t - s.dur); s.head = face.headAt(s.peakT, s.axis); if (shape && face.history) s.shape = strokeShape(face.history(), face.up, { peakT: s.peakT }); }
    swings.push(s);
  });
  det.setProfile(profile); det.run(); det.setContext('play'); det.setPrepMode(prep);
  face.setRest(profile.gravity, det.profile.bias);
  for (const s of raw){
    const k = { t: s.k, rot: s.r, acc: s.a, accG: s.g };
    if (face.ready) face.feed(k);
    det.feed(k);
  }
  return swings;
}

// profilo in uso: l'ultimo «tel.profilo» prima del primo colpo registrato (nella sessione del 22/10 quello semplice)
const strokes = events.filter(e => e.k === 'tel.colpo');
const profiles = events.filter(e => e.k === 'tel.profilo');
const profile = (profiles.filter(p => !strokes.length || p.t <= strokes[0].t).pop() || profiles[0])?.profilo;
if (!profile){ console.error('nessun profilo del telefono negli eventi'); process.exit(1); }
const off = Math.min(...raw.map(s => s.t - s.k));                 // orologio del telefono → tempo della sessione
const swings = replay(raw, profile);
const r = v => (v == null || !Number.isFinite(v) ? '–' : (+v).toFixed(2));
const rows = [];
for (const s of swings){
  const t = s.peakT + off;
  const rec = strokes.find(c => Math.abs((c.picco ?? c.t) - t) < 80);
  const intent = s.shape ? strokeIntent({ shape: s.shape, peak: s.peak, rawPeak: s.rawPeak, angle: s.angle }, { ref: profile.simple ? null : profile.ref, rawRef: profile.simple ? null : profile.rawRef }) : null;
  rows.push({ t: +(t/1000).toFixed(2), dir: s.dir, peak: s.peak, angle: s.angle, lift: s.lift, head: s.head, shape: s.shape || null, intent,
    rec: rec ? { n: rec.n, lato: rec.lato, tipo: rec.tipo, mira: rec.mira, dir: rec.dir, scartato: rec.scartato || null } : null });
}
console.log(`profilo: ${profile.simple ? 'semplice (senza asse)' : 'completo'}, mano ${profile.hand}; colpi registrati ${strokes.length}, rigiocati ${swings.length}, abbinati ${rows.filter(x => x.rec).length}`);
console.log('   t     verso picco  ang | piano  sale   rot  manico  testa  mano | nuovo: colpo forza prof | registrato');
for (const x of rows){
  const sh = x.shape || {};
  const it = x.intent;
  console.log(`${String(x.t).padStart(7)} ${String(x.dir).padStart(4)} ${String(x.peak).padStart(5)} ${String(x.angle).padStart(4)} | ${r(sh.plane).padStart(5)} ${r(sh.rise).padStart(5)} ${r(sh.roll).padStart(5)} ${r(sh.tilt).padStart(6)} ${r(sh.head).padStart(6)} ${r(sh.hand).padStart(5)} | ${it ? `${it.shot.padEnd(7)} ${r(it.power)} ${r(it.depth)}` : '–'.padEnd(17)} | ${x.rec ? `${x.rec.scartato ? 'scartato' : `${x.rec.lato}/${x.rec.tipo}`} mira ${r(x.rec.mira)} verso ${x.rec.dir}` : '–'}`);
}
{
  const count = (rows, f) => rows.reduce((m, x) => { const k = f(x); if (k) m[k] = (m[k] || 0) + 1; return m; }, {});
  const matched = rows.filter(x => x.rec && !x.rec.scartato);
  console.log('\ntipi registrati (colpi abbinati):', JSON.stringify(count(matched, x => x.rec.tipo)));
  console.log('tipi del modello nuovo (stessi colpi):', JSON.stringify(count(matched, x => x.intent?.shot)));
  console.log('tipi del modello nuovo (tutti i colpi rigiocati):', JSON.stringify(count(rows, x => x.intent?.shot)));
  console.log('verso registrato ≠ 0:', matched.filter(x => x.rec.dir).length, '/', matched.length, '· verso rigiocato ≠ 0:', rows.filter(x => x.dir).length, '/', rows.length);
}
if (out) fs.writeFileSync(out, JSON.stringify({ profile: { simple: !!profile.simple, hand: profile.hand }, rows }, null, 1));
if (before){
  const old = replay(raw, profile, { detector: before.createSwingDetector, tracker: beforeFace?.createFaceTracker || createFaceTracker, shape: false });
  const near = (list, t, tol = 80) => list.find(x => Math.abs(x.peakT + off - t) < tol);
  console.log(`\nprima: ${old.length} colpi rigiocati, verso ≠ 0 in ${old.filter(s => s.dir).length}; adesso: ${swings.length}, verso ≠ 0 in ${swings.filter(s => s.dir).length}`);
  const lost = swings.filter(s => s.peak >= 800 && !near(old, s.peakT + off));
  console.log(`colpi forti (≥ 800 °/s) riconosciuti adesso e non prima: ${lost.length}`);
  for (const s of lost){
    const t = s.peakT + off, prev = old.filter(o => o.peakT + off < t && t - (o.peakT + off) < 700).pop();
    console.log(`  ${(t/1000).toFixed(2)} s: ${s.peak} °/s verso ${s.dir}${prev ? ` · prima al suo posto ${((prev.peakT + off)/1000).toFixed(2)} s: ${prev.peak} °/s verso ${prev.dir}` : ''}`);
  }
  const recMatched = old.filter(s => strokes.some(c => Math.abs((c.picco ?? c.t) - (s.peakT + off)) < 80)).length;
  console.log(`colpi della versione di prima che coincidono con quelli registrati in partita: ${recMatched} su ${old.length} (registrati ${strokes.length})`);
}
