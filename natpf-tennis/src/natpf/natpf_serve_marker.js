// B37 (collaudo dell'utente del 13/11, punto 2): «quando uno deve battere, non basta mettergli "alza la mano" come testo.
// Evidenzialo magari con un selettore sopra … oppure qualche elemento di gaming tipo una zona colorata o evidenziata che
// faccia capire chi deve battere». Solo finché il servizio non parte (SERVE_STANCE e SERVE_TOSS), con qualsiasi personaggio
// (Classici e Lob & Drop) e chiunque batta (chi gioca, la CPU, il Player 2):
//   • il RIQUADRO DI SERVIZIO a terra, nella scena 3D, dove deve cadere il servizio (in diagonale, nella metà di chi
//     riceve): riempimento leggero che pulsa e contorno luminoso appena dentro le righe bianche del campo; sparisce quando
//     la palla parte (riferimento: il contorno bianco a terra del gioco commerciale visto nel video dell'utente). Sta nella
//     scena: si vede nelle due metà dello stesso schermo (due camere sulla stessa scena) e sui due computer della sfida tra
//     due computer (fase e battitore arrivano con lo stato dell'host). Costo: 5 mesh, materiali senza luci, nessuna ombra;
//   • sopra chi batte, la casella gialla tonda «Al servizio» del B35b (HTML: #server-tag del motore, _updateProjectedHUD;
//     nello stesso schermo una per metà, natpf_split.js), appena sopra la testa misurata del personaggio (tagPoint).
// B37.1 (13/11 sera, l'utente: «il triangolino in alto è orribile, meglio la casella tonda che usavi prima "al servizio"»):
// tolta la gemma 3D che girava sopra la testa (con la sua misura per camera); la casella torna come nel B35b (fondo giallo,
// scritta blu scura, bordo scuro, angoli tondi: natpf-hud.css), alla stessa misura sugli schermi normali e un po' più grande
// sui grandi. Rispetto al B35b (sempre 2,25 m da terra) sta appena sopra la testa vera, anche con Lob & Drop (più bassi).
import * as THREE from 'three';

export const SERVE_MARK = Object.freeze({
  color: 0xe8ff3a,            // accento del sistema grafico
  // m: cima del personaggio (misurata sul modello: testa, o racchetta se è più alta), tenuta tra min e max; senza modello
  // il valore di base, che con tagGap dà i 2,25 m di prima del B37
  head: Object.freeze({ min: 1.6, max: 2.9, fallback: 2.13 }),
  tagGap: .12,                                                     // m tra la cima del personaggio e il fondo della casella «Al servizio»
  settle: 1.2,                                                     // s di gioco dalla prima misura in cui la cima si affina (un giro della racchetta che oscilla)
  ahead: Object.freeze({ min: -.5, max: 1 }),                      // m: profondità della parte più alta rispetto al centro (+ verso la rete)
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
// si vede il riquadro? fase del servizio, partita o allenamento (non la dimostrazione del menu, non la moviola, non con il
// menu aperto)
export function serveMarkOn(engine){
  return !!engine && PHASES.has(engine.phase) && !engine.autoPlayMode && engine.cameraMode !== 'REPLAY_CAM' && !engine.natpfUi?.lobby?.visible;
}
// cima della testa del personaggio (m da terra), misurata sul modello e tenuta tra min e max; senza modello il valore di base.
// Solo quello che si vede (B37.1): con Lob & Drop in 3D nella radice restano, nascosti, il tennista e la mascotte costruita
// nel codice, più alti del modello vero (la testa di Lob nel codice arriva a 2,18 m, il modello di Drop con la racchetta a
// circa 1,8–1,9 m): contandoli, come nel B37, la casella sarebbe stata mezzo metro sopra la testa. Mesh con la pelle (modelli
// 3D) nella posa di adesso. refine: solo le mesh rigide (le mesh con la pelle costano qualche millisecondo: migliaia di
// vertici da piegare) e con le matrici dell'ultimo disegno, senza ricalcolarle (non tocca niente del gioco).
// Con la cima anche dove sta in profondità: la parte più alta può essere davanti al centro del personaggio (con Lob & Drop
// la racchetta alzata, 0,5–0,7 m verso la rete) e, vista dalla camera alta dietro chi batte, una cosa più avanti sale sullo
// schermo: a parità di altezza la racchetta arrivava alla casella messa sopra il centro. Per le mesh rigide vicine alla
// cima (8 cm) il vertice più alto vero, con la sua profondità: il riquadro di un telaio inclinato ha il centro più indietro
// del bordo in alto, e quello di una calotta è più alto della calotta se è ruotata
const _part = new THREE.Box3(), _v = new THREE.Vector3(), _hit = { y: -Infinity, z: 0 }, _rigid = [], _rigidTop = [];
function visibleTop(root, refine = false){
  if (!refine) root.updateWorldMatrix(true, true);
  _hit.y = -Infinity; _hit.z = 0; _rigid.length = 0; _rigidTop.length = 0;
  let boxTop = -Infinity;
  root.traverseVisible(o => {
    if (!o.isMesh || !o.geometry) return;
    if (o.isSkinnedMesh){
      if (refine) return;
      o.computeBoundingBox(); _part.copy(o.boundingBox).applyMatrix4(o.matrixWorld);
      if (_part.max.y > _hit.y){ _hit.y = _part.max.y; _hit.z = (_part.min.z + _part.max.z)/2; }
      return;
    }
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    _part.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
    _rigid.push(o); _rigidTop.push(_part.max.y); boxTop = Math.max(boxTop, _part.max.y);
  });
  for (let i = 0; i < _rigid.length; i++){
    if (_rigidTop[i] < boxTop - .08 || _rigidTop[i] < _hit.y) continue;
    const o = _rigid[i], pa = o.geometry.attributes.position;
    if (!pa) continue;
    for (let k = 0; k < pa.count; k++){ _v.fromBufferAttribute(pa, k).applyMatrix4(o.matrixWorld); if (_v.y > _hit.y){ _hit.y = _v.y; _hit.z = _v.z; } }
  }
  _rigid.length = 0;
  return _hit;
}
const clampTop = t => Math.max(SERVE_MARK.head.min, Math.min(SERVE_MARK.head.max, t));
const side = actor => (actor?.sideSign < 0 ? -1 : 1);
const aheadOf = (actor, z) => Math.max(SERVE_MARK.ahead.min, Math.min(SERVE_MARK.ahead.max, ((actor.pos?.z || 0) - z)*side(actor)));
// cima e profondità della parte più alta che si vede ({ top, ahead }); senza modello la cima di base, al centro
export function measureTop(actor){
  const root = actor?.root;
  if (!root?.isObject3D) return { top: SERVE_MARK.head.fallback, ahead: 0 };
  const h = visibleTop(root);
  return Number.isFinite(h.y) ? { top: clampTop(h.y - (actor.pos?.y || 0)), ahead: aheadOf(actor, h.z) } : { top: SERVE_MARK.head.fallback, ahead: 0 };
}
export const headTop = actor => measureTop(actor).top;
// altezza (m da terra) del fondo della casella «Al servizio»: appena sopra la cima del personaggio. È il punto che il motore
// e lo stesso schermo proiettano; la casella sta sopra quel punto (translate(-50%, -100%) in styles.css)
export const serveTagHeight = top => top + SERVE_MARK.tagGap;

export class NatpfServeMarker {
  constructor(engine){
    this.engine = engine;
    this.tops = new WeakMap();   // personaggio → { root, kids, look, m3d, shown, top, ahead, t0 }: si rimisura quando cambia il modello
    this.t = 0;
    const M = SERVE_MARK;
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
    engine.scene?.add?.(this.box);
    this.state = { box: false, server: null, rect: null };
  }
  // cima della testa di chi batte, misurata quando cambia il modello (Classici ↔ Lob & Drop, nuovo personaggio, modello 3D di
  // Lob o di Drop arrivato o tolto: cambia quello che si vede). La prima misura arriva al primo servizio, quando la posa del
  // servizio sta ancora arrivando, e in attesa del servizio la testa dei Classici dondola (fino a 14 cm): per SERVE_MARK.
  // settle secondi di gioco si tiene il massimo delle mesh rigide (racchetta, Classici; costano poco), poi resta ferma: la
  // casella non sobbalza con la testa e non copre testa e racchetta. Senza l'orologio del motore una misura sola
  measure(actor){
    if (!actor) return { top: SERVE_MARK.head.fallback, ahead: 0 };
    const root = actor.root, kids = root?.children?.length ?? 0, look = actor.natpfLook, m3d = !!actor.natpfMascot3dOn, shown = actor.model?.visible !== false;
    const now = this.engine?.elapsedTime, c = this.tops.get(actor);
    if (c && c.root === root && c.kids === kids && c.look === look && c.m3d === m3d && c.shown === shown){
      if (root?.isObject3D && now - c.t0 >= 0 && now - c.t0 < SERVE_MARK.settle){
        // (cima e profondità tenute al massimo ognuna per conto suo: la casella resta sopra la racchetta che oscilla
        // avanti e indietro; vista dal fondo opposto più avanti vuol dire più vicino e più in basso: qualche pixel)
        // (nessuna mesh rigida in vista: niente da affinare, non la cima di base)
        const h = visibleTop(root, true);
        if (Number.isFinite(h.y)){
          const top = clampTop(h.y - (actor.pos?.y || 0)), ahead = aheadOf(actor, h.z);
          if (top > c.top) c.top = top;
          if (ahead > c.ahead) c.ahead = ahead;
        }
      }
      return c;
    }
    const m = measureTop(actor);
    const n = { root, kids, look, m3d, shown, top: m.top, ahead: m.ahead, t0: Number.isFinite(now) ? now : -Infinity };
    this.tops.set(actor, n);
    return n;
  }
  top(actor){ return this.measure(actor).top; }
  update(dt = 1/60){
    const E = this.engine, on = serveMarkOn(E), who = on ? serverOf(E) : null;
    this.t += Math.max(0, Math.min(.1, dt || 0));
    const showBox = on && !!who;
    if (this.box.visible !== showBox) this.box.visible = showBox;
    this.state = { box: showBox, server: who === E.opponent ? 'opponent' : who ? 'player' : null, rect: null };
    if (!showBox) return;
    const M = SERVE_MARK;
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
  // altezza (m da terra) del fondo della casella «Al servizio» sopra chi batte: la cima del suo personaggio più tagGap
  tagHeight(actor){
    return serveTagHeight(this.top(actor));
  }
  // punto (mondo) del fondo della casella: al centro di chi batte di lato, tagGap sopra la sua parte più alta e alla sua
  // profondità. Lo stesso punto per tutte le camere (vista di gioco, le due metà dello stesso schermo, il computer del
  // Player 2): ognuna lo proietta e la casella ci sta sopra
  tagPoint(actor, out = new THREE.Vector3()){
    const c = this.measure(actor), p = actor?.pos;
    if (!p) return out.set(0, serveTagHeight(c.top), 0);
    return out.set(p.x, (p.y || 0) + serveTagHeight(c.top), p.z - c.ahead*side(actor));
  }
}
