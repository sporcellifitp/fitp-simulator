// Scena 3D di NATPF Simulator: arena, personaggi, palla con scia e ombra, sweet spot, feedback del colpo e camera locale
// dietro il giocatore attivo. Le coordinate del campo restano assolute e non vengono mai trasformate per il rendering.
// POV rialzato e stabile: campo completo e avversario visibili da entrambi i lati locali.
// Coordinate della partita (x larghezza, z lunghezza, rete a z = 0). La squadra 0 sta a z > 0.
import * as THREE from 'three';
import { buildArena } from './arena.js';
import { makeCharacter, LOOKS } from './character.js';
import { playerCameraFrame, cameraFieldOfView, normalizeCameraMode } from './viewpoint.js';
import { disposeSceneResources } from './scene-resources.js';
import { CONTACT, contactAxes, relativeContact } from '../match/contact.js';
import { evaluateSweetSpot } from './sweet-spot.js';
import { createImpactEffects, smashOpportunity, SHOT_COLORS } from './impact-effects.js';

const HL = 11.885;
const SWING = { before: .129, dur: .3 };            // impatto alla fase 0,43 del personaggio, durata 0,3 s

export function createScene(container, { quality = 1 } = {}){
  let cameraMode = 'third', destroyed = false;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, quality < 1 ? 1 : 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040a1c); scene.fog = new THREE.Fog(0x061033, 45, 120);
  const camera = new THREE.PerspectiveCamera(48, 1, .2, 300);
  // luce: ambiente blu e luce bianca dall'alto sul campo (come nei riferimenti)
  scene.add(new THREE.HemisphereLight(0x5770e0, 0x060a24, .95));
  const key = new THREE.DirectionalLight(0xeef3ff, 2.2); key.position.set(4, 30, 8); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -14, right: 14, top: 24, bottom: -24, near: 5, far: 60 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x3355ff, .8); fill.position.set(-20, 12, -10); scene.add(fill);
  const fit = () => { const w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight; renderer.setSize(w, h); camera.aspect = w/h; camera.fov = cameraFieldOfView(camera.aspect,cameraMode); camera.updateProjectionMatrix(); };
  fit(); addEventListener('resize', fit);

  const arena = buildArena(scene, { quality });

  /* ---------- palla, scia, ombra ---------- */
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.105, 18, 14), new THREE.MeshStandardMaterial({ color: 0xe8ff3a, emissive: 0x6a7a00, roughness: .5 }));
  ball.castShadow = true; scene.add(ball);
  const TRAIL = 14, trail = new THREE.InstancedMesh(new THREE.SphereGeometry(.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xf6ffb0, transparent: true, opacity: .35, depthWrite: false }), TRAIL);
  const hist = []; scene.add(trail);
  const effects = createImpactEffects();
  let effectFrame = effects.tick(0), localId = null, previousBall = null, previousTime = null, lastShake = 0, racketMotion = null;
  const hitKeys = new Map();
  const smashTarget = new THREE.Mesh(new THREE.RingGeometry(.49,.62,48), new THREE.MeshBasicMaterial({ color:0xff3d83, transparent:true, opacity:.8, depthWrite:false, side:THREE.DoubleSide }));
  smashTarget.rotation.x=-Math.PI/2; smashTarget.position.y=.027; smashTarget.visible=false; scene.add(smashTarget);
  const smashCore = new THREE.Mesh(new THREE.CircleGeometry(.49,48),new THREE.MeshBasicMaterial({color:0xff3d83,transparent:true,opacity:.1,depthWrite:false,side:THREE.DoubleSide}));
  smashCore.rotation.x=-Math.PI/2; smashCore.position.y=.025; smashCore.visible=false; scene.add(smashCore);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(.12, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .4, depthWrite: false }));
  shadow.rotation.x = -Math.PI/2; scene.add(shadow);
  // aiuto sul tempo: anello sul punto d'impatto, si stringe fino all'istante giusto e diventa verde
  const ring = new THREE.Mesh(new THREE.RingGeometry(.86, 1, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .8, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI/2; ring.visible = false; scene.add(ring);
  const aim = new THREE.Mesh(new THREE.RingGeometry(.28, .38, 32), new THREE.MeshBasicMaterial({ color: 0xffe14a, transparent: true, opacity: .85, depthWrite: false }));
  aim.rotation.x = -Math.PI/2; aim.position.y = .02; aim.visible = false; scene.add(aim);
  // lampo del colpo
  const flashes = [];
  function burst(p, color = 0xffffff){
    const m = new THREE.Mesh(new THREE.RingGeometry(.05, .14, 24), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(p.x, p.y, p.z); m.lookAt(camera.position); scene.add(m); flashes.push({ m, t: 0 });
  }
  // segni dei rimbalzi
  const marks = [], markGeo = new THREE.CircleGeometry(.09, 14); markGeo.scale(1, 1.7, 1);
  function mark(x, z, out = false){
    const m = new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial({ color: out ? 0xff3b30 : 0xd8e6ff, transparent: true, opacity: .7, depthWrite: false }));
    m.rotation.x = -Math.PI/2; m.position.set(x, .012, z); scene.add(m); marks.push({ m, t: 0, life: out ? 3 : 1.6 });
    while (marks.length > 5){ const old=marks.shift().m; scene.remove(old); disposeSceneResources(old,{geometries:false}); }
  }
  function lastMarkOut(){ const o = marks[marks.length - 1]; if (o){ o.m.material.color.set(0xff3b30); o.life = 3; o.t = 0; } }

  /* ---------- personaggi ---------- */
  let chars = [], last = new Map(), mood = new Map(), cheer = 0, cameraTeam = null, cameraAspect = null;
  function setPlayers(players, looks){
    for (const c of chars){ scene.remove(c.g); disposeSceneResources(c.g); }
    for (const {m} of flashes){ scene.remove(m); disposeSceneResources(m); } flashes.length=0;
    for (const {m} of marks){ scene.remove(m); disposeSceneResources(m,{geometries:false}); } marks.length=0;
    chars = players.map((p, i) => { const c = makeCharacter(LOOKS[looks[i]] || LOOKS.blu); scene.add(c.g); return c; });
    last = new Map(); mood = new Map(); cameraTeam = null;
    hist.length=0; previousBall=null; previousTime=null; effects.reset(); hitKeys.clear();
    return chars;
  }
  function setMood(id, m, secs = 1.4){ mood.set(id, { m, until: performance.now()/1000 + secs }); }

  function impact(e,view){
    if(e?.type!=='hit') return;
    const player=view?.players?.find(p=>p.id===e.player), point=player?.anim?.hit && player.anim.point || view?.ball?.p;
    effects.hit(e,point,e.player===localId);
    hist.length=0; // the outbound trail starts at the new stroke, not on the incoming arc
    if(player?.anim?.hit) hitKeys.set(e.player,player.anim.at);
    trail.material.color.set(SHOT_COLORS[e.shot] || SHOT_COLORS.drive);
  }

  // view: stato da disegnare, dalla partita locale (ArcadeMatch) o dalle istantanee dell'host (partita online)
  // view = { t, phase, ball:{p}, held, toss, players:[{ id, team, x, y, z, human, anim, inc, pend }], serverId }
  function sync(view, dt, local){
    const now = performance.now()/1000, b = view.ball.p;
    localId=local?.id || null;
    // Authoritative hit animations also cover delayed/lost presentation events.
    for(const p of view.players) if(p.anim?.hit && hitKeys.get(p.id)!==p.anim.at){
      if(view.t-p.anim.at<.35 && view.t-p.anim.at>-.05) impact({type:'hit',player:p.id,shot:p.anim.kind},view);
      hitKeys.set(p.id,p.anim.at);
    }
    effectFrame=effects.tick(dt,view.phase==='live' && dt>0);
    view.players.forEach((p, i) => {
      const c = chars[i]; if (!c) return;
      c.setFirstPerson(cameraMode==='first' && p.id===localId);
      const prev = last.get(p.id) || { x: p.x, z: p.z }, sp = Math.hypot(p.x - prev.x, p.z - prev.z)/Math.max(dt, 1e-3);
      last.set(p.id, { x: p.x, z: p.z });
      c.g.position.set(p.x, p.y || 0, p.z);
      const base = p.team === 0 ? Math.PI : 0, look = Math.atan2(b.x - p.x, b.z - p.z);
      let d = look - base; d = Math.atan2(Math.sin(d), Math.cos(d));
      c.g.rotation.y = base + Math.max(-.7, Math.min(.7, d))*.5;
      // preparazione: quando la palla sta arrivando, sul lato dove passerà
      let prep = 0, side = 'fh';
      if (p.inc && view.phase === 'live'){ const left = p.inc.Tc - view.t; prep = Math.max(0, Math.min(1, 1 - (left - .15)/.55)); side = p.inc.side; }
      let swing = null, kind = 'swing';
      if (p.anim){
        const u = p.anim.kind === 'toss' ? (view.t - p.anim.at)/.6 : (view.t - (p.anim.at - SWING.before))/SWING.dur;
        if (u >= 0 && u < 1.4){ swing = Math.min(1, u); kind = p.anim.kind; if (p.anim.side) side = p.anim.side; prep = 0; }
      }
      if (view.phase === 'serve' && p.id === view.serverId && view.toss && swing == null){ swing = Math.min(1, (view.t - view.toss.t0)/.6); kind = 'toss'; }
      const md = mood.get(p.id), m = md && md.until > now ? md.m : null;
      c.pose({ t: now + i, dt, moving: Math.min(1, sp/4), prep, side, swing, kind, mood: m, locomotion:p.locomotion, racketMotion:p.id===localId ? racketMotion : null });
      const near = relativeContact(p,b), hit = p.anim?.hit && swing != null && p.anim.point;
      if (hit){
        const out = p.anim.out || { x: 0, y: .2, z: contactAxes(p).fz };
        const follow = Math.max(0,(swing-.43))*.35;
        c.aimRacket({ x: hit.x+out.x*follow, y: hit.y+out.y*follow, z: hit.z+out.z*follow },out,Math.max(0,Math.min(1,(1-swing)/.22)));
      } else if (view.phase === 'live' && p.contactEligible !== false && near.s > -.2 && near.s < 3 && Math.abs(near.l)<1.7 && b.y>.4){
        const fz = contactAxes(p).fz;
        const contact=evaluateSweetSpot({ball:b,velocity:view.ball.v,player:p,timeToImpact:p.inc ? p.inc.Tc-view.t : Infinity,eligible:p.contactEligible!==false});
        // The ready string-bed reaches for the real ball only inside the same
        // playable volume as the hit judge. Before that, prepare at the shared
        // contact anchor instead of appearing to intercept an unplayable ball.
        const playable=contact.accepted ?? contact.ready;
        const point=playable ? b : {x:contact.point?.x ?? p.x,y:Math.max(.65,Math.min(2.8,b.y)),z:contact.point?.z ?? p.z+fz*CONTACT.forward};
        c.aimRacket(point,{ x: 0, y: .1, z: fz },Math.min(1,Math.max(0,(prep-.25)/.35)));
      }
    });
    ball.visible = !view.held || view.phase === 'serve';
    ball.position.set(b.x, b.y, b.z);
    shadow.position.set(b.x, .014, b.z); shadow.visible = ball.visible; shadow.material.opacity = Math.max(.12, .42 - b.y*.07);
    // scia: ultime posizioni della palla in volo
    const jump=previousBall && Math.hypot(b.x-previousBall.x,b.y-previousBall.y,b.z-previousBall.z)>4;
    const discontinuity=previousTime!=null && (view.t<previousTime || view.t-previousTime>.25);
    if(view.phase!=='live' || dt<=0 || jump || discontinuity) hist.length=0;
    if(view.phase==='live' && dt>0){ hist.unshift({x:b.x,y:b.y,z:b.z}); if(hist.length>TRAIL) hist.pop(); }
    previousBall={...b}; previousTime=view.t;
    const M = new THREE.Matrix4();
    for (let i = 0; i < TRAIL; i++){ const h = hist[i]; const s = h ? (1 - i/TRAIL)*.9 : 0; M.makeScale(s, s, s); if (h) M.setPosition(h.x, h.y, h.z); trail.setMatrixAt(i, M); }
    trail.instanceMatrix.needsUpdate = true;
    // Sweet spot locale: stessa geometria e velocità relativa usate dal motore per valutare il contatto.
    const me = local && view.players.find(p => p.id === local.id);
    const smash=smashOpportunity(me,view.t,view.phase);
    smashTarget.visible=smashCore.visible=!!smash;
    if(smash){
      smashTarget.position.set(smash.x,.027,smash.z); smashCore.position.set(smash.x,.025,smash.z);
      const pulse=smash.ready ? 1+.04*Math.sin(now*18) : 1;
      smashTarget.scale.setScalar(pulse); smashTarget.material.opacity=smash.ready ? .98 : .7;
      smashCore.material.opacity=smash.ready ? .24 : .1;
    }
    if (me && view.phase === 'live' && local.assist){
      const left = me.inc ? me.inc.Tc - view.t : Infinity;
      const sweet = evaluateSweetSpot({ ball: b, velocity: view.ball.v, player: me, impact: me.inc, timeToImpact: left, eligible: me.contactEligible !== false });
      ring.visible = sweet.visible && sweet.timeToImpact > -.22 && sweet.timeToImpact < 1;
      ring.position.set(sweet.point?.x ?? me.x, .02, sweet.point?.z ?? me.z);
      ring.scale.setScalar(.48);
      ring.material.color.set(sweet.perfect ? 0x4cff8a : sweet.ready ? 0x92edb0 : 0xffffff);
      ring.material.opacity = sweet.perfect ? .98 : sweet.ready ? .88 : left < .3 ? .7 : .45;
    } else ring.visible = false;
    for (let i=marks.length-1;i>=0;i--){ const o=marks[i]; o.t+=dt; o.m.material.opacity=Math.max(0,.7*(1-Math.max(0,o.t-o.life*.6)/(o.life*.4))); if(o.t>o.life){scene.remove(o.m);disposeSceneResources(o.m,{geometries:false});marks.splice(i,1);} }
    for (let i = flashes.length - 1; i >= 0; i--){ const f = flashes[i]; f.t += dt; f.m.scale.setScalar(1 + f.t*14); f.m.material.opacity = Math.max(0, 1 - f.t/.3); if (f.t > .3){ scene.remove(f.m); disposeSceneResources(f.m); flashes.splice(i, 1); } }
    cheer = Math.max(0, cheer - dt*.6);
    arena.update(now, Math.min(1, cheer));
  }
  // Camera locale: il team 0 guarda da z>0 verso -z; il team 1 da z<0 verso +z.
  // È una trasformazione di vista del client: personaggi, palla, bersagli e fisica mantengono le coordinate assolute.
  const camPos = new THREE.Vector3(), camAt = new THREE.Vector3(), camTarget = new THREE.Vector3();
  function follow(p, dt, snap = false){
    camera.position.x-=lastShake; lastShake=0;
    const frame = playerCameraFrame(p, HL, camera.aspect,cameraMode);
    camPos.set(frame.camera.x, frame.camera.y, frame.camera.z);
    camAt.set(frame.target.x, frame.target.y, frame.target.z);
    camera.up.set(0, 1, 0);
    // Al primo match (e se cambia team) applica subito la prospettiva locale: niente attraversamento del campo.
    if (snap || cameraTeam == null || cameraTeam !== frame.team || cameraAspect !== camera.aspect){
      camera.position.copy(camPos); camTarget.copy(camAt);
    } else {
      const blend = 1-Math.exp(-Math.max(0,dt)*(cameraMode==='first'?16:4));
      camera.position.lerp(camPos, blend); camTarget.lerp(camAt, blend);
    }
    cameraTeam = frame.team; cameraAspect = camera.aspect;
    const target=camTarget.clone();
    if(effectFrame.point && cameraMode!=='first') target.lerp(new THREE.Vector3(effectFrame.point.x,effectFrame.point.y,effectFrame.point.z),effectFrame.focus);
    lastShake=effectFrame.shake; camera.position.x+=lastShake;
    // First person preserves the user's gaze: no sudden look-at toward a
    // near racket, and a milder zoom to retain peripheral trajectory cues.
    const fov=frame.fov-effectFrame.zoom*(cameraMode==='first'?.45:1);
    if(Math.abs(camera.fov-fov)>.001){ camera.fov=fov; camera.updateProjectionMatrix(); }
    camera.lookAt(target);
  }
  // vista d'insieme dell'arena per i menu: giro lento dall'alto
  function orbit(t){ cameraTeam = null; lastShake=0; effects.reset(); effectFrame=effects.tick(0); camera.fov=cameraFieldOfView(camera.aspect); camera.updateProjectionMatrix(); const a = t*.06; camera.up.set(0, 1, 0); camera.position.set(Math.sin(a)*10, 8.5, Math.cos(a)*17); camera.lookAt(0, 1.5, 0); for(const c of chars)c.setFirstPerson(false); }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  function pick(clientX, clientY){
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set((clientX - r.left)/r.width*2 - 1, -(clientY - r.top)/r.height*2 + 1); ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(plane, hit) ? { x: hit.x, z: hit.z } : null;
  }
  return {
    renderer, scene, camera, arena, aim, smashTarget, impact, setPlayers,
    get cameraMode(){return cameraMode;},
    setCameraMode(mode){ const next=normalizeCameraMode(mode); if(next!==cameraMode){cameraMode=next;cameraTeam=null;effects.reset();effectFrame=effects.tick(0);} return cameraMode; },
    setRacketMotion(sample){ racketMotion=sample; }, setMood, sync, follow, orbit, pick, mark, lastMarkOut, burst,
    cheer(k = 1){ cheer = Math.max(cheer, k); },
    // qualità grafica: 2 alta, 1 media (meno pubblico, risoluzione 1×), 0 bassa (anche senza ombre)
    setQuality(q){
      renderer.setPixelRatio(q >= 2 ? Math.min(devicePixelRatio, 2) : 1); fit();
      arena.setDensity(q >= 2 ? 1 : q === 1 ? .5 : .2);
      renderer.shadowMap.enabled = q >= 1; key.castShadow = q >= 1;
      scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
    },
    render(){ renderer.render(scene, camera); },
    destroy(){
      if(destroyed)return; destroyed=true;
      removeEventListener('resize',fit);
      const markGeometryInScene=marks.length>0;
      disposeSceneResources(scene); if(!markGeometryInScene)markGeo.dispose();
      key.shadow.map?.dispose(); renderer.dispose(); renderer.domElement.remove();
      chars.length=0;marks.length=0;flashes.length=0;last.clear();mood.clear();hitKeys.clear();
    },
  };
}

