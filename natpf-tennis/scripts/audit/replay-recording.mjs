// Rianalisi di una registrazione del pannello di diagnostica (Maiusc+D → Registra): flusso dei sensori, tempi di ogni
// colpo e, con gli stessi campioni grezzi, il rilevatore e la mappatura dei colpi di adesso (per tarare le soglie sui
// movimenti veri). Vale per LAN e internet: la registrazione contiene gli stessi dati.
//   node --import ./test/register.mjs scripts/audit/replay-recording.mjs registrazione.json
import fs from 'node:fs';
import { createSwingDetector } from '@natpf/tennis/swing-detect.js';
import { createFaceTracker } from '@natpf/tennis/face-tracker.js';
import { swingMessage, parseSwingMessage } from '@natpf/tennis/swing-message.js';
import { natpfSwingToEngine, NORMAL_SHOTS } from '../../src/natpf/natpf_phone_racket.js';
import { swingTimeline } from '../../src/natpf/natpf_diag.js';
import { liftBaselineFromProfile, createLiftModel, createFaceModel } from '../../src/natpf/natpf_gestures.js';

import { readZip } from '../../src/natpf/diag/diag_zip.js';
const file = process.argv[2];
if (!file){ console.error('Uso: node --import ./test/register.mjs scripts/audit/replay-recording.mjs registrazione.json|pacchetto.zip'); process.exit(1); }
// pacchetto della modalità diagnostica (zip): campioni grezzi, colpi e profilo dagli eventi, nello stesso formato della
// registrazione di prima (Maiusc+D → Registra, JSON unico)
function fromPackage(path){
  const z = readZip(new Uint8Array(fs.readFileSync(path))), lines = n => (z.get(n) ? new TextDecoder().decode(z.get(n)).split('\n').filter(Boolean).flatMap(l => { try { return [JSON.parse(l)]; } catch { return []; } }) : []);
  const ev = lines('eventi.jsonl'), meta = JSON.parse(new TextDecoder().decode(z.get('sessione.json') || new Uint8Array()) || '{}');
  const prof = ev.filter(e => e.k === 'tel.profilo').at(-1);
  return {
    transport: meta.transport, startedAt: meta.inizio,
    raw: lines('telefono-sensori.jsonl').map(k => ({ t: k.k, rot: k.r, acc: k.a, accG: k.g })),
    // colpi: i campi del registro tornano nella forma del messaggio letto (s) e dell'evento del gioco (ev)
    swings: ev.filter(e => e.k === 'tel.colpo').map(e => ({ s: { seq: e.n, detectMs: e.rilevamento, holdMs: e.attesa, at: e.picco != null ? e.picco/1000 : null, receivedAt: e.arrivo != null ? e.arrivo/1000 : null }, ev: { side: e.lato, ...(e.scartato ? { ignored: e.scartato } : {}), natpf: { shot: e.tipo, wrist: e.mira, aimSource: e.fonteMira } }, hitAt: null, frameAt: null })),
    stats: [], profile: prof ? { phone: prof.profilo, hand: prof.mano, liftBaseline: prof.liftBaseline } : null,
  };
}
const rec = file.endsWith('.zip') ? fromPackage(file) : JSON.parse(fs.readFileSync(file, 'utf8'));
const raw = (rec.raw || []).filter(k => Number.isFinite(k.t)).sort((a, b) => a.t - b.t);
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p*s.length))] : null; };
const dts = raw.slice(1).map((k, i) => k.t - raw[i].t);
console.log(`registrazione ${rec.transport || '?'} · ${raw.length} campioni · ${(rec.swings || []).length} colpi`);
if (dts.length) console.log(`sensori: intervallo mediano ${pct(dts, .5).toFixed(1)} ms (${(1000/pct(dts, .5)).toFixed(0)} Hz) · 95° percentile ${pct(dts, .95).toFixed(1)} ms · buchi > 50 ms: ${dts.filter(d => d > 50).length}`);
for (const s of rec.stats?.slice(-1) || []) console.log(`ultimo stato: RTT ${s.rtt} ms · fps ${s.fps} · flussi ${JSON.stringify(s.rates)}`);
console.log('\ncolpi giocati:');
for (const r of rec.swings || []){
  const t = swingTimeline(r.s, r), n = r.ev?.natpf || {};
  if (r.ev?.ignored){ console.log(`  #${r.s.seq ?? '?'} scartato: ${r.ev.ignored}`); continue; }
  console.log(`  #${r.s.seq ?? '?'} ${r.ev?.side || '–'}/${n.shot || r.ev?.shotType} mira ${n.wrist} (${n.aimSource}) · rilev ${t.detect} · prep ${t.hold} · consegna ${t.delivery?.toFixed?.(0)} · attesa palla ${t.ball?.toFixed?.(0)} ms · ${r.result?.quality || ''} · ${(n.why || []).join(', ')}`);
}
const prof = rec.profile?.phone;
if (!prof){ console.log('\n(nessun profilo di calibrazione nella registrazione: niente rianalisi del rilevatore)'); process.exit(0); }
const det = createSwingDetector(), face = createFaceTracker({ quietHold: 400, relax: 2.5 });
det.setProfile(prof); det.run(); face.setRest(prof.gravity, prof.bias);
const found = [];
// come in gioco: verso verticale abituale dalla calibrazione, poi dai colpi veri
const lifts = createLiftModel(liftBaselineFromProfile(prof) ?? rec.profile.liftBaseline ?? 0), faces = createFaceModel();
const heads = createLiftModel(0);
det.on('swing', s => { s.face = face.strokeFace(s.peakT, s.t - s.dur); s.head = face.headAt(s.peakT, s.axis); const d = swingMessage(s, { faceRef: prof.faceRef, now: s.t }); const m = parseSwingMessage(d, { at: s.peakT/1000, now: s.t }); const ev = natpfSwingToEngine(m, { hand: rec.profile.hand, liftBaseline: lifts.value, headBaseline: heads.value, faceCenter: faces.center(s.dir) }); if (NORMAL_SHOTS.has(ev.natpf.shot)){ lifts.add(s.dir, s.lift); heads.add(s.dir, ev.natpf.head); } faces.add(s.dir, m.face); found.push({ s, ev }); });
for (const k of raw){ face.feed(k); det.feed(k); }
console.log(`\nrianalisi con il rilevatore attuale: ${found.length} colpi`);
for (const { s, ev } of found) console.log(`  picco ${s.peakT.toFixed(0)} ms · rilev ${s.detectMs} · prep ${s.holdMs} · ${s.peak}°/s · verso ${s.dir}${s.vert ? ' ' + s.vert : ''} · su/giù ${s.lift} · piatto sale ${ev.natpf.head} · mano ${ev.natpf.move} · conf ${ev.natpf.conf} · piatto ${s.face ? `${s.face.yaw}°/${s.face.pitch}°` : '–'} → ${ev.side || '–'}/${ev.natpf.shot} mira ${ev.natpf.wrist} · ${ev.natpf.why.join(', ')}`);
