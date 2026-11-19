// Doppio contro la CPU: il compagno copre le volée raggiungibili dalla sua posizione d'attesa.
import { predictBall } from './natpf_impact.js';
import { cpuErrorChance, cpuErrorKind } from './natpf_skill.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const finite = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

export const PARTNER_KEY = 'natpf-tennis.compagno';
export const PARTNER_MODES = Object.freeze(['solo', 'gesto']);
export const PARTNER = Object.freeze({
  home: Object.freeze({ x: 1.4, z: 5.1 }),            // posizione d'attesa: dal suo lato (segno come game_engine.js:2340), 5,1 m dalla rete
  own: Object.freeze({ reach: .5, yMin: .6, yMax: 1.7, zMin: 2.2, zBack: .8 }),   // palla sua: passa entro reach m dalla posizione d'attesa, ad altezza da volée
  side: .55,                                          // m di lato dal punto della volée (la racchetta arriva sulla palla)
  // colpo: volée tagliata verso il lato libero (come il compagno della CPU, game_engine.js:2761, specchiato)
  shot: Object.freeze({ zMin: 5.8, zSpan: 2.6, xMin: .85, xSpan: 1.15, flight: Object.freeze({ easy: .96, hard: .82 }), topspin: -5 }),
  // errori: il modello della CPU (natpf_skill.cpuErrorChance) con un livello del compagno
  err: Object.freeze({ base: .03, stretch: .2, run: .06, speed: .05, angle: 0, pressure: 0, soft: .7, net: .35, drop: 0, lob: 0, smash: 0, sup: .1, max: .3 }),
  reach: 1.2,                                         // m: portata del compagno per l'allungo
  quality: .75, power: .5,                            // come la CPU legge il colpo del compagno (registerPlayerShot)
});
export const PARTNER_DEFAULT = 'solo';
export const PARTNER_LABEL = { solo: 'Gioca da solo', gesto: 'Con il tuo gesto' };
// (B72: prima «Nel doppio contro la CPU»)
export const PARTNER_TITLE = 'Nel doppio contro due avversari, l’anello azzurro indica la palla del compagno. La scelta vale dalla prossima partita.';
export const partnerModeOf = mode => mode === 'gesto' ? 'gesto' : PARTNER_DEFAULT;
export const nextPartnerMode = mode => partnerModeOf(mode) === 'solo' ? 'gesto' : 'solo';
export function partnerModeFromUrl(search = globalThis.location?.search ?? ''){
  const mode = new URLSearchParams(search).get('compagno');
  if (mode === 'gesto') return 'gesto';
  return mode === 'solo' || mode === 'da-solo' ? 'solo' : null;
}
export function readPartnerMode({ search, storage } = {}){
  const forced = partnerModeFromUrl(search);
  if (forced) return forced;
  try { return partnerModeOf((storage ?? globalThis.localStorage)?.getItem(PARTNER_KEY)); } catch { return PARTNER_DEFAULT; }
}
export function writePartnerMode(mode, storage){
  const value = partnerModeOf(mode);
  try { (storage ?? globalThis.localStorage)?.setItem(PARTNER_KEY, value); } catch {}
  return value;
}
export const partnerButton = (mode, forced = false) => PARTNER_LABEL[partnerModeOf(mode)] + (forced ? ' (indirizzo)' : '');
export const partnerLine = mode => mode === 'gesto' ? 'Anello azzurro sotto il compagno: fai tu il gesto.' : 'Anello azzurro: il compagno colpisce da solo.';
export const partnerFirstHint = partnerLine;
export const newDoubles = engine => !!engine?.isDoubles && !engine.isMultiplayer && !engine.natpfSplit?.active;
// Il colpo di chi gioca (o del compagno con il suo gesto) conta nei numeri della partita e nei trofei del B40? Nel doppio
// contro la CPU il colpo del compagno no, nemmeno con «Con il tuo gesto» (docs/b40/fine-partita-v2.md §6); negli altri
// doppi (sfida tra due computer, stesso schermo) come prima. Funzione a sé dalla ripresa del 15/11, per poterla provare
// (game_engine, colpo del Player 1)
export const hitCountsForStats = (engine, partnerHit) => !partnerHit || !newDoubles(engine);
export const partnerMode = engine => engine?.natpfPartner ?? readPartnerMode();
export const partnerAuto = engine => newDoubles(engine) && partnerMode(engine) === 'solo' && !engine.autoPlayMode;
export const partnerHome = engine => ({ x: (engine?.score?.deuceSide ? -1 : 1)*PARTNER.home.x, z: PARTNER.home.z });
export const exchangeStrokes = engine => newDoubles(engine)
  ? 2 * (engine.natpfOwnStrokes || 0) + (engine.score?.server === 'player' ? 2 : 1)
  : engine.ball.rallyStrokeCount;

// La palla appena colpita dalla CPU è del compagno? Dalla traiettoria prevista (stessa fisica del motore): il primo punto
// prima del rimbalzo, nella metà di chi gioca, ad altezza da volée, entro reach m dalla posizione d'attesa. Mai la
// risposta al servizio. → { stroke, at, t, contact: { x, y, z } } o null
export function partnerBallPlan(engine){
  const b = engine?.ball; if (!b?.inPlay || b.lastHitter !== 'opponent' || finite(b.rallyStrokeCount) <= 1) return null;
  const O = PARTNER.own, H = partnerHome(engine);
  const path = predictBall(b);
  const s = path.find(p => p.bounces === 0 && p.z >= O.zMin && p.z <= H.z + O.zBack && p.y >= O.yMin && p.y <= O.yMax && Math.hypot(p.x - H.x, p.z - H.z) <= O.reach);
  return s ? { stroke: b.rallyStrokeCount, at: finite(engine.elapsedTime), t: +s.t.toFixed(3), contact: { x: +s.x.toFixed(3), y: +s.y.toFixed(3), z: +s.z.toFixed(3) } } : null;
}
export const partnerBallNow = engine => { const P = engine?.natpfPartnerBall; return newDoubles(engine) && P && engine.ball?.lastHitter === 'opponent' && P.stroke === engine.ball.rallyStrokeCount ? P : null; };

// Colpo del compagno: errore (modello della CPU) o volée verso il lato libero. → { kind, x, z, flight, topspin, net }
export function partnerShot({ difficulty = 'casual', stretch = 0, speed = 20, running = 0, oppX = 0, rng = Math.random } = {}){
  const K = PARTNER.err, S = PARTNER.shot, hard = ['pro', 'leggenda'].includes(String(difficulty));
  const level = { cpuErr: K };
  const chance = cpuErrorChance({ stretch, running, speed, angle: 0, quality: 1, threat: 1, shot: 'TOPSPIN', cpuDeep: false, level });
  const flight = hard ? S.flight.hard : S.flight.easy, open = finite(oppX) >= 0 ? -1 : 1;
  if (rng() < chance){
    const kind = cpuErrorKind({ stretch, running, speed, shot: 'SLICE', depth: -7, level, rng });
    if (kind === 'net') return { kind, x: open*(S.xMin + rng()*S.xSpan), z: -(3.2 + rng()*2.4), flight: .78, topspin: S.topspin, net: true, chance };
    if (kind === 'wide') return { kind, x: open*(4.115 + .6 + rng()*.7), z: -(8.4 + rng()*2.6), flight: .92, topspin: S.topspin, net: false, chance };
    return { kind, x: open*(S.xMin + rng()*S.xSpan), z: -(11.89 + .55 + rng()*1.1), flight: 1.02, topspin: S.topspin, net: false, chance };
  }
  return { kind: 'ok', x: clamp(open*(S.xMin + rng()*S.xSpan), -4.115 + .65, 4.115 - .65), z: -(S.zMin + rng()*S.zSpan), flight, topspin: S.topspin, net: false, chance };
}
