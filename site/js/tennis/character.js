// I giocatori di NATPF Simulator: personaggi originali, morbidi e arrotondati (capsule e sfere), leggibili da lontano e in
// corsa. Animazione procedurale sincronizzata con il colpo: pronto, corsa, preparazione sul lato giusto mentre la palla
// arriva, colpo con l'impatto nell'istante dello swing, accompagnamento, recupero; lancio e servizio; esultanza e delusione.
// Il personaggio guarda verso +z nel suo sistema; chi lo usa lo gira verso la rete.
import * as THREE from 'three';

export const LOOKS = {
  blu:   { shirt: 0x2f6bff, trim: 0xffffff, shorts: 0x15213d, skin: 0xf0c7a0, hair: 0x3a2618, band: 0xffffff, shoes: 0xffffff, racket: 0xff3d8b },
  rosso: { shirt: 0xff5a3c, trim: 0xffe14a, shorts: 0xffffff, skin: 0xc98d62, hair: 0x14100c, band: 0xffe14a, shoes: 0x222222, racket: 0x2f6bff },
  verde: { shirt: 0x22c08a, trim: 0xffffff, shorts: 0x15213d, skin: 0xe8b98f, hair: 0x7a4a24, band: 0x15213d, shoes: 0xffffff, racket: 0xffe14a },
  viola: { shirt: 0x8a5cff, trim: 0xffffff, shorts: 0xffffff, skin: 0xa86f4a, hair: 0x1d1a24, band: 0xff3d8b, shoes: 0xffffff, racket: 0x22c08a },
};
const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: .65, metalness: 0 });
const cap = (r, l, c) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, 10), mat(c)); m.castShadow = true; return m; };
const sph = (r, c, w = 16, h = 12) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, w, h), mat(c)); m.castShadow = true; return m; };
const pivot = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
const lerp = (a, b, k) => a + (b - a)*k;
const ease = k => k < 0 ? 0 : k > 1 ? 1 : k*k*(3 - 2*k);

export function makeCharacter(look = LOOKS.blu){
  const L = { ...LOOKS.blu, ...look };
  const root = new THREE.Group(), body = pivot(root, 0, 0, 0);
  const hips = pivot(body, 0, .92, 0);
  const torso = pivot(hips, 0, .02, 0);
  // busto: capsula con fascia sul petto
  const chest = cap(.21, .3, L.shirt); chest.position.y = .32; torso.add(chest);
  const trim = new THREE.Mesh(new THREE.TorusGeometry(.205, .03, 6, 20), mat(L.trim)); trim.rotation.x = Math.PI/2; trim.position.y = .5; torso.add(trim);
  const shorts = cap(.2, .08, L.shorts); shorts.position.y = .02; hips.add(shorts);
  // testa grande e tonda, occhi semplici, capelli o fascia
  const neck = pivot(torso, 0, .62, 0);
  const head = sph(.2, L.skin); head.position.y = .2; neck.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(.21, 16, 10, 0, Math.PI*2, 0, Math.PI*.55), mat(L.hair)); hair.position.y = .22; hair.rotation.x = -.25; neck.add(hair);
  const band = new THREE.Mesh(new THREE.TorusGeometry(.2, .025, 6, 24), mat(L.band)); band.position.y = .27; band.rotation.x = Math.PI/2 - .15; neck.add(band);
  for (const s of [-1, 1]){ const e = new THREE.Mesh(new THREE.SphereGeometry(.03, 8, 6), mat(0x1a1a22)); e.scale.set(1, 1.5, .6); e.position.set(s*.075, .22, .18); neck.add(e); }
  // braccia: spalla e gomito; racchetta nella destra
  const arm = s => {
    const sh = pivot(torso, s*.27, .5, 0);
    const up = cap(.065, .2, L.skin); up.position.y = -.15; sh.add(up);
    const sleeve = cap(.085, .06, L.shirt); sleeve.position.y = -.04; sh.add(sleeve);
    const el = pivot(sh, 0, -.3, 0);
    const fo = cap(.058, .18, L.skin); fo.position.y = -.12; el.add(fo);
    const hand = sph(.07, L.skin, 10, 8); hand.position.y = -.27; el.add(hand);
    return { sh, el, hand };
  };
  const armR = arm(-1), armL = arm(1);                  // destra a x < 0 guardando verso +z
  const racket = pivot(armR.el, 0, -.28, 0);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .22, 8), mat(0x1d1d24)); handle.position.y = -.07; racket.add(handle);
  const frame = new THREE.Mesh(new THREE.TorusGeometry(.17, .022, 8, 28), mat(L.racket)); frame.scale.set(.82, 1.1, 1); frame.position.y = -.4; racket.add(frame);
  const strings = new THREE.Mesh(new THREE.CircleGeometry(.165, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .45, side: THREE.DoubleSide })); strings.scale.set(.82, 1.1, 1); strings.position.y = -.4; racket.add(strings);
  racket.traverse(o => { if (o.isMesh) o.castShadow = true; });
  // gambe: anca e ginocchio, scarpe arrotondate
  const leg = s => {
    const hp = pivot(hips, s*.11, -.02, 0);
    const th = cap(.085, .26, L.skin); th.position.y = -.2; hp.add(th);
    const kn = pivot(hp, 0, -.42, 0);
    const sh = cap(.075, .26, L.skin); sh.position.y = -.2; kn.add(sh);
    const sock = cap(.08, .04, 0xffffff); sock.position.y = -.36; kn.add(sock);
    const shoe = sph(.1, L.shoes, 10, 8); shoe.scale.set(.95, .6, 1.5); shoe.position.set(0, -.46, .05); kn.add(shoe);
    return { hp, kn };
  };
  const legR = leg(-1), legL = leg(1);

  let phase = 0, bob = 0;
  // s: { t, dt, moving (0..1), prep (0..1), side ('fh'|'bh'), swing (0..1 avanzamento, null se fermo), kind, mood, crouch }
  function pose(s){
    const dt = s.dt || 0, mv = s.moving || 0;
    phase += dt*(9 + mv*5); bob = lerp(bob, mv, Math.min(1, dt*8));
    // gambe: corsa o posizione di attesa (ginocchia piegate, piccolo saltello)
    const run = Math.sin(phase)*.8*bob, ready = .25 + .05*Math.sin(s.t*7);
    legR.hp.rotation.x = -ready + run; legL.hp.rotation.x = -ready - run;
    legR.kn.rotation.x = ready*1.6 + Math.max(0, -run)*1.1; legL.kn.rotation.x = ready*1.6 + Math.max(0, run)*1.1;
    hips.position.y = .92 - ready*.18 + Math.abs(Math.cos(phase))*.05*bob;
    body.rotation.x = .12 + .18*bob;
    // braccia di base: racchetta davanti, pronta
    let tw = 0, shRx = -.5, shRz = -.25, elR = -.9, shLx = -.4, shLz = .35, elL = -.7, rk = .3, rkz = 0, lean = 0, headX = 0;
    if (mv > .3 && !s.prep){ shLx = -Math.sin(phase)*.7*bob; shLz = .2; }
    // preparazione: torsione e racchetta indietro sul lato del colpo
    const p = ease(s.prep || 0), fh = (s.side || 'fh') === 'fh';
    if (p > 0){
      tw = lerp(0, fh ? 1.15 : -1.2, p);
      shRx = lerp(shRx, fh ? -.4 : -.9, p); shRz = lerp(shRz, fh ? -1.2 : .7, p); elR = lerp(elR, fh ? -.5 : -1.3, p);
      shLx = lerp(shLx, -1.2, p); shLz = lerp(shLz, fh ? -.6 : .3, p);
    }
    // colpo: dalla preparazione all'impatto (u = .43) e all'accompagnamento
    if (s.swing != null){
      const u = s.swing, k = s.kind || 'swing';
      if (k === 'serve' || k === 'smash'){
        const a = ease(Math.min(1, u/.43)), b = ease((u - .43)/.57);
        shRx = lerp(-2.9, -1.2, a) + b*1.4; shRz = -.25; elR = lerp(-1.8, -.2, a) - b*.4; rk = lerp(1.6, .2, a);
        shLx = lerp(-2.6, -.6, a); shLz = .3; lean = lerp(-.2, .35, a); tw = lerp(.5, -.3, a);
        hips.position.y += Math.sin(Math.min(1, u)*Math.PI)*.12;
      } else if (k === 'toss'){
        const a = ease(u*2.2);
        shLx = lerp(-.4, -2.9, a); shLz = .25; elL = lerp(-.7, -.05, a); shRx = lerp(-.5, -2.6, a); elR = lerp(-.9, -1.8, a); rk = 1.6; tw = .5*a;
      } else {
        const a = ease(Math.min(1, u/.43)), b = ease((u - .43)/.57), sg = fh ? 1 : -1;
        if (k === 'drop'){
          // Palla corta: swing compatto, baricentro più basso e accompagnamento corto.
          tw = lerp(.72*sg, -.22*sg, a) - b*.2*sg;
          shRz = fh ? lerp(-.82, -.12, a) + b*.28 : lerp(.48, -.12, a) - b*.24;
          shRx = lerp(-.35, -.68, a) - b*.22; elR = lerp(-.58, -.28, a) - b*.1;
          rk = lerp(.28, -.22, a) + b*.12; rkz = fh ? -.18 : .18;
          shLx = -.85 + b*.18; shLz = fh ? .1 : .25; lean = .22*a;
          hips.position.y -= .06*a;
        } else if (k === 'lob'){
          // Lob: chiusura più alta e follow-through sopra la linea delle spalle.
          tw = lerp(1.0*sg, -.38*sg, a) - b*.35*sg;
          shRz = fh ? lerp(-1.12, .34, a) + b*.3 : lerp(.68, -.38, a) - b*.3;
          shRx = lerp(-.38, -1.62, a) - b*.28; elR = lerp(-.52, -1.05, a) - b*.25;
          rk = lerp(.28, -.25, a); rkz = fh ? -.12 : .12;
          shLx = lerp(-.95, -.72, a) + b*.12; shLz = fh ? -.38 : .34; lean = .06*a;
        } else if (k === 'slice'){
          // Slice: piano della racchetta inclinato e accompagnamento laterale.
          tw = lerp(1.08*sg, -.42*sg, a) - b*.3*sg;
          shRz = fh ? lerp(-1.18, .42, a) + b*.55 : lerp(.68, -.72, a) - b*.5;
          shRx = lerp(-.38, -.98, a) - b*.6; elR = lerp(-.55, -.18, a) - b*.25;
          rk = lerp(.28, -.12, a); rkz = fh ? lerp(-.12, -.75, a) + b*.12 : lerp(.12, .75, a) - b*.12;
          shLx = -1 + b*.28; shLz = fh ? .06 - b*.38 : .26; lean = .12*a;
        } else {
          // Drive: animazione base, con torsione e accompagnamento differenziati per dritto/rovescio.
          tw = lerp(1.15*sg, -.5*sg, a) - b*.7*sg;
          shRz = fh ? lerp(-1.2, .2, a) + b*1.2 : lerp(.7, -.7, a) - b*1.0;
          shRx = lerp(-.4, -.95, a) - b*.9; elR = lerp(-.5, -.15, a) - b*.6; rk = lerp(.3, 0, a);
          shLx = -1 + b*.4; shLz = fh ? .1 - b*.5 : .3;
          lean = .1*a;
        }
      }
    }
    // umore dopo il punto
    if (s.mood === 'happy'){ const j = Math.abs(Math.sin(s.t*8)); shLx = -2.8; shRx = -2.8; shLz = .4; shRz = -.4; elL = elR = -.1; hips.position.y += j*.15; tw = 0; }
    if (s.mood === 'sad'){ headX = .45; shLx = .05; shRx = .05; shLz = .12; shRz = -.12; tw = 0; lean = .2; }
    torso.rotation.y = tw; torso.rotation.x = lean;
    neck.rotation.y = -tw*.6; neck.rotation.x = headX;
    armR.sh.rotation.set(shRx, 0, shRz); armR.el.rotation.x = elR; racket.rotation.x = rk; racket.rotation.z = rkz;
    armL.sh.rotation.set(shLx, 0, shLz); armL.el.rotation.x = elL;
  }
  pose({ t: 0, dt: 0 });
  return { g: root, pose, racketHead: frame };
}
