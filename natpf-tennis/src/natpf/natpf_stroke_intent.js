// Telefono come racchetta: dal gesto all'intenzione del colpo, sul computer (docs/NATPF_RACCHETTA_VIRTUALE.md §3).
// Il telefono misura la forma del colpo nel riferimento della gravità (site/js/tennis/stroke-shape.js): piano dello
// swing, verso della testa della racchetta, inclinazione del manico, velocità. Qui diventa:
//   • tipo di colpo, con margini chiari (un colpo speciale solo se il gesto lo dice davvero, altrimenti colpo normale);
//   • forza (velocità vera del gesto, rispetto al proprio colpo tipico se c'è la calibrazione);
//   • profondità voluta (forza e, poco, ampiezza: un colpo bloccato è un poco più corto, uno compatto e veloce no);
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
  lobRise: .6,       // pallonetto, senza la propria salita abituale: la testa sale decisa…
  lobPlane: .55,     // … con lo swing nettamente verticale (|piano| fino a così: piano inclinato di oltre 57°). Era .8: il
                     // 23/10 un dritto da 1005 °/s in top spin (piano 0,65, salita 0,63) è diventato un pallonetto in rete
  // Con la salita abituale (calibrazione o, dopo qualche colpo, imparata giocando): la testa sale almeno lobRelMin e
  // lobRel più del proprio colpo normale, con lo swing più verticale che orizzontale (|piano| fino a lobRelPlane).
  // 29/10 pomeriggio: con il telefono nel palmo e la cima in avanti i colpi normali di chi gioca scendono (salita
  // −0,3…0) e i suoi gesti dal basso verso l'alto arrivavano a 0,53–0,64 con il piano a 0,47–0,61: tre su quattro
  // restavano top spin. Il top spin pieno di chi ha la salita abituale 0,3 (0,63, piano 0,65) resta un top spin
  lobRelMin: .5, lobRel: .45, lobRelPlane: .7,
  lobSoft: .3,       // … oppure con un gesto lento (circa 580 °/s: un pallonetto difensivo). Era .55 (850 °/s, un dritto
                     // normale di chi gioca da amatore): ogni dritto in salita oltre 33° diventava un pallonetto
  lobSoftOver: .35,  // gesto lento: basta che la testa salga di tanto oltre la propria salita abituale (almeno lobRise).
                     // 28/10 sera: a rete il braccio alzato sopra la testa (salita 0,71, forza 0,13) restava un top spin
                     // perché con la salita abituale 0,3 la soglia era 0,9
  topRise: .15,      // top spin: la testa sale almeno un poco
  sliceRise: -.22,   // tagliato: la testa scende
  dropPower: .36,    // palla corta: tagliato morbido (forza fino a così) …
  dropAngle: 48,     // … o corto (ampiezza dello swing fino a così, gradi), ma sempre un gesto vero (almeno dropMinAngle:
  dropMinAngle: 15,  // il 23/10 12 palle corte su 14 venivano da micro-movimenti di 3–32°)
  dropSoftRise: -.12, dropVerticalPlane: .55, // taglio verticale morbido anche con pronazione abituale
  flatRise: .12,     // piatto: testa in piano (|salita| fino a così) …
  flatPower: .62,    // … e gesto forte
  smashRise: -.08,   // schiacciata (solo con la palla alta): la testa scende o almeno non sale…
  smashPlane: .55,   // … oppure swing verticale (|piano| sotto così) con il manico alto
  smashTilt: .4,
  smashPower: .3,
  peakLow: 250, peakHigh: 1350,   // °/s: forza assoluta da 0 a 1 (i dritti veri arrivano a 1200–1650 °/s)
  compact: 30, wide: 100,          // gradi: swing corto (profondità ridotta) … ampio (profondità piena)
  reachDepth: .8,                  // profondità voluta di uno swing corto rispetto a uno ampio alla stessa forza (era
                                   // 0,55: un colpo compatto ma veloce perdeva quasi metà della profondità)
  faceDead: 3, faceSpan: 20,       // gradi: zona morta e scarto per la mira piena del piatto (27/10: era 8 e 28; un
                                   // piatto girato apposta di 15° vale ora .4, prima .25: la mira risponde prima).
                                   // 29/10: era 5 e 25; richiesta «angolazione più sensibile»: 15° valgono .6, la
                                   // mira piena a 23° (con il centro che si corregge sui colpi veri, createAimModel)
  faceTrust: 45, faceTrustSpan: 15, // gradi: oltre faceTrust lo scarto è sempre meno credibile, oltre +span non conta. Il
                                   // 23/10 26 mire su 67 erano sature (scarti di 50–77° da un centro imparato male):
                                   // aggiungevano fino a 1,2 m di lato da una misura sbagliata
  riseRefMin: -.6, riseRefMax: .3, // salita abituale (calibrazione) che si tiene in conto, al massimo
});
export const SHOTS = Object.freeze(['topspin', 'flat', 'slice', 'drop', 'lob', 'smash']);

// Forza 0…1: velocità vera del telefono al picco; con un proprio colpo tipico (calibrazione) per metà relativa a quello
export function strokePower(peak, ref = null){
  const p = finite(peak, NaN);
  if (!Number.isFinite(p)) return .5;
  const abs = clamp((p - INTENT.peakLow)/(INTENT.peakHigh - INTENT.peakLow));
  return Number.isFinite(ref) && ref > 60 ? clamp(.5*abs + .5*clamp(.6*p/ref)) : abs;
}
// Forza del gesto per il confronto con i propri gesti (personalSpecial): la parte assoluta, dal picco vero se c'è.
// Non dipende dal colpo tipico, che si sposta con i colpi della partita: prima i prototipi del pallonetto e della palla
// corta, imparati negli esercizi con la forza relativa alla calibrazione, non erano più confrontabili con i gesti della
// partita (stesso gesto: forza 0,31 negli esercizi, poi 0,39–0,58) e la palla corta finiva letta come un dritto
export const shapePower = s => strokePower(Number.isFinite(s?.rawPeak) ? s.rawPeak : s?.peak);
// Quanto è ampio lo swing: 0 corto … 1 ampio (la profondità voluta lo segue)
export const swingReach = angle => (Number.isFinite(angle) ? clamp((angle - INTENT.compact)/(INTENT.wide - INTENT.compact)) : .7);

// Tipo di colpo dalla forma. ballHigh: la palla all'impatto sarà alta (zona della schiacciata); se non si sa, null.
// riseRef: salita abituale dei propri colpi normali in quel verso (imparata giocando o dalla calibrazione,
// natpf_phone_racket.habitualRise). Con il telefono in verticale nel pugno il polso che prona abbassa la testa della
// racchetta virtuale anche nel colpo normale (presa del 19/10), con il telefono nel palmo e la cima in avanti il colpo
// normale scende (29/10): top spin e piatto si leggono rispetto a questa; tagliato e schiacciata si spostano solo per
// diventare più difficili, il pallonetto si misura sopra il proprio colpo normale. Senza (null) le soglie assolute.
// Restituisce { shot, conf (margine 0…1 dalla soglia più vicina), why }.
export function classifyStroke(shape, { power = .5, angle = null, ballHigh = null, riseRef = null } = {}){
  const I = INTENT, r = finite(shape?.rise), P = Math.abs(finite(shape?.plane, 1)), tilt = finite(shape?.tilt), p = clamp(finite(power, .5));
  const ref = clamp(finite(riseRef), I.riseRefMin, I.riseRefMax), rel = r - ref;
  const known = Number.isFinite(Number(riseRef)) && riseRef !== null;
  const lobAt = known ? Math.max(I.lobRelMin, ref + I.lobRel) : I.lobRise, lobPlane = known ? I.lobRelPlane : I.lobPlane, sliceAt = I.sliceRise + Math.min(0, ref), smashAt = I.smashRise + Math.min(0, ref);
  const m = (v, scale) => +clamp(Math.abs(v)/scale).toFixed(2);
  const said = r.toFixed(2) + (ref ? `, abituale ${ref.toFixed(2)}` : '');
  if (ballHigh && p >= I.smashPower && (r <= smashAt || (P < I.smashPlane && tilt >= I.smashTilt)))
    return { shot: 'smash', conf: Math.max(m(smashAt - r, .3), m(I.smashPlane - P, .3)), why: ['palla alta', r <= smashAt ? `dall'alto (${said})` : `swing verticale, manico alto (${tilt.toFixed(2)})`] };
  const softLobAt = Math.max(I.lobRise, ref + I.lobSoftOver);
  if (r >= lobAt && P <= lobPlane)
    return { shot: 'lob', conf: m(r - lobAt, .3), why: [`la testa sale decisa (${said})`, `swing verticale (${P.toFixed(2)})`] };
  if (p <= I.lobSoft && r >= softLobAt)
    return { shot: 'lob', conf: m(r - softLobAt, .3), why: [`la testa sale decisa (${said})`, `gesto morbido (${p.toFixed(2)})`] };
  // Una carezza verticale resta una palla corta: non deve scendere ancora oltre la pronazione del dritto.
  if ((!Number.isFinite(angle) || angle >= I.dropMinAngle) && r <= I.dropSoftRise && P <= I.dropVerticalPlane && p <= I.dropPower)
    return { shot: 'drop', conf: Math.min(m(I.dropSoftRise - r, .3), m(I.dropPower - p, .2)), why: ['taglio verticale morbido', `discesa ${r.toFixed(2)}, forza ${p.toFixed(2)}`] };
  if (r <= sliceAt){
    // palla corta: morbido o corto, ma un gesto vero (senza ampiezza misurata vale com'era)
    const real = !Number.isFinite(angle) || angle >= I.dropMinAngle;
    const soft = real && p <= I.dropPower, short = real && Number.isFinite(angle) && angle <= I.dropAngle;
    if (soft || short) return { shot: 'drop', conf: Math.min(m(sliceAt - r, .3), soft ? m(I.dropPower - p, .2) : m(I.dropAngle - angle, 20)), why: [`dall'alto in basso (${said})`, soft ? `morbido (${p.toFixed(2)})` : `corto (${Math.round(angle)}°)`] };
    return { shot: 'slice', conf: m(sliceAt - r, .3), why: [`dall'alto in basso (${said})`] };
  }
  if (rel >= I.topRise) return { shot: 'topspin', conf: m(rel - I.topRise, .3), why: [`dal basso verso l'alto (${said})`] };
  if (p >= I.flatPower && Math.abs(rel) <= I.flatRise) return { shot: 'flat', conf: Math.min(m(p - I.flatPower, .2), m(I.flatRise - Math.abs(rel), .12)), why: [`in piano e forte (${p.toFixed(2)})`] };
  return { shot: 'topspin', conf: .5, why: ['colpo normale'] };
}

// Pallonetto e palla corta personali: prototipi della forma dei propri gesti fatti a richiesta negli esercizi del
// riscaldamento (lob, drop: { rise, plane (|piano|), power }) e del proprio colpo normale (normal, imparato giocando).
// Segnalazione del 23/10, sera: pallonetti e palle corte quasi mai riconosciuti. Con il telefono dritto nel pugno e il
// gesto fatto di polso la testa virtuale (asse lungo del telefono) si muove di lato: un pallonetto vero dava salita
// 0,2 (soglia 0,6) e una palla corta −0,07, come un dritto. Le soglie fisse non vedono la differenza, il confronto con i
// propri gesti sì. Il gesto è il colpo speciale se è più vicino al proprio pallonetto (o alla propria palla corta) che al
// proprio colpo normale di almeno «margin», entro «maxDist»; un prototipo troppo simile al colpo normale (sotto
// «minSep») non si usa. Distanze in unità di «scale»; power è la forza assoluta del gesto (shapePower).
// riseGuard: se il proprio colpo speciale sale (o scende) di almeno tanto più del proprio colpo normale, il gesto deve
// arrivare almeno a metà strada in quel verso (con il solo pallonetto imparato, una palla corta, verticale e morbida,
// era più vicina al pallonetto che al colpo normale e si leggeva pallonetto)
export const PERSONAL = Object.freeze({ scale: Object.freeze({ rise: .3, plane: .3, power: .25 }), maxDist: 1.6, margin: .2, minSep: .9, riseGuard: .12 });
const shapeDist = (a, b) => { const S = PERSONAL.scale; return Math.hypot((a.rise - b.rise)/S.rise, (a.plane - b.plane)/S.plane, (a.power - b.power)/S.power); };
// il proprio colpo speciale si distingue dal proprio colpo normale (altrimenti non si può riconoscere)
export const shapeDistinct = (p, normal) => !!p && !!normal && shapeDist(p, normal) >= PERSONAL.minSep;
export function personalSpecial(f, { normal = null, lob = null, drop = null } = {}){
  if (!normal || !f) return null;
  let best = null;
  const sameWay = p => { const d = p.rise - normal.rise; return Math.abs(d) < PERSONAL.riseGuard || (f.rise - normal.rise)*Math.sign(d) >= .5*Math.abs(d); };
  for (const [shot, p] of [['lob', lob], ['drop', drop]]){
    if (!shapeDistinct(p, normal) || !sameWay(p)) continue;
    const d = shapeDist(f, p);
    if (!best || d < best.d) best = { shot, d };
  }
  if (!best) return null;
  const dN = shapeDist(f, normal);
  return best.d <= PERSONAL.maxDist && best.d + PERSONAL.margin < dN ? { shot: best.shot, d: +best.d.toFixed(2), dN: +dN.toFixed(2) } : null;
}

// Mira del piatto: scarto (gradi) della direzione del piatto all'impatto dal proprio colpo abituale per lato, con zona
// morta. +1 piatto girato a destra … −1 a sinistra; 0 se non misurata.
export function faceAimFromDev(dev){
  if (!Number.isFinite(dev)) return 0;
  const a = Math.max(0, Math.abs(dev) - INTENT.faceDead)/INTENT.faceSpan, trust = 1 - clamp((Math.abs(dev) - INTENT.faceTrust)/INTENT.faceTrustSpan);
  return +(Math.sign(dev)*clamp(a)*trust).toFixed(3);
}

// Intenzione completa da un colpo letto (parseSwingMessage) con la forma. null senza forma (telefono non aggiornato).
//   ref: colpo tipico (°/s) dalla calibrazione · headingDev: scarto del piatto dal proprio colpo abituale (gradi)
//   riseRef: salita abituale in quel verso dalla calibrazione (classifyStroke)
//   rawRef: colpo tipico con la velocità vera al picco (calibrazione). Con rawPeak del telefono la forza si misura sul picco
//   vero: il massimo della media mobile (peak) negli swing corti resta molto sotto (50° a 1100 °/s: 72%, forza 0,49
//   contro 0,70 di uno swing ampio alla stessa velocità). Con un profilo senza rawRef si resta sul picco della media.
//   personal: prototipi dei propri gesti (personalSpecial): pallonetto e palla corta come li fa chi gioca, tranne con
//   la palla alta (la schiacciata resta quella)
export function strokeIntent(s, { ref = null, rawRef = null, ballHigh = null, headingDev = null, riseRef = null, personal = null } = {}){
  if (!s?.shape) return null;
  const useRaw = Number.isFinite(s.rawPeak) && (Number.isFinite(rawRef) || !Number.isFinite(ref));
  const power = useRaw ? strokePower(s.rawPeak, Number.isFinite(rawRef) ? rawRef : null) : strokePower(s.peak, ref), reach = swingReach(s.angle);
  let cls = classifyStroke(s.shape, { power, angle: s.angle, ballHigh, riseRef });
  const sp = shapePower(s);
  const own = cls.shot === 'smash' ? null : personalSpecial({ rise: finite(s.shape.rise), plane: Math.abs(finite(s.shape.plane, 1)), power: sp }, personal || {});
  if (own && own.shot !== cls.shot) cls = { shot: own.shot, conf: +clamp((own.dN - own.d)/2).toFixed(2), why: [own.shot === 'lob' ? 'come il tuo pallonetto' : 'come la tua palla corta', `distanza ${own.d} (dal colpo normale ${own.dN})`] };
  return {
    shot: cls.shot, conf: cls.conf, why: cls.why, power: +power.toFixed(3), shapePower: +sp.toFixed(3), reach: +reach.toFixed(3),
    // profondità voluta 0…1: la forza, un poco ridotta se lo swing è corto (un colpo bloccato è più corto)
    depth: +clamp(power*(INTENT.reachDepth + (1 - INTENT.reachDepth)*reach)).toFixed(3),
    rise: finite(s.shape.rise), plane: finite(s.shape.plane), tilt: finite(s.shape.tilt), roll: finite(s.shape.roll),
    riseRef: Number.isFinite(riseRef) ? +clamp(riseRef, INTENT.riseRefMin, INTENT.riseRefMax).toFixed(3) : null,
    face: faceAimFromDev(headingDev),
  };
}
