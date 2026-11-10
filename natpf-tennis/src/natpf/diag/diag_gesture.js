// Due misure da raccogliere con persone vere (B18, tappa 1 punto 12 dell'audit B16), calcolate dagli eventi della
// diagnostica (stesso codice nel pannello, nel rapporto e nello script scripts/audit/gesto-rimbalzo.mjs). Servono a
// decidere dopo, non cambiano il gioco.
//
// 1. Quanto varia il gesto da un colpo all'altro (difetti 7, 13 e punto 25 dell'audit): per i colpi normali del telefono
//    (top spin e piatto letti dal computer), per lato, la salita della testa (forma.salita di tel.colpo) rispetto alla
//    propria salita abituale (intenzione.abituale), il piano e la forza. Se la salita di una persona varia molto, un colpo
//    normale ogni tanto scende sotto la soglia del tagliato (natpf_stroke_intent: sliceRise + min(0, abituale)) o, con la
//    palla alta, sotto quella della schiacciata (smashRise): sono i colpi «vicini alla soglia». Il rapporto dice di
//    passare a una soglia relativa solo se la deviazione della salita supera circa 0,15 (SPREAD.relative).
// 2. Quando le persone colpiscono rispetto al rimbalzo (punto 23): per ogni palla dell'avversario che rimbalza nella metà
//    di chi gioca qui, il gesto del telefono che segue (istante del picco, sull'orologio del computer) entro 1,5 s: ms dal
//    rimbalzo al gesto, e ms dal gesto all'impatto previsto dal piano del motore (+ = gesto prima dell'impatto previsto,
//    in anticipo). Le diagnostiche vere dicono che le persone anticipano (mediana +49 ms, docs/NATPF_RACCHETTA_VIRTUALE.md
//    §P4): prima di toccare il punto d'impatto (D23) serve questa misura.
// Le palle del lanciapalle (allenamento, minigiochi) contano: il gesto è lo stesso. I colpi scartati no.
import { INTENT } from '../natpf_stroke_intent.js';

export const SPREAD = Object.freeze({ relative: .15, near: .1, minShots: 10, maxGapMs: 1500 });
const NORMAL = new Set(['topspin', 'flat']);
const finite = v => typeof v === 'number' && Number.isFinite(v);
const r2 = v => (finite(v) ? Math.round(v*100)/100 : null);
const r0 = v => (finite(v) ? Math.round(v) : null);
const q = (a, p) => { const s = a.filter(finite).sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p*s.length))] : null; };
const sd = a => { const v = a.filter(finite); if (v.length < 2) return null; const m = v.reduce((s, x) => s + x, 0)/v.length; return Math.sqrt(v.reduce((s, x) => s + (x - m)**2, 0)/(v.length - 1)); };
const sideOf = s => (/back/i.test(s || '') ? 'rovescio' : /fore/i.test(s || '') ? 'dritto' : null);

// colpi normali del telefono di chi gioca qui (tel.colpo non scartati, con la forma)
export function normalSwings(events){
  return events.filter(e => e.k === 'tel.colpo' && !e.scartato && e.forma && finite(e.forma.salita) && NORMAL.has(e.intenzione?.tipo || e.tipo));
}
// 1. variazione del gesto per lato: n, deviazione della salita rispetto all'abituale, del piano, della forza; quota dei
// colpi normali vicini alla soglia del tagliato (entro SPREAD.near) e sotto la soglia della schiacciata
export function gestureSpread(events){
  const out = {};
  for (const [lato, list] of Object.entries(groupSide(normalSwings(events)))){
    const rel = list.map(e => e.forma.salita - (finite(e.intenzione?.abituale) ? e.intenzione.abituale : 0));
    const sliceAt = e => INTENT.sliceRise + Math.min(0, finite(e.intenzione?.abituale) ? e.intenzione.abituale : 0);
    const smashAt = e => INTENT.smashRise + Math.min(0, finite(e.intenzione?.abituale) ? e.intenzione.abituale : 0);
    const near = list.filter(e => e.forma.salita - sliceAt(e) <= SPREAD.near).length, smash = list.filter(e => e.forma.salita <= smashAt(e)).length;
    const dev = sd(rel);
    out[lato] = { n: list.length, salitaScarto: r2(dev), salitaMediana: r2(q(list.map(e => e.forma.salita), .5)), salitaP10: r2(q(rel, .1)), salitaP90: r2(q(rel, .9)),
      piano: r2(sd(list.map(e => Math.abs(e.forma.piano)))), forza: r2(sd(list.map(e => e.intenzione?.forza))),
      vicinoTagliatoPercento: list.length ? r0(100*near/list.length) : null, sottoSchiacciataPercento: list.length ? r0(100*smash/list.length) : null,
      verdetto: list.length < SPREAD.minShots ? 'pochi colpi' : dev > SPREAD.relative ? 'varia molto: soglia relativa da considerare' : 'stabile' };
  }
  return out;
}
const groupSide = list => { const o = {}; for (const e of list){ const s = sideOf(e.lato); if (s) (o[s] ||= []).push(e); } return o; };

// 2. dal rimbalzo al gesto, e dal gesto all'impatto previsto (piano del motore), per ogni palla dell'avversario
export function bounceToGesture(events){
  const out = [];
  let b = null, plan = null;
  for (const e of events){
    if (e.k === 'rimbalzo'){ b = (e.da === 'opponent' || e.da === 'p2') && (e.n == null || e.n <= 1) ? e : null; continue; }
    if (e.k === 'piano' && e.chi === 'giocatore'){ plan = finite(e.tc) ? { at: e.t + 1000*e.tc, tipo: e.tipo } : null; continue; }
    if (e.k === 'punto' || (e.k === 'colpo.gioco' && e.chi && e.chi !== 'giocatore')){ b = null; continue; }
    if (b && e.k === 'tel.colpo' && !e.scartato){
      const at = finite(e.picco) ? e.picco : e.t, gap = at - b.t;
      if (gap >= -200 && gap <= SPREAD.maxGapMs) out.push({ dalRimbalzoMs: r0(gap), primaDellImpattoMs: plan && plan.tipo === 'ground' ? r0(plan.at - at) : null, lato: sideOf(e.lato) });
      b = null;
    }
  }
  return out;
}
const distr = a => { const v = a.filter(finite); return v.length ? { n: v.length, p10: r0(q(v, .1)), p50: r0(q(v, .5)), p90: r0(q(v, .9)) } : { n: 0 }; };
export function gestureMeasures(events = []){
  const spread = gestureSpread(events), bg = bounceToGesture(events);
  if (!Object.keys(spread).length && !bg.length) return null;
  return { nota: 'misure da raccogliere con persone vere (B18): non cambiano il gioco', variazione: spread,
    rimbalzo: { colpi: bg.length, dalRimbalzoMs: distr(bg.map(x => x.dalRimbalzoMs)), primaDellImpattoMs: distr(bg.map(x => x.primaDellImpattoMs)) } };
}
// righe in parole (pannello, rapporto, script)
export function gestureMeasureLines(m){
  if (!m) return [];
  const L = [];
  for (const [lato, v] of Object.entries(m.variazione || {}))
    L.push(`Variazione del gesto (${lato}, ${v.n} colpi normali): salita ±${v.salitaScarto ?? '–'} attorno all'abituale (soglia relativa oltre ${SPREAD.relative}) · piano ±${v.piano ?? '–'} · forza ±${v.forza ?? '–'} · vicini alla soglia del tagliato ${v.vicinoTagliatoPercento ?? '–'}% · sotto la soglia della schiacciata ${v.sottoSchiacciataPercento ?? '–'}% · ${v.verdetto}`);
  const R = m.rimbalzo;
  if (R?.colpi) L.push(`Dal rimbalzo al gesto (${R.colpi} palle): mediana ${R.dalRimbalzoMs.p50} ms (10% ${R.dalRimbalzoMs.p10}, 90% ${R.dalRimbalzoMs.p90})${R.primaDellImpattoMs.n ? ` · gesto prima dell'impatto previsto mediana ${R.primaDellImpattoMs.p50 > 0 ? '+' : ''}${R.primaDellImpattoMs.p50} ms (+ = in anticipo)` : ''}`);
  return L;
}
