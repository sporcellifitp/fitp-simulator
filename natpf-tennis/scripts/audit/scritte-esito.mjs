// B18 (difetto 10 dell'audit B16): computer e telefono dicono la stessa cosa? E il telefono scrive «Punto avversario»
// con la palla ancora in gioco? Banco senza grafica sulle regole vere del motore (rally-balance.simulate), con i profili
// simulati: per ogni colpo di chi gioca si confronta la scritta del grande schermo (natpf_shot_feedback.shotQuality, come
// onLocalFeedback) con quella del telefono:
//   prima: la pagina del telefono come fino alla 2026-11-10.1 (voto dal grade, «out» ignorato, «fault» → «Punto avversario»;
//          il colpo difensivo arrivava come «fault»);
//   dopo:  natpf_phone_racket.feedback (phoneLabel, out/net/why) e site/js/tennis/phone-screen.eventFlash.
// Il «prima» è ricostruito dagli stessi eventi (il colpo difensivo, che ora arriva come «hit» con defensive, prima era
// «fault»): stessi colpi, stessa simulazione.
//   node --import ./test/register.mjs scripts/audit/scritte-esito.mjs [--points=150] [--seeds=7,11,23]
import { pathToFileURL } from 'node:url';
import { simulate } from './rally-balance.mjs';
import { shotQuality, landsIn } from '../../src/natpf/natpf_shot_feedback.js';
import { phoneLabel, pointReason } from '../../src/natpf/natpf_phone_racket.js';
import { eventFlash } from '../../../site/js/tennis/phone-screen.js';

// scritta grande del telefono che corrisponde all'esito del computer
const SAME = { Perfetto: 'Perfetto!', Anticipo: 'In anticipo', Ritardo: 'In ritardo', Buono: 'Bel colpo', Fuori: 'Fuori', 'In rete': 'In rete',
  'Troppo presto': 'Troppo presto', 'Troppo tardi': 'Troppo tardi', 'Troppo lontana': 'Troppo lontana' };
const SPECIAL = new Set(['Palla corta!', 'Lob!', 'Tagliato!', 'Smash!']);
const shotOf = s => /SMASH/i.test(s) ? 'smash' : /LOB/i.test(s) ? 'lob' : /SLICE/i.test(s) ? 'slice' : 'drive';

// telefono fino alla 2026-11-10.1 (racchetta.js e natpf_phone_racket.feedback di allora)
function phoneBefore(ev){
  const kind = ev.defensive ? 'fault' : ev.kind, g = ev.grade || '';
  if (kind === 'hit'){ const label = /PERFECT|POWER/i.test(g) ? 'perfetto' : /EARLY/i.test(g) ? 'anticipo' : /LATE/i.test(g) ? 'ritardo' : 'buono';
    return ({ drop: 'Palla corta!', lob: 'Lob!', slice: 'Tagliato!', smash: 'Smash!' }[shotOf(ev.shotType)]) || ({ perfetto: 'Perfetto!', buono: 'Bel colpo', anticipo: 'In anticipo', ritardo: 'In ritardo' }[label]); }
  if (kind === 'whiff') return { portata: 'Troppo lontana', presto: 'Troppo presto', tardi: 'Troppo tardi' }[/REACH/i.test(g) ? 'portata' : /EARLY/i.test(g) ? 'presto' : 'tardi'];
  if (kind === 'fault') return 'Punto avversario';
  return null;
}
function phoneAfter(ev, q){
  if (ev.kind === 'hit') return eventFlash({ k: 'contact', label: phoneLabel(q, ev.grade), shot: shotOf(ev.shotType), out: q?.label === 'Fuori', net: q?.label === 'In rete', why: q?.why }).big;
  if (ev.kind === 'whiff') return eventFlash({ k: 'miss', why: /REACH/i.test(ev.grade) ? 'portata' : /EARLY/i.test(ev.grade) ? 'presto' : 'tardi' }).big;
  if (ev.kind === 'fault') return eventFlash({ k: 'point', mine: false, txt: pointReason(ev.grade) }).big;
  return null;
}
// computer: «Mancata» per il colpo a vuoto in ritardo fino alla 2026-11-10.1
const computerBefore = (ev, q) => ev.kind === 'whiff' && /TOO LATE/.test(ev.grade || '') ? 'Mancata' : q.label;
const same = (pc, phone) => phone === SAME[pc] || (SPECIAL.has(phone) && !['Fuori', 'In rete'].includes(pc));

export function measure({ profile, difficulty, points = 150, seed = 7 }){
  const r = { shots: 0, before: 0, after: 0, falsePoint: 0, falsePointAfter: 0, outNoWhy: 0, outWithWhy: 0, outs: 0, lateWhiff: 0 };
  let hooked = false;
  simulate({ profile, difficulty, points, seed, onStep: e => {
    if (hooked) return; hooked = true;
    e.motionController = { triggerHapticFeedback: ev => {
      if ((ev.role || 'p1') !== 'p1') return;
      const inPlay = e.phase === 'RALLY' && e.ball.inPlay;
      if (ev.kind === 'hit' || ev.kind === 'whiff'){
        const q = ev.kind === 'whiff' ? shotQuality(ev.grade) : shotQuality(ev.grade, { inCourt: landsIn(e.ball.targetLanding, { serve: /SERVE/i.test(ev.grade) }), net: !!e.ball.natpfNetFault });
        r.shots++;
        if (!same(computerBefore(ev, q), phoneBefore(ev))) r.before++;
        if (!same(q.label, phoneAfter(ev, q))) r.after++;
        if (ev.defensive && inPlay) r.falsePoint++;                       // prima: «fault» con la palla in gioco
        if (q.label === 'Fuori' || q.label === 'In rete'){ r.outs++; if (q.why) r.outWithWhy++; else r.outNoWhy++; }
        if (ev.kind === 'whiff' && /TOO LATE/.test(ev.grade || '')) r.lateWhiff++;
      } else if (ev.kind === 'fault' && inPlay) r.falsePointAfter++;      // dopo: «fault» solo in _awardPoint (POINT_OVER)
    } };
  } });
  return r;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href){
  const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
  const points = +(arg('points') || 150), seeds = (arg('seeds') || '7,11,23').split(',').map(Number);
  console.log('livello     profilo    colpi  diversi prima  diversi dopo  «Punto avversario» falso prima/dopo  fuori o in rete: col perché / senza');
  for (const difficulty of ['casual', 'pro']) for (const profile of ['umano', 'amatore', 'bambino', 'tennista']){
    const t = { shots: 0, before: 0, after: 0, falsePoint: 0, falsePointAfter: 0, outs: 0, outWithWhy: 0, outNoWhy: 0 };
    for (const seed of seeds){ const r = measure({ profile, difficulty, points, seed }); for (const k in t) t[k] += r[k]; }
    const pct = v => (100*v/Math.max(1, t.shots)).toFixed(1);
    console.log(`${difficulty.padEnd(11)} ${profile.padEnd(10)} ${String(t.shots).padStart(5)}  ${pct(t.before).padStart(12)}%  ${pct(t.after).padStart(11)}%  ${`${pct(t.falsePoint)}% / ${pct(t.falsePointAfter)}%`.padStart(35)}  ${t.outWithWhy} / ${t.outNoWhy} su ${t.outs}`);
  }
}
