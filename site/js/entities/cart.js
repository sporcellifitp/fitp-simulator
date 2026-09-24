// Golf car a noleggio: si guida con frecce/WASD o joystick, E per scendere, Spazio per il clacson.
// Si noleggia al chiosco del Fan Village in cambio di gettoni; resta tua finché ricarichi la pagina.
import * as THREE from 'three';
import { clamp, angleTo } from '../core/util.js';
import { collide, isFree } from '../world/collision.js';
import { mat } from '../world/geom.js';
import { pose } from './avatar.js';
import { hud } from '../ui/hud.js';
import { CART_PRICE } from '../content/shop.js';

const MAX = 15, REV = 4, ACC = 7, BRAKE = 16, DRAG = 3, R = 1.25;

export function makeCartMesh(color = 0xf6f1e7, roof = 0x2f8f57){
  const g = new THREE.Group();
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  add(B(1.4, .45, 2.5), mat(color), 0, .55, 0);                  // scocca
  add(B(1.4, .5, .5), mat(color), 0, .95, 1.05);                  // cofano
  add(B(1.2, .18, .9), mat(0x1d2430), 0, .88, -.05);              // sedile
  add(B(1.2, .6, .15), mat(0x1d2430), 0, 1.2, -.5);               // schienale
  add(B(1.25, .5, .7), mat(0xd3c5a8), 0, .95, -.95);              // bagagliaio
  for (const sx of [-.62, .62]) for (const sz of [-.55, 1.05]) add(B(.07, 1.35, .07), mat(0xdfe3e6), sx, 1.45, sz);
  add(B(1.55, .1, 1.95), mat(roof), 0, 2.15, .25);                // tetto
  const wheel = new THREE.CylinderGeometry(.3, .3, .22, 14); wheel.rotateZ(Math.PI/2);
  const wheels = [];
  for (const sx of [-.72, .72]) for (const sz of [-.8, .85]) wheels.push(add(wheel, mat(0x1d1d1f), sx, .3, sz));
  const sw = add(new THREE.TorusGeometry(.18, .03, 6, 16), mat(0x1d1d1f), -.3, 1.2, .55); sw.rotation.x = -1.1;
  g.userData.wheels = wheels;
  return g;
}

export function createCarts(W){
  const scene = W.engine.scene, A = W.village && W.village.anchors;
  // due golf car parcheggiate al chiosco, solo scenografiche
  if (A) for (const [x, z] of A.carPark){ const m = makeCartMesh(0xf6f1e7, 0x2f8f57); m.position.set(x, 0, z); m.rotation.y = W.village.F.rot; scene.add(m); W.collision.addRect(W.collision.colliders, x, z, .8, 1.35, W.village.F.rot); }
  let cart = null;          // { g, x, z, h, v }
  const st = { rented: false };
  const hero = W.hero, cam = { yaw: 0 };
  const sys = {
    get cart(){ return cart; }, get rented(){ return st.rented; },
    rent(){
      if (st.rented){ hud.toast('La golf car è già tua: la trovi dove l\'hai lasciata'); return; }
      if (!W.economy.spend(CART_PRICE, 'la golf car')) return;
      st.rented = true;
      const s = A ? A.carSpawn : { pos: [W.player.pos.x + 3, W.player.pos.z], rot: 0 };
      let [x, z] = s.pos; if (!isFree(x, z, R)) [x, z] = W.pois.safeSpot(x, z, null);
      cart = { g: makeCartMesh(0xffffff, 0x1f4fa3), x, z, h: s.rot + Math.PI, v: 0 };
      scene.add(cart.g); sys.sync();
      W.interact.add({ id: 'cart', x: () => cart.x, z: () => cart.z, r: 3, label: 'Sali sulla golf car', short: 'Guida', map: '#1f4fa3', act: () => sys.enter() });
      W.progress.badge('golfcar');
      hud.toast(`Golf car noleggiata per ${CART_PRICE} gettoni: sali e fai il giro del Foro`);
      sys.enter();
    },
    enter(){
      if (!cart) return;
      W.setMode('drive'); W.input.setContext('drive');
      hud.instr('Joystick per guidare · Scendi · Clacson', 'Frecce o WASD per guidare · E per scendere · Spazio per il clacson');
      cam.yaw = cart.h;
    },
    exit(){
      if (!cart) return;
      // scende a sinistra della golf car, in un punto libero
      const lx = Math.cos(cart.h)*1.8, lz = -Math.sin(cart.h)*1.8;
      let x = cart.x + lx, z = cart.z + lz; if (!isFree(x, z, .6)) [x, z] = W.pois.safeSpot(x, z, null);
      cart.v = 0; hud.hideInstr();
      W.setMode('explore');
      W.player.place(x, z, cart.x + Math.sin(cart.h)*6, cart.z + Math.cos(cart.h)*6);
    },
    sync(){
      const y = W.world.groundH(cart.x, cart.z);
      cart.g.position.set(cart.x, y, cart.z); cart.g.rotation.y = cart.h;
    },
    update(dt){
      if (!cart || W.mode !== 'drive') return;
      const input = W.input, mv = input.move();
      // acceleratore, freno, sterzo
      const thr = mv.y;
      if (thr > .05) cart.v += (cart.v < 0 ? BRAKE : ACC)*thr*dt;
      else if (thr < -.05) cart.v += (cart.v > 0 ? -BRAKE : -ACC*.6)*(-thr)*dt;
      else cart.v -= Math.sign(cart.v)*Math.min(Math.abs(cart.v), DRAG*dt);
      cart.v = clamp(cart.v, -REV, MAX*(W.player.st.boostT > 0 ? 1.1 : 1));
      cart.h -= mv.x*1.9*dt*clamp(cart.v/4, -1, 1);
      // movimento a piccoli passi con le collisioni del mondo
      const steps = Math.max(1, Math.ceil(Math.abs(cart.v)*dt/.4)), pos = { x: cart.x, z: cart.z };
      let bumped = false;
      for (let i = 0; i < steps; i++){
        const ox = pos.x + Math.sin(cart.h)*cart.v*dt/steps, oz = pos.z + Math.cos(cart.h)*cart.v*dt/steps;
        pos.x = ox; pos.z = oz; collide(pos, R);
        if (Math.hypot(pos.x - ox, pos.z - oz) > .05) bumped = true;
      }
      if (bumped && Math.abs(cart.v) > 3){ cart.v *= .4; hud.flash('Bump!'); }
      cart.x = pos.x; cart.z = pos.z; sys.sync();
      for (const w of cart.g.userData.wheels) w.rotation.x += cart.v*dt/.3;
      // il giocatore seduto al volante
      const sx = cart.x + Math.cos(cart.h)*.3 + Math.sin(cart.h)*-.1, sz = cart.z - Math.sin(cart.h)*.3 + Math.cos(cart.h)*-.1;
      hero.g.position.set(sx, cart.g.position.y + .55, sz); hero.g.rotation.y = cart.h;
      pose(hero, { state: 'sit', t: W.engine.time }); hero.armL.rotation.x = hero.armR.rotation.x = -1.1;
      // telecamera dietro la golf car
      cam.yaw += angleTo(cam.yaw, cart.h)*Math.min(1, dt*3);
      const c = W.engine.camera, back = 8.5, tx = cart.x - Math.sin(cam.yaw)*back, tz = cart.z - Math.cos(cam.yaw)*back;
      c.position.x += (tx - c.position.x)*Math.min(1, dt*5); c.position.z += (tz - c.position.z)*Math.min(1, dt*5);
      c.position.y += (cart.g.position.y + 4.2 - c.position.y)*Math.min(1, dt*5);
      c.lookAt(cart.x + Math.sin(cart.h)*4, cart.g.position.y + 1.4, cart.z + Math.cos(cart.h)*4);
      W.engine.setFocus(cart.x, cart.z);
      W.player.cam.yaw = cam.yaw + Math.PI;
      if (input.pressed('interact') || input.pressed('back')) sys.exit();
      else if (input.pressed('jump')){ hud.flash('Pii-piii!'); W.bus.emit('sfx', 'horn'); }
    },
  };
  return sys;
}
