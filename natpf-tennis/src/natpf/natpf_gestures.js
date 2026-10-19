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

export function classifyPhoneShot({ dir = 0, vert = null, lift = 0, liftBaseline = 0, liftSpread = null, facePitch = null, power = .6, speed = null, ballHigh = false } = {}){
  const ref = resolveLiftBaseline(liftBaseline, dir), G = GESTURE;
  const L = finite(lift) - ref.base, open = Number.isFinite(facePitch) ? facePitch : null;
  const k = Math.max(1, Math.min(G.spreadMax, finite(liftSpread, ref.spread)/G.spreadRef));
  const slow = Number.isFinite(speed) && speed < G.slow;
  const why = [];
  // il gesto verticale vale solo senza verso orizzontale: un rovescio un po' dal basso verso l'alto resta un rovescio
  if (vert === 'up' && !dir){ why.push('verticale verso l’alto'); return { shot: 'lob', why }; }
  if (vert === 'up' && L >= G.lobLiftOpen*k){ why.push('verticale verso l’alto', `mano che sale (${L.toFixed(2)})`); return { shot: 'lob', why }; }
  if (vert === 'down' && !dir){ why.push('verticale verso il basso', ballHigh ? 'palla alta' : 'palla bassa'); return { shot: ballHigh ? 'smash' : 'slice', why }; }
  if (!slow && (L >= G.lobLift*k || (L >= G.lobLiftOpen*k && open != null && open >= G.lobOpen))){ why.push(`mano che sale (${L.toFixed(2)})`, ...(open != null ? [`piatto ${open.toFixed(0)}°`] : [])); return { shot: 'lob', why }; }
  if (ballHigh && L <= G.smashLift*k){ why.push('palla alta', `mano che scende (${L.toFixed(2)})`); return { shot: 'smash', why }; }
  if (L <= G.cutLift*k){
    if (open != null && open >= G.dropOpen && power < G.dropPower){ why.push(`taglio (${L.toFixed(2)})`, `piatto aperto ${open.toFixed(0)}°`, `morbido (${power.toFixed(2)})`); return { shot: 'drop', why }; }
    if (!slow){ why.push(`taglio (${L.toFixed(2)})`); return { shot: 'slice', why }; }
  }
  if (slow){ why.push(`gesto lento (${speed.toFixed(2)})`); return { shot: 'topspin', why }; }
  if (L >= G.topLift*k){ why.push(`dal basso verso l’alto (${L.toFixed(2)})`); return { shot: 'topspin', why }; }
  if (power >= G.flatPower && (open == null || Math.abs(open) < G.flatFace)){ why.push(`veloce (${power.toFixed(2)})`, 'piatto dritto'); return { shot: 'flat', why }; }
  why.push('colpo normale'); return { shot: 'topspin', why };
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
