// Esito del colpo senza barra del tempo. Per i colpi del giocatore locale:
// - anello di arrivo a terra, nel punto in cui atterrerà la palla (noto già al momento del colpo), colorato:
//   verde = perfetto, giallo = buono / in anticipo / in ritardo, rosso = finirà fuori; al rimbalzo pulsa;
// - lampo dello stesso colore sulla racchetta;
// - messaggio breve («Perfetto», «Anticipo», «Ritardo», «Buono», «Fuori», «In rete», «Mancata»), con il motivo quando la
//   situazione rende il colpo debole o lo fa fallire («palla debole: in corsa», «scambio lungo»).
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
// grade del motore (es. «PERFECT • FOREHAND TOPSPIN», «POWER SERVE!», «EARLY SERVE», «TOO LATE! • WHIFF») → esito.
// net: la palla va in rete. Il motore lascia il bersaglio in campo e abbassa la traiettoria: prima il messaggio diceva
// «Perfetto», con l'anello verde in campo, e poi la palla finiva in rete (segnalazione del 23/10, sera)
export function shotQuality(grade = '', { inCourt = true, net = false } = {}){
  const g = String(grade).toUpperCase();
  if (/WHIFF/.test(g) && /EARLY/.test(g)) return { color: 'red', label: 'Troppo presto' };
  if (/WHIFF/.test(g) && /REACH/.test(g)) return { color: 'red', label: 'Troppo lontana' };
  if (/WHIFF|TOO LATE/.test(g)) return { color: 'red', label: 'Mancata' };
  if (net) return { color: 'red', label: 'In rete' };
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
// motivo del colpo debole o fallito della racchetta (natpfLastRacket del motore, solo se è il colpo appena fatto da chi):
// «palla debole: in corsa» a rete con il tempo perfetto, altrimenti la causa («in allungo», «scambio lungo», …)
export function shotWhy(L, { now = null, who = 'player' } = {}){
  if (!L?.out?.failed || !L.cause || L.who !== who || (now != null && L.at !== now)) return null;
  return L.out.weak ? `palla debole: ${L.cause}` : L.cause;
}
// Posto della scritta dell'esito (B10, segnalazione del 06/11: «se gioco 2v2, i nomi dei colpi (es. "Perfetto!")
// ostruiscono la visuale del campo»). Prima la scritta si apriva sopra la testa di chi colpiva (+2,35 m): nel doppio il
// colpo del compagno a rete la metteva in mezzo al campo, sopra la rete e gli avversari, e nel singolo copriva chi
// gioca e la palla. Ora sta nell'angolo in basso del proprio lato, sopra Potenza ed Energia (fuori dal campo):
// - chi gioca qui (P1, o il P2 dall'altro computer): angolo sinistro, dove ha le sue barre;
// - stesso schermo: P1 a sinistra, P2 a destra, ciascuno sopra le sue barre;
// - il colpo dell'altro giocatore che si vede qui (sfida un amico): angolo destro, più piccolo («avversario»);
// - il colpo del compagno CPU nel doppio è il tuo (lo fa il tuo gesto quando la palla è sua): nel tuo angolo, con
//   «compagno» nella riga piccola, non come un colpo diverso.
// p2: il colpo è del lato del P2 (grade «P2 …»); role: chi gioca qui; split: stesso schermo; partner: l'ha fatto il compagno
export function popupPlace({ p2 = false, role = 'p1', split = false, partner = false } = {}){
  const mine = split || p2 === (role === 'p2');
  return { side: split ? (p2 ? 'right' : 'left') : mine ? 'left' : 'right', kind: !mine ? 'other' : partner ? 'partner' : 'mine' };
}
// durata della scritta (ms): più breve di prima (1,1 s il colpo, 0,75 s l'errore)
export const POPUP_MS = Object.freeze({ hit: 900, miss: 700 });

// vibrazione del telefono: lunga per il perfetto, breve per il buono, doppia corta per l'errore
export const VIBRATION = Object.freeze({ green: [70], yellow: [25], red: [25, 60, 25] });

// Lampo sulla racchetta: macchia di luce rotonda e sfumata. Diagnostica del 30/10 (C17, «rettangolo chiaro accanto alla
// racchetta a ogni colpo»): lo sprite del lampo non aveva una texture e three.js lo disegna come un quadrato pieno, che
// cresceva e svaniva in 0,28 s (con la fusione additiva sul campo blu: un riquadro azzurro). La scia della racchetta
// (swing_vfx.js) e l'arco del motore base non c'entravano: spenti, il quadrato restava. Texture creata con i dati (niente
// canvas: vale anche nei test senza DOM), una sola per tutti i lampi.
export const FLASH_TEX_SIZE = 64;
let flashTexture = null;
export function flashGlowTexture(){
  if (flashTexture) return flashTexture;
  const N = FLASH_TEX_SIZE, data = new Uint8Array(N*N*4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++){
    const r = Math.hypot(x + .5 - N/2, y + .5 - N/2)/(N/2), a = r >= 1 ? 0 : Math.pow(1 - r, 1.6), i = (y*N + x)*4;
    data[i] = data[i + 1] = data[i + 2] = 255; data[i + 3] = Math.round(255*a);
  }
  flashTexture = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  flashTexture.needsUpdate = true;
  return flashTexture;
}

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
    const flashMat = () => new THREE.SpriteMaterial({ map: flashGlowTexture(), color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
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
      // colpo super potente: «Super!» in oro (prima l'esito breve copriva la scritta «SUPER SHOT» del motore)
      const sup = /SUPER SHOT/i.test(g);
      const q = sup ? { color: 'super', label: 'Super!' } : shotQuality(g, { inCourt: landsIn(engine.ball?.targetLanding, { towardNegativeZ: !p2, serve: /SERVE/i.test(g) }), net: !!engine.ball?.natpfNetFault });
      const kmh = String(o.detail || '').match(/\d+\s*KM\/H/i)?.[0] || '';
      // nell'angolo del proprio lato, mai sul campo (popupPlace); anche in prima persona (prima al centro dello sguardo)
      const place = popupPlace({ p2, role: engine.playerRole, split: !!engine.natpfSplit?.active, partner: !!o.partner });
      const who = place.kind === 'partner' ? 'compagno' : place.kind === 'other' ? 'avversario' : null;
      const name = shotName(g), why = shotWhy(engine.natpfLastRacket, { now: engine.elapsedTime, who: p2 ? 'p2' : 'player' });
      const miss = q.color === 'red' && /WHIFF/.test(g.toUpperCase());
      popup({ ...o, screenPos: null, durationMs: Math.min(o.durationMs ?? POPUP_MS.hit, miss ? POPUP_MS.miss : POPUP_MS.hit), grade: q.label, detail: [who, name, why, kmh.toLowerCase()].filter(Boolean).join(' · ') });
      const el = document.getElementById('timing-popup-grade');
      if (el){ el.classList.remove('grade-early', 'grade-late', 'grade-perfect', 'q-green', 'q-yellow', 'q-red', 'q-super'); el.classList.add('q-' + q.color); }
      this._place(document.getElementById('timing-popup'), place);
    };
  }
  // scritta nell'angolo: sopra le barre di Potenza ed Energia (se in vista), altrimenti appena sopra il bordo in basso.
  // Fuori dallo stesso schermo, se l'angolo coprirebbe un giocatore o la palla (chi gioca molto largo e in fondo) passa
  // all'altro angolo
  _place(el, place){
    if (!el?.classList) return;
    el.classList.add('anchored'); el.classList.toggle('other', place.kind === 'other');
    el.style.left = el.style.top = '';
    const set = side => {
      el.classList.toggle('side-right', side === 'right');
      const layer = el.parentElement?.getBoundingClientRect?.(), tops = [];
      for (const g of document.querySelectorAll?.('.natpf-meters:not(.hidden) .meter-group:not(.hidden)') || []){ const r = g.getBoundingClientRect(); if (r.height) tops.push(r.top); }
      el.style.bottom = layer && tops.length ? `${Math.max(0, layer.bottom - Math.min(...tops) + 6).toFixed(1)}px` : '';
    };
    set(place.side);
    if (this.engine.natpfSplit?.active || !this._covers(el)) return;
    const other = place.side === 'left' ? 'right' : 'left';
    set(other);
    if (this._covers(el)) set(place.side);
  }
  // il riquadro della scritta copre un giocatore o la palla? (proiezione con la camera del motore, pixel dell'area)
  _covers(el){
    const E = this.engine, r = el.getBoundingClientRect?.(), layer = el.parentElement?.getBoundingClientRect?.();
    if (!r || !layer || !E._projectToScreen || !E.camera) return false;
    const R = { l: r.left - layer.left - 6, r: r.right - layer.left + 6, t: r.top - layer.top - 6, b: r.bottom - layer.top + 6 };
    const hits = pts => { const q = pts.map(p => E._projectToScreen(p)).filter(p => p.visible); if (!q.length) return false; const xs = q.map(p => p.x), ys = q.map(p => p.y); return Math.min(...xs) < R.r && Math.max(...xs) > R.l && Math.min(...ys) < R.b && Math.max(...ys) > R.t; };
    const V = E.ball?.pos?.constructor;
    if (!V) return false;
    for (const a of [E.player, E.opponent, ...(E.isDoubles ? [E.playerPartner, E.opponentPartner] : [])]){
      if (!a?.pos) continue;
      const { x, z } = a.pos;
      if (hits([new V(x - .55, 0, z), new V(x + .55, 0, z), new V(x - .55, 2.1, z), new V(x + .55, 2.1, z)])) return true;
    }
    const b = E.ball.pos;
    return hits([new V(b.x - .3, b.y - .3, b.z), new V(b.x + .3, b.y + .3, b.z)]);
  }
  get localActor(){ return this.engine.playerRole === 'p2' ? this.engine.opponent : this.engine.player; }
  // dal giro dell'aptica: kind «hit»/«whiff» del giocatore locale; restituisce l'esito (anche per il telefono)
  onLocalFeedback({ kind, grade } = {}){
    const e = this.engine, towardNegativeZ = e.playerRole !== 'p2';
    if (kind === 'whiff'){ const q = shotQuality(/EARLY/i.test(grade || '') ? grade : 'WHIFF'); this.pending = q; return q; }
    if (kind !== 'hit') return null;
    const serve = /SERVE/i.test(grade), target = e.ball?.targetLanding, net = !!e.ball?.natpfNetFault;
    const q = shotQuality(grade, { inCourt: landsIn(target, { towardNegativeZ, serve }), net });
    this.pending = q; this.last = q;
    // in rete: niente anello nel campo (il bersaglio del motore resta in campo)
    if (!net) this._marker(target, q.color);
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
