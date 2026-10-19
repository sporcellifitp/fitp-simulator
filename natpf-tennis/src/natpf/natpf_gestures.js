// Mappatura gesto del telefono → colpo, in un solo posto e senza DOM (verificabile con i test).
//
// Segnali che arrivano dal telefono (presa verticale, l'unica in gioco):
//   H  verso orizzontale del gesto rispetto all'asse imparato in calibrazione (giroscopio): +1 da destra a sinistra,
//      −1 da sinistra a destra, 0 nessuno (gesto verticale o senza calibrazione)
//   V  gesto verticale riconosciuto sul telefono: 'up' / 'down' (asse di rotazione orizzontale E mano che sale/scende)
//   L  verso verticale della mano durante la spinta (accelerazione lineare lungo la gravità), rispetto al proprio
//      gesto della calibrazione NELLO STESSO VERSO (dritto e rovescio hanno valori diversi: nelle registrazioni vere il
//      rovescio «scende» di suo di 0,4 più del dritto): > 0 sale, < 0 scende. È un segnale rumoroso: le soglie si
//      allargano con la variabilità dei propri gesti di calibrazione (liftSpread)
//   T  verso verticale del colpo dal giroscopio e dall'orientamento: di quanto il piatto che colpisce sale o scende
//      mentre ruota (−1…+1, face-tracker.headAt; il piatto che colpisce è il palmo nel dritto, il dorso della mano
//      nel rovescio), rispetto ai propri colpi in quel verso. È il segnale principale: con la presa a manico il dritto
//      ruota il telefono attorno al suo asse lungo e L misura soprattutto la forza centripeta. Con T si usa
//      V = 0,6·T + 0,4·L, senza T solo L.
//   S  velocità rispetto al proprio colpo tipico: sotto 0,45 è un gesto lento (niente lob o tagliato dalla sola L,
//      resta possibile la palla corta, che è lenta per definizione)
//   F  piatto all'impatto (filtro d'orientamento del telefono): imbardata → mira (−1 sinistra … +1 destra) e
//      apertura (gradi, > 0 aperto verso l'alto), tutti e due rispetto al proprio colpo abituale
//   P  forza: metà rispetto alla propria calibrazione, metà dalla velocità vera del telefono
// Contesto del gioco: mano (destra/mancina) e palla alta sopra la testa.
//
// Tabella (la prima riga che vale decide; nessun colpo speciale nasce da un solo segnale). Soglie di L moltiplicate
// per k = liftSpread/0,12 (tra 1 e 1,2; con 1,8 il pallonetto non usciva più a nessuno):
//   gesto verticale verso l'alto (V up, senza verso orizzontale H)  → lob, lato dalla palla
//   gesto verticale verso l'alto con un po' di H e mano che sale (L ≥ 0,35) → lob
//   gesto verticale verso il basso (V down, senza H) con palla alta → schiacciata
//   gesto verticale verso il basso (V down, senza H) con palla bassa → tagliato (chop)
//   orizzontale, mano che sale molto (L ≥ 0,5), o sale (L ≥ 0,35) con piatto aperto (F ≥ 10°), non lento → lob
//   orizzontale con palla alta e mano che scende (L ≤ −0,25)         → schiacciata
//   orizzontale, mano che scende (L ≤ −0,35), piatto aperto (F ≥ 8°) e gesto morbido (P < 0,45) → palla corta
//   orizzontale, mano che scende (L ≤ −0,35), non lento             → tagliato
//   orizzontale, mano che sale un poco (0,2 ≤ L)                     → topspin
//   orizzontale veloce (P ≥ 0,78) con piatto dritto (|F| < 10°)      → piatto (colpo potente)
//   orizzontale, il resto                                           → topspin
// Lato: H con la mano (dritto del destro = H +1, del mancino = H −1); senza H, la preparazione o la palla.
// Direzione: soprattutto il piatto all'impatto (girato a destra → palla a destra, uguale per dritto e rovescio, così
// il rovescio va anche lungolinea), poi un poco il tempo del colpo (motore, natpf_skill.swingLandingX).
export const GESTURE = Object.freeze({
  lobLift: .5, lobLiftOpen: .35, lobOpen: 10,
  cutLift: -.35, dropOpen: 8, dropPower: .45,
  smashLift: -.25, topLift: .2,
  flatPower: .78, flatFace: 10,
  slow: .45, spreadRef: .12, spreadMax: 1.2,
  headWeight: .6, dropSpeed: .7,
  lobV: .38, cutV: -.28, topV: .12,     // soglie di V quando c'è T (segnale più pulito: niente allargamento con k)
  // con T: pallonetto e tagliato veloce solo se la mano si sposta davvero in alto o in basso (L rispetto ai propri
  // colpi, la stessa soglia del gesto verticale del telefono, swing-detect VERTICAL.minLift). La rotazione del polso
  // da sola non basta: con la presa vera (video del 19/10) il telefono prona di 60–90° a fine dritto, T arriva a ±0,7 e
  // i dritti diventavano pallonetti o tagliati. La palla corta (tagliato morbido) resta com'era.
  lobMove: .25, cutMove: .25,
  aimYaw: 40, maxAimYaw: 80,
});
const finite = (v, d = 0) => (Number.isFinite(v) ? v : d);
const median = a => { const v = [...a].sort((x, y) => x - y), m = v.length >> 1; return v.length ? (v.length % 2 ? v[m] : (v[m - 1] + v[m])/2) : 0; };

// Verso verticale abituale dai gesti di calibrazione (profilo del telefono: templates con dir e features.lift), per
// verso del colpo, e la loro variabilità (deviazione mediana dal proprio verso). null senza gesti.
export function liftBaselineFromProfile(profile){
  const xs = (profile?.templates || []).filter(t => (t.dir === 1 || t.dir === -1) && Number.isFinite(t.features?.lift) && (!t.shot || t.shot === 'drive'));
  if (!xs.length) return null;
  const out = { all: +median(xs.map(t => t.features.lift)).toFixed(3) };
  for (const d of [1, -1]){ const v = xs.filter(t => t.dir === d).map(t => t.features.lift); if (v.length) out[d] = +median(v).toFixed(3); }
  out.spread = +median(xs.map(t => Math.abs(t.features.lift - (out[t.dir] ?? out.all)))).toFixed(3);
  return out;
}
// Verso verticale abituale che si adatta a come si gioca davvero: nelle registrazioni il rovescio in partita saliva in
// media di 0,9 più dei due rovesci della calibrazione, e ogni rovescio sembrava un lob. Si parte dalla calibrazione;
// dopo `min` colpi in un verso vale la mediana degli ultimi `keep` colpi in quel verso (la maggior parte dei colpi sono
// normali, la mediana non si sposta per qualche lob o tagliato), e la variabilità è quella dei colpi veri.
export function createLiftModel(initial = null, { keep = 12, min = 3 } = {}){
  const hist = { 1: [], '-1': [] };
  let calib = initial;
  return {
    reset(next = null){ calib = next; hist[1] = []; hist[-1] = []; },
    add(dir, lift){ if ((dir === 1 || dir === -1) && Number.isFinite(lift)){ const h = hist[dir]; h.push(lift); if (h.length > keep) h.shift(); } },
    get value(){
      const out = calib && typeof calib === 'object' ? { ...calib } : { all: Number.isFinite(calib) ? calib : 0, spread: 0 };
      const dev = [];
      for (const d of [1, -1]){
        const h = hist[d]; if (h.length < min) continue;
        out[d] = +median(h).toFixed(3); dev.push(...h.map(v => Math.abs(v - out[d])));
      }
      if (dev.length >= min) out.spread = +median(dev).toFixed(3);
      return out;
    },
  };
}
// Piatto abituale in partita, per verso del colpo: la mediana degli ultimi colpi veri (dopo `min`) si toglie
// all'imbardata e all'apertura misurate dal telefono. Nelle registrazioni il riferimento della calibrazione era lontano
// dai colpi veri (dritto −30°, aperture di 50–90° che facevano «palle corte» non volute): la mira è lo scarto dal
// proprio colpo normale, che va al centro.
export function createFaceModel({ keep = 12, min = 3 } = {}){
  const hist = { 1: [], '-1': [] };
  return {
    reset(){ hist[1] = []; hist[-1] = []; },
    add(dir, face){ if ((dir === 1 || dir === -1) && face && Number.isFinite(face.yaw)){ const h = hist[dir]; h.push({ yaw: face.yaw, pitch: finite(face.pitch) }); if (h.length > keep) h.shift(); } },
    center(dir){ const h = hist[dir]; return h && h.length >= min ? { yaw: +median(h.map(f => f.yaw)).toFixed(1), pitch: +median(h.map(f => f.pitch)).toFixed(1) } : null; },
  };
}
// piatto rispetto al proprio colpo abituale: mira (curva morbida, null se lo scarto non è credibile) e apertura
export function centeredFace(face, center = null){
  if (!face || !Number.isFinite(face.yaw)) return null;
  if (!center) return face;
  let yaw = face.yaw - center.yaw; while (yaw > 180) yaw -= 360; while (yaw < -180) yaw += 360;
  const aim = Math.abs(yaw) > GESTURE.maxAimYaw ? null : +Math.tanh(yaw/GESTURE.aimYaw).toFixed(3);
  return { ...face, yaw: +yaw.toFixed(1), pitch: +(finite(face.pitch) - center.pitch).toFixed(1), aim, centered: true };
}
// riferimento per il verso del colpo: numero (vecchio formato) oppure { all, 1, -1, spread }
export function resolveLiftBaseline(b, dir = 0){
  if (Number.isFinite(b)) return { base: b, spread: 0 };
  if (!b || typeof b !== 'object') return { base: 0, spread: 0 };
  return { base: finite(b[dir], finite(b.all)), spread: finite(b.spread) };
}

export function classifyPhoneShot({ dir = 0, vert = null, lift = 0, liftBaseline = 0, liftSpread = null, head = null, headBaseline = 0, facePitch = null, power = .6, speed = null, ballHigh = false, personal = null } = {}){
  const ref = resolveLiftBaseline(liftBaseline, dir), G = GESTURE;
  const hasHead = Number.isFinite(head);
  const T = hasHead ? head - resolveLiftBaseline(headBaseline, dir).base : null;
  // spostamento verticale della mano (accelerometro) rispetto ai propri colpi in quel verso: è la prova che il colpo va
  // davvero verso l'alto o verso il basso, a differenza di T che misura solo come ruota il piatto
  const move = finite(lift) - ref.base;
  const L = hasHead ? G.headWeight*T + (1 - G.headWeight)*move : move, open = Number.isFinite(facePitch) ? facePitch : null;
  const k = Math.max(1, Math.min(G.spreadMax, finite(liftSpread, ref.spread)/G.spreadRef));
  const slow = Number.isFinite(speed) && speed < G.slow;
  // soglie personali (esercizi «Pallonetto» e «Palla corta» del riscaldamento): valgono al posto di quelle generali
  const P = personal || {}, lobAt = Number.isFinite(P.lob) ? P.lob : hasHead ? G.lobV : G.lobLift*k, cutAt = Number.isFinite(P.cut) ? P.cut : hasHead ? G.cutV : G.cutLift*k;
  const soft = power < G.dropPower || (Number.isFinite(speed) && speed < (Number.isFinite(P.dropSpeed) ? P.dropSpeed : G.dropSpeed));
  const why = [], out = (shot, w, conf = 1) => ({ shot, why: w, v: +L.toFixed(3), move: +move.toFixed(3), conf: +Math.max(0, Math.min(1, conf)).toFixed(2) });
  // margine rispetto a una soglia: 0 al limite, 1 quando il segnale è il doppio della soglia (confidenza mostrata in
  // diagnostica)
  const margin = (x, at) => (at ? Math.min(1, Math.max(0, x/at - 1)) : 1);
  // con T: la mano sale / scende davvero? (senza T, L è già lo spostamento)
  const rises = !hasHead || move >= G.lobMove, sinks = !hasHead || move <= -G.cutMove;
  // il gesto verticale vale solo senza verso orizzontale: un rovescio un po' dal basso verso l'alto resta un rovescio
  if (vert === 'up' && !dir){ why.push('verticale verso l’alto'); return out('lob', why); }
  if (vert === 'up' && L >= G.lobLiftOpen*k && rises){ why.push('verticale verso l’alto', `mano che sale (${L.toFixed(2)})`); return out('lob', why, margin(L, G.lobLiftOpen*k)); }
  if (vert === 'down' && !dir){ why.push('verticale verso il basso', ballHigh ? 'palla alta' : 'palla bassa'); return out(ballHigh ? 'smash' : 'slice', why); }
  const lobby = L >= lobAt || (L >= G.lobLiftOpen*k && open != null && open >= G.lobOpen);
  // la traiettoria conta più della rotazione: la mano che sale con decisione (la stessa soglia di quando T manca) è un
  // pallonetto anche se il piatto ruota al contrario
  if (!slow && hasHead && move >= G.lobLift*k){ why.push(`la mano sale molto (${move.toFixed(2)})`); return out('lob', why, margin(move, G.lobLift*k)); }
  if (!slow && lobby && rises){ why.push(`mano che sale (${L.toFixed(2)})`, ...(hasHead ? [`spostamento ${move.toFixed(2)}`] : []), ...(open != null ? [`piatto ${open.toFixed(0)}°`] : [])); return out('lob', why, Math.min(margin(L, lobAt), hasHead ? margin(move, G.lobMove) : 1)); }
  // il piatto «sale» ma la mano no: rotazione del polso, colpo normale
  const wristOnly = !slow && lobby && !rises;
  if (ballHigh && L <= G.smashLift*k){ why.push('palla alta', `mano che scende (${L.toFixed(2)})`); return out('smash', why); }
  if (L <= cutAt){
    // palla corta: tagliato morbido. Con T basta il gesto (l'apertura del piatto misurata non è affidabile)
    if (hasHead && soft){ why.push(`taglio (${L.toFixed(2)})`, `morbido (${power.toFixed(2)})`); return out('drop', why); }
    if (open != null && open >= G.dropOpen && power < G.dropPower){ why.push(`taglio (${L.toFixed(2)})`, `piatto aperto ${open.toFixed(0)}°`, `morbido (${power.toFixed(2)})`); return out('drop', why); }
    if (!slow && sinks){ why.push(`taglio (${L.toFixed(2)})`, ...(hasHead ? [`spostamento ${move.toFixed(2)}`] : [])); return out('slice', why, Math.min(margin(L, cutAt), hasHead ? margin(-move, G.cutMove) : 1)); }
    if (!slow){ why.push(`rotazione del polso (${L.toFixed(2)}), la mano non scende (${move.toFixed(2)})`); return out('topspin', why, .5); }
  }
  if (wristOnly){ why.push(`rotazione del polso (${L.toFixed(2)}), la mano non sale (${move.toFixed(2)})`); return out('topspin', why, .5); }
  if (slow){ why.push(`gesto lento (${speed.toFixed(2)})`); return out('topspin', why); }
  if (L >= (hasHead ? G.topV : G.topLift*k)){ why.push(`dal basso verso l’alto (${L.toFixed(2)})`); return out('topspin', why); }
  if (power >= G.flatPower && (open == null || Math.abs(open) < G.flatFace)){ why.push(`veloce (${power.toFixed(2)})`, 'piatto dritto'); return out('flat', why); }
  why.push('colpo normale'); return out('topspin', why);
}
// Soglie personali dai gesti fatti a richiesta negli esercizi del riscaldamento (V di ogni tentativo): a metà strada tra
// il proprio colpo normale (V = 0, ricentrato) e il proprio pallonetto o la propria palla corta. Se il gesto non si
// distingue abbastanza dal colpo normale (|V| < 0,15) resta la soglia generale.
export const SPECIAL = Object.freeze({ min: .15, share: .55, lobMin: .18, lobMax: .5, cutMax: -.15, cutMin: -.4 });
export function learnSpecials(samples = {}){
  const out = {}, lob = (samples.lob || []).filter(Number.isFinite), drop = (samples.drop || []).filter(x => Number.isFinite(x?.v));
  if (lob.length){ const m = median(lob); if (m >= SPECIAL.min) out.lob = +Math.min(SPECIAL.lobMax, Math.max(SPECIAL.lobMin, m*SPECIAL.share)).toFixed(3); }
  if (drop.length){
    const m = median(drop.map(x => x.v)); if (m <= -SPECIAL.min) out.cut = +Math.max(SPECIAL.cutMin, Math.min(SPECIAL.cutMax, m*SPECIAL.share)).toFixed(3);
    const sp = drop.map(x => x.speed).filter(Number.isFinite); if (sp.length) out.dropSpeed = +Math.min(.9, Math.max(.5, median(sp)*1.25)).toFixed(3);
  }
  return out;
}
// Tipo di colpo del motore base per ogni colpo NATPF (la palla corta è un tagliato con natpf.shot = 'drop')
export const ENGINE_SHOT = Object.freeze({ lob: 'lob', smash: 'smash', slice: 'slice', drop: 'slice', topspin: 'topspin', flat: 'flat' });
// Mira (−1 … +1) dal piatto all'impatto; senza il piatto, dalla rotazione del polso del gesto. Piatto misurato ma non
// credibile (faceUnreliable): nessuna mira dal polso, la direzione la decide il tempo del colpo (source 'timing').
export function aimFromSignals({ faceAim = null, faceUnreliable = false, twist = null, aim = null, dir = 0 } = {}){
  if (Number.isFinite(faceAim)) return { aim: Math.max(-1, Math.min(1, faceAim)), source: 'face' };
  if (faceUnreliable) return { aim: 0, source: 'timing' };
  if (Number.isFinite(twist)) return { aim: Math.max(-1, Math.min(1, twist*1.6)), source: 'twist' };
  if (Number.isFinite(aim)) return { aim: Math.max(-1, Math.min(1, aim + dir*.4)), source: 'gesture' };
  return { aim: 0, source: 'none' };
}
