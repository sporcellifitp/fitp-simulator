// B63 · Mascotte 3D con animazioni nuove nella card di fine partita (decisione dell'utente del 17/11/2026: «3D con
// animazioni nuove»: 3 di vittoria e 3 di sconfitta per i modelli 3D di Lob e Drop, con passi avanti, indietro, di lato,
// balletto, testa bassa; anteprima all'utente prima di pubblicare). Documento docs/b63/mascotte-3d.md.
// Come: i ritratti 3D della card (natpf_ritratti.js, B40.6) fotografano il personaggio con le luci dell'arena. Qui, sopra
// le reazioni di sempre del corpo (player_body_animation: «cheer» il salto con la racchetta alzata, «clap» l'applauso,
// «sad» la testa bassa che si ripete uguale), tutto il personaggio si muove: passi di lato, avanti (verso chi guarda) e
// indietro, giravolta, saltelli, con i piedi che si alzano a ogni passo. Il giro dura CARD_LOOP (3 periodi del salto,
// 2,05 s) ed è chiuso: l'ultimo fotogramma si attacca al primo.
// Solo disegno durante la fotografia: il personaggio torna al suo posto subito dopo (natpf_ritratti._release).
// B69 (18/11, l'utente approva le pose del B67: «Le mascotte ok, integra queste e butta dentro altre animazioni simili
// alle esultanze e balletti»): ACCESO DI BASE dove in campo ci sono Lob e Drop (personaggi «Lob & Drop»), nel programma
// Windows e nel gioco web; con i «Classici» niente cambia (GIF del B58 nel programma Windows, ritratti dei tennisti nel
// web). Si spegne con ?mascotte3d=0 o localStorage natpf-tennis.mascotte3d = '0' (ritorno alle GIF o ai ritratti).
// Sei balletti di vittoria e due sconfitte in più (natpf_card_balli.js, docs/b69/balletti-mascotte.md).
import { CHEER_PERIOD } from '../player_body_animation.js';
import { DANCE_MOVES } from './natpf_card_balli.js';

export const CARD_LOOP = 3*CHEER_PERIOD;
export const CARD_MOVES_KEY = 'natpf-tennis.mascotte3d';
export const CARD_MOVES_LAST = 'natpf-tennis.mosse3d';
// fotogrammi del giro (11,7 al secondo); 8 dove la memoria è poca (Android, meno di 4 GB)
export const CARD_K = 24, CARD_K_LOW = 12;

const TAU = 2*Math.PI;
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const ss = (a, b, v) => { const t = clamp01((v - a)/(b - a)); return t*t*(3 - 2*t); };
// passo: un piede si alza mentre il corpo si sposta (lift ≥ 0), l'altro dopo
const steps = (s, h) => ({ footL: h*Math.max(0, Math.sin(s)), footR: h*Math.max(0, -Math.sin(s)) });

// Movimenti: base = reazione del corpo del tennista (i personaggi «Classici», che fanno solo questa); at(u) con u in
// [0, 1) dà lo spostamento di tutto il personaggio nel riferimento di chi guarda (right: verso la destra di chi guarda la
// card, fwd: verso chi guarda, up: in alto, yaw: giro in radianti) e quanto si alza ciascun piede (m); mascot(u, rig) la
// posa delle mascotte 3D (B67, natpf_mascot_rig.poseMascotCard: unità del modello, punti misurati dall'osso Spine, lato
// della racchetta a x < 0); fx l'effetto disegnato intorno nella fotografia (natpf_card_fx.js). Nomi e descrizioni per
// l'anteprima e i documenti.
// B67 (richiesta dell'utente del 18/11: «sistemare come la mascotte impugna la racchetta; pose simpatiche come "Six
// Seven" o aura battle; per la sconfitta la mascotte deve sembrare visibilmente triste»): quattro di vittoria (due
// energiche del B63, «Sei-sette» e «Aura») e tre di sconfitta, tutte con la faccia triste.
const bump = (u, a, b, c) => ss(a, b, u) - ss(b, c, u);
// testa bassa della sconfitta: Lob ha la visiera, che con la testa troppo giù copre la faccia triste a chi guarda
const HEAD_DOWN = rig => (rig?.key === 'lob' ? 0.12 : 0.3);
// e per lo stesso motivo Lob si piega meno in avanti
const LEAN = rig => (rig?.key === 'lob' ? 0.6 : 1);
// camera del ritratto (natpf_ritratti._shoot): di base un filo dall'alto (0,08); le sconfitte un filo dal basso
const CAM_LOW = -0.04;
// racchetta in alto, piatto verso chi guarda (salti e giravolta)
const RACKET_UP = (lift, sway) => ({ at: [-0.31, 0.16 + lift, 0.07], dir: [-0.4, 1, 0.1 + sway], palm: [0.1, 0, 1] });
export const CARD_MOVES = Object.freeze({
  win: Object.freeze([
    Object.freeze({ id: 'win-salti', name: 'Salti di gioia e passi di lato', base: 'cheer',
      at: u => { const s = TAU*u; return { right: 0.24*Math.sin(s), fwd: 0, up: 0.05*Math.abs(Math.sin(3*s)), yaw: 0.18*Math.sin(s), ...steps(2*s, 0.07) }; },
      mascot: u => { const s = TAU*u, b = Math.abs(Math.sin(3*s)), w = Math.sin(3*s);
        return { hips: { pitch: -0.05, roll: 0.05*Math.sin(s) }, spine: { pitch: -0.08 }, head: { pitch: -0.16, roll: 0.08*w },
          racket: RACKET_UP(0.04*b, 0.15*w), free: { at: [0.3, 0.14 + 0.06*b, 0.08], palm: [0, 0.2, 1], fingers: [0.25 + 0.2*w, 1, 0] } }; } }),
    Object.freeze({ id: 'win-giro', name: 'Giravolta', base: 'cheer',
      at: u => { const t = ss(0.15, 0.7, u); return { right: 0, fwd: 0.06*Math.sin(TAU*u), up: 0.12*Math.sin(Math.PI*t), yaw: TAU*t, footL: 0.05*Math.sin(Math.PI*t), footR: 0.05*Math.sin(Math.PI*t) }; },
      mascot: u => { const up = Math.sin(Math.PI*ss(0.15, 0.7, u));
        return { hips: { pitch: -0.04 }, spine: { pitch: -0.06 }, head: { pitch: -0.12 }, racket: RACKET_UP(0.03*up, 0),
          free: { at: [0.33, 0.02 + 0.1*up, 0.05], palm: [0, -0.3, 1], fingers: [1, 0.3, 0] } }; } }),
    // «Sei-sette»: le due mani aperte, palmi in su, che salgono e scendono alternate davanti alla pancia come i piatti di
    // una bilancia (tre volte per giro), la testa che ondeggia a tempo; la racchetta appoggiata alla gamba, la testa a terra
    Object.freeze({ id: 'win-sei', name: 'Sei-sette', base: 'cheer',
      at: u => { const s = TAU*u; return { right: 0.03*Math.sin(s), fwd: 0, up: 0.015*Math.abs(Math.sin(3*s)), yaw: 0.1*Math.sin(s), footL: 0, footR: 0 }; },
      mascot: (u, rig) => { const s = TAU*u, w = Math.sin(3*s), hy = rig?.hips?.wp?.y ?? 0.37, k = rig?.racketReach ?? 0.5, dy = 0.94;
        return { spine: { pitch: 0.04, roll: 0.06*w }, head: { pitch: -0.04, roll: 0.16*w, yaw: 0.12*Math.sin(s) },
          racket: { at: [-0.21, -0.1 + 0.08*w, 0.19], palm: [-0.15, 1, 0], fingers: [-0.3, 0, 1] },
          free: { at: [0.21, -0.1 - 0.08*w, 0.19], palm: [0.15, 1, 0], fingers: [0.3, 0, 1] },
          rest: { at: [-0.23, k*dy + 0.012 - hy, -0.02], dir: [-0.35, -1, 0.05], face: [0.15, 0, 1] } }; } }),
    // «Aura»: petto in fuori e mento alto, la racchetta piantata a terra come una spada con la mano sopra il manico e
    // l'altra mano sul fianco, un giro lento e deciso verso chi guarda; intorno un alone con le fiammelle (natpf_card_fx.js)
    Object.freeze({ id: 'win-aura', name: 'Aura', base: 'cheer', fx: 'aura',
      at: u => { const s = TAU*u; return { right: 0, fwd: 0.04*(1 - Math.cos(s))/2, up: 0, yaw: -0.2*Math.sin(s), footL: 0, footR: 0 }; },
      mascot: (u, rig) => { const s = TAU*u, nod = (1 - Math.cos(2*s))/2, sy = rig?.spine?.wp?.y ?? 0.5, k = rig?.racketReach ?? 0.5;
        return { hips: { pitch: -0.06 }, spine: { pitch: -0.12 }, head: { pitch: -0.2 - 0.07*nod, yaw: 0.16*Math.sin(s) },
          racket: { frame: 'level', at: [-0.27, k + 0.02 - sy, 0.13], dir: [-0.12, -1, 0.06], palm: [0.4, 0, 1] },
          free: { at: [0.22, -0.26, 0.04], palm: [-1, 0, 0.2], fingers: [0.1, -1, 0.25], pole: [1, 0.1, -0.4] } }; } }),
    // B69: i balletti (robot, disco con il dab, corsa all'indietro, passi incrociati, braccia a pendolo, su il soffitto)
    ...DANCE_MOVES.win,
  ]),
  lose: Object.freeze([
    // tutte con la faccia triste (natpf_mascot_face.js), la testa bassa e le spalle che cadono
    Object.freeze({ id: 'lose-trascina', camUp: CAM_LOW, name: 'Testa bassa, racchetta trascinata', base: 'sad',
      at: u => { const s = TAU*u; return { right: 0.14*Math.sin(s), fwd: -0.03, up: 0, yaw: -0.18*Math.sin(s), pitch: 0.04, ...steps(2*s, 0.04) }; },
      mascot: (u, rig) => { const s = TAU*u, hp = HEAD_DOWN(rig), l = LEAN(rig);
        return { hips: { pitch: 0.08*l, y: -0.015 }, spine: { pitch: 0.24*l, roll: 0.05*Math.sin(2*s) }, head: { pitch: hp, roll: 0.14*Math.sin(s) },
          racket: { frame: 'level', at: [-0.2, -0.28, -0.04], dir: [-0.8, 0, -0.45], ground: true, drop: 0.3 },
          free: { frame: 'level', at: [0.18, -0.29, 0.03], palm: [-1, 0, 0], fingers: [0.1, -1, 0.1], drop: 0.3 }, face: 'sad' }; } }),
    // un grande sospiro: si gonfia (spalle su, testa su) e si affloscia, poi resta giù; sopra la testa una nuvoletta
    Object.freeze({ id: 'lose-sospiro', camUp: CAM_LOW, name: 'Sospiro, con la nuvoletta', base: 'sad', fx: 'nuvola',
      at: u => { const r = bump(u, 0.05, 0.3, 0.52); return { right: 0, fwd: 0, up: 0.02*r, yaw: 0.08*Math.sin(TAU*u), footL: 0, footR: 0 }; },
      mascot: (u, rig) => { const r = bump(u, 0.05, 0.3, 0.52), hp = HEAD_DOWN(rig), l = LEAN(rig);
        return { hips: { pitch: (0.1 - 0.12*r)*l, y: -0.02 + 0.02*r }, spine: { pitch: (0.26 - 0.32*r)*l }, head: { pitch: hp - (hp + 0.12)*r, roll: 0.1*(1 - r) },
          racket: { frame: 'level', at: [-0.2, -0.28 + 0.04*r, 0.06], dir: [-0.5, 0, 0.85], ground: true, drop: 0.38 - 0.5*r },
          free: { frame: 'level', at: [0.19, -0.29 + 0.04*r, 0.04], palm: [-1, 0, 0], fingers: [0, -1, 0.1], drop: 0.38 - 0.5*r }, face: 'sad' }; } }),
    // si asciuga una lacrima con la mano libera (tre volte per giro), a singhiozzi; la racchetta a terra
    Object.freeze({ id: 'lose-lacrima', camUp: CAM_LOW, name: 'Si asciuga una lacrima', base: 'sad',
      at: u => { const s = TAU*u; return { right: 0.03*Math.sin(s), fwd: 0, up: 0.012*Math.abs(Math.sin(3*s)), yaw: 0.12*Math.sin(s), footL: 0, footR: 0 }; },
      mascot: (u, rig) => { const s = TAU*u, w = Math.sin(3*s), sob = Math.abs(Math.sin(3*s)), hp = HEAD_DOWN(rig), l = LEAN(rig);
        return { hips: { pitch: 0.08*l }, spine: { pitch: (0.16 + 0.03*sob)*l, roll: -0.05 }, head: { pitch: 0.7*hp, roll: -0.14 },
          racket: { frame: 'level', at: [-0.2, -0.29, 0.03], dir: [-0.45, 0, 0.9], ground: true, drop: 0.25 },
          free: { frame: 'head', at: [0.17 + 0.025*w, 0.05 + 0.015*w, 0.25], palm: [-0.3, 0, -1], fingers: [-0.45, 1, 0], drop: 0.05*sob }, face: 'sad' }; } }),
    // B69: calcia un sassolino, capriccio
    ...DANCE_MOVES.lose,
  ]),
});
export const cardMove = id => [...CARD_MOVES.win, ...CARD_MOVES.lose].find(m => m.id === id) || null;

// B69: acceso di base; ?mascotte3d=0 o la chiave a '0' lo spengono (?mascotte3d=1 lo riaccende)
export function cardMovesOn({ search = globalThis.location?.search || '', storage = globalThis.localStorage } = {}){
  try { const v = new URLSearchParams(search).get('mascotte3d'); if (v === '1' || v === '0') return v === '1'; } catch {}
  try { return storage?.getItem(CARD_MOVES_KEY) !== '0'; } catch { return true; }
}
// B69: personaggi della card che fanno i movimenti delle mascotte 3D: Lob e Drop in campo (look della card,
// natpf_end_card.cardModel), con l'interruttore acceso e i ritratti 3D (non ?ritratti=svg). I «Classici» restano come
// prima: GIF del B58 dove ci sono (programma Windows), altrimenti il ritratto del tennista
export const MASCOT_LOOKS = Object.freeze(['drop', 'lob']);
export function cardUses3d(card, { on = cardMovesOn(), search = globalThis.location?.search || '' } = {}){
  let svg = false; try { svg = new URLSearchParams(String(search || '')).get('ritratti') === 'svg'; } catch {}
  return !!on && !svg && MASCOT_LOOKS.includes(card?.look);
}
// tutte le card della partita (i movimenti hanno un giro solo per la cattura: o tutte o nessuna)
export const cardsUse3d = (model, opts) => !!model?.cards?.length && model.cards.every(c => cardUses3d(c, opts));

// Scelta dei movimenti delle card di una partita (esiti nell'ordine delle card): ciascuno a caso tra quelli del suo
// esito, mai uno della partita prima per lo stesso esito (B69: né uno già scelto in questa partita: nello stesso schermo
// due card con lo stesso esito ballano diverso). Si ricordano quelli mostrati per esito (uno solo: come prima, un testo)
export function pickCardMoves(outcomes, { storage = globalThis.localStorage, rnd = Math.random } = {}){
  let last = {}; try { last = JSON.parse(storage?.getItem(CARD_MOVES_LAST) || '{}') || {}; } catch {}
  if (!last || typeof last !== 'object' || Array.isArray(last)) last = {};
  const out = [], now = {};
  for (const o of outcomes){
    const key = o === 'win' ? 'win' : 'lose', list = CARD_MOVES[key];
    const before = [].concat(last[key] ?? []).filter(id => typeof id === 'string'), used = now[key] || [];
    const fresh = list.filter(m => !used.includes(m.id)), pool = fresh.filter(m => !before.includes(m.id));
    const from = pool.length ? pool : fresh.length ? fresh : list;
    const r = Number(rnd()), m = from[Math.min(from.length - 1, Math.max(0, Math.floor((Number.isFinite(r) ? r : 0)*from.length)))];
    (now[key] ||= []).push(m.id); out.push(m);
  }
  const save = { ...last }; for (const [k, ids] of Object.entries(now)) save[k] = ids.length === 1 ? ids[0] : ids;
  try { storage?.setItem(CARD_MOVES_LAST, JSON.stringify(save)); } catch {}
  return out;
}
export const pickCardMove = (outcome, opts) => pickCardMoves([outcome], opts)[0];

// Mette il personaggio nella posa del movimento al tempo t (s dall'inizio del giro). base: { pos, rotY } salvati alla presa;
// dir: verso di chi guarda lungo z (+1 / −1, come la camera del ritratto); rig: i perni dei piedi (player_body_animation)
export function applyCardMove(actor, move, t, base, dir = 1){
  if (!actor?.root || !move || !base) return null;
  const u = ((t % CARD_LOOP) + CARD_LOOP) % CARD_LOOP/CARD_LOOP, o = move.at(u);
  // B67: posa della mascotte 3D (la legge natpf_character.updateNatpfCharacters; natpf_ritratti la toglie al rilascio)
  // (B69: con il posto di partenza, per la racchetta piantata a terra che resta ferma mentre il personaggio balla)
  actor.natpfCardPose = move.mascot ? { move, u, base } : null;
  // destra di chi guarda: con la camera verso +z (dir = −1) è −x, verso −z è +x
  actor.root.position.set(base.pos.x + dir*o.right, base.pos.y + o.up, base.pos.z + dir*o.fwd);
  // (B69: il giro verso il lato libero anche per il mancino, che ha la radice specchiata: specchio·giro(θ) = giro(−θ)·specchio)
  actor.root.rotation.y = base.rotY + (actor.root.scale.x < 0 ? -1 : 1)*o.yaw;
  // inclinazione in avanti (verso chi guarda) e di lato, negli assi del campo (Euler XYZ: X e Z esterni a Y)
  actor.root.rotation.x = (base.rotX || 0) + dir*(o.pitch || 0);
  actor.root.rotation.z = (base.rotZ || 0) + (o.roll || 0);
  const rig = actor.rig;
  if (rig?.footLPivot && rig?.basePivots){
    rig.footLPivot.position.y = rig.basePivots.footL.y + (o.footL || 0);
    rig.footRPivot.position.y = rig.basePivots.footR.y + (o.footR || 0);
  }
  actor.root.updateMatrixWorld?.(true);
  return o;
}
