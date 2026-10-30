// Minigiochi arcade (28/10/2026): regole, punteggi, medaglie, record personali e progressione. Funzioni pure, senza
// DOM e senza three.js: le usa natpf_events.js (in campo) e la lobby (pagina dei minigiochi, risultati); i test le
// verificano da sole. Ogni minigioco ha una meccanica sua:
//   Target Rush       60" per abbattere bersagli 3D (anche mobili e d'oro); punti per la precisione dell'impatto, combo
//   Precision         10 palle, 10 zone del campo sempre più piccole; punti per la distanza dal centro della zona
//   Combo Challenge   90" di catene di colpi diversi da fare in ordine; catena più lunga a ogni catena completata
//   Survival          3 vite contro un lanciapalle che sale di livello ogni 5 palle; conta le palle rimandate
//   Radar             3 servizi, vale il più veloce dentro il campo
// «Sfida il campione» (contro la CPU esperta, primo a 3) tolto il 29/10 su richiesta dell'utente.
export const MODES = Object.freeze([
  { id: 'rush', label: 'Target Rush', unit: 'punti', icon: 'target', time: 60, short: 'Un minuto per abbattere più bersagli possibile.', facts: ['Bersagli 3D, anche mobili', 'Centro 50 · anello 30 · bordo 10', 'Combo fino a ×4 · bersaglio d’oro +5"'], medals: [250, 600, 1100] },
  { id: 'precision', label: 'Precision', unit: 'punti', icon: 'zone', balls: 10, short: 'Dieci palle, dieci zone del campo: più vicino al centro, più punti.', facts: ['10 palle', 'Zone sempre più piccole', 'Fino a 100 punti a palla'], medals: [250, 480, 700] },
  { id: 'combo', label: 'Combo Challenge', unit: 'punti', icon: 'chain', time: 90, short: 'Esegui in ordine le sequenze di colpi richieste.', facts: ['90 secondi', 'Catene sempre più lunghe', 'Colpo sbagliato: catena da capo'], medals: [150, 400, 800] },
  { id: 'survival', label: 'Survival', unit: 'palle', icon: 'heart', short: 'Tre vite contro un lanciapalle sempre più cattivo.', facts: ['3 vite', 'Livello su ogni 5 palle', 'Più veloce, tagli, pallonetti, angoli'], medals: [8, 20, 35] },
  { id: 'radar', label: 'Radar del servizio', unit: 'km/h', icon: 'radar', time: 30, short: 'Tre servizi: vale il più veloce dentro il campo.', facts: ['3 servizi', 'Vale il più veloce dentro', '30 secondi'], medals: [110, 140, 165] },
]);
export const modeById = id => MODES.find(m => m.id === id) || null;
// Minigiochi nascosti (30/10/2026, richiesta dell'utente: «togli Radar del servizio e Survival, nascondili, non
// eliminarli»). Interruttore unico: un id in questo elenco non compare come scelta (pagina «Minigiochi», classifica del
// menu e del chiosco), ma regole, motore (natpf_events.start) e test restano. Per rimetterlo basta toglierlo da qui.
export const HIDDEN_MODES = Object.freeze(['radar', 'survival']);
export const isHiddenMode = id => HIDDEN_MODES.includes(id);
// i minigiochi che si possono scegliere, nell'ordine di MODES
export const VISIBLE_MODES = Object.freeze(MODES.filter(m => !isHiddenMode(m.id)));

/* ---------- medaglie, record personali, progressione ---------- */
export const MEDALS = Object.freeze(['bronze', 'silver', 'gold']);
export const MEDAL_LABEL = Object.freeze({ bronze: 'Bronzo', silver: 'Argento', gold: 'Oro' });
export function medalFor(id, score){
  const m = modeById(id); if (!m || !Number.isFinite(score)) return null;
  let out = null; m.medals.forEach((t, i) => { if (score >= t) out = MEDALS[i]; });
  return out;
}
// prossima medaglia da prendere: { medal, need } (null se l'oro c'è già)
export function nextMedal(id, score = 0){
  const m = modeById(id); if (!m) return null;
  const i = m.medals.findIndex(t => score < t);
  return i < 0 ? null : { medal: MEDALS[i], need: m.medals[i] };
}
export const RECORDS_KEY = 'natpf-tennis.records';
const rank = medal => (medal ? MEDALS.indexOf(medal) + 1 : 0);
// aggiorna i record personali con una partita: { records, isRecord, prevBest, medal, newMedal, xp }
export function recordGame(records, id, score){
  const r = { ...(records || {}) }, prev = r[id] || { best: null, medal: null, plays: 0 };
  const medal = medalFor(id, score), isRecord = prev.best == null || score > prev.best;
  const bestMedal = rank(medal) > rank(prev.medal) ? medal : prev.medal;
  r[id] = { best: isRecord ? score : prev.best, medal: bestMedal, plays: prev.plays + 1 };
  const xp = 20 + rank(medal)*100 + (isRecord && prev.best != null ? 50 : 0);
  r.xp = (r.xp || 0) + xp;
  return { records: r, isRecord, prevBest: prev.best, medal, newMedal: rank(medal) > rank(prev.medal), xp };
}
// livello del giocatore dai punti esperienza: 500 per livello
export const XP_PER_LEVEL = 500;
export function levelOf(xp = 0){
  const level = 1 + Math.floor(Math.max(0, xp)/XP_PER_LEVEL);
  return { level, into: Math.max(0, xp) % XP_PER_LEVEL, next: XP_PER_LEVEL };
}
export function medalCount(records = {}){
  const c = { gold: 0, silver: 0, bronze: 0 };
  for (const m of MODES){ const md = records[m.id]?.medal; if (md) c[md]++; }
  return c;
}

/* ---------- Target Rush ---------- */
// zona colpita sul bersaglio: centro (entro il 30% del raggio) 50, anello (65%) 30, bordo 10, fuori 0
export function zoneScore(dist, radius){
  if (!(radius > 0) || !Number.isFinite(dist) || dist > radius) return { points: 0, zone: null };
  const k = dist/radius;
  return k <= .3 ? { points: 50, zone: 'centro' } : k <= .65 ? { points: 30, zone: 'anello' } : { points: 10, zone: 'bordo' };
}
// moltiplicatore della combo: ×1, ×2 dopo 3 bersagli di fila, ×3 dopo 6, ×4 dopo 9
export const comboMultiplier = streak => Math.min(4, 1 + Math.floor(Math.max(0, streak)/3));
// livello di difficoltà 0…1: sale con il tempo passato e con i punti fatti
export const rushLevel = (elapsed, score) => Math.min(1, elapsed/60*.55 + score/2000);
// Disposizione dei bersagli: corsie e profondità nel campo avversario (P1 tira verso z < 0). Più livello: bersagli più
// piccoli, più lontani dal centro e in movimento. rand: generatore (per i test).
export function rushTarget(level = 0, rand = Math.random, taken = []){
  const lanes = [-3.1, -1.4, 1.4, 3.1], depths = [-5.2, -7.4, -9.6];
  let best = null;
  for (let i = 0; i < 8; i++){
    const x = lanes[Math.floor(rand()*lanes.length) % lanes.length] + (rand() - .5)*.6, z = depths[Math.floor(rand()*depths.length) % depths.length] + (rand() - .5)*.8;
    const far = taken.every(t => Math.hypot(t.x - x, t.z - z) > 2.2);
    best = { x, z };
    if (far) break;
  }
  const r = +(0.85 - 0.3*level).toFixed(3);
  const moving = level > .25 && rand() < .25 + level*.5;
  const gold = rand() < .1 + level*.08;
  return { x: +best.x.toFixed(2), z: +best.z.toFixed(2), y: 1.0, r, gold, move: moving ? { amp: +(0.8 + level).toFixed(2), speed: +(1.2 + level*1.4).toFixed(2), phase: +(rand()*6.28).toFixed(2) } : null };
}

/* ---------- Precision ---------- */
// dieci zone: si parte larghe e in fondo al centro, poi angoli, poi palle corte, sempre più piccole
export const PRECISION_ZONES = Object.freeze([
  { x: 0, z: -9.2, r: 1.8, label: 'In fondo, al centro' },
  { x: -2.8, z: -9.4, r: 1.6, label: 'Angolo sinistro' },
  { x: 2.8, z: -9.4, r: 1.6, label: 'Angolo destro' },
  { x: 0, z: -6.2, r: 1.5, label: 'Metà campo' },
  { x: -2.9, z: -6, r: 1.3, label: 'Sinistra, a metà' },
  { x: 2.9, z: -6, r: 1.3, label: 'Destra, a metà' },
  { x: 0, z: -3, r: 1.3, label: 'Palla corta al centro' },
  { x: -3, z: -10.2, r: 1.1, label: 'Riga di fondo, sinistra' },
  { x: 3, z: -10.2, r: 1.1, label: 'Riga di fondo, destra' },
  { x: 2.6, z: -3.2, r: 1, label: 'Palla corta, destra' },
]);
// punti per la distanza dal centro della zona: 100 al centro, 50 sul bordo, 0 al doppio del raggio; fuori dal campo 0
export function precisionPoints(landing, zone, inCourt = true){
  if (!landing || !zone || !inCourt) return 0;
  const d = Math.hypot(landing.x - zone.x, landing.z - zone.z);
  return Math.max(0, Math.round(100*(1 - d/(2*zone.r))));
}

/* ---------- Combo Challenge ---------- */
export const COMBO_STEPS = Object.freeze({
  forehand: { label: 'Dritto', feed: 'forehand' },
  backhand: { label: 'Rovescio', feed: 'backhand' },
  cross: { label: 'Incrociato', feed: 'forehand' },
  line: { label: 'Lungolinea', feed: 'forehand' },
  lob: { label: 'Pallonetto', feed: 'forehand', phone: true },
  slice: { label: 'Tagliato', feed: 'backhand', phone: true },
  drop: { label: 'Palla corta', feed: 'forehand', phone: true },
});
// catena di colpi: lunghezza 2, 3, 4… senza due passi uguali di fila; i colpi speciali solo con lo smartphone
export function comboChain(length = 2, { phone = true, rand = Math.random } = {}){
  const pool = Object.keys(COMBO_STEPS).filter(k => phone || !COMBO_STEPS[k].phone), out = [];
  while (out.length < length){
    const k = pool[Math.floor(rand()*pool.length) % pool.length];
    if (k !== out[out.length - 1]) out.push(k);
  }
  return out;
}
// il colpo fatto vale per il passo? side 'forehand'/'backhand', shot del motore ('topspin','lob','slice','drop'…),
// direction 'cross'/'line'/null, inCourt
export function comboStepOk(step, { side = null, shot = null, direction = null, inCourt = true } = {}){
  if (!inCourt) return false;
  if (step === 'forehand' || step === 'backhand') return side === step && !['lob', 'drop'].includes(shot);
  if (step === 'cross' || step === 'line') return direction === step;
  if (step === 'slice') return shot === 'slice';
  if (step === 'drop') return shot === 'drop';
  if (step === 'lob') return shot === 'lob';
  return false;
}
// punti di un passo riuscito (10 × lunghezza della catena) e bonus alla catena completata (50 × lunghezza)
export const comboStepPoints = len => 10*len;
export const comboChainBonus = len => 50*len;

/* ---------- Survival ---------- */
export const SURVIVAL = Object.freeze({ lives: 3, perLevel: 5, maxLevel: 8 });
export const survivalLevel = returned => Math.min(SURVIVAL.maxLevel, Math.floor(Math.max(0, returned)/SURVIVAL.perLevel));
