// Potenza del colpo, colpo super ed energia di chi gioca (richiesta del 29/10 sera, dopo la partita 191023 sullo stesso
// schermo: «una barra quando fai il colpo super power, o un effetto che faccia capire che è un super power; lo stesso
// per la stamina quando è stanco»). Prima il colpo super si sentiva solo da scossa, stelle e voce, e la scritta
// «SUPER SHOT» del motore era coperta dall'esito breve («Perfetto»); la stanchezza (natpf_skill.fatigueStep) non si
// vedeva affatto.
// - Potenza: dopo ogni colpo di chi gioca (racchetta virtuale, engine.natpfLastRacket) una barra con la forza del gesto
//   e la tacca della soglia del super (natpf_stroke_outcome.SUPER.power); il colpo super la riempie d'oro con «SUPER!».
// - Palla super: un alone arancione segue la palla finché il colpo super è in volo (ball.natpfSuper).
// - Energia: 1 − stanchezza (natpf_skill.fatigueLevel), sempre in vista in partita; sotto ENERGY.tired «Stanco».
// Sullo stesso schermo due gruppi, uno per metà (P1 a sinistra, P2 a destra); altrimenti solo chi gioca qui.
import * as THREE from 'three';
import { SUPER, superStrength } from './natpf_stroke_outcome.js';
import { fatigueLevel } from './natpf_skill.js';

export const POWER_HUD = Object.freeze({ showS: 1.8, superS: 2.6 });
export const ENERGY = Object.freeze({ tired: .5, low: .75 });
const MATCH = ['SERVE_STANCE', 'SERVE_TOSS', 'RALLY', 'POINT_OVER'];
const clamp01 = v => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));

// barra della potenza di un colpo: { fill 0…1, super, label }. La forza sulla scala del colpo super (superStrength: con il
// telefono la pendenza relativa di prima), così la tacca della soglia vale per il super
export function powerView(shot){
  if (!shot) return null;
  const power = clamp01(superStrength(shot.intent || {})), sup = !!shot.super;
  return { fill: sup ? 1 : power, super: sup, label: sup ? 'SUPER!' : power >= SUPER.power ? 'Fortissimo' : power >= .65 ? 'Forte' : 'Potenza' };
}
// energia (0…1, piena senza stanchezza) e stato
export function energyView(level){
  const energy = 1 - clamp01(level);
  return { fill: energy, state: energy <= 1 - ENERGY.low ? 'stanco' : energy <= 1 - ENERGY.tired ? 'affaticato' : 'ok' };
}

export class NatpfPowerHud {
  constructor(engine){
    this.engine = engine;
    this.lastShot = null;
    this.shown = { player: null, p2: null };
    this.root = typeof document != 'undefined' ? this._build() : null;
    this.glow = this._buildGlow();
  }
  _build(){
    const root = document.createElement('div');
    root.className = 'natpf-meters hidden';
    root.innerHTML = ['p1', 'p2'].map(id => `
      <div class="meter-group" data-meter="${id}">
        <div class="meter meter-power" data-power><span class="meter-label">Potenza</span><span class="meter-bar"><i></i><b style="left:${(SUPER.power*100).toFixed(0)}%"></b></span></div>
        <div class="meter meter-energy" data-energy><span class="meter-label">Energia</span><span class="meter-bar"><i></i></span></div>
      </div>`).join('');
    (document.body || document.documentElement).appendChild(root);
    return root;
  }
  _buildGlow(){
    const scene = this.engine.scene;
    if (!scene) return null;
    const c = typeof document != 'undefined' ? document.createElement('canvas') : null;
    let map = null;
    const g = c && c.getContext ? c.getContext('2d') : null;
    if (g){
      c.width = c.height = 64;
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,240,170,1)'); grad.addColorStop(.35, 'rgba(255,150,30,.85)'); grad.addColorStop(1, 'rgba(255,60,0,0)');
      g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
      map = new THREE.CanvasTexture(c);
    }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color: 0xffa020, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.visible = false; s.renderOrder = 8; s.scale.setScalar(.9);
    scene.add(s);
    return s;
  }
  // chi ha i gruppi in vista: sullo stesso schermo P1 e P2; altrimenti chi gioca qui (P1, o P2 dall'altro computer)
  _groups(){
    const E = this.engine, split = !!E.natpfSplit?.active;
    return split ? [['p1', E.player, 'player'], ['p2', E.opponent, 'p2']] : [[E.playerRole === 'p2' ? 'p2' : 'p1', E.playerRole === 'p2' ? E.opponent : E.player, E.playerRole === 'p2' ? 'p2' : 'player']];
  }
  update(dt, now = this.engine.elapsedTime){
    const E = this.engine, inMatch = MATCH.includes(E.phase) && !E.autoPlayMode && !E.natpfReplay?.playing;
    // palla super: alone sulla palla in volo
    if (this.glow){
      const b = E.ball, on = inMatch && !!b?.natpfSuper && !!b?.inPlay && !!b?.pos;
      this.glow.visible = on;
      if (on){ this.glow.position.copy(b.pos); this.glow.scale.setScalar(1.5 + .3*Math.sin((now || 0)*30)); }
    }
    // colpo nuovo della racchetta virtuale: barra della potenza di chi l'ha fatto
    const shot = E.natpfLastRacket;
    if (shot && shot !== this.lastShot){
      this.lastShot = shot;
      const v = powerView(shot);
      if (v) this.shown[shot.who === 'p2' ? 'p2' : 'player'] = { ...v, until: (now || 0) + (v.super ? POWER_HUD.superS : POWER_HUD.showS) };
    }
    if (!this.root) return;
    this.root.classList.toggle('hidden', !inMatch);
    this.root.classList.toggle('split', !!E.natpfSplit?.active);
    if (!inMatch) return;
    // gira a ogni fotogramma: elementi trovati una volta sola e scritti solo quando il valore cambia (prima
    // querySelector e textContent a ogni fotogramma, cioè un ricalcolo dello stile per fotogramma, due nello split)
    const refs = this._refs ||= this._findRefs();
    const groups = this._groups(), visible = new Set(groups.map(g => g[0]));
    for (const id in refs) refs[id].el.classList.toggle('hidden', !visible.has(id));
    for (const [id, actor, who] of groups){
      const r = refs[id];
      if (!r) continue;
      const en = energyView(fatigueLevel(E, actor));
      this._set(r, 'state', en.state, v => { r.eb.dataset.state = v; });
      this._set(r, 'ew', `${(en.fill*100).toFixed(1)}%`, v => { r.ebBar.style.width = v; });
      this._set(r, 'el', en.state === 'stanco' ? 'Stanco!' : en.state === 'affaticato' ? 'Affaticato' : 'Energia', v => { r.ebLabel.textContent = v; });
      const p = this.shown[who], on = !!p && (now || 0) < p.until;
      r.pb.classList.toggle('on', on);
      r.pb.classList.toggle('super', on && p.super);
      if (on){
        this._set(r, 'pw', `${(p.fill*100).toFixed(1)}%`, v => { r.pbBar.style.width = v; });
        this._set(r, 'pl', p.label, v => { r.pbLabel.textContent = v; });
      }
    }
  }
  _findRefs(){
    const out = {};
    for (const el of this.root.querySelectorAll('[data-meter]')){
      const eb = el.querySelector('[data-energy]'), pb = el.querySelector('[data-power]');
      if (!eb || !pb) continue;
      out[el.dataset.meter] = { el, eb, pb, ebBar: eb.querySelector('i'), ebLabel: eb.querySelector('.meter-label'), pbBar: pb.querySelector('i'), pbLabel: pb.querySelector('.meter-label'), last: {} };
    }
    return out;
  }
  _set(r, key, value, write){ if (r.last[key] !== value){ r.last[key] = value; write(value); } }
}
