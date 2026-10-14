// Tennis 1 contro 1: la scena 3D. Campo in terra rossa con le misure vere (le stesse di match/physics.js), rete, tribune,
// giocatori (gli avatar del mondo), palla con ombra, segni dei rimbalzi sulla terra e mirino del mouse.
// Coordinate: le stesse della partita (x larghezza, z lunghezza, rete a z = 0); il giocatore umano sta a z > 0.
import * as THREE from 'three';
import { makeAvatar, pose } from '../entities/avatar.js';
import { netHeightAt } from '../match/physics.js';

const CLAY = 0xc0623a, LINE = 0xf4f1ea;

export function createScene(container){
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9cc8ea);
  scene.fog = new THREE.Fog(0xbfd9ee, 70, 160);
  const camera = new THREE.PerspectiveCamera(50, 1, .2, 400);
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x8a6a50, 1.1));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
  sun.position.set(14, 30, 10); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 26, bottom: -26, near: 1, far: 80 });
  sun.shadow.bias = -.0005; sun.shadow.normalBias = .02;
  scene.add(sun);
  const fit = () => {
    const w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight;
    renderer.setSize(w, h); camera.aspect = w/h; camera.fov = camera.aspect < 1 ? 66 : 50; camera.updateProjectionMatrix();
  };
  fit(); addEventListener('resize', fit);

  /* ---------- campo ---------- */
  const lam = c => new THREE.MeshLambertMaterial({ color: c });
  const box = (w, h, d, mat, x, y, z, shadow = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.receiveShadow = true; m.castShadow = shadow; scene.add(m); return m; };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(22, 40), lam(CLAY));
  ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground);
  const lineMat = new THREE.MeshLambertMaterial({ color: LINE });
  const line = (x0, z0, x1, z1) => {
    const w = Math.abs(x1 - x0) || .05, d = Math.abs(z1 - z0) || .05;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lineMat); m.rotation.x = -Math.PI/2;
    m.position.set((x0 + x1)/2, .006, (z0 + z1)/2); m.receiveShadow = true; scene.add(m);
  };
  const HW = 4.115, DW = 5.485, HL = 11.885, SZ = 6.4;
  for (const s of [-1, 1]){
    line(-DW, s*HL, DW, s*HL);                // linee di fondo
    line(s*DW, -HL, s*DW, HL);                // corridoi del doppio
    line(s*HW, -HL, s*HW, HL);                // linee laterali del singolare
    line(-HW, s*SZ, HW, s*SZ);                // linee del servizio
    line(0, s*HL, 0, s*(HL - .1));            // segno centrale
  }
  line(0, -SZ, 0, SZ);
  // muretto verde, tribune e pubblico (blocchi semplici: il campo resta al centro dell'attenzione)
  const wall = lam(0x1d4a36);
  box(22, 1.1, .3, wall, 0, .55, -20); box(22, 1.1, .3, wall, 0, .55, 20);
  box(.3, 1.1, 40, wall, -11, .55, 0); box(.3, 1.1, 40, wall, 11, .55, 0);
  const tier = lam(0x6f7680), seats = new THREE.InstancedMesh(new THREE.BoxGeometry(.5, .55, .45), new THREE.MeshLambertMaterial(), 2600);
  const fan = new THREE.Object3D(), col = new THREE.Color(), colors = [0xd8342c, 0xffffff, 0x1f4fa3, 0xf3c623, 0x2f8f57, 0x1d2430, 0xf08a3c, 0xe6e0d6];
  let n = 0;
  const stand = (cx, cz, len, along, out) => {
    for (let r = 0; r < 9; r++){
      const y = 1.3 + r*.62, o = 1 + r*.9;
      const m = box(along === 'x' ? len : .9, .62, along === 'x' ? .9 : len, tier, cx + (along === 'z' ? out*o : 0), y - .31, cz + (along === 'x' ? out*o : 0), false);
      m.castShadow = false;
      for (let i = 0; i < len/.62 && n < seats.count; i++){
        if (Math.random() < .22) continue;
        const a = -len/2 + .31 + i*.62;
        fan.position.set(cx + (along === 'x' ? a : out*o), y + .28, cz + (along === 'z' ? a : out*o));
        fan.updateMatrix(); seats.setMatrixAt(n, fan.matrix); seats.setColorAt(n, col.set(colors[(Math.random()*colors.length) | 0])); n++;
      }
    }
  };
  stand(0, -20.5, 24, 'x', -1); stand(0, 20.5, 24, 'x', 1); stand(-11.5, 0, 38, 'z', -1); stand(11.5, 0, 38, 'z', 1);
  seats.count = n; seats.instanceMatrix.needsUpdate = true; scene.add(seats);
  // sedia dell'arbitro
  box(.8, 2.2, .8, lam(0x1d4a36), -6.9, 1.1, 0); box(.9, .1, .9, lam(0xffffff), -6.9, 2.25, 0);

  /* ---------- rete: profilo vero (0,914 m al centro, 1,07 m ai pali) ---------- */
  {
    const c = { halfW: HW, netH: .914, netPostH: 1.07 }, X = 5.9, seg = 24;
    const g = new THREE.PlaneGeometry(2*X, 1, seg, 1), P = g.attributes.position;
    for (let i = 0; i < P.count; i++){ const x = P.getX(i), top = P.getY(i) > 0; P.setY(i, top ? netHeightAt(c, Math.min(HW, Math.abs(x))) : 0); }
    g.computeVertexNormals();
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x2 = cv.getContext('2d');
    x2.strokeStyle = 'rgba(20,20,20,.9)'; x2.lineWidth = 3; for (let i = 0; i <= 64; i += 16){ x2.beginPath(); x2.moveTo(i, 0); x2.lineTo(i, 64); x2.moveTo(0, i); x2.lineTo(64, i); x2.stroke(); }
    const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2*X/.05/4, 1/.05/4);
    const net = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, alphaTest: .3 }));
    scene.add(net);
    const pts = Array.from({ length: seg + 1 }, (_, i) => { const x = -X + i*2*X/seg; return new THREE.Vector3(x, netHeightAt(c, Math.min(HW, Math.abs(x))) - .03, 0); });
    const tape = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, .035, 6), lam(0xffffff));
    tape.castShadow = true; scene.add(tape);
    for (const s of [-1, 1]) box(.09, 1.07, .09, lam(0x2c3e33), s*X, .535, 0);
  }

  /* ---------- giocatori e palla ---------- */
  const avatars = [];
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.09, 16, 12), new THREE.MeshLambertMaterial({ color: 0xe4f54a, emissive: 0x4a5410 }));
  ball.castShadow = true; scene.add(ball);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(.11, 18), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .35, depthWrite: false }));
  shadow.rotation.x = -Math.PI/2; scene.add(shadow);
  // mirino del mouse: anello sul campo avversario
  const aim = new THREE.Mesh(new THREE.RingGeometry(.32, .42, 32), new THREE.MeshBasicMaterial({ color: 0xffe14a, transparent: true, opacity: .9, depthWrite: false }));
  aim.rotation.x = -Math.PI/2; aim.position.y = .02; aim.visible = false; scene.add(aim);
  // segni dei rimbalzi sulla terra: restano un attimo, rossi se la palla è fuori
  const marks = [];
  const markGeo = new THREE.CircleGeometry(.1, 16); markGeo.scale(1, 1.8, 1);
  function mark(x, z, out = false){
    const m = new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial({ color: out ? 0xff3b30 : 0x8a3d1d, transparent: true, opacity: .85, depthWrite: false }));
    m.rotation.x = -Math.PI/2; m.position.set(x, .011, z); scene.add(m); marks.push({ m, t: 0, life: out ? 3.5 : 2.2 });
    while (marks.length > 6){ const o = marks.shift(); scene.remove(o.m); }
    return m;
  }
  function lastMarkOut(){ const o = marks[marks.length - 1]; if (o){ o.m.material.color.set(0xff3b30); o.life = 3.5; o.t = 0; } }

  let phase = 0;
  function setPlayers(players, looks){
    for (const a of avatars) scene.remove(a.g);
    avatars.length = 0;
    players.forEach((p, i) => { const a = makeAvatar(looks[i] || {}); scene.add(a.g); avatars.push(a); });
  }
  function sync(core, dt, t){
    phase += dt*14;
    const b = core.ball.p;
    core.players.forEach((p, i) => {
      const av = avatars[i]; if (!av) return;
      av.g.position.set(p.x, p.y, p.z);
      const base = p.team === 0 ? Math.PI : 0, look = Math.atan2(b.x - p.x, b.z - p.z);
      let d = look - base; d = Math.atan2(Math.sin(d), Math.cos(d));
      av.g.rotation.y = base + Math.max(-.9, Math.min(.9, d))*.6;
      const state = p.y > .05 ? 'jump' : p.moving > .2 ? 'run' : 'idle';
      const serving = p === core.serverP && core.phase === 'serve';
      pose(av, { state, phase: phase + i, amt: Math.min(1, p.moving), t: t + i, swing: p.swing > 0 ? p.swing/.35 : 0, overhead: p.lastShot === 'smash' || (serving && !!core.toss) || (p === core.lastHitter && core.rally.hits === 1 && core.rally.isServe) });
      if (serving && core.toss && p.swing <= 0){ av.armL.rotation.x = -2.7; }          // braccio del lancio
    });
    ball.visible = !core.ball.held || core.phase === 'serve';
    ball.position.set(b.x, b.y + .09, b.z);
    shadow.position.set(b.x, .015, b.z); shadow.visible = ball.visible; shadow.material.opacity = Math.max(.12, .38 - b.y*.06);
    for (const o of marks){ o.t += dt; o.m.material.opacity = Math.max(0, .85*(1 - Math.max(0, o.t - o.life*.6)/(o.life*.4))); }
  }
  // telecamera dietro il giocatore umano (stile TV, un po' più bassa e vicina)
  const camPos = new THREE.Vector3(), camAt = new THREE.Vector3();
  function follow(h, dt, snap = false){
    const tx = h ? h.x*.45 : 0, tz = h ? Math.max(HL + 8.6, h.z + 9.2) : HL + 9;
    camPos.set(tx, 6.9, tz); camAt.set((h ? h.x : 0)*.2, .3, -4.6);
    if (snap) camera.position.copy(camPos); else camera.position.lerp(camPos, Math.min(1, dt*5));
    camera.lookAt(camAt);
  }
  // dal puntatore del mouse al punto del campo (piano y = 0)
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  function pick(clientX, clientY){
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set((clientX - r.left)/r.width*2 - 1, -(clientY - r.top)/r.height*2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(plane, hit) ? { x: hit.x, z: hit.z } : null;
  }
  function render(){ renderer.render(scene, camera); }
  follow(null, 0, true);
  return { renderer, scene, camera, setPlayers, sync, follow, pick, render, aim, mark, lastMarkOut, avatars };
}
