// B37 (collaudo dell'utente del 13/11, punto 2): «quando uno deve battere, non basta mettergli "alza la mano" come testo.
// Evidenzialo magari con un selettore sopra … oppure qualche elemento di gaming tipo una zona colorata o evidenziata che
// faccia capire chi deve battere». Due elementi di gioco nella scena 3D, solo finché il servizio non parte (SERVE_STANCE
// e SERVE_TOSS), con qualsiasi personaggio (Classici e Lob & Drop) e chiunque batta (chi gioca, la CPU, il Player 2):
//   • il SEGNO sopra chi batte: una gemma a punta in giù color accento (#E8FF3A) con il bordo scuro, che gira e oscilla
//     piano sopra la testa (come il selettore dei videogiochi). Per ogni camera la gemma ha più o meno la stessa misura a
//     schermo: lontana (la CPU in fondo, il Player 2 visto dalla metà del Player 1) si ingrandisce fino a 2,6 volte
//     (onBeforeRender, per camera: nello stesso schermo ogni metà la vede della misura giusta). In prima persona non sopra
//     di sé (la camera è lì);
//   • il RIQUADRO DI SERVIZIO a terra, dove deve cadere il servizio (in diagonale, nella metà di chi riceve): riempimento
//     leggero che pulsa e contorno luminoso appena dentro le righe bianche del campo; sparisce quando la palla parte
//     (riferimento: il contorno bianco a terra del gioco commerciale visto nel video dell'utente).
// Stanno nella scena: si vedono nelle due metà dello stesso schermo (due camere sulla stessa scena) e sui due computer della
// sfida tra due computer (fase e battitore arrivano con lo stato dell'host). La scritta «Al servizio» resta, più piccola,
// sopra la gemma (tagHeight). Costo: 9 mesh, materiali senza luci, nessuna ombra.
import * as THREE from 'three';

export const SERVE_MARK = Object.freeze({
  color: 0xe8ff3a,            // accento del sistema grafico
  edge: 0x071233,             // bordo scuro (si stacca anche sopra Lob, gialla, e sul cielo chiaro)
  gem: Object.freeze({ r: .3, h: .64, gap: .34, edge: 1.2 }),      // m: raggio, altezza, spazio sopra la testa, bordo (× la gemma)
  near: 9, grow: 2.6,                                              // m: fino a questa distanza dalla camera misura vera; poi cresce (al massimo × grow)
  bob: Object.freeze({ amp: .08, hz: .8 }), spin: 1.5,             // oscillazione (m, al secondo) e rotazione (rad/s)
  head: Object.freeze({ min: 1.6, max: 2.9, fallback: 2.0 }),      // m: cima della testa (misurata sul personaggio)
  tag: .26,                                                        // m sopra la gemma: la scritta «Al servizio»
  box: Object.freeze({ line: .14, inset: .06, fill: .2, pulse: .14, hz: 1.1, y: .03 }),   // contorno e rientro (m), riempimento, impulso
});
const COURT = Object.freeze({ halfW: 4.115, service: 6.4 });
const PHASES = new Set(['SERVE_STANCE', 'SERVE_TOSS']);

// Riquadro di servizio di chi batte, in coordinate del campo: x tra 0 e ±4,115 (in diagonale rispetto a dove sta chi
// batte), z tra 0 e la riga del servizio nella metà di chi riceve. Come il motore: game_engine._executeServeHit (bersaglio
// legacy, sideSign × −1 sul lato della parità) e serveOutcome (boxSign); le prove lo confrontano con i servizi veri
export function serviceBox(server, deuceSide){
  const s = server?.sideSign < 0 ? -1 : 1, xs = s*(deuceSide ? -1 : 1);
  return { x0: Math.min(0, xs*COURT.halfW), x1: Math.max(0, xs*COURT.halfW), z0: Math.min(0, -s*COURT.service), z1: Math.max(0, -s*COURT.service) };
}
// chi batte adesso (come _updateProjectedHUD del motore)
export const serverOf = engine => (engine?.score?.server === 'opponent' ? engine.opponent : engine?.player) || null;
// si vede? fase del servizio, partita o allenamento (non la dimostrazione del menu, non la moviola, non con il menu aperto)
export function serveMarkOn(engine){
  return !!engine && PHASES.has(engine.phase) && !engine.autoPlayMode && engine.cameraMode !== 'REPLAY_CAM' && !engine.natpfUi?.lobby?.visible;
}
// gemma sopra la testa? Non sopra di sé in prima persona (la camera è nella testa)
export function gemOn(engine, server){
  return !!server && !(engine?._isFirstPersonActive?.() && server === engine.localActor);
}
// cima della testa del personaggio (m da terra), misurata sul modello e tenuta tra min e max; senza modello il valore di base
export function headTop(actor){
  const H = SERVE_MARK.head, root = actor?.root;
  if (!root?.isObject3D) return H.fallback;
  const b = new THREE.Box3().setFromObject(root);
  const top = Number.isFinite(b.max.y) ? b.max.y - (actor.pos?.y || 0) : H.fallback;
  return Math.max(H.min, Math.min(H.max, top));
}
// ingrandimento della gemma per una camera a distanza d (m): 1 da vicino, poi cresce con la distanza (misura a schermo
// quasi costante), al massimo SERVE_MARK.grow
export const gemScale = d => Math.max(1, Math.min(SERVE_MARK.grow, (Number.isFinite(d) ? d : 0)/SERVE_MARK.near));
// altezza della gemma (punta in basso) e della scritta «Al servizio» sopra di lei (scale: ingrandimento per quella camera)
export const gemBase = top => top + SERVE_MARK.gem.gap;
export const serveTagHeight = (top, scale = 1) => gemBase(top) + SERVE_MARK.gem.h*scale + SERVE_MARK.tag;

export class NatpfServeMarker {
  constructor(engine){
    this.engine = engine;
    this.tops = new WeakMap();   // personaggio → { root, kids, look, top }: si rimisura quando cambia il modello
    this.t = 0;
    const M = SERVE_MARK;
    // gemma: due piramidi a quattro facce unite (punta in giù più lunga), con il bordo scuro dietro (lato posteriore).
    // Opache, con la profondità: il bordo resta solo attorno
    const gem = new THREE.ConeGeometry(M.gem.r, M.gem.h*.72, 4, 1); gem.rotateX(Math.PI); gem.translate(0, M.gem.h*.36, 0);
    const cap = new THREE.ConeGeometry(M.gem.r, M.gem.h*.28, 4, 1); cap.translate(0, M.gem.h*.86, 0);
    this.gemMat = new THREE.MeshBasicMaterial({ color: M.color });
    this.edgeMat = new THREE.MeshBasicMaterial({ color: M.edge, side: THREE.BackSide });
    const shape = new THREE.Group(), tip = new THREE.Vector3(), cam = new THREE.Vector3(), S = new THREE.Matrix4(), T = new THREE.Matrix4(), Ti = new THREE.Matrix4();
    // per ogni camera: ingrandita attorno alla punta (che resta sopra la testa) secondo la distanza da quella camera.
    // onBeforeRender arriva dopo il calcolo di matrixWorld e prima del disegno (three.js r160), una volta per camera
    const perCamera = function(_r, _s, camera){
      const k = gemScale(cam.setFromMatrixPosition(camera.matrixWorld).distanceTo(tip.setFromMatrixPosition(shape.matrixWorld)));
      if (k === 1) return;
      T.makeTranslation(tip.x, tip.y, tip.z); Ti.makeTranslation(-tip.x, -tip.y, -tip.z); S.makeScale(k, k, k);
      this.matrixWorld.premultiply(Ti).premultiply(S).premultiply(T);
    };
    for (const g of [gem, cap]){
      const m = new THREE.Mesh(g, this.gemMat), e = new THREE.Mesh(g, this.edgeMat);
      e.scale.setScalar(M.gem.edge); e.position.y = -M.gem.h*(M.gem.edge - 1)*.5;
      for (const o of [m, e]){ o.onBeforeRender = perCamera; shape.add(o); }
    }
    this.gem = shape; shape.visible = false;
    shape.traverse(o => { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; o.renderOrder = 6; });
    // riquadro: riempimento e contorno (quattro strisce appena dentro le righe), a filo del campo
    this.box = new THREE.Group(); this.box.visible = false;
    const flat = () => { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI/2); return g; };
    const basic = (o = {}) => new THREE.MeshBasicMaterial({ color: M.color, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, ...o });
    this.fillMat = basic({ opacity: M.box.fill, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.lineMat = basic({ opacity: .95, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    this.fill = new THREE.Mesh(flat(), this.fillMat);
    this.lines = [0, 1, 2, 3].map(() => new THREE.Mesh(flat(), this.lineMat));
    this.box.add(this.fill, ...this.lines);
    this.box.traverse(o => { o.castShadow = false; o.receiveShadow = false; o.renderOrder = 3; });
    engine.scene?.add?.(shape); engine.scene?.add?.(this.box);
    this.state = { gem: false, box: false, server: null, rect: null };
  }
  // cima della testa di chi batte, rimisurata solo quando cambia il modello (Classici ↔ Lob & Drop, nuovo personaggio)
  top(actor){
    if (!actor) return SERVE_MARK.head.fallback;
    const root = actor.root, kids = root?.children?.length ?? 0, c = this.tops.get(actor);
    if (c && c.root === root && c.kids === kids && c.look === actor.natpfLook) return c.top;
    const top = headTop(actor);
    this.tops.set(actor, { root, kids, look: actor.natpfLook, top });
    return top;
  }
  update(dt = 1/60){
    const E = this.engine, on = serveMarkOn(E), who = on ? serverOf(E) : null;
    this.t += Math.max(0, Math.min(.1, dt || 0));
    const showGem = on && gemOn(E, who), showBox = on && !!who;
    if (this.gem.visible !== showGem) this.gem.visible = showGem;
    if (this.box.visible !== showBox) this.box.visible = showBox;
    this.state = { gem: showGem, box: showBox, server: who === E.opponent ? 'opponent' : who ? 'player' : null, rect: null };
    if (!on || !who) return;
    const M = SERVE_MARK, top = this.top(who);
    if (showGem){
      this.gem.position.set(who.pos.x, gemBase(top) + M.bob.amp*Math.sin(this.t*Math.PI*2*M.bob.hz), who.pos.z);
      this.gem.rotation.y = this.t*M.spin;
    }
    const r = serviceBox(who, !!E.score?.deuceSide), w = r.x1 - r.x0, d = r.z1 - r.z0, cx = (r.x0 + r.x1)/2, cz = (r.z0 + r.z1)/2;
    this.state.rect = r;
    this.box.position.set(cx, M.box.y, cz);
    this.fill.scale.set(w, 1, d);
    // nord, sud, ovest, est, appena dentro il riquadro: le righe bianche del campo restano a vista accanto
    const L = M.box.line, I = M.box.inset, iw = w - 2*I, id = d - 2*I;
    const sides = [[0, -id/2 + L/2, iw, L], [0, id/2 - L/2, iw, L], [-iw/2 + L/2, 0, L, id], [iw/2 - L/2, 0, L, id]];
    sides.forEach(([x, z, sx, sz], i) => { this.lines[i].position.set(x, .002, z); this.lines[i].scale.set(sx, 1, sz); });
    const k = .5 + .5*Math.sin(this.t*Math.PI*2*M.box.hz);
    this.fillMat.opacity = M.box.fill + M.box.pulse*k;
    this.lineMat.opacity = .8 + .2*k;
  }
  // altezza della scritta «Al servizio» sopra chi batte (m da terra), sopra la gemma come la vede quella camera (di base
  // la camera del motore)
  tagHeight(actor, camera = this.engine.camera){
    const top = this.top(actor), p = camera?.matrixWorld ? new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld) : null;
    const k = p && actor?.pos ? gemScale(p.distanceTo(new THREE.Vector3(actor.pos.x, gemBase(top), actor.pos.z))) : 1;
    return serveTagHeight(top, k);
  }
}
