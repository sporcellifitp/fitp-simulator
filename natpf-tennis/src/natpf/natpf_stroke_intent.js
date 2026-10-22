// Telefono come racchetta: dal gesto all'intenzione del colpo, sul computer (docs/NATPF_RACCHETTA_VIRTUALE.md §3).
// Il telefono misura la forma del colpo nel riferimento della gravità (site/js/tennis/stroke-shape.js): piano dello
// swing, verso della testa della racchetta, inclinazione del manico, velocità. Qui diventa:
//   • tipo di colpo, con margini chiari (un colpo speciale solo se il gesto lo dice davvero, altrimenti colpo normale);
//   • forza (velocità vera del gesto, rispetto al proprio colpo tipico se c'è la calibrazione);
//   • profondità voluta (forza e ampiezza: uno swing corto resta corto);
//   • mira del piatto rispetto al proprio colpo abituale per lato (zona morta: i colpi normali non si spostano).
// Niente caso: lo stesso gesto dà sempre la stessa intenzione. Tempo ed esecuzione li aggiunge il motore all'impatto
// (natpf_stroke_outcome.js), quando sa dov'è la palla.
//
// Riferimenti dei giochi con il controller di movimento: swing dal basso verso l'alto = pallonetto se deciso e verticale,
// top spin se il piano resta orizzontale; dall'alto verso il basso = tagliato, morbido o corto = palla corta; swing
// dall'alto su una palla alta = schiacciata.
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const finite = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

export const INTENT = Object.freeze({
  lobRise: .55,      // pallonetto: la testa sale decisa…
  lobPlane: .8,      // … con lo swing verticale o obliquo (|piano| fino a così) …
  lobSoft: .55,      // … oppure con un gesto non troppo forte (con uno swing orizzontale e veloce è un top spin carico)
  topRise: .15,      // top spin: la testa sale almeno un poco
  sliceRise: -.22,   // tagliato: la testa scende
  dropPower: .36,    // palla corta: tagliato morbido (forza fino a così) …
  dropAngle: 48,     // … o corto (ampiezza dello swing fino a così, gradi)
  flatRise: .12,     // piatto: testa in piano (|salita| fino a così) …
  flatPower: .62,    // … e gesto forte
  smashRise: -.08,   // schiacciata (solo con la palla alta): la testa scende o almeno non sale…
  smashPlane: .55,   // … oppure swing verticale (|piano| sotto così) con il manico alto
  smashTilt: .4,
  smashPower: .3,
  peakLow: 250, peakHigh: 1350,   // °/s: forza assoluta da 0 a 1 (i dritti veri arrivano a 1200–1650 °/s)
  compact: 30, wide: 100,          // gradi: swing corto (profondità ridotta) … ampio (profondità piena)
  faceDead: 8, faceSpan: 28,       // gradi: zona morta e scarto per la mira piena del piatto
});
export const SHOTS = Object.freeze(['topspin', 'flat', 'slice', 'drop', 'lob', 'smash']);

// Forza 0…1: velocità vera del telefono al picco; con un proprio colpo tipico (calibrazione) per metà relativa a quello
export function strokePower(peak, ref = null){
  const p = finite(peak, NaN);
  if (!Number.isFinite(p)) return .5;
  const abs = clamp((p - INTENT.peakLow)/(INTENT.peakHigh - INTENT.peakLow));
  return Number.isFinite(ref) && ref > 60 ? clamp(.5*abs + .5*clamp(.6*p/ref)) : abs;
}
// Quanto è ampio lo swing: 0 corto … 1 ampio (la profondità voluta lo segue)
export const swingReach = angle => (Number.isFinite(angle) ? clamp((angle - INTENT.compact)/(INTENT.wide - INTENT.compact)) : .7);

// Tipo di colpo dalla forma. ballHigh: la palla all'impatto sarà alta (zona della schiacciata); se non si sa, null.
// Restituisce { shot, conf (margine 0…1 dalla soglia più vicina), why }.
export function classifyStroke(shape, { power = .5, angle = null, ballHigh = null } = {}){
  const I = INTENT, r = finite(shape?.rise), P = Math.abs(finite(shape?.plane, 1)), tilt = finite(shape?.tilt), p = clamp(finite(power, .5));
  const m = (v, scale) => +clamp(Math.abs(v)/scale).toFixed(2);
  if (ballHigh && p >= I.smashPower && (r <= I.smashRise || (P < I.smashPlane && tilt >= I.smashTilt)))
    return { shot: 'smash', conf: Math.max(m(I.smashRise - r, .3), m(I.smashPlane - P, .3)), why: ['palla alta', r <= I.smashRise ? `dall'alto (${r.toFixed(2)})` : `swing verticale, manico alto (${tilt.toFixed(2)})`] };
  if (r >= I.lobRise && (P <= I.lobPlane || p <= I.lobSoft))
    return { shot: 'lob', conf: m(r - I.lobRise, .3), why: [`la testa sale decisa (${r.toFixed(2)})`, P <= I.lobPlane ? `swing verticale (${P.toFixed(2)})` : `gesto morbido (${p.toFixed(2)})`] };
  if (r <= I.sliceRise){
    const soft = p <= I.dropPower, short = Number.isFinite(angle) && angle <= I.dropAngle;
    if (soft || short) return { shot: 'drop', conf: Math.min(m(I.sliceRise - r, .3), soft ? m(I.dropPower - p, .2) : m(I.dropAngle - angle, 20)), why: [`dall'alto in basso (${r.toFixed(2)})`, soft ? `morbido (${p.toFixed(2)})` : `corto (${Math.round(angle)}°)`] };
    return { shot: 'slice', conf: m(I.sliceRise - r, .3), why: [`dall'alto in basso (${r.toFixed(2)})`] };
  }
  if (r >= I.topRise) return { shot: 'topspin', conf: m(r - I.topRise, .3), why: [`dal basso verso l'alto (${r.toFixed(2)})`] };
  if (p >= I.flatPower && Math.abs(r) <= I.flatRise) return { shot: 'flat', conf: Math.min(m(p - I.flatPower, .2), m(I.flatRise - Math.abs(r), .12)), why: [`in piano e forte (${p.toFixed(2)})`] };
  return { shot: 'topspin', conf: .5, why: ['colpo normale'] };
}

// Mira del piatto: scarto (gradi) della direzione del piatto all'impatto dal proprio colpo abituale per lato, con zona
// morta. +1 piatto girato a destra … −1 a sinistra; 0 se non misurata.
export function faceAimFromDev(dev){
  if (!Number.isFinite(dev)) return 0;
  const a = Math.max(0, Math.abs(dev) - INTENT.faceDead)/INTENT.faceSpan;
  return +(Math.sign(dev)*clamp(a)).toFixed(3);
}

// Intenzione completa da un colpo letto (parseSwingMessage) con la forma. null senza forma (telefono non aggiornato).
//   ref: colpo tipico (°/s) dalla calibrazione · headingDev: scarto del piatto dal proprio colpo abituale (gradi)
export function strokeIntent(s, { ref = null, ballHigh = null, headingDev = null } = {}){
  if (!s?.shape) return null;
  const power = strokePower(s.peak, ref), reach = swingReach(s.angle);
  const cls = classifyStroke(s.shape, { power, angle: s.angle, ballHigh });
  return {
    shot: cls.shot, conf: cls.conf, why: cls.why, power: +power.toFixed(3), reach: +reach.toFixed(3),
    // profondità voluta 0…1: la forza, ridotta se lo swing è corto (un colpo bloccato resta a metà campo)
    depth: +clamp(power*(.55 + .45*reach)).toFixed(3),
    rise: finite(s.shape.rise), plane: finite(s.shape.plane), tilt: finite(s.shape.tilt), roll: finite(s.shape.roll),
    face: faceAimFromDev(headingDev),
  };
}
