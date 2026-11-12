// B18.2 · tappa 2, gruppo 3 · Segnale del momento giusto (miglioramento 3 del rapporto B16, appendice M3).
// Il voto più frequente è «Anticipo»: chi gioca non sa QUANDO colpire. Il segnale è un anello attorno alla palla che
// arriva: parte largo e bianco, si stringe mentre la palla si avvicina e si chiude sulla palla nell'istante giusto,
// diventando verde e pieno. Chi gioca colpisce quando l'anello si chiude.
// Solo disegno: non legge i gesti e non cambia l'esito dei colpi, il voto, la fisica o i sorteggi (niente Math.random).
// L'istante è lo stesso che usa il gioco per giudicare il colpo: il tempo che manca al punto d'impatto
// (natpf_impact.timeToContact). Il verde dura quanto la finestra del voto «Perfetto» del colpo vero (quello della scritta:
// natpf_stroke_outcome.strokeOutcome → grade), che NON è simmetrica (cueEdges): prima del punto d'impatto
// SWING_AIM.centre × finestra della direzione del livello (più larga sulle palle lente, slowFactor); dopo il punto
// d'impatto SWING_AIM.centre × il ritardo che vale il lungolinea pieno (lateSpanOf: 1,4 m / velocità della palla, più il
// margine del livello), molto più corto con le palle normali. Revisione del 12/11: prima il verde era simmetrico
// (± 0,35 × timingSpan) e restava acceso 20–55 ms dopo la fine del «Perfetto»: un gesto su cinque fatto con l'anello
// verde riceveva «Ritardo».
// Quando è acceso (cueOn):
//   • di base: acceso con «Bambino» e «Adulto» (livelli Bambini ed Evento), spento con gli altri livelli;
//   • Opzioni → «Segnale del momento giusto: Di base · Sì · No»: «Sì» lo accende a tutti i livelli contro la CPU, «No»
//     lo spegne a tutti (anche a Bambini ed Evento). Resta salvato (localStorage, chiave natpf-tennis.segnaleTempo);
//   • mai nello stesso schermo e nella sfida tra due computer (lì non cambia niente), nella demo dietro il menu e nella
//     moviola.
import * as THREE from 'three';
import { SWING_AIM, skillLevel } from './natpf_skill.js';
import { timeToContact, lateMargin, openTight } from './natpf_impact.js';
import { directionSpan, slowFactor, lateSpanOf } from './natpf_stroke_outcome.js';

export const CUE_KEY = 'natpf-tennis.segnaleTempo';
export const CUE = Object.freeze({
  lead: .9,       // s prima del punto d'impatto: l'anello compare (largo)
  wide: 3.2,      // m di diametro quando compare
  tight: .55,     // m di diametro quando è chiuso sulla palla (la palla è 0,2 m a schermo)
  after: .12,     // s dopo la fine del verde in cui resta in vista (rosso: tardi), poi sparisce
});
// Colori (revisione del 12/11): mentre la palla arriva l'anello è bianco, non più giallo: nell'anello a terra del voto il
// giallo vuol dire «buono», qui voleva dire «aspetta». Verde: adesso. Rosso: tardi
export const CUE_COLORS = Object.freeze({ wait: '#ffffff', now: '#39e58c', late: '#ff5d6c' });
export const CUE_NOW_SCALE = 1.3;   // quando diventa verde l'anello si allarga di colpo e si riempie (un lampo): prima si vedeva poco
const clamp01 = v => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));

// scelta salvata: 'auto' (di base) | 'on' | 'off'
export function readCue({ storage = globalThis.localStorage } = {}){
  let v = null; try { v = storage?.getItem(CUE_KEY); } catch {}
  return v === '1' ? 'on' : v === '0' ? 'off' : 'auto';
}
export function writeCue(pref, { storage = globalThis.localStorage } = {}){
  const p = pref === 'on' || pref === 'off' ? pref : 'auto';
  try { if (p === 'auto') storage?.removeItem(CUE_KEY); else storage?.setItem(CUE_KEY, p === 'on' ? '1' : '0'); } catch {}
  return p;
}
// livelli con il segnale acceso di base
export const cueDefault = level => level === 'bambini' || level === 'evento';
// il segnale è acceso? level: livello scelto nel menu; versus: stesso schermo o sfida tra due computer
export function cueOn({ level = 'casual', pref = 'auto', versus = false } = {}){
  if (versus || level === '1v1') return false;
  return pref === 'on' ? true : pref === 'off' ? false : cueDefault(level);
}
export const cueToast = (pref, level) => (pref === 'on' ? 'Segnale del momento giusto acceso a tutti i livelli contro la CPU: un anello si chiude sulla palla quando è il momento di colpire'
  : pref === 'off' ? 'Segnale del momento giusto spento a tutti i livelli'
  : `Segnale del momento giusto di base: acceso con «Bambino» e «Adulto», spento con gli altri livelli (adesso ${cueDefault(level) ? 'acceso' : 'spento'})`);

// pura: i due bordi del verde, in secondi prima (early) e dopo (late) il punto d'impatto: la finestra del voto «Perfetto»
// del colpo vero, con le stesse funzioni dell'esito (strokeOutcome: t = tempo/span in anticipo, tempo/late in ritardo,
// «Perfetto» se |t| ≤ SWING_AIM.centre; natpf_impact.queueUserSwing: late = (lateSpanOf + lateMargin) × openTight).
// level: parametri del livello; vz: velocità della palla lungo il campo; margin: natpf_impact.lateMargin (s in più in
// ritardo: livello Bambini); tight: natpf_impact.openTight (1 contro la CPU)
export function cueEdges({ level = null, vz = null, margin = 0, tight = 1 } = {}){
  const span = directionSpan(level || {})*slowFactor(vz);
  const late = Math.max(.04, Math.min(span, (lateSpanOf(vz, level || {}) + (Number.isFinite(margin) ? margin : 0))*(Number.isFinite(tight) ? tight : 1)));
  return { early: SWING_AIM.centre*span, late: SWING_AIM.centre*late };
}
// pura: come si disegna l'anello. ttc: secondi al punto d'impatto (negativo: passato); win: i due bordi del verde
// (cueEdges: { early, late }) o, per le prove, una sola finestra della direzione (verde simmetrico: centre × finestra).
// null: niente anello. { size 0…1 (1 largo, 0 chiuso), diameter (m), phase }
export function cueView(ttc, win = SWING_AIM.timingSpan){
  if (ttc == null || !Number.isFinite(ttc)) return null;
  const sym = typeof win === 'number' ? SWING_AIM.centre*Math.max(.05, win) : null;
  const early = sym ?? Math.max(0, win?.early || 0), late = sym ?? Math.max(0, win?.late || 0);
  if (ttc > CUE.lead || ttc < -(late + CUE.after)) return null;
  const size = clamp01(ttc/CUE.lead);
  return { size, diameter: +(CUE.tight + (CUE.wide - CUE.tight)*size).toFixed(3), phase: ttc > early ? 'wait' : ttc >= -late ? 'now' : 'late' };
}

// pura: l'anello non si riallarga mai mentre la stessa palla arriva. Il tempo che manca all'impatto è una stima che il
// gioco corregge in volo (al rimbalzo, quando chi gioca si sposta): senza questo l'anello tornava più largo circa in una
// palla su cinque, fino a 0,6 m. floor: il diametro più stretto già mostrato per questa palla (Infinity: palla nuova).
// Restituisce { view, floor }: l'anello resta fermo al più stretto già visto, poi riprende a stringersi. La fase (giallo,
// verde, rosso) non cambia: la decide sempre il tempo vero
export function cueHold(view, floor = Infinity){
  if (!view) return { view: null, floor: Infinity };
  if (view.diameter > floor) return { view: { ...view, diameter: floor, size: clamp01((floor - CUE.tight)/(CUE.wide - CUE.tight)) }, floor };
  return { view, floor: view.diameter };
}

// fill: l'interno pieno e trasparente (l'anello verde: si vede anche sopra la racchetta, che ha quasi la stessa misura)
function ringTexture(fill = false){
  const c = typeof document != 'undefined' ? document.createElement('canvas') : null, g = c && c.getContext ? c.getContext('2d') : null;
  if (!g) return null;
  c.width = c.height = 256;
  g.clearRect(0, 0, 256, 256);
  if (fill){ g.fillStyle = 'rgba(255,255,255,.34)'; g.beginPath(); g.arc(128, 128, 98, 0, Math.PI*2); g.fill(); }
  g.lineWidth = 34; g.strokeStyle = 'rgba(0,0,0,.6)'; g.beginPath(); g.arc(128, 128, 98, 0, Math.PI*2); g.stroke();   // bordo scuro: si legge anche sul campo chiaro
  g.lineWidth = 22; g.strokeStyle = '#ffffff'; g.beginPath(); g.arc(128, 128, 98, 0, Math.PI*2); g.stroke();
  return new THREE.CanvasTexture(c);
}

export class NatpfTimingCue {
  constructor(engine){
    this.engine = engine;
    this.pref = readCue();
    this.view = null;            // ultimo anello disegnato (per le prove)
    this._flight = null; this._floor = Infinity;   // palla in arrivo di adesso e diametro più stretto già mostrato
    this.sprite = this._build();
  }
  _build(){
    const scene = this.engine.scene; if (!scene) return null;
    this._maps = { ring: ringTexture(), full: ringTexture(true) };
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._maps.ring, color: CUE_COLORS.wait, transparent: true, depthWrite: false, depthTest: false, opacity: .95 }));
    s.visible = false; s.renderOrder = 9;
    scene.add(s);
    return s;
  }
  setPref(pref){ this.pref = writeCue(pref); return this.pref; }
  // acceso per la partita di adesso?
  get enabled(){
    const E = this.engine, versus = !!E.isMultiplayer || !!E.natpfSplit?.active || E.playerRole === 'p2';
    return cueOn({ level: E.hud?.selectedDifficulty || E.matchConfig?.difficulty, pref: this.pref, versus });
  }
  update(){
    const E = this.engine, b = E.ball;
    let v = null;
    if (this.enabled && E.phase === 'RALLY' && b?.inPlay && b.lastHitter !== 'player' && !E.autoPlayMode && !E.natpfReplay?.playing)
      v = cueView(timeToContact(E, E.player), cueEdges({ level: skillLevel(E.matchConfig?.difficulty), vz: b.vel.z, margin: lateMargin(E, E.player), tight: openTight(E, E.player) }));
    // una palla nuova (un altro colpo, o l'anello era sparito) riparte larga; la stessa palla non si riallarga (cueHold)
    const flight = v ? `${b.rallyStrokeCount}|${b.lastHitter}` : null;
    if (flight !== this._flight){ this._flight = flight; this._floor = Infinity; }
    ({ view: v, floor: this._floor } = cueHold(v, this._floor));
    this.view = v;
    const s = this.sprite; if (!s) return;
    s.visible = !!v;
    if (!v) return;
    s.position.copy(b.pos);
    s.scale.setScalar(v.diameter*(v.phase === 'now' ? CUE_NOW_SCALE : 1));
    if (this._phase !== v.phase){
      this._phase = v.phase; s.material.color.set(CUE_COLORS[v.phase]);
      const map = v.phase === 'now' ? this._maps.full : this._maps.ring;
      if (map && s.material.map !== map){ s.material.map = map; s.material.needsUpdate = true; }
    }
  }
}
