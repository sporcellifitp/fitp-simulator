// Esito del colpo senza barra del tempo. Per i colpi del giocatore locale:
// - anello di arrivo a terra, nel punto in cui atterrerà la palla (noto già al momento del colpo), colorato:
//   verde = perfetto, giallo = buono / in anticipo / in ritardo, rosso = finirà fuori; al rimbalzo pulsa;
// - lampo dello stesso colore sulla racchetta;
// - messaggio breve («Perfetto», «Anticipo», «Ritardo», «Buono», «Fuori», «Mancata»).
// I colpi dell'avversario restano con l'anello bianco di rimbalzo del motore base.
import * as THREE from 'three';

export const QUALITY_COLORS = Object.freeze({ green: 0x3be37f, yellow: 0xffd23f, red: 0xff4d5e });
const COURT = { halfW: 4.115, halfL: 11.885, service: 6.4 };

// Dentro il campo avversario? (P1 tira verso z < 0, P2 verso z > 0; servizio: nel riquadro del servizio)
export function landsIn(target, { towardNegativeZ = true, serve = false } = {}){
  if (!target) return false;
  const z = towardNegativeZ ? -target.z : target.z;
  if (Math.abs(target.x) > COURT.halfW + .02) return false;
  return serve ? z > 0 && z <= COURT.service + .02 : z > 0 && z <= COURT.halfL + .02;
}
// grade del motore (es. «PERFECT • FOREHAND TOPSPIN», «POWER SERVE!», «EARLY SERVE», «TOO LATE! • WHIFF») → esito
export function shotQuality(grade = '', { inCourt = true } = {}){
  const g = String(grade).toUpperCase();
  if (/WHIFF/.test(g) && /EARLY/.test(g)) return { color: 'red', label: 'Troppo presto' };
  if (/WHIFF/.test(g) && /REACH/.test(g)) return { color: 'red', label: 'Troppo lontana' };
  if (/WHIFF|TOO LATE/.test(g)) return { color: 'red', label: 'Mancata' };
  if (!inCourt) return { color: 'red', label: 'Fuori' };
  if (/PERFECT|POWER/.test(g)) return { color: 'green', label: 'Perfetto' };
  if (/EARLY/.test(g)) return { color: 'yellow', label: 'Anticipo' };
  if (/LATE/.test(g)) return { color: 'yellow', label: 'Ritardo' };
  return { color: 'yellow', label: 'Buono' };
}
// nome del colpo speciale dal grade del motore («PERFECT • FOREHAND LOB!», «EARLY • SMASH!»): si mostra insieme
// all'esito, altrimenti pallonetto, palla corta e schiacciata non si distinguono da un colpo normale
export function shotName(grade = ''){
  const g = String(grade).toUpperCase();
  if (/SERVE/.test(g)) return null;
  return /DROP SHOT/.test(g) ? 'Palla corta' : /SMASH/.test(g) ? 'Schiacciata' : /\bLOB\b/.test(g) ? 'Pallonetto' : /\bSLICE\b/.test(g) ? 'Tagliato' : null;
}
// vibrazione del telefono: lunga per il perfetto, breve per il buono, doppia corta per l'errore
export const VIBRATION = Object.freeze({ green: [70], yellow: [25], red: [25, 60, 25] });

export class NatpfShotFeedback {
  constructor(engine){
    this.engine = engine;
    this.markers = [];
    this.flashes = [];
    const ring = new THREE.RingGeometry(.55, .82, 48); ring.rotateX(-Math.PI/2);
    const disc = new THREE.CircleGeometry(.55, 40); disc.rotateX(-Math.PI/2);
    for (let i = 0; i < 4; i++){
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
      const fill = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
      const g = new THREE.Group(); g.add(new THREE.Mesh(ring, mat), new THREE.Mesh(disc, fill)); g.visible = false; g.renderOrder = 4;
      engine.scene.add(g); this.markers.push({ g, mat, fill, age: 0, active: false, bounced: 0, life: 0 });
    }
    const flashMat = () => new THREE.SpriteMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    for (let i = 0; i < 3; i++){ const s = new THREE.Sprite(flashMat()); s.visible = false; s.renderOrder = 9; engine.scene.add(s); this.flashes.push({ s, age: 0, active: false }); }
    this.last = null;
    // rimbalzo: l'anello del colpo appena fatto pulsa nel suo colore
    const bounce = engine._spawnBounceRing?.bind(engine);
    if (bounce) engine._spawnBounceRing = (x, z) => { bounce(x, z); this.onBounce(x, z); };
    // messaggio breve al posto di «PERFECT • FOREHAND TOPSPIN!»
    const popup = engine.hud?.showTimingPopup?.bind(engine.hud);
    // (il motore mostra il messaggio subito dopo aver lanciato la palla: il punto di arrivo è già noto)
    if (popup) engine.hud.showTimingPopup = (o = {}) => {
      const g = String(o.grade || ''), p2 = /^P2\b/.test(g);
      const q = shotQuality(g, { inCourt: landsIn(engine.ball?.targetLanding, { towardNegativeZ: !p2, serve: /SERVE/i.test(g) }) });
      const kmh = String(o.detail || '').match(/\d+\s*KM\/H/i)?.[0] || '';
      // in prima persona il proprio messaggio va al centro, sotto la linea dello sguardo (non sopra il tabellone)
      const mine = p2 === (engine.playerRole === 'p2');
      const screenPos = mine && engine._isFirstPersonActive?.() ? { x: window.innerWidth/2, y: window.innerHeight*.64, visible: true } : o.screenPos;
      const name = shotName(g);
      popup({ ...o, screenPos, grade: q.label, detail: [name, kmh.toLowerCase()].filter(Boolean).join(' · ') });
      const el = document.getElementById('timing-popup-grade');
      if (el){ el.classList.remove('grade-early', 'grade-late', 'grade-perfect', 'q-green', 'q-yellow', 'q-red'); el.classList.add('q-' + q.color); }
    };
  }
  get localActor(){ return this.engine.playerRole === 'p2' ? this.engine.opponent : this.engine.player; }
  // dal giro dell'aptica: kind «hit»/«whiff» del giocatore locale; restituisce l'esito (anche per il telefono)
  onLocalFeedback({ kind, grade } = {}){
    const e = this.engine, towardNegativeZ = e.playerRole !== 'p2';
    if (kind === 'whiff'){ const q = shotQuality(/EARLY/i.test(grade || '') ? grade : 'WHIFF'); this.pending = q; return q; }
    if (kind !== 'hit') return null;
    const serve = /SERVE/i.test(grade), target = e.ball?.targetLanding;
    const q = shotQuality(grade, { inCourt: landsIn(target, { towardNegativeZ, serve }) });
    this.pending = q; this.last = q;
    this._marker(target, q.color);
    this._flash(q.color);
    return q;
  }
  _marker(target, color){
    if (!target) return;
    const m = this.markers.find(k => !k.active) || this.markers[0];
    m.active = true; m.age = 0; m.bounced = 0; m.life = 3.2;
    m.mat.color.setHex(QUALITY_COLORS[color]); m.fill.color.setHex(QUALITY_COLORS[color]);
    m.g.position.set(target.x, .03, target.z); m.g.scale.setScalar(1); m.g.visible = true;
  }
  _flash(color){
    const a = this.localActor, rk = this.engine.racketKinematics;
    let p = null;
    try { p = rk?.getRacketRimWorldPoints?.(a)?.centerWorld; } catch {}
    if (!p) return;
    const f = this.flashes.find(k => !k.active) || this.flashes[0];
    f.active = true; f.age = 0; f.s.material.color.setHex(QUALITY_COLORS[color]); f.s.position.copy(p); f.s.visible = true;
  }
  onBounce(x, z){
    for (const m of this.markers) if (m.active && !m.bounced && Math.hypot(m.g.position.x - x, m.g.position.z - z) < 2.2){ m.bounced = 1; m.age = Math.min(m.age, m.life - .9); }
  }
  update(dt){
    for (const m of this.markers){
      if (!m.active) continue;
      m.age += dt;
      const fadeIn = Math.min(1, m.age/.15), fadeOut = Math.max(0, Math.min(1, (m.life - m.age)/.6));
      const pulse = m.bounced ? 1 + .45*Math.sin(Math.min(1, (m.age - (m.life - .9))/.9)*Math.PI) : 1 + .06*Math.sin(m.age*9);
      m.g.scale.setScalar(pulse);
      m.mat.opacity = .95*fadeIn*fadeOut; m.fill.opacity = .22*fadeIn*fadeOut;
      if (m.age >= m.life){ m.active = false; m.g.visible = false; }
    }
    for (const f of this.flashes){
      if (!f.active) continue;
      f.age += dt; const k = f.age/.28;
      f.s.scale.setScalar(.25 + k*.9); f.s.material.opacity = Math.max(0, .9*(1 - k));
      if (k >= 1){ f.active = false; f.s.visible = false; }
    }
  }
}
