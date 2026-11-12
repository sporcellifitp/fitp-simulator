// B18.2 · tappa 2, gruppo 3 · Segnale del momento giusto (miglioramento 3 del rapporto B16, appendice M3).
// Il voto più frequente è «Anticipo»: chi gioca non sa QUANDO colpire. Il segnale è un anello attorno alla palla che
// arriva: parte largo, si stringe mentre la palla si avvicina e si chiude sulla palla nell'istante giusto, diventando
// verde. Chi gioca colpisce quando l'anello si chiude.
// Solo disegno: non legge i gesti e non cambia l'esito dei colpi, il voto, la fisica o i sorteggi (niente Math.random).
// L'istante è lo stesso che usa il gioco per giudicare il colpo: il tempo che manca al punto d'impatto
// (natpf_impact.timeToContact) e la finestra «Perfetto» del livello (natpf_skill.swingGrade: SWING_AIM.centre × timingSpan).
// Quando è acceso (cueOn):
//   • di base: acceso con «Bambino» e «Adulto» (livelli Bambini ed Evento), spento con gli altri livelli;
//   • Opzioni → «Segnale del momento giusto: Di base · Sì · No»: «Sì» lo accende a tutti i livelli contro la CPU, «No»
//     lo spegne a tutti (anche a Bambini ed Evento). Resta salvato (localStorage, chiave natpf-tennis.segnaleTempo);
//   • mai nello stesso schermo e nella sfida tra due computer (lì non cambia niente), nella demo dietro il menu e nella
//     moviola.
import * as THREE from 'three';
import { SWING_AIM, skillLevel } from './natpf_skill.js';
import { timeToContact } from './natpf_impact.js';

export const CUE_KEY = 'natpf-tennis.segnaleTempo';
export const CUE = Object.freeze({
  lead: .9,       // s prima del punto d'impatto: l'anello compare (largo)
  wide: 3.2,      // m di diametro quando compare
  tight: .55,     // m di diametro quando è chiuso sulla palla (la palla è 0,2 m a schermo)
  after: .12,     // s dopo la finestra «Perfetto» in cui resta in vista (rosso: tardi), poi sparisce
});
export const CUE_COLORS = Object.freeze({ wait: '#ffe14a', now: '#39e58c', late: '#ff5d6c' });
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

// pura: come si disegna l'anello. ttc: secondi al punto d'impatto (negativo: passato); span: finestra della direzione
// del livello (timingSpan). null: niente anello. { size 0…1 (1 largo, 0 chiuso), diameter (m), phase }
export function cueView(ttc, span = SWING_AIM.timingSpan){
  if (ttc == null || !Number.isFinite(ttc)) return null;
  const perfect = SWING_AIM.centre*Math.max(.05, span);
  if (ttc > CUE.lead || ttc < -(perfect + CUE.after)) return null;
  const size = clamp01(ttc/CUE.lead);
  return { size, diameter: +(CUE.tight + (CUE.wide - CUE.tight)*size).toFixed(3), phase: ttc > perfect ? 'wait' : ttc >= -perfect ? 'now' : 'late' };
}

// pura: l'anello non si riallarga mai mentre la stessa palla arriva. Il tempo che manca all'impatto è una stima che il
// gioco corregge in volo (al rimbalzo, quando chi gioca si sposta): senza questo l'anello tornava più largo in una palla
// su tre, fino a 0,6 m. floor: il diametro più stretto già mostrato per questa palla (Infinity: palla nuova).
// Restituisce { view, floor }: l'anello resta fermo al più stretto già visto, poi riprende a stringersi. La fase (giallo,
// verde, rosso) non cambia: la decide sempre il tempo vero
export function cueHold(view, floor = Infinity){
  if (!view) return { view: null, floor: Infinity };
  if (view.diameter > floor) return { view: { ...view, diameter: floor, size: clamp01((floor - CUE.tight)/(CUE.wide - CUE.tight)) }, floor };
  return { view, floor: view.diameter };
}

function ringTexture(){
  const c = typeof document != 'undefined' ? document.createElement('canvas') : null, g = c && c.getContext ? c.getContext('2d') : null;
  if (!g) return null;
  c.width = c.height = 256;
  g.clearRect(0, 0, 256, 256);
  g.lineWidth = 20; g.strokeStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.arc(128, 128, 104, 0, Math.PI*2); g.stroke();   // bordo scuro: si legge anche sul campo chiaro
  g.lineWidth = 12; g.strokeStyle = '#ffffff'; g.beginPath(); g.arc(128, 128, 104, 0, Math.PI*2); g.stroke();
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
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTexture(), color: CUE_COLORS.wait, transparent: true, depthWrite: false, depthTest: false, opacity: .95 }));
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
      v = cueView(timeToContact(E, E.player), skillLevel(E.matchConfig?.difficulty).timingSpan);
    // una palla nuova (un altro colpo, o l'anello era sparito) riparte larga; la stessa palla non si riallarga (cueHold)
    const flight = v ? `${b.rallyStrokeCount}|${b.lastHitter}` : null;
    if (flight !== this._flight){ this._flight = flight; this._floor = Infinity; }
    ({ view: v, floor: this._floor } = cueHold(v, this._floor));
    this.view = v;
    const s = this.sprite; if (!s) return;
    s.visible = !!v;
    if (!v) return;
    s.position.copy(b.pos);
    s.scale.setScalar(v.diameter*(v.phase === 'now' ? 1.12 : 1));
    if (this._phase !== v.phase){ this._phase = v.phase; s.material.color.set(CUE_COLORS[v.phase]); }
  }
}
